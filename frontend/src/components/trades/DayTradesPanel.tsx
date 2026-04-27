import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchTrades } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";

interface Props {
  date: string | null;  // "YYYY-MM-DD" or null to close
  onClose: () => void;
  accountId?: string | null;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function DayTradesPanel({ date, onClose, accountId }: Props) {
  const navigate = useNavigate();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["trades-by-date", date, accountId ?? null],
    queryFn: () => fetchTrades(50, 0, date!, accountId),
    enabled: Boolean(date),
  });

  if (!date) return null;

  const totalPnl = trades.reduce((acc: number, t: any) => acc + t.net_pnl, 0);
  const pnlPos = totalPnl >= 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-0 z-50 flex flex-col border-l border-slate-800 bg-slate-950 shadow-2xl sm:left-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">{formatDate(date)}</h3>
            <p className="text-xs text-slate-400">{trades.length} {trades.length === 1 ? "trade" : "trades"}</p>
          </div>
          <div className="flex items-center gap-3">
            {trades.length > 0 && (
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                pnlPos ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}>
                {formatCurrency(totalPnl)}
              </span>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <p className="text-center text-slate-400 text-sm py-8">Loading trades…</p>
          )}

          {!isLoading && trades.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">No trades found for this day.</p>
          )}

          {trades.map((trade: any, i: number) => {
            const tp = trade.net_pnl >= 0;
            return (
              <div
                key={trade.id}
                onClick={() => { onClose(); navigate(`/trades/${trade.id}`); }}
                className={`group flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-all ${
                  tp
                    ? "border-emerald-800/50 bg-emerald-950/30 hover:bg-emerald-950/50"
                    : "border-red-800/50 bg-red-950/20 hover:bg-red-950/40"
                }`}
              >
                {/* Row 1: symbol + side + P&L */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {trade.symbol_name ?? "—"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      trade.side === "buy"
                        ? "bg-blue-900/60 text-blue-400"
                        : "bg-purple-900/60 text-purple-400"
                    }`}>
                      {trade.side}
                    </span>
                  </div>
                  <span className={`text-base font-extrabold ${tp ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(trade.net_pnl)}
                  </span>
                </div>

                {/* Row 2: entry / exit / lot / RR */}
                <div className="grid grid-cols-4 gap-1 text-xs text-slate-400">
                  <div>
                    <p className="text-slate-600 uppercase text-[10px]">Entry</p>
                    <p className="font-mono text-slate-300">{Number(trade.entry_price).toFixed(5)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 uppercase text-[10px]">Exit</p>
                    <p className="font-mono text-slate-300">{trade.exit_price ? Number(trade.exit_price).toFixed(5) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 uppercase text-[10px]">Lot</p>
                    <p className="text-slate-300">{trade.lot_size}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 uppercase text-[10px]">RR</p>
                    <p className="text-slate-300">{trade.actual_rr ?? trade.planned_rr ?? "—"}</p>
                  </div>
                </div>

                {/* Row 3: time */}
                <p className="text-[11px] text-slate-500">
                  {formatDateTime(trade.open_time)} → {formatDateTime(trade.close_time)}
                </p>

                <p className="text-right text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                  View details →
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
