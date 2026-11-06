import React from 'react';
import { TrackData, LyricLine, AudioFeatures, ViewMode } from '../types';
import { TrackStickers } from './TrackStickers';
import { PixelPlayButton } from './PixelPlayButton';
import { formatTime } from '../services/playbackEngine';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface DiscModeProps {
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

export const DiscMode: React.FC<DiscModeProps> = ({
  track,
  progressMs,
  isPlaying,
  currentMode,
  onSelectMode,
  onTogglePlay,
  onPrevious,
  onNext,
}) => {
  const progressRatio = Math.min(1, Math.max(0, progressMs / track.durationMs));

  return (
    <div
      data-testid="disc-mode-container"
      className="flex flex-col items-center justify-center min-h-[640px] p-4 select-none"
    >
      {/* Exact Match to User Mockup image_fa343142.png (02. Disco) */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-[#EAE7E1] text-[#121114] border border-black/15 shadow-2xl shadow-black/15 flex flex-col items-center justify-between p-6 overflow-hidden">
        {/* Subtle dot matrix texture */}
        <div className="absolute inset-0 subtle-paper opacity-35 pointer-events-none" />

        {/* Cobalt Blue Arc Tracker on Upper-Right Perimeter (as seen in image_fa343142.png) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="48%"
            fill="none"
            stroke="#002aff"
            strokeWidth="4"
            strokeDasharray="1000"
            strokeDashoffset={`${1000 - progressRatio * 320}`}
            strokeLinecap="round"
          />
        </svg>

        {/* Top: PIERCE Brand */}
        <div className="relative z-10 pt-2">
          <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm tracking-tight text-black">
            PIERCE
          </span>
        </div>

        {/* Center Circular B&W Cutout (Rotating when playing) */}
        <div
          onClick={onTogglePlay}
          role="button"
          tabIndex={0}
          aria-label="Tocar ou pausar no disco"
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-black/20 shadow-md cursor-pointer flex items-center justify-center"
        >
          <img
            src={track.coverImage}
            alt={track.title}
            className={`w-full h-full object-cover filter grayscale contrast-125 brightness-95 ${
              isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
            }`}
          />
          {/* Center spindle dot */}
          <div className="absolute w-4 h-4 rounded-full bg-[#EAE7E1] border-2 border-black/30 z-10" />
        </div>

        {/* Lower Section: Title, Artist, Controls */}
        <div className="relative z-10 flex flex-col items-center text-center pb-1">
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm font-medium text-black leading-tight max-w-[200px] truncate">
            {track.title}
          </h3>
          <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] text-[#555458] mt-0.5 truncate">
            {track.artist}
          </p>
          <TrackStickers track={track} />

          {/* Controls Row */}
          <div className="flex items-center gap-4 mt-2.5">
            <button
              type="button"
              onClick={onPrevious}
              aria-label="Faixa anterior"
              className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5 fill-black" />
            </button>

            <PixelPlayButton isPlaying={isPlaying} progress={progressRatio} onClick={onTogglePlay} />

            <button
              type="button"
              onClick={onNext}
              aria-label="Próxima faixa"
              className="p-1 text-black hover:text-neutral-700 transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5 fill-black" />
            </button>
          </div>
        </div>



        {/* Bottom-Left Dither Accent (peeking out) */}
        <div className="absolute -bottom-2 -left-2 w-10 h-10 pointer-events-none opacity-60 overflow-hidden">
          <img
            src="/assets/aistudio/image_681cb620.png"
            alt=""
            className="w-full h-full object-cover filter contrast-200"
          />
        </div>
      </div>

      <NavigationRail
        currentMode={currentMode}
        onSelectMode={onSelectMode}
        compactLabels={true}
        className="mt-5"
        theme="light"
      />
    </div>
  );
};
