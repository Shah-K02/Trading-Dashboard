import { useQuery } from "@tanstack/react-query";
import { fetchSymbolBreakdown, fetchMonthlyStats } from "../lib/api";
import { SymbolBarChart } from "../components/charts/SymbolBarChart";
import { MonthlyBarChart } from "../components/charts/MonthlyBarChart";
import { DayOfWeekChart } from "../components/charts/DayOfWeekChart";
import { SessionBreakdownChart } from "../components/charts/SessionBreakdownChart";
import { useAppStore } from "../lib/store";

export function AnalyticsPage() {
  const { activeAccount } = useAppStore();
  const accountId = activeAccount?.id ?? null;

  const { data: symbols } = useQuery({
    queryKey: ["analytics-symbols", accountId],
    queryFn: () => fetchSymbolBreakdown(accountId),
  });
  const { data: monthly } = useQuery({
    queryKey: ["analytics-monthly", accountId],
    queryFn: () => fetchMonthlyStats(accountId),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="mt-0.5 text-sm text-slate-400">Deep-dive breakdowns and performance reports.</p>
      </div>

      {/* Symbol P&L table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Performance by Symbol</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                {['Symbol', 'Net P&L', 'Trades', 'Win Rate'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(symbols ?? []).map((row: any) => (
                <tr key={row.symbol} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-200">{row.symbol}</td>
                  <td className={`px-4 py-3 font-semibold ${row.net_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${row.net_pnl.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.trades}</td>
                  <td className="px-4 py-3 text-slate-400">{row.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SymbolBarChart data={symbols ?? []} />
        <MonthlyBarChart data={monthly ?? []} />
      </div>

      {/* Day-of-week breakdown */}
      <DayOfWeekChart />

      {/* Session breakdown */}
      <SessionBreakdownChart />
    </div>
  );
}
