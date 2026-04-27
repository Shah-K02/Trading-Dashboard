import { useState, useEffect } from "react";
import type { TradeFilters } from "../../lib/api";

interface Props {
  filters: TradeFilters;
  onChange: (filters: TradeFilters) => void;
}

const SIDES = [
  { value: "", label: "All" },
  { value: "buy",  label: "⬆ Long"  },
  { value: "sell", label: "⬇ Short" },
];

export function TradeFilterBar({ filters, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const active =
    !!filters.symbol     ||
    !!filters.side       ||
    !!filters.strategyTag ||
    !!filters.dateFrom   ||
    !!filters.dateTo;

  const set = (patch: Partial<TradeFilters>) =>
    onChange({ ...filters, ...patch });

  const clear = () =>
    onChange({ symbol: "", side: "", strategyTag: "", dateFrom: "", dateTo: "" });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2.5">
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd"/>
          </svg>
          <span className="font-medium text-slate-200">Filters</span>
          {active && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {active && (
            <button
              onClick={e => { e.stopPropagation(); clear(); }}
              className="rounded-lg border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Clear all
            </button>
          )}
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>
      </button>

      {/* Filter fields */}
      {expanded && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Symbol */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Symbol
            </label>
            <input
              type="text"
              value={filters.symbol || ""}
              onChange={e => set({ symbol: e.target.value || null })}
              placeholder="e.g. EURUSD"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Side */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Side
            </label>
            <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-800 p-1">
              {SIDES.map(s => (
                <button
                  key={s.value}
                  onClick={() => set({ side: s.value || null })}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    (filters.side || "") === s.value
                      ? "bg-slate-700 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Tag */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Strategy
            </label>
            <input
              type="text"
              value={filters.strategyTag || ""}
              onChange={e => set({ strategyTag: e.target.value || null })}
              placeholder="e.g. Breakout"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              From
            </label>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={e => set({ dateFrom: e.target.value || null })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              To
            </label>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={e => set({ dateTo: e.target.value || null })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
