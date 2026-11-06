import React, { useState, useEffect, useRef } from 'react';
import { TrackData, LyricLine, NarrativeChapter, AudioFeatures, ViewMode } from '../types';
import { formatTime } from '../services/playbackEngine';
import { Play, Pause, SkipBack, SkipForward, Minimize2, Sparkles } from 'lucide-react';

interface ZenModeProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  activeChapter?: NarrativeChapter;
  audioFeatures: AudioFeatures;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const ZenMode: React.FC<ZenModeProps> = ({
  track,
  progressMs,
  isPlaying,
  activeLyric,
  activeChapter,
  audioFeatures,
  currentMode,
  onSelectMode,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
}) => {
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    const handleMouseMove = () => resetHideTimer();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectMode('expanded');
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      }
      resetHideTimer();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    resetHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [onSelectMode, onTogglePlay]);

  // Find previous, current, and upcoming lyric lines for smooth typographic staging
  const currentIndex = track.lyrics.findIndex((l) => l.id === activeLyric?.id);
  const prevLyric = currentIndex > 0 ? track.lyrics[currentIndex - 1] : null;
  const nextLyric = currentIndex >= 0 && currentIndex < track.lyrics.length - 1 ? track.lyrics[currentIndex + 1] : null;

  // Adaptive palette blobs based on track colors and audio energy
  const primaryOrb = track.accentColor;
  const secondaryOrb = track.secondaryColor || '#e89f55';

  return (
    <div
      data-testid="zen-mode-container"
      className="fixed inset-y-0 left-16 z-50 w-[calc(100%-4rem)] bg-[#f7f5f0] text-[#161514] overflow-hidden select-none cursor-default flex flex-col justify-between"
      onMouseMove={resetHideTimer}
    >
      {/* ADAPTIVE ORGANIC COLOR GRADIENT BACKGROUND (Inspired by image_1bd20fe3 reference) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft paper texture */}
        <div className="absolute inset-0 subtle-paper opacity-30 mix-blend-multiply" />

        {/* Floating chromatic diffused orbs with slow organic oscillation */}
        <div
          className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full blur-[110px] opacity-35 transition-all duration-1000 ease-out"
          style={{
            backgroundColor: primaryOrb,
            transform: `translate(${Math.sin(progressMs / 3000) * 40}px, ${Math.cos(progressMs / 2500) * 30}px) scale(${1 + audioFeatures.energy * 0.15})`,
          }}
        />

        <div
          className="absolute top-1/3 -right-24 w-[550px] h-[550px] rounded-full blur-[120px] opacity-25 transition-all duration-1000 ease-out"
          style={{
            backgroundColor: secondaryOrb,
            transform: `translate(${Math.cos(progressMs / 3500) * -50}px, ${Math.sin(progressMs / 2800) * 40}px)`,
          }}
        />

        <div
          className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] rounded-full blur-[130px] opacity-20 transition-all duration-1000 ease-out"
          style={{
            backgroundColor: '#4a7298',
            transform: `translate(${Math.sin(progressMs / 4000) * 35}px, ${Math.cos(progressMs / 3200) * -40}px)`,
          }}
        />
      </div>

      {/* Top Bar: Quiet Metadata & Exit Button */}
      <header
        className={`relative z-20 flex items-center justify-between px-8 pt-8 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-20 hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xs tracking-widest uppercase text-[#141416]/70">
            PIERCE // 05 ZEN
          </span>
          <span className="text-[#141416]/30">·</span>
          <span className="text-xs font-mono text-[#141416]/60">
            {track.title}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelectMode('expanded')}
          aria-label="Sair do modo Zen"
          className="flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-black/80 rounded-full border border-black/10 backdrop-blur-sm text-xs font-mono transition-all cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>SAIR (ESC)</span>
        </button>
      </header>

      {/* Central Typographic Stage: Pure Kinetic Poetry */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 max-w-5xl mx-auto text-center w-full">
        {/* Previous Lyric Line (Faded Ghost in Negative Space) */}
        <div className="h-10 mb-6 flex items-center justify-center">
          {prevLyric && (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-base md:text-xl text-[#141416]/25 transition-all duration-700 font-normal line-clamp-1 italic">
              {prevLyric.text}
            </p>
          )}
        </div>

        {/* Active Lyric Line: Minimalist, Sculptural, Floating Typography */}
        <div className="my-4 max-w-3xl">
          {/* Subtle timecode tick */}
          <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#141416]/40 uppercase tracking-widest mb-3">
            <span>{formatTime(activeLyric?.startMs || progressMs)}</span>
            <span>—</span>
            <span className="text-[#002aff] font-semibold">VERBO ATIVO</span>
          </div>

          <h1
            className={`font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-3xl sm:text-5xl md:text-6xl text-[#111113] leading-[1.18] tracking-tight transition-all duration-500 transform ${
              isPlaying ? 'scale-100' : 'scale-[0.99] opacity-90'
            }`}
          >
            {activeLyric?.text || 'O silêncio antes do compasso.'}
          </h1>

          {/* Subtext / Translation in Subtle Monospace */}
          {activeLyric?.subtext && (
            <p className="mt-4 font-mono text-sm md:text-base text-[#141416]/50 italic tracking-wide max-w-xl mx-auto transition-opacity duration-300">
              {activeLyric.subtext}
            </p>
          )}
        </div>

        {/* Upcoming Lyric Line (Anticipation in Lower Negative Space) */}
        <div className="h-10 mt-6 flex items-center justify-center">
          {nextLyric && (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-sm md:text-lg text-[#141416]/20 transition-all duration-700 font-light line-clamp-1">
              {nextLyric.text}
            </p>
          )}
        </div>
      </main>

      {/* Floating Minimalist HUD Controls */}
      <footer
        className={`relative z-30 pb-8 px-6 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-40 hover:opacity-100 translate-y-0'
        }`}
      >
        <div className="max-w-md mx-auto bg-white/70 backdrop-blur-md border border-black/10 rounded-2xl p-3 shadow-lg shadow-black/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevious}
              aria-label="Faixa anterior"
              className="p-1.5 text-black/60 hover:text-black rounded-lg transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="p-2 bg-black text-white hover:bg-neutral-800 rounded-full transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Próxima faixa"
              className="p-1.5 text-black/60 hover:text-black rounded-lg transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-mono text-black/50">
            <span>{formatTime(progressMs)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(track.durationMs)}</span>
          </div>


        </div>
      </footer>
    </div>
  );
};
