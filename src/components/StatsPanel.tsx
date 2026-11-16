import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, Disc3, Download, Share2, User, X } from 'lucide-react';
import {
  beginSpotifyAuthorization, getTopArtists, getTopTracks, getWeeklyTop, hasTopScopes,
} from '../services/playback/SpotifyMetadataConnector';
import { rangeLabel, type StatsRange, type SpotifyTopArtist, type SpotifyTopTrack } from '../services/playback/spotifyResilience';
import { renderShareCard, type ShareCardData } from '../services/stats/shareCard';

interface Props {
  connected: boolean;
}

type Tab = 'artists' | 'tracks';
const RANGES: StatsRange[] = ['week', 'short_term', 'medium_term', 'long_term'];
const RANGE_CHIP_LABEL: Record<StatsRange, string> = { week: 'Semana', short_term: '4 sem.', medium_term: '6 meses', long_term: 'Sempre' };

/** Top artists / top tracks, with a button to generate a shareable image of them — from the navigation rail. */
export const StatsPanel: React.FC<Props> = ({ connected }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('artists');
  const [range, setRange] = useState<StatsRange>('medium_term');
  const [artists, setArtists] = useState<SpotifyTopArtist[] | null>(null);
  const [tracks, setTracks] = useState<SpotifyTopTrack[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const needsReconnect = connected && !hasTopScopes();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open || needsReconnect) return;
    setLoading(true); setError(null);
    const load = range === 'week'
      ? getWeeklyTop(10)
      : Promise.all([getTopArtists(range, 10), getTopTracks(range, 10)]).then(([a, t]) => ({ artists: a, tracks: t }));
    load
      .then(({ artists: a, tracks: t }) => { setArtists(a); setTracks(t); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar suas métricas.'))
      .finally(() => setLoading(false));
  }, [open, range, needsReconnect]);

  const row = (rank: number, image: string, title: string, subtitle: string, key: string) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 4px' }}>
      <div style={{ width: 20, flex: 'none', font: "800 11px 'Arimo', sans-serif", color: '#aaa' }}>{String(rank).padStart(2, '0')}</div>
      {image ? <img src={image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', flex: 'none', borderRadius: 4 }} />
        : <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 4, background: '#eee', display: 'grid', placeItems: 'center' }}>{tab === 'artists' ? <User size={16} color="#999" /> : <Disc3 size={16} color="#999" />}</div>}
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "600 13px 'Arimo', sans-serif", color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ font: "400 11px 'Arimo', sans-serif", color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
      </div>
    </div>
  );

  const buildShareData = (): ShareCardData => ({
    rangeLabel: rangeLabel(range),
    generatedLabel: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    artists: (artists ?? []).slice(0, 5).map((a) => ({ name: a.name, subtitle: a.genres.slice(0, 2).join(', ') || 'Artista', image: a.image })),
    tracks: (tracks ?? []).slice(0, 5).map((t) => ({ name: t.name, subtitle: t.artist, image: t.image })),
  });

  const openShare = async () => {
    setSharing(true); setShareError(null); setShareImg(null); setCopied(false);
    try {
      const canvas = await renderShareCard(buildShareData());
      canvasRef.current = canvas;
      setShareImg(canvas.toDataURL('image/png'));
    } catch {
      setShareError('Não foi possível montar a imagem.');
    }
  };

  const copyImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { setShareError('Não foi possível gerar o PNG.'); return; }
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        setShareError('Esse navegador não deixa copiar imagem direto — usa o "Baixar PNG" aqui embaixo.');
        return;
      }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(() => { setCopied(true); setShareError(null); })
        .catch(() => setShareError('Não deu pra copiar (o navegador bloqueou). Usa o "Baixar PNG".'));
    }, 'image/png');
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pierce-metricas-${range}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  if (!connected) return null;

  return createPortal(
    <div ref={root} style={{ position: 'fixed', left: 0, top: 188, zIndex: 90, fontFamily: "'Arimo', sans-serif" }}>
      <button type="button" className="pierce-rail-button" aria-label="Suas métricas do Spotify" aria-expanded={open} title="Suas métricas do Spotify"
        onClick={() => setOpen((o) => !o)} style={{ position: 'fixed', left: 19, top: 188, padding: 6, cursor: 'pointer', background: 'transparent', border: 'none', color: open ? '#fff' : undefined }}>
        <BarChart3 size={16} />
      </button>
      {open && (
        <div role="dialog" aria-label="Suas métricas do Spotify" style={{ position: 'fixed', left: 72, top: 180, width: 300, maxHeight: 'calc(100vh - 198px)', display: 'flex', flexDirection: 'column', background: '#fff', color: '#111', border: '2px solid #111', boxShadow: '5px 5px 0 #111' }}>
          {needsReconnect ? (
            <div style={{ padding: 16, font: "500 13px 'Arimo', sans-serif" }}>
              Suas métricas precisam de uma nova permissão do Spotify.
              <button type="button" onClick={beginSpotifyAuthorization} style={{ display: 'block', marginTop: 10, padding: '8px 12px', background: '#111', color: '#fff', border: 'none', cursor: 'pointer', font: "700 12px 'Arimo', sans-serif" }}>Reconectar Spotify</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
                {(['artists', 'tracks'] as const).map((id) => (
                  <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} style={{
                    flex: 1, padding: '8px 6px', cursor: 'pointer', border: 'none',
                    borderBottom: tab === id ? '2px solid #111' : '2px solid transparent', background: 'none',
                    font: "700 12px 'Arimo', sans-serif", color: tab === id ? '#111' : '#777',
                  }}>{id === 'artists' ? 'Artistas' : 'Músicas'}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '8px 10px 0' }}>
                {RANGES.map((r) => (
                  <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} style={{
                    flex: 1, padding: '5px 3px', cursor: 'pointer', borderRadius: 999, border: '1.5px solid #111',
                    background: range === r ? '#111' : '#fff', color: range === r ? '#fff' : '#111', font: "700 10px 'Arimo', sans-serif",
                  }}>{RANGE_CHIP_LABEL[r]}</button>
                ))}
              </div>
              <div style={{ overflowY: 'auto', padding: '6px 10px 4px', minHeight: 80 }}>
                {loading && <div style={{ font: "400 12px 'Arimo', sans-serif", color: '#777', padding: '8px 4px' }}>Carregando…</div>}
                {error && <div role="alert" style={{ font: "500 12px 'Arimo', sans-serif", color: '#b00020', padding: '8px 4px' }}>{error}</div>}
                {!loading && !error && tab === 'artists' && artists?.length === 0 && <div style={{ font: "400 12px 'Arimo', sans-serif", color: '#777', padding: '8px 4px' }}>Sem dados suficientes ainda.</div>}
                {!loading && tab === 'artists' && artists?.map((a, i) => row(i + 1, a.image, a.name, a.genres.slice(0, 2).join(', ') || '—', a.id))}
                {!loading && !error && tab === 'tracks' && tracks?.length === 0 && <div style={{ font: "400 12px 'Arimo', sans-serif", color: '#777', padding: '8px 4px' }}>Sem dados suficientes ainda.</div>}
                {!loading && tab === 'tracks' && tracks?.map((t, i) => row(i + 1, t.image, t.name, t.artist, t.id))}
              </div>
              <div style={{ padding: '4px 10px 10px' }}>
                <button type="button" disabled={!artists || !tracks} onClick={openShare} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 12px',
                  background: '#111', color: '#fff', border: 'none', cursor: artists && tracks ? 'pointer' : 'default',
                  opacity: artists && tracks ? 1 : 0.4, font: "700 12px 'Arimo', sans-serif",
                }}><Share2 size={13} /> Compartilhar imagem</button>
              </div>
            </>
          )}
        </div>
      )}
      {sharing && (
        <div role="dialog" aria-label="Imagem para compartilhar" style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: '#fff', border: '2px solid #111', boxShadow: '6px 6px 0 #111', maxWidth: 'min(92vw, 420px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #ddd' }}>
              <span style={{ font: "800 13px 'Arimo', sans-serif" }}>Sua imagem</span>
              <button type="button" aria-label="Fechar" onClick={() => setSharing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 12, overflowY: 'auto', maxHeight: '70vh' }}>
              {!shareImg && !shareError && <div style={{ font: "400 13px 'Arimo', sans-serif", color: '#777', padding: '24px 4px', textAlign: 'center' }}>Montando a imagem…</div>}
              {shareError && <div role="alert" style={{ font: "500 12px 'Arimo', sans-serif", color: '#b00020', padding: '8px 4px' }}>{shareError}</div>}
              {shareImg && <img src={shareImg} alt="Cartão com suas métricas do Spotify" style={{ width: '100%', display: 'block', border: '1px solid #ddd' }} />}
            </div>
            {shareImg && (
              <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #ddd' }}>
                <button type="button" onClick={copyImage} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: copied ? '#1a7f37' : '#111', color: '#fff', border: 'none', cursor: 'pointer', font: "700 12px 'Arimo', sans-serif" }}>
                  <Share2 size={13} /> {copied ? 'Copiado!' : 'Copiar imagem'}
                </button>
                <button type="button" onClick={downloadImage} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: '#fff', color: '#111', border: '1.5px solid #111', cursor: 'pointer', font: "700 12px 'Arimo', sans-serif" }}>
                  <Download size={13} /> Baixar PNG
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
