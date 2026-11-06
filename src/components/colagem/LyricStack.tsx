import React from 'react';
import type { LyricLine } from '../../types';
import { lyricFontSize, lyricWords } from '../../services/colagem/colagem';

const SERIF = "'Instrument Serif', Georgia, serif";
const HALO = '0 0 10px var(--track-bg), 0 0 4px var(--track-bg)';
const EASE = 'cubic-bezier(.22,.8,.2,1)';
const MS = '650ms';

type Role = 'gone' | 'past' | 'current' | 'next1' | 'next2' | 'far';
const ROLES: Role[] = ['gone', 'past', 'current', 'next1', 'next2', 'far'];

interface RoleStyle { size: number; opacity: number; maxHeight: number; marginTop: number; color: string; shadow: string }
const roleStyle = (role: Role, current: string): RoleStyle => {
  switch (role) {
    case 'gone': return { size: 18, opacity: 0, maxHeight: 0, marginTop: 0, color: 'var(--track-deep)', shadow: 'none' };
    case 'past': return { size: 24, opacity: 0.9, maxHeight: 30, marginTop: 0, color: 'var(--track-deep)', shadow: 'none' };
    case 'current': return { size: lyricFontSize(current), opacity: 1, maxHeight: 420, marginTop: 14, color: 'var(--ink)', shadow: HALO };
    case 'next1': return { size: 32, opacity: 1, maxHeight: 84, marginTop: 14, color: 'var(--ink)', shadow: '0 0 8px var(--track-bg)' };
    case 'next2': return { size: 26, opacity: 1, maxHeight: 64, marginTop: 2, color: '#5a5a73', shadow: 'none' };
    default: return { size: 22, opacity: 0, maxHeight: 0, marginTop: 0, color: '#5a5a73', shadow: 'none' };
  }
};

interface Props { lines: LyricLine[]; active?: LyricLine; progressMs: number; plainText?: string | null }

/**
 * Past / current / next lines in the serif face. Every line keeps its DOM node while it moves
 * between roles, so size, colour, opacity and height ease smoothly instead of swapping abruptly.
 */
export const LyricStack: React.FC<Props> = ({ lines, active, progressMs, plainText }) => {
  const box: React.CSSProperties = { position: 'absolute', left: 500, top: 140, width: 740, height: 350, overflow: 'hidden' };

  if (lines.length === 0 && plainText) {
    return (
      <div style={{ ...box, overflowY: 'auto', WebkitMaskImage: 'linear-gradient(#000 85%, transparent)', maskImage: 'linear-gradient(#000 85%, transparent)' }}>
        <p style={{ margin: 0, font: `400 30px/1.25 ${SERIF}`, color: 'var(--ink)', textShadow: HALO, whiteSpace: 'pre-line' }}>{plainText}</p>
      </div>
    );
  }
  if (lines.length === 0) {
    return <div style={box}><div style={{ marginTop: 38, font: `400 68px/1.12 ${SERIF}`, color: 'var(--ink)', textShadow: HALO }}>O silêncio antes do compasso.</div></div>;
  }

  const idx = active ? lines.findIndex((l) => l.id === active.id) : -1;
  const from = Math.max(0, idx - 2);
  const to = Math.min(lines.length - 1, idx + 3);
  const visible = lines.slice(from, to + 1);

  return (
    <div style={box} aria-live="polite">
      {visible.map((line, k) => {
        const role = ROLES[from + k - idx + 2];
        const st = roleStyle(role, line.text);
        const isCurrent = role === 'current';
        const words = isCurrent ? lyricWords(line, progressMs) : line.text.split(/\s+/).filter(Boolean).map((text) => ({ text, state: 'rest' as const }));
        return (
          <div key={line.id} aria-hidden={role === 'gone' || role === 'far'}
            style={{ overflow: 'hidden', fontFamily: SERIF, fontWeight: 400, fontSize: st.size, lineHeight: 1.12, letterSpacing: isCurrent ? '-0.01em' : 0, opacity: st.opacity, maxHeight: st.maxHeight, marginTop: st.marginTop, color: st.color, textShadow: st.shadow,
              transition: `font-size ${MS} ${EASE}, opacity ${MS} ${EASE}, max-height ${MS} ${EASE}, margin-top ${MS} ${EASE}, color ${MS} ${EASE}` }}>
            {words.map((w, i) => {
              const bg = !isCurrent || w.state === 'rest' ? 'transparent' : w.state === 'sung' ? 'var(--track-a)' : w.state === 'current' ? 'var(--ink)' : '#fff';
              const fg = !isCurrent ? 'inherit' : w.state === 'sung' ? 'var(--track-on-a)' : w.state === 'current' ? '#fff' : w.state === 'next' ? 'var(--track-deep)' : 'var(--ink)';
              return (
                <span key={i} style={{ display: 'inline-block', margin: isCurrent ? '0 6px 6px 0' : '0 0.25em 0 0', padding: isCurrent ? '0 10px' : '0', background: bg, color: fg, transition: `background .3s, color .3s, padding ${MS} ${EASE}, margin ${MS} ${EASE}` }}>{w.text}</span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
