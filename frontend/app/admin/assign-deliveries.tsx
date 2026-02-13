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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../src/utils/api';
import { LoadingScreen } from '../../src/components/LoadingScreen';

interface Entregador {
  user_id: string;
  name: string;
  email: string;
  pending_deliveries: number;
  in_transit_deliveries: number;
}

interface Delivery {
  delivery_id: string;
  tracking_code: string;
  client_name: string;
  address: string;
  status: string;
  entregador_id: string;
  entregador_name: string;
  created_at: string;
}

export default function AssignDeliveriesScreen() {
  const router = useRouter();
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedEntregador, setSelectedEntregador] = useState<Entregador | null>(null);
  const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [step, setStep] = useState<'select-entregador' | 'select-deliveries'>('select-entregador');

  const fetchData = async () => {
    try {
      const [entregadoresData, deliveriesData] = await Promise.all([
        apiRequest<Entregador[]>('/entregadores'),
        apiRequest<Delivery[]>('/deliveries/unassigned'),
      ]);
      setEntregadores(entregadoresData);
      setDeliveries(deliveriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const selectEntregador = (entregador: Entregador) => {
    setSelectedEntregador(entregador);
    setSelectedDeliveries(new Set());
    setStep('select-deliveries');
  };

  const toggleDeliverySelection = (deliveryId: string) => {
    const newSelected = new Set(selectedDeliveries);
    if (newSelected.has(deliveryId)) {
      newSelected.delete(deliveryId);
    } else {
      newSelected.add(deliveryId);
    }
    setSelectedDeliveries(newSelected);
  };

  const selectAllDeliveries = () => {
    if (selectedDeliveries.size === deliveries.length) {
      setSelectedDeliveries(new Set());
    } else {
      setSelectedDeliveries(new Set(deliveries.map(d => d.delivery_id)));
    }
  };

  const assignDeliveries = async () => {
    if (!selectedEntregador || selectedDeliveries.size === 0) {
      Alert.alert('Erro', 'Selecione pelo menos uma entrega');
      return;
    }

    setIsAssigning(true);
    try {
      const result = await apiRequest<{ success: boolean; updated_count: number; entregador_name: string }>(
        '/deliveries/assign',
        {
          method: 'POST',
          body: JSON.stringify({
            delivery_ids: Array.from(selectedDeliveries),
            entregador_id: selectedEntregador.user_id,
          }),
        }
      );

      Alert.alert(
        'Sucesso',
        `${result.updated_count} entrega(s) atribuída(s) a ${result.entregador_name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedDeliveries(new Set());
              setSelectedEntregador(null);
              setStep('select-entregador');
              fetchData();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atribuir entregas');
    } finally {
      setIsAssigning(false);
    }
  };

  const goBack = () => {
    if (step === 'select-deliveries') {
      setStep('select-entregador');
      setSelectedEntregador(null);
      setSelectedDeliveries(new Set());
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const renderSelectEntregador = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Atribuir Entregas</Text>
        <Text style={styles.subtitle}>Selecione um entregador</Text>
      </View>

      {entregadores.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Sem entregadores ativos</Text>
          <Text style={styles.emptySubtext}>
            Crie entregadores na gestão de utilizadores
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/admin/users')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Criar Entregador</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.entregadorList}>
          {entregadores.map((entregador) => (
            <TouchableOpacity
              key={entregador.user_id}
              style={styles.entregadorCard}
              onPress={() => selectEntregador(entregador)}
            >
              <View style={styles.entregadorAvatar}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
              <View style={styles.entregadorInfo}>
                <Text style={styles.entregadorName}>{entregador.name}</Text>
                <Text style={styles.entregadorEmail}>{entregador.email}</Text>
                <View style={styles.entregadorStats}>
                  <View style={styles.statBadge}>
                    <Ionicons name="time-outline" size={12} color="#f59e0b" />
                    <Text style={styles.statText}>{entregador.pending_deliveries} pendentes</Text>
                  </View>
                  <View style={styles.statBadge}>
                    <Ionicons name="car-outline" size={12} color="#3b82f6" />
                    <Text style={styles.statText}>{entregador.in_transit_deliveries} em trânsito</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderSelectDeliveries = () => (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Selected Entregador Info */}
        <View style={styles.selectedEntregadorCard}>
          <View style={styles.selectedEntregadorHeader}>
            <Text style={styles.selectedLabel}>Entregador selecionado:</Text>
            <TouchableOpacity onPress={goBack}>
              <Text style={styles.changeButton}>Alterar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectedEntregadorInfo}>
            <View style={styles.entregadorAvatar}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
            <Text style={styles.selectedEntregadorName}>
              {selectedEntregador?.name}
            </Text>
          </View>
        </View>

        {/* Deliveries List Header */}
        <View style={styles.deliveriesHeader}>
          <Text style={styles.deliveriesTitle}>
            Entregas Disponíveis ({deliveries.length})
          </Text>
          <TouchableOpacity onPress={selectAllDeliveries}>
            <Text style={styles.selectAllButton}>
              {selectedDeliveries.size === deliveries.length ? 'Desselecionar' : 'Selecionar'} Todas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selection Count */}
        {selectedDeliveries.size > 0 && (
          <View style={styles.selectionInfo}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text style={styles.selectionText}>
              {selectedDeliveries.size} entrega(s) selecionada(s)
            </Text>
          </View>
        )}

        {/* Deliveries List */}
        {deliveries.length === 0 ? (
          <View style={styles.emptyDeliveries}>
            <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Sem entregas disponíveis</Text>
          </View>
        ) : (
          deliveries.map((delivery) => {
            const isSelected = selectedDeliveries.has(delivery.delivery_id);
            return (
              <TouchableOpacity
                key={delivery.delivery_id}
                style={[styles.deliveryCard, isSelected && styles.deliveryCardSelected]}
                onPress={() => toggleDeliverySelection(delivery.delivery_id)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
                  <Text style={styles.clientName}>{delivery.client_name}</Text>
                  <Text style={styles.address} numberOfLines={1}>{delivery.address}</Text>
                  {delivery.entregador_name && (
                    <View style={styles.currentAssignment}>
                      <Ionicons name="person-outline" size={12} color="#64748b" />
                      <Text style={styles.currentAssignmentText}>
                        Atualmente: {delivery.entregador_name}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: delivery.status === 'pendente' ? '#fef3c7' : '#dbeafe' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: delivery.status === 'pendente' ? '#d97706' : '#3b82f6' }
                  ]}>
                    {delivery.status === 'pendente' ? 'Pendente' : 'Em Trânsito'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Action Button */}
      {selectedDeliveries.size > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.assignButton, isAssigning && styles.assignButtonDisabled]}
            onPress={assignDeliveries}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.assignButtonText}>
                  Atribuir {selectedDeliveries.size} Entrega(s)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Ionicons name="arrow-back" size={24} color="#1a365d" />
        <Text style={styles.backButtonText}>
          {step === 'select-deliveries' ? 'Voltar' : 'Cancelar'}
        </Text>
      </TouchableOpacity>

      {step === 'select-entregador' && renderSelectEntregador()}
      {step === 'select-deliveries' && renderSelectDeliveries()}
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
    paddingTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1a365d',
    fontWeight: '500',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
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
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a365d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  entregadorList: {
    gap: 12,
  },
  entregadorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  entregadorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entregadorInfo: {
    flex: 1,
  },
  entregadorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
  },
  entregadorEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  entregadorStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedEntregadorCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectedEntregadorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  changeButton: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '600',
  },
  selectedEntregadorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedEntregadorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginLeft: 8,
  },
  deliveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
  },
  selectAllButton: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  selectionText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  emptyDeliveries: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deliveryCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  deliveryInfo: {
    flex: 1,
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 14,
    color: '#1e293b',
    marginTop: 2,
  },
  address: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  currentAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  currentAssignmentText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  assignButtonDisabled: {
    opacity: 0.6,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
