import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Disc3, ListMusic, Search } from 'lucide-react';
import {
  getMyPlaylists, hasLibraryScopes, searchSpotifyTracks, beginSpotifyAuthorization,
} from '../services/playback/SpotifyMetadataConnector';
import type { SpotifyPlaylistSummary, SpotifySearchTrack } from '../services/playback/spotifyResilience';

interface Props {
  connected: boolean;
  onPlayTrack: (uri: string) => void;
  onPlayPlaylist: (uri: string) => void;
}

type Tab = 'search' | 'playlists';

/** Search Spotify tracks and browse the person's own playlists, from the navigation rail. */
export const LibrarySearchPanel: React.FC<Props> = ({ connected, onPlayTrack, onPlayPlaylist }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifySearchTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const needsReconnect = connected && !hasLibraryScopes();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open || needsReconnect || tab !== 'search') return;
    const q = query.trim();
    if (!q) { setTracks([]); return; }
    setLoading(true); setError(null);
    const id = window.setTimeout(() => {
      searchSpotifyTracks(q).then(setTracks).catch((e) => setError(e instanceof Error ? e.message : 'Falha na busca.')).finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(id);
  }, [open, query, tab, needsReconnect]);

  useEffect(() => {
    if (!open || needsReconnect || tab !== 'playlists' || playlists) return;
    setLoading(true); setError(null);
    getMyPlaylists().then(setPlaylists).catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar playlists.')).finally(() => setLoading(false));
  }, [open, tab, needsReconnect, playlists]);

  const tabBtn = (id: Tab, label: string, Icon: typeof ListMusic): React.CSSProperties => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 6px', cursor: 'pointer',
    border: 'none', borderBottom: tab === id ? '2px solid #111' : '2px solid transparent', background: 'none',
    font: "700 12px 'Arimo', sans-serif", color: tab === id ? '#111' : '#777',
  });
  void ListMusic;

  const row = (image: string, title: string, subtitle: string, onClick: () => void, key: string) => (
    <button key={key} type="button" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 4px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
      {image ? <img src={image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', flex: 'none', borderRadius: 4 }} />
        : <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 4, background: '#eee', display: 'grid', placeItems: 'center' }}><Disc3 size={16} color="#999" /></div>}
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "600 13px 'Arimo', sans-serif", color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ font: "400 11px 'Arimo', sans-serif", color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
      </div>
    </button>
  );

  if (!connected) return null;

  return createPortal(
    <div ref={root} style={{ position: 'fixed', left: 0, top: 100, zIndex: 90, fontFamily: "'Arimo', sans-serif" }}>
      <button type="button" className="pierce-rail-button" aria-label="Buscar músicas e playlists" aria-expanded={open} title="Buscar músicas e playlists"
        onClick={() => setOpen((o) => !o)} style={{ position: 'fixed', left: 19, top: 100, padding: 6, cursor: 'pointer', background: 'transparent', border: 'none', color: open ? '#fff' : undefined }}>
        <Search size={16} />
      </button>
      {open && (
        <div role="dialog" aria-label="Buscar músicas e playlists" style={{ position: 'fixed', left: 72, top: 92, width: 300, maxHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column', background: '#fff', color: '#111', border: '2px solid #111', boxShadow: '5px 5px 0 #111' }}>
          {needsReconnect ? (
            <div style={{ padding: 16, font: "500 13px 'Arimo', sans-serif" }}>
              Busca e playlists precisam de uma nova permissão do Spotify.
              <button type="button" onClick={beginSpotifyAuthorization} style={{ display: 'block', marginTop: 10, padding: '8px 12px', background: '#111', color: '#fff', border: 'none', cursor: 'pointer', font: "700 12px 'Arimo', sans-serif" }}>Reconectar Spotify</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
                {tabBtn('search', 'Buscar', Search)}
                {tabBtn('playlists', 'Suas playlists', ListMusic)}
              </div>
              {tab === 'search' && (
                <div style={{ padding: '10px 10px 0' }}>
                  <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar música ou artista"
                    aria-label="Buscar música ou artista" style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', border: '1.5px solid #111', font: "500 13px 'Arimo', sans-serif" }} />
                </div>
              )}
              <div style={{ overflowY: 'auto', padding: '6px 10px 10px', minHeight: 80 }}>
                {loading && <div style={{ font: "400 12px 'Arimo', sans-serif", color: '#777', padding: '8px 4px' }}>Carregando…</div>}
                {error && <div role="alert" style={{ font: "500 12px 'Arimo', sans-serif", color: '#b00020', padding: '8px 4px' }}>{error}</div>}
                {!loading && !error && tab === 'search' && query.trim() && tracks.length === 0 && <div style={{ font: "400 12px 'Arimo', sans-serif", color: '#777', padding: '8px 4px' }}>Nada encontrado.</div>}
                {!loading && tab === 'search' && tracks.map((tr) => row(tr.image, tr.name, tr.artist, () => onPlayTrack(tr.uri), tr.id))}
                {!loading && !error && tab === 'playlists' && playlists?.length === 0 && <div style={{ font: "400 12px 'Arimo', sans-serif", color: '#777', padding: '8px 4px' }}>Você ainda não tem playlists.</div>}
                {!loading && tab === 'playlists' && playlists?.map((pl) => row(pl.image, pl.name, pl.owner ? `${pl.owner} · ${pl.trackCount} faixas` : `${pl.trackCount} faixas`, () => onPlayPlaylist(pl.uri), pl.id))}
              </div>
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
};
