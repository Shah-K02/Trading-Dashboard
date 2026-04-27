import { useNavigate } from "react-router-dom";
import type { TradeListItem } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";

type Props = { trades: TradeListItem[] };

export function TradesTable({ trades }: Props) {
  const navigate = useNavigate();

  return (
    <>
      {/* ── Mobile card list (< sm) ── */}
      <div className="space-y-2 sm:hidden">
        {trades.map((trade, i) => {
          const pnlPos = trade.net_pnl >= 0;
          return (
            <div
              key={trade.id}
              onClick={() => navigate(`/trades/${trade.id}`)}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 cursor-pointer hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-sky-400 font-mono w-6 shrink-0">#{i + 1}</span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {trade.symbol_name ?? "—"}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      trade.side === 'buy' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'
                    }`}>{trade.side}</span>
                  </div>
                  <p className="text-xs text-slate-500">{formatDateTime(trade.close_time)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-base font-extrabold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(trade.net_pnl)}
                </p>
                <p className="text-xs text-slate-500">
                  {trade.actual_rr ?? trade.planned_rr ? `${trade.actual_rr ?? trade.planned_rr}R` : trade.lot_size + ' lot'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table (≥ sm) ── */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                {['#', 'Symbol', 'Side', 'Open Time', 'Close Time', 'Entry', 'Exit', 'Lot', 'Net P&L', 'RR', 'Strategy'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => {
                const pnlPos = trade.net_pnl >= 0;
                return (
                  <tr
                    key={trade.id}
                    onClick={() => navigate(`/trades/${trade.id}`)}
                    className="border-t border-slate-800 hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-sky-400">#{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-emerald-400">
                        {trade.symbol_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                        trade.side === 'buy' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateTime(trade.open_time)}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateTime(trade.close_time)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{Number(trade.entry_price).toFixed(5)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{trade.exit_price ? Number(trade.exit_price).toFixed(5) : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{trade.lot_size}</td>
                    <td className={`px-4 py-3 font-semibold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(trade.net_pnl)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{trade.actual_rr ?? trade.planned_rr ?? '—'}</td>
                    <td className="px-4 py-3">
                      {trade.strategy_tag
                        ? <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{trade.strategy_tag}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
