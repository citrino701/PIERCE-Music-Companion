import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import cinematicBackdrop from './assets/images/tame_impala_person_sky_1793799892976.jpg';
import { ViewMode, TrackData, VisualSettings } from './types';
import { TRACK_CATALOG } from './data/tracks';
import { DemoPlaybackProvider } from './services/playback/DemoPlaybackProvider';
import {
  findActiveLyricIndex,
  findActiveChapterIndex,
  computeSimulatedAudioFeatures,
} from './services/playbackEngine';
import { FullscreenMode } from './components/FullscreenMode';
import { SpotifyConnectionPanel } from './components/SpotifyConnectionPanel';
import { NavigationSidebar } from './components/NavigationSidebar';
import { pauseSpotifyPlayback, resumeSpotifyPlayback, seekSpotifyPlayback, setSpotifyVolume, skipSpotifyTrack, setSpotifyShuffle, fetchTrackLyrics, getTrackGenres } from './services/playback/SpotifyMetadataConnector';
import { hasSpotifySession } from './services/playback/SpotifyMetadataConnector';
import type { SpotifyNowPlaying } from './services/playback/SpotifyMetadataConnector';
import { ReducedWidget } from './components/widget/ReducedWidget';
import { InstallPrompt } from './components/InstallPrompt';
import { enterReduced, exitReduced, resizeReduced, startDrag, onWindowMoved, isTauri } from './services/widget/reducedWindow';
import { isPipSupported, openPipWindow, resizePipWindow } from './services/widget/pipWindow';
import { createKeepAlive, registerMediaSession, supportsAutoPip, updateMediaMetadata } from './services/widget/autoPip';
import { WIDGET_STORAGE_KEY, parseWidgetPrefs, serializeWidgetPrefs, nextVariant, type WidgetPrefs, type WidgetVariant } from './services/widget/widgetLayout';
import { parseLrc } from './services/lyrics/lrc';
const LYRICS_OFFSET_MS = 250; // lyrics lead the audio a little: the position Spotify reports lags behind what is heard

