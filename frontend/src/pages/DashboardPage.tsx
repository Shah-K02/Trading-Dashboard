import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAnalyticsSummary, fetchEquityCurve, fetchMonthlyStats, fetchSymbolBreakdown, fetchMt5SyncStatus, importMT5Trades, requestMt5Sync } from "../lib/api";
import { formatCurrency, formatPercent, formatRelativeTime } from "../lib/format";
import { SummaryCard } from "../components/dashboard/SummaryCard";
import { MonthlyStatsTable } from "../components/dashboard/MonthlyStatsTable";
import { EquityChart } from "../components/charts/EquityChart";
import { DrawdownChart } from "../components/charts/DrawdownChart";
import { TradeDonutChart } from "../components/charts/TradeDonutChart";
import { LongShortDonutChart } from "../components/charts/LongShortDonutChart";
import { MonthlyBarChart } from "../components/charts/MonthlyBarChart";
import { SymbolBarChart } from "../components/charts/SymbolBarChart";
import { useAppStore } from "../lib/store";

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { activeAccount, loadActiveAccount } = useAppStore();
  const accountId = activeAccount?.id ?? null;

  const { data: s, isLoading } = useQuery({
    queryKey: ["analytics-summary", accountId],
    queryFn: () => fetchAnalyticsSummary(accountId),
  });
  const { data: equity } = useQuery({
    queryKey: ["analytics-equity", accountId],
    queryFn: () => fetchEquityCurve(accountId),
  });
  const { data: monthly } = useQuery({
    queryKey: ["analytics-monthly", accountId],
    queryFn: () => fetchMonthlyStats(accountId),
  });
  const { data: symbols } = useQuery({
    queryKey: ["analytics-symbols", accountId],
    queryFn: () => fetchSymbolBreakdown(accountId),
  });

  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const refreshAfterSync = () => {
    loadActiveAccount();
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-summary", accountId] });
    queryClient.invalidateQueries({ queryKey: ["analytics-equity", accountId] });
    queryClient.invalidateQueries({ queryKey: ["analytics-monthly", accountId] });
    queryClient.invalidateQueries({ queryKey: ["analytics-symbols", accountId] });
    queryClient.invalidateQueries({ queryKey: ["trades"] });
  };

  const waitForAgentSync = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const status = await fetchMt5SyncStatus();
        if (!status.requested) {
          if (pollRef.current) clearInterval(pollRef.current);
          setSyncMessage("Synced by your local agent.");
          refreshAfterSync();
          return;
        }
      } catch {
        // transient — keep polling until the attempt cap is hit
      }
      if (attempts >= 24) { // ~2 minutes at 5s
        if (pollRef.current) clearInterval(pollRef.current);
        setSyncMessage("Still waiting on your local agent — it'll sync next time it checks in.");
      }
    }, 5000);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      try {
        return await importMT5Trades();
      } catch (error: any) {
        if (error?.response?.status === 503) {
          // No local MT5 on this server (hosted deployment) — fall back to
          // asking the user's local sync agent to pick this up.
          await requestMt5Sync();
          return { requested: true };
        }
        throw error;
      }
    },
    onSuccess: (data: any) => {
      if (data?.requested) {
        setSyncMessage("Sync requested — waiting for your local agent (checks in within ~20s)...");
        waitForAgentSync();
      } else {
        setSyncMessage(`Synced — ${data?.new_trades_count ?? 0} new trade(s).`);
        refreshAfterSync();
      }
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail ?? "MT5 sync failed. Make sure MT5 is open and you are logged in.";
      alert(detail);
    },
  });


  const pnlPositive = (s?.total_net_pnl ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Dashboard</h2>
          <p className="mt-0.5 text-slate-400 text-sm">Your complete trading performance overview.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-900/30 sm:px-5 sm:py-2.5"
            >
              {syncMutation.isPending ? (
                <><span className="animate-spin text-base">↻</span><span className="hidden sm:inline">Syncing...</span></>
              ) : (
                <><span className="text-base">⟳</span><span className="hidden sm:inline">Sync MT5</span></>
              )}
            </button>
            <details className="relative">
              <summary className="list-none cursor-pointer text-slate-400 hover:text-slate-200 text-base leading-none select-none">ⓘ</summary>
              <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs text-slate-300 shadow-xl">
                Running TradeLens locally with MT5 on this PC? Click "Sync MT5" above for an instant sync.
                Using the hosted version? Make sure the TradeLens Sync Agent is running on the PC where
                your MT5 terminal lives (see <code>agent/README.md</code>), then click "Sync MT5" —
                it'll ask the agent to sync within ~20 seconds.
              </div>
            </details>
          </div>
          <span className="text-xs text-slate-500">
            Last synced: {formatRelativeTime(activeAccount?.last_synced_at ?? null)}
          </span>
          {syncMessage && <span className="text-xs text-emerald-400">{syncMessage}</span>}
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading data…</p>}

      {/* ── Row 1: Account Summary ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Account Summary</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard title="Broker" value={s?.broker_name || "—"} />
          <SummaryCard title="Currency" value={s?.account_currency || "—"} />
          <SummaryCard title="Total Net P&L" value={formatCurrency(s?.total_net_pnl ?? 0)} positive={pnlPositive} negative={!pnlPositive} />
          <SummaryCard title="Gross Profit" value={formatCurrency(s?.gross_profit ?? 0)} positive />
          <SummaryCard title="Gross Loss" value={formatCurrency(s?.gross_loss ?? 0)} negative />
          <SummaryCard title="Win Rate" value={formatPercent((s?.win_rate ?? 0) * 100)} positive={(s?.win_rate ?? 0) >= 0.5} />
        </div>
      </section>

      {/* ── Row 2: Account Stats ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Account Statistics</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard title="Avg Win" value={formatCurrency(s?.average_win ?? 0)} positive />
          <SummaryCard title="Avg Loss" value={formatCurrency(s?.average_loss ?? 0)} negative />
          <SummaryCard title="Largest Win" value={formatCurrency(s?.largest_win ?? 0)} positive />
          <SummaryCard title="Largest Loss" value={formatCurrency(s?.largest_loss ?? 0)} negative />
          <SummaryCard title="Max Consec. Wins" value={String(s?.max_consec_wins ?? 0)} />
          <SummaryCard title="Max Consec. Losses" value={String(s?.max_consec_losses ?? 0)} />
          <SummaryCard title="Max Drawdown" value={`${(s?.max_drawdown_pct ?? 0).toFixed(2)}%`} negative />
          <SummaryCard title="Expectancy / Trade" value={formatCurrency(s?.expectancy ?? 0)} positive={(s?.expectancy ?? 0) >= 0} negative={(s?.expectancy ?? 0) < 0} />
          <SummaryCard title="Profit Factor" value={(s?.profit_factor ?? 0).toFixed(2)} positive={(s?.profit_factor ?? 0) >= 1} />
          <SummaryCard title="Avg Planned RR" value={(s?.average_planned_rr ?? 0).toFixed(2)} />
          <SummaryCard title="Avg Actual RR" value={(s?.average_actual_rr ?? 0).toFixed(2)} />
          <SummaryCard title="Total Trades" value={String(s?.total_trades ?? 0)} />
        </div>
      </section>

      {/* ── Row 3: Donuts + Equity ── */}
      <section className="grid gap-4 lg:grid-cols-4">
        <TradeDonutChart
          winning={s?.winning_trades ?? 0}
          losing={s?.losing_trades ?? 0}
          breakeven={s?.breakeven_trades ?? 0}
        />
        <LongShortDonutChart
          longTrades={s?.long_trades ?? 0}
          shortTrades={s?.short_trades ?? 0}
        />
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Equity Curve</h3>
          <EquityChart data={equity?.points ?? []} />
        </div>
      </section>

      {/* ── Row 4: Monthly bar + Drawdown ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <MonthlyBarChart data={monthly ?? []} />
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Account Drawdown</h3>
          <DrawdownChart data={equity?.drawdown ?? []} />
        </div>
      </section>

      {/* ── Row 5: Symbol Breakdown ── */}
      <section>
        <SymbolBarChart data={symbols ?? []} />
      </section>

      {/* ── Row 6: Monthly Stats Table ── */}
      <section>
        <MonthlyStatsTable data={monthly ?? []} />
      </section>
    </div>
  );
}
