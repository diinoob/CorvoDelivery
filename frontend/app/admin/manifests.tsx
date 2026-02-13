import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { apiRequest } from '../../src/utils/api';

interface ManifestSummary {
  manifest_id: string;
  route_id: string;
  date: string;
  location: string;
  total_entries: number;
  deliveries_created: number;
  closed: boolean;
  created_at: string;
  created_by_name?: string;
}

export default function ManifestsScreen() {
  const router = useRouter();
  const [manifests, setManifests] = useState<ManifestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchManifests = async () => {
    try {
      const data = await apiRequest<ManifestSummary[]>('/manifests');
      setManifests(data);
    } catch (error) {
      console.error('Error fetching manifests:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchManifests();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchManifests();
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const renderManifest = ({ item }: { item: ManifestSummary }) => (
    <TouchableOpacity
      style={styles.manifestCard}
      onPress={() => router.push(`/admin/manifest-detail?id=${item.manifest_id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.routeInfo}>
          <Ionicons name="document-text" size={24} color="#1a365d" />
          <View style={styles.routeText}>
            <Text style={styles.routeId}>{item.route_id}</Text>
            <Text style={styles.routeLocation}>{item.location}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.closed ? '#d1fae5' : '#fef3c7' }]}>
          <Text style={[styles.statusText, { color: item.closed ? '#059669' : '#d97706' }]}>
            {item.closed ? 'Fechado' : 'Aberto'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <Text style={styles.statText}>{item.date}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={16} color="#64748b" />
          <Text style={styles.statText}>{item.total_entries} entregas</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.createdBy}>
          Criado por {item.created_by_name || 'Admin'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={manifests}
        keyExtractor={(item) => item.manifest_id}
        renderItem={renderManifest}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {manifests.length} manifesto{manifests.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/admin/manifest-create')}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Sem manifestos</Text>
            <Text style={styles.emptySubtext}>
              Crie um novo manifesto para registar entregas
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/admin/manifest-create')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Criar Manifesto</Text>
            </TouchableOpacity>
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
  manifestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeText: {
    flex: 1,
  },
  routeId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
  },
  routeLocation: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  createdBy: {
    fontSize: 12,
    color: '#94a3b8',
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
});
