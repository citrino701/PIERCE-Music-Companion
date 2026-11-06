import React, { useState } from 'react';
import { TrackData, LyricLine, AudioFeatures, ViewMode } from '../types';
import { NavigationRail } from './NavigationRail';
import { PierceWaveProgress } from './PierceWaveProgress';
import { TrackStickers } from './TrackStickers';
import { PixelPlayButton } from './PixelPlayButton';
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
  LayoutGrid,
} from 'lucide-react';

interface CompactModeProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  volume: number;
  activeLyric?: LyricLine;
  audioFeatures: AudioFeatures;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMute: () => void;
}

export const CompactMode: React.FC<CompactModeProps> = ({
  track,
  progressMs,
  isPlaying,
  audioFeatures,
  currentMode,
  onSelectMode,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
}) => {
  const [showModesRail, setShowModesRail] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const progressPercent = Math.min(100, Math.max(0, (progressMs / track.durationMs) * 100));

  return (
    <div className="flex items-center justify-center min-h-[580px] p-4 select-none">
      {/* Exact Match to User Mockup image_bb1bab91.png */}
      <div
        data-testid="compact-mode-container"
        className="relative w-full max-w-[530px] bg-[#EAE7E1] text-[#121114] rounded-2xl p-5 shadow-2xl shadow-black/15 border border-black/10 overflow-hidden"
      >
        {/* Window Title Bar */}
        <div className="flex items-center justify-between pb-3.5">
          <div className="flex items-center gap-1.5">
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base tracking-tight text-black">
              PIERCE
            </span>
          </div>

          <div className="flex items-center gap-3 text-black/60">
            <button
              type="button"
              aria-label="Minimizar janela"
              className="hover:text-black transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('expanded')}
              aria-label="Maximizar para modo Expandido"
              className="hover:text-black transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 stroke-[2]" />
            </button>
            <button
              type="button"
              aria-label="Fechar janela"
              className="hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex items-stretch gap-4 relative">
          {/* Left: Square Album Artwork with Crosshair and Pixel Corner */}
          <div className="relative w-32 h-32 shrink-0 bg-black rounded-xs overflow-hidden border border-black/15 shadow-xs">
            <img
              src={track.coverImage}
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter grayscale contrast-125 brightness-95"
            />
            {/* Fine Crosshair in Top-Left */}
            <div className="absolute top-2 left-2 text-white/70 text-[10px] font-mono leading-none pointer-events-none">
              +
            </div>
            {/* Geometric Pixel Mark in Bottom-Left */}
            <div className="absolute bottom-1.5 left-1.5 flex gap-0.5 pointer-events-none">
              <div className="w-1.5 h-1.5 bg-black border border-white/50" />
              <div className="w-1.5 h-1.5 bg-black border border-white/50" />
            </div>
          </div>

          {/* Center Column: Track details, scrub bar, controls */}
          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 pr-1">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[17px] font-medium text-[#111114] leading-snug tracking-tight truncate">
                {track.title}
              </h3>
              <p className="font-['Plus_Jakarta_Sans',sans-serif] text-xs text-[#555458] truncate mt-0.5">
                {track.artist}
              </p>
              <TrackStickers track={track} />
            </div>

            <PierceWaveProgress progressMs={progressMs} durationMs={track.durationMs} isPlaying={isPlaying} onSeek={onSeek} />

            {/* Playback Controls Row with Left Audio Bars */}
            <div className="flex items-center justify-between pt-1">
              {/* Left Audio Bars Visualizer Icon */}
              <div className="flex items-end gap-0.5 h-3.5 pl-0.5">
                <div
                  className="w-0.5 bg-black rounded-xs transition-all duration-75"
                  style={{ height: `${Math.max(3, audioFeatures.lowBand * 12)}px` }}
                />
                <div
                  className="w-0.5 bg-black rounded-xs transition-all duration-75"
                  style={{ height: `${Math.max(4, audioFeatures.midBand * 14)}px` }}
                />
                <div
                  className="w-0.5 bg-black rounded-xs transition-all duration-75"
                  style={{ height: `${Math.max(3, audioFeatures.highBand * 10)}px` }}
                />
              </div>

              {/* Centered Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsShuffle(!isShuffle)}
                  aria-label="Modo aleatório"
                  className={`p-1 transition-colors cursor-pointer ${
                    isShuffle ? 'text-black' : 'text-black/50 hover:text-black'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onPrevious}
                  aria-label="Faixa anterior"
                  className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer"
                >
                  <SkipBack className="w-4 h-4 fill-black" />
                </button>

                <PixelPlayButton isPlaying={isPlaying} progress={progressPercent / 100} onClick={onTogglePlay} />

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
                    isRepeat ? 'text-black' : 'text-black/50 hover:text-black'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column / Vertical Rail (Matching Mockup with Cobalt Blue Dither Texture) */}
          <div className="relative w-12 shrink-0 border-l border-black/10 pl-3 flex flex-col justify-between items-center py-1">
            {/* Top Bento Grid Mode Switch Button */}
            <button
              type="button"
              onClick={() => setShowModesRail(!showModesRail)}
              aria-label="Alternar modos de visualização"
              className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Cobalt Blue Dither Mosaic Pattern (image_681cb620.png in vivid cobalt blue) */}
            <div className="absolute top-10 right-0 w-12 h-16 pointer-events-none overflow-hidden opacity-90">
              <img
                src="/assets/aistudio/image_681cb620.png"
                alt=""
                className="w-full h-full object-cover mix-blend-multiply filter contrast-200"
                style={{
                  filter: 'contrast(300%) brightness(0.9) drop-shadow(0 0 1px #002aff)',
                }}
              />
            </div>

            {/* Bottom Expand Arrow */}
            <button
              type="button"
              onClick={() => onSelectMode('expanded')}
              aria-label="Expandir para o modo Expandido"
              className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer z-10"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Quick Mode Selector Drawer if Bento button is clicked */}
        {showModesRail && (
          <div className="absolute bottom-3 right-14 z-30 bg-[#f4f1ea] border border-black/15 rounded-xl p-1 shadow-lg">
            <NavigationRail
              currentMode={currentMode}
              onSelectMode={(m) => {
                onSelectMode(m);
                setShowModesRail(false);
              }}
              compactLabels={false}
              theme="light"
            />
          </div>
        )}
      </div>
    </div>
  );
};
