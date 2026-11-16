/**
 * Shareable Spotify-metrics cards — plain Canvas 2D, no extra dependency (html2canvas and friends can't be
 * npm-installed in every environment this app is built in).
 *
 * Visual language is a "visual mixtape" in the spirit of Spotify's own Wrapped share cards — bold full-bleed
 * colour, giant rank numerals, big cover art, confident oversized type, room to breathe — but ours, not a
 * copy: original palettes, our own wordmark, and a small Pontilhado/ASCII flourish as the house signature
 * instead of Wrapped's own marks. Two shapes:
 *   - renderShareCard: a ranked list of ONLY artists or ONLY tracks — never both stacked in one card, so
 *     you can share just the category you want.
 *   - renderHeroShareCard: one single artist or track, poster-style, cover-forward.
 * Both compute their own canvas height from the real content, so nothing is ever clipped or overlapped.
 */
import { liveCover } from '../colagem/colagem';
import { hashString } from '../palette/trackPalette';

export interface ShareCardItem {
  name: string;
  subtitle: string;
  image: string;
}

export type ShareSectionKind = 'artists' | 'tracks';

export interface ShareCardData {
  kind: ShareSectionKind;
  rangeLabel: string;
  generatedLabel: string;
  items: ShareCardItem[];
}

export interface HeroCardData {
  itemKind: 'artist' | 'track';
  rank: number;
  name: string;
  subtitle: string;
  image: string;
  rangeLabel: string;
  generatedLabel: string;
}

export const CARD_WIDTH = 1080;

interface Palette { bg: string; ink: string; accent: string }
/** Original, bold colour fields — deliberately dark-with-vivid-accent so contrast never has to be checked per track (unlike a cover-derived palette, these numbers are fixed and were eyeballed for readability). */
const PALETTES: Palette[] = [
  { bg: '#241446', ink: '#F4EEFF', accent: '#FF5B9E' }, // deep purple / hot pink
  { bg: '#7A0F1F', ink: '#FFF3E2', accent: '#FFD23F' }, // deep red / yellow
  { bg: '#0E3B3C', ink: '#E7FFE0', accent: '#B6FF3C' }, // deep teal / lime
  { bg: '#16215C', ink: '#EAF0FF', accent: '#5BD1FF' }, // indigo / sky
  { bg: '#3A2618', ink: '#FFEFD9', accent: '#FF8A3D' }, // brown / orange
];

function pickPalette(seedKey: string): Palette {
  return PALETTES[hashString(seedKey) % PALETTES.length];
}

function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Shortens text with an ellipsis so it never overflows maxWidth — needs a 2D context with the font already set. */
export function ellipsize(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1);
  return cut.length <= 1 ? '…' : cut + '…';
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

