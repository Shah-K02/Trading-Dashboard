import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface SymbolData {
  symbol: string;
  net_pnl: number;
  trades: number;
}

interface Props {
  data: SymbolData[];
}

export function SymbolBarChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-medium text-slate-400 mb-4">Performance by Symbol</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => `$${v}`} />
          <YAxis dataKey="symbol" type="category" width={90} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
            formatter={(v: unknown) => [`$${(v as number).toFixed(2)}`, 'Net P&L']}
          />
          <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
          <Bar dataKey="net_pnl" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.net_pnl >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
