import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarData } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { DayTradesPanel } from "./DayTradesPanel";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function calendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

interface DayStats { pnl: number; trades: number; win_rate: number; r_multiple: number; }
interface WeekStats { week_num: number; pnl: number; days: number; }

export function TradeCalendar({ accountId }: { accountId?: string | null }) {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", year, month, accountId ?? null],
    queryFn: () => fetchCalendarData(year, month, accountId),
  });

  const days: Record<string, DayStats> = data?.days ?? {};
  const weeks: WeekStats[]             = data?.weeks ?? [];
  const totalPnl: number               = data?.total_pnl ?? 0;
  const totalDays: number              = data?.total_days ?? 0;
  const cells = calendarGrid(year, month);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const goBack    = () => month === 1  ? (setMonth(12), setYear(y => y - 1)) : setMonth(m => m - 1);
  const goForward = () => month === 12 ? (setMonth(1),  setYear(y => y + 1)) : setMonth(m => m + 1);
  const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;

  return (
    <>
      {/* Slide-over panel for selected day */}
      <DayTradesPanel
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
        accountId={accountId}
      />

      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-lg">
              ‹
            </button>
            <h2 className="text-xl font-bold">{MONTHS[month - 1]} {year}</h2>
            <button onClick={goForward}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-lg">
              ›
            </button>
            <button
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
              This month
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">Monthly stats:</span>
            <span className={`rounded-full px-3 py-1 font-bold text-sm ${
              totalPnl >= 0 ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}>{formatCurrency(totalPnl)}</span>
            <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-slate-300 text-xs">
              {totalDays} {totalDays === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {isLoading && <p className="text-slate-400 text-sm">Loading calendar…</p>}

        {/* ── Grid + Sidebar ── */}
        <div className="flex gap-0">
          <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-800/60">
              {DAYS.map(d => (
                <div key={d} className="py-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">{d}</div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 border-b border-slate-800 last:border-0" style={{ minHeight: 80 }}>
                {row.map((day, colIdx) => {
                  if (!day) return <div key={colIdx} className="border-r border-slate-800 last:border-0 bg-slate-900/30" />;

                  const key = `${year}-${pad(month)}-${pad(day)}`;
                  const stats = days[key];
                  const isToday = key === today;
                  const hasTrades = Boolean(stats);
                  const pnlPos = stats ? stats.pnl >= 0 : true;

                  return (
                    <div
                      key={colIdx}
                      onClick={() => hasTrades && setSelectedDay(key)}
                      className={`relative flex flex-col border-r border-slate-800 last:border-0 p-2 transition-all ${
                        hasTrades
                          ? pnlPos
                            ? "bg-emerald-900/50 hover:bg-emerald-900/70 cursor-pointer"
                            : "bg-red-900/40 hover:bg-red-900/60 cursor-pointer"
                          : "bg-slate-900 hover:bg-slate-800/30"
                      }`}
                    >
                    <div className="flex justify-end mb-0.5">
                        <span className={`text-[10px] sm:text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full ${
                          isToday        ? "bg-blue-500 text-white"
                          : hasTrades   ? "text-slate-300"
                          : "text-slate-600"
                        }`}>{day}</span>
                      </div>

                      {hasTrades && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className={`text-xs sm:text-base font-extrabold leading-tight ${pnlPos ? "text-emerald-300" : "text-red-300"}`}>
                            {formatCurrency(stats.pnl)}
                          </p>
                          <p className="hidden sm:block text-xs text-slate-400">
                            {stats.trades} {stats.trades === 1 ? "trade" : "trades"}
                          </p>
                          <p className="hidden sm:block text-xs text-slate-500">
                            {stats.r_multiple.toFixed(2)}R, {stats.win_rate}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Weekly sidebar — desktop only */}
          <div className="hidden sm:ml-2 sm:flex sm:flex-col sm:gap-2 sm:w-28 sm:shrink-0">
            {weeks.map(week => {
              const pos = week.pnl >= 0;
              return (
                <div key={week.week_num}
                  className="flex flex-col items-end rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"
                  style={{ minHeight: 80, justifyContent: "center" }}>
                  <p className="text-xs text-slate-500 mb-1">W{week.week_num}</p>
                  <p className={`text-sm font-bold ${pos ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(week.pnl)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{week.days}d</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly strip — mobile only */}
        <div className="flex overflow-x-auto gap-2 pb-1 sm:hidden">
          {weeks.map(week => {
            const pos = week.pnl >= 0;
            return (
              <div key={week.week_num}
                className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 shrink-0">
                <p className="text-xs text-slate-500">Week {week.week_num}</p>
                <p className={`text-sm font-bold mt-0.5 ${pos ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(week.pnl)}
                </p>
                <p className="text-xs text-slate-500">{week.days} {week.days === 1 ? 'day' : 'days'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