/** Tiny plasma-ASCII stamp (same generator as the "capa viva" live cover art) — the house signature flourish. */
function asciiStamp(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, color: string): void {
  const art = liveCover(seed * 0.4, seed, 14, 3);
  ctx.save();
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  art.split('\n').forEach((line, i) => ctx.fillText(line, x, y + i * 13));
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

async function preloadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const pairs = await Promise.all(unique.map(async (u) => [u, await loadImage(u)] as const));
  const map = new Map<string, HTMLImageElement>();
  for (const [u, img] of pairs) if (img) map.set(u, img);
  return map;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > tr) { sw = img.naturalHeight * tr; sx = (img.naturalWidth - sw) / 2; }
  else { sh = img.naturalWidth / tr; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ---------------------------------------------------------------------------
// Ranked-list card (artists OR tracks, never both at once)
// ---------------------------------------------------------------------------

const PAD = 64;
const ROW_H = 172;
const THUMB = 140;
const MAX_ITEMS = 10;

const HEADER_TITLE_Y = 150;
const HEADER_SUBTITLE_Y = 192;
const DIVIDER_Y = 228;
const CONTENT_START_Y = 280;
const FOOTER_TOP_GAP = 56;
const FOOTER_TEXT_GAP = 54;
const FOOTER_BOTTOM_PAD = 52;

/** Vertical space the ranked rows take, or room for a "sem dados" line when there are none. */
export function sectionHeight(n: number): number {
  return n > 0 ? n * ROW_H + 18 : 50;
}

/** Full canvas height for a given item count — content, whatever its size, plus the footer below it. */
export function computeCardHeight(itemCount: number): number {
  const n = Math.min(itemCount, MAX_ITEMS);
  const contentEnd = CONTENT_START_Y + sectionHeight(n);
  const dashedY = contentEnd + FOOTER_TOP_GAP;
  const textY = dashedY + FOOTER_TEXT_GAP;
  return Math.round(textY + FOOTER_BOTTOM_PAD);
}

export async function renderShareCard(data: ShareCardData): Promise<HTMLCanvasElement> {
  const items = data.items.slice(0, MAX_ITEMS);
  const palette = pickPalette(`${data.kind}:${data.rangeLabel}`);
  const seed = hashString(`${data.kind}:${data.rangeLabel}`) % 97;
  const cardHeight = computeCardHeight(items.length);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const images = await preloadImages(items.map((i) => i.image));

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);

  const title = data.kind === 'artists' ? 'TOP ARTISTAS' : 'TOP MÚSICAS';
  ctx.fillStyle = palette.ink;
  ctx.font = "800 84px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(title, PAD, HEADER_TITLE_Y);
  ctx.font = "600 26px 'Arimo', sans-serif";
  ctx.fillStyle = hexWithAlpha(palette.ink, 0.65);
  ctx.fillText(`${data.rangeLabel} · ${data.generatedLabel}`, PAD, HEADER_SUBTITLE_Y);

  ctx.fillStyle = palette.accent;
  ctx.fillRect(PAD, DIVIDER_Y, 120, 7);

  let y = CONTENT_START_Y;
  if (items.length === 0) {
    ctx.fillStyle = hexWithAlpha(palette.ink, 0.6);
    ctx.font = "italic 500 26px 'Arimo', sans-serif";
    ctx.fillText('sem dados suficientes ainda', PAD, y + 32);
  } else {
    items.forEach((item, i) => {
      const rowY = y + i * ROW_H;
      const tilt = (i % 2 === 0 ? -1 : 1) * 2 * (Math.PI / 180);

      // giant rank numeral
      ctx.fillStyle = palette.accent;
      ctx.font = "800 100px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1).padStart(2, '0'), PAD, rowY + THUMB * 0.78);

      // cover, slightly rotated for a "visual mixtape" feel, thick ink border
      const coverX = PAD + 150;
      const img = images.get(item.image);
      ctx.save();
      ctx.translate(coverX + THUMB / 2, rowY + THUMB / 2);
      ctx.rotate(tilt);
      ctx.translate(-THUMB / 2, -THUMB / 2);
      if (img) {
        ctx.save();
        roundRect(ctx, 0, 0, THUMB, THUMB, 14);
        ctx.clip();
        drawCover(ctx, img, 0, 0, THUMB, THUMB);
        ctx.restore();
      } else {
        roundRect(ctx, 0, 0, THUMB, THUMB, 14);
        ctx.fillStyle = hexWithAlpha(palette.accent, 0.3);
        ctx.fill();
      }
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      roundRect(ctx, 0, 0, THUMB, THUMB, 14);
      ctx.stroke();
      ctx.restore();

      // text
      const textX = coverX + THUMB + 34;
      const maxTextWidth = CARD_WIDTH - PAD - textX;
      ctx.fillStyle = palette.ink;
      ctx.font = "700 36px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText(ellipsize(ctx, item.name, maxTextWidth), textX, rowY + THUMB / 2 - 4);
      ctx.fillStyle = hexWithAlpha(palette.ink, 0.65);
      ctx.font = "500 24px 'Arimo', sans-serif";
      ctx.fillText(ellipsize(ctx, item.subtitle, maxTextWidth), textX, rowY + THUMB / 2 + 30);
    });
    y += items.length * ROW_H + 18;
  }

  const dashedY = y + FOOTER_TOP_GAP;
  const textY = dashedY + FOOTER_TEXT_GAP;

  ctx.strokeStyle = hexWithAlpha(palette.ink, 0.3);
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 10]);
  ctx.beginPath();
  ctx.moveTo(PAD, dashedY);
  ctx.lineTo(CARD_WIDTH - PAD, dashedY);
  ctx.stroke();
  ctx.setLineDash([]);

  asciiStamp(ctx, PAD, dashedY + 14, seed, hexWithAlpha(palette.ink, 0.4));

  ctx.fillStyle = palette.accent;
  ctx.font = "italic 700 36px 'Instrument Serif', Georgia, serif";
  ctx.fillText('PiErCe', PAD, textY);
  ctx.fillStyle = hexWithAlpha(palette.ink, 0.55);
  ctx.font = "500 20px 'Arimo', sans-serif";
  ctx.fillText('Music Companion — gerado a partir do seu Spotify', PAD + 132, textY - 2);

  return canvas;
}

