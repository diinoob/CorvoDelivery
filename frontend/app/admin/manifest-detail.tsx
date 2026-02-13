import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getApiUrl } from '../../src/utils/api';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { SignaturePad } from '../../src/components/SignaturePad';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DeliveryEntry {
  delivery_id: string;
  tracking_code: string;
  client_name: string;
  address: string;
  status: string;
  signature?: string;
  delivered_at?: string;
}

interface ManifestStats {
  total: number;
  delivered: number;
  pending: number;
  in_transit: number;
  failed: number;
  completion_rate: number;
}

interface ManifestDetail {
  manifest_id: string;
  route_id: string;
  date: string;
  location: string;
  entries: any[];
  deliveries: DeliveryEntry[];
  stats: ManifestStats;
  closed: boolean;
  closed_at?: string;
  admin_signature?: string;
  signed_at?: string;
  created_by_name?: string;
  manifest_image?: string;
}

const statusConfig: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pendente: { color: '#f59e0b', label: 'Pendente', icon: 'time-outline' },
  em_transito: { color: '#3b82f6', label: 'Em Trânsito', icon: 'car-outline' },
  entregue: { color: '#10b981', label: 'Entregue', icon: 'checkmark-circle-outline' },
  falhou: { color: '#ef4444', label: 'Falhou', icon: 'close-circle-outline' },
};

export default function ManifestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [manifest, setManifest] = useState<ManifestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fetchManifest = async () => {
    if (!id) return;
    try {
      const data = await apiRequest<ManifestDetail>(`/manifests/${id}`);
      setManifest(data);
    } catch (error) {
      console.error('Error fetching manifest:', error);
      Alert.alert('Erro', 'Não foi possível carregar o manifesto');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchManifest();
    }, [id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchManifest();
  };

  const handleSignManifest = async (signature: string) => {
    if (!manifest) return;
    try {
      await apiRequest(`/manifests/${manifest.manifest_id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signature }),
      });
      Alert.alert('Sucesso', 'Manifesto assinado com sucesso');
      fetchManifest();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao assinar manifesto');
    }
  };

  const handleCloseManifest = async () => {
    if (!manifest) return;
    
    Alert.alert(
      'Fechar Manifesto',
      'Tem certeza que deseja fechar este manifesto? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar',
          style: 'destructive',
          onPress: async () => {
            setIsClosing(true);
            try {
              await apiRequest(`/manifests/${manifest.manifest_id}/close`, {
                method: 'POST',
              });
              Alert.alert('Sucesso', 'Manifesto fechado com sucesso');
              fetchManifest();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao fechar manifesto');
            } finally {
              setIsClosing(false);
            }
          },
        },
      ]
    );
  };

  const downloadPdf = async () => {
    if (!manifest) return;
    try {
      const token = await AsyncStorage.getItem('session_token');
      const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.EXPO_PUBLIC_BACKEND_URL || '';
      
      const url = `${baseUrl}/api/manifests/${manifest.manifest_id}/pdf`;
      
      if (Platform.OS === 'web') {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `manifesto_${manifest.route_id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        
        const filename = `manifesto_${manifest.route_id}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        }
      }
    } catch (error) {
      console.error('PDF error:', error);
      Alert.alert('Erro', 'Erro ao gerar PDF');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!manifest) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Manifesto não encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = manifest.stats;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.routeId}>{manifest.route_id}</Text>
              <Text style={styles.location}>{manifest.location || 'Sem local definido'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: manifest.closed ? '#d1fae5' : '#fef3c7' }]}>
              <Text style={[styles.statusBadgeText, { color: manifest.closed ? '#059669' : '#d97706' }]}>
                {manifest.closed ? 'Fechado' : 'Aberto'}
              </Text>
            </View>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>{manifest.date}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>{manifest.created_by_name || 'Admin'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{stats.delivered}</Text>
            <Text style={[styles.statLabel, { color: '#059669' }]}>Entregues</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: '#d97706' }]}>Pendentes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.failed}</Text>
            <Text style={[styles.statLabel, { color: '#dc2626' }]}>Falhadas</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progresso</Text>
            <Text style={styles.progressPercent}>{stats.completion_rate}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.completion_rate}%` }]} />
          </View>
        </View>

        {/* Deliveries List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entregas ({manifest.deliveries?.length || 0})</Text>
          
          {manifest.deliveries?.map((delivery) => {
            const status = statusConfig[delivery.status] || statusConfig.pendente;
            return (
              <TouchableOpacity
                key={delivery.delivery_id}
                style={styles.deliveryCard}
                onPress={() => router.push(`/delivery/${delivery.delivery_id}`)}
              >
                <View style={styles.deliveryHeader}>
                  <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
                  <View style={[styles.deliveryStatus, { backgroundColor: `${status.color}20` }]}>
                    <Ionicons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.deliveryStatusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.clientName}>{delivery.client_name}</Text>
                <Text style={styles.clientAddress} numberOfLines={1}>{delivery.address}</Text>
                {delivery.delivered_at && (
                  <View style={styles.deliveredInfo}>
                    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                    <Text style={styles.deliveredText}>
                      Entregue em {new Date(delivery.delivered_at).toLocaleDateString('pt-PT')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Signature Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assinatura do Manifesto</Text>
          
          {manifest.admin_signature ? (
            <View style={styles.signaturePreview}>
              <Image source={{ uri: manifest.admin_signature }} style={styles.signatureImage} />
              {manifest.signed_at && (
                <Text style={styles.signedDate}>
                  Assinado em {new Date(manifest.signed_at).toLocaleDateString('pt-PT')}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.signatureButton}
              onPress={() => setShowSignature(true)}
            >
              <Ionicons name="finger-print" size={32} color="#64748b" />
              <Text style={styles.signatureButtonText}>
                Toque para assinar o manifesto
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={downloadPdf}>
            <Ionicons name="document-text" size={24} color="#1a365d" />
            <Text style={styles.actionButtonText}>Exportar PDF</Text>
          </TouchableOpacity>

          {!manifest.closed && (
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={handleCloseManifest}
              disabled={isClosing}
            >
              {isClosing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={24} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                    Fechar Manifesto
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <SignaturePad
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onSave={handleSignManifest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeId: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a365d',
  },
  location: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerInfo: {
    flexDirection: 'row',
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 16,
  },
  deliveryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
    letterSpacing: 0.5,
  },
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  clientAddress: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  deliveredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  deliveredText: {
    fontSize: 12,
    color: '#10b981',
  },
  signaturePreview: {
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  signedDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  signatureButton: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  signatureButtonText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1a365d',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
  },
  closeButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1a365d',
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
