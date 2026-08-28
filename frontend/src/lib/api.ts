/// <reference types="vite/client" />
import axios from 'axios';

export interface TradeListItem {
  id: string;
  side: string;
  status: string;
  open_time: string;
  close_time: string | null;
  entry_price: number;
  exit_price: number | null;
  lot_size: number;
  net_pnl: number;
  planned_rr: number | null;
  actual_rr: number | null;
  strategy_tag: string | null;
  symbol_name: string | null;
}

export interface AccountInfo {
  id: string;
  broker_name: string;
  account_name: string | null;
  account_number: string;
  server_name: string | null;
  base_currency: string;
  leverage: string | null;
  is_active: boolean;
  last_synced_at: string | null;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-logout on 401 ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tl_token');
      // Redirect to login without using React Router (works from outside components)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const register = async (username: string, password: string) => {
  const { data } = await api.post('/auth/register', { username, password });
  return data as { access_token: string; user: { id: string; username: string } };
};

export const login = async (username: string, password: string) => {
  const { data } = await api.post('/auth/login', { username, password });
  return data as { access_token: string; user: { id: string; username: string } };
};

export const fetchMe = async () => {
  const { data } = await api.get('/auth/me');
  return data as { id: string; username: string };
};

// ── Accounts ──────────────────────────────────────────────────────────────────

export const fetchAccounts = async (): Promise<AccountInfo[]> => {
  const { data } = await api.get('/accounts');
  return data;
};

export const fetchActiveAccount = async (): Promise<AccountInfo> => {
  const { data } = await api.get('/accounts/active');
  return data;
};

export const selectAccount = async (id: string): Promise<AccountInfo> => {
  const { data } = await api.put(`/accounts/${id}/select`);
  return data;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const fetchAnalyticsSummary = async (accountId?: string | null) => {
  const { data } = await api.get('/analytics/summary', {
    params: accountId ? { account_id: accountId } : {},
  });
  return data;
};

export const fetchEquityCurve = async (accountId?: string | null) => {
  const { data } = await api.get('/analytics/equity', {
    params: accountId ? { account_id: accountId } : {},
  });
  return data;
};

export const fetchMonthlyStats = async (accountId?: string | null) => {
  const { data } = await api.get('/analytics/monthly', {
    params: accountId ? { account_id: accountId } : {},
  });
  return data;
};

export const fetchSymbolBreakdown = async (accountId?: string | null) => {
  const { data } = await api.get('/analytics/by-symbol', {
    params: accountId ? { account_id: accountId } : {},
  });
  return data;
};

export const importMT5Trades = async () => {
  const { data } = await api.post('/import/mt5');
  return data;
};

export interface TradeFilters {
  symbol?: string | null;
  side?: string | null;
  strategyTag?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export const fetchTrades = async (
  limit = 50,
  offset = 0,
  date?: string | null,
  accountId?: string | null,
  filters?: TradeFilters
) => {
  const { data } = await api.get('/trades', {
    params: {
      limit,
      offset,
      ...(date ? { date } : {}),
      ...(accountId ? { account_id: accountId } : {}),
      ...(filters?.symbol ? { symbol: filters.symbol } : {}),
      ...(filters?.side ? { side: filters.side } : {}),
      ...(filters?.strategyTag ? { strategy_tag: filters.strategyTag } : {}),
      ...(filters?.dateFrom ? { date_from: filters.dateFrom } : {}),
      ...(filters?.dateTo ? { date_to: filters.dateTo } : {}),
    },
  });
  return data;
};

export const fetchDowBreakdown = async (accountId?: string | null) => {
  const { data } = await api.get('/analytics/by-dow', {
    params: accountId ? { account_id: accountId } : {},
  });
  return data;
};

export const fetchTradeDetail = async (id: string) => {
  const { data } = await api.get(`/trades/${id}`);
  return data;
};

export const fetchTradeChart = async (id: string, timeframe = "M15") => {
  const { data } = await api.get(`/trades/${id}/chart`, { params: { timeframe } });
  return data;
};

export const fetchSessionBreakdown = async (accountId?: string | null) => {
  const { data } = await api.get('/analytics/by-session', {
    params: accountId ? { account_id: accountId } : {},
  });
  return data;
};

export const saveJournalNotes = async (id: string, note: string) => {
  const { data } = await api.patch(`/trades/${id}/journal`, { note_summary: note });
  return data;
};

export const uploadJournalImage = async (id: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  // Use the shared api instance (has auth interceptor) — NOT hardcoded localhost
  const { data } = await api.post(
    `/trades/${id}/journal/images`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
};

export const deleteJournalImage = async (id: string, filename: string) => {
  const { data } = await api.delete(`/trades/${id}/journal/images/${filename}`);
  return data;
};

export const fetchCalendarData = async (year: number, month: number, accountId?: string | null) => {
  const { data } = await api.get('/analytics/calendar', {
    params: {
      year,
      month,
      ...(accountId ? { account_id: accountId } : {}),
    },
  });
  return data;
};

export const saveTagUpdates = async (
  id: string,
  tags: { strategy_tag?: string; setup_tag?: string; session?: string }
) => {
  const { data } = await api.patch(`/trades/${id}/tags`, tags);
  return data;
};
