import { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginSpotifyAuthorization,
  completeSpotifyAuthorization,
  disconnectSpotify,
  getSpotifyNowPlaying,
  hasSpotifySession,
  type SpotifyNowPlaying,
} from '../services/playback/SpotifyMetadataConnector';

interface SpotifyConnectionPanelProps {
  onSnapshot?: (snapshot: SpotifyNowPlaying | null) => void;
  onDisconnect?: () => void;
}

export function SpotifyConnectionPanel({ onSnapshot, onDisconnect }: SpotifyConnectionPanelProps) {
  const [connected, setConnected] = useState(false);
  const [track, setTrack] = useState<SpotifyNowPlaying['item']>(null);
  const [progressMs, setProgressMs] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const refreshInFlight = useRef(false);
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect; // ref: an inline callback must not re-create refresh() on every render

  const refresh = useCallback(async () => {
    // No visibility guard: with the widget in its own window the main page is "hidden" but must keep syncing.
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const snapshot = await getSpotifyNowPlaying();
      onSnapshot?.(snapshot);
      // Spotify answers "nothing active" a few minutes after a pause: keep showing the last track instead of wiping it.
      setTrack((previous) => snapshot?.item ?? previous);
      setProgressMs((previous) => (snapshot ? snapshot.progress_ms ?? null : previous));
      setPlaying(snapshot?.is_playing ?? false);
      setConnected(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar o Spotify.');
      // Only a lost session counts as a disconnect; a failed request (network, 5xx) keeps the connection and retries in 2 s.
      if (!hasSpotifySession()) { setConnected(false); onDisconnectRef.current?.(); }
    } finally {
      refreshInFlight.current = false;
    }
  }, [onSnapshot]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const completed = await completeSpotifyAuthorization();
        if (!active) return;
        // With a stored token, start polling right away; a first refresh skipped while the window is hidden must not leave us disconnected.
        if (completed || hasSpotifySession()) { setConnected(true); await refresh(); }
        else setConnected(false);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Falha na autenticação Spotify.');
      } finally {
        if (active) setBusy(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!connected) return;

    // Spotify não envia eventos push para mudanças feitas em outro dispositivo.
    // Consultamos o estado completo a cada 2s e atualizamos imediatamente ao voltar
    // para a aba, para refletir pause/play, troca de faixa e seek externo.
    const timer = window.setInterval(() => { void refresh(); }, 2000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [connected, refresh]);

  const handleConnect = () => {
    setError('');
    beginSpotifyAuthorization();
  };

  const handleDisconnect = () => {
    disconnectSpotify();
    setConnected(false);
    setTrack(null);
    setProgressMs(null);
    setPlaying(false);
    setError('');
    onDisconnect?.();
  };

  return (
    <div className="relative flex items-center gap-2 rounded-full border border-black/15 bg-[#f7f5f0]/90 px-3 py-1.5 text-[10px] font-mono shadow-sm backdrop-blur-md">
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-600' : 'bg-black/25'}`} />
      {busy ? (
        <span className="text-black/55">SPOTIFY · VERIFICANDO</span>
      ) : connected ? (
        <div className="flex max-w-[230px] items-center gap-2">
          {track?.album.images?.[0]?.url && (
            <img src={track.album.images[0].url} alt="" className="h-7 w-7 rounded object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-black">{track ? track.name : 'Nenhuma faixa ativa'}</p>
            <p className="truncate text-black/50">{track ? track.artists.map((artist) => artist.name).join(', ') : 'Spotify conectado'}</p>
          </div>
          <span className="text-black/45">{playing ? 'PLAY' : 'PAUSE'}</span>
          <button type="button" onClick={handleDisconnect} className="ml-1 text-black/45 hover:text-black" title="Desconectar Spotify">×</button>
        </div>
      ) : (
        <button type="button" onClick={handleConnect} className="text-black/70 transition-colors hover:text-black">
          CONECTAR SPOTIFY
        </button>
      )}
      {error && <span className="max-w-[180px] truncate text-red-700" title={error}>{error}</span>}
      {connected && progressMs !== null && track && (
        <span className="hidden text-black/45 xl:inline">{Math.floor(progressMs / 60000)}:{String(Math.floor(progressMs / 1000) % 60).padStart(2, '0')}</span>
      )}
    </div>
  );
}
