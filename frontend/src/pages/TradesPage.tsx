import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { TradesTable } from "../components/trades/TradesTable";
import { TradeCalendar } from "../components/trades/TradeCalendar";
import { TradeFilterBar } from "../components/trades/TradeFilterBar";
import { fetchTrades, type TradeFilters } from "../lib/api";
import { useAppStore } from "../lib/store";

type View = "calendar" | "table";

const EMPTY_FILTERS: TradeFilters = {
  symbol: null, side: null, strategyTag: null, dateFrom: null, dateTo: null,
};

export function TradesPage() {
  const [view, setView] = useState<View>("calendar");
  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);
  const { activeAccount } = useAppStore();
  const accountId = activeAccount?.id ?? null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trades", accountId, filters],
    queryFn: () => fetchTrades(200, 0, null, accountId, filters),
    enabled: view === "table",
  });

  return (
    <div className="space-y-4">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trades</h2>
          <p className="mt-0.5 text-sm text-slate-400">Review performance by day or drill into individual trades.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-800 p-1">
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "calendar"
                ? "bg-slate-700 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "table"
                ? "bg-slate-700 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ☰ Table
          </button>
        </div>
      </div>

      {/* Filter bar — table view only */}
      {view === "table" && (
        <TradeFilterBar filters={filters} onChange={setFilters} />
      )}

      {/* Views */}
      {view === "calendar" && <TradeCalendar accountId={accountId} />}

      {view === "table" && (
        <>
          {isLoading && <p className="text-slate-400 text-sm">Loading trades…</p>}
          {isError   && <p className="text-red-400 text-sm">Failed to load trades.</p>}
          {data      && (
            <>
              <p className="text-xs text-slate-500">{data.length} trade{data.length !== 1 ? "s" : ""} found</p>
              <TradesTable trades={data} />
            </>
          )}
        </>
      )}
    </div>
  );
}
