import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { StatCard } from '../../src/components/StatCard';
import { apiRequest } from '../../src/utils/api';
import { User } from '../../src/types';

interface UserStats {
  user: User;
  stats: {
    total: number;
    pendente: number;
    em_transito: number;
    entregue: number;
    falhou: number;
  };
  today_deliveries: number;
}

export default function UserStatsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [data, setData] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const statsData = await apiRequest<UserStats>(`/users/${userId}/stats`);
      setData(statsData);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (isLoading || !data) {
    return <LoadingScreen />;
  }

  const { user, stats, today_deliveries } = data;
  const successRate = stats.total > 0 ? Math.round((stats.entregue / stats.total) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={48} color="#64748b" />
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: user.is_active ? '#d1fae5' : '#fee2e2' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: user.is_active ? '#059669' : '#dc2626' }
          ]}>
            {user.is_active ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>

      {/* Performance Overview */}
      <View style={styles.performanceCard}>
        <Text style={styles.performanceTitle}>Desempenho Geral</Text>
        <View style={styles.performanceStats}>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceValue}>{stats.total}</Text>
            <Text style={styles.performanceLabel}>Total Entregas</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={[styles.performanceValue, { color: '#10b981' }]}>{successRate}%</Text>
            <Text style={styles.performanceLabel}>Taxa Sucesso</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={[styles.performanceValue, { color: '#3b82f6' }]}>{today_deliveries}</Text>
            <Text style={styles.performanceLabel}>Hoje</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Estatísticas Detalhadas</Text>
      <StatCard
        title="Pendentes"
        value={stats.pendente}
        icon="time"
        color="#f59e0b"
        subtitle="Aguardam distribuição"
      />
      <StatCard
        title="Em Trânsito"
        value={stats.em_transito}
        icon="car"
        color="#3b82f6"
        subtitle="Em distribuição"
      />
      <StatCard
        title="Entregues"
        value={stats.entregue}
        icon="checkmark-circle"
        color="#10b981"
        subtitle="Concluídas com sucesso"
      />
      <StatCard
        title="Falhadas"
        value={stats.falhou}
        icon="close-circle"
        color="#ef4444"
        subtitle="Não entregues"
      />

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
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  performanceCard: {
    backgroundColor: '#1a365d',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  performanceTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 12,
  },
});