export default function App() {
  const [currentMode, setCurrentMode] = useState<ViewMode>('fullscreen');
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>(() => {
    try { return parseWidgetPrefs(window.localStorage.getItem(WIDGET_STORAGE_KEY)); } catch { return parseWidgetPrefs(null); }
  });
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [reducedErrors, setReducedErrors] = useState<string[]>([]);
  const widgetPrefsRef = useRef(widgetPrefs);
  widgetPrefsRef.current = widgetPrefs;
  const [currentTrack, setCurrentTrack] = useState<TrackData>(TRACK_CATALOG[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  // A saved Spotify session means "real mode" from the first render; the demo catalogue must never take over while logged in.
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(() => { try { return hasSpotifySession(); } catch { return false; } });
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
      // Idle device: keep the last track and position on screen, just mark it as paused.
      setIsPlaying(false);
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
    const devicePercent = snapshot.device?.volume_percent;
    if (typeof devicePercent === 'number' && Date.now() - volumeCommandAtRef.current > 2500) setVolume(devicePercent / 100);
    // Evita que um snapshot iniciado antes do clique reverta a resposta visual otimista.
    if (Date.now() - playbackCommandAtRef.current > 2500) setIsPlaying(snapshot.is_playing);
  }, []);

  useEffect(() => {
    if (!spotifyConnected || !currentTrack.id.startsWith('spotify-')) { setLyricsText(null); return; }
    let cancelled = false; const trackId=currentTrack.id; setLyricsText(null);
    void fetchTrackLyrics(currentTrack).then(record=>{
      if(cancelled)return;
      setLyricsText((record?.plainLyrics??record?.syncedLyrics?.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/g,'')??(record?.instrumental?'Faixa instrumental.':null))?.normalize('NFC')??null);
      const lines=parseLrc(record?.syncedLyrics,currentTrack.durationMs,`${currentTrack.title} ${currentTrack.artist}`);
      setCurrentTrack(previous=>previous.id===trackId?{...previous,lyrics:lines}:previous);
    }).catch(()=>{if(!cancelled)setLyricsText(null);});
    return()=>{cancelled=true;};
  },[spotifyConnected,currentTrack.id]);

  // The demo uses the same provider contract reserved for future integrations.
  const volumeCommandAtRef = useRef(0);
  const volumeTimerRef = useRef<number | null>(null);
  const lastVolumeRef = useRef(0.8);
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

  const handleVolumeChange = useCallback((next: number) => {
    const value = Math.min(1, Math.max(0, next));
    setVolume(value);
    if (spotifyConnected) {
      volumeCommandAtRef.current = Date.now();
      if (volumeTimerRef.current) window.clearTimeout(volumeTimerRef.current);
      // The slider fires many times a second; Spotify only needs the last value.
      volumeTimerRef.current = window.setTimeout(() => {
        void setSpotifyVolume(value).catch((error) => setSpotifyControlError(error instanceof Error ? error.message : 'Falha ao ajustar o volume.'));
      }, 180);
      return;
    }
    playbackProviderRef.current!.setVolume(value);
  }, [spotifyConnected]);

  const handleToggleMute = useCallback(() => {
    if (volume > 0) { lastVolumeRef.current = volume; handleVolumeChange(0); } else handleVolumeChange(lastVolumeRef.current || 0.8);
  }, [volume, handleVolumeChange]);

  const handleUpdateVisualSettings = useCallback((updates: Partial<VisualSettings>) => {
    setVisualSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // Floating widget ("reduzido"): persist the format and position, and morph the Tauri window.
  const savePrefs = useCallback((next: WidgetPrefs) => {
    setWidgetPrefs(next);
    try { window.localStorage.setItem(WIDGET_STORAGE_KEY, serializeWidgetPrefs(next)); } catch { /* storage unavailable */ }
  }, []);
  const changeVariant = useCallback((variant: WidgetVariant) => {
    savePrefs({ ...widgetPrefsRef.current, variant });
    void resizeReduced(variant).catch(() => undefined);
    if (pipWindow) resizePipWindow(pipWindow, variant);
  }, [savePrefs, pipWindow]);

  // "Reduzir": desktop app -> morph the window; Chrome/Edge -> Picture-in-Picture window; otherwise the widget fills the tab.
  const selectMode = useCallback((mode: ViewMode) => {
    if (mode === 'fullscreen') {
      pipWindow?.close();
      setCurrentMode('fullscreen');
      return;
    }
    if (!isTauri() && isPipSupported()) {
      void openPipWindow(widgetPrefsRef.current.variant).then((win) => {
        if (!win) { setCurrentMode('reduced'); return; }
        win.addEventListener('pagehide', () => setPipWindow(null), { once: true });
        setPipWindow(win);
      }).catch(() => setCurrentMode('reduced'));
      return;
    }
    setCurrentMode('reduced');
  }, [pipWindow]);

  useEffect(() => {
    document.documentElement.classList.toggle('pierce-reduced', currentMode === 'reduced');
    if (currentMode === 'reduced') {
      const { variant, position } = widgetPrefsRef.current;
      setReducedErrors([]);
      void enterReduced(variant, position).then(setReducedErrors).catch((err) => setReducedErrors([String(err)]));
      return;
    }
    void exitReduced().then((pos) => { if (pos) savePrefs({ ...widgetPrefsRef.current, position: pos }); }).catch(() => undefined);
  }, [currentMode, savePrefs]);

  useEffect(() => {
    if (currentMode !== 'reduced') return;
    let timer = 0;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void onWindowMoved((pos) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => savePrefs({ ...widgetPrefsRef.current, position: pos }), 300);
    }).then((fn) => { if (disposed) fn?.(); else unlisten = fn; }).catch(() => undefined);
    return () => { disposed = true; window.clearTimeout(timer); unlisten?.(); };
  }, [currentMode, savePrefs]);

  // Browser only: let Chrome open the floating widget by itself when you switch to another tab (like Spotify Web does).
  // It needs the page to be "playing media", so a near-silent tone runs while Spotify plays (see autoPip.ts).
  const autoPipEnabled = !isTauri() && supportsAutoPip();
  const keepAliveRef = useRef(createKeepAlive());
  const mediaActionsRef = useRef({ play: () => {}, pause: () => {}, next: () => {}, previous: () => {}, enterPip: () => {} });
  mediaActionsRef.current = {
    play: () => { if (!isPlaying) handleTogglePlay(); },
    pause: () => { if (isPlaying) handleTogglePlay(); },
    next: handleNextTrack,
    previous: handlePreviousTrack,
    enterPip: () => selectMode('reduced'),
  };
  useEffect(() => {
    if (!autoPipEnabled) return;
    const unlock = () => keepAliveRef.current.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const unregister = registerMediaSession({
      play: () => mediaActionsRef.current.play(),
      pause: () => mediaActionsRef.current.pause(),
      next: () => mediaActionsRef.current.next(),
      previous: () => mediaActionsRef.current.previous(),
      enterPip: () => mediaActionsRef.current.enterPip(),
    });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); unregister(); keepAliveRef.current.stop(); };
  }, [autoPipEnabled]);
  useEffect(() => {
    if (!autoPipEnabled) return;
    if (spotifyConnected && isPlaying) keepAliveRef.current.start(); else keepAliveRef.current.stop();
    updateMediaMetadata(spotifyConnected ? currentTrack : null, isPlaying);
  }, [autoPipEnabled, spotifyConnected, isPlaying, currentTrack.id, currentTrack.title, currentTrack.artist, currentTrack.coverImage]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape' && currentMode === 'reduced') selectMode('fullscreen');
      if (e.key === '1') selectMode('reduced');
      if (e.key === '2') selectMode('fullscreen');
      if (e.key.toLowerCase() === 'v' && currentMode === 'reduced') changeVariant(nextVariant(widgetPrefsRef.current.variant));
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
  }, [handleTogglePlay, handleSeek, progressMs, currentMode, changeVariant, selectMode]);

  const reduced = currentMode === 'reduced';

  return (
    <>
      {/* One Spotify panel for the whole app: it never remounts when the mode changes, so polling and login survive the window morph. */}
      <div className={reduced ? 'hidden' : 'fixed right-5 top-5 z-50'}>
        <SpotifyConnectionPanel onSnapshot={handleSpotifySnapshot} onDisconnect={() => setSpotifyConnected(false)} />
      </div>
      {reduced ? (
    <>
      <ReducedWidget
        track={currentTrack}
        progressMs={progressMs}
        isPlaying={isPlaying}
        activeLyric={activeLyric}
        variant={widgetPrefs.variant}
        onVariantChange={changeVariant}
        onTogglePlay={handleTogglePlay}
        onPrevious={handlePreviousTrack}
        onNext={handleNextTrack}
        onExpand={() => selectMode('fullscreen')}
        onDragStart={() => { void startDrag(); }}
      />
      {spotifyControlError && <div className="fixed bottom-1 left-1 right-1 z-[70] rounded-lg bg-black text-white px-3 py-2 text-[10px]">{spotifyControlError}</div>}
      {reducedErrors.length > 0 && <div role="alert" className="fixed left-2 top-[230px] z-[70] max-w-[420px] rounded-lg bg-red-700 text-white px-3 py-2 text-[11px] font-mono">Não consegui ajustar a janela: {reducedErrors.join(' · ')}</div>}
    </>
  ) : (
    <main className="min-h-screen w-full concrete-canvas text-[#121114] relative overflow-hidden selection:bg-[#002aff] selection:text-white pierce-app-with-sidebar">
      <NavigationSidebar currentMode={pipWindow ? 'reduced' : currentMode} onSelectMode={selectMode} />
      <InstallPrompt />
      {spotifyControlError && <div className="fixed top-16 right-5 z-[70] max-w-sm rounded-lg bg-black text-white px-4 py-3 text-xs shadow-xl">{spotifyControlError}</div>}
      <FullscreenMode
        track={currentTrack}
        progressMs={progressMs}
        isPlaying={isPlaying}
        volume={volume}
        activeLyric={activeLyric}
        lyricsText={lyricsText}
        shuffleEnabled={spotifyShuffle}
        onToggleShuffle={handleToggleShuffle}
        activeChapter={activeChapter}
        audioFeatures={audioFeatures}
        visualSettings={visualSettings}
        onUpdateVisualSettings={handleUpdateVisualSettings}
        currentMode={currentMode}
        onSelectMode={selectMode}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onPrevious={handlePreviousTrack}
        onNext={handleNextTrack}
        onToggleMute={handleToggleMute}
        onVolumeChange={handleVolumeChange}
      />
      {pipWindow && createPortal(
        <ReducedWidget
          track={currentTrack}
          progressMs={progressMs}
          isPlaying={isPlaying}
          activeLyric={activeLyric}
          variant={widgetPrefs.variant}
          onVariantChange={changeVariant}
          onTogglePlay={handleTogglePlay}
          onPrevious={handlePreviousTrack}
          onNext={handleNextTrack}
          onExpand={() => selectMode('fullscreen')}
          onDragStart={() => undefined}
        />,
        pipWindow.document.body,
      )}
    </main>
  )}
    </>
  );
}
