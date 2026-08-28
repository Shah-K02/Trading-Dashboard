import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { fetchTradeDetail, fetchTradeChart } from "../lib/api";
import { formatCurrency, formatDateTime } from "../lib/format";
import { TradeCandlestickChart } from "../components/charts/TradeCandlestickChart";
import { JournalEditor } from "../components/trades/JournalEditor";
import { TagEditor } from "../components/trades/TagEditor";

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${color ?? 'text-slate-100'}`}>{value}</span>
    </div>
  );
}

export function TradeDetailPage() {
  const { tradeId } = useParams();
  const [timeframe, setTimeframe] = useState("M15");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trade", tradeId],
    queryFn: () => fetchTradeDetail(tradeId ?? ""),
    enabled: Boolean(tradeId),
  });

  const { data: chartData, isLoading: isChartLoading, isError: isChartError, error: chartError } = useQuery({
    queryKey: ["trade-chart", tradeId, timeframe],
    queryFn: () => fetchTradeChart(tradeId ?? "", timeframe),
    enabled: Boolean(tradeId),
    retry: false,
  });

  if (isLoading) return <p className="text-slate-400">Loading trade…</p>;
  if (isError || !data) return <p className="text-red-400">Trade not found.</p>;

  const pnlPos = data.net_pnl >= 0;

  // Entry / exit price zone illustration using a simple price ladder
  const entryPrice = parseFloat(data.entry_price);
  const exitPrice  = data.exit_price ? parseFloat(data.exit_price) : null;
  const sl         = data.stop_loss  ? parseFloat(data.stop_loss)  : null;
  const tp         = data.take_profit? parseFloat(data.take_profit): null;

  const levels = [
    sl   && { label: 'Stop Loss',   price: sl,         color: 'bg-red-500',     text: 'text-red-400' },
    { label: 'Entry',        price: entryPrice, color: 'bg-blue-500',    text: 'text-blue-400' },
    exitPrice && { label: 'Exit',   price: exitPrice,  color: pnlPos ? 'bg-emerald-500' : 'bg-red-500', text: pnlPos ? 'text-emerald-400' : 'text-red-400' },
    tp   && { label: 'Take Profit', price: tp,         color: 'bg-emerald-500', text: 'text-emerald-400' },
  ].filter(Boolean) as { label: string; price: number; color: string; text: string }[];

  // Sort by price
  levels.sort((a, b) => b.price - a.price);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link to="/trades" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
          ← Trades
        </Link>
        <div>
          {/* Symbol badge */}
          {data.symbol_name && (
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 font-mono text-base font-bold tracking-wider text-emerald-400">
                {data.symbol_name}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                data.side === 'buy' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'
              }`}>{data.side}</span>
            </div>
          )}
          <h2 className="text-xl font-bold sm:text-2xl">Trade Detail</h2>
          <p className="text-sm text-slate-400">{tradeId?.slice(0, 8)}…</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Left/Top: Trade Info ── */}
        <div className="space-y-4 lg:col-span-1">
          {/* P&L Hero */}
          <div className={`rounded-2xl border p-5 text-center ${pnlPos ? 'border-emerald-800 bg-emerald-950/40' : 'border-red-800 bg-red-950/40'}`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Net P&L</p>
            <p className={`mt-1 text-4xl font-extrabold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(data.net_pnl)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.side.toUpperCase()} · {data.lot_size} lots
            </p>
          </div>

          {/* Execution details */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Execution</h3>
            <StatRow label="Side" value={data.side.toUpperCase()} color={data.side === 'buy' ? 'text-blue-400' : 'text-purple-400'} />
            <StatRow label="Open Time"  value={formatDateTime(data.open_time)} />
            <StatRow label="Close Time" value={formatDateTime(data.close_time)} />
            <StatRow label="Entry Price"  value={String(entryPrice)} />
            <StatRow label="Exit Price"   value={exitPrice ? String(exitPrice) : '—'} />
            <StatRow label="Lot Size"    value={String(data.lot_size)} />
          </div>

          {/* P&L breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">P&L Breakdown</h3>
            <StatRow label="Gross P&L"  value={formatCurrency(data.gross_pnl)} color={data.gross_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <StatRow label="Commission" value={formatCurrency(data.commission)}  color="text-slate-300" />
            <StatRow label="Swap"       value={formatCurrency(data.swap)}        color="text-slate-300" />
            <StatRow label="Fees"       value={formatCurrency(data.fees)}        color="text-slate-300" />
            <StatRow label="Net P&L"    value={formatCurrency(data.net_pnl)}    color={pnlPos ? 'text-emerald-400' : 'text-red-400'} />
          </div>

          {/* Risk stats */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Risk Stats</h3>
            <StatRow label="Stop Loss"    value={sl    ? String(sl) : '—'} color="text-red-400" />
            <StatRow label="Take Profit"  value={tp    ? String(tp) : '—'} color="text-emerald-400" />
            <StatRow label="Planned RR"   value={data.planned_rr ?? '—'} />
            <StatRow label="Actual RR"    value={data.actual_rr  ?? '—'} />
            <StatRow label="Risk Amount"  value={data.risk_amount  ? formatCurrency(data.risk_amount) : '—'} />
            <StatRow label="Reward Amount" value={data.reward_amount ? formatCurrency(data.reward_amount) : '—'} />
          </div>
        </div>

        {/* ── Right: Candlestick Chart + Price Levels ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Chart Review</h3>
              {/* Timeframe switcher */}
              <div className="flex gap-0.5 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
                {["M1","M5","M15","H1","H4","D1"].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      timeframe === tf
                        ? "bg-slate-700 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            {isChartLoading ? (
              <div className="flex h-[380px] items-center justify-center text-slate-500 text-sm">Loading {timeframe} chart from MT5…</div>
            ) : isChartError ? (
              <div className="flex h-[380px] items-center justify-center px-8 text-center text-slate-500 text-sm">
                {(chartError as any)?.response?.data?.detail ?? "Chart data unavailable."}
              </div>
            ) : (
              <TradeCandlestickChart
                bars={chartData?.bars ?? []}
                entryPrice={entryPrice}
                exitPrice={exitPrice}
                stopLoss={sl}
                takeProfit={tp}
                openTime={chartData?.open_time ?? 0}
                closeTime={chartData?.close_time ?? null}
                side={data.side}
              />
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-5">Price Levels</h3>
            <div className="relative space-y-2">
              {levels.map((level, i) => {
                const isPrimary = level.label === 'Entry' || level.label === 'Exit';
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isPrimary ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                    <div className={`h-3 w-3 rounded-full flex-shrink-0 ${level.color}`} />
                    <span className={`text-xs font-medium uppercase tracking-wide w-24 ${level.text}`}>{level.label}</span>
                    <div className="flex-1 h-px bg-slate-700 mx-2" />
                    <span className="font-mono text-sm text-slate-100">{level.price.toFixed(5)}</span>
                  </div>
                );
              })}
            </div>
            {sl && exitPrice && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-red-950/30 border border-red-900/40 p-3 text-center">
                  <p className="text-xs text-slate-400">Risk (Entry → SL)</p>
                  <p className="mt-1 font-mono text-sm text-red-400">{Math.abs(entryPrice - sl).toFixed(5)} pts</p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${pnlPos ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-red-950/30 border-red-900/40'}`}>
                  <p className="text-xs text-slate-400">Result (Entry → Exit)</p>
                  <p className={`mt-1 font-mono text-sm ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(exitPrice - entryPrice >= 0 ? '+' : '')}{(exitPrice - entryPrice).toFixed(5)} pts
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tags Editor */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Trade Tags</h3>
              <p className="mt-0.5 text-xs text-slate-500">Label this trade with session, strategy, and setup for filtering and analytics.</p>
            </div>
            <TagEditor
              tradeId={tradeId!}
              initialStrategy={data.strategy_tag ?? null}
              initialSetup={data.setup_tag ?? null}
              initialSession={data.session ?? null}
            />
          </div>

          {/* Journal Editor */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Trade Journal</h3>
            <p className="text-xs text-slate-500 mb-4">Add notes and attach screenshots directly below.</p>
            <JournalEditor
              tradeId={tradeId!}
              initialNote={data.note_summary ?? ''}
              initialImages={data.journal_images ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
