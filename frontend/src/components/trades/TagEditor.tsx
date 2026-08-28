import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveTagUpdates } from '../../lib/api';

export const SESSIONS = [
  { value: '',         label: 'None'     },
  { value: 'asia',     label: '🌏 Asia'   },
  { value: 'london',   label: '🇬🇧 London' },
  { value: 'new_york', label: '🗽 New York'},
  { value: 'overlap',  label: '🔀 Overlap' },
  { value: 'other',    label: '—  Other'  },
];

// Common strategy / setup presets you can extend over time
export const STRATEGY_SUGGESTIONS = [
  'Breakout', 'Pullback', 'Trend Follow', 'Reversal', 'Range', 'News Play',
  'VWAP Reclaim', 'Opening Range', 'ICT Breaker', 'Supply & Demand', 'SMC',
];
export const SETUP_SUGGESTIONS = [
  'BOS Retest', 'CHoCH', 'FVG Fill', 'OB Tap', 'EQH/EQL', 'Liquidity Sweep',
  'London Kill Zone', 'NY Open', 'Double Top', 'Triangle Break', 'Head & Shoulders',
];

interface Props {
  tradeId: string;
  initialStrategy: string | null;
  initialSetup: string | null;
  initialSession: string | null;
}

export function TagInput({
  label, value, onChange, suggestions, placeholder, color,
}: {
  label: string; value: string; onChange: (v: string) => void;
  suggestions: string[]; placeholder: string; color: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors pr-8"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
          {filtered.slice(0, 6).map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors text-left"
            >
              <span className={`h-2 w-2 rounded-full ${color} shrink-0`} />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Current tag badge */}
      {value && (
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${color === 'bg-blue-500' ? 'border-blue-800/50 bg-blue-900/30 text-blue-300' : 'border-purple-800/50 bg-purple-900/30 text-purple-300'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
            {value}
          </span>
        </div>
      )}
    </div>
  );
}

export function TagEditor({ tradeId, initialStrategy, initialSetup, initialSession }: Props) {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState(initialStrategy ?? '');
  const [setup,    setSetup]    = useState(initialSetup    ?? '');
  const [session,  setSession]  = useState(initialSession  ?? '');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => saveTagUpdates(tradeId, {
      strategy_tag: strategy,
      setup_tag:    setup,
      session:      session,
    }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['trade', tradeId] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });

  const isDirty =
    strategy !== (initialStrategy ?? '') ||
    setup    !== (initialSetup    ?? '') ||
    session  !== (initialSession  ?? '');

  return (
    <div className="space-y-5">
      {/* Session picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Trading Session
        </label>
        <div className="flex flex-wrap gap-2">
          {SESSIONS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSession(s.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium border transition-all ${
                session === s.value
                  ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300 shadow-sm'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy + Setup inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TagInput
          label="Strategy"
          value={strategy}
          onChange={setStrategy}
          suggestions={STRATEGY_SUGGESTIONS}
          placeholder="e.g. Breakout, SMC, Reversal…"
          color="bg-blue-500"
        />
        <TagInput
          label="Setup"
          value={setup}
          onChange={setSetup}
          suggestions={SETUP_SUGGESTIONS}
          placeholder="e.g. BOS Retest, FVG Fill…"
          color="bg-purple-500"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={mutation.isPending || !isDirty}
          onClick={() => mutation.mutate()}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            isDirty
              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {mutation.isPending ? 'Saving…' : 'Save Tags'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span className="text-base">✓</span> Saved!
          </span>
        )}
        {mutation.isError && (
          <span className="text-xs text-red-400">Failed to save — try again</span>
        )}
        {isDirty && !saved && !mutation.isPending && (
          <span className="text-xs text-slate-500">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
