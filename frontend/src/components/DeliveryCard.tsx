import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Delivery } from '../types';

interface DeliveryCardProps {
  delivery: Delivery;
  onPress?: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const statusConfig = {
  pendente: { color: '#f59e0b', label: 'Pendente', icon: 'time-outline' as const },
  em_transito: { color: '#3b82f6', label: 'Em Trânsito', icon: 'car-outline' as const },
  entregue: { color: '#10b981', label: 'Entregue', icon: 'checkmark-circle-outline' as const },
  falhou: { color: '#ef4444', label: 'Falhou', icon: 'close-circle-outline' as const },
};

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onPress,
  showCheckbox,
  isSelected,
  onToggleSelect,
}) => {
  const status = statusConfig[delivery.status] || statusConfig.pendente;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showCheckbox && (
        <TouchableOpacity style={styles.checkbox} onPress={onToggleSelect}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? '#1a365d' : '#94a3b8'}
          />
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.clientName}>{delivery.client_name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.address} numberOfLines={1}>{delivery.address}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(delivery.created_at)}</Text>
          {delivery.photo && <Ionicons name="camera" size={14} color="#64748b" />}
          {delivery.signature && <Ionicons name="pencil" size={14} color="#64748b" />}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selected: {
    borderWidth: 2,
    borderColor: '#1a365d',
  },
  checkbox: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
});
