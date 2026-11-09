import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Maximize2, Disc3, PanelTop, LayoutGrid } from 'lucide-react';
import type { LyricLine, TrackData } from '../../types';
import { useTrackPalette } from '../colagem/useTrackPalette';
import { formatClock, lyricWords, liveCover } from '../../services/colagem/colagem';
import { filledDots, WIDGET_SIZES, type WidgetVariant } from '../../services/widget/widgetLayout';

interface ReducedWidgetProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  variant: WidgetVariant;
  onVariantChange: (variant: WidgetVariant) => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onExpand: () => void;
  /** Called on pointer-down over the empty body of the widget; the shell starts the native window drag. */
  onDragStart: () => void;
}

const INK = '#14142b';
const RING_DOTS = 56;

const VARIANT_BUTTONS: { id: WidgetVariant; label: string; icon: React.ReactNode }[] = [
  { id: 'normal', label: 'Formato normal', icon: <LayoutGrid size={12} /> },
  { id: 'disc', label: 'Formato disco', icon: <Disc3 size={12} /> },
  { id: 'mini', label: 'Formato mini', icon: <PanelTop size={12} /> },
];

const css = `
.pw-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:transparent;user-select:none;-webkit-user-select:none;font-family:'DM Mono','Space Mono',ui-monospace,monospace;color:${INK}}
.pw-btn{display:inline-flex;align-items:center;justify-content:center;border:2px solid ${INK};background:#fbfaf6;color:${INK};border-radius:999px;cursor:pointer;padding:0;transition:transform .12s}
.pw-btn:hover{transform:translateY(-1px)}
.pw-btn:focus-visible{outline:3px solid var(--pw-deep);outline-offset:2px}
.pw-card{width:392px;height:196px;border:2px solid ${INK};border-radius:22px;background:rgba(251,250,246,.97);box-shadow:5px 6px 0 ${INK};display:flex;gap:12px;padding:12px;position:relative;overflow:hidden}
.pw-vinyl{border-radius:50%;animation:pw-spin 6s linear infinite}
.pw-paused .pw-vinyl{animation-play-state:paused}
.pw-marquee{display:inline-block;white-space:nowrap;animation:pw-marquee 12s linear infinite}
.pw-paused .pw-marquee{animation-play-state:paused}
@keyframes pw-spin{to{transform:rotate(360deg)}}
@keyframes pw-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.pw-vinyl,.pw-marquee{animation:none}}
`;

const Controls: React.FC<{ isPlaying: boolean; onTogglePlay: () => void; onPrevious: () => void; onNext: () => void; a: string; onA: string; size?: number }> = ({ isPlaying, onTogglePlay, onPrevious, onNext, a, onA, size = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <button type="button" className="pw-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: size, height: size }}><SkipBack size={14} /></button>
    <button type="button" className="pw-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: size + 10, height: size + 10, background: a, color: onA }}>
      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
    </button>
    <button type="button" className="pw-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: size, height: size }}><SkipForward size={14} /></button>
  </div>
);

const VariantSwitch: React.FC<{ variant: WidgetVariant; onChange: (v: WidgetVariant) => void; onExpand: () => void; deep: string }> = ({ variant, onChange, onExpand, deep }) => (
  <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="Formato do player flutuante">
    {VARIANT_BUTTONS.map((b) => (
      <button key={b.id} type="button" className="pw-btn" aria-label={b.label} aria-pressed={variant === b.id} title={b.label} onClick={() => onChange(b.id)}
        style={{ width: 22, height: 22, background: variant === b.id ? INK : '#fbfaf6', color: variant === b.id ? '#fff' : deep }}>{b.icon}</button>
    ))}
    <button type="button" className="pw-btn" aria-label="Voltar ao Fullscreen" title="Voltar ao Fullscreen (Esc)" onClick={onExpand} style={{ width: 22, height: 22 }}><Maximize2 size={12} /></button>
  </div>
);

function Dots({ filled, total, a }: { filled: number; total: number; a: string }) {
  return (
    <div aria-hidden style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: i < filled ? a : 'rgba(20,20,43,.22)', flex: '0 0 auto' }} />
      ))}
    </div>
  );
}

