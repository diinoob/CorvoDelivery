import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import { apiRequest, getApiUrl } from '../../src/utils/api';
import { Delivery } from '../../src/types';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { SignaturePad } from '../../src/components/SignaturePad';
import AsyncStorage from '@react-native-async-storage/async-storage';

const statusConfig = {
  pendente: { color: '#f59e0b', label: 'Pendente', icon: 'time-outline' as const },
  em_transito: { color: '#3b82f6', label: 'Em Trânsito', icon: 'car-outline' as const },
  entregue: { color: '#10b981', label: 'Entregue', icon: 'checkmark-circle-outline' as const },
  falhou: { color: '#ef4444', label: 'Falhou', icon: 'close-circle-outline' as const },
};

export default function PickupScreen() {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const searchDelivery = async () => {
    if (!trackingCode.trim()) {
      Alert.alert('Erro', 'Introduza o código de rastreamento');
      return;
    }

    setIsSearching(true);
    try {
      // Search by tracking code
      const deliveries = await apiRequest<Delivery[]>('/deliveries');
      const found = deliveries.find(
        d => d.tracking_code.toLowerCase() === trackingCode.trim().toLowerCase()
      );

      if (found) {
        setDelivery(found);
        setSignature(null);
      } else {
        Alert.alert('Não Encontrado', 'Nenhuma entrega encontrada com este código');
        setDelivery(null);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao procurar entrega');
    } finally {
      setIsSearching(false);
    }
  };

  const confirmDelivery = async () => {
    if (!delivery) return;
    
    if (!signature) {
      Alert.alert('Assinatura Obrigatória', 'Peça ao cliente para assinar antes de confirmar');
      return;
    }

    setIsConfirming(true);
    try {
      // Update delivery with signature and status
      await apiRequest(`/deliveries/${delivery.delivery_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'entregue',
          signature: signature,
        }),
      });

      Alert.alert(
        'Entrega Confirmada',
        'A entrega foi registada com sucesso. Deseja gerar o recibo?',
        [
          { text: 'Não', style: 'cancel', onPress: () => resetForm() },
          { 
            text: 'Gerar Recibo', 
            onPress: () => generateReceipt(delivery.delivery_id)
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao confirmar entrega');
    } finally {
      setIsConfirming(false);
    }
  };

  const generateReceipt = async (deliveryId: string) => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.EXPO_PUBLIC_BACKEND_URL || '';
      
      const url = `${baseUrl}/api/deliveries/${deliveryId}/receipt`;
      
      if (Platform.OS === 'web') {
        // Web: direct download
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `recibo_${delivery?.tracking_code || deliveryId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // Mobile: use expo-file-system and sharing
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        
        const filename = `recibo_${delivery?.tracking_code || deliveryId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Receipt error:', error);
      Alert.alert('Erro', 'Erro ao gerar recibo');
      resetForm();
    }
  };

  const resetForm = () => {
    setTrackingCode('');
    setDelivery(null);
    setSignature(null);
  };

  const handleSignatureSave = (sig: string) => {
    setSignature(sig);
  };

  const status = delivery ? statusConfig[delivery.status] || statusConfig.pendente : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Picar Entrega</Text>
          <Text style={styles.subtitle}>
            Introduza o código de rastreamento para confirmar a entrega
          </Text>

          <View style={styles.searchBox}>
            <View style={styles.inputContainer}>
              <Ionicons name="barcode-outline" size={24} color="#64748b" />
              <TextInput
                style={styles.input}
                value={trackingCode}
                onChangeText={setTrackingCode}
                placeholder="Ex: IC1A2B3C4D"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {trackingCode.length > 0 && (
                <TouchableOpacity onPress={() => setTrackingCode('')}>
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
              onPress={searchDelivery}
              disabled={isSearching}
            >
              <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Details */}
        {delivery && (
          <View style={styles.deliverySection}>
            <View style={styles.deliveryCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${status?.color}20` }]}>
                  <Ionicons name={status?.icon || 'ellipse'} size={14} color={status?.color} />
                  <Text style={[styles.statusText, { color: status?.color }]}>
                    {status?.label}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#64748b" />
                <Text style={styles.infoLabel}>Cliente:</Text>
                <Text style={styles.infoValue}>{delivery.client_name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#64748b" />
                <Text style={styles.infoLabel}>Morada:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{delivery.address}</Text>
              </View>

              {delivery.client_email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={18} color="#64748b" />
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{delivery.client_email}</Text>
                </View>
              )}

              {delivery.notes && (
                <View style={styles.infoRow}>
                  <Ionicons name="document-text-outline" size={18} color="#64748b" />
                  <Text style={styles.infoLabel}>Notas:</Text>
                  <Text style={styles.infoValue}>{delivery.notes}</Text>
                </View>
              )}
            </View>

            {/* Signature Section */}
            {delivery.status !== 'entregue' ? (
              <View style={styles.signatureSection}>
                <Text style={styles.signatureTitle}>Assinatura do Cliente</Text>
                
                {signature ? (
                  <View style={styles.signaturePreview}>
                    <Image source={{ uri: signature }} style={styles.signatureImage} />
                    <TouchableOpacity
                      style={styles.changeSignatureButton}
                      onPress={() => setShowSignature(true)}
                    >
                      <Ionicons name="create-outline" size={16} color="#3b82f6" />
                      <Text style={styles.changeSignatureText}>Alterar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.signatureButton}
                    onPress={() => setShowSignature(true)}
                  >
                    <Ionicons name="finger-print" size={32} color="#64748b" />
                    <Text style={styles.signatureButtonText}>
                      Toque para recolher assinatura
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!signature || isConfirming) && styles.confirmButtonDisabled
                  ]}
                  onPress={confirmDelivery}
                  disabled={!signature || isConfirming}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.confirmButtonText}>
                    {isConfirming ? 'A confirmar...' : 'Confirmar Entrega'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.deliveredSection}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                <Text style={styles.deliveredText}>Esta entrega já foi concluída</Text>
                {delivery.signature && (
                  <View style={styles.existingSignature}>
                    <Text style={styles.existingSignatureLabel}>Assinatura registada:</Text>
                    <Image source={{ uri: delivery.signature }} style={styles.signatureImage} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.receiptButton}
                  onPress={() => generateReceipt(delivery.delivery_id)}
                >
                  <Ionicons name="document-text" size={20} color="#1a365d" />
                  <Text style={styles.receiptButtonText}>Gerar Recibo</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.newSearchButton} onPress={resetForm}>
              <Ionicons name="arrow-back" size={20} color="#64748b" />
              <Text style={styles.newSearchButtonText}>Nova Pesquisa</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Signature Pad Modal */}
        <SignaturePad
          visible={showSignature}
          onClose={() => setShowSignature(false)}
          onSave={handleSignatureSave}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
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
    fontSize: 18,
    color: '#1e293b',
    paddingVertical: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  searchButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  deliverySection: {
    padding: 16,
    paddingTop: 0,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  signatureSection: {
    marginTop: 16,
  },
  signatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 12,
  },
  signatureButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
  },
  signatureButtonText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  signaturePreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  changeSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  changeSignatureText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deliveredSection: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  deliveredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginTop: 8,
  },
  existingSignature: {
    width: '100%',
    marginTop: 16,
  },
  existingSignatureLabel: {
    fontSize: 13,
    color: '#166534',
    marginBottom: 8,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  receiptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a365d',
  },
  newSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  newSearchButtonText: {
    fontSize: 15,
    color: '#64748b',
  },
});
