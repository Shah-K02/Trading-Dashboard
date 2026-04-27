interface Props {
  title: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}

export function SummaryCard({ title, value, sub, positive, negative }: Props) {
  const valueColor = positive
    ? 'text-emerald-400'
    : negative
    ? 'text-red-400'
    : 'text-white';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{title}</p>
      <p className={`mt-1.5 text-xl font-bold ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
