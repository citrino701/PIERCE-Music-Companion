import React, { useState } from 'react';
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
  Minus,
  Square,
  X,
  Maximize2,
  Disc3,
  Monitor,
  LayoutGrid,
  Wind,
} from 'lucide-react';

interface ExpandedModeProps {
  track: TrackData;
  tracks: TrackData[];
  onSelectTrack: (track: TrackData) => void;
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

export const ExpandedMode: React.FC<ExpandedModeProps> = ({
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
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);

  const progressPercent = Math.min(100, Math.max(0, (progressMs / track.durationMs) * 100));

  return (
    <div
      data-testid="expanded-mode-container"
      className="flex items-center justify-center p-3 sm:p-6 w-full max-w-5xl select-none"
    >
      {/* Exact Match to User Mockup image_c037af8c.png */}
      <div className="relative w-full bg-[#EAE7E1] text-[#121114] rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/15 border border-black/10 overflow-hidden">
        {/* Top Window Bar: Brand & Window Controls */}
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-2">
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl tracking-tight text-black">
              SELVA®
            </span>
          </div>

          <div className="flex items-center gap-3.5 text-black/60">
            <button
              type="button"
              onClick={() => onSelectMode('compact')}
              aria-label="Minimizar para modo Compacto"
              className="hover:text-black transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('fullscreen')}
              aria-label="Maximizar para Fullscreen"
              className="hover:text-black transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('compact')}
              aria-label="Fechar para modo Compacto"
              className="hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Main Grid: Left Artwork + Center Controls + Right Cobalt Dither Portrait & Rail */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative min-h-[300px]">
          {/* Left Column (col-span-3): B&W Film Cover Image with Left Dither Fringe */}
          <div className="md:col-span-3 flex justify-center md:justify-start relative">
            {/* Left Dither Overlay wrap */}
            <div className="absolute -left-3 top-2 bottom-2 w-8 pointer-events-none opacity-85 z-10 overflow-hidden hidden sm:block">
              <img
                src="/public/assets/aistudio/image_681cb620.png"
                alt=""
                className="w-full h-full object-cover mix-blend-multiply filter contrast-200 brightness-90"
              />
            </div>

            {/* Square B&W Analog Cover */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 bg-black rounded-xs overflow-hidden border border-black/15 shadow-sm">
              <img
                src={track.coverImage}
                alt={track.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter grayscale contrast-125 brightness-95"
              />
            </div>
          </div>

          {/* Center Column (col-span-5): Now Playing Header, Title, Scrubber, Playback Controls */}
          <div className="md:col-span-5 flex flex-col justify-between py-1 z-20">
            {/* Now Playing Header with hairline rule */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-black/60 font-medium">
                NOW PLAYING
              </span>
              <div className="h-px bg-black/15 flex-1 max-w-[120px]" />
            </div>

            {/* Song Title & Artist in Clean Swiss Grotesque */}
            <div className="mb-4">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl font-normal text-[#121114] leading-[1.12] tracking-tight">
                The Less I Know<br />The Better
              </h2>
              <p className="font-['Plus_Jakarta_Sans',sans-serif] text-sm text-[#555458] mt-1 font-normal">
                {track.artist}
              </p>
            </div>

            {/* Dynamic Synced Lyric Tooltip (Clickable toggle) */}
            {activeLyric && (
              <div
                onClick={() => setShowLyricsOverlay(!showLyricsOverlay)}
                className="text-[11px] font-mono text-black/70 mb-3 bg-black/5 px-2 py-1 rounded-xs inline-block cursor-pointer hover:bg-black/10 transition-colors truncate max-w-sm"
              >
                <span className="text-[#002aff] font-bold">REC SYNC: </span>
                <span>"{activeLyric.text}"</span>
              </div>
            )}

            {/* Progress Scrubber Bar */}
            <div className="space-y-1.5 mb-4">
              <div
                role="slider"
                aria-label="Posição da música"
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
                className="relative h-1 w-full bg-black/15 rounded-full cursor-pointer group"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[#121114] rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="text-[11px] font-mono text-[#555458] tabular-nums">
                {formatTime(progressMs)} / {formatTime(track.durationMs)}
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => setIsShuffle(!isShuffle)}
                aria-label="Modo aleatório"
                className={`p-1 transition-colors cursor-pointer ${
                  isShuffle ? 'text-black' : 'text-black/40 hover:text-black'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onPrevious}
                aria-label="Faixa anterior"
                className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4 fill-black" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                className="w-11 h-11 rounded-full bg-black text-white hover:bg-neutral-800 transition-transform active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={onNext}
                aria-label="Próxima faixa"
                className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4 fill-black" />
              </button>

              <button
                type="button"
                onClick={() => setIsRepeat(!isRepeat)}
                aria-label="Repetir faixa"
                className={`p-1 transition-colors cursor-pointer ${
                  isRepeat ? 'text-black' : 'text-black/40 hover:text-black'
                }`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column (col-span-4): Cobalt Blue Halftone Dither Face, Blue Crosshair, Four-Point Star */}
          <div className="md:col-span-4 relative h-72 flex items-center justify-end overflow-hidden">
            {/* The Electric Cobalt Blue Dither Portrait Face */}
            <div className="relative w-64 h-72 pointer-events-none opacity-95">
              <img
                src="/public/assets/aistudio/image_681cb620.png"
                alt=""
                className="w-full h-full object-contain mix-blend-multiply filter contrast-200"
                style={{
                  filter: 'contrast(300%) brightness(0.85)',
                }}
              />
            </div>

            {/* Electric Cobalt Blue Registration Grid Lines */}
            <div className="absolute top-0 bottom-0 right-14 w-px bg-[#002aff]/80 pointer-events-none" />
            <div className="absolute top-1/2 left-4 right-14 h-px bg-[#002aff]/30 pointer-events-none" />

            {/* Electric Blue 4-Point Sparkle Star */}
            <div className="absolute top-16 right-10 text-[#002aff] pointer-events-none">
              <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="#002aff">
                <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
              </svg>
            </div>

            {/* Right Vertical Mode Rail */}
            <div className="w-12 h-full border-l border-black/10 pl-3 flex flex-col justify-between items-center py-2 z-20">
              {/* Top Icons: Modes */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectMode('compact')}
                  aria-label="Modo Compacto"
                  className="p-1.5 text-black hover:text-neutral-600 transition-colors cursor-pointer"
                  title="01. Compacto"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('disc')}
                  aria-label="Modo Disco"
                  className="p-1.5 text-black/60 hover:text-black transition-colors cursor-pointer"
                  title="02. Disco"
                >
                  <Disc3 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('expanded')}
                  aria-label="Modo Expandido"
                  className="p-1.5 text-black transition-colors cursor-pointer font-bold"
                  title="03. Expandido"
                >
                  <Square className="w-4 h-4 fill-black/10" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('fullscreen')}
                  aria-label="Modo Fullscreen"
                  className="p-1.5 text-black/60 hover:text-black transition-colors cursor-pointer"
                  title="04. Fullscreen"
                >
                  <Monitor className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('zen')}
                  aria-label="Modo Zen"
                  className="p-1.5 text-black/60 hover:text-black transition-colors cursor-pointer"
                  title="05. Zen"
                >
                  <Wind className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Right Label: SELVA® / v0.1.0 / 2025 */}
              <div className="flex flex-col items-end gap-1 text-[8px] font-mono text-black/40 leading-none">
                <span>SELVA®</span>
                <span>v0.1.0</span>
                <span>/ 2025</span>
                {/* 3-pixel corner graphic */}
                <div className="flex gap-0.5 mt-1">
                  <div className="w-1 h-1 bg-[#002aff]" />
                  <div className="w-1 h-1 bg-[#002aff]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Audio Stepped Waveform Visualizer & Expand Icon */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/5">
          <div className="flex items-end gap-0.5 h-3.5 pl-0.5">
            <div
              className="w-0.5 bg-black rounded-xs transition-all duration-75"
              style={{ height: `${Math.max(3, audioFeatures.lowBand * 14)}px` }}
            />
            <div
              className="w-0.5 bg-black rounded-xs transition-all duration-75"
              style={{ height: `${Math.max(4, audioFeatures.midBand * 16)}px` }}
            />
            <div
              className="w-0.5 bg-black rounded-xs transition-all duration-75"
              style={{ height: `${Math.max(3, audioFeatures.highBand * 12)}px` }}
            />
            <div className="h-px bg-black/15 w-24 ml-2" />
          </div>

          <button
            type="button"
            onClick={() => onSelectMode('fullscreen')}
            aria-label="Expandir para tela cheia"
            className="p-1 text-black/50 hover:text-black transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
