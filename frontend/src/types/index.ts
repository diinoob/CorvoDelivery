export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'entregador';
  created_at: string;
  is_active: boolean;
}

export interface Delivery {
  delivery_id: string;
  entregador_id: string;
  entregador_name: string;
  client_name: string;
  client_email?: string;
  address: string;
  tracking_code: string;
  status: 'pendente' | 'em_transito' | 'entregue' | 'falhou';
  notes?: string;
  photo?: string;
  signature?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
}

export interface DashboardStats {
  all_time: {
    total: number;
    pendente: number;
    em_transito: number;
    entregue: number;
    falhou: number;
  };
  today: {
    total: number;
    pendente?: number;
    em_transito?: number;
    entregue?: number;
    falhou?: number;
  };
  entregadores_count: number;
}

export interface DailyReport {
  report_id: string;
  date: string;
  total_deliveries: number;
  completed: number;
  pending: number;
  failed: number;
  entregador_stats: Array<{
    user_id: string;
    name: string;
    total: number;
    pendente: number;
    em_transito: number;
    entregue: number;
    falhou: number;
  }>;
  created_at: string;
}
