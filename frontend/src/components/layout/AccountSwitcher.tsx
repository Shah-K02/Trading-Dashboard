import { useEffect, useRef, useState } from "react";
import { fetchAccounts, selectAccount, type AccountInfo } from "../../lib/api";
import { useAppStore } from "../../lib/store";

export function AccountSwitcher() {
  const { activeAccount, setActiveAccount } = useAppStore();
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchAccounts().then(setAccounts);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (acc: AccountInfo) => {
    if (acc.id === activeAccount?.id) { setOpen(false); return; }
    setLoading(true);
    try {
      const updated = await selectAccount(acc.id);
      setActiveAccount(updated);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        No account — sync MT5
      </div>
    );
  }

  const initials = activeAccount.broker_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-sm transition-colors hover:border-slate-500 hover:bg-slate-700/80"
      >
        {/* Avatar */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
          {initials}
        </span>

        {/* Account info */}
        <span className="hidden max-w-[140px] truncate text-left sm:block">
          <span className="block truncate font-medium leading-tight text-slate-100">
            {activeAccount.broker_name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-slate-400">
            #{activeAccount.account_number}
          </span>
        </span>

        {/* Currency badge */}
        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
          {activeAccount.base_currency}
        </span>

        {/* Chevron */}
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Switch Account
            </p>
          </div>

          <ul className="max-h-72 overflow-y-auto py-1">
            {accounts.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">Loading…</li>
            )}
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccount.id;
              const ini = acc.broker_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <li key={acc.id}>
                  <button
                    onClick={() => handleSelect(acc)}
                    disabled={loading}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800 ${
                      isActive ? "bg-slate-800/60" : ""
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-300"
                    }`}>
                      {ini}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-100">
                        {acc.broker_name}
                        {acc.account_name ? ` — ${acc.account_name}` : ""}
                      </span>
                      <span className="block text-xs text-slate-400">
                        #{acc.account_number} · {acc.base_currency}
                        {acc.leverage ? ` · 1:${acc.leverage}` : ""}
                      </span>
                    </span>
                    {isActive && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-slate-800 px-4 py-2.5">
            <p className="text-[11px] text-slate-600">
              Accounts are created automatically when you sync MT5.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
