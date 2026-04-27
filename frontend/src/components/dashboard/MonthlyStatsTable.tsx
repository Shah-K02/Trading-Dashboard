interface MonthRow {
  month: string;
  profit: number;
  r_multiple: number;
  winning_trades: number;
  losing_trades: number;
  be_trades: number;
}

interface Props {
  data: MonthRow[];
}

export function MonthlyStatsTable({ data }: Props) {
  const totals = data.reduce(
    (acc, r) => ({
      profit: acc.profit + r.profit,
      r_multiple: acc.r_multiple + r.r_multiple,
      winning_trades: acc.winning_trades + r.winning_trades,
      losing_trades: acc.losing_trades + r.losing_trades,
      be_trades: acc.be_trades + r.be_trades,
    }),
    { profit: 0, r_multiple: 0, winning_trades: 0, losing_trades: 0, be_trades: 0 }
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400">Monthly Trade Statistics</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/60">
            <tr>
              {['Month','Profit','R-Multiple','Winning','Losing','B/E'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-300">{row.month}</td>
                <td className={`px-4 py-2.5 font-semibold ${row.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${row.profit.toFixed(2)}
                </td>
                <td className={`px-4 py-2.5 ${row.r_multiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {row.r_multiple.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-emerald-400">{row.winning_trades}</td>
                <td className="px-4 py-2.5 text-red-400">{row.losing_trades}</td>
                <td className="px-4 py-2.5 text-amber-400">{row.be_trades}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/60">
              <td className="px-4 py-3 font-bold text-slate-300">TOTAL</td>
              <td className={`px-4 py-3 font-bold ${totals.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${totals.profit.toFixed(2)}
              </td>
              <td className={`px-4 py-3 font-bold ${totals.r_multiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totals.r_multiple.toFixed(2)}
              </td>
              <td className="px-4 py-3 font-bold text-emerald-400">{totals.winning_trades}</td>
              <td className="px-4 py-3 font-bold text-red-400">{totals.losing_trades}</td>
              <td className="px-4 py-3 font-bold text-amber-400">{totals.be_trades}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
