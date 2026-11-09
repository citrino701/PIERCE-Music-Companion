import React, { useMemo } from 'react';
import type { StageViewProps } from './types';
import { bpmOf, useBox, useFrameTime, useReducedMotion } from './hooks';
import { useTimedLines, verseSeek } from './lines';
import { beatInfo, formatTime, hash, lineIndexAt, wordTimings, type TimedWord } from '../../../services/views/rhythm';

const BG = '#BEC72C', BOX = '#FF6A13', INK = '#111111';

/**
 * H · Respira — the current line is a poster of boxed letters; the sung word swells on the beat,
 * sung words shrink and fill, future words are outlines. The cover is just another box. (docs: handoff H)
 */
export const RespiraView: React.FC<StageViewProps> = ({ track, tracks, progressMs, isPlaying, onTogglePlay, onSeek }) => {
  const [host, box] = useBox<HTMLDivElement>();
  const t = useFrameTime(progressMs, isPlaying, 30);
  const reduced = useReducedMotion();
  const lines = useTimedLines(track);
  const bpm = bpmOf(track.bpm);
  const { beat, kick } = beatInfo(t, bpm);
  const k = isPlaying && !reduced ? kick : 0;

  const real = useMemo(() => lines.map((l, i) => ({ l, i })).filter((x) => !x.l.gap), [lines]);
  const idx = lineIndexAt(lines, t);
  // Poster line: the current one; across a gap keep the last real line (all sung); before the first show it as "future".
  const shown = useMemo(() => {
    let i = idx;
    while (i >= 0 && lines[i]?.gap) i--;
    return i >= 0 ? i : real.length ? real[0].i : -1;
  }, [idx, lines, real]);
  const hasLyrics = real.length > 0;
  const words: TimedWord[] = useMemo(() => {
    if (!hasLyrics) return track.title.split(/\s+/).filter(Boolean).map((text) => ({ text, start: 0, end: Infinity, line: 0 }));
    return wordTimings(lines[shown], shown);
  }, [hasLyrics, lines, shown, track.title]);
  const inGap = hasLyrics && (idx < 0 || lines[idx]?.gap || (shown >= 0 && t >= lines[shown].end));
  const beforeFirst = hasLyrics && idx < 0;

  const sc = Math.max(0.4, Math.min(1.25, Math.min(box.w / 1280, box.h / 760 + 0.15)));
  const pad = Math.round(36 * Math.max(0.6, sc));
  const paused = !isPlaying;
  const availW = Math.max(200, box.w - pad * 2 - (paused ? 0 : 210 * sc));

  const word = (w: TimedWord, wi: number) => {
    const cur = hasLyrics ? !beforeFirst && !inGap && t >= w.start && t < w.end : true;
    const sung = hasLyrics ? (!beforeFirst && (inGap || t >= w.end)) : false;
    const base = cur ? 200 : sung ? 86 : 54;
    const limited = cur ? Math.min(base, availW / (Math.max(1, w.text.length) * 0.72) / sc) : base;
    const letters = [...w.text];
    return (
      <span key={`${shown}-${wi}`} role="button" tabIndex={0} aria-label={`Ir para a palavra ${w.text}`}
        onClick={() => hasLyrics && onSeek(Math.round(w.start * 1000))}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && hasLyrics) { e.preventDefault(); onSeek(Math.round(w.start * 1000)); } }}
        style={{ display: 'inline-flex', alignItems: 'center', margin: `0 ${Math.round(16 * sc)}px`, cursor: hasLyrics ? 'pointer' : 'default' }}>
        {letters.map((ch, li) => {
          const iL = wi * 40 + li;
          const b = cur ? beat : 0;
          const vary = reduced ? 1 : 0.82 + 0.36 * hash(iL, b);
          const dy = reduced ? 0 : (hash(iL, beat + 7) - 0.5) * (cur ? 36 : sung ? 14 : 6);
          const size = limited * sc * vary * (cur ? 1 + 0.12 * k : 1) * (paused ? 0.5 : 1);
          return (
            <span key={li} className="pierce-h-letter" style={{
              display: 'inline-flex', lineHeight: 0.86, padding: '.02em .07em .06em', fontSize: size, fontWeight: 900,
              fontFamily: "'Archivo', 'Arimo', sans-serif", color: INK, textTransform: 'uppercase',
              background: cur || sung ? BOX : 'transparent', boxShadow: cur || sung ? 'none' : `inset 0 0 0 2px ${INK}`,
              transform: `translateY(${dy}px)`, transition: 'font-size .28s cubic-bezier(.3,1.6,.5,1), transform .18s ease-out',
            } as React.CSSProperties}>{ch}</span>
          );
        })}
      </span>
    );
  };

  const coverW = paused ? Math.min(560, box.h * 0.6, box.w * 0.9) : 210 * sc * (1 + 0.1 * k);
  const coverH = paused ? coverW : 250 * sc * (1 + 0.1 * k);
  const rot = paused ? -2 : reduced ? 0 : -4 + 8 * hash(beat, 3);
  const n = Math.max(0, tracks.findIndex((x) => x.id === track.id)) + 1;
  const grainSeed = reduced ? 3 : beat % 97;
  const roughSeed = reduced ? 1 : (Math.floor(beat / 2) % 5) + 1;
  const small: React.CSSProperties = { font: `900 ${Math.max(10, Math.round(15 * Math.max(0.7, sc)))}px/1.1 'Archivo', 'Arimo', sans-serif`, textTransform: 'uppercase', color: INK };
  const link: React.CSSProperties = { ...small, background: 'none', border: 'none', padding: 4, cursor: 'pointer', textAlign: 'inherit' };
  const lineText = hasLyrics && shown >= 0 ? lines[shown].text : track.title;

  return (
    <div ref={host} data-testid="respira-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BG, color: INK, fontFamily: "'Archivo', 'Arimo', sans-serif", display: 'flex', flexDirection: 'column', padding: `${Math.round(28 * sc)}px ${pad}px` }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="hRough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={roughSeed} /><feDisplacementMap in="SourceGraphic" scale="7" /></filter>
          <filter id="hGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={grainSeed} /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="0 0.6" /></feComponentTransfer></filter>
          <filter id="hFiber"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves="2" seed="9" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="0 0.35" /></feComponentTransfer></filter>
        </defs>
      </svg>

      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{lineText}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 12, ...small }}>
        <div>faixa {n} de {tracks.length}</div>
        <button type="button" onClick={onTogglePlay} style={{ ...link, textAlign: 'center' }}>{isPlaying ? 'tocando agora' : 'pausado · toque aqui'}</button>
        <div style={{ textAlign: 'right' }}>{track.artist}<br />{track.title}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', alignContent: 'center', gap: `${6 * sc}px ${0.35 * 12 * sc}px`, filter: 'url(#hRough)' }}>
        <button type="button" onClick={onTogglePlay} aria-label={isPlaying ? 'Pausar' : 'Tocar'} style={{
          position: 'relative', flex: 'none', width: coverW, height: coverH, padding: 0, border: 'none', background: BOX, cursor: 'pointer', overflow: 'hidden',
          transform: `rotate(${rot}deg)`, transition: 'width .45s cubic-bezier(.3,1.5,.5,1), height .45s cubic-bezier(.3,1.5,.5,1), transform .18s ease-out',
        }}>
          {track.coverImage && <img src={track.coverImage} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(1) contrast(1.9) brightness(1.15)', mixBlendMode: 'multiply' }} />}
          <span style={{ position: 'absolute', right: 6, bottom: 6, background: BG, color: INK, font: "700 13px 'Archivo', sans-serif", padding: '2px 6px' }}>{paused ? 'pausado · toque pra voltar' : 'CAPA · toque pra pausar'}</span>
        </button>
        {words.map(word)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end', gap: 12 }}>
        <button type="button" style={{ ...link, textAlign: 'left' }} onClick={() => { const ms = verseSeek(lines, t, -1); if (ms != null) onSeek(Math.round(ms)); }}>← verso anterior</button>
        <div style={{ ...small, textAlign: 'center' }}>{formatTime(t)} · {formatTime(track.durationMs / 1000)} / {Math.round(bpm)} bpm</div>
        <button type="button" style={{ ...link, textAlign: 'right' }} onClick={() => { const ms = verseSeek(lines, t, 1); if (ms != null) onSeek(Math.round(ms)); }}>próximo verso →</button>
      </div>

      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, mixBlendMode: 'multiply' }}>
        <rect width="100%" height="100%" filter="url(#hFiber)" />
        <rect width="100%" height="100%" filter="url(#hGrain)" />
      </svg>
    </div>
  );
};
