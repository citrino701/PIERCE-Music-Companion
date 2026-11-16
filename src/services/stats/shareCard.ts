/**
 * Draws the shareable "Suas métricas" card onto a <canvas> — plain Canvas 2D, no extra dependency
 * (html2canvas and friends can't be npm-installed in every environment this app is built in).
 * Split in two: pure layout/text helpers (unit-testable) and the actual drawing (needs a real canvas/DOM Image).
 */

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
export const CARD_HEIGHT = 1350;
const INK = '#141414';
const CREAM = '#fbfaf6';
export const ACCENTS = ['#FF6A13', '#BEC72C', '#2563EB', '#E11D48', '#7C3AED'];

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

function dotGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(20,20,20,.07)';
  for (let y = 26; y < h; y += 26) {
    for (let x = 26; x < w; x += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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

const ROW_H = 118;
const PAD = 64;
const THUMB = 92;

function drawSection(
  ctx: CanvasRenderingContext2D, title: string, items: ShareCardItem[], images: Map<string, HTMLImageElement>, startY: number,
): number {
  let y = startY;
  ctx.fillStyle = INK;
  ctx.font = "800 30px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(title, PAD, y);
  y += 30;

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

    // cover / avatar
    const thumbX = PAD + 62;
    roundRect(ctx, thumbX, rowY, THUMB, THUMB, 10);
    const img = images.get(item.image);
    if (img) {
      ctx.save();
      roundRect(ctx, thumbX, rowY, THUMB, THUMB, 10);
      ctx.clip();
      ctx.drawImage(img, thumbX, rowY, THUMB, THUMB);
      ctx.restore();
    } else {
      ctx.fillStyle = accent + '33';
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRect(ctx, thumbX, rowY, THUMB, THUMB, 10);
    ctx.stroke();

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
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const images = await preloadImages([...data.artists, ...data.tracks].map((i) => i.image));

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  dotGrid(ctx, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = INK;
  ctx.font = "800 68px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText('SUAS MÉTRICAS', PAD, 128);
  ctx.font = "500 26px 'Arimo', sans-serif";
  ctx.fillStyle = '#555';
  ctx.fillText(`${data.rangeLabel} · ${data.generatedLabel}`, PAD, 168);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, 198);
  ctx.lineTo(CARD_WIDTH - PAD, 198);
  ctx.stroke();

  let y = 248;
  y = drawSection(ctx, 'ARTISTAS MAIS OUVIDOS', data.artists.slice(0, 5), images, y);
  y += 36;
  drawSection(ctx, 'MÚSICAS MAIS OUVIDAS', data.tracks.slice(0, 5), images, y);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 10]);
  ctx.beginPath();
  ctx.moveTo(PAD, CARD_HEIGHT - 92);
  ctx.lineTo(CARD_WIDTH - PAD, CARD_HEIGHT - 92);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = INK;
  ctx.font = "italic 600 34px 'Instrument Serif', Georgia, serif";
  ctx.fillText('PiErCe', PAD, CARD_HEIGHT - 48);
  ctx.fillStyle = '#777';
  ctx.font = "500 20px 'Arimo', sans-serif";
  ctx.fillText('Music Companion — gerado a partir do seu Spotify', PAD + 128, CARD_HEIGHT - 50);

  return canvas;
}
