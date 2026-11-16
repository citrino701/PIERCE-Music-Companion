import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Quote, Share2, X } from 'lucide-react';
import type { TrackData } from '../types';
import { renderStoryCard, type StoryTemplate } from '../services/stats/storyCard';

const TEMPLATES: { id: StoryTemplate; label: string }[] = [
  { id: 'poster', label: 'Pôster' },
  { id: 'tags', label: 'Capa + tags' },
];

interface Props {
  track: TrackData;
  /**
   * Plain-text fallback for tracks that have lyrics but no line-by-line sync (so `track.lyrics` is empty) —
   * without this, the panel used to hide entirely for any track whose lyrics aren't synced moment-to-moment.
   */
  lyricsText?: string | null;
}

const MAX_LINES = 8;

/**
 * Rail button + panel for sharing the CURRENT track as an Instagram-Stories-style image: the person picks
 * which sung lines to feature (manually — never auto-picked), and we render a vertical card with a
 * different visual identity from the metrics share card (dark/poster instead of cream/editorial).
 */
export const TrackStoryPanel: React.FC<Props> = ({ track, lyricsText }) => {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<StoryTemplate>('poster');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const synced = track.lyrics.filter((l) => l.text.trim() !== '').map((l) => ({ id: l.id, text: l.text }));
  const plainText = lyricsText && lyricsText !== 'Faixa instrumental.' ? lyricsText : '';
  const plain = plainText.split(/\r?\n/).map((t) => t.trim()).filter(Boolean).map((text, i) => ({ id: `plain-${i}`, text }));
  const lines = synced.length > 0 ? synced : plain;

  useEffect(() => { setSelected(new Set()); setOpen(false); }, [track.id]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (lines.length === 0) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { if (next.size >= MAX_LINES) return prev; next.add(id); }
      return next;
    });
  };

  const openShare = async () => {
    setSharing(true); setShareError(null); setShareImg(null); setCopied(false);
    try {
      const picked = lines.filter((l) => selected.has(l.id)).map((l) => l.text.trim());
      const canvas = await renderStoryCard({ template, title: track.title, artist: track.artist, image: track.coverImage, lines: picked });
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
      a.download = `pierce-stories-${track.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return createPortal(
    <div ref={root} style={{ position: 'fixed', left: 0, top: 232, zIndex: 90, fontFamily: "'Arimo', sans-serif" }}>
      <button type="button" className="pierce-rail-button" aria-label="Compartilhar trecho da letra como stories" aria-expanded={open} title="Compartilhar trecho da letra como stories"
        onClick={() => setOpen((o) => !o)} style={{ position: 'fixed', left: 19, top: 232, padding: 6, cursor: 'pointer', background: 'transparent', border: 'none', color: open ? '#fff' : undefined }}>
        <Quote size={16} />
      </button>
      {open && (
        <div role="dialog" aria-label="Escolher trecho da letra" style={{ position: 'fixed', left: 72, top: 224, width: 300, maxHeight: 'calc(100vh - 242px)', display: 'flex', flexDirection: 'column', background: '#fff', color: '#111', border: '2px solid #111', boxShadow: '5px 5px 0 #111' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #ddd', font: "700 12px 'Arimo', sans-serif" }}>
            Escolha os trechos (até {MAX_LINES}) para o stories
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '8px 10px 0' }}>
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplate(t.id)} aria-pressed={template === t.id} style={{
                flex: 1, padding: '6px 4px', cursor: 'pointer', borderRadius: 999, border: '1.5px solid #111',
                background: template === t.id ? '#111' : '#fff', color: template === t.id ? '#fff' : '#111', font: "700 10.5px 'Arimo', sans-serif",
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ overflowY: 'auto', padding: '6px 10px', flex: 1 }}>
            {lines.map((l) => {
              const isSelected = selected.has(l.id);
              return (
                <button key={l.id} type="button" onClick={() => toggle(l.id)} aria-pressed={isSelected}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', textAlign: 'left', padding: '6px 4px',
                    background: isSelected ? '#f3f1ea' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 4,
                  }}>
                  <span style={{
                    width: 16, height: 16, flex: 'none', marginTop: 2, borderRadius: 4, border: '1.5px solid ' + (isSelected ? '#111' : '#ccc'),
                    background: isSelected ? '#111' : '#fff', display: 'grid', placeItems: 'center',
                  }}>{isSelected && <Check size={10} color="#fff" strokeWidth={3} />}</span>
                  <span style={{ font: "500 12.5px 'Arimo', sans-serif", color: '#222', lineHeight: 1.35 }}>{l.text.trim()}</span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: '4px 10px 10px' }}>
            <div style={{ font: "500 10px 'Arimo', sans-serif", color: '#999', padding: '2px 4px 6px' }}>{selected.size} linha(s) escolhida(s)</div>
            <button type="button" disabled={selected.size === 0} onClick={openShare} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 12px',
              background: '#111', color: '#fff', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'default',
              opacity: selected.size > 0 ? 1 : 0.4, font: "700 12px 'Arimo', sans-serif",
            }}><Share2 size={13} /> Montar stories</button>
          </div>
        </div>
      )}
      {sharing && (
        <div role="dialog" aria-label="Imagem do stories" style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: '#0b0b0b', border: '2px solid #111', boxShadow: '6px 6px 0 #111', maxWidth: 'min(92vw, 320px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #333' }}>
              <span style={{ font: "800 13px 'Arimo', sans-serif", color: '#fbfaf6' }}>Seu stories</span>
              <button type="button" aria-label="Fechar" onClick={() => setSharing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fbfaf6' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 12, overflowY: 'auto', maxHeight: '70vh' }}>
              {!shareImg && !shareError && <div style={{ font: "400 13px 'Arimo', sans-serif", color: '#aaa', padding: '24px 4px', textAlign: 'center' }}>Montando a imagem…</div>}
              {shareError && <div role="alert" style={{ font: "500 12px 'Arimo', sans-serif", color: '#ff6b6b', padding: '8px 4px' }}>{shareError}</div>}
              {shareImg && <img src={shareImg} alt="Imagem do trecho da letra em formato stories" style={{ width: '100%', display: 'block', border: '1px solid #333' }} />}
            </div>
            {shareImg && (
              <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #333' }}>
                <button type="button" onClick={copyImage} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: copied ? '#1a7f37' : '#fbfaf6', color: copied ? '#fff' : '#111', border: 'none', cursor: 'pointer', font: "700 12px 'Arimo', sans-serif" }}>
                  <Share2 size={13} /> {copied ? 'Copiado!' : 'Copiar imagem'}
                </button>
                <button type="button" onClick={downloadImage} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: 'transparent', color: '#fbfaf6', border: '1.5px solid #fbfaf6', cursor: 'pointer', font: "700 12px 'Arimo', sans-serif" }}>
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
