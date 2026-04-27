import { useQuery } from "@tanstack/react-query";
import { fetchDowBreakdown } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { useAppStore } from "../../lib/store";

const MAX_BAR = 100; // Normalise bar heights relative to this

export function DayOfWeekChart() {
  const { activeAccount } = useAppStore();
  const accountId = activeAccount?.id ?? null;

  const { data = [], isLoading } = useQuery({
    queryKey: ["analytics-dow", accountId],
    queryFn: () => fetchDowBreakdown(accountId),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  const maxAbs = Math.max(...data.map((d: any) => Math.abs(d.net_pnl)), 1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-200">Day-of-Week Performance</h3>
        <p className="mt-0.5 text-xs text-slate-500">P&amp;L and win rate per weekday</p>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-2 h-36">
        {data.map((row: any) => {
          const pnlPos = row.net_pnl >= 0;
          const heightPct = Math.round((Math.abs(row.net_pnl) / maxAbs) * 90);
          const noTrades = row.trades === 0;
          return (
            <div key={row.day} className="flex flex-1 flex-col items-center gap-1">
              {/* Tooltip-style label above bar */}
              {!noTrades && (
                <span className={`text-[10px] font-bold ${pnlPos ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(row.net_pnl)}
                </span>
              )}
              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: "6rem" }}>
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    noTrades
                      ? "bg-slate-800"
                      : pnlPos
                      ? "bg-emerald-500/70 hover:bg-emerald-500"
                      : "bg-red-500/70 hover:bg-red-500"
                  }`}
                  style={{ height: noTrades ? "4px" : `${heightPct}%` }}
                />
              </div>
              {/* Day label */}
              <span className="text-[11px] font-medium text-slate-400">{row.short}</span>
            </div>
          );
        })}
      </div>

      {/* Stats table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase tracking-wide">
              {["Day", "Trades", "Win %", "Net P&L", "Avg R"].map(h => (
                <th key={h} className="pb-2 pr-4 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => {
              const pnlPos = row.net_pnl >= 0;
              return (
                <tr key={row.day} className="border-t border-slate-800">
                  <td className="py-2 pr-4 font-medium text-slate-300">{row.day}</td>
                  <td className="py-2 pr-4 text-slate-400">{row.trades}</td>
                  <td className="py-2 pr-4">
                    <span className={row.trades === 0 ? "text-slate-600" : row.win_rate >= 50 ? "text-emerald-400" : "text-red-400"}>
                      {row.trades === 0 ? "—" : `${row.win_rate}%`}
                    </span>
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${row.trades === 0 ? "text-slate-600" : pnlPos ? "text-emerald-400" : "text-red-400"}`}>
                    {row.trades === 0 ? "—" : formatCurrency(row.net_pnl)}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">
                    {row.trades === 0 ? "—" : row.avg_r}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
