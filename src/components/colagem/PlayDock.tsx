import React, { useRef } from 'react';
import type { AudioFeatures, TrackData } from '../../types';
import { formatClock } from '../../services/colagem/colagem';

const round = (size: number): React.CSSProperties => ({ width: size, height: size, borderRadius: '50%', border: '2px solid var(--ink)', background: '#fff', font: "15px 'DM Mono', monospace", color: 'var(--ink)', cursor: 'pointer', padding: 0 });
const DOTS = 54;

interface Props {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  audioFeatures: AudioFeatures;
  t: number;
  isShuffle: boolean;
  isRepeat: boolean;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (ms: number) => void;
}

/** The calm area: mascot, title, dotted progress, equalizer and controls. */
export const PlayDock: React.FC<Props> = ({ track, progressMs, isPlaying, audioFeatures, t, isShuffle, isRepeat, onToggleShuffle, onToggleRepeat, onTogglePlay, onPrevious, onNext, onSeek }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const duration = Math.max(1, track.durationMs);
  const played = Math.floor((progressMs / duration) * DOTS);
  const faces = ['(◕‿◕)', '(◕ᴗ◕)', '(◕‿◕)♪', '♪(◕ᴗ◕)'];
  const face = isPlaying ? faces[Math.floor(t * 2) % 4] : '(－ω－)';
  const bands = [audioFeatures.lowBand, audioFeatures.midBand, audioFeatures.highBand];
  const run = isPlaying ? 'running' : 'paused';

  const seekFromPointer = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onSeek(Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration));
  };

  return (
    <div style={{ position: 'absolute', left: 40, top: 604, width: 1200, height: 120, boxSizing: 'border-box', background: 'rgba(251,250,246,0.96)', border: '2px solid var(--ink)', borderRadius: 22, boxShadow: '5px 6px 0 var(--ink)' }}>
      <div aria-hidden="true" className="cg-bob" style={{ position: 'absolute', left: 22, top: 36, font: "500 26px/1 'DM Mono', monospace", whiteSpace: 'nowrap', animationDuration: '1.1s', animationPlayState: run }}>{face}</div>
      {isPlaying && <>
        <div aria-hidden="true" className="cg-rise" style={{ position: 'absolute', left: 24, top: 8, font: "18px/1 'Arimo', sans-serif", color: 'var(--track-a)' }}>♪</div>
        <div aria-hidden="true" className="cg-rise" style={{ position: 'absolute', left: 74, top: 12, font: "16px/1 'Arimo', sans-serif", color: 'var(--track-b)', animationDelay: '1.1s' }}>♫</div>
      </>}

      <div style={{ position: 'absolute', left: 130, top: 24, width: 180 }}>
        <div style={{ font: "700 20px/1.1 'Arimo', sans-serif", letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
        <div style={{ font: "12px/1 'DM Mono', monospace", color: '#5a5a73', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
        <div role="img" aria-label="Cor da faixa" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
          {(['a', 'b', 'bg'] as const).map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: '50%', background: `var(--track-${c})`, border: '1.5px solid var(--ink)', transition: 'background .8s' }} />)}
          <span style={{ font: "9px 'DM Mono', monospace", color: '#5a5a73', letterSpacing: '0.08em', marginLeft: 3 }}>COR DA FAIXA</span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 330, top: 30, width: 490 }}>
        <div
          ref={barRef} role="slider" tabIndex={0} aria-label="Progresso da faixa" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(progressMs)} aria-valuetext={formatClock(progressMs)}
          onClick={(e) => seekFromPointer(e.clientX)}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') onSeek(Math.min(duration, progressMs + 5000)); if (e.key === 'ArrowLeft') onSeek(Math.max(0, progressMs - 5000)); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 22, cursor: 'pointer' }}
        >
          {Array.from({ length: DOTS }, (_, i) => {
            const bounce = isPlaying && i === played ? -Math.round(Math.abs(Math.sin(t * 6)) * 6) : 0;
            const s = 8 + Math.round(8 * Math.abs(Math.sin(i * 0.4)));
            return <span key={i} style={{ width: s, height: s, borderRadius: '50%', background: i < played ? 'var(--track-a)' : 'transparent', border: '2px solid var(--ink)', boxSizing: 'border-box', transform: `translateY(${bounce}px)`, transition: 'background .3s' }} />;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, font: "11px 'DM Mono', monospace", letterSpacing: '0.06em' }}><span>{formatClock(progressMs)}</span><span>−{formatClock(duration - progressMs)}</span></div>
      </div>

      <div aria-hidden="true" style={{ position: 'absolute', left: 850, top: 28, height: 44, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        {Array.from({ length: 12 }, (_, i) => {
          const level = isPlaying ? bands[i % 3] * 0.7 + (Math.sin(t * 4 + i * 0.9) * 0.5 + 0.5) * 0.3 : 0;
          return <span key={i} style={{ width: 5, height: Math.round(6 + Math.min(1, level) * 34), background: i % 3 === 0 ? 'var(--track-b)' : 'var(--track-a)', borderRadius: 2, transition: 'background .8s, height .12s' }} />;
        })}
      </div>

      <div style={{ position: 'absolute', left: 960, top: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" aria-label="Modo aleatório" aria-pressed={isShuffle} onClick={onToggleShuffle} style={{ ...round(42), background: isShuffle ? 'var(--track-a)' : '#fff', color: isShuffle ? 'var(--track-on-a)' : 'var(--ink)' }}>⇄</button>
        <button type="button" aria-label="Faixa anterior" onClick={onPrevious} style={round(42)}>‹‹</button>
        <button type="button" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} className={isPlaying ? 'cg-pulse' : undefined}
          style={{ ...round(62), background: 'var(--track-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '3px 4px 0 var(--ink)', transition: 'background .8s' }}>
          {isPlaying ? <><span style={{ width: 5, height: 20, background: 'var(--track-on-a)' }} /><span style={{ width: 5, height: 20, background: 'var(--track-on-a)' }} /></>
            : <span aria-hidden="true" style={{ width: 0, height: 0, marginLeft: 4, borderStyle: 'solid', borderWidth: '11px 0 11px 18px', borderColor: 'transparent transparent transparent var(--track-on-a)' }} />}
        </button>
        <button type="button" aria-label="Próxima faixa" onClick={onNext} style={round(42)}>››</button>
        <button type="button" aria-label="Repetir faixa" aria-pressed={isRepeat} onClick={onToggleRepeat} style={{ ...round(42), background: isRepeat ? 'var(--track-a)' : '#fff', color: isRepeat ? 'var(--track-on-a)' : 'var(--ink)' }}>↻</button>
      </div>
    </div>
  );
};
