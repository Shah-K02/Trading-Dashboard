import axios from 'axios';
import { useAdminStore } from './adminStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach admin token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('tl_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout admin on 401
adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tl_admin_token');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  account_count: number;
  trade_count: number;
}

export interface AdminAccount {
  id: string;
  broker_name: string;
  account_name: string | null;
  account_number: string;
  server_name: string | null;
  base_currency: string;
  leverage: string | null;
  is_active: boolean;
  created_at: string;
  owner_username: string | null;
}

export interface AdminStats {
  total_users: number;
  total_accounts: number;
  total_trades: number;
  active_users: number;
  admin_users: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const adminLogin = async (username: string, password: string) => {
  const { data } = await adminApi.post('/admin/login', { username, password });
  return data as { access_token: string; admin: { id: string; username: string } };
};

export const fetchAdminStats = async (): Promise<AdminStats> => {
  const { data } = await adminApi.get('/admin/stats');
  return data;
};

export const fetchAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  const { data } = await adminApi.get('/admin/users', {
    params: search ? { search } : {},
  });
  return data;
};

export const patchUserStatus = async (id: string, is_active: boolean) => {
  const { data } = await adminApi.patch(`/admin/users/${id}/status`, { is_active });
  return data;
};

export const patchUserAdminRole = async (id: string, is_admin: boolean) => {
  const { data } = await adminApi.patch(`/admin/users/${id}/admin`, { is_admin });
  return data;
};

export const deleteAdminUser = async (id: string) => {
  await adminApi.delete(`/admin/users/${id}`);
};

export const fetchAdminAccounts = async (search?: string): Promise<AdminAccount[]> => {
  const { data } = await adminApi.get('/admin/accounts', {
    params: search ? { search } : {},
  });
  return data;
};

export const patchAccountStatus = async (id: string, is_active: boolean) => {
  const { data } = await adminApi.patch(`/admin/accounts/${id}/status`, { is_active });
  return data;
};
