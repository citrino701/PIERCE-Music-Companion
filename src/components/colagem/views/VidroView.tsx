import React, { useMemo } from 'react';
import { Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import type { StageViewProps } from './types';
import { bpmOf, useBox, useFrameTime, useReducedMotion } from './hooks';
import { useTimedLines } from './lines';
import { vidroMetrics } from './vidroMetrics';
import { useTrackPalette } from '../useTrackPalette';
import { beatInfo, formatTime, momentAt } from '../../../services/views/rhythm';

const glass: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,.24), rgba(255,255,255,.07))',
  backdropFilter: 'blur(22px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(22px) saturate(1.5)',
  border: '1px solid rgba(255,255,255,.28)',
  boxShadow: '0 22px 60px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.38)',
};
const css = `
@keyframes pierce-v-a{0%,100%{transform:translate(-8%,-6%) scale(1)}50%{transform:translate(10%,8%) scale(1.15)}}
@keyframes pierce-v-b{0%,100%{transform:translate(8%,10%) scale(1.1)}50%{transform:translate(-10%,-8%) scale(.95)}}
@keyframes pierce-v-c{0%,100%{transform:translate(0,6%) scale(1)}50%{transform:translate(6%,-10%) scale(1.2)}}
.pierce-v-btn{background:none;border:none;color:#fff;cursor:pointer;display:grid;place-items:center;border-radius:50%;transition:background .2s,transform .15s}
.pierce-v-btn:hover{background:rgba(255,255,255,.16)}
.pierce-v-btn:active{transform:scale(.92)}`;

const blob = (color: string, size: string, pos: React.CSSProperties, anim: string, opacity: number): React.CSSProperties => ({
  position: 'absolute', width: size, height: size, backgroundColor: color, opacity, transition: 'background-color 1.4s',
  WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 66%)', maskImage: 'radial-gradient(circle, #000 0%, transparent 66%)',
  filter: 'blur(30px)', animation: `${anim} 22s ease-in-out infinite`, ...pos,
});

/**
 * Vidro — the cover is the hero, the background melts into its colours (blurred cover + drifting colour blobs),
 * everything else is frosted glass: previous line above the cover, the sung line below it, controls in a glass dock.
 */
