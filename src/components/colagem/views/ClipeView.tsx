import React, { useMemo } from 'react';
import { Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import type { StageViewProps } from './types';
import { bpmOf, useBox, useFrameTime, useReducedMotion } from './hooks';
import { useTimedLines } from './lines';
import { useTrackPalette } from '../useTrackPalette';
import { beatInfo, formatTime, momentAt } from '../../../services/views/rhythm';
import { hashString } from '../../../services/palette/trackPalette';
import { liveCover, seeded } from '../../../services/colagem/colagem';

const BAR_W = 34;

/** One "shot": where the camera starts zoomed in before slowly pulling back to reveal the whole cover. */
const SCENES = [
  { origin: '30% 30%' },
  { origin: '74% 26%' },
  { origin: '62% 74%' },
  { origin: '24% 68%' },
];
const HOLD_ZOOMED_S = 0.7;
const REVEAL_S = 11;
const HOLD_REVEALED_S = 4.2;
const CYCLE_S = HOLD_ZOOMED_S + REVEAL_S + HOLD_REVEALED_S;
const smoothstep = (x: number) => x * x * (3 - 2 * x);

interface Reveal { origin: string; scale: number; blur: number }

/**
 * Deterministic "reveal" for the current instant: the cover starts zoomed into one corner/detail, holds a beat,
 * then pulls back slowly to show the whole picture, holds there, and cuts straight to a new detail — never
 * reversing back the way it came, so it never reads as a simple zoom-in/zoom-out loop.
 */
function revealAt(t: number, trackId: string, reduced: boolean): Reveal {
  if (reduced) return { origin: '50% 50%', scale: 1.08, blur: 0 };
  const cycle = Math.floor(t / CYCLE_S);
  const local = t - cycle * CYCLE_S;
  const scene = SCENES[(((cycle % SCENES.length) + hashString(trackId)) % SCENES.length + SCENES.length) % SCENES.length];
  let progress = 0;
  if (local >= HOLD_ZOOMED_S && local < HOLD_ZOOMED_S + REVEAL_S) progress = smoothstep((local - HOLD_ZOOMED_S) / REVEAL_S);
  else if (local >= HOLD_ZOOMED_S + REVEAL_S) progress = 1;
  return { origin: scene.origin, scale: 1.55 + (1 - 1.55) * progress, blur: 3 + (0 - 3) * progress };
}

const css = `
.pierce-c-btn{background:none;border:none;color:#fff;cursor:pointer;display:grid;place-items:center;border-radius:50%;transition:background .2s,transform .15s}
.pierce-c-btn:hover{background:rgba(255,255,255,.16)}
.pierce-c-btn:active{transform:scale(.92)}
@keyframes pierce-c-grain{0%,100%{opacity:.16}50%{opacity:.26}}
@keyframes pierce-c-bar{0%,100%{opacity:.9}50%{opacity:1}}`;

/**
 * Clipe — fills the whole stage: a vertical rail on the left (track identity, rotated), and the live cover
 * filling the rest as a boxed loop that starts zoomed on a detail and slowly reveals the whole picture before
 * cutting to a new one. The current lyric and the transport both sit right on top of the cover's lower edge
 * (a scrim behind them keeps it legible), the same way the earlier "stories" treatment did — just not boxed
 * into a phone-shaped card.
 */
export const ClipeView: React.FC<StageViewProps> = ({ track, progressMs, isPlaying, shuffleEnabled, lyricScale, lyricOffsetMs, onToggleShuffle, onTogglePlay, onSeek, onPrevious, onNext }) => {
  const [host] = useBox<HTMLDivElement>();
  const t = useFrameTime(progressMs, isPlaying, 30, lyricOffsetMs / 1000);
  const reduced = useReducedMotion();
  const pal = useTrackPalette(track);
  const lines = useTimedLines(track);
  const asciiSeed = useMemo(() => hashString(track.id) % 7, [track.id]);
  const { kick } = beatInfo(t, bpmOf(track.bpm));
  const k = isPlaying && !reduced ? kick : 0;

  const real = useMemo(() => lines.map((l, i) => ({ l, i })).filter((x) => !x.l.gap), [lines]);
  const mo = momentAt(lines, t);
  const hasLyrics = real.length > 0;
  const curIdx = mo.line && !mo.line.gap ? mo.index : -1;
  const durationS = Math.max(1, track.durationMs / 1000);
  const progress = Math.min(1, Math.max(0, t / durationS));
  const gap = hasLyrics && curIdx < 0;
  const reveal = revealAt(t, track.id, reduced);
  const liveScale = reveal.scale * (1 + 0.01 * k);
  const lyricScaleClamped = Math.min(1.3, Math.max(0.85, lyricScale));
  const base: React.CSSProperties = { font: "500 12px 'Arimo', sans-serif", color: 'rgba(255,255,255,.62)' };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * track.durationMs));
  };

  return (
    <div ref={host} data-testid="clipe-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0c0a08', color: '#fff', fontFamily: "'Arimo', sans-serif", display: 'flex' }}>
      <style>{css}</style>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{curIdx >= 0 ? lines[curIdx].text : ''}</div>

      {/* barra lateral */}
      <div style={{ width: BAR_W, flex: 'none', height: '100%', background: 'linear-gradient(180deg,#2a1f1a,#120d0a)', borderRight: '1px solid rgba(231,201,194,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(231,201,194,.06) 0px, rgba(231,201,194,.06) 1px, transparent 1px, transparent 7px)' }} />
        <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', font: "11px 'DM Mono', monospace", letterSpacing: '.32em', color: '#e7c9c2', animation: reduced ? 'none' : 'pierce-c-bar 4s ease-in-out infinite' }}>
          {track.artist.toUpperCase()} · {track.album.toUpperCase()} · {track.title.toUpperCase()}
        </div>
      </div>

      {/* foto do álbum: loop animado, preenchendo o resto do palco, com letra e transporte sobrepostos nela */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>
        {track.coverImage ? (
          <img src={track.coverImage} alt={`Capa de ${track.title}`} style={{
            position: 'absolute', left: '50%', top: '50%', width: '140%', height: '140%', minWidth: '140%', minHeight: '140%', objectFit: 'cover',
            transform: `translate(-50%, -50%) scale(${liveScale})`, transformOrigin: reveal.origin,
            filter: `blur(${reveal.blur}px) saturate(1.08) contrast(1.04)`,
          }} />
        ) : (
          <pre aria-hidden="true" style={{
            position: 'absolute', left: '50%', top: '50%', margin: 0, width: '140%', height: '140%', display: 'grid', placeItems: 'center',
            font: "20px/1.08 'DM Mono', monospace", color: 'var(--track-b)', whiteSpace: 'pre', transition: 'color .8s',
            transform: `translate(-50%, -50%) scale(${liveScale})`, transformOrigin: reveal.origin, filter: `blur(${reveal.blur}px)`,
          }}>{liveCover(t, asciiSeed, 96, 42)}</pre>
        )}

        {/* grão de filme */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', animation: reduced ? 'none' : 'pierce-c-grain 2.6s ease-in-out infinite' }}>
          <filter id="cGrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#cGrain)" />
        </svg>

        {/* vinheta */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 78% 72% at 50% 40%, rgba(0,0,0,0) 40%, rgba(6,3,2,.74) 100%)', pointerEvents: 'none' }} />
        {/* toque de cor da paleta da faixa */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${pal.a}, ${pal.deep})`, mixBlendMode: 'soft-light', opacity: 0.5, pointerEvents: 'none', transition: 'background 1s' }} />

        <div style={{ position: 'absolute', left: 14, top: 14, padding: '3px 9px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(231,201,194,.35)', font: "9px 'DM Mono', monospace", letterSpacing: '.14em', color: '#f3e6e1' }}>
          {isPlaying ? 'LOOP · CAPA VIVA' : 'PAUSADO'}
        </div>

        {/* escurecida no rodapé pra letra e transporte lerem em cima da própria foto */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', background: 'linear-gradient(180deg, rgba(8,5,4,0) 0%, rgba(8,5,4,.8) 56%, rgba(6,3,2,.94) 100%)', pointerEvents: 'none' }} />

        {/* letra, sobre a foto */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 72, padding: '0 24px', boxSizing: 'border-box', textAlign: 'center' }}>
          {mo.line && !mo.gap && hasLyrics ? (
            <div style={{ font: `italic 700 ${Math.round(17 * lyricScaleClamped)}px/1.3 'Instrument Serif', Georgia, serif` }}>
              {mo.words.map((w, i) => (
                <span key={`${mo.index}-${i}`} style={{
                  margin: '0 .18em', display: 'inline-block', transition: 'color .25s, text-shadow .25s',
                  color: i <= mo.wordIndex ? '#f6ece8' : 'rgba(246,236,232,.5)',
                  textShadow: i === mo.wordIndex ? `0 0 18px ${pal.a}, 0 2px 10px rgba(0,0,0,.7)` : '0 2px 10px rgba(0,0,0,.7)',
                }}>{w.text}</span>
              ))}
            </div>
          ) : (
            <div style={{ font: "italic 700 14px 'Instrument Serif', Georgia, serif", color: 'rgba(246,236,232,.7)', textShadow: '0 2px 10px rgba(0,0,0,.7)' }}>
              {hasLyrics ? (gap && real[0] ? `♪ ${real[0].l.text}` : '♪') : 'sem letra sincronizada'}
            </div>
          )}
        </div>

        {/* transporte, também sobre a foto */}
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: 16, height: 48, boxSizing: 'border-box', borderRadius: 999, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(18,13,10,.6)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(231,201,194,.18)',
        }}>
          <button type="button" className="pierce-c-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: 32, height: 32 }}><SkipBack size={16} fill="currentColor" /></button>
          <button type="button" className="pierce-c-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: 38, height: 38, background: 'rgba(255,255,255,.14)' }}>
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <button type="button" className="pierce-c-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: 32, height: 32 }}><SkipForward size={16} fill="currentColor" /></button>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>{formatTime(t)}</span>
          <div role="slider" tabIndex={0} aria-label="Posição da faixa" aria-valuemin={0} aria-valuemax={Math.round(durationS)} aria-valuenow={Math.round(t)} onClick={seekTo}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(progressMs + 5000); } if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(Math.max(0, progressMs - 5000)); } }}
            style={{ flex: 1, height: 16, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: 4, borderRadius: 3, background: 'rgba(231,201,194,.22)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 3, background: '#e7c9c2' }} />
              <div style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: '50%', background: '#f6ece8', boxShadow: '0 0 10px rgba(231,201,194,.7)' }} />
            </div>
          </div>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{formatTime(durationS)}</span>
          <button type="button" className="pierce-c-btn" aria-label="Aleatório" aria-pressed={shuffleEnabled} onClick={onToggleShuffle} style={{ width: 30, height: 30, opacity: shuffleEnabled ? 1 : 0.55, background: shuffleEnabled ? 'rgba(255,255,255,.18)' : undefined }}><Shuffle size={14} /></button>
        </div>
      </div>
    </div>
  );
};
