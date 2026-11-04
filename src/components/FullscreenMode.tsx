import React, { useState, useEffect } from 'react';
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
  audioFeatures,
  currentMode,
  onSelectMode,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
}) => {
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

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
      className="fixed inset-0 z-50 bg-[#16171a] text-white overflow-hidden select-none cursor-default flex"
    >
      {/* Left Vertical Dark Rail (Matching image_fa343142.png) */}
      <div className="w-16 h-full bg-[#121316] border-r border-white/10 flex flex-col justify-between items-center py-6 z-30 shrink-0">
        <div className="flex flex-col items-center gap-1">
          <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm tracking-tight text-white">
            SELVA®
          </span>
        </div>

        {/* Vertical Mode Icons */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => onSelectMode('compact')}
            aria-label="Modo Compacto"
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="01. Compacto"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('disc')}
            aria-label="Modo Disco"
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="02. Disco"
          >
            <Disc3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('expanded')}
            aria-label="Modo Expandido"
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="03. Expandido"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('fullscreen')}
            aria-label="Modo Fullscreen"
            className="p-1.5 text-white transition-colors cursor-pointer font-bold"
            title="04. Fullscreen"
          >
            <Monitor className="w-4 h-4 text-[#002aff]" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('zen')}
            aria-label="Modo Zen"
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="05. Zen"
          >
            <Wind className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[9px] font-mono text-white/30">
          v0.1
        </div>
      </div>

      {/* Main Full-Bleed Audiovisual Composition */}
      <div className="flex-1 relative h-full overflow-hidden flex flex-col justify-between">
        {/* Background Cinema Still: Person looking up at clouds */}
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/tame_impala_person_sky_1793799892976.jpg"
            alt="Person Looking Up at Clouds"
            className="w-full h-full object-cover filter contrast-125 brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />
        </div>

        {/* Top-Left Cobalt Blue Halftone Dither Pixel Art */}
        <div className="absolute top-6 left-6 w-52 h-52 pointer-events-none opacity-85 z-20">
          <img
            src="/public/assets/aistudio/image_681cb620.png"
            alt=""
            className="w-full h-full object-contain mix-blend-screen filter contrast-200 brightness-110"
          />
        </div>

        {/* Center-Right: Electric Cobalt Blue 4-Point Sparkle Star Flare (image_fa343142.png) */}
        <div className="absolute top-1/4 right-1/4 pointer-events-none z-20">
          <svg className="w-40 h-40 filter drop-shadow-[0_0_20px_#002aff]" viewBox="0 0 100 100" fill="#002aff">
            <path d="M50 0 L52 46 L100 50 L52 54 L50 100 L48 54 L0 50 L48 46 Z" />
          </svg>
        </div>

        {/* Top-Right: ESC Exit Button */}
        <div className="relative z-30 p-6 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectMode('expanded')}
            aria-label="Sair da tela cheia"
            className="flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 backdrop-blur-md text-xs font-mono transition-all cursor-pointer shadow-md"
          >
            <span>ESC</span>
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Kinetic Lyric Floating in Negative Space */}
        {activeLyric && (
          <div className="relative z-20 px-8 md:px-14 my-auto max-w-3xl">
            <div className="text-xs font-mono text-[#002aff] tracking-widest uppercase mb-1 font-semibold">
              REC SYNC // {formatTime(activeLyric.startMs)}
            </div>
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl md:text-5xl font-medium tracking-tight text-white leading-tight drop-shadow-lg">
              {activeLyric.text}
            </h1>
          </div>
        )}

        {/* Bottom Bar: Title, Artist, Scrubber on Left / Controls on Right (Exact Match to Mockup) */}
        <div className="relative z-30 p-8 md:px-14 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10">
          {/* Left: Song details + Scrub bar */}
          <div className="max-w-md w-full">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-normal text-white tracking-tight">
              {track.title}
            </h2>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-sm text-white/60 mt-0.5">
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
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  onSeek(ratio * track.durationMs);
                }}
                className="relative h-1 w-full bg-white/20 rounded-full cursor-pointer group"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="text-[11px] font-mono text-white/50 tabular-nums">
                {formatTime(progressMs)} / {formatTime(track.durationMs)}
              </div>
            </div>
          </div>

          {/* Right: Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsShuffle(!isShuffle)}
              aria-label="Modo aleatório"
              className={`p-1 transition-colors cursor-pointer ${
                isShuffle ? 'text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Faixa anterior"
              className="p-1 text-white hover:text-white/80 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-white" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="w-11 h-11 rounded-full bg-white text-black hover:bg-white/90 transition-transform active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Próxima faixa"
              className="p-1 text-white hover:text-white/80 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-white" />
            </button>

            <button
              type="button"
              onClick={() => setIsRepeat(!isRepeat)}
              aria-label="Repetir faixa"
              className={`p-1 transition-colors cursor-pointer ${
                isRepeat ? 'text-white' : 'text-white/40 hover:text-white'
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
