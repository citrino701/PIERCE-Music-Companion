import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pause, Play, SkipBack, SkipForward, Maximize2, Disc3, Search, ListMusic, X,
} from 'lucide-react';
import type { LyricLine, TrackData } from '../../types';
import { useTrackPalette } from '../colagem/useTrackPalette';
import { formatClock, liveCover } from '../../services/colagem/colagem';
import { filledDots, NANO_MAX_SIZE } from '../../services/widget/widgetLayout';
import {
  getMyPlaylists, hasLibraryScopes, searchSpotifyTracks, beginSpotifyAuthorization,
} from '../../services/playback/SpotifyMetadataConnector';
import type { SpotifyPlaylistSummary, SpotifySearchTrack } from '../../services/playback/spotifyResilience';

interface ReducedWidgetProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onExpand: () => void;
  /** Called on pointer-down over the empty body of the widget; the shell starts the native window drag. */
  onDragStart: () => void;
  /** Whether Spotify is connected — gates the search/playlists button (hidden entirely when false). */
  connected?: boolean;
  onPlayTrack?: (uri: string) => void;
  onPlayPlaylist?: (uri: string) => void;
}

const RING_DOTS = 56;
const TEXT = 'rgba(255,255,255,.94)';
const SUB = 'rgba(255,255,255,.62)';
const SHADOW = '0 1px 3px rgba(0,0,0,.4)';

const css = `
.pw-root,.pw-root *{box-sizing:border-box}
.pw-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:transparent;user-select:none;-webkit-user-select:none;font-family:'DM Mono','Space Mono',ui-monospace,monospace;color:${TEXT}}
.pw-btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;border-radius:999px;cursor:pointer;padding:0;transition:transform .12s,background .15s}
.pw-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.16)}
.pw-btn:focus-visible{outline:3px solid var(--pw-deep);outline-offset:2px}
.pw-shell{position:relative;overflow:hidden}
.pw-bg{position:absolute;inset:0;z-index:0}
.pw-sheen{position:absolute;inset:0;z-index:1;background:linear-gradient(165deg,rgba(0,0,0,.08),rgba(0,0,0,.4));backdrop-filter:blur(22px) saturate(1.25);-webkit-backdrop-filter:blur(22px) saturate(1.25);box-shadow:0 14px 34px rgba(0,0,0,.5)}
.pw-content{position:relative;z-index:2;width:100%;height:100%}
.pw-card{width:100%;height:100%;display:flex;gap:12px;padding:12px}
.pw-blob{animation-duration:22s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
.pw-vinyl{border-radius:50%;animation:pw-spin 6s linear infinite}
.pw-paused .pw-vinyl{animation-play-state:paused}
.pw-marquee{display:inline-block;white-space:nowrap;animation:pw-marquee 12s linear infinite}
.pw-paused .pw-marquee{animation-play-state:paused}
.pw-row:hover{background:rgba(255,255,255,.1)}
@keyframes pw-spin{to{transform:rotate(360deg)}}
@keyframes pw-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pw-blob-a{0%,100%{transform:translate(-6%,-6%) scale(1)}50%{transform:translate(9%,8%) scale(1.2)}}
@keyframes pw-blob-b{0%,100%{transform:translate(8%,9%) scale(1.1)}50%{transform:translate(-9%,-7%) scale(.9)}}
@media (prefers-reduced-motion:reduce){.pw-vinyl,.pw-marquee,.pw-blob{animation:none}}
`;

/**
 * Base escura tingida pela própria paleta do álbum (nunca cai pro branco, mesmo sem suporte a
 * backdrop-filter) + capa borrada + dois borrões de cor por cima, clipados na forma que o pai
 * (card/disco/pílula) define — a mesma técnica da visualização Vidro, encolhida pro tamanho do widget.
 */
