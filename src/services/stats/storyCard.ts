/**
 * Draws a vertical (Instagram Stories ratio) share card for one individual track: cover photo up top with a
 * grainy halftone treatment, a manually-picked lyric excerpt centered as the main text, and a small credit
 * footer. Deliberately a DIFFERENT visual identity from the metrics card in shareCard.ts — dark/poster
 * instead of cream/editorial — per the request that the two share types not look alike.
 * Plain Canvas 2D, no extra dependency.
 */
import { dither } from '../../components/colagem/views/dotShapes';
import { hashString } from '../palette/trackPalette';

export interface StoryCardData {
  title: string;
  artist: string;
  /** Cover art URL; '' falls back to a plain dark background. */
  image: string;
  /** The lyric excerpt the user selected, in order, one entry per sung line. */
  lines: string[];
}

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
const CREAM = '#fbfaf6';
const INK = '#0b0b0b';
const PAD = 72;

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

/** Cover-fit crop: draws `img` filling exactly x,y,w,h, cropping whichever axis overflows. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > tr) { sw = img.naturalHeight * tr; sx = (img.naturalWidth - sw) / 2; }
  else { sh = img.naturalWidth / tr; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Dithered grain overlay (same Bayer rule as the Pontilhado view) — a halftone texture over the photo, never reads its pixels so it survives a CORS-opaque image. */
function grainOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const step = 10;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(11,11,11,.5)';
  for (let gy = 0; (y + gy * step) < y + h; gy++) {
    for (let gx = 0; (x + gx * step) < x + w; gx++) {
      const px = x + gx * step, py = y + gy * step;
      const v = Math.sin(px * 0.045 + seed) * Math.sin(py * 0.05 - seed * 1.7) * 0.5 + 0.5;
      if (dither(v, gx, gy)) {
        ctx.beginPath();
        ctx.arc(px + step / 2, py + step / 2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxWidth) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

/** Flattens the selected lyric lines into word-wrapped visual lines for a given font/width, so callers can center the block before drawing. */
export function layoutLyricLines(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number): string[] {
  const out: string[] = [];
  lines.forEach((line) => { out.push(...wrapLines(ctx, line.trim(), maxWidth)); });
  return out;
}

export async function renderStoryCard(data: StoryCardData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const seed = hashString(`${data.title}:${data.artist}`) % 97;
  const img = await loadImage(data.image);

  // base
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // photo band, top ~56% of the frame
  const photoH = Math.round(STORY_HEIGHT * 0.56);
  if (img) {
    drawCover(ctx, img, 0, 0, STORY_WIDTH, photoH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, STORY_WIDTH, photoH);
    grad.addColorStop(0, '#201f1f');
    grad.addColorStop(1, '#0b0b0b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_WIDTH, photoH);
  }
  grainOverlay(ctx, 0, 0, STORY_WIDTH, photoH, seed);

  // fade the photo into the dark lower section so the lyric text always has contrast
  const fade = ctx.createLinearGradient(0, photoH - 420, 0, photoH);
  fade.addColorStop(0, 'rgba(11,11,11,0)');
  fade.addColorStop(1, 'rgba(11,11,11,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, photoH - 420, STORY_WIDTH, 420);

  // lyric excerpt, centered in the remaining space
  const textTop = photoH - 60;
  const textBottom = STORY_HEIGHT - 240;
  ctx.font = "italic 600 52px 'Instrument Serif', Georgia, serif";
  const maxWidth = STORY_WIDTH - PAD * 2;
  const visualLines = layoutLyricLines(ctx, data.lines, maxWidth);
  const lineHeight = 64;
  const blockHeight = visualLines.length * lineHeight;
  let ly = Math.max(textTop + 70, (textTop + textBottom) / 2 - blockHeight / 2 + lineHeight);

  ctx.fillStyle = 'rgba(251,250,246,.55)';
  ctx.font = "700 90px Georgia, serif";
  ctx.fillText('"', PAD - 8, textTop + 90);

  ctx.textAlign = 'left';
  ctx.fillStyle = CREAM;
  ctx.font = "italic 600 52px 'Instrument Serif', Georgia, serif";
  visualLines.forEach((line) => { ctx.fillText(line, PAD, ly); ly += lineHeight; });

  // footer credit
  const footY = STORY_HEIGHT - 150;
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD, footY, 76, 76);
    ctx.clip();
    drawCover(ctx, img, PAD, footY, 76, 76);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(251,250,246,.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(PAD, footY, 76, 76);

  const textX = PAD + 76 + 22;
  ctx.fillStyle = CREAM;
  ctx.font = "700 28px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(data.title, textX, footY + 32);
  ctx.fillStyle = 'rgba(251,250,246,.65)';
  ctx.font = "500 22px 'Arimo', sans-serif";
  ctx.fillText(data.artist, textX, footY + 60);

  ctx.fillStyle = 'rgba(251,250,246,.85)';
  ctx.font = "italic 600 26px 'Instrument Serif', Georgia, serif";
  ctx.textAlign = 'right';
  ctx.fillText('PiErCe', STORY_WIDTH - PAD, footY + 46);
  ctx.textAlign = 'left';

  return canvas;
}
