import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  winning: number;
  losing: number;
  breakeven: number;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export function TradeDonutChart({ winning, losing, breakeven }: Props) {
  const data = [
    { name: 'Win', value: winning },
    { name: 'Loss', value: losing },
    { name: 'B/E', value: breakeven },
  ].filter(d => d.value > 0);

  const total = winning + losing + breakeven;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-medium text-slate-400 mb-1">Trade Performance</h3>
      <p className="text-xs text-slate-500 mb-3">Total Trades: <span className="text-white font-semibold">{total}</span></p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
