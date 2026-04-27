import { useQuery } from "@tanstack/react-query";
import { fetchSessionBreakdown } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { useAppStore } from "../../lib/store";

const SESSION_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  asia:     { bar: "bg-yellow-500/70 hover:bg-yellow-500",    text: "text-yellow-400",  bg: "bg-yellow-900/20" },
  london:   { bar: "bg-blue-500/70 hover:bg-blue-500",        text: "text-blue-400",    bg: "bg-blue-900/20"   },
  new_york: { bar: "bg-purple-500/70 hover:bg-purple-500",    text: "text-purple-400",  bg: "bg-purple-900/20" },
  overlap:  { bar: "bg-emerald-500/70 hover:bg-emerald-500",  text: "text-emerald-400", bg: "bg-emerald-900/20"},
  other:    { bar: "bg-slate-500/70 hover:bg-slate-500",      text: "text-slate-400",   bg: "bg-slate-800/40"  },
  "":       { bar: "bg-slate-600/70 hover:bg-slate-600",      text: "text-slate-500",   bg: "bg-slate-800/20"  },
};
const DEFAULT_COLORS = { bar: "bg-slate-500/70", text: "text-slate-400", bg: "bg-slate-800/40" };

export function SessionBreakdownChart() {
  const { activeAccount } = useAppStore();
  const accountId = activeAccount?.id ?? null;

  const { data = [], isLoading } = useQuery({
    queryKey: ["analytics-session", accountId],
    queryFn: () => fetchSessionBreakdown(accountId),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  const maxAbs = Math.max(...data.map((d: any) => Math.abs(d.net_pnl)), 1);
  const totalTrades = data.reduce((acc: number, d: any) => acc + d.trades, 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-200">Session Performance</h3>
        <p className="mt-0.5 text-xs text-slate-500">P&amp;L and win rate broken down by trading session</p>
      </div>

      {/* Session cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        {data.filter((d: any) => ["asia","london","new_york","overlap"].includes(d.session)).map((row: any) => {
          const colors = SESSION_COLORS[row.session] ?? DEFAULT_COLORS;
          const pnlPos = row.net_pnl >= 0;
          return (
            <div key={row.session} className={`rounded-xl border border-slate-800 ${colors.bg} p-3 text-center`}>
              <p className="text-xs text-slate-400 mb-1">{row.label}</p>
              <p className={`text-base font-extrabold ${row.trades === 0 ? "text-slate-600" : pnlPos ? "text-emerald-400" : "text-red-400"}`}>
                {row.trades === 0 ? "—" : formatCurrency(row.net_pnl)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {row.trades === 0 ? "no trades" : `${row.trades} trades · ${row.win_rate}% WR`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Horizontal bars */}
      <div className="space-y-2.5">
        {data.map((row: any) => {
          if (row.trades === 0) return null;
          const colors = SESSION_COLORS[row.session] ?? DEFAULT_COLORS;
          const pnlPos = row.net_pnl >= 0;
          const widthPct = Math.round((Math.abs(row.net_pnl) / maxAbs) * 100);
          const sharePct = totalTrades > 0 ? Math.round((row.trades / totalTrades) * 100) : 0;
          return (
            <div key={row.session} className="flex items-center gap-3">
              <span className="w-24 text-xs text-slate-400 shrink-0">{row.label}</span>
              <div className="flex-1 rounded-full bg-slate-800 h-5 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${pnlPos ? "bg-emerald-500/60" : "bg-red-500/60"}`}
                  style={{ width: `${widthPct}%` }}
                />
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold ${pnlPos ? "text-emerald-300" : "text-red-300"}`}>
                  {formatCurrency(row.net_pnl)}
                </span>
              </div>
              <span className="w-16 text-right text-xs text-slate-500 shrink-0">{sharePct}% of trades</span>
            </div>
          );
        })}
      </div>

      {/* Stats table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase tracking-wide">
              {["Session", "Trades", "Win %", "Net P&L", "Avg R"].map(h => (
                <th key={h} className="pb-2 pr-4 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => {
              const pnlPos = row.net_pnl >= 0;
              return (
                <tr key={row.session} className="border-t border-slate-800">
                  <td className="py-2 pr-4 font-medium text-slate-300">{row.label}</td>
                  <td className="py-2 pr-4 text-slate-400">{row.trades}</td>
                  <td className="py-2 pr-4">
                    <span className={row.trades === 0 ? "text-slate-600" : row.win_rate >= 50 ? "text-emerald-400" : "text-red-400"}>
                      {row.trades === 0 ? "—" : `${row.win_rate}%`}
                    </span>
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${row.trades === 0 ? "text-slate-600" : pnlPos ? "text-emerald-400" : "text-red-400"}`}>
                    {row.trades === 0 ? "—" : formatCurrency(row.net_pnl)}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{row.trades === 0 ? "—" : row.avg_r}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
