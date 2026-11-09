import React, { useState, useEffect, useRef, useCallback } from 'react';
import cinematicBackdrop from './assets/images/tame_impala_person_sky_1793799892976.jpg';
import { ViewMode, TrackData, VisualSettings } from './types';
import { TRACK_CATALOG } from './data/tracks';
import { DemoPlaybackProvider } from './services/playback/DemoPlaybackProvider';
import {
  findActiveLyricIndex,
  findActiveChapterIndex,
  computeSimulatedAudioFeatures,
} from './services/playbackEngine';
import { CompactMode } from './components/CompactMode';
import { DiscMode } from './components/DiscMode';
import { FullscreenMode } from './components/FullscreenMode';
import { SpotifyConnectionPanel } from './components/SpotifyConnectionPanel';
import { NavigationSidebar } from './components/NavigationSidebar';
import { pauseSpotifyPlayback, resumeSpotifyPlayback, seekSpotifyPlayback, skipSpotifyTrack, setSpotifyShuffle, fetchTrackLyrics, getTrackGenres } from './services/playback/SpotifyMetadataConnector';
import type { SpotifyNowPlaying } from './services/playback/SpotifyMetadataConnector';
import { LayoutGrid, Disc3, Monitor, Columns3 } from 'lucide-react';
import { parseLrc } from './services/lyrics/lrc';
const LYRICS_OFFSET_MS = 0;