// ---------------------------------------------------------------------------
// Hero card: one single artist or track, poster-style, cover-forward
// ---------------------------------------------------------------------------

export const HERO_WIDTH = 1080;
export const HERO_HEIGHT = 1350;
const HERO_PAD = 72;
const HERO_COVER = 760;

export async function renderHeroShareCard(data: HeroCardData): Promise<HTMLCanvasElement> {
  const palette = pickPalette(`${data.itemKind}:${data.name}`);
  const seed = hashString(`${data.itemKind}:${data.name}`) % 97;

  const canvas = document.createElement('canvas');
  canvas.width = HERO_WIDTH;
  canvas.height = HERO_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const img = await loadImage(data.image);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, HERO_WIDTH, HERO_HEIGHT);

  // category pill
  const label = data.itemKind === 'artist' ? 'ARTISTA' : 'MÚSICA';
  ctx.font = "800 22px 'Arimo', sans-serif";
  const pillW = ctx.measureText(label).width + 36;
  roundRect(ctx, HERO_PAD, 56, pillW, 40, 20);
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.fillStyle = palette.bg;
  ctx.textAlign = 'center';
  ctx.fillText(label, HERO_PAD + pillW / 2, 82);
  ctx.textAlign = 'left';

  // giant outlined rank numeral
  ctx.font = "800 150px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  ctx.strokeText(`Nº ${String(data.rank).padStart(2, '0')}`, HERO_PAD, 240);

  // cover, centered, rotated, thick border + offset shadow (ties back to the app's own zine shadow motif)
  const coverX = (HERO_WIDTH - HERO_COVER) / 2;
  const coverY = 270;
  ctx.save();
  ctx.translate(coverX + HERO_COVER / 2, coverY + HERO_COVER / 2);
  ctx.rotate(-2.5 * (Math.PI / 180));
  ctx.translate(-HERO_COVER / 2, -HERO_COVER / 2);
  ctx.fillStyle = hexWithAlpha(palette.ink, 0.4);
  roundRect(ctx, 14, 14, HERO_COVER, HERO_COVER, 22);
  ctx.fill();
  if (img) {
    ctx.save();
    roundRect(ctx, 0, 0, HERO_COVER, HERO_COVER, 22);
    ctx.clip();
    drawCover(ctx, img, 0, 0, HERO_COVER, HERO_COVER);
    ctx.restore();
  } else {
    roundRect(ctx, 0, 0, HERO_COVER, HERO_COVER, 22);
    ctx.fillStyle = hexWithAlpha(palette.accent, 0.35);
    ctx.fill();
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 6;
  roundRect(ctx, 0, 0, HERO_COVER, HERO_COVER, 22);
  ctx.stroke();
  ctx.restore();

  // title + subtitle, centered below the cover
  const textTop = coverY + HERO_COVER + 70;
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.ink;
  ctx.font = "800 60px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(ellipsize(ctx, data.name, HERO_WIDTH - HERO_PAD * 2), HERO_WIDTH / 2, textTop);
  ctx.font = "500 28px 'Arimo', sans-serif";
  ctx.fillStyle = hexWithAlpha(palette.ink, 0.7);
  ctx.fillText(ellipsize(ctx, data.subtitle, HERO_WIDTH - HERO_PAD * 2), HERO_WIDTH / 2, textTop + 44);
  ctx.textAlign = 'left';

  // footer
  const footY = HERO_HEIGHT - 70;
  asciiStamp(ctx, HERO_PAD, footY - 46, seed, hexWithAlpha(palette.ink, 0.4));
  ctx.fillStyle = palette.accent;
  ctx.font = "italic 700 34px 'Instrument Serif', Georgia, serif";
  ctx.fillText('PiErCe', HERO_PAD, footY);
  ctx.fillStyle = hexWithAlpha(palette.ink, 0.6);
  ctx.font = "500 20px 'Arimo', sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText(`${data.rangeLabel} · ${data.generatedLabel}`, HERO_WIDTH - HERO_PAD, footY);
  ctx.textAlign = 'left';

  return canvas;
}
