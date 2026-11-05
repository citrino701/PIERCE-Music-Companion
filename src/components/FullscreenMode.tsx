import React, { useState, useEffect, useRef } from 'react';
import { PierceAsciiField } from './PierceAsciiField';
import {
  TrackData,
  LyricLine,
  NarrativeChapter,
  AudioFeatures,
  VisualSettings,
  ViewMode,
} from '../types';
import { formatTime } from '../services/playbackEngine';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Minimize2,
  Disc3,
  Monitor,
  LayoutGrid,
  Square,
  Wind,
} from 'lucide-react';

interface FullscreenModeProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  volume: number;
  activeLyric?: LyricLine;
  lyricsText?: string | null;
  onToggleShuffle: () => void;
  shuffleEnabled: boolean;
  activeChapter?: NarrativeChapter;
  audioFeatures: AudioFeatures;
  visualSettings: VisualSettings;
  onUpdateVisualSettings: (settings: Partial<VisualSettings>) => void;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMute: () => void;
}

export const FullscreenMode: React.FC<FullscreenModeProps> = ({
  track,
  progressMs,
  isPlaying,
  activeLyric,
  lyricsText,
  onToggleShuffle,
  shuffleEnabled,
  audioFeatures,
  currentMode,
  onSelectMode,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
}) => {
  const [isRepeat, setIsRepeat] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const triggerRipple = () => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const ripple = document.createElement('span');
    ripple.className = 'pierce-surface-ripple';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    surface.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 950);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectMode('expanded');
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectMode, onTogglePlay]);

  const progressPercent = Math.min(100, Math.max(0, (progressMs / track.durationMs) * 100));

  return (
    <div
      data-testid="fullscreen-mode-container"
      className="pierce-editorial-shell fixed inset-0 z-50 overflow-hidden select-none cursor-default flex"
    >
      {/* Left Vertical Dark Rail (Matching image_fa343142.png) */}
      <div className="pierce-editorial-rail w-16 h-full flex flex-col justify-between items-center py-6 z-30 shrink-0">
        <div className="flex flex-col items-center gap-1">
          <span className="pierce-wordmark font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[13px] tracking-[-0.06em]">PiErCe</span>
        </div>

        {/* Vertical Mode Icons */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => onSelectMode('compact')}
            aria-label="Modo Compacto"
            className="pierce-rail-button p-1.5 transition-colors cursor-pointer"
            title="01. Compacto"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('disc')}
            aria-label="Modo Disco"
            className="pierce-rail-button p-1.5 transition-colors cursor-pointer"
            title="02. Disco"
          >
            <Disc3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('expanded')}
            aria-label="Modo Expandido"
            className="pierce-rail-button p-1.5 transition-colors cursor-pointer"
            title="03. Expandido"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('fullscreen')}
            aria-label="Modo Fullscreen"
            className="pierce-rail-button pierce-rail-button-active p-1.5 transition-colors cursor-pointer font-bold"
            title="04. Fullscreen"
          >
            <Monitor className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('zen')}
            aria-label="Modo Zen"
            className="pierce-rail-button p-1.5 transition-colors cursor-pointer"
            title="05. Zen"
          >
            <Wind className="w-4 h-4" />
          </button>
        </div>

        <div className="pierce-version text-[9px] font-mono">
          v0.1
        </div>
      </div>

      {/* Main Full-Bleed Audiovisual Composition */}
      <div ref={surfaceRef} className="pierce-fullscreen-surface pierce-editorial-canvas flex-1 relative h-full overflow-hidden flex flex-col justify-between">
        <PierceAsciiField />
        {/* Top-Right: ESC Exit Button */}
        <div className="pierce-topbar relative z-30 p-6 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectMode('expanded')}
            aria-label="Sair da tela cheia"
            className="pierce-exit-button flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
          >
            <span>ESC</span>
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>

{lyricsText && (<div className="pierce-lyrics-layout absolute z-20 left-[75%] -translate-x-1/2 top-[19%] md:top-[21%] w-[min(38vw,560px)] max-h-[58vh] overflow-y-auto px-1 pierce-lyrics-scroll"><p className="pierce-lyrics-copy font-['Plus_Jakarta_Sans',sans-serif] text-lg md:text-2xl lg:text-[clamp(1.5rem,2.5vw,2.7rem)] font-medium leading-[1.28] tracking-[-0.035em] whitespace-pre-line [text-align:justify] [text-align-last:left]">{lyricsText}</p></div>)}
        {/* Active Kinetic Lyric Floating in Negative Space */}
        {!lyricsText && activeLyric && (
          <div className="pierce-lyrics-layout pierce-active-lyric relative z-20 ml-auto mr-[7.5vw] my-auto w-[min(38vw,560px)]">
            <div className="pierce-lyric-timestamp text-[10px] tracking-[0.16em] uppercase mb-3">
              {formatTime(activeLyric.startMs)}
            </div>
            <h1 className="pierce-lyrics-copy font-['Plus_Jakarta_Sans',sans-serif] text-3xl md:text-5xl font-medium tracking-tight leading-[1.18] [text-align:justify]">
              {activeLyric.text}
            </h1>
          </div>
        )}

        {/* Bottom Bar: Title, Artist, Scrubber on Left / Controls on Right (Exact Match to Mockup) */}
        <div className="pierce-player-bar relative z-30 p-8 md:px-14 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10">
          {/* Left: Song details + Scrub bar */}
          <div className="max-w-md w-full">
            <h2 className="pierce-track-title font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-normal tracking-tight">
              {track.title}
            </h2>
            <p className="pierce-track-artist font-['Plus_Jakarta_Sans',sans-serif] text-sm mt-0.5">
              {track.artist}
            </p>

            {/* Scrubber */}
            <div className="space-y-1 mt-3">
              <div
                role="slider"
                aria-label="Posição da música na tela cheia"
                aria-valuemin={0}
                aria-valuemax={track.durationMs}
                aria-valuenow={progressMs}
                tabIndex={0}
                onClick={(e) => {
                  triggerRipple();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  onSeek(ratio * track.durationMs);
                }}
                className="pierce-scrubber relative h-1 w-full rounded-full cursor-pointer group"
              >
                <div
                  className="pierce-scrubber-progress absolute left-0 top-0 bottom-0 rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="pierce-timecode text-[11px] font-mono tabular-nums">
                {formatTime(progressMs)} / {formatTime(track.durationMs)}
              </div>
            </div>
          </div>

          {/* Right: Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { triggerRipple(); onToggleShuffle(); }}
              aria-label="Modo aleatório"
              className={`p-1 transition-colors cursor-pointer ${shuffleEnabled ? 'pierce-control-active' : 'pierce-control-idle'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => { triggerRipple(); onPrevious(); }}
              aria-label="Faixa anterior"
              className="pierce-control-button p-1 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-white" />
            </button>

            <button
              type="button"
              onClick={() => { triggerRipple(); onTogglePlay(); }}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="pierce-play-button w-11 h-11 rounded-full transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => { triggerRipple(); onNext(); }}
              aria-label="Próxima faixa"
              className="p-1 text-white hover:text-white/80 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-white" />
            </button>

            <button
              type="button"
              onClick={() => { triggerRipple(); setIsRepeat(!isRepeat); }}
              aria-label="Repetir faixa"
              className={`p-1 transition-colors cursor-pointer ${
                isRepeat ? 'pierce-control-active' : 'pierce-control-idle'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
