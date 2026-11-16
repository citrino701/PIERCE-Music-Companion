/**
 * Shares the CURRENT track as a fixed-ratio Instagram Stories image (1080×1920), built from a manually
 * picked lyric excerpt — never auto-picked. Two selectable templates, each modelled on a different kind
 * of lyric poster:
 *   - 'poster': a bold solid-colour field, big condensed playful caps type for the excerpt, the cover art
 *     as a small inset photo, and the track title in the same oversized type at the bottom.
 *   - 'tags':   the cover art full-bleed as the background, with each word of the excerpt scattered across
 *     it in its own small colour tag.
 * In both, the type colour is the track's own dominant colour (the same one the Pontilhado/Vidro views use),
 * not a fixed palette — so every track's stories card looks like that track. Plain Canvas 2D, no dependency.
 */
import { getTrackPalette, INK } from '../palette/trackPalette';

export type StoryTemplate = 'poster' | 'tags';

export interface StoryCardData {
  template: StoryTemplate;
  title: string;
  artist: string;
  /** Cover art URL; '' falls back to a plain dark background. */
  image: string;
  /** The lyric excerpt the user selected, in order, one entry per sung line. */
  lines: string[];
}

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxWidth) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

/** Flattens the selected lyric lines into word-wrapped visual lines for a given font/width. */
export function layoutLyricLines(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number): string[] {
  const out: string[] = [];
  lines.forEach((line) => { out.push(...wrapWords(ctx, line.trim().split(/\s+/).filter(Boolean), maxWidth)); });
  return out;
}

