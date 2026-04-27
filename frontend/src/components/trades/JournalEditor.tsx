import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveJournalNotes, uploadJournalImage, deleteJournalImage } from '../../lib/api';

interface Props {
  tradeId: string;
  initialNote: string | null;
  initialImages: string[];
}

const BACKEND = 'http://localhost:8000';

export function JournalEditor({ tradeId, initialNote, initialImages }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(initialNote ?? '');
  const [images, setImages] = useState<string[]>(initialImages);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => saveJournalNotes(tradeId, note),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['trade', tradeId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadJournalImage(tradeId, file),
    onSuccess: (res) => {
      setImages(prev => [...prev, res.url]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => deleteJournalImage(tradeId, filename),
    onSuccess: (_data, filename) => {
      setImages(prev => prev.filter(url => !url.endsWith(filename)));
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) uploadMutation.mutate(f);
    });
  }, [uploadMutation]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Textarea */}
      <div className="relative">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Write your post-trade notes here — what went well, what didn't, emotions, market context…"
          rows={6}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Notes'}
        </button>
        {saved && <span className="text-xs text-emerald-400 font-medium">✓ Saved!</span>}
      </div>

      {/* Image upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
        }`}
      >
        <span className="text-2xl">📸</span>
        <p className="text-sm font-medium text-slate-300">
          {uploadMutation.isPending ? 'Uploading…' : 'Drop screenshots here or click to upload'}
        </p>
        <p className="text-xs text-slate-500">PNG, JPG, GIF, WebP</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map(url => {
            const filename = url.split('/').pop()!;
            return (
              <div key={url} className="group relative aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                <img
                  src={url.startsWith('/uploads') ? `${BACKEND}${url}` : url}
                  alt="Journal screenshot"
                  className="h-full w-full object-cover"
                />
                {/* Delete overlay */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(filename); }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                  title="Delete image"
                >
                  ✕
                </button>
                {/* Full-screen link */}
                <a
                  href={url.startsWith('/uploads') ? `${BACKEND}${url}` : url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-900 text-xs"
                  title="Open full size"
                >
                  ↗
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
