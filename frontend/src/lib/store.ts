import { create } from "zustand";
import { fetchActiveAccount, type AccountInfo } from "./api";

type User = { id: string; username: string };

type AppState = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;

  // ── Account ───────────────────────────────────────────────────────────────
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;
  activeAccount: AccountInfo | null;
  setActiveAccount: (account: AccountInfo | null) => void;
  loadActiveAccount: () => Promise<void>;
};

const TOKEN_KEY = "tl_token";
const USER_KEY = "tl_user";

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set) => ({
  // Persist token AND user across page reloads
  token: localStorage.getItem(TOKEN_KEY),
  user: readStoredUser(),

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, activeAccount: null });
  },

  selectedSymbol: null,
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),

  activeAccount: null,
  setActiveAccount: (activeAccount) => set({ activeAccount }),
  loadActiveAccount: async () => {
    try {
      const account = await fetchActiveAccount();
      set({ activeAccount: account });
    } catch {
      set({ activeAccount: null });
    }
  },
}));