/** Condensed-looking bold caps: a slight horizontal squeeze on an otherwise ordinary bold sans — playful, poster-like, no special font file needed. */
function drawCondensed(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, weight: number, size: number, color: string, squeeze = 0.86,
): void {
  ctx.save();
  ctx.font = `${weight} ${size}px 'Arimo', 'Helvetica Neue', Arial, sans-serif`;
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function condensedWidth(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, squeeze = 0.86): number {
  ctx.font = `${weight} ${size}px 'Arimo', 'Helvetica Neue', Arial, sans-serif`;
  return ctx.measureText(text).width * squeeze;
}

// ---------------------------------------------------------------------------
// 'poster' template — bold colour field, big playful caps, cover as a small inset photo
// ---------------------------------------------------------------------------

/**
 * Biggest-tier-that-fits: a short excerpt should look like a bold intentional choice (huge type, big cover),
 * not a small amount of content lost in a mostly-empty frame. Tries tiers from boldest to most compact and
 * keeps the first whose total composition height fits the available vertical space.
 */
const POSTER_TIERS = [
  { size: 128, lineH: 142, cover: 360 },
  { size: 104, lineH: 116, cover: 340 },
  { size: 88, lineH: 98, cover: 320 },
  { size: 74, lineH: 82, cover: 300 },
  { size: 62, lineH: 70, cover: 280 },
  { size: 52, lineH: 58, cover: 260 },
  { size: 44, lineH: 50, cover: 240 },
];
const POSTER_GAP1 = 46; // lyric block -> cover
const POSTER_GAP2 = 84; // artist line -> title
const POSTER_TITLE_ESTIMATE = 110;
const POSTER_TOP_MARGIN = 130;
const POSTER_FOOTER_RESERVE = 150;

async function renderPoster(ctx: CanvasRenderingContext2D, data: StoryCardData, img: HTMLImageElement | null): Promise<void> {
  const palette = await getTrackPalette({ id: `${data.title}:${data.artist}`, coverImage: data.image });

  // near-black field: `palette.a` is tuned (in trackPalette.ts) for contrast against white OR this exact
  // ink, so pairing it with any other background risks the text blending in, as deep (same hue as `a`) did.
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const upperLines = data.lines.map((l) => l.trim().toUpperCase());
  const availableHeight = STORY_HEIGHT - POSTER_TOP_MARGIN - POSTER_FOOTER_RESERVE;

  // No hard cap on visual-line count here either — the smallest tier below (44px) already fits well over
  // the MAX_LINES=8 the picker allows, so a fixed slice() was just a way to silently lose lines, same bug
  // as the tags template had.
  let chosen = POSTER_TIERS[POSTER_TIERS.length - 1];
  let visual = upperLines;
  for (const tier of POSTER_TIERS) {
    ctx.font = `800 ${tier.size}px 'Arimo', 'Helvetica Neue', Arial, sans-serif`;
    const candidate = layoutLyricLines(ctx, upperLines, (STORY_WIDTH - PAD * 2) / 0.86);
    const total = candidate.length * tier.lineH + POSTER_GAP1 + tier.cover + 56 + POSTER_GAP2 + POSTER_TITLE_ESTIMATE;
    if (total <= availableHeight) { chosen = tier; visual = candidate; break; }
    chosen = tier;
    visual = candidate;
  }
  const { size, lineH, cover: coverSize } = chosen;

  const blockHeight = visual.length * lineH + POSTER_GAP1 + coverSize + 56 + POSTER_GAP2 + POSTER_TITLE_ESTIMATE;
  const startY = POSTER_TOP_MARGIN + Math.max(0, (availableHeight - blockHeight) / 2) + size * 0.8;

  let ly = startY;
  visual.forEach((line) => {
    drawCondensed(ctx, line, PAD, ly, 800, size, palette.a);
    ly += lineH;
  });

  // cover inset, small, rotated — "a imagem representando a capa"
  const coverX = PAD;
  const coverY = ly - size * 0.8 + POSTER_GAP1;
  if (img) {
    ctx.save();
    ctx.translate(coverX + coverSize / 2, coverY + coverSize / 2);
    ctx.rotate(-3 * (Math.PI / 180));
    ctx.translate(-coverSize / 2, -coverSize / 2);
    roundRect(ctx, 0, 0, coverSize, coverSize, 10);
    ctx.save(); ctx.clip(); drawCover(ctx, img, 0, 0, coverSize, coverSize); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 5;
    roundRect(ctx, 0, 0, coverSize, coverSize, 10);
    ctx.stroke();
    ctx.restore();
  }

  // small dot cluster accent (Pontilhado signature) beside the cover
  ctx.fillStyle = palette.a;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(coverX + coverSize + 70 + Math.cos(a) * 22, coverY + 60 + Math.sin(a) * 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // artist, small italic script-ish accent
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = "italic 600 32px 'Instrument Serif', Georgia, serif";
  ctx.fillText(data.artist, coverX, coverY + coverSize + 56);

  // big title, same condensed caps treatment, right after the artist line (not pinned to a fixed bottom y).
  // Positioned by its TOP (+ its own ascent), not by baseline straight off the artist line, so a huge title
  // size never climbs back up into the artist text above it.
  const titleTopY = coverY + coverSize + 56 + POSTER_GAP2;
  const titleUpper = data.title.toUpperCase();
  let titleSize = 92;
  while (titleSize > 44 && condensedWidth(ctx, titleUpper, 800, titleSize) > STORY_WIDTH - PAD * 2) titleSize -= 4;
  const titleBaselineY = Math.min(titleTopY + titleSize * 0.78, STORY_HEIGHT - 150);
  drawCondensed(ctx, titleUpper, PAD, titleBaselineY, 800, titleSize, '#ffffff');

  // footer, always pinned to the bottom regardless of how tall the composition above ended up
  const footY = STORY_HEIGHT - 60;
  ctx.fillStyle = palette.a;
  ctx.font = "italic 700 30px 'Instrument Serif', Georgia, serif";
  ctx.fillText('PiErCe', PAD, footY);
}

// ---------------------------------------------------------------------------
// 'tags' template — cover photo full-bleed, each word of the excerpt as its own scattered tag
// ---------------------------------------------------------------------------

async function renderTags(ctx: CanvasRenderingContext2D, data: StoryCardData, img: HTMLImageElement | null): Promise<void> {
  const palette = await getTrackPalette({ id: `${data.title}:${data.artist}`, coverImage: data.image });

  if (img) {
    drawCover(ctx, img, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  } else {
    ctx.fillStyle = palette.deep;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  }

  // bottom gradient so the footer always reads
  const fade = ctx.createLinearGradient(0, STORY_HEIGHT - 460, 0, STORY_HEIGHT);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, STORY_HEIGHT - 460, STORY_WIDTH, 460);

  // No hard cap on word count — a fixed slice(0, 10) used to silently drop whatever didn't fit, which is how
  // the last words of a longer excerpt (e.g. 6 of the allowed 8 lines) went missing. Instead, the whole
  // excerpt is always shown: it's laid out as wrapped rows of tags (several words per row, like the torn-
  // collage reference) and the biggest tag size that lets every word fit in the available vertical space wins.
  const words = data.lines.flatMap((l) => l.trim().split(/\s+/).filter(Boolean));
  const textColor = palette.onA;
  const topY = 240;
  const bottomY = STORY_HEIGHT - 560;
  const usableW = STORY_WIDTH - PAD * 2;

  const TAG_TIERS = [
    { size: 64, padX: 26, padY: 20, gap: 18, rowH: 106 },
    { size: 54, padX: 24, padY: 18, gap: 16, rowH: 92 },
    { size: 46, padX: 22, padY: 16, gap: 14, rowH: 80 },
    { size: 38, padX: 20, padY: 14, gap: 12, rowH: 68 },
    { size: 32, padX: 18, padY: 12, gap: 10, rowH: 58 },
    { size: 26, padX: 16, padY: 10, gap: 9, rowH: 48 },
  ];

  const wrapIntoRows = (size: number, padX: number, gap: number): string[][] => {
    ctx.font = `800 ${size}px 'Arimo', 'Helvetica Neue', Arial, sans-serif`;
    const rows: string[][] = [];
    let row: string[] = [];
    let rowW = 0;
    for (const w of words) {
      const tagW = ctx.measureText(w).width + padX * 2;
      const extra = row.length ? gap + tagW : tagW;
      if (row.length && rowW + extra > usableW) { rows.push(row); row = []; rowW = 0; }
      row.push(w);
      rowW += row.length === 1 ? tagW : gap + tagW;
    }
    if (row.length) rows.push(row);
    return rows;
  };

  let tier = TAG_TIERS[TAG_TIERS.length - 1];
  let rows = wrapIntoRows(tier.size, tier.padX, tier.gap);
  for (const t of TAG_TIERS) {
    const candidateRows = wrapIntoRows(t.size, t.padX, t.gap);
    if (candidateRows.length * t.rowH <= bottomY - topY) { tier = t; rows = candidateRows; break; }
    tier = t;
    rows = candidateRows;
  }

  ctx.font = `800 ${tier.size}px 'Arimo', 'Helvetica Neue', Arial, sans-serif`;
  rows.forEach((row, ri) => {
    const rowJitter = (((ri + 1) * 2654435761) >>> 0) % 1000 / 1000;
    const rowWidth = row.reduce((sum, w, i) => sum + ctx.measureText(w).width + tier.padX * 2 + (i ? tier.gap : 0), 0);
    let x = PAD + Math.max(0, (usableW - rowWidth)) * (0.15 + rowJitter * 0.3);
    const y = topY + ri * tier.rowH;
    row.forEach((w) => {
      const tw = ctx.measureText(w).width;
      ctx.fillStyle = palette.a;
      roundRect(ctx, x, y - tier.size, tw + tier.padX * 2, tier.size + tier.padY, 8);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.fillText(w, x + tier.padX, y - tier.size * 0.22);
      x += tw + tier.padX * 2 + tier.gap;
    });
  });

  const footY = STORY_HEIGHT - 70;
  ctx.fillStyle = '#fff';
  ctx.font = "700 30px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(data.title, PAD, footY - 30);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.font = "500 22px 'Arimo', sans-serif";
  ctx.fillText(data.artist, PAD, footY);
  ctx.fillStyle = palette.a;
  ctx.font = "italic 700 28px 'Instrument Serif', Georgia, serif";
  ctx.textAlign = 'right';
  ctx.fillText('PiErCe', STORY_WIDTH - PAD, footY);
  ctx.textAlign = 'left';
}

export async function renderStoryCard(data: StoryCardData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const img = await loadImage(data.image);
  if (data.template === 'tags') await renderTags(ctx, data, img);
  else await renderPoster(ctx, data, img);

  return canvas;
}
