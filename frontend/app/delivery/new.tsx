import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../src/utils/api';
import { SignaturePad } from '../../src/components/SignaturePad';

export default function NewDelivery() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    address: '',
    notes: '',
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const pickImage = async (source: 'camera' | 'gallery') => {
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
          aspect: [4, 3],
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
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPhoto(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Fotografia',
      'Escolha uma opção',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Câmara', onPress: () => pickImage('camera') },
        { text: 'Galeria', onPress: () => pickImage('gallery') },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!form.client_name.trim()) {
      Alert.alert('Erro', 'Nome do cliente é obrigatório');
      return;
    }
    if (!form.address.trim()) {
      Alert.alert('Erro', 'Morada é obrigatória');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/deliveries', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          photo,
          signature,
        }),
      });
      Alert.alert('Sucesso', 'Entrega registada com sucesso', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a entrega');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Cliente *</Text>
            <TextInput
              style={styles.input}
              value={form.client_name}
              onChangeText={(text) => setForm({ ...form, client_name: text })}
              placeholder="Nome completo"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.client_email}
              onChangeText={(text) => setForm({ ...form, client_email: text })}
              placeholder="email@exemplo.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Morada *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
              placeholder="Rua, número, código postal, cidade"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.notes}
              onChangeText={(text) => setForm({ ...form, notes: text })}
              placeholder="Observações sobre a entrega..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anexos</Text>

          {/* Photo */}
          <View style={styles.attachmentGroup}>
            <Text style={styles.label}>Fotografia da Entrega</Text>
            {photo ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: photo }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setPhoto(null)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.attachButton}
                onPress={showImageOptions}
              >
                <Ionicons name="camera-outline" size={32} color="#64748b" />
                <Text style={styles.attachText}>Adicionar fotografia</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Digital Signature */}
          <View style={styles.attachmentGroup}>
            <Text style={styles.label}>Assinatura Digital do Cliente</Text>
            {signature ? (
              <View style={styles.signaturePreview}>
                <Image source={{ uri: signature }} style={styles.signatureImage} />
                <View style={styles.signatureActions}>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setShowSignaturePad(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#3b82f6" />
                    <Text style={styles.changeButtonText}>Alterar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeSignatureButton}
                    onPress={() => setSignature(null)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={styles.removeSignatureText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.signatureButton}
                onPress={() => setShowSignaturePad(true)}
              >
                <Ionicons name="finger-print" size={32} color="#64748b" />
                <Text style={styles.attachText}>Recolher assinatura digital</Text>
                <Text style={styles.attachSubtext}>Toque para o cliente assinar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {isSubmitting ? 'A registar...' : 'Registar Entrega'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Signature Pad Modal */}
      <SignaturePad
        visible={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={(sig) => setSignature(sig)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 16,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  attachmentGroup: {
    marginBottom: 16,
  },
  attachButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
  },
  signatureButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
  },
  attachText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  attachSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  signaturePreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  signatureImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  signatureActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 24,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  removeSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeSignatureText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#1a365d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
