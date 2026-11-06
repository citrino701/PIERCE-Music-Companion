import React from 'react';
import type { LyricLine } from '../../types';
import { lyricFontSize, lyricWords } from '../../services/colagem/colagem';

const SERIF = "'Instrument Serif', Georgia, serif";
const HALO = '0 0 10px var(--track-bg), 0 0 4px var(--track-bg)';

interface Props { lines: LyricLine[]; active?: LyricLine; progressMs: number }

/** Past / current (word boxes) / next lines in the serif face, distinct from the title face. */
export const LyricStack: React.FC<Props> = ({ lines, active, progressMs }) => {
  const idx = active ? lines.findIndex((l) => l.id === active.id) : -1;
  const prev = idx > 0 ? lines[idx - 1] : undefined;
  const next1 = idx >= 0 ? lines[idx + 1] : undefined;
  const next2 = idx >= 0 ? lines[idx + 2] : undefined;
  const size = lyricFontSize(active?.text ?? '');
  const words = active ? lyricWords(active, progressMs) : [];

  const wordStyle = (state: string): React.CSSProperties => {
    switch (state) {
      case 'sung': return { background: 'var(--track-a)', color: 'var(--track-on-a)' };
      case 'current': return { background: 'var(--ink)', color: '#fff' };
      case 'next': return { background: '#fff', color: 'var(--track-deep)' };
      default: return { background: 'transparent', color: 'var(--ink)', textShadow: HALO };
    }
  };

  return (
    <div style={{ position: 'absolute', left: 500, top: 140, width: 740, height: 350, overflow: 'hidden' }} aria-live="polite">
      <div style={{ font: `italic 400 24px/1.2 ${SERIF}`, color: 'var(--track-deep)', minHeight: 29, transition: 'color .8s' }}>{prev?.text ?? ''}</div>
      <div style={{ marginTop: 14, font: `400 ${size}px/1.12 ${SERIF}`, letterSpacing: '-0.01em' }}>
        {active ? words.map((w, i) => (
          <span key={i} style={{ display: 'inline-block', margin: '0 6px 6px 0', padding: '0 10px', transition: 'background .3s, color .3s', ...wordStyle(w.state) }}>{w.text}</span>
        )) : <span style={{ color: 'var(--ink)', textShadow: HALO }}>O silêncio antes do compasso.</span>}
      </div>
      <div style={{ marginTop: 14, font: `400 32px/1.2 ${SERIF}`, color: 'var(--ink)', textShadow: '0 0 8px var(--track-bg)' }}>{next1?.text ?? ''}</div>
      <div style={{ marginTop: 2, font: `italic 400 26px/1.2 ${SERIF}`, color: '#5a5a73' }}>{next2?.text ?? ''}</div>
    </div>
  );
};
