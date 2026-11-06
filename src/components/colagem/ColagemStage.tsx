import React, { useEffect, useRef, useState } from 'react';
import type { AudioFeatures, LyricLine, TrackData, ViewMode } from '../../types';
import { formatClock, splitTitle, STAGE_H, STAGE_W, titleFontSize } from '../../services/colagem/colagem';
import { INK } from '../../services/palette/trackPalette';
import { AsciiVignette } from './AsciiVignette';
import { LiveCover } from './LiveCover';
import { LyricStack } from './LyricStack';
import { PlayDock } from './PlayDock';
import { TrackNotes } from './TrackNotes';
import { useStageClock } from './useStageClock';
import { useTrackPalette } from './useTrackPalette';
import { WordDots } from './WordDots';

interface Props {
  track: TrackData;
  tracks: TrackData[];
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  audioFeatures: AudioFeatures;
  titleOpacity?: number;
  onSelectMode: (mode: ViewMode) => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const MODES: { mode: ViewMode; glyph: string; label: string }[] = [
  { mode: 'compact', glyph: '▫', label: 'Modo Compacto' },
  { mode: 'disc', glyph: '◎', label: 'Modo Disco' },
  { mode: 'fullscreen', glyph: '▣', label: 'Modo Fullscreen' },
  { mode: 'zen', glyph: '~', label: 'Modo Zen' },
];

/** "Bagunça 3": a 1280x760 stage scaled to the width of its container. */
export const ColagemStage: React.FC<Props> = ({ track, tracks, progressMs, isPlaying, activeLyric, audioFeatures, titleOpacity = 0.8, onSelectMode, onTogglePlay, onSeek, onPrevious, onNext }) => {
  const pal = useTrackPalette(track);
  const t = useStageClock(isPlaying);
  const [isShuffle, setShuffle] = useState(false);
  const [isRepeat, setRepeat] = useState(false);
  const [scale, setScale] = useState(1);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / STAGE_W || 1);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [l1, l2] = splitTitle(track.title);
  const n = String(Math.max(0, tracks.findIndex((x) => x.id === track.id)) + 1).padStart(2, '0');
  const vars = { '--track-bg': pal.bg, '--track-a': pal.a, '--track-b': pal.b, '--track-deep': pal.deep, '--track-on-a': pal.onA, '--ink': INK } as React.CSSProperties;

  return (
    <div ref={wrap} data-testid="colagem-stage" className="w-full select-none" style={{ height: STAGE_H * scale, maxWidth: STAGE_W, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      <div style={{ ...vars, position: 'absolute', left: 0, top: 0, width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: '0 0', overflow: 'hidden', fontFamily: "'Arimo', Helvetica, Arial, sans-serif", color: 'var(--ink)', background: 'var(--track-bg)', transition: 'background .8s' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(20,20,43,0.14) 0.7px, transparent 0.9px)', backgroundSize: '4px 4px' }} />

        <div aria-hidden="true" style={{ position: 'absolute', left: 300, top: -150, font: "italic 400 520px/1 'Instrument Serif', Georgia, serif", color: 'var(--track-a)', opacity: titleOpacity, whiteSpace: 'nowrap', transition: 'color .8s' }}>Pi</div>
        <div aria-hidden="true" style={{ position: 'absolute', left: 470, top: 330, font: "italic 400 380px/1 'Instrument Serif', Georgia, serif", color: 'var(--track-b)', opacity: titleOpacity, whiteSpace: 'nowrap', transition: 'color .8s' }}>ErCe</div>
        <div aria-hidden="true" style={{ position: 'absolute', left: 470, top: 430, width: 810, height: 330, background: 'repeating-linear-gradient(color-mix(in srgb, var(--track-bg) 70%, transparent) 0 3px, transparent 3px 10px)' }} />

        <AsciiVignette t={t} />

        <div style={{ position: 'absolute', left: 40, top: 40, width: 400, height: 300, background: 'var(--track-a)', overflow: 'hidden', transition: 'background .8s' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.3px, transparent 1.7px) 0 0 / 6px 6px', WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)', maskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)' }} />
          <h2 style={{ position: 'absolute', left: 22, top: 16, margin: 0, font: `700 ${titleFontSize([l1, l2])}px/0.92 'Arimo', Helvetica, Arial, sans-serif`, color: 'var(--track-on-a)', letterSpacing: '-0.04em', whiteSpace: 'nowrap', transition: 'color .8s' }} aria-label={track.title}>
            <span aria-hidden="true">{l1}{l2 && <><br />{l2}</>}</span>
          </h2>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 16, font: "500 15px/1.3 'Arimo', sans-serif", color: 'var(--track-on-a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .8s' }}>
            {track.artist}<br />faixa {n}{track.year ? ` · ${track.year}` : ''}{track.album ? ` · ${track.album}` : ''}
          </div>
        </div>

        <LiveCover t={t} trackId={track.id} />

        <div style={{ position: 'absolute', left: 1010, top: 34, width: 240, font: "400 16px/1.3 'Arimo', Helvetica, Arial, sans-serif", color: 'var(--track-deep)', transition: 'color .8s' }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          {isPlaying ? 'tocando agora' : 'em pausa'}<br />{formatClock(progressMs)} — {formatClock(track.durationMs)}
        </div>
        <nav aria-label="Modos de visualização" style={{ position: 'absolute', right: 20, top: 6, display: 'flex', gap: 4 }}>
          {MODES.map((m) => (
            <button key={m.mode} type="button" aria-label={m.label} title={m.label} onClick={() => onSelectMode(m.mode)}
              style={{ width: 24, height: 24, border: '1.5px solid var(--ink)', borderRadius: '50%', background: '#fff', font: "12px/1 'DM Mono', monospace", color: 'var(--ink)', cursor: 'pointer', padding: 0 }}>{m.glyph}</button>
          ))}
        </nav>

        <WordDots track={track} playing={isPlaying} />
        <LyricStack lines={track.lyrics} active={activeLyric} progressMs={progressMs} />
        <TrackNotes track={track} progressMs={progressMs} />

        <div aria-hidden="true" style={{ position: 'absolute', left: 24, top: 336, width: 120, height: 30, background: 'rgba(255,225,77,0.8)', transform: 'rotate(-7deg)' }} />
        <div aria-hidden="true" className="cg-spin" style={{ position: 'absolute', left: 1204, top: 250, font: "40px/1 'Arimo', sans-serif", color: 'var(--track-a)', transition: 'color .8s', animationPlayState: isPlaying ? 'running' : 'paused' }}>✺</div>
        <div aria-hidden="true" className="cg-wob" style={{ position: 'absolute', left: 456, top: 100, font: "28px/1 'Arimo', sans-serif", color: 'var(--ink)', animationPlayState: isPlaying ? 'running' : 'paused' }}>✦</div>

        <PlayDock track={track} progressMs={progressMs} isPlaying={isPlaying} audioFeatures={audioFeatures} t={t} isShuffle={isShuffle} isRepeat={isRepeat}
          onToggleShuffle={() => setShuffle((v) => !v)} onToggleRepeat={() => setRepeat((v) => !v)} onTogglePlay={onTogglePlay} onPrevious={onPrevious} onNext={onNext} onSeek={onSeek} />
      </div>
    </div>
  );
};
