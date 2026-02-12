import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <LoadingScreen message="A verificar sessão..." />;
  }

  if (isAuthenticated) {
    return <LoadingScreen message="A redirecionar..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="cube" size={64} color="#1a365d" />
        </View>
        <Text style={styles.title}>Intercourier Corvo</Text>
        <Text style={styles.subtitle}>Gestão de Entregas</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="location" size={24} color="#3b82f6" />
          <Text style={styles.featureText}>Rastreamento em tempo real</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="camera" size={24} color="#10b981" />
          <Text style={styles.featureText}>Prova de entrega com foto</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="document-text" size={24} color="#f59e0b" />
          <Text style={styles.featureText}>Relatórios automáticos</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.loginButton} onPress={login}>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.loginButtonText}>Entrar com Google</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Ao continuar, concorda com os termos de serviço
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  features: {
    paddingVertical: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 32,
  },
  loginButton: {
    backgroundColor: '#1a365d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
  },
});