export default function App() {
  const [currentMode, setCurrentMode] = useState<ViewMode>('fullscreen');
  const [isBoardView, setIsBoardView] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<TrackData>(TRACK_CATALOG[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [spotifyControlError, setSpotifyControlError] = useState('');
  const [spotifyShuffle, setSpotifyShuffle] = useState(false);
  const spotifyErrorTimeoutRef = useRef<number | null>(null);
  const playbackCommandAtRef = useRef(0);
  const playbackCommandSequenceRef = useRef(0);
  const genreLookupTrackRef = useRef('');
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

  const handleSpotifySnapshot = useCallback((snapshot: SpotifyNowPlaying | null) => {
    setSpotifyConnected(true);
    if (typeof snapshot?.shuffle_state === 'boolean') setSpotifyShuffle(snapshot.shuffle_state);
    if (!snapshot?.item) {
      setIsPlaying(false);
      setProgressMs(0);
      return;
    }
    const item = snapshot.item;
    const visualBase = TRACK_CATALOG[0];
    const spotifyTrackId = `spotify-${item.id}`;
    setCurrentTrack((previous) => ({
      ...visualBase, id: spotifyTrackId, title: item.name,
      artist: item.artists.map((artist) => artist.name).join(', '), album: item.album.name,
      durationMs: item.duration_ms, coverImage: item.album.images?.[0]?.url ?? visualBase.coverImage,
      genres: previous.id === spotifyTrackId ? previous.genres : [],
      lyrics: previous.id === spotifyTrackId ? previous.lyrics : [], chapters: [],
    }));
    if (genreLookupTrackRef.current !== spotifyTrackId) {
      genreLookupTrackRef.current = spotifyTrackId;
      void getTrackGenres({artistIds:item.artists.map(a=>a.id),title:item.name,artist:item.artists.map(a=>a.name).join(', ')}).then(genres=>{
        setCurrentTrack(current=>current.id===spotifyTrackId?{...current,genres}:current);
      }).catch(()=>setCurrentTrack(current=>current.id===spotifyTrackId?{...current,genres:[]}:current));
    }
    setProgressMs(snapshot.progress_ms ?? 0);
    // Evita que um snapshot iniciado antes do clique reverta a resposta visual otimista.
    if (Date.now() - playbackCommandAtRef.current > 2500) setIsPlaying(snapshot.is_playing);
  }, []);

  useEffect(() => {
    if (!spotifyConnected || !currentTrack.id.startsWith('spotify-')) { setLyricsText(null); return; }
    let cancelled = false; const trackId=currentTrack.id; setLyricsText(null);
    void fetchTrackLyrics(currentTrack).then(record=>{
      if(cancelled)return;
      setLyricsText(record?.plainLyrics??record?.syncedLyrics?.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/g,'')??(record?.instrumental?'Faixa instrumental.':null));
      const lines=parseLrc(record?.syncedLyrics,currentTrack.durationMs);
      setCurrentTrack(previous=>previous.id===trackId?{...previous,lyrics:lines}:previous);
    }).catch(()=>{if(!cancelled)setLyricsText(null);});
    return()=>{cancelled=true;};
  },[spotifyConnected,currentTrack.id]);

  // The demo uses the same provider contract reserved for future integrations.
  const playbackProviderRef = useRef<DemoPlaybackProvider | null>(null);
  if (!playbackProviderRef.current) {
    playbackProviderRef.current = new DemoPlaybackProvider(currentTrack, 102000, true);
  }

  useEffect(() => {
    const provider = playbackProviderRef.current!;
    if (spotifyConnected) {
      void provider.disconnect();
      return;
    }
    const unsubscribe = provider.subscribe((snapshot) => {
      if (snapshot.track) setCurrentTrack(snapshot.track);
      setProgressMs(snapshot.progressMs);
      setIsPlaying(snapshot.isPlaying);
      if (snapshot.volume !== null) setVolume(snapshot.volume);
    });
    void provider.connect();
    return () => {
      unsubscribe();
      void provider.disconnect();
    };
  }, [spotifyConnected]);

  useEffect(() => {
    if (!spotifyConnected || !isPlaying) return;
    const timer = window.setInterval(() => {
      setProgressMs((position) => Math.min(currentTrack.durationMs, position + 250));
    }, 250);
    return () => window.clearInterval(timer);
  }, [spotifyConnected, isPlaying, currentTrack.durationMs]);

  // Derived state
  const activeLyricIndex = findActiveLyricIndex(currentTrack.lyrics, progressMs + LYRICS_OFFSET_MS);
  const activeLyric = currentTrack.lyrics[activeLyricIndex];
  const activeChapterIndex = findActiveChapterIndex(currentTrack.chapters, progressMs);
  const activeChapter = currentTrack.chapters[activeChapterIndex];
  const audioFeatures = computeSimulatedAudioFeatures(progressMs, currentTrack.bpm, isPlaying);

  // Playback control handlers
  const handleTogglePlay = useCallback(() => {
    if (spotifyConnected) {
      setSpotifyControlError('');
      const nextPlaying = !isPlaying;
      const commandSequence = ++playbackCommandSequenceRef.current;
      playbackCommandAtRef.current = Date.now();
      // Atualiza o botão imediatamente; se o Spotify rejeitar o comando, restaura o estado anterior.
      setIsPlaying(nextPlaying);
      const command = nextPlaying ? resumeSpotifyPlayback : pauseSpotifyPlayback;
      void command().then(() => {
        setSpotifyControlError('');
        if (spotifyErrorTimeoutRef.current !== null) window.clearTimeout(spotifyErrorTimeoutRef.current);
      }).catch((error) => {
        if (playbackCommandSequenceRef.current === commandSequence) setIsPlaying(!nextPlaying);
        setSpotifyControlError(error instanceof Error ? error.message : 'Falha ao controlar o Spotify.');
        if (spotifyErrorTimeoutRef.current !== null) window.clearTimeout(spotifyErrorTimeoutRef.current);
        spotifyErrorTimeoutRef.current = window.setTimeout(() => setSpotifyControlError(''), 4500);
      });
      return;
    }
    const provider = playbackProviderRef.current!;
    if (isPlaying) void provider.pause();
    else void provider.play();
  }, [isPlaying, spotifyConnected]);

  const handleSelectTrack = useCallback((track: TrackData) => {
    void playbackProviderRef.current!.selectTrack(track);
  }, []);

  const handleSeek = useCallback((newMs: number) => {
    const position = Math.max(0, Math.min(currentTrack.durationMs, newMs));
    if (spotifyConnected) {
      setProgressMs(position);
      void seekSpotifyPlayback(position).catch((error) => setSpotifyControlError(error instanceof Error ? error.message : 'Falha ao avançar a faixa.'));
      return;
    }
    void playbackProviderRef.current!.seek(position);
  }, [currentTrack.durationMs, spotifyConnected]);

  const handlePreviousTrack = useCallback(() => {
    if (spotifyConnected) {
      void skipSpotifyTrack('previous').catch((error) => setSpotifyControlError(error instanceof Error ? error.message : 'Falha ao voltar a faixa.'));
      return;
    }
    const currentIndex = TRACK_CATALOG.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + TRACK_CATALOG.length) % TRACK_CATALOG.length;
    void playbackProviderRef.current!.selectTrack(TRACK_CATALOG[prevIndex]);
  }, [currentTrack.id, spotifyConnected]);

  const handleNextTrack = useCallback(() => {
    if (spotifyConnected) {
      void skipSpotifyTrack('next').catch((error) => setSpotifyControlError(error instanceof Error ? error.message : 'Falha ao pular a faixa.'));
      return;
    }
    const currentIndex = TRACK_CATALOG.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % TRACK_CATALOG.length;
    void playbackProviderRef.current!.selectTrack(TRACK_CATALOG[nextIndex]);
  }, [currentTrack.id, spotifyConnected]);

  const handleToggleShuffle = useCallback(() => {
    const next = !spotifyShuffle;
    if (spotifyConnected) {
      void setSpotifyShuffle(next).then(() => setSpotifyShuffle(next)).catch((error) => setSpotifyControlError(error instanceof Error ? error.message : 'Falha ao alterar reprodução aleatória.'));
      return;
    }
    setSpotifyShuffle(next);
  }, [spotifyConnected, spotifyShuffle]);

  const handleToggleMute = useCallback(() => {
    const nextVolume = volume > 0 ? 0 : 0.8;
    playbackProviderRef.current!.setVolume(nextVolume);
  }, [volume]);

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
        setCurrentMode('fullscreen');
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

  const isImmersive = !isBoardView && currentMode === 'fullscreen';

  return (
    <main className={`min-h-screen w-full concrete-canvas text-[#121114] flex flex-col justify-between relative overflow-x-hidden selection:bg-[#002aff] selection:text-white pierce-app-with-sidebar`}>
      <NavigationSidebar currentMode={currentMode} onSelectMode={(mode) => { setIsBoardView(false); setCurrentMode(mode); }} />

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
                setCurrentMode('fullscreen');
              }}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !isBoardView && currentMode === 'fullscreen'
                  ? 'bg-black text-white font-bold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>03. Fullscreen</span>
            </button>
          </div>

          {/* Top-Right: Spotify metadata connection + product signature */}
          <div className="flex items-center gap-3 text-[11px] font-mono tracking-widest uppercase text-black/70">
            <SpotifyConnectionPanel onSnapshot={handleSpotifySnapshot} onDisconnect={() => setSpotifyConnected(false)} />
            <span className="hidden sm:inline">MUSIC / VISUAL / YOU</span>
            <span className="text-sm font-light text-black/80">+</span>
          </div>
        </header>
      )}

      {spotifyControlError && <div className="fixed top-16 right-5 z-[70] max-w-sm rounded-lg bg-black text-white px-4 py-3 text-xs shadow-xl">{spotifyControlError}</div>}

      {isImmersive && (
        <div className="fixed right-5 top-5 z-50">
          <SpotifyConnectionPanel onSnapshot={handleSpotifySnapshot} onDisconnect={() => setSpotifyConnected(false)} />
        </div>
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

            {/* Bottom Row: 03. Fullscreen */}
            <div className="grid grid-cols-1 gap-8 items-stretch pt-4">
              {/* 04. Fullscreen preview card */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-black/70 font-medium">03. Fullscreen</span>
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
                      CLIQUE PARA ABRIR
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 2. FOCUSED ACTIVE MODE */
          <div className="w-full flex flex-col items-center">
            {/* Mode section indicator on desktop */}
            {currentMode !== 'fullscreen' && (
              <div className="flex items-center gap-2 mb-4 self-center max-w-5xl w-full px-2">
                <span className="text-xs font-mono text-black/70 font-medium">
                  {currentMode === 'compact' && '01. Compacto'}
                  {currentMode === 'disc' && '02. Disco'}
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

            {currentMode === 'fullscreen' && (
              <FullscreenMode
                track={currentTrack}
                progressMs={progressMs}
                isPlaying={isPlaying}
                volume={volume}
                activeLyric={activeLyric}
                lyricsText={lyricsText}
                onToggleShuffle={handleToggleShuffle}
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