const GlassBackdrop: React.FC<{ cover: string; a: string; deep: string; radius: number | string }> = ({ cover, a, deep, radius }) => (
  <div aria-hidden className="pw-bg" style={{ borderRadius: radius, overflow: 'hidden', background: deep }}>
    {cover && <img src={cover} alt="" style={{ position: 'absolute', inset: '-25%', width: '150%', height: '150%', objectFit: 'cover', filter: 'blur(28px) saturate(1.4) brightness(.6)', opacity: 0.55 }} />}
    <div className="pw-blob" style={{ position: 'absolute', width: '75%', height: '75%', left: '-18%', top: '-22%', background: a, opacity: 0.3, filter: 'blur(28px)', animationName: 'pw-blob-a' }} />
    <div className="pw-blob" style={{ position: 'absolute', width: '62%', height: '62%', right: '-16%', bottom: '-16%', background: deep, opacity: 0.55, filter: 'blur(28px)', animationName: 'pw-blob-b' }} />
  </div>
);

const Controls: React.FC<{ isPlaying: boolean; onTogglePlay: () => void; onPrevious: () => void; onNext: () => void; a: string; onA: string; size?: number }> = ({ isPlaying, onTogglePlay, onPrevious, onNext, a, onA, size = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <button type="button" className="pw-btn" aria-label="Faixa anterior" onClick={onPrevious} style={{ width: size, height: size }}><SkipBack size={14} /></button>
    <button type="button" className="pw-btn" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ width: size + 10, height: size + 10, background: a, color: onA, border: 'none' }}>
      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
    </button>
    <button type="button" className="pw-btn" aria-label="Próxima faixa" onClick={onNext} style={{ width: size, height: size }}><SkipForward size={14} /></button>
  </div>
);

/** Top-right controls: search/playlists toggle + back-to-fullscreen. No more format switcher — there's only one manual format now. */
const TopControls: React.FC<{ onExpand: () => void; onToggleLibrary?: () => void; libraryOpen?: boolean }> = ({ onExpand, onToggleLibrary, libraryOpen }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {onToggleLibrary && (
      <button type="button" className="pw-btn" aria-label="Buscar músicas e playlists" aria-expanded={libraryOpen} title="Buscar músicas e playlists" onClick={onToggleLibrary}
        style={{ width: 22, height: 22, background: libraryOpen ? '#fff' : 'rgba(255,255,255,.14)', color: libraryOpen ? '#111' : '#fff' }}><Search size={12} /></button>
    )}
    <button type="button" className="pw-btn" aria-label="Voltar ao Fullscreen" title="Voltar ao Fullscreen (Esc)" onClick={onExpand} style={{ width: 22, height: 22 }}><Maximize2 size={12} /></button>
  </div>
);

function Dots({ filled, total, a }: { filled: number; total: number; a: string }) {
  return (
    <div aria-hidden style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: i < filled ? a : 'rgba(255,255,255,.28)', flex: '0 0 auto' }} />
      ))}
    </div>
  );
}

/** Search tracks and browse the person's own playlists — same feature as the sidebar panel, shrunk to fit inside the widget card. */
function useLibrary(open: boolean) {
  const [tab, setTab] = useState<'search' | 'playlists'>('search');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifySearchTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReconnect = !hasLibraryScopes();

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

  return { tab, setTab, query, setQuery, tracks, playlists, loading, error, needsReconnect };
}

