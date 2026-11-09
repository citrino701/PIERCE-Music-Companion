import React, { useRef } from 'react';
import type { TrackData } from '../../types';
import { formatClock } from '../../services/colagem/colagem';

const round = (size: number): React.CSSProperties => ({ width: size, height: size, borderRadius: '50%', border: '2px solid var(--ink)', background: '#fff', font: "14px 'DM Mono', monospace", color: 'var(--ink)', cursor: 'pointer', padding: 0, flex: 'none' });
const DOTS = 40;

interface Props {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  t: number;
  /** reading: one slim row. stacked: title line + progress on top, controls below. */
  variant: 'reading' | 'stacked';
  showTitle: boolean;
  shuffleEnabled: boolean;
  onToggleShuffle: () => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (ms: number) => void;
}

export const COMPACT_DOCK_HEIGHT = { reading: 70, stacked: 130 } as const;

/** Player bar for narrow windows: the same controls as the full dock, laid out to fit. */
export const CompactDock: React.FC<Props> = ({ track, progressMs, isPlaying, t, variant, showTitle, shuffleEnabled, onToggleShuffle, onTogglePlay, onPrevious, onNext, onSeek }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const duration = Math.max(1, track.durationMs);
  const played = Math.floor((progressMs / duration) * DOTS);

  const seekFromPointer = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onSeek(Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration));
  };

  const progress = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        ref={barRef} role="slider" tabIndex={0} aria-label="Progresso da faixa" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(progressMs)} aria-valuetext={formatClock(progressMs)}
        onClick={(e) => seekFromPointer(e.clientX)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          e.stopPropagation();
          onSeek(e.key === 'ArrowRight' ? Math.min(duration, progressMs + 5000) : Math.max(0, progressMs - 5000));
        }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, cursor: 'pointer' }}
      >
        {Array.from({ length: DOTS }, (_, i) => {
          const bounce = isPlaying && i === played ? -Math.round(Math.abs(Math.sin(t * 6)) * 4) : 0;
          const s = 6 + Math.round(5 * Math.abs(Math.sin(i * 0.4)));
          return <span key={i} style={{ width: s, height: s, borderRadius: '50%', background: i < played ? 'var(--track-a)' : 'transparent', border: '1.5px solid var(--ink)', boxSizing: 'border-box', transform: `translateY(${bounce}px)`, transition: 'background .3s' }} />;
        })}
      </div>
    </div>
  );

  const controls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <button type="button" aria-label="Modo aleatório" aria-pressed={shuffleEnabled} onClick={onToggleShuffle} style={{ ...round(34), background: shuffleEnabled ? 'var(--track-a)' : '#fff', color: shuffleEnabled ? 'var(--track-on-a)' : 'var(--ink)' }}>⇄</button>
      <button type="button" aria-label="Faixa anterior" onClick={onPrevious} style={round(36)}>‹‹</button>
      <button type="button" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} className={isPlaying ? 'cg-pulse' : undefined}
        style={{ ...round(48), background: 'var(--track-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '2px 3px 0 var(--ink)', transition: 'background .8s' }}>
        {isPlaying ? <><span style={{ width: 4, height: 16, background: 'var(--track-on-a)' }} /><span style={{ width: 4, height: 16, background: 'var(--track-on-a)' }} /></>
          : <span aria-hidden="true" style={{ width: 0, height: 0, marginLeft: 3, borderStyle: 'solid', borderWidth: '9px 0 9px 15px', borderColor: 'transparent transparent transparent var(--track-on-a)' }} />}
      </button>
      <button type="button" aria-label="Próxima faixa" onClick={onNext} style={round(36)}>››</button>
    </div>
  );

  const clock = <span style={{ font: "11px 'DM Mono', monospace", letterSpacing: '0.04em', flex: 'none' }}>{formatClock(progressMs)}</span>;
  const title = showTitle && (
    <div style={{ minWidth: 0, flex: variant === 'reading' ? '0 1 150px' : 1 }}>
      <div style={{ font: "700 15px/1.1 'Arimo', sans-serif", letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
      <div style={{ font: "11px/1 'DM Mono', monospace", color: '#5a5a73', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, height: COMPACT_DOCK_HEIGHT[variant], boxSizing: 'border-box', background: 'rgba(251,250,246,0.96)', border: '2px solid var(--ink)', borderRadius: 20, boxShadow: '4px 5px 0 var(--ink)', padding: variant === 'reading' ? '0 14px' : '10px 16px', display: 'flex', flexDirection: variant === 'reading' ? 'row' : 'column', alignItems: 'stretch', justifyContent: 'center', gap: variant === 'reading' ? 12 : 6 }}>
      {variant === 'reading' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>{controls}{progress}{clock}{title}</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{title}{!showTitle && <div style={{ flex: 1 }} />}{clock}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{progress}</div>
          {controls}
        </>
      )}
    </div>
  );
};
