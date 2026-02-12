import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { user, isLoading, isAuthenticated, loginWithPassword } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha utilizador e password');
      return;
    }

    setSubmitting(true);
    const result = await loginWithPassword(username.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Erro ao fazer login');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="A verificar sessão..." />;
  }

  if (isAuthenticated) {
    return <LoadingScreen message="A redirecionar..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={64} color="#1a365d" />
          </View>
          <Text style={styles.title}>Intercourier Corvo</Text>
          <Text style={styles.subtitle}>Gestão de Entregas</Text>
        </View>

        <View style={styles.loginForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Utilizador</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748b" />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Introduza o utilizador"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Introduza a password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            <Text style={styles.loginButtonText}>
              {submitting ? 'A entrar...' : 'Entrar'}
            </Text>
            {!submitting && <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="location" size={20} color="#3b82f6" />
            <Text style={styles.featureText}>Rastreamento</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={20} color="#10b981" />
            <Text style={styles.featureText}>Foto & Assinatura</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="document-text" size={20} color="#f59e0b" />
            <Text style={styles.featureText}>Relatórios</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Contacte o administrador para obter credenciais de acesso
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  loginForm: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 16,
  },
  loginButton: {
    backgroundColor: '#1a365d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#64748b',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
});
