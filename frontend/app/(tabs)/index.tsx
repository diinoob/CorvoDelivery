import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { StatCard } from '../../src/components/StatCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { apiRequest } from '../../src/utils/api';
import { DashboardStats, Delivery } from '../../src/types';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, deliveriesData] = await Promise.all([
        apiRequest<DashboardStats>('/stats/dashboard'),
        apiRequest<Delivery[]>('/deliveries?status=pendente'),
      ]);
      setStats(statsData);
      setRecentDeliveries(deliveriesData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}</Text>
        <Text style={styles.role}>
          {isAdmin ? 'Administrador' : 'Entregador'}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/delivery/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="add" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.actionText}>Nova Entrega</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/users')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="people" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Utilizadores</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/reports')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="document-text" size={24} color="#10b981" />
          </View>
          <Text style={styles.actionText}>Relatórios</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Estatísticas de Hoje</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Hoje"
          value={stats?.today?.total || 0}
          icon="cube"
          color="#3b82f6"
        />
        <StatCard
          title="Pendentes"
          value={stats?.all_time?.pendente || 0}
          icon="time"
          color="#f59e0b"
        />
        <StatCard
          title="Entregues"
          value={stats?.all_time?.entregue || 0}
          icon="checkmark-circle"
          color="#10b981"
        />
        <StatCard
          title="Falhadas"
          value={stats?.all_time?.falhou || 0}
          icon="close-circle"
          color="#ef4444"
        />
      </View>

      {isAdmin && (
        <>
          <Text style={styles.sectionTitle}>Visão Geral</Text>
          <StatCard
            title="Entregadores Ativos"
            value={stats?.entregadores_count || 0}
            icon="people"
            color="#8b5cf6"
            subtitle="Com acesso ao sistema"
          />
          <StatCard
            title="Total de Entregas"
            value={stats?.all_time?.total || 0}
            icon="cube"
            color="#1a365d"
            subtitle="Desde sempre"
          />
        </>
      )}

      {/* Pending Deliveries */}
      {recentDeliveries.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Entregas Pendentes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/deliveries')}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {recentDeliveries.map((delivery) => (
            <TouchableOpacity
              key={delivery.delivery_id}
              style={styles.deliveryItem}
              onPress={() => router.push(`/delivery/${delivery.delivery_id}`)}
            >
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryCode}>{delivery.tracking_code}</Text>
                <Text style={styles.deliveryClient}>{delivery.client_name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
  },
  role: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 12,
    marginTop: 8,
  },
  seeAll: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  statsGrid: {
    gap: 0,
  },
  deliveryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
  },
  deliveryClient: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});
