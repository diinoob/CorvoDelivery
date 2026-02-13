import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest, getApiUrl, getAuthHeaders } from '../../src/utils/api';

interface ManifestEntry {
  tracking_code: string;
  customer_name: string;
  address: string;
  postal_code: string;
  city: string;
}

interface ParsedManifest {
  route_id: string;
  date: string;
  location: string;
  entries: ManifestEntry[];
  manifest_image?: string;
}

export default function ManifestCreateScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'review' | 'saving'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedManifest | null>(null);
  const [editedEntries, setEditedEntries] = useState<ManifestEntry[]>([]);
  
  // Form fields for manifest info
  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Precisa de permissão para usar a câmara');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Precisa de permissão para aceder à galeria');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageUri = asset.uri;
        const base64 = asset.base64;
        
        setSelectedImage(imageUri);
        
        if (base64) {
          await processManifestImage(base64);
        } else {
          Alert.alert('Erro', 'Não foi possível processar a imagem');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Erro', 'Erro ao selecionar imagem');
    }
  };

  const processManifestImage = async (base64: string) => {
    setIsProcessing(true);
    try {
      const response = await apiRequest<ParsedManifest>('/manifests/parse', {
        method: 'POST',
        body: JSON.stringify({ image_base64: base64 }),
      });

      setParsedData(response);
      setRouteId(response.route_id || '');
      setDate(response.date || new Date().toISOString().split('T')[0]);
      setLocation(response.location || '');
      setEditedEntries(response.entries || []);
      setStep('review');
      
      if (!response.entries || response.entries.length === 0) {
        Alert.alert(
          'Aviso',
          'Não foram encontradas entregas no manifesto. Pode adicionar manualmente.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      Alert.alert('Erro', error.message || 'Erro ao processar manifesto');
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualEntry = () => {
    setEditedEntries([
      ...editedEntries,
      {
        tracking_code: '',
        customer_name: '',
        address: '',
        postal_code: '',
        city: '',
      },
    ]);
  };

  const updateEntry = (index: number, field: keyof ManifestEntry, value: string) => {
    const updated = [...editedEntries];
    updated[index] = { ...updated[index], [field]: value };
    setEditedEntries(updated);
  };

  const removeEntry = (index: number) => {
    Alert.alert(
      'Remover Entrada',
      'Tem certeza que quer remover esta entrada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const updated = editedEntries.filter((_, i) => i !== index);
            setEditedEntries(updated);
          },
        },
      ]
    );
  };

  const saveManifest = async () => {
    if (!routeId.trim()) {
      Alert.alert('Erro', 'Preencha o ID da rota');
      return;
    }
    
    if (editedEntries.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos uma entrega');
      return;
    }

    // Validate entries
    const validEntries = editedEntries.filter(e => 
      e.tracking_code.trim() && e.customer_name.trim()
    );

    if (validEntries.length === 0) {
      Alert.alert('Erro', 'As entregas precisam de código de rastreamento e nome do cliente');
      return;
    }

    setStep('saving');
    try {
      const manifestData = {
        route_id: routeId,
        date: date,
        location: location,
        entries: validEntries,
        manifest_image: selectedImage,
      };

      await apiRequest('/manifests', {
        method: 'POST',
        body: JSON.stringify(manifestData),
      });

      Alert.alert(
        'Sucesso',
        `Manifesto criado com ${validEntries.length} entrega(s)!`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Erro', error.message || 'Erro ao guardar manifesto');
      setStep('review');
    }
  };

  const renderUploadStep = () => (
    <View style={styles.uploadContainer}>
      <View style={styles.uploadHeader}>
        <Ionicons name="document-text" size={64} color="#1a365d" />
        <Text style={styles.uploadTitle}>Criar Novo Manifesto</Text>
        <Text style={styles.uploadSubtitle}>
          Tire uma foto ou selecione uma imagem do manifesto para extrair automaticamente os dados das entregas
        </Text>
      </View>

      <View style={styles.uploadOptions}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage(true)}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons name="camera" size={32} color="#fff" />
          </View>
          <View style={styles.uploadButtonText}>
            <Text style={styles.uploadButtonTitle}>Tirar Foto</Text>
            <Text style={styles.uploadButtonSubtitle}>
              Use a câmara para capturar o manifesto
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage(false)}
        >
          <View style={[styles.uploadIconContainer, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="images" size={32} color="#fff" />
          </View>
          <View style={styles.uploadButtonText}>
            <Text style={styles.uploadButtonTitle}>Escolher da Galeria</Text>
            <Text style={styles.uploadButtonSubtitle}>
              Selecione uma imagem existente
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.manualButton}
        onPress={() => {
          setStep('review');
          setEditedEntries([]);
        }}
      >
        <Ionicons name="create-outline" size={24} color="#1a365d" />
        <Text style={styles.manualButtonText}>Criar Manualmente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.reviewContainer}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Manifest Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informação do Manifesto</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ID da Rota *</Text>
            <TextInput
              style={styles.input}
              value={routeId}
              onChangeText={setRouteId}
              placeholder="Ex: ROTA-001"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Local de Partida</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Ex: Armazém Central"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Preview Image */}
        {selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imagem do Manifesto</Text>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          </View>
        )}

        {/* Entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Entregas ({editedEntries.length})
            </Text>
            <TouchableOpacity style={styles.addEntryButton} onPress={addManualEntry}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addEntryText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {editedEntries.length === 0 ? (
            <View style={styles.emptyEntries}>
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nenhuma entrega</Text>
              <Text style={styles.emptySubtext}>
                Adicione entregas manualmente
              </Text>
            </View>
          ) : (
            editedEntries.map((entry, index) => (
              <View key={index} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryNumber}>Entrega #{index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeEntry(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>Código de Rastreamento *</Text>
                  <TextInput
                    style={styles.entryInput}
                    value={entry.tracking_code}
                    onChangeText={(v) => updateEntry(index, 'tracking_code', v)}
                    placeholder="Código"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>Nome do Cliente *</Text>
                  <TextInput
                    style={styles.entryInput}
                    value={entry.customer_name}
                    onChangeText={(v) => updateEntry(index, 'customer_name', v)}
                    placeholder="Nome"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>Morada</Text>
                  <TextInput
                    style={styles.entryInput}
                    value={entry.address}
                    onChangeText={(v) => updateEntry(index, 'address', v)}
                    placeholder="Morada"
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                </View>

                <View style={styles.entryRow}>
                  <View style={[styles.entryField, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.entryLabel}>Código Postal</Text>
                    <TextInput
                      style={styles.entryInput}
                      value={entry.postal_code}
                      onChangeText={(v) => updateEntry(index, 'postal_code', v)}
                      placeholder="Código Postal"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.entryField, { flex: 1 }]}>
                    <Text style={styles.entryLabel}>Cidade</Text>
                    <TextInput
                      style={styles.entryInput}
                      value={entry.city}
                      onChangeText={(v) => updateEntry(index, 'city', v)}
                      placeholder="Cidade"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveManifest}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSavingStep = () => (
    <View style={styles.savingContainer}>
      <ActivityIndicator size="large" color="#1a365d" />
      <Text style={styles.savingText}>A guardar manifesto...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#1a365d" />
            <Text style={styles.processingTitle}>A processar manifesto...</Text>
            <Text style={styles.processingSubtitle}>
              A IA está a extrair os dados das entregas
            </Text>
          </View>
        </View>
      )}

      {step === 'upload' && renderUploadStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'saving' && renderSavingStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  uploadContainer: {
    flex: 1,
    padding: 20,
  },
  uploadHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  uploadTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
    marginTop: 16,
  },
  uploadSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  uploadOptions: {
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  uploadButtonText: {
    flex: 1,
  },
  uploadButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
  },
  uploadButtonSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1a365d',
    borderStyle: 'dashed',
    gap: 8,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingContent: {
    alignItems: 'center',
    padding: 32,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a365d',
    marginTop: 16,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addEntryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyEntries: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  entryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
  },
  entryField: {
    marginBottom: 10,
  },
  entryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  entryInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  entryRow: {
    flexDirection: 'row',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a365d',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  savingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
});
