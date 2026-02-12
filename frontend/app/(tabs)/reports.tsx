import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../src/contexts/AuthContext';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { apiRequest, getApiUrl } from '../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReportData {
  date: string;
  stats: {
    total: number;
    pendente: number;
    em_transito: number;
    entregue: number;
    falhou: number;
  };
  entregador_stats: Array<{
    name: string;
    total: number;
    entregue: number;
  }>;
}

export default function Reports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  const isAdmin = user?.role === 'admin';

  const fetchReport = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiRequest<ReportData>(`/reports/daily?date=${today}`);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const downloadReport = async (format: 'excel' | 'pdf') => {
    setDownloading(format);
    try {
      const today = new Date().toISOString().split('T')[0];
      const token = await AsyncStorage.getItem('session_token');
      const endpoint = format === 'excel' ? '/reports/excel' : '/reports/pdf';
      const url = `${getApiUrl()}${endpoint}?date=${today}`;

      if (Platform.OS === 'web') {
        // Web: direct download
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `relatorio_${today}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // Mobile: download and share
        const filename = `relatorio_${today}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('Sucesso', 'Ficheiro guardado');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Erro', 'Não foi possível descarregar o relatório');
    } finally {
      setDownloading(null);
    }
  };

  const closeDay = async () => {
    Alert.alert(
      'Fechar Dia',
      'Tem a certeza que deseja fechar o dia? Esta ação irá gerar um relatório final.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await apiRequest('/reports/close-day', { method: 'POST' });
              Alert.alert('Sucesso', 'Dia fechado com sucesso');
              fetchReport();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível fechar o dia');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const stats = reportData?.stats || { total: 0, pendente: 0, em_transito: 0, entregue: 0, falhou: 0 };
  const completionRate = stats.total > 0 ? Math.round((stats.entregue / stats.total) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Relatório Diário</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('pt-PT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Resumo do Dia</Text>
          <View style={styles.completionBadge}>
            <Text style={styles.completionText}>{completionRate}% concluído</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pendente}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.em_transito}</Text>
            <Text style={styles.statLabel}>Trânsito</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.entregue}</Text>
            <Text style={styles.statLabel}>Entregues</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.falhou}</Text>
            <Text style={styles.statLabel}>Falhadas</Text>
          </View>
        </View>
      </View>

      {/* Entregador Stats (Admin only) */}
      {isAdmin && reportData?.entregador_stats && reportData.entregador_stats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desempenho por Entregador</Text>
          {reportData.entregador_stats.map((e, index) => (
            <View key={index} style={styles.entregadorItem}>
              <View style={styles.entregadorInfo}>
                <Ionicons name="person-circle" size={40} color="#94a3b8" />
                <View style={styles.entregadorText}>
                  <Text style={styles.entregadorName}>{e.name}</Text>
                  <Text style={styles.entregadorStats}>
                    {e.total} entregas • {e.entregue} concluídas
                  </Text>
                </View>
              </View>
              <View style={styles.entregadorRate}>
                <Text style={styles.rateText}>
                  {e.total > 0 ? Math.round((e.entregue / e.total) * 100) : 0}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Download Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exportar Relatório</Text>
        <View style={styles.downloadButtons}>
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: '#dcfce7' }]}
            onPress={() => downloadReport('excel')}
            disabled={downloading !== null}
          >
            <Ionicons name="document" size={24} color="#16a34a" />
            <Text style={[styles.downloadText, { color: '#16a34a' }]}>
              {downloading === 'excel' ? 'A descarregar...' : 'Excel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: '#fee2e2' }]}
            onPress={() => downloadReport('pdf')}
            disabled={downloading !== null}
          >
            <Ionicons name="document-text" size={24} color="#dc2626" />
            <Text style={[styles.downloadText, { color: '#dc2626' }]}>
              {downloading === 'pdf' ? 'A descarregar...' : 'PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Close Day Button (Admin only) */}
      {isAdmin && (
        <TouchableOpacity style={styles.closeDayButton} onPress={closeDay}>
          <Ionicons name="lock-closed" size={20} color="#fff" />
          <Text style={styles.closeDayText}>Fechar Dia</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a365d',
  },
  completionBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a365d',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 12,
  },
  entregadorItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entregadorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entregadorText: {
    marginLeft: 12,
  },
  entregadorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  entregadorStats: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  entregadorRate: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  downloadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadText: {
    fontSize: 15,
    fontWeight: '600',
  },
  closeDayButton: {
    backgroundColor: '#1a365d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  closeDayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
