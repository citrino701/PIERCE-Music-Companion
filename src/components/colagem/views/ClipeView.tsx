import React, { useMemo } from 'react';
import { Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import type { StageViewProps } from './types';
import { useBox, useFrameTime, useReducedMotion } from './hooks';
import { useTimedLines } from './lines';
import { useTrackPalette } from '../useTrackPalette';
import { formatTime, momentAt } from '../../../services/views/rhythm';
import { hashString } from '../../../services/palette/trackPalette';
import { liveCover } from '../../../services/colagem/colagem';

const BAR_W = 34;

/**
 * Keyframes for the camera: it never cuts — it continuously eases between these, each one either the full
 * picture (scale 1, centred) or zoomed into a detail from a different direction. Because every "zoomed in" stop
 * is bracketed by the same "full picture" keyframe, the loop (last -> first) is exactly as smooth as every other
 * step, so there's no visible reset.
 */
const DETAILS = [
  { x: 30, y: 30 },
  { x: 74, y: 26 },
  { x: 62, y: 74 },
  { x: 24, y: 68 },
];
const CENTER = { x: 50, y: 50 };
const SEGMENT_S = 8;
const smoothstep = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

interface Reveal { originX: number; originY: number; scale: number }

function keyframesFor(trackId: string): { x: number; y: number; zoomed: boolean }[] {
  const offset = hashString(trackId) % DETAILS.length;
  const kf: { x: number; y: number; zoomed: boolean }[] = [];
  for (let i = 0; i < DETAILS.length; i++) {
    kf.push({ ...CENTER, zoomed: false });
    kf.push({ ...DETAILS[(i + offset) % DETAILS.length], zoomed: true });
  }
  return kf;
}

/** Deterministic, never-reset camera move: continuously eases through `keyframesFor`'s loop, forever. */
function revealAt(t: number, trackId: string, reduced: boolean): Reveal {
  if (reduced) return { originX: 50, originY: 50, scale: 1.08 };
  const kf = keyframesFor(trackId);
  const total = kf.length * SEGMENT_S;
  const local = ((t % total) + total) % total;
  const idx = Math.floor(local / SEGMENT_S);
  const a = kf[idx];
  const b = kf[(idx + 1) % kf.length];
  const p = smoothstep((local - idx * SEGMENT_S) / SEGMENT_S);
  return {
    originX: lerp(a.x, b.x, p),
    originY: lerp(a.y, b.y, p),
    scale: lerp(a.zoomed ? 1.5 : 1, b.zoomed ? 1.5 : 1, p),
  };
}

const css = `
.pierce-c-btn{background:none;border:none;color:#fff;cursor:pointer;display:grid;place-items:center;border-radius:50%;transition:transform .15s;filter:drop-shadow(0 2px 8px rgba(0,0,0,.7))}
.pierce-c-btn:hover{opacity:.82}
.pierce-c-btn:active{transform:scale(.9)}
@keyframes pierce-c-grain{0%,100%{opacity:.16}50%{opacity:.26}}`;

/**
 * Clipe — immersive: the live cover fills the whole stage (a plain rail on the left, no text on it), the camera
 * continuously drifts in and out of different details of the cover with no visible reset, and the title/artist/
 * album, the current lyric and the transport all sit directly on the photo — no boxes or glass around them,
 * just a scrim low enough to keep them legible.
 */
export const ClipeView: React.FC<StageViewProps> = ({ track, progressMs, isPlaying, shuffleEnabled, lyricScale, lyricOffsetMs, onToggleShuffle, onTogglePlay, onSeek, onPrevious, onNext }) => {
  const [host] = useBox<HTMLDivElement>();
  const t = useFrameTime(progressMs, isPlaying, 30, lyricOffsetMs / 1000);
  const reduced = useReducedMotion();
  const pal = useTrackPalette(track);
  const lines = useTimedLines(track);
  const asciiSeed = useMemo(() => hashString(track.id) % 7, [track.id]);

  const real = useMemo(() => lines.map((l, i) => ({ l, i })).filter((x) => !x.l.gap), [lines]);
  const mo = momentAt(lines, t);
  const hasLyrics = real.length > 0;
  const curIdx = mo.line && !mo.line.gap ? mo.index : -1;
  const durationS = Math.max(1, track.durationMs / 1000);
  const progress = Math.min(1, Math.max(0, t / durationS));
  const gap = hasLyrics && curIdx < 0;
  const reveal = revealAt(t, track.id, reduced);
  const lyricScaleClamped = Math.min(1.3, Math.max(0.85, lyricScale));
  const base: React.CSSProperties = { font: "500 12px 'Arimo', sans-serif", color: 'rgba(255,255,255,.72)', textShadow: '0 1px 6px rgba(0,0,0,.8)' };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * track.durationMs));
  };

  return (
    <div ref={host} data-testid="clipe-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0c0a08', color: '#fff', fontFamily: "'Arimo', sans-serif", display: 'flex' }}>
      <style>{css}</style>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{curIdx >= 0 ? lines[curIdx].text : ''}</div>

      {/* barra lateral: só decorativa, sem texto */}
      <div style={{ width: BAR_W, flex: 'none', height: '100%', background: 'linear-gradient(180deg,#2a1f1a,#120d0a)', borderRight: '1px solid rgba(231,201,194,.25)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(231,201,194,.06) 0px, rgba(231,201,194,.06) 1px, transparent 1px, transparent 7px)' }} />
      </div>

      {/* foto do álbum: loop animado, preenchendo o resto do palco */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>
        {track.coverImage ? (
          <img src={track.coverImage} alt={`Capa de ${track.title}`} style={{
            position: 'absolute', left: '50%', top: '50%', width: '140%', height: '140%', minWidth: '140%', minHeight: '140%', objectFit: 'cover',
            transform: `translate(-50%, -50%) scale(${reveal.scale})`, transformOrigin: `${reveal.originX}% ${reveal.originY}%`,
            filter: 'saturate(1.08) contrast(1.04)',
          }} />
        ) : (
          <pre aria-hidden="true" style={{
            position: 'absolute', left: '50%', top: '50%', margin: 0, width: '140%', height: '140%', display: 'grid', placeItems: 'center',
            font: "20px/1.08 'DM Mono', monospace", color: 'var(--track-b)', whiteSpace: 'pre', transition: 'color .8s',
            transform: `translate(-50%, -50%) scale(${reveal.scale})`, transformOrigin: `${reveal.originX}% ${reveal.originY}%`,
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

        {/* escurecida no rodapé pra tudo ler em cima da própria foto */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%', background: 'linear-gradient(180deg, rgba(8,5,4,0) 0%, rgba(8,5,4,.78) 56%, rgba(6,3,2,.92) 100%)', pointerEvents: 'none' }} />

        {/* nome/artista/álbum (canto inferior esquerdo) + letra (canto inferior direito) */}
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 62, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ font: `700 ${Math.round(21 * lyricScaleClamped)}px/1.08 'Arimo', sans-serif`, color: '#f6ece8', textShadow: '0 2px 14px rgba(0,0,0,.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
            <div style={{ fontSize: 11.5, letterSpacing: '.06em', color: '#e7d9d4', textShadow: '0 1px 8px rgba(0,0,0,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
            <div style={{ fontSize: 10, letterSpacing: '.08em', color: '#c4b2aa', textTransform: 'uppercase', textShadow: '0 1px 8px rgba(0,0,0,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Álbum · {track.album}</div>
          </div>

          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
            {mo.line && !mo.gap && hasLyrics ? (
              <div style={{ font: `italic 700 ${Math.round(13 * lyricScaleClamped)}px/1.32 'Instrument Serif', Georgia, serif` }}>
                {mo.words.map((w, i) => (
                  <span key={`${mo.index}-${i}`} style={{
                    marginLeft: '.22em', display: 'inline-block', transition: 'color .25s, text-shadow .25s',
                    color: i <= mo.wordIndex ? '#f6ece8' : 'rgba(246,236,232,.55)',
                    textShadow: i === mo.wordIndex ? `0 0 18px ${pal.a}, 0 2px 10px rgba(0,0,0,.7)` : '0 2px 10px rgba(0,0,0,.7)',
                  }}>{w.text}</span>
                ))}
              </div>
            ) : (
              <div style={{ font: "italic 700 12px 'Instrument Serif', Georgia, serif", color: 'rgba(246,236,232,.7)', textShadow: '0 2px 10px rgba(0,0,0,.7)' }}>
                {hasLyrics ? (gap && real[0] ? `♪ ${real[0].l.text}` : '♪') : 'sem letra sincronizada'}
              </div>
            )}
          </div>
        </div>

        {/* transporte: imersivo, sem cápsula nem fundo — só os controles sobre a foto */}
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, height: 30, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="pierce-c-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: 28, height: 28 }}><SkipBack size={15} fill="currentColor" /></button>
          <button type="button" className="pierce-c-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: 30, height: 30 }}>
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button type="button" className="pierce-c-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: 28, height: 28 }}><SkipForward size={15} fill="currentColor" /></button>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>{formatTime(t)}</span>
          <div role="slider" tabIndex={0} aria-label="Posição da faixa" aria-valuemin={0} aria-valuemax={Math.round(durationS)} aria-valuenow={Math.round(t)} onClick={seekTo}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(progressMs + 5000); } if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(Math.max(0, progressMs - 5000)); } }}
            style={{ flex: 1, height: 16, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: 3, borderRadius: 3, background: 'rgba(255,255,255,.3)', boxShadow: '0 1px 6px rgba(0,0,0,.7)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 3, background: '#f6ece8' }} />
              <div style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: '50%', background: '#f6ece8', boxShadow: '0 0 10px rgba(0,0,0,.8)' }} />
            </div>
          </div>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{formatTime(durationS)}</span>
          <button type="button" className="pierce-c-btn" aria-label="Aleatório" aria-pressed={shuffleEnabled} onClick={onToggleShuffle} style={{ width: 26, height: 26, opacity: shuffleEnabled ? 1 : 0.6 }}><Shuffle size={14} /></button>
        </div>
      </div>
    </div>
  );
};
