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
  const { user, isLoading, isAuthenticated, login, loginWithPassword, register } = useAuth();
  const router = useRouter();
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha email e password');
      return;
    }

    setSubmitting(true);
    const result = await loginWithPassword(email.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Erro ao fazer login');
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setSubmitting(true);
    const result = await register(email.trim(), password, name.trim());
    setSubmitting(false);

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Erro ao registar');
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

        {!showPasswordLogin ? (
          <>
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

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.passwordLoginButton} 
                onPress={() => setShowPasswordLogin(true)}
              >
                <Ionicons name="mail-outline" size={20} color="#1a365d" />
                <Text style={styles.passwordLoginButtonText}>Entrar com Email</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Ao continuar, concorda com os termos de serviço
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.loginForm}>
            <Text style={styles.formTitle}>
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </Text>

            {isRegistering && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nome completo"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email ou utilizador"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={isRegistering ? handleRegister : handlePasswordLogin}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting 
                  ? 'A processar...' 
                  : (isRegistering ? 'Criar Conta' : 'Entrar')
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchModeButton}
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <Text style={styles.switchModeText}>
                {isRegistering 
                  ? 'Já tem conta? Entrar' 
                  : 'Não tem conta? Registar'
                }
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={login}>
              <Ionicons name="logo-google" size={20} color="#1a365d" />
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setShowPasswordLogin(false);
                setIsRegistering(false);
                setEmail('');
                setPassword('');
                setName('');
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#64748b" />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}
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
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
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
    paddingVertical: 24,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94a3b8',
    fontSize: 14,
  },
  passwordLoginButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passwordLoginButtonText: {
    color: '#1a365d',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
  },
  loginForm: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 24,
    textAlign: 'center',
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#1a365d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    padding: 12,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleButtonText: {
    color: '#1a365d',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
  },
});