const LibraryOverlay: React.FC<{
  state: ReturnType<typeof useLibrary>;
  radius: number;
  onPlayTrack: (uri: string) => void;
  onPlayPlaylist: (uri: string) => void;
  onClose: () => void;
}> = ({ state, radius, onPlayTrack, onPlayPlaylist, onClose }) => {
  const { tab, setTab, query, setQuery, tracks, playlists, loading, error, needsReconnect } = state;

  const row = (image: string, title: string, subtitle: string, onClick: () => void, key: string) => (
    <button key={key} type="button" className="pw-row" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 4px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8 }}>
      {image ? <img src={image} alt="" style={{ width: 30, height: 30, objectFit: 'cover', flex: 'none', borderRadius: 4 }} />
        : <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 4, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center' }}><Disc3 size={13} color="rgba(255,255,255,.6)" /></div>}
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "600 12px 'Arimo', sans-serif", color: TEXT, textShadow: SHADOW, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ font: "400 10.5px 'Arimo', sans-serif", color: SUB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
      </div>
    </button>
  );

  return (
    <div role="dialog" aria-label="Buscar músicas e playlists" style={{
      position: 'absolute', inset: 0, zIndex: 3, borderRadius: radius, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'rgba(12,10,22,.74)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', fontFamily: "'Arimo', sans-serif",
    }}>
      {needsReconnect ? (
        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
          <div style={{ font: "500 12px 'Arimo', sans-serif", color: TEXT }}>Busca e playlists precisam de uma nova permissão do Spotify.</div>
          <button type="button" onClick={beginSpotifyAuthorization} style={{ alignSelf: 'flex-start', padding: '7px 12px', background: '#fff', color: '#111', border: 'none', borderRadius: 8, cursor: 'pointer', font: "700 11px 'Arimo', sans-serif" }}>Reconectar Spotify</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 6px 0' }}>
            {(['search', 'playlists'] as const).map((id) => (
              <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 4px', cursor: 'pointer',
                border: 'none', borderRadius: 7, background: tab === id ? 'rgba(255,255,255,.2)' : 'transparent',
                font: "700 10.5px 'Arimo', sans-serif", color: tab === id ? '#fff' : SUB,
              }}>{id === 'search' ? <Search size={11} /> : <ListMusic size={11} />}{id === 'search' ? 'Buscar' : 'Playlists'}</button>
            ))}
            <button type="button" className="pw-btn" aria-label="Fechar busca" onClick={onClose} style={{ width: 20, height: 20, flex: 'none' }}><X size={11} /></button>
          </div>
          {tab === 'search' && (
            <div style={{ padding: '6px 6px 0' }}>
              <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar música ou artista"
                aria-label="Buscar música ou artista" style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(255,255,255,.34)', background: 'rgba(255,255,255,.1)', color: '#fff', font: "500 11.5px 'Arimo', sans-serif" }} />
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px 6px' }}>
            {loading && <div style={{ font: "400 11px 'Arimo', sans-serif", color: SUB, padding: '6px 4px' }}>Carregando…</div>}
            {error && <div role="alert" style={{ font: "500 11px 'Arimo', sans-serif", color: '#ffb4b4', padding: '6px 4px' }}>{error}</div>}
            {!loading && !error && tab === 'search' && query.trim() && tracks.length === 0 && <div style={{ font: "400 11px 'Arimo', sans-serif", color: SUB, padding: '6px 4px' }}>Nada encontrado.</div>}
            {!loading && tab === 'search' && tracks.map((tr) => row(tr.image, tr.name, tr.artist, () => onPlayTrack(tr.uri), tr.id))}
            {!loading && !error && tab === 'playlists' && playlists?.length === 0 && <div style={{ font: "400 11px 'Arimo', sans-serif", color: SUB, padding: '6px 4px' }}>Você ainda não tem playlists.</div>}
            {!loading && tab === 'playlists' && playlists?.map((pl) => row(pl.image, pl.name, pl.owner ? `${pl.owner} · ${pl.trackCount} faixas` : `${pl.trackCount} faixas`, () => onPlayPlaylist(pl.uri), pl.id))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Below NANO_MAX_SIZE there's no room left for anything but one button, so we drop straight to it —
 * this is never picked by hand, only triggered by the window's own real measured size.
 */
function useIsNano(ref: React.RefObject<HTMLElement>): boolean {
  const [isNano, setIsNano] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = (w: number, h: number) => setIsNano(w > 0 && h > 0 && w <= NANO_MAX_SIZE.width && h <= NANO_MAX_SIZE.height);
    check(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const box = entry?.contentBoxSize?.[0];
      if (box) check(box.inlineSize, box.blockSize);
      else if (entry) check(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return isNano;
}

export const ReducedWidget: React.FC<ReducedWidgetProps> = ({
  track, progressMs, isPlaying, activeLyric, onTogglePlay, onPrevious, onNext, onExpand, onDragStart,
  connected = false, onPlayTrack, onPlayPlaylist,
}) => {
  const palette = useTrackPalette(track);
  const vars = { '--pw-a': palette.a, '--pw-deep': palette.deep } as React.CSSProperties;
  const rootRef = useRef<HTMLDivElement>(null);
  const isNano = useIsNano(rootRef);
  const [tick, setTick] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const library = useLibrary(libraryOpen);
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [isPlaying]);
  useEffect(() => { setLibraryOpen(false); }, [track.id]);
  const ascii = useMemo(() => liveCover(tick * 0.5, (palette.a.length + track.id.length) % 7 / 3, 38, 12), [tick, palette.a, track.id]);

  const lyricLine = activeLyric?.text?.trim() || '';
  const dragProps = { onPointerDown: (e: React.PointerEvent) => { if ((e.target as HTMLElement).closest('button, [role="dialog"]')) return; if (e.button === 0) onDragStart(); } };
  const filled = filledDots(progressMs, track.durationMs, RING_DOTS);
  const canSearch = connected && !!onPlayTrack && !!onPlayPlaylist;
  const toggleLibrary = canSearch ? () => setLibraryOpen((o) => !o) : undefined;
  const closeLibrary = () => setLibraryOpen(false);
  const playTrack = (uri: string) => { onPlayTrack?.(uri); setLibraryOpen(false); };
  const playPlaylist = (uri: string) => { onPlayPlaylist?.(uri); setLibraryOpen(false); };

  let body: React.ReactNode;
  if (isNano) {
    // Too small for the cover, the text, even play/pause — the one thing that still has to work is skip.
    body = (
      <button type="button" aria-label="Próxima faixa" onClick={onNext}
        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 0, background: palette.a, color: palette.onA, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <SkipForward size={Math.max(16, Math.min(32, Math.round(Math.min(NANO_MAX_SIZE.width, NANO_MAX_SIZE.height) * 0.4)))} />
      </button>
    );
  } else {
    body = (
      <div {...dragProps} className="pw-shell" style={{ width: '100%', height: '100%', borderRadius: 0, cursor: 'grab' }}>
        <GlassBackdrop cover={track.coverImage} a={palette.a} deep={palette.deep} radius={0} />
        <div className="pw-sheen pw-card" style={{ borderRadius: 0, border: 'none' }} />
        <div className="pw-content pw-card" style={{ border: 'none' }}>
          <div aria-hidden style={{ width: 140, flex: '0 0 140px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', overflow: 'hidden', position: 'relative', background: palette.deep, boxShadow: '0 8px 20px rgba(0,0,0,.35)' }}>
            <img src={track.coverImage} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }} />
            <pre style={{ position: 'absolute', inset: 0, margin: 0, fontSize: 5.5, lineHeight: '6px', color: palette.onA, opacity: 0.35, overflow: 'hidden', pointerEvents: 'none' }}>{ascii}</pre>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Arimo','Helvetica Neue',Arial,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-0.04em', lineHeight: 1, color: TEXT, textShadow: SHADOW, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ fontSize: 10, color: SUB, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
              </div>
              <TopControls onExpand={onExpand} onToggleLibrary={toggleLibrary} libraryOpen={libraryOpen} />
            </div>
            <div style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 19, lineHeight: 1.15, minHeight: 44, color: TEXT, textShadow: SHADOW, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} aria-live="off">
              {lyricLine === '' ? <span style={{ opacity: 0.5, fontStyle: 'italic' }}>♪</span> : lyricLine}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: SUB, marginBottom: 3 }}><span>{formatClock(progressMs)}</span><span>{formatClock(track.durationMs)}</span></div>
              <Dots filled={Math.floor((filled / RING_DOTS) * 34)} total={34} a={palette.a} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Controls isPlaying={isPlaying} onTogglePlay={onTogglePlay} onPrevious={onPrevious} onNext={onNext} a={palette.a} onA={palette.onA} size={28} />
            </div>
          </div>
        </div>
        {libraryOpen && <LibraryOverlay state={library} radius={26} onPlayTrack={playTrack} onPlayPlaylist={playPlaylist} onClose={closeLibrary} />}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`pw-root ${isPlaying ? '' : 'pw-paused'}`} style={vars} data-testid="reduced-widget" data-variant={isNano ? 'nano' : 'normal'}>
      <style>{css}</style>
      {body}
    </div>
  );
};
