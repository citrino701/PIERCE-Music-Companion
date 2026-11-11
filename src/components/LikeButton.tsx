import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart } from 'lucide-react';
import { beginSpotifyAuthorization, hasLibraryScopes, isTrackSaved, setTrackSaved } from '../services/playback/SpotifyMetadataConnector';

interface Props {
  /** Bare Spotify track id (no "spotify-" prefix), or null when the current track isn't a real Spotify track. */
  trackId: string | null;
  connected: boolean;
}

/** Heart button: saves/removes the current track from the person's actual Spotify Liked Songs. */
export const LikeButton: React.FC<Props> = ({ trackId, connected }) => {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const requestId = useRef(0);
  const needsReconnect = connected && !hasLibraryScopes();

  useEffect(() => {
    setError(null);
    if (!connected || !trackId || needsReconnect) { setSaved(false); return; }
    const id = ++requestId.current;
    setChecking(true);
    isTrackSaved(trackId).then((v) => { if (requestId.current === id) setSaved(v); }).catch(() => { /* stay unknown, keep heart outline */ }).finally(() => { if (requestId.current === id) setChecking(false); });
  }, [trackId, connected, needsReconnect]);

  if (!connected || !trackId) return null;

  const toggle = () => {
    if (needsReconnect) { beginSpotifyAuthorization(); return; }
    const next = !saved;
    setSaved(next); setError(null);
    setTrackSaved(trackId, next).catch((e) => { setSaved(!next); setError(e instanceof Error ? e.message : 'Falha ao salvar.'); });
  };

  return createPortal(
    <div style={{ position: 'fixed', left: 0, top: 144, zIndex: 90, fontFamily: "'Arimo', sans-serif" }}>
      <button type="button" className="pierce-rail-button" onClick={toggle} disabled={checking}
        aria-label={needsReconnect ? 'Reconectar para curtir' : saved ? 'Remover dos favoritos do Spotify' : 'Adicionar aos favoritos do Spotify'}
        aria-pressed={saved} title={needsReconnect ? 'Reconectar Spotify para curtir músicas' : saved ? 'Nos favoritos do Spotify' : 'Curtir no Spotify'}
        style={{ position: 'fixed', left: 19, top: 144, padding: 6, cursor: 'pointer', background: 'transparent', border: 'none', color: saved ? '#ff3b5c' : undefined, opacity: checking ? 0.5 : 1 }}>
        <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
      </button>
      {error && <div role="alert" style={{ position: 'fixed', left: 44, top: 142, maxWidth: 220, font: "500 11px 'Arimo', sans-serif", background: '#b00020', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>{error}</div>}
    </div>,
    document.body,
  );
};
