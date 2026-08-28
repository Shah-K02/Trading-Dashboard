import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveBulkTagUpdates } from '../../lib/api';
import { SESSIONS, STRATEGY_SUGGESTIONS, SETUP_SUGGESTIONS, TagInput } from './TagEditor';

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkTagBar({ selectedIds, onClear }: Props) {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState('');
  const [setup, setSetup] = useState('');
  const [session, setSession] = useState('');
  const [touched, setTouched] = useState<Set<'strategy_tag' | 'setup_tag' | 'session'>>(new Set());

  const touch = (field: 'strategy_tag' | 'setup_tag' | 'session') =>
    setTouched(prev => new Set(prev).add(field));

  const mutation = useMutation({
    mutationFn: () => {
      const tags: Record<string, string> = {};
      if (touched.has('strategy_tag')) tags.strategy_tag = strategy;
      if (touched.has('setup_tag')) tags.setup_tag = setup;
      if (touched.has('session')) tags.session = session;
      return saveBulkTagUpdates(selectedIds, tags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setStrategy('');
      setSetup('');
      setSession('');
      setTouched(new Set());
      onClear();
    },
  });

  const canApply = touched.size > 0 && !mutation.isPending;

  return (
    <div className="rounded-2xl border border-blue-800/50 bg-blue-950/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-blue-300">
          {selectedIds.length} trade{selectedIds.length !== 1 ? 's' : ''} selected
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          Clear selection
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Trading Session
        </label>
        <div className="flex flex-wrap gap-2">
          {SESSIONS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => { setSession(s.value); touch('session'); }}
              className={`rounded-xl px-3 py-2 text-sm font-medium border transition-all ${
                touched.has('session') && session === s.value
                  ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300 shadow-sm'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TagInput
          label="Strategy"
          value={strategy}
          onChange={v => { setStrategy(v); touch('strategy_tag'); }}
          suggestions={STRATEGY_SUGGESTIONS}
          placeholder="e.g. Breakout, SMC, Reversal…"
          color="bg-blue-500"
        />
        <TagInput
          label="Setup"
          value={setup}
          onChange={v => { setSetup(v); touch('setup_tag'); }}
          suggestions={SETUP_SUGGESTIONS}
          placeholder="e.g. BOS Retest, FVG Fill…"
          color="bg-purple-500"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={!canApply}
          onClick={() => mutation.mutate()}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            canApply
              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {mutation.isPending ? 'Applying…' : `Apply to ${selectedIds.length} trade${selectedIds.length !== 1 ? 's' : ''}`}
        </button>
        {touched.size === 0 && (
          <span className="text-xs text-slate-500">Set a session, strategy, or setup to apply</span>
        )}
        {mutation.isError && (
          <span className="text-xs text-red-400">Failed to apply — try again</span>
        )}
      </div>
    </div>
  );
}
