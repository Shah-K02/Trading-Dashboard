import { useEffect, useState, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AccountSwitcher } from "./AccountSwitcher";
import { useAppStore } from "../../lib/store";

type Props = { children: ReactNode };

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/trades",    label: "Trades",    icon: "📅" },
  { to: "/analytics", label: "Analytics", icon: "📈" },
];

export function AppLayout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loadActiveAccount, logout, user } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadActiveAccount();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Top header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="TradeLens" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="text-lg font-bold leading-tight sm:text-xl">TradeLens</h1>
              <p className="hidden text-xs text-slate-400 sm:block">MetaTrader 5 analytics</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Account switcher + user + logout */}
          <div className="hidden items-center gap-3 sm:flex">
            <AccountSwitcher />
            {user && (
              <span className="text-xs text-slate-500 hidden lg:block">
                @{user.username}
              </span>
            )}
            <button
              id="logout-btn"
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 sm:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <nav className="border-t border-slate-800 bg-slate-900 px-4 pb-4 pt-2 sm:hidden">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            {/* Account switcher + logout in mobile menu */}
            <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
              <AccountSwitcher />
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                Logout{user ? ` (@${user.username})` : ""}
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 sm:py-8 sm:pb-8">
        {children}
      </main>

      {/* ── Mobile bottom nav bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur sm:hidden">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? "text-white" : "text-slate-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-xl leading-none ${isActive ? "" : "opacity-60"}`}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-emerald-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
