import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminAccounts,
  patchUserStatus,
  patchUserAdminRole,
  deleteAdminUser,
  patchAccountStatus,
  type AdminUser,
  type AdminAccount,
  type AdminStats,
} from '../../lib/adminApi';
import { useAdminStore } from '../../lib/adminStore';
import './admin.css';

type Tab = 'users' | 'accounts';

interface ConfirmModal {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

const DEFAULT_MODAL: ConfirmModal = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  danger: false,
  onConfirm: () => {},
};

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="admin-stat-card" style={{ '--accent': color } as React.CSSProperties}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-body">
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-label">{label}</span>
      </div>
    </div>
  );
}

function StatusBadge({ active, labels = ['Active', 'Disabled'] }: { active: boolean; labels?: [string, string] }) {
  return (
    <span className={`admin-badge ${active ? 'admin-badge-green' : 'admin-badge-red'}`}>
      <span className="admin-badge-dot" />
      {active ? labels[0] : labels[1]}
    </span>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdminStore();

  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ConfirmModal>(DEFAULT_MODAL);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = (config: Omit<ConfirmModal, 'open'>) =>
    setModal({ ...config, open: true });

  const closeModal = () => setModal(DEFAULT_MODAL);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchAdminStats();
      setStats(s);
    } catch {}
  }, []);

  const loadUsers = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const u = await fetchAdminUsers(search || undefined);
      setUsers(u);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const a = await fetchAdminAccounts(search || undefined);
      setAccounts(a);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUsers();
    loadAccounts();
  }, [loadStats, loadUsers, loadAccounts]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadUsers(userSearch), 350);
    return () => clearTimeout(t);
  }, [userSearch, loadUsers]);

  useEffect(() => {
    const t = setTimeout(() => loadAccounts(accountSearch), 350);
    return () => clearTimeout(t);
  }, [accountSearch, loadAccounts]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggleUserStatus = (user: AdminUser) => {
    const nextState = !user.is_active;
    openModal({
      title: nextState ? 'Enable User' : 'Disable User',
      message: nextState
        ? `Enable ${user.username}? They will be able to log in again.`
        : `Disable ${user.username}? They will be immediately signed out and unable to log in.`,
      confirmLabel: nextState ? 'Enable' : 'Disable',
      danger: !nextState,
      onConfirm: async () => {
        closeModal();
        try {
          await patchUserStatus(user.id, nextState);
          showToast(`${user.username} has been ${nextState ? 'enabled' : 'disabled'}.`);
          loadUsers(userSearch);
          loadStats();
        } catch (e: any) {
          showToast(e?.response?.data?.detail || 'Action failed', 'error');
        }
      },
    });
  };

  const handleToggleAdmin = (user: AdminUser) => {
    const nextState = !user.is_admin;
    openModal({
      title: nextState ? 'Grant Admin' : 'Revoke Admin',
      message: nextState
        ? `Grant admin privileges to ${user.username}? They will have full admin access.`
        : `Revoke admin privileges from ${user.username}?`,
      confirmLabel: nextState ? 'Grant Admin' : 'Revoke Admin',
      danger: false,
      onConfirm: async () => {
        closeModal();
        try {
          await patchUserAdminRole(user.id, nextState);
          showToast(`Admin role ${nextState ? 'granted to' : 'revoked from'} ${user.username}.`);
          loadUsers(userSearch);
          loadStats();
        } catch (e: any) {
          showToast(e?.response?.data?.detail || 'Action failed', 'error');
        }
      },
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    openModal({
      title: 'Delete User',
      message: `Permanently delete ${user.username}? This will also delete all their accounts and trade data. This action CANNOT be undone.`,
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        closeModal();
        try {
          await deleteAdminUser(user.id);
          showToast(`${user.username} has been deleted.`);
          loadUsers(userSearch);
          loadStats();
        } catch (e: any) {
          showToast(e?.response?.data?.detail || 'Delete failed', 'error');
        }
      },
    });
  };

  const handleToggleAccountStatus = (account: AdminAccount) => {
    const nextState = !account.is_active;
    openModal({
      title: nextState ? 'Enable Account' : 'Disable Account',
      message: `${nextState ? 'Enable' : 'Disable'} account ${account.account_number} (${account.broker_name})?`,
      confirmLabel: nextState ? 'Enable' : 'Disable',
      danger: !nextState,
      onConfirm: async () => {
        closeModal();
        try {
          await patchAccountStatus(account.id, nextState);
          showToast(`Account ${account.account_number} ${nextState ? 'enabled' : 'disabled'}.`);
          loadAccounts(accountSearch);
        } catch (e: any) {
          showToast(e?.response?.data?.detail || 'Action failed', 'error');
        }
      },
    });
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login', { replace: true });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="admin-root">
      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`} role="status">
          {toast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Confirm Modal ──────────────────────────────────────────────── */}
      {modal.open && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="admin-modal-title">{modal.title}</h3>
            <p className="admin-modal-body">{modal.message}</p>
            <div className="admin-modal-actions">
              <button id="admin-modal-cancel" className="admin-btn admin-btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                id="admin-modal-confirm"
                className={`admin-btn ${modal.danger ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                onClick={modal.onConfirm}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-shield">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <span className="admin-header-title">TradeLens Admin</span>
            <span className="admin-header-sep">|</span>
            <span className="admin-header-env">Control Panel</span>
          </div>
        </div>
        <div className="admin-header-right">
          <span className="admin-header-user">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {adminUser?.username ?? 'Admin'}
          </span>
          <button id="admin-logout-btn" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <section className="admin-stats-grid" aria-label="Platform statistics">
          <StatCard
            label="Total Users"
            value={stats?.total_users ?? '—'}
            color="#a78bfa"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Active Users"
            value={stats?.active_users ?? '—'}
            color="#34d399"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            }
          />
          <StatCard
            label="MT5 Accounts"
            value={stats?.total_accounts ?? '—'}
            color="#60a5fa"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Total Trades"
            value={stats?.total_trades ?? '—'}
            color="#fb923c"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            }
          />
          <StatCard
            label="Admin Users"
            value={stats?.admin_users ?? '—'}
            color="#f472b6"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
        </section>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div className="admin-tabs" role="tablist">
          <button
            id="admin-tab-users"
            role="tab"
            aria-selected={tab === 'users'}
            className={`admin-tab ${tab === 'users' ? 'admin-tab-active' : ''}`}
            onClick={() => setTab('users')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Users
            <span className="admin-tab-count">{users.length}</span>
          </button>
          <button
            id="admin-tab-accounts"
            role="tab"
            aria-selected={tab === 'accounts'}
            className={`admin-tab ${tab === 'accounts' ? 'admin-tab-active' : ''}`}
            onClick={() => setTab('accounts')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            MT5 Accounts
            <span className="admin-tab-count">{accounts.length}</span>
          </button>
        </div>

        {/* ── Users Table ─────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <section className="admin-panel" aria-label="Users management">
            <div className="admin-panel-toolbar">
              <div className="admin-search-wrap">
                <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="admin-user-search"
                  type="search"
                  className="admin-search"
                  placeholder="Search by username…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <button
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => loadUsers(userSearch)}
                title="Refresh"
                id="admin-users-refresh"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>

            <div className="admin-table-wrap">
              {loading ? (
                <div className="admin-loading">
                  <span className="admin-spinner" />
                  Loading users…
                </div>
              ) : users.length === 0 ? (
                <div className="admin-empty">No users found.</div>
              ) : (
                <table className="admin-table" id="admin-users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th className="admin-th-center">Accounts</th>
                      <th className="admin-th-center">Trades</th>
                      <th className="admin-th-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="admin-table-row">
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="admin-username">{u.username}</span>
                          </div>
                        </td>
                        <td className="admin-td-muted">{u.email ?? '—'}</td>
                        <td className="admin-td-muted">{formatDate(u.created_at)}</td>
                        <td><StatusBadge active={u.is_active} /></td>
                        <td>
                          <span className={`admin-badge ${u.is_admin ? 'admin-badge-purple' : 'admin-badge-gray'}`}>
                            {u.is_admin ? '🛡 Admin' : 'User'}
                          </span>
                        </td>
                        <td className="admin-td-center">{u.account_count}</td>
                        <td className="admin-td-center">{u.trade_count}</td>
                        <td className="admin-td-right">
                          <div className="admin-actions">
                            <button
                              className={`admin-action-btn ${u.is_active ? 'admin-action-warn' : 'admin-action-success'}`}
                              onClick={() => handleToggleUserStatus(u)}
                              title={u.is_active ? 'Disable user' : 'Enable user'}
                              id={`admin-toggle-status-${u.id}`}
                            >
                              {u.is_active ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                              {u.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="admin-action-btn admin-action-purple"
                              onClick={() => handleToggleAdmin(u)}
                              title={u.is_admin ? 'Revoke admin' : 'Grant admin'}
                              id={`admin-toggle-admin-${u.id}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                              {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                            <button
                              className="admin-action-btn admin-action-danger"
                              onClick={() => handleDeleteUser(u)}
                              title="Delete user permanently"
                              id={`admin-delete-user-${u.id}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* ── Accounts Table ──────────────────────────────────────────────── */}
        {tab === 'accounts' && (
          <section className="admin-panel" aria-label="Accounts management">
            <div className="admin-panel-toolbar">
              <div className="admin-search-wrap">
                <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="admin-account-search"
                  type="search"
                  className="admin-search"
                  placeholder="Search by broker or account number…"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                />
              </div>
              <button
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => loadAccounts(accountSearch)}
                title="Refresh"
                id="admin-accounts-refresh"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>

            <div className="admin-table-wrap">
              {loading ? (
                <div className="admin-loading">
                  <span className="admin-spinner" />
                  Loading accounts…
                </div>
              ) : accounts.length === 0 ? (
                <div className="admin-empty">No accounts found.</div>
              ) : (
                <table className="admin-table" id="admin-accounts-table">
                  <thead>
                    <tr>
                      <th>Broker</th>
                      <th>Account #</th>
                      <th>Currency</th>
                      <th>Leverage</th>
                      <th>Owner</th>
                      <th>Added</th>
                      <th>Status</th>
                      <th className="admin-th-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id} className="admin-table-row">
                        <td>
                          <div className="admin-broker-cell">
                            <div className="admin-broker-icon">
                              {a.broker_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="admin-broker-name">{a.broker_name}</div>
                              {a.account_name && (
                                <div className="admin-broker-sub">{a.account_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="admin-mono">{a.account_number}</td>
                        <td>
                          <span className="admin-badge admin-badge-blue">{a.base_currency}</span>
                        </td>
                        <td className="admin-td-muted">{a.leverage ?? '—'}</td>
                        <td>
                          {a.owner_username ? (
                            <span className="admin-owner-chip">{a.owner_username}</span>
                          ) : (
                            <span className="admin-td-muted">—</span>
                          )}
                        </td>
                        <td className="admin-td-muted">{formatDate(a.created_at)}</td>
                        <td><StatusBadge active={a.is_active} /></td>
                        <td className="admin-td-right">
                          <div className="admin-actions">
                            <button
                              className={`admin-action-btn ${a.is_active ? 'admin-action-warn' : 'admin-action-success'}`}
                              onClick={() => handleToggleAccountStatus(a)}
                              id={`admin-toggle-account-${a.id}`}
                            >
                              {a.is_active ? (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                  </svg>
                                  Disable
                                </>
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Enable
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
