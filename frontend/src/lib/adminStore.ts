import { create } from 'zustand';

type AdminUser = { id: string; username: string };

type AdminState = {
  adminToken: string | null;
  adminUser: AdminUser | null;
  setAdminAuth: (token: string, user: AdminUser) => void;
  adminLogout: () => void;
};

const ADMIN_TOKEN_KEY = 'tl_admin_token';

export const useAdminStore = create<AdminState>((set) => ({
  adminToken: localStorage.getItem(ADMIN_TOKEN_KEY),
  adminUser: null,

  setAdminAuth: (token, user) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    set({ adminToken: token, adminUser: user });
  },

  adminLogout: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    set({ adminToken: null, adminUser: null });
  },
}));