export const VidroView: React.FC<StageViewProps> = ({ track, progressMs, isPlaying, shuffleEnabled, lyricScale, lyricOffsetMs, onToggleShuffle, onTogglePlay, onSeek, onPrevious, onNext }) => {
  const [host, box] = useBox<HTMLDivElement>();
  const t = useFrameTime(progressMs, isPlaying, 30, lyricOffsetMs / 1000);
  const reduced = useReducedMotion();
  const pal = useTrackPalette(track);
  const lines = useTimedLines(track);
  const m = useMemo(() => vidroMetrics(box.w, box.h, lyricScale), [box.w, box.h, lyricScale]);
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
  const radius = Math.round(m.cover * 0.075);
  const colW = m.wide ? m.column : Math.min(box.w - 40, 760);
  const base: React.CSSProperties = { font: "500 13px 'Arimo', sans-serif", color: 'rgba(255,255,255,.62)' };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * track.durationMs));
  };

  return (
    <div ref={host} data-testid="vidro-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#07050c', color: '#fff', fontFamily: "'Arimo', sans-serif" }}>
      <style>{css}</style>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {track.coverImage && <img src={track.coverImage} alt="" style={{ position: 'absolute', inset: '-18%', width: '136%', height: '136%', objectFit: 'cover', filter: 'blur(70px) saturate(1.7) brightness(.85)', opacity: 0.6 }} />}
        <div style={blob(pal.a, '78vmax', { left: '-20%', top: '-25%' }, reduced ? 'none' : 'pierce-v-a', 0.55)} />
        <div style={blob(pal.b, '70vmax', { right: '-25%', top: '10%' }, reduced ? 'none' : 'pierce-v-b', 0.5)} />
        <div style={blob(pal.deep, '82vmax', { left: '5%', bottom: '-45%' }, reduced ? 'none' : 'pierce-v-c', 0.7)} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 35%, rgba(4,2,8,.7) 100%)' }} />
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.35 }}>
          <filter id="vGrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#vGrain)" />
        </svg>
      </div>

      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{curIdx >= 0 ? lines[curIdx].text : ''}</div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: m.wide ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: m.wide ? 56 : 14, padding: m.wide ? '24px 48px' : '20px 20px 18px' }}>
{m.wide ? (
  <>
        <div style={{ ...glass, padding: Math.max(6, m.cover * 0.025), borderRadius: radius + 8, transform: `scale(${1 + 0.014 * k})`, transition: 'transform .12s ease-out', flex: 'none' }}>
      <div style={{ width: m.cover, height: m.cover, borderRadius: radius, overflow: 'hidden', background: pal.a, position: 'relative' }}>
        {track.coverImage ? <img src={track.coverImage} alt={`Capa de ${track.title}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: `700 ${m.cover * 0.2}px 'Arimo', sans-serif`, color: pal.onA }}>{track.title.slice(0, 1)}</div>}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 38%)', pointerEvents: 'none' }} />
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: colW, minWidth: 0 }}>
        <div style={{ ...base, letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 11 }}>{isPlaying ? 'tocando agora' : 'pausado'}</div>
        <div style={{ textAlign: m.wide ? 'left' : 'center', lineHeight: 1.2, maxWidth: colW }}>
          <div style={{ font: `700 ${Math.max(16, Math.min(26, box.w * 0.032))}px 'Arimo', sans-serif`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ ...base, fontSize: 14, marginTop: 2 }}>{track.artist}</div>
        </div>
        <div style={{ ...base, height: 34, maxWidth: colW, textAlign: m.wide ? 'left' : 'center', overflow: 'hidden', fontSize: Math.max(13, m.lyricFont * 0.5), opacity: 0.7, display: 'flex', alignItems: 'flex-end', transition: 'opacity .4s' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{prev?.l.text ?? ''}</span>
        </div>
        <div style={{ ...glass, borderRadius: 26, boxSizing: 'border-box', width: colW, minHeight: m.lyricPanel * 0.62, maxHeight: m.lyricPanel, padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' }}>
          {mo.line && !mo.gap && hasLyrics ? (
            <div style={{ font: `700 ${m.lyricFont}px/1.18 'Arimo', sans-serif`, letterSpacing: '-.01em' }}>
              {mo.words.map((w, i) => (
                <span key={`${mo.index}-${i}`} style={{
                  marginRight: '.28em', display: 'inline-block', transition: 'color .25s, text-shadow .25s, transform .25s',
                  color: i < mo.wordIndex ? '#fff' : i === mo.wordIndex ? '#fff' : 'rgba(255,255,255,.42)',
                  textShadow: i === mo.wordIndex ? `0 0 26px ${pal.a}, 0 0 4px rgba(255,255,255,.6)` : 'none',
                  transform: i === mo.wordIndex && !reduced ? 'translateY(-2px)' : 'none',
                }}>{w.text}</span>
              ))}
            </div>
          ) : (
            <div style={{ ...base, fontSize: Math.max(15, m.lyricFont * 0.7) }}>{hasLyrics ? (gap && real[0] ? `♪ ${real[0].l.text}` : '♪') : 'sem letra sincronizada para esta faixa'}</div>
          )}
        </div>
        <div style={{ ...base, height: 22, maxWidth: colW, fontSize: Math.max(13, m.lyricFont * 0.46), opacity: 0.5, overflow: 'hidden' }}>
          <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>{next?.l.text ?? ''}</span>
        </div>
        <div style={{ ...glass, borderRadius: 999, boxSizing: 'border-box', width: colW, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <button type="button" className="pierce-v-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: 40, height: 40 }}><SkipBack size={20} fill="currentColor" /></button>
          <button type="button" className="pierce-v-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: 48, height: 48, background: 'rgba(255,255,255,.2)' }}>
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <button type="button" className="pierce-v-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: 40, height: 40 }}><SkipForward size={20} fill="currentColor" /></button>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>{formatTime(t)}</span>
          <div role="slider" tabIndex={0} aria-label="Posição da faixa" aria-valuemin={0} aria-valuemax={Math.round(durationS)} aria-valuenow={Math.round(t)} onClick={seekTo}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(progressMs + 5000); } if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(Math.max(0, progressMs - 5000)); } }}
            style={{ flex: 1, height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,.22)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 3, background: '#fff' }} />
              <div style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', width: 11, height: 11, marginLeft: -5, marginTop: -5.5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,.7)' }} />
            </div>
          </div>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 34 }}>{formatTime(durationS)}</span>
          <button type="button" className="pierce-v-btn" aria-label="Aleatório" aria-pressed={shuffleEnabled} onClick={onToggleShuffle} style={{ width: 36, height: 36, opacity: shuffleEnabled ? 1 : 0.55, background: shuffleEnabled ? 'rgba(255,255,255,.2)' : undefined }}><Shuffle size={17} /></button>
        </div>
    </div>
  </>
) : (
  <>
        <div style={{ ...base, letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 11 }}>{isPlaying ? 'tocando agora' : 'pausado'}</div>
        <div style={{ ...base, height: 34, maxWidth: colW, textAlign: m.wide ? 'left' : 'center', overflow: 'hidden', fontSize: Math.max(13, m.lyricFont * 0.5), opacity: 0.7, display: 'flex', alignItems: 'flex-end', transition: 'opacity .4s' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{prev?.l.text ?? ''}</span>
        </div>
        <div style={{ ...glass, padding: Math.max(6, m.cover * 0.025), borderRadius: radius + 8, transform: `scale(${1 + 0.014 * k})`, transition: 'transform .12s ease-out', flex: 'none' }}>
          <div style={{ width: m.cover, height: m.cover, borderRadius: radius, overflow: 'hidden', background: pal.a, position: 'relative' }}>
            {track.coverImage ? <img src={track.coverImage} alt={`Capa de ${track.title}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: `700 ${m.cover * 0.2}px 'Arimo', sans-serif`, color: pal.onA }}>{track.title.slice(0, 1)}</div>}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 38%)', pointerEvents: 'none' }} />
          </div>
        </div>
        <div style={{ textAlign: m.wide ? 'left' : 'center', lineHeight: 1.2, maxWidth: colW }}>
          <div style={{ font: `700 ${Math.max(16, Math.min(26, box.w * 0.032))}px 'Arimo', sans-serif`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ ...base, fontSize: 14, marginTop: 2 }}>{track.artist}</div>
        </div>
        <div style={{ ...glass, borderRadius: 26, boxSizing: 'border-box', width: colW, minHeight: m.lyricPanel * 0.62, maxHeight: m.lyricPanel, padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' }}>
          {mo.line && !mo.gap && hasLyrics ? (
            <div style={{ font: `700 ${m.lyricFont}px/1.18 'Arimo', sans-serif`, letterSpacing: '-.01em' }}>
              {mo.words.map((w, i) => (
                <span key={`${mo.index}-${i}`} style={{
                  marginRight: '.28em', display: 'inline-block', transition: 'color .25s, text-shadow .25s, transform .25s',
                  color: i < mo.wordIndex ? '#fff' : i === mo.wordIndex ? '#fff' : 'rgba(255,255,255,.42)',
                  textShadow: i === mo.wordIndex ? `0 0 26px ${pal.a}, 0 0 4px rgba(255,255,255,.6)` : 'none',
                  transform: i === mo.wordIndex && !reduced ? 'translateY(-2px)' : 'none',
                }}>{w.text}</span>
              ))}
            </div>
          ) : (
            <div style={{ ...base, fontSize: Math.max(15, m.lyricFont * 0.7) }}>{hasLyrics ? (gap && real[0] ? `♪ ${real[0].l.text}` : '♪') : 'sem letra sincronizada para esta faixa'}</div>
          )}
        </div>
        <div style={{ ...base, height: 22, maxWidth: colW, fontSize: Math.max(13, m.lyricFont * 0.46), opacity: 0.5, overflow: 'hidden' }}>
          <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>{next?.l.text ?? ''}</span>
        </div>
        <div style={{ ...glass, borderRadius: 999, boxSizing: 'border-box', width: colW, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <button type="button" className="pierce-v-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: 40, height: 40 }}><SkipBack size={20} fill="currentColor" /></button>
          <button type="button" className="pierce-v-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: 48, height: 48, background: 'rgba(255,255,255,.2)' }}>
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <button type="button" className="pierce-v-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: 40, height: 40 }}><SkipForward size={20} fill="currentColor" /></button>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>{formatTime(t)}</span>
          <div role="slider" tabIndex={0} aria-label="Posição da faixa" aria-valuemin={0} aria-valuemax={Math.round(durationS)} aria-valuenow={Math.round(t)} onClick={seekTo}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(progressMs + 5000); } if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(Math.max(0, progressMs - 5000)); } }}
            style={{ flex: 1, height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,.22)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 3, background: '#fff' }} />
              <div style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', width: 11, height: 11, marginLeft: -5, marginTop: -5.5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,.7)' }} />
            </div>
          </div>
          <span style={{ ...base, fontVariantNumeric: 'tabular-nums', minWidth: 34 }}>{formatTime(durationS)}</span>
          <button type="button" className="pierce-v-btn" aria-label="Aleatório" aria-pressed={shuffleEnabled} onClick={onToggleShuffle} style={{ width: 36, height: 36, opacity: shuffleEnabled ? 1 : 0.55, background: shuffleEnabled ? 'rgba(255,255,255,.2)' : undefined }}><Shuffle size={17} /></button>
        </div>
  </>
)}
      </div>
    </div>
  );
};
