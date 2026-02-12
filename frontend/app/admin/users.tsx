import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { apiRequest } from '../../src/utils/api';
import { User } from '../../src/types';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '',
    role: 'entregador' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest<User[]>('/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const createUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (newUser.password.length < 4) {
      Alert.alert('Erro', 'Password deve ter pelo menos 4 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'entregador' });
      fetchUsers();
      Alert.alert('Sucesso', 'Utilizador criado com sucesso');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar o utilizador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !isActive }),
      });
      fetchUsers();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o utilizador');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Eliminar Utilizador',
      `Tem a certeza que deseja eliminar ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/users/${userId}`, { method: 'DELETE' });
              fetchUsers();
              Alert.alert('Sucesso', 'Utilizador eliminado');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível eliminar');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const admins = users.filter((u) => u.role === 'admin');
  const entregadores = users.filter((u) => u.role === 'entregador');

  const renderUser = ({ item: user }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons
            name={user.role === 'admin' ? 'shield' : 'bicycle'}
            size={24}
            color={user.role === 'admin' ? '#7c3aed' : '#0891b2'}
          />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>Utilizador: {user.email}</Text>
          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                { backgroundColor: user.is_active ? '#d1fae5' : '#fee2e2' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: user.is_active ? '#059669' : '#dc2626' },
                ]}
              >
                {user.is_active ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: user.role === 'admin' ? '#ede9fe' : '#e0f2fe' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: user.role === 'admin' ? '#7c3aed' : '#0891b2' },
                ]}
              >
                {user.role === 'admin' ? 'Admin' : 'Entregador'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.userActions}>
        {user.role === 'entregador' && (
          <>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => router.push(`/admin/user-stats?userId=${user.user_id}`)}
            >
              <Ionicons name="stats-chart" size={20} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => toggleUserStatus(user.user_id, user.is_active)}
            >
              <Ionicons
                name={user.is_active ? 'pause-circle' : 'play-circle'}
                size={20}
                color={user.is_active ? '#f59e0b' : '#10b981'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => deleteUser(user.user_id, user.name)}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={[...admins, ...entregadores]}
        keyExtractor={(item) => item.user_id}
        renderItem={renderUser}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {users.length} utilizador{users.length !== 1 ? 'es' : ''}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Sem utilizadores</Text>
          </View>
        }
      />

      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Novo Utilizador</Text>
              <TouchableOpacity onPress={createUser} disabled={isSubmitting}>
                <Text style={[styles.modalSave, isSubmitting && styles.modalSaveDisabled]}>
                  {isSubmitting ? 'A criar...' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do Entregador *</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.name}
                  onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                  placeholder="Nome completo"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Utilizador (login) *</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.email}
                  onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                  placeholder="Ex: joao.silva"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  Este será o nome de utilizador para fazer login
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.password}
                  onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                  placeholder="Mínimo 4 caracteres"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Função</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      newUser.role === 'entregador' && styles.roleButtonActive,
                    ]}
                    onPress={() => setNewUser({ ...newUser, role: 'entregador' })}
                  >
                    <Ionicons
                      name="bicycle"
                      size={20}
                      color={newUser.role === 'entregador' ? '#fff' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        newUser.role === 'entregador' && styles.roleButtonTextActive,
                      ]}
                    >
                      Entregador
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      newUser.role === 'admin' && styles.roleButtonActive,
                    ]}
                    onPress={() => setNewUser({ ...newUser, role: 'admin' })}
                  >
                    <Ionicons
                      name="shield"
                      size={20}
                      color={newUser.role === 'admin' ? '#fff' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        newUser.role === 'admin' && styles.roleButtonTextActive,
                      ]}
                    >
                      Administrador
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  O utilizador poderá fazer login com o nome de utilizador e password definidos.
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a365d',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
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
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#1a365d',
    borderColor: '#1a365d',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
