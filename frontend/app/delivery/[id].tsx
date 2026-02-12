import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { apiRequest } from '../../src/utils/api';
import { Delivery } from '../../src/types';

const statusOptions = [
  { key: 'pendente', label: 'Pendente', color: '#f59e0b', icon: 'time-outline' as const },
  { key: 'em_transito', label: 'Em Trânsito', color: '#3b82f6', icon: 'car-outline' as const },
  { key: 'entregue', label: 'Entregue', color: '#10b981', icon: 'checkmark-circle-outline' as const },
  { key: 'falhou', label: 'Falhou', color: '#ef4444', icon: 'close-circle-outline' as const },
];

export default function DeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [newSignature, setNewSignature] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const fetchDelivery = async () => {
    try {
      const data = await apiRequest<Delivery>(`/deliveries/${id}`);
      setDelivery(data);
      setEditedNotes(data.notes || '');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a entrega');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await apiRequest(`/deliveries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDelivery();
      Alert.alert('Sucesso', 'Estado atualizado');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o estado');
    }
  };

  const pickImage = async (type: 'photo' | 'signature', source: 'camera' | 'gallery') => {
    try {
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão', 'Precisamos de acesso à câmara');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: type === 'signature' ? [3, 1] : [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão', 'Precisamos de acesso à galeria');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: type === 'signature' ? [3, 1] : [4, 3],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (type === 'photo') {
          setNewPhoto(base64Image);
        } else {
          setNewSignature(base64Image);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const showImageOptions = (type: 'photo' | 'signature') => {
    Alert.alert(
      type === 'photo' ? 'Fotografia' : 'Assinatura',
      'Escolha uma opção',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Câmara', onPress: () => pickImage(type, 'camera') },
        { text: 'Galeria', onPress: () => pickImage(type, 'gallery') },
      ]
    );
  };

  const saveChanges = async () => {
    try {
      const updates: any = {};
      if (editedNotes !== delivery?.notes) updates.notes = editedNotes;
      if (newPhoto) updates.photo = newPhoto;
      if (newSignature) updates.signature = newSignature;

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await apiRequest(`/deliveries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      setIsEditing(false);
      setNewPhoto(null);
      setNewSignature(null);
      fetchDelivery();
      Alert.alert('Sucesso', 'Alterações guardadas');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível guardar as alterações');
    }
  };

  const deleteDelivery = async () => {
    Alert.alert(
      'Eliminar Entrega',
      'Tem a certeza que deseja eliminar esta entrega?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/deliveries/${id}`, { method: 'DELETE' });
              Alert.alert('Sucesso', 'Entrega eliminada');
              router.back();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível eliminar a entrega');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !delivery) {
    return <LoadingScreen />;
  }

  const currentStatus = statusOptions.find((s) => s.key === delivery.status) || statusOptions[0];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        {/* Tracking Code */}
        <View style={styles.trackingSection}>
          <Text style={styles.trackingLabel}>Código de Rastreamento</Text>
          <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado</Text>
          <View style={styles.statusButtons}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.statusButton,
                  delivery.status === status.key && {
                    backgroundColor: `${status.color}20`,
                    borderColor: status.color,
                  },
                ]}
                onPress={() => updateStatus(status.key)}
              >
                <Ionicons
                  name={status.icon}
                  size={20}
                  color={delivery.status === status.key ? status.color : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.statusButtonText,
                    delivery.status === status.key && { color: status.color },
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{delivery.client_name}</Text>
            </View>
            {delivery.client_email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#64748b" />
                <Text style={styles.infoText}>{delivery.client_email}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{delivery.address}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notas</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={styles.notesInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Adicionar notas..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.notesText}>
              {delivery.notes || 'Sem notas'}
            </Text>
          )}
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotografia</Text>
            {isEditing && (
              <TouchableOpacity onPress={() => showImageOptions('photo')}>
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
          {(newPhoto || delivery.photo) ? (
            <Image
              source={{ uri: newPhoto || delivery.photo }}
              style={styles.photo}
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="camera-outline" size={48} color="#cbd5e1" />
              <Text style={styles.noImageText}>Sem fotografia</Text>
            </View>
          )}
        </View>

        {/* Signature */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assinatura</Text>
            {isEditing && (
              <TouchableOpacity onPress={() => showImageOptions('signature')}>
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
          {(newSignature || delivery.signature) ? (
            <Image
              source={{ uri: newSignature || delivery.signature }}
              style={styles.signature}
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="pencil-outline" size={48} color="#cbd5e1" />
              <Text style={styles.noImageText}>Sem assinatura</Text>
            </View>
          )}
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datas</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.dateLabel}>Criada:</Text>
              <Text style={styles.dateValue}>{formatDate(delivery.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.dateLabel}>Atualizada:</Text>
              <Text style={styles.dateValue}>{formatDate(delivery.updated_at)}</Text>
            </View>
            {delivery.delivered_at && (
              <View style={styles.infoRow}>
                <Text style={styles.dateLabel}>Entregue:</Text>
                <Text style={styles.dateValue}>{formatDate(delivery.delivered_at)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Entregador Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entregador</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{delivery.entregador_name}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setEditedNotes(delivery.notes || '');
                setNewPhoto(null);
                setNewSignature(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={saveChanges}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          isAdmin && (
            <TouchableOpacity style={styles.deleteButton} onPress={deleteDelivery}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.deleteButtonText}>Eliminar Entrega</Text>
            </TouchableOpacity>
          )
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  trackingSection: {
    backgroundColor: '#1a365d',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  trackingLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  trackingCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#334155',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesText: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#334155',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  signature: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  noImage: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 80,
  },
  dateValue: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#1a365d',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
