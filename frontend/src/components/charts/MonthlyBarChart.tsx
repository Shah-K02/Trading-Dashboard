import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface MonthData {
  month: string;
  profit: number;
}

interface Props {
  data: MonthData[];
}

export function MonthlyBarChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-medium text-slate-400 mb-4">Monthly P&L</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60}
            tickFormatter={v => `$${v.toLocaleString()}`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
            formatter={(v: unknown) => [`$${(v as number).toFixed(2)}`, 'P&L']}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
