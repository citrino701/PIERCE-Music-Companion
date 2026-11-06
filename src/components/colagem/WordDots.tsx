import React, { useMemo } from 'react';
import type { TrackData } from '../../types';
import { layoutDots, pickDotWords } from '../../services/colagem/colagem';

const COLOR = { a: 'var(--track-a)', b: 'var(--track-b)', ink: 'var(--ink)' } as const;

/** Floating dots carrying words from the song (or title/artist when there is no lyric). */
export const WordDots: React.FC<{ track: TrackData; playing: boolean; w: number; h: number; extraWords?: string[] }> = ({ track, playing, w, h, extraWords }) => {
  const dots = useMemo(() => layoutDots(track.id, extraWords?.length ? extraWords : pickDotWords(track), w, h), [track.id, track.lyrics, track.title, track.artist, extraWords, w, h]);
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
