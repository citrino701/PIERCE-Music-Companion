import React, { useEffect, useRef, useState } from 'react';
import type { TrackData } from '../../types';
import { formatClock } from '../../services/colagem/colagem';

interface Note { ms: number; text: string }
const key = (id: string) => `pierce:notes:${id}`;
const SHADOW = '3px 3px 0 var(--ink)';
const tagFont = "500 15px/1.2 'Arimo', sans-serif";

function load(id: string): Note[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key(id)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n?.ms === 'number' && typeof n?.text === 'string') : [];
  } catch { return []; }
}

/** Three tags: your own note nearest to now, then real track data (album/year, bpm/key). */
/** `compact` lays the three tags out in a wrapping row instead of their fixed spots in the full composition. */
export const TrackNotes: React.FC<{ track: TrackData; progressMs: number; compact?: boolean }> = ({ track, progressMs, compact }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);
  useEffect(() => { setNotes(load(track.id)); setAdding(false); }, [track.id]);

  const nearest = notes.length ? notes.reduce((best, n) => (Math.abs(n.ms - progressMs) < Math.abs(best.ms - progressMs) ? n : best)) : undefined;

  const save = () => {
    if (cancelled.current) { cancelled.current = false; return; }
    const text = draft.trim();
    if (text) {
      const next = [...notes, { ms: Math.round(progressMs), text }];
      setNotes(next);
      try { localStorage.setItem(key(track.id), JSON.stringify(next)); } catch { /* storage may be blocked */ }
    }
    setDraft('');
    setAdding(false);
  };

  const dot = (bg: string) => <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: '50%', background: bg, flex: 'none', transition: 'background .8s' }} />;
  const box: React.CSSProperties = { padding: '7px 12px', font: tagFont, boxShadow: SHADOW, transition: 'background .8s' };
  const info = [track.album, track.year].filter(Boolean).join(' · ');
  const tech = [track.bpm ? `${track.bpm} bpm` : '', track.key].filter(Boolean).join(' · ');

  const place = (left: number, top: number): React.CSSProperties => (compact ? { position: 'relative' } : { position: 'absolute', left, top });
  const tags = (
    <>
      <div style={{ ...place(510, 508), display: 'flex', alignItems: 'center', gap: 6, transform: 'rotate(-2deg)' }}>
        {dot('var(--track-a)')}
        {adding ? (
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} aria-label="Escreva uma nota para este momento"
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelled.current = true; setDraft(''); setAdding(false); }
            }} onBlur={save}
            style={{ ...box, background: '#fff', color: 'var(--ink)', border: 'none', outline: '2px solid var(--ink)', width: compact ? 220 : 280 }} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ ...box, background: '#fff', color: 'var(--track-deep)', border: 'none', cursor: 'pointer', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nearest ? `@você · ${formatClock(nearest.ms)} — ${nearest.text}` : '+ anote este momento'}
          </button>
        )}
      </div>
      {info && (
        <div style={{ ...place(830, 524), display: 'flex', alignItems: 'center', gap: 6, transform: 'rotate(1.5deg)' }}>
          {dot('var(--ink)')}
          <span style={{ ...box, background: 'var(--track-a)', color: 'var(--track-on-a)', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info}</span>
        </div>
      )}
      {tech && (
        <div style={{ ...place(1030, 498), display: 'flex', alignItems: 'center', gap: 6, transform: 'rotate(-1deg)' }}>
          {dot('var(--track-b)')}
          <span style={{ ...box, background: 'var(--track-b)', color: '#fff' }}>{tech}</span>
        </div>
      )}
    </>
  );
  return compact ? <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px', maxWidth: '100%' }}>{tags}</div> : tags;
};
