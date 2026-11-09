import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TrackPalette } from '../../types';
import { hashString } from '../../services/palette/trackPalette';
import { liveCover } from '../../services/colagem/colagem';

const W = 400;
const H = 228;
const COLS = 134;
const ROWS = 76;
const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

interface Cover { img: HTMLImageElement; lum: Uint8ClampedArray | null }

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cover failed'));
    img.src = src;
  });
}

/** Draw `img` into the w x h box like object-fit: cover. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Loads the cover; luminance is only available when the image is readable (CORS), otherwise `lum` is null. */
async function loadCover(src: string): Promise<Cover | null> {
  try {
    const img = await loadImage(src, true);
    const c = document.createElement('canvas');
    c.width = COLS; c.height = ROWS;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { img, lum: null };
    drawCover(ctx, img, COLS, ROWS);
    const { data } = ctx.getImageData(0, 0, COLS, ROWS);
    const lum = new Uint8ClampedArray(COLS * ROWS);
    for (let i = 0; i < lum.length; i++) lum[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
    return { img, lum };
  } catch {
    try { return { img: await loadImage(src, false), lum: null }; } catch { return null; }
  }
}

interface Props { t: number; track: { id: string; coverImage: string }; progress: number; onset: boolean; pal: TrackPalette; /** Position/size override (narrow layouts); the picture is cropped like object-fit: cover. */ box?: React.CSSProperties }

/**
 * The cover photo, resolving over the length of the song: coarse halftone and heavy noise at the start,
 * finer dither in the middle, the photo with a light grain at the end. Falls back to the ASCII picture
 * when there is no usable cover.
 */
export const LiveCover: React.FC<Props> = ({ t, track, progress, onset, pal, box }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [cover, setCover] = useState<Cover | null | undefined>(undefined);
  const seed = useMemo(() => hashString(track.id) % 7, [track.id]);

  useEffect(() => {
    let cancelled = false;
    setCover(undefined);
    if (!track.coverImage) { setCover(null); return; }
    void loadCover(track.coverImage).then((c) => { if (!cancelled) setCover(c); });
    return () => { cancelled = true; };
  }, [track.coverImage]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !cover) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = 2;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const e = Math.min(1, Math.max(0, progress));
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    if (cover.lum) {
      const cs = Math.max(2, Math.round(9 - 7 * e));
      const amp = 0.7 * (1 - e) + 0.1;
      ctx.fillStyle = pal.deep;
      for (let y = 0; y < H; y += cs) {
        for (let x = 0; x < W; x += cs) {
          const l = cover.lum[Math.min(ROWS - 1, Math.floor(((y + cs / 2) / H) * ROWS)) * COLS + Math.min(COLS - 1, Math.floor(((x + cs / 2) / W) * COLS))] / 255;
          const v = Math.min(1, Math.max(0, 1 - l + (Math.random() - 0.5) * amp));
          if (v < 0.04) continue;
          if (cs >= 5) { ctx.beginPath(); ctx.arc(x + cs / 2, y + cs / 2, (cs / 2) * Math.sqrt(v) * 1.1, 0, Math.PI * 2); ctx.fill(); }
          else { const side = cs * Math.sqrt(v); ctx.fillRect(x, y, side, side); }
        }
      }
    }
    const photoAlpha = cover.lum ? smooth(0.45, 1, e) : 0.2 + 0.8 * smooth(0, 1, e);
    if (photoAlpha > 0.01) { ctx.globalAlpha = photoAlpha; drawCover(ctx, cover.img, W, H); ctx.globalAlpha = 1; }

    // grain: heavy at the start, light at the end
    ctx.fillStyle = '#14142b';
    const specks = Math.round(2200 * (1 - e) + 250);
    for (let i = 0; i < specks; i++) { ctx.globalAlpha = 0.18 + Math.random() * 0.25; ctx.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2); }
    ctx.globalAlpha = 1;

    if (onset) { // glitch: shift a few horizontal slices on the beat
      for (let i = 0; i < 3; i++) {
        const y = Math.floor(Math.random() * (H - 20)), hh = 6 + Math.floor(Math.random() * 14), dx = (Math.random() - 0.5) * 24;
        ctx.drawImage(cv, 0, y * dpr, W * dpr, hh * dpr, dx, y, W, hh);
      }
    }
  }, [t, cover, progress, onset, pal]);

  return (
    <div style={{ position: 'absolute', left: 40, top: 356, width: W, height: H, ...box, background: 'var(--track-bg)', border: '2px solid var(--ink)', boxSizing: 'border-box', overflow: 'hidden', transition: 'background .8s' }}>
      {cover ? (
        <canvas ref={canvas} role="img" aria-label="Capa do álbum que se revela ao longo da música" style={{ position: 'absolute', left: -2, top: -2, width: box ? 'calc(100% + 4px)' : W, height: box ? 'calc(100% + 4px)' : H, objectFit: 'cover' }} />
      ) : (
        <pre aria-label="Imagem animada em ASCII que muda a cada faixa" style={{ position: 'absolute', left: 2, top: 4, margin: 0, font: "12px/13px 'DM Mono', monospace", color: 'var(--track-deep)', whiteSpace: 'pre', transition: 'color .8s' }}>{liveCover(t, seed)}</pre>
      )}
      <div style={{ position: 'absolute', right: 8, bottom: 6, padding: '2px 7px', background: 'var(--ink)', color: '#fff', font: "10px 'DM Mono', monospace", letterSpacing: '0.08em' }}>CAPA VIVA</div>
    </div>
  );
};
