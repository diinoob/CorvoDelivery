import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { DeliveryCard } from '../../src/components/DeliveryCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { apiRequest } from '../../src/utils/api';
import { Delivery } from '../../src/types';

const statusFilters = [
  { key: 'all', label: 'Todas' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'em_transito', label: 'Em Trânsito' },
  { key: 'entregue', label: 'Entregues' },
  { key: 'falhou', label: 'Falhadas' },
];

export default function Deliveries() {
  const router = useRouter();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const endpoint = selectedFilter === 'all' 
        ? '/deliveries' 
        : `/deliveries?status=${selectedFilter}`;
      const data = await apiRequest<Delivery[]>(endpoint);
      setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [selectedFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async (newStatus: string) => {
    if (selectedIds.length === 0) {
      Alert.alert('Aviso', 'Selecione pelo menos uma entrega');
      return;
    }

    try {
      await apiRequest('/deliveries/bulk-status', {
        method: 'POST',
        body: JSON.stringify({
          delivery_ids: selectedIds,
          status: newStatus,
        }),
      });
      Alert.alert('Sucesso', `${selectedIds.length} entregas atualizadas`);
      setSelectedIds([]);
      setBulkMode(false);
      fetchDeliveries();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar as entregas');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <FlatList
        horizontal
        data={statusFilters}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === item.key && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(item.key)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === item.key && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Bulk Actions */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={styles.bulkButton}
          onPress={() => {
            setBulkMode(!bulkMode);
            setSelectedIds([]);
          }}
        >
          <Ionicons
            name={bulkMode ? 'close' : 'checkbox-outline'}
            size={20}
            color="#64748b"
          />
          <Text style={styles.bulkButtonText}>
            {bulkMode ? 'Cancelar' : 'Selecionar'}
          </Text>
        </TouchableOpacity>

        {bulkMode && selectedIds.length > 0 && (
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#dbeafe' }]}
              onPress={() => handleBulkUpdate('em_transito')}
            >
              <Ionicons name="car" size={16} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#d1fae5' }]}
              onPress={() => handleBulkUpdate('entregue')}
            >
              <Ionicons name="checkmark" size={16} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#fee2e2' }]}
              onPress={() => handleBulkUpdate('falhou')}
            >
              <Ionicons name="close" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/delivery/new')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Deliveries List */}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.delivery_id}
        renderItem={({ item }) => (
          <DeliveryCard
            delivery={item}
            onPress={() => router.push(`/delivery/${item.delivery_id}`)}
            showCheckbox={bulkMode}
            isSelected={selectedIds.includes(item.delivery_id)}
            onToggleSelect={() => toggleSelect(item.delivery_id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Sem entregas</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter !== 'all'
                ? 'Nenhuma entrega com este estado'
                : 'Comece por registar uma nova entrega'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterList: {
    maxHeight: 56,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1a365d',
    borderColor: '#1a365d',
  },
  filterText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 16,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
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
});
