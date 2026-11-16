/**
 * Draws the shareable "Suas métricas" card onto a <canvas> — plain Canvas 2D, no extra dependency
 * (html2canvas and friends can't be npm-installed in every environment this app is built in).
 * Split in two: pure layout/text helpers (unit-testable) and the actual drawing (needs a real canvas/DOM Image).
 *
 * Visual identity borrows from the app's "Pontilhado" (dithered dot) and ASCII-art views: a dithered dot
 * field instead of a flat grid, and a thin plasma-ASCII texture band (same generator as the live cover art)
 * behind the header/footer. The canvas height is computed from the actual content — not a fixed constant —
 * so the footer never overlaps the last rows, however many items are shown.
 */
import { dither } from '../../components/colagem/views/dotShapes';
import { liveCover } from '../colagem/colagem';
import { hashString } from '../palette/trackPalette';

export interface ShareCardItem {
  name: string;
  subtitle: string;
  image: string;
}

export interface ShareCardData {
  rangeLabel: string;
  generatedLabel: string;
  artists: ShareCardItem[];
  tracks: ShareCardItem[];
}

export const CARD_WIDTH = 1080;
const INK = '#141414';
const CREAM = '#fbfaf6';
export const ACCENTS = ['#FF6A13', '#BEC72C', '#2563EB', '#E11D48', '#7C3AED'];

const PAD = 64;
const ROW_H = 118;
const THUMB = 92;
const MAX_ITEMS_PER_SECTION = 10;

const HEADER_TITLE_Y = 128;
const HEADER_SUBTITLE_Y = 168;
const DIVIDER_Y = 198;
const CONTENT_START_Y = 248;
const SECTION_GAP = 36;
const FOOTER_TOP_GAP = 40; // content end -> dashed divider
const FOOTER_TEXT_GAP = 56; // dashed divider -> wordmark baseline
const FOOTER_BOTTOM_PAD = 50; // wordmark baseline -> bottom edge

/** Shortens text with an ellipsis so it never overflows maxWidth — needs a 2D context with the font already set. */
export function ellipsize(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1);
  return cut.length <= 1 ? '…' : cut + '…';
}

/** Vertical space a section with `n` rows (title + rows, or title + "sem dados" line) takes. */
export function sectionHeight(n: number): number {
  return n > 0 ? 30 + n * ROW_H + 18 : 30 + 34;
}

