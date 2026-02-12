import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_BACKEND_URL || '';
};

export const getApiUrl = () => `${getBaseUrl()}/api`;

export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('session_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }
  
  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
};

export const downloadFile = async (endpoint: string, filename: string) => {
  const token = await AsyncStorage.getItem('session_token');
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error('Erro ao descarregar ficheiro');
  }
  
  return response.blob();
};
