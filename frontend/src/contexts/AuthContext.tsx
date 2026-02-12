import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { User } from '../types';
import { apiRequest, getApiUrl } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://courier-hub-40.preview.emergentagent.com';

  const processSessionId = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to exchange session');
      }

      const data = await response.json();
      if (data.session_token) {
        await AsyncStorage.setItem('session_token', data.session_token);
      }
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error processing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractSessionId = (url: string): string | null => {
    // Check hash first
    const hashMatch = url.match(/[#?]session_id=([^&]+)/);
    if (hashMatch) return hashMatch[1];
    
    // Check query params
    const queryMatch = url.match(/[?&]session_id=([^&#]+)/);
    if (queryMatch) return queryMatch[1];
    
    return null;
  };

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        const userData = await apiRequest<User>('/auth/me');
        setUser(userData);
      }
    } catch (error) {
      console.log('No existing session');
      await AsyncStorage.removeItem('session_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Check for session_id in URL (web)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const sessionId = extractSessionId(window.location.href);
        if (sessionId) {
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          await processSessionId(sessionId);
          return;
        }
      }

      // Check initial URL (mobile cold start)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const sessionId = extractSessionId(initialUrl);
        if (sessionId) {
          await processSessionId(sessionId);
          return;
        }
      }

      // Check existing session
      await checkExistingSession();
    };

    init();

    // Listen for URL changes (mobile hot link)
    const subscription = Linking.addEventListener('url', async (event) => {
      const sessionId = extractSessionId(event.url);
      if (sessionId) {
        await processSessionId(sessionId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      
      const redirectUrl = Platform.OS === 'web'
        ? `${API_URL}/`
        : Linking.createURL('/');

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const sessionId = extractSessionId(result.url);
          if (sessionId) {
            await processSessionId(sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
