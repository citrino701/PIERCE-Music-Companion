import React, { useMemo } from 'react';
import type { TrackData } from '../../types';
import { layoutDots, pickDotWords } from '../../services/colagem/colagem';
import { layoutDotsCompact } from '../../services/colagem/layout';

const COLOR = { a: 'var(--track-a)', b: 'var(--track-b)', ink: 'var(--ink)' } as const;

/** Floating dots carrying words from the song (or title/artist when there is no lyric). */
/** `compact` = free band (px from the top / bottom edge) used by the narrow layouts instead of the full composition's zones. */
export const WordDots: React.FC<{ track: TrackData; playing: boolean; w: number; h: number; extraWords?: string[]; compact?: { top: number; bottom: number } }> = ({ track, playing, w, h, extraWords, compact }) => {
  const dots = useMemo(() => {
    const words = extraWords?.length ? extraWords : pickDotWords(track);
    return compact ? layoutDotsCompact(track.id, words, w, h, compact.top, compact.bottom) : layoutDots(track.id, words, w, h);
  }, [track.id, track.lyrics, track.title, track.artist, extraWords, w, h, compact?.top, compact?.bottom]);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <div key={i} className="cg-bob" style={{ position: 'absolute', left: d.x, top: d.y, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s`, animationPlayState: playing ? 'running' : 'paused' }}>
          <span style={{ width: d.r, height: d.r, borderRadius: '50%', background: COLOR[d.color], transition: 'background .8s' }} />
          {d.label && <span style={{ font: "400 13px/1 'Arimo', Helvetica, Arial, sans-serif", color: d.onBlock ? '#fff' : 'var(--track-deep)', transition: 'color .8s' }}>{d.label}</span>}
        </div>
      ))}
    </div>
  );
};