export const ReducedWidget: React.FC<ReducedWidgetProps> = ({
  track, progressMs, isPlaying, activeLyric, variant, onVariantChange, onTogglePlay, onPrevious, onNext, onExpand, onDragStart,
}) => {
  const palette = useTrackPalette(track);
  const vars = { '--pw-a': palette.a, '--pw-deep': palette.deep } as React.CSSProperties;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [isPlaying]);
  const ascii = useMemo(() => liveCover(tick * 0.5, (palette.a.length + track.id.length) % 7 / 3, 38, 12), [tick, palette.a, track.id]);

  const words = activeLyric ? lyricWords(activeLyric, progressMs) : [];
  const size = WIDGET_SIZES[variant];
  const dragProps = { onPointerDown: (e: React.PointerEvent) => { if ((e.target as HTMLElement).closest('button')) return; if (e.button === 0) onDragStart(); } };
  const filled = filledDots(progressMs, track.durationMs, RING_DOTS);

  let body: React.ReactNode;
  if (variant === 'disc') {
    const D = 204, R = D / 2 - 6;
    body = (
      <div {...dragProps} style={{ position: 'relative', width: D, height: D, cursor: 'grab' }}>
        <div className="pw-vinyl" aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${INK} 0 34%, #1d1d3a 34% 36%, ${INK} 36% 60%, #26264a 60% 61%, ${INK} 61%)`, boxShadow: `4px 5px 0 ${INK}`, border: `2px solid ${INK}` }}>
          <div style={{ position: 'absolute', inset: '30%', borderRadius: '50%', backgroundImage: `url(${track.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `2px solid ${palette.a}` }} />
        </div>
        <svg aria-hidden width={D} height={D} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: RING_DOTS }, (_, i) => {
            const ang = (i / RING_DOTS) * Math.PI * 2 - Math.PI / 2;
            return <circle key={i} cx={D / 2 + Math.cos(ang) * R} cy={D / 2 + Math.sin(ang) * R} r={i < filled ? 2.4 : 1.6} fill={i < filled ? palette.a : 'rgba(251,250,246,.45)'} />;
          })}
        </svg>
        <button type="button" className="pw-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay}
          style={{ position: 'absolute', left: D / 2 - 24, top: D / 2 - 24, width: 48, height: 48, background: palette.a, color: palette.onA }}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button type="button" className="pw-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ position: 'absolute', left: 6, top: D / 2 - 14, width: 28, height: 28 }}><SkipBack size={13} /></button>
        <button type="button" className="pw-btn" aria-label="Próxima faixa" onClick={onNext} style={{ position: 'absolute', right: 6, top: D / 2 - 14, width: 28, height: 28 }}><SkipForward size={13} /></button>
        <div style={{ position: 'absolute', left: '50%', bottom: 2, transform: 'translateX(-50%)', background: palette.a, color: palette.onA, border: `2px solid ${INK}`, borderRadius: 8, padding: '1px 8px', fontSize: 10, maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
        <div style={{ position: 'absolute', left: '50%', top: 4, transform: 'translateX(-50%)' }}><VariantSwitch variant={variant} onChange={onVariantChange} onExpand={onExpand} deep={palette.deep} /></div>
      </div>
    );
  } else if (variant === 'mini') {
    const title = `${track.title} — ${track.artist}   ·   `;
    body = (
      <div {...dragProps} className="pw-mini" style={{ width: 300, height: 48, border: `2px solid ${INK}`, borderRadius: 999, background: 'rgba(251,250,246,.97)', boxShadow: `3px 4px 0 ${INK}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 14px', cursor: 'grab', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', fontSize: 11 }} aria-label={`${track.title} — ${track.artist}`}>
          <span className="pw-marquee">{title}{title}</span>
        </div>
        <VariantSwitch variant={variant} onChange={onVariantChange} onExpand={onExpand} deep={palette.deep} />
        <button type="button" className="pw-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: 34, height: 34, background: palette.a, color: palette.onA, flex: '0 0 auto' }}>
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    );
  } else {
    body = (
      <div {...dragProps} className="pw-card" style={{ cursor: 'grab' }}>
        <div aria-hidden style={{ width: 140, flex: '0 0 140px', borderRadius: 14, border: `2px solid ${INK}`, overflow: 'hidden', position: 'relative', background: palette.a }}>
          <img src={track.coverImage} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }} />
          <pre style={{ position: 'absolute', inset: 0, margin: 0, fontSize: 5.5, lineHeight: '6px', color: palette.onA, opacity: 0.35, overflow: 'hidden', pointerEvents: 'none' }}>{ascii}</pre>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Arimo','Helvetica Neue',Arial,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 19, lineHeight: 1.15, minHeight: 44, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} aria-live="off">
            {words.length === 0 ? <span style={{ opacity: 0.5, fontStyle: 'italic' }}>♪</span> : words.map((w, i) => (
              <span key={i} style={w.state === 'current' ? { background: INK, color: '#fff', padding: '0 4px', borderRadius: 4, margin: '0 1px' } : w.state === 'sung' ? { background: palette.a, color: palette.onA, padding: '0 3px', borderRadius: 4, margin: '0 1px' } : { opacity: 0.75 }}>{w.text}{' '}</span>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}><span>{formatClock(progressMs)}</span><span>{formatClock(track.durationMs)}</span></div>
            <Dots filled={Math.floor((filled / RING_DOTS) * 34)} total={34} a={palette.a} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Controls isPlaying={isPlaying} onTogglePlay={onTogglePlay} onPrevious={onPrevious} onNext={onNext} a={palette.a} onA={palette.onA} size={28} />
            <VariantSwitch variant={variant} onChange={onVariantChange} onExpand={onExpand} deep={palette.deep} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pw-root ${isPlaying ? '' : 'pw-paused'}`} style={{ ...vars, width: size.width, height: size.height }} data-testid="reduced-widget" data-variant={variant}>
      <style>{css}</style>
      {body}
    </div>
  );
};
