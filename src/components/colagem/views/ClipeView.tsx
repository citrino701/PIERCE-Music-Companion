import React, { useMemo } from 'react';
import { Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import type { StageViewProps } from './types';
import { bpmOf, useBox, useFrameTime, useReducedMotion } from './hooks';
import { useTimedLines } from './lines';
import { useTrackPalette } from '../useTrackPalette';
import { beatInfo, formatTime, momentAt } from '../../../services/views/rhythm';
import { hashString } from '../../../services/palette/trackPalette';
import { liveCover, seeded } from '../../../services/colagem/colagem';

/** Seconds each "shot" lasts before the camera hard-cuts to a new pan/zoom target (like jumping between cool parts of a clip). */
const SCENE_S = 7;

const glass: React.CSSProperties = {
  background: 'rgba(8,6,14,.74)',
  backdropFilter: 'blur(18px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
  border: '1px solid rgba(255,255,255,.14)',
  boxShadow: '0 22px 60px rgba(0,0,0,.5)',
};

const css = `
.pierce-c-btn{background:none;border:none;color:#fff;cursor:pointer;display:grid;place-items:center;border-radius:50%;transition:background .2s,transform .15s}
.pierce-c-btn:hover{background:rgba(255,255,255,.16)}
.pierce-c-btn:active{transform:scale(.92)}`;

interface Shot { scale: number; x: number; y: number; cut: number }

/** Deterministic "camera move" for one scene: eases between two random pan/zoom points, seeded per track + scene. */
function shotAt(t: number, trackId: string, reduced: boolean): Shot {
  if (reduced) return { scale: 1.05, x: 0, y: 0, cut: 0 };
  const scene = Math.floor(t / SCENE_S);
  const local = (t - scene * SCENE_S) / SCENE_S;
  const ease = local * local * (3 - 2 * local);
  const r = (tag: string) => seeded(hashString(`${trackId}-${scene}-${tag}`))();
  const fromX = (r('x0') - 0.5) * 18, toX = (r('x1') - 0.5) * 18;
  const fromY = (r('y0') - 0.5) * 15, toY = (r('y1') - 0.5) * 15;
  const fromS = 1.04 + r('s0') * 0.08, toS = 1.1 + r('s1') * 0.14;
  // a quick flash right at the cut, fading out over the first ~12% of the shot
  const cut = Math.max(0, 1 - local / 0.12);
  return { scale: fromS + (toS - fromS) * ease, x: fromX + (toX - fromX) * ease, y: fromY + (toY - fromY) * ease, cut };
}

/**
 * Clipe — a generated loop of the live cover (or its ASCII fallback) as the main/hero visual, panned and zoomed
 * like a camera, cutting to a new "shot" every few seconds; the lyrics sit in a glass panel off to the side, in a
 * colour that always reads against the busy footage behind it.
 */
export const ClipeView: React.FC<StageViewProps> = ({ track, progressMs, isPlaying, shuffleEnabled, lyricScale, lyricOffsetMs, onToggleShuffle, onTogglePlay, onSeek, onPrevious, onNext }) => {
  const [host, box] = useBox<HTMLDivElement>();
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
  const prev = [...real].reverse().find((x) => x.i < (curIdx >= 0 ? curIdx : mo.index + 1));
  const next = real.find((x) => x.i > (curIdx >= 0 ? curIdx : mo.index));
  const durationS = Math.max(1, track.durationMs / 1000);
  const progress = Math.min(1, Math.max(0, t / durationS));
  const gap = hasLyrics && curIdx < 0;
  const wide = box.w / box.h >= 1.15 && box.w >= 760;
  const panelW = wide ? Math.min(420, Math.max(300, box.w * 0.3)) : Math.max(box.w - 40, 260);
  const lyricFont = Math.round(Math.max(18, Math.min(34, (wide ? panelW : box.w) * 0.072)) * Math.min(1.4, Math.max(0.8, lyricScale)));
  const base: React.CSSProperties = { font: "500 13px 'Arimo', sans-serif", color: 'rgba(255,255,255,.62)' };
  const shot = shotAt(t, track.id, reduced);
  const scale = (isPlaying ? shot.scale : Math.min(shot.scale, 1.06)) * (1 + 0.01 * k);

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * track.durationMs));
  };

  return (
    <div ref={host} data-testid="clipe-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#040308', color: '#fff', fontFamily: "'Arimo', sans-serif" }}>
      <style>{css}</style>

      {/* Hero: the cover (or its ASCII fallback) as a generated loop, panned/zoomed like a camera, cutting shots every few seconds */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: '-8%', width: '116%', height: '116%',
          transform: `translate3d(${shot.x}%, ${shot.y}%, 0) scale(${scale})`,
          transition: reduced ? 'none' : 'transform .08s linear',
          filter: 'saturate(1.25) contrast(1.08) brightness(.92)',
        }}>
          {track.coverImage ? (
            <img src={track.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <pre aria-hidden="true" style={{
              position: 'absolute', inset: 0, margin: 0, width: '100%', height: '100%', display: 'grid', placeItems: 'center',
              font: "26px/1.08 'DM Mono', monospace", color: 'var(--track-b)', whiteSpace: 'pre', transition: 'color .8s',
            }}>{liveCover(t, asciiSeed, 96, 42)}</pre>
          )}
        </div>
        {/* colour grade from the track's own palette, so the loop always feels tied to the song */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${pal.a}, ${pal.deep})`, mixBlendMode: 'color', opacity: 0.4, transition: 'background 1s' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 80% at 50% 50%, rgba(0,0,0,0) 40%, rgba(2,1,6,.82) 100%)' }} />
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.3 }}>
          <filter id="cGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#cGrain)" />
        </svg>
        {/* flash at each cut, and a soft pulse on the kick */}
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: Math.max(shot.cut * 0.1, k * 0.05), pointerEvents: 'none', transition: 'opacity .1s' }} />
        <div style={{ position: 'absolute', left: 14, top: 12, padding: '3px 9px', background: 'rgba(0,0,0,.5)', color: '#fff', font: "10px 'DM Mono', monospace", letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,.25)' }}>CLIPE · LOOP DA CAPA</div>
      </div>

      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{curIdx >= 0 ? lines[curIdx].text : ''}</div>

      {/* Lyrics "de ladinho": a glass panel docked to the side (or bottom, narrow), always legible over the footage */}
      <div style={{
        position: 'absolute', display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box',
        ...(wide
          ? { right: 24, top: 24, bottom: 24, width: panelW, justifyContent: 'center' }
          : { left: 20, right: 20, bottom: 18, width: panelW }),
      }}>
        <div style={{ ...glass, borderRadius: 22, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...base, letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 10.5 }}>{isPlaying ? 'tocando agora' : 'pausado'}</div>
          <div>
            <div style={{ font: '700 17px \'Arimo\', sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
            <div style={{ ...base, fontSize: 13, marginTop: 1 }}>{track.artist}</div>
          </div>
          <div style={{ ...base, fontSize: Math.max(12, lyricFont * 0.4), opacity: 0.6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minHeight: 16 }}>{prev?.l.text ?? ''}</div>
          <div style={{ minHeight: lyricFont * 2.4, display: 'flex', alignItems: 'center' }}>
            {mo.line && !mo.gap && hasLyrics ? (
              <div style={{ font: `700 ${lyricFont}px/1.22 'Arimo', sans-serif`, letterSpacing: '-.01em' }}>
                {mo.words.map((w, i) => (
                  <span key={`${mo.index}-${i}`} style={{
                    marginRight: '.28em', display: 'inline-block', transition: 'color .25s, text-shadow .25s, transform .25s',
                    color: i <= mo.wordIndex ? '#fff' : 'rgba(255,255,255,.4)',
                    textShadow: i === mo.wordIndex ? `0 0 24px ${pal.a}, 0 0 4px rgba(255,255,255,.6)` : 'none',
                    transform: i === mo.wordIndex && !reduced ? 'translateY(-2px)' : 'none',
                  }}>{w.text}</span>
                ))}
              </div>
            ) : (
              <div style={{ ...base, fontSize: Math.max(14, lyricFont * 0.56) }}>{hasLyrics ? (gap && real[0] ? `♪ ${real[0].l.text}` : '♪') : 'sem letra sincronizada para esta faixa'}</div>
            )}
          </div>
          <div style={{ ...base, fontSize: Math.max(12, lyricFont * 0.4), opacity: 0.45, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minHeight: 16 }}>{next?.l.text ?? ''}</div>
        </div>

        <div style={{ ...glass, borderRadius: 999, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <button type="button" className="pierce-c-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: 36, height: 36 }}><SkipBack size={18} fill="currentColor" /></button>
          <button type="button" className="pierce-c-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: 42, height: 42, background: 'rgba(255,255,255,.18)' }}>
            {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
          </button>
          <button type="button" className="pierce-c-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: 36, height: 36 }}><SkipForward size={18} fill="currentColor" /></button>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 30, fontSize: 12, textAlign: 'right' }}>{formatTime(t)}</span>
          <div role="slider" tabIndex={0} aria-label="Posição da faixa" aria-valuemin={0} aria-valuemax={Math.round(durationS)} aria-valuenow={Math.round(t)} onClick={seekTo}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(progressMs + 5000); } if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(Math.max(0, progressMs - 5000)); } }}
            style={{ flex: 1, height: 16, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: 4, borderRadius: 3, background: 'rgba(255,255,255,.22)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 3, background: '#fff' }} />
              <div style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,.7)' }} />
            </div>
          </div>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 30, fontSize: 12 }}>{formatTime(durationS)}</span>
          <button type="button" className="pierce-c-btn" aria-label="Aleatório" aria-pressed={shuffleEnabled} onClick={onToggleShuffle} style={{ width: 32, height: 32, opacity: shuffleEnabled ? 1 : 0.55, background: shuffleEnabled ? 'rgba(255,255,255,.2)' : undefined }}><Shuffle size={15} /></button>
        </div>
      </div>
    </div>
  );
};
