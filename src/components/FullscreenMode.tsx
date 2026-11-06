import React, { useState, useEffect, useRef } from 'react';
import { PierceAsciiField } from './PierceAsciiField';
import { PierceAsciiFrame } from './PierceAsciiFrame';
import { PierceAsciiStar } from './PierceAsciiStar';
import { PierceWaveProgress } from './PierceWaveProgress';
import { TrackStickers } from './TrackStickers';
import { PixelPlayButton } from './PixelPlayButton';
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
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const container=lyricsScrollRef.current; const active=container?.querySelector<HTMLElement>('[data-lyric-active="true"]'); if(!container||!active)return; container.scrollTo({top:Math.max(0,active.offsetTop-container.clientHeight/3),behavior:'smooth'}); },[activeLyric?.id]);
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
      className="pierce-editorial-shell fixed inset-y-0 left-16 z-50 w-[calc(100%-4rem)] overflow-hidden select-none cursor-default flex"
    >
      {/* Main Full-Bleed Audiovisual Composition */}
      <div ref={surfaceRef} className="pierce-fullscreen-surface pierce-editorial-canvas flex-1 relative h-full overflow-hidden flex flex-col justify-between">
        <span className="pierce-corner-star" aria-hidden="true">✦</span>
        <PierceAsciiFrame />
        <PierceAsciiStar />
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

{lyricsText && (<div ref={lyricsScrollRef} className="pierce-lyrics-layout absolute z-20 left-[75%] -translate-x-1/2 top-[19%] md:top-[21%] w-[min(38vw,560px)] max-h-[58vh] overflow-y-auto px-1 pierce-lyrics-scroll"><p className="pierce-lyrics-copy font-['Plus_Jakarta_Sans',sans-serif] text-lg md:text-2xl lg:text-[clamp(1.5rem,2.5vw,2.7rem)] font-medium leading-[1.28] tracking-[-0.035em] whitespace-pre-line [text-align:justify] [text-align-last:left]">{track.lyrics.length > 0 ? track.lyrics.map((line) => (<span key={line.id} data-lyric-active={line.id === activeLyric?.id} className="block opacity-35 transition-opacity duration-500 data-[lyric-active=true]:opacity-100">{line.text}</span>)) : lyricsText}</p></div>)}
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
        <div className="pierce-player-bar relative z-30 flex flex-row items-center justify-between gap-4 px-6 pb-10 md:px-14">
          {/* Left: Song details + Scrub bar */}
          <div className="max-w-md w-full">
            <h2 className="pierce-track-title font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-normal tracking-tight">
              {track.title}
            </h2>
            <p className="pierce-track-artist font-['Plus_Jakarta_Sans',sans-serif] text-sm mt-0.5">
              {track.artist}
            </p>
            <TrackStickers track={track} />

            <div className="mt-3">
              <PierceWaveProgress progressMs={progressMs} durationMs={track.durationMs} isPlaying={isPlaying} onSeek={onSeek} />
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
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <PixelPlayButton isPlaying={isPlaying} progress={progressPercent / 100} onClick={onTogglePlay} />

            <button
              type="button"
              onClick={() => { triggerRipple(); onNext(); }}
              aria-label="Próxima faixa"
              className="pierce-control-button p-1 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
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
