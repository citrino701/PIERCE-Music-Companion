import React, { useState, useEffect, useRef, useCallback } from 'react';
import cinematicBackdrop from './assets/images/tame_impala_person_sky_1793799892976.jpg';
import { ViewMode, TrackData, VisualSettings } from './types';
import { TRACK_CATALOG } from './data/tracks';
import { PlaybackClock } from './services/playback/PlaybackClock';
import {
  findActiveLyricIndex,
  findActiveChapterIndex,
  computeSimulatedAudioFeatures,
} from './services/playbackEngine';
import { CompactMode } from './components/CompactMode';
import { DiscMode } from './components/DiscMode';
import { ExpandedMode } from './components/ExpandedMode';
import { FullscreenMode } from './components/FullscreenMode';
import { ZenMode } from './components/ZenMode';
import { LayoutGrid, Disc3, Square, Monitor, Wind, Columns3 } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<ViewMode>('expanded');
  const [isBoardView, setIsBoardView] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<TrackData>(TRACK_CATALOG[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progressMs, setProgressMs] = useState<number>(102000); // 1:42 (matching user mockup)
  const [volume, setVolume] = useState<number>(0.8);
  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    filmGrain: true,
    scanlines: true,
    asciiOverlay: false,
    kineticLyrics: true,
    filmBurns: true,
    intensity: 0.85,
  });

  // Demo playback is driven by the same monotonic clock planned for real providers.
  const playbackClockRef = useRef<PlaybackClock | null>(null);
  if (!playbackClockRef.current) {
    const now = performance.now();
    playbackClockRef.current = new PlaybackClock();
    playbackClockRef.current.synchronize({
      trackId: currentTrack.id,
      positionMs: 102000,
      durationMs: currentTrack.durationMs,
      isPlaying: true,
      receivedAtMonotonicMs: now,
    });
  }
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      const nextPosition = playbackClockRef.current!.getPosition(now);
      if (nextPosition >= currentTrack.durationMs) {
        // Preserve the prototype's repeat behavior without letting the clock drift.
        playbackClockRef.current!.seek(0, now);
        setProgressMs(0);
      } else {
        setProgressMs(nextPosition);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentTrack.durationMs]);

  // Derived state
  const activeLyricIndex = findActiveLyricIndex(currentTrack.lyrics, progressMs);
  const activeLyric = currentTrack.lyrics[activeLyricIndex];
  const activeChapterIndex = findActiveChapterIndex(currentTrack.chapters, progressMs);
  const activeChapter = currentTrack.chapters[activeChapterIndex];
  const audioFeatures = computeSimulatedAudioFeatures(progressMs, currentTrack.bpm, isPlaying);

  // Playback control handlers
  const handleTogglePlay = useCallback(() => {
    const now = performance.now();
    if (isPlaying) playbackClockRef.current!.pause(now);
    else playbackClockRef.current!.play(now);
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((newMs: number) => {
    const now = performance.now();
    const position = Math.max(0, Math.min(currentTrack.durationMs, newMs));
    playbackClockRef.current!.seek(position, now);
    setProgressMs(position);
  }, [currentTrack.durationMs]);

  const handleSelectTrack = useCallback((track: TrackData) => {
    const now = performance.now();
    playbackClockRef.current!.synchronize({
      trackId: track.id,
      positionMs: 0,
      durationMs: track.durationMs,
      isPlaying,
      receivedAtMonotonicMs: now,
    });
    setCurrentTrack(track);
    setProgressMs(0);
  }, [isPlaying]);

  const handlePreviousTrack = useCallback(() => {
    const currentIndex = TRACK_CATALOG.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + TRACK_CATALOG.length) % TRACK_CATALOG.length;
    handleSelectTrack(TRACK_CATALOG[prevIndex]);
  }, [currentTrack.id, handleSelectTrack]);

  const handleNextTrack = useCallback(() => {
    const currentIndex = TRACK_CATALOG.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % TRACK_CATALOG.length;
    handleSelectTrack(TRACK_CATALOG[nextIndex]);
  }, [currentTrack.id, handleSelectTrack]);

  const handleToggleMute = useCallback(() => {
    setVolume((prev) => (prev > 0 ? 0 : 0.8));
  }, []);

  const handleUpdateVisualSettings = useCallback((updates: Partial<VisualSettings>) => {
    setVisualSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === '0') setIsBoardView((prev) => !prev);
      if (e.key === '1') {
        setIsBoardView(false);
        setCurrentMode('compact');
      }
      if (e.key === '2') {
        setIsBoardView(false);
        setCurrentMode('disc');
      }
      if (e.key === '3') {
        setIsBoardView(false);
        setCurrentMode('expanded');
      }
      if (e.key === '4') {
        setIsBoardView(false);
        setCurrentMode('fullscreen');
      }
      if (e.key === '5') {
        setIsBoardView(false);
        setCurrentMode('zen');
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(progressMs + 5000);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(progressMs - 5000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSeek, progressMs]);

  const isImmersive = !isBoardView && (currentMode === 'fullscreen' || currentMode === 'zen');

  return (
    <main className="min-h-screen w-full concrete-canvas text-[#121114] flex flex-col justify-between relative overflow-x-hidden selection:bg-[#002aff] selection:text-white">
      {/* BACKGROUND GENERATIVE ARTIFACTS & RETRO-GRAPHIC ACCENTS (Matching image_fa343142.png) */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
        {/* Left Edge Halftone / Dither Clusters */}
        <div className="absolute top-1/4 -left-2 w-32 h-64 opacity-25">
          <img
            src="/assets/aistudio/image_681cb620.png"
            alt=""
            className="w-full h-full object-cover filter contrast-200"
          />
        </div>

        {/* Right Edge Halftone / Dither Clusters */}
        <div className="absolute bottom-1/4 -right-2 w-36 h-72 opacity-25">
          <img
            src="/assets/aistudio/image_681cb620.png"
            alt=""
            className="w-full h-full object-cover filter contrast-200"
          />
        </div>

        {/* Faint Generative Compass/Circle on Right Margin */}
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full border border-black/10 pointer-events-none -translate-y-1/2" />
        <div className="absolute top-1/2 -right-40 w-120 h-120 rounded-full border border-black/5 pointer-events-none -translate-y-1/2" />

        {/* Subtle Horizontal Metric Guideline */}
        <div className="absolute top-1/3 left-0 right-0 h-px bg-black/5" />
      </div>

      {/* GLOBAL TOP HEADER (Matching image_fa343142.png) */}
      {!isImmersive && (
        <header className="relative z-30 pt-6 px-8 md:px-12 flex items-center justify-between">
          {/* Top-Left: PIERCE + Hairline rule */}
          <div className="flex items-center gap-4">
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl tracking-tight text-black">
              PIERCE
            </span>
            <div className="h-px bg-black/25 w-20 sm:w-32 hidden sm:block" />
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#EAE7E1]/80 backdrop-blur-md px-2 py-1 rounded-full border border-black/10 shadow-xs text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setIsBoardView(true);
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                isBoardView ? 'bg-black text-white font-bold' : 'text-black/60 hover:text-black'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">00. Visão Geral</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBoardView(false);
                setCurrentMode('compact');
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !isBoardView && currentMode === 'compact'
                  ? 'bg-black text-white font-bold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>01. Compacto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBoardView(false);
                setCurrentMode('disc');
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !isBoardView && currentMode === 'disc'
                  ? 'bg-black text-white font-bold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>02. Disco</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBoardView(false);
                setCurrentMode('expanded');
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !isBoardView && currentMode === 'expanded'
                  ? 'bg-black text-white font-bold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>03. Expandido</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBoardView(false);
                setCurrentMode('fullscreen');
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !isBoardView && currentMode === 'fullscreen'
                  ? 'bg-black text-white font-bold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>04. Fullscreen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBoardView(false);
                setCurrentMode('zen');
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !isBoardView && currentMode === 'zen'
                  ? 'bg-black text-white font-bold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>05. Zen</span>
            </button>
          </div>

          {/* Top-Right: MUSIC / VISUAL / YOU + crosshair */}
          <div className="flex items-center gap-3 text-[11px] font-mono tracking-widest uppercase text-black/70">
            <span className="hidden sm:inline">MUSIC / VISUAL / YOU</span>
            <span className="text-sm font-light text-black/80">+</span>
          </div>
        </header>
      )}

      {/* CENTRAL VIEWPORT */}
      <div className="flex-1 flex items-center justify-center relative z-20 py-4 px-4 sm:px-8">
        {/* 1. BOARD OVERVIEW: all five official PIERCE modes */}
        {isBoardView ? (
          <div className="w-full max-w-7xl mx-auto my-auto py-6 space-y-12">
            {/* Top Row: 01. Compacto (Left) & 02. Disco (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* 01. Compacto */}
              <div className="lg:col-span-6 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-black/70 font-medium">01. Compacto</span>
                  <div className="h-px bg-black/20 w-16" />
                </div>
                <div className="w-full">
                  <CompactMode
                    track={currentTrack}
                    progressMs={progressMs}
                    isPlaying={isPlaying}
                    volume={volume}
                    activeLyric={activeLyric}
                    audioFeatures={audioFeatures}
                    currentMode={currentMode}
                    onSelectMode={(m) => {
                      setIsBoardView(false);
                      setCurrentMode(m);
                    }}
                    onTogglePlay={handleTogglePlay}
                    onSeek={handleSeek}
                    onPrevious={handlePreviousTrack}
                    onNext={handleNextTrack}
                    onToggleMute={handleToggleMute}
                  />
                </div>
              </div>

              {/* 02. Disco */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-3 self-center lg:self-start lg:pl-16">
                  <span className="text-xs font-mono text-black/70 font-medium">02. Disco</span>
                  <div className="h-px bg-black/20 w-16" />
                </div>
                <DiscMode
                  track={currentTrack}
                  progressMs={progressMs}
                  isPlaying={isPlaying}
                  volume={volume}
                  activeLyric={activeLyric}
                  audioFeatures={audioFeatures}
                  currentMode={currentMode}
                  onSelectMode={(m) => {
                    setIsBoardView(false);
                    setCurrentMode(m);
                  }}
                  onTogglePlay={handleTogglePlay}
                  onSeek={handleSeek}
                  onPrevious={handlePreviousTrack}
                  onNext={handleNextTrack}
                  onToggleMute={handleToggleMute}
                />
              </div>
            </div>

            {/* Bottom Row: 03. Expandido & 04. Fullscreen */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4">
              {/* 03. Expandido */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-black/70 font-medium">03. Expandido</span>
                  <div className="h-px bg-black/20 w-16" />
                </div>
                <div className="w-full">
                  <ExpandedMode
                    track={currentTrack}
                    tracks={TRACK_CATALOG}
                    onSelectTrack={(t) => {
                      handleSelectTrack(t);
                    }}
                    progressMs={progressMs}
                    isPlaying={isPlaying}
                    volume={volume}
                    activeLyric={activeLyric}
                    activeChapter={activeChapter}
                    audioFeatures={audioFeatures}
                    visualSettings={visualSettings}
                    onUpdateVisualSettings={handleUpdateVisualSettings}
                    currentMode={currentMode}
                    onSelectMode={(m) => {
                      setIsBoardView(false);
                      setCurrentMode(m);
                    }}
                    onTogglePlay={handleTogglePlay}
                    onSeek={handleSeek}
                    onPrevious={handlePreviousTrack}
                    onNext={handleNextTrack}
                    onToggleMute={handleToggleMute}
                  />
                </div>
              </div>

              {/* 04. Fullscreen preview card */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-black/70 font-medium">04. Fullscreen</span>
                  <div className="h-px bg-black/20 w-16" />
                </div>
                <div
                  onClick={() => {
                    setIsBoardView(false);
                    setCurrentMode('fullscreen');
                  }}
                  className="relative w-full h-[360px] bg-[#16171a] rounded-2xl overflow-hidden border border-black/15 shadow-2xl shadow-black/20 cursor-pointer group"
                >
                  {/* Embedded mini Fullscreen preview */}
                  <img
                    src={cinematicBackdrop}
                    alt=""
                    className="w-full h-full object-cover filter contrast-125 brightness-75 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

                  {/* Left Rail */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#121316]/90 border-r border-white/10 flex flex-col justify-between items-center py-4">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xs text-white">
                      PIERCE
                    </span>
                    <div className="flex flex-col gap-2">
                      <LayoutGrid className="w-3.5 h-3.5 text-white/50" />
                      <Disc3 className="w-3.5 h-3.5 text-white/50" />
                      <Square className="w-3.5 h-3.5 text-white/50" />
                      <Monitor className="w-3.5 h-3.5 text-[#002aff]" />
                    </div>
                    <div className="w-1 h-1 bg-white/20" />
                  </div>

                  {/* Top-Left Cobalt Dither */}
                  <div className="absolute top-4 left-16 w-24 h-24 opacity-80 pointer-events-none">
                    <img
                      src="/assets/aistudio/image_681cb620.png"
                      alt=""
                      className="w-full h-full object-contain filter contrast-200"
                    />
                  </div>

                  {/* 4-point star lens flare */}
                  <div className="absolute top-1/4 right-1/4 pointer-events-none">
                    <svg className="w-24 h-24 filter drop-shadow-[0_0_12px_#002aff]" viewBox="0 0 100 100" fill="#002aff">
                      <path d="M50 0 L52 46 L100 50 L52 54 L50 100 L48 54 L0 50 L48 46 Z" />
                    </svg>
                  </div>

                  {/* Bottom details */}
                  <div className="absolute bottom-4 left-16 right-4 flex items-end justify-between">
                    <div>
                      <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-base text-white font-medium">
                        {currentTrack.title}
                      </h4>
                      <p className="font-['Plus_Jakarta_Sans',sans-serif] text-xs text-white/60">
                        {currentTrack.artist}
                      </p>
                      <div className="w-48 h-1 bg-white/20 rounded-full mt-2">
                        <div
                          className="h-full bg-white rounded-full"
                          style={{ width: `${(progressMs / currentTrack.durationMs) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-black/80 rounded-full text-[11px] font-mono text-white border border-white/20 group-hover:bg-[#002aff] transition-colors">
                      CLIQUE PARA EXPANDIR
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 05. Zen preview */}
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono text-black/70 font-medium">05. Zen</span>
                <div className="h-px bg-black/20 w-16" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBoardView(false);
                  setCurrentMode('zen');
                }}
                className="relative w-full min-h-[190px] overflow-hidden rounded-2xl border border-black/10 bg-[#f7f5f0] p-8 text-left shadow-lg transition-transform hover:-translate-y-1"
              >
                <div
                  className="absolute -left-10 -top-24 h-72 w-72 rounded-full blur-[70px] opacity-35"
                  style={{ backgroundColor: currentTrack.accentColor }}
                />
                <div
                  className="absolute -right-8 -bottom-32 h-80 w-80 rounded-full blur-[80px] opacity-25"
                  style={{ backgroundColor: currentTrack.secondaryColor }}
                />
                <div className="relative z-10 flex min-h-[125px] flex-col justify-between">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-black/45">PIERCE / 05</span>
                  <div>
                    <p className="max-w-3xl font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-medium tracking-tight text-black sm:text-3xl">
                      {activeLyric?.text || 'O silêncio antes do compasso.'}
                    </p>
                    <p className="mt-3 text-xs font-mono text-black/45">ZEN EXPERIENCE · ABRIR MODO</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* 2. FOCUSED ACTIVE MODE */
          <div className="w-full flex flex-col items-center">
            {/* Mode section indicator on desktop */}
            {currentMode !== 'fullscreen' && currentMode !== 'zen' && (
              <div className="flex items-center gap-2 mb-4 self-center max-w-5xl w-full px-2">
                <span className="text-xs font-mono text-black/70 font-medium">
                  {currentMode === 'compact' && '01. Compacto'}
                  {currentMode === 'disc' && '02. Disco'}
                  {currentMode === 'expanded' && '03. Expandido'}
                </span>
                <div className="h-px bg-black/20 w-24" />
              </div>
            )}

            {currentMode === 'compact' && (
              <CompactMode
                track={currentTrack}
                progressMs={progressMs}
                isPlaying={isPlaying}
                volume={volume}
                activeLyric={activeLyric}
                audioFeatures={audioFeatures}
                currentMode={currentMode}
                onSelectMode={setCurrentMode}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onPrevious={handlePreviousTrack}
                onNext={handleNextTrack}
                onToggleMute={handleToggleMute}
              />
            )}

            {currentMode === 'disc' && (
              <DiscMode
                track={currentTrack}
                progressMs={progressMs}
                isPlaying={isPlaying}
                volume={volume}
                activeLyric={activeLyric}
                audioFeatures={audioFeatures}
                currentMode={currentMode}
                onSelectMode={setCurrentMode}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onPrevious={handlePreviousTrack}
                onNext={handleNextTrack}
                onToggleMute={handleToggleMute}
              />
            )}

            {currentMode === 'expanded' && (
              <ExpandedMode
                track={currentTrack}
                tracks={TRACK_CATALOG}
                onSelectTrack={(t) => {
                  handleSelectTrack(t);
                }}
                progressMs={progressMs}
                isPlaying={isPlaying}
                volume={volume}
                activeLyric={activeLyric}
                activeChapter={activeChapter}
                audioFeatures={audioFeatures}
                visualSettings={visualSettings}
                onUpdateVisualSettings={handleUpdateVisualSettings}
                currentMode={currentMode}
                onSelectMode={setCurrentMode}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onPrevious={handlePreviousTrack}
                onNext={handleNextTrack}
                onToggleMute={handleToggleMute}
              />
            )}

            {currentMode === 'fullscreen' && (
              <FullscreenMode
                track={currentTrack}
                progressMs={progressMs}
                isPlaying={isPlaying}
                volume={volume}
                activeLyric={activeLyric}
                activeChapter={activeChapter}
                audioFeatures={audioFeatures}
                visualSettings={visualSettings}
                onUpdateVisualSettings={handleUpdateVisualSettings}
                currentMode={currentMode}
                onSelectMode={setCurrentMode}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onPrevious={handlePreviousTrack}
                onNext={handleNextTrack}
                onToggleMute={handleToggleMute}
              />
            )}

            {currentMode === 'zen' && (
              <ZenMode
                track={currentTrack}
                progressMs={progressMs}
                isPlaying={isPlaying}
                activeLyric={activeLyric}
                activeChapter={activeChapter}
                audioFeatures={audioFeatures}
                currentMode={currentMode}
                onSelectMode={setCurrentMode}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onPrevious={handlePreviousTrack}
                onNext={handleNextTrack}
              />
            )}
          </div>
        )}
      </div>

      {/* GLOBAL BOTTOM FOOTER (Matching image_fa343142.png) */}
      {!isImmersive && (
        <footer className="relative z-30 pb-6 px-8 md:px-12 flex items-center justify-between text-[11px] font-mono text-black/70">
          {/* Bottom-Left: Audio stepped bar icon + A VISUAL MUSIC COMPANION */}
          <div className="flex items-center gap-3 flex-1 mr-6">
            <div className="flex items-end gap-0.5 h-3">
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
            <span className="tracking-[0.18em] uppercase font-medium">A VISUAL MUSIC COMPANION</span>
            <div className="h-px bg-black/25 flex-1" />
          </div>

          {/* Bottom-Right: v0.1 */}
          <div className="text-black/60 font-mono tracking-wider">
            v0.1
          </div>
        </footer>
      )}
    </main>
  );
}