/** Full canvas height for this data — header + both sections (as they'll actually be drawn) + footer. */
export function computeCardHeight(data: Pick<ShareCardData, 'artists' | 'tracks'>): number {
  const nArtists = Math.min(data.artists.length, MAX_ITEMS_PER_SECTION);
  const nTracks = Math.min(data.tracks.length, MAX_ITEMS_PER_SECTION);
  const contentEnd = CONTENT_START_Y + sectionHeight(nArtists) + SECTION_GAP + sectionHeight(nTracks);
  const dashedY = contentEnd + FOOTER_TOP_GAP;
  const textY = dashedY + FOOTER_TEXT_GAP;
  return Math.round(textY + FOOTER_BOTTOM_PAD);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dithered dot field (Bayer, same decision rule as the Pontilhado view) instead of a flat uniform grid. */
function pontilhadoTexture(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const step = 16;
  ctx.fillStyle = 'rgba(20,20,20,.10)';
  for (let gy = 0; gy * step < h; gy++) {
    for (let gx = 0; gx * step < w; gx++) {
      const x = gx * step, y = gy * step;
      const v = Math.sin(x * 0.021 + seed) * Math.sin(y * 0.026 - seed * 1.3) * 0.5 + 0.5;
      if (dither(v, gx, gy)) {
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** A thin strip of the same plasma-ASCII texture used for "capa viva" live covers, as a quiet decorative band. */
function asciiBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, seed: number, opacity: number): void {
  const colW = 9, rowH = 15;
  const cols = Math.max(4, Math.floor(w / colW));
  const rows = 4;
  const art = liveCover(seed * 0.37, seed, cols, rows);
  ctx.save();
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillStyle = `rgba(20,20,20,${opacity})`;
  ctx.textBaseline = 'top';
  art.split('\n').forEach((line, i) => ctx.fillText(line, x, y + i * rowH));
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Loads every distinct image URL once, tolerating failures (a missing cover just falls back to a flat swatch). */
async function preloadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const pairs = await Promise.all(unique.map(async (u) => [u, await loadImage(u)] as const));
  const map = new Map<string, HTMLImageElement>();
  for (const [u, img] of pairs) if (img) map.set(u, img);
  return map;
}

function drawSection(
  ctx: CanvasRenderingContext2D, title: string, items: ShareCardItem[], images: Map<string, HTMLImageElement>, startY: number,
): number {
  let y = startY;
  ctx.fillStyle = INK;
  ctx.font = "800 30px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(title, PAD, y);
  y += 30;

  if (items.length === 0) {
    ctx.fillStyle = '#999';
    ctx.font = "italic 500 20px 'Arimo', sans-serif";
    ctx.fillText('sem dados suficientes ainda', PAD, y + 22);
    return y + 34;
  }

  items.forEach((item, i) => {
    const rowY = y + i * ROW_H;
    const accent = ACCENTS[i % ACCENTS.length];

    // rank badge
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(PAD + 22, rowY + THUMB / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = "800 22px 'Arimo', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD + 22, rowY + THUMB / 2 + 8);
    ctx.textAlign = 'left';

    // cover / avatar — dotted ink ring instead of a solid border (Pontilhado touch)
    const thumbX = PAD + 62;
    const img = images.get(item.image);
    if (img) {
      ctx.save();
      roundRect(ctx, thumbX, rowY, THUMB, THUMB, 10);
      ctx.clip();
      ctx.drawImage(img, thumbX, rowY, THUMB, THUMB);
      ctx.restore();
    } else {
      roundRect(ctx, thumbX, rowY, THUMB, THUMB, 10);
      ctx.fillStyle = accent + '33';
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.setLineDash([1, 3]);
    roundRect(ctx, thumbX, rowY, THUMB, THUMB, 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // text
    const textX = thumbX + THUMB + 26;
    const maxTextWidth = CARD_WIDTH - PAD - textX;
    ctx.fillStyle = INK;
    ctx.font = "700 30px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(ellipsize(ctx, item.name, maxTextWidth), textX, rowY + 46);
    ctx.fillStyle = '#6b6b6b';
    ctx.font = "500 22px 'Arimo', sans-serif";
    ctx.fillText(ellipsize(ctx, item.subtitle, maxTextWidth), textX, rowY + 78);
  });

  return y + items.length * ROW_H + 18;
}

/** Renders the full card and returns the canvas (ready for toBlob/toDataURL). Async only because cover images load. */
export async function renderShareCard(data: ShareCardData): Promise<HTMLCanvasElement> {
  const artists = data.artists.slice(0, MAX_ITEMS_PER_SECTION);
  const tracks = data.tracks.slice(0, MAX_ITEMS_PER_SECTION);
  const cardHeight = computeCardHeight({ artists, tracks });
  const seed = hashString(`${data.rangeLabel}:${data.generatedLabel}:${artists.length}:${tracks.length}`) % 97;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const images = await preloadImages([...artists, ...tracks].map((i) => i.image));

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);
  pontilhadoTexture(ctx, CARD_WIDTH, cardHeight, seed);
  asciiBand(ctx, PAD, 18, CARD_WIDTH - PAD * 2, seed, 0.06);

  ctx.fillStyle = INK;
  ctx.font = "800 68px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText('SUAS MÉTRICAS', PAD, HEADER_TITLE_Y);
  ctx.font = "500 26px 'Arimo', sans-serif";
  ctx.fillStyle = '#555';
  ctx.fillText(`${data.rangeLabel} · ${data.generatedLabel}`, PAD, HEADER_SUBTITLE_Y);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.setLineDash([1, 6]);
  ctx.beginPath();
  ctx.moveTo(PAD, DIVIDER_Y);
  ctx.lineTo(CARD_WIDTH - PAD, DIVIDER_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  let y = CONTENT_START_Y;
  y = drawSection(ctx, 'ARTISTAS MAIS OUVIDOS', artists, images, y);
  y += SECTION_GAP;
  const contentEnd = drawSection(ctx, 'MÚSICAS MAIS OUVIDAS', tracks, images, y);

  const dashedY = contentEnd + FOOTER_TOP_GAP;
  const textY = dashedY + FOOTER_TEXT_GAP;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 10]);
  ctx.beginPath();
  ctx.moveTo(PAD, dashedY);
  ctx.lineTo(CARD_WIDTH - PAD, dashedY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = INK;
  ctx.font = "italic 600 34px 'Instrument Serif', Georgia, serif";
  ctx.fillText('PiErCe', PAD, textY);
  ctx.fillStyle = '#777';
  ctx.font = "500 20px 'Arimo', sans-serif";
  ctx.fillText('Music Companion — gerado a partir do seu Spotify', PAD + 128, textY - 2);

  return canvas;
}
