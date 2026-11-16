/**
 * Shares the CURRENT track as a fixed-ratio Instagram Stories image (1080×1920), built from a manually
 * picked lyric excerpt — never auto-picked. Two selectable templates, each modelled on a different kind
 * of lyric poster:
 *   - 'poster': a bold solid-colour field, big condensed playful caps type for the excerpt, the cover art
 *     as a small inset photo (shape picked per-track — square, circle, diamond or a hand-drawn blob), and
 *     the track title in the same oversized type at the bottom.
 *   - 'tags':   the cover art full-bleed as the background, with each word of the excerpt scattered across
 *     it — set in the SAME serif the app's own lyric view uses (Instrument Serif), mixing big plain words
 *     with small coloured pill-tags, scattered at random sizes/angles rather than in tidy rows, plus a
 *     corner ASCII flourish (with a little chromatic-aberration fringe) and a vignette.
 * In both, the type colour is the track's own dominant colour (the same one the Pontilhado/Vidro views use),
 * not a fixed palette — so every track's stories card looks like that track. Plain Canvas 2D, no dependency.
 */
import { getTrackPalette, INK } from '../palette/trackPalette';
import { liveCover } from '../colagem/colagem';
import { hashString } from '../palette/trackPalette';

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
const SERIF = "'Instrument Serif', Georgia, serif";

/** Deterministic 0..1 pseudo-random from an integer seed — reproducible per track, no RNG import needed. */
function rand01(seed: number): number {
  return (((seed + 1) * 2654435761) >>> 0) % 1000 / 1000;
}

// ---------------------------------------------------------------------------
// "PiErCe" ASCII wordmark — a small hand-built block font (just the 6 letters the mark needs), drawn as
// literal rows of '#' characters in a monospace face. Bigger and more "ASCII art" than a line of italic
// serif text, and reuses no external font file.
// ---------------------------------------------------------------------------
const ASCII_FONT: Record<string, string[]> = {
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  i: [' # ', '   ', ' # ', ' # ', ' # ', ' # ', ' # '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  r: ['    ', ' ## ', '#  #', '#   ', '#   ', '#   ', '#   '],
  C: [' ####', '#    ', '#    ', '#    ', '#    ', '#    ', ' ####'],
  e: ['     ', ' ### ', '#   #', '#####', '#    ', '#   #', ' ### '],
};
const ASCII_WORDMARK = 'PiErCe';

function asciiWordmarkRows(gap = 1): string[] {
  const rows: string[] = Array.from({ length: 7 }, () => '');
  [...ASCII_WORDMARK].forEach((ch, idx) => {
    const glyph = ASCII_FONT[ch] ?? ASCII_FONT.e;
    const last = idx === ASCII_WORDMARK.length - 1;
    glyph.forEach((row, r) => { rows[r] += row + (last ? '' : ' '.repeat(gap)); });
  });
  return rows;
}

/** Draws the "PiErCe" ASCII wordmark, sized to fit `maxWidth`, anchored so its bottom row sits near `bottomY`. */
function drawAsciiWordmark(
  ctx: CanvasRenderingContext2D, x: number, bottomY: number, color: string, align: 'left' | 'right', maxWidth: number,
): void {
  const rows = asciiWordmarkRows();
  const cols = rows[0].length;
  let size = 26;
  ctx.font = `700 ${size}px 'Courier New', monospace`;
  let charW = ctx.measureText('#').width;
  const totalW = () => charW * cols;
  if (totalW() > maxWidth) {
    size *= maxWidth / totalW();
    ctx.font = `700 ${size}px 'Courier New', monospace`;
    charW = ctx.measureText('#').width;
  }
  const lineH = size * 0.92;
  const topY = bottomY - rows.length * lineH + lineH;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  rows.forEach((row, i) => ctx.fillText(row, x, topY + i * lineH));
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

// ---------------------------------------------------------------------------
// Contrast-aware accent colour for the 'tags' template: `palette.a` is derived FROM the cover art, so on a
// photo whose dominant colour is close to it (an orange crowd shot with an orange accent, say), the tag
// pills and coloured words all but vanish into the background — "o fundo não destaca nem fudendo". Sampling
// the photo's own average colour and, when it's too close in hue or brightness to the accent, swapping in
// the complementary hue fixes that regardless of which track's palette is in play.
// ---------------------------------------------------------------------------
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  return rgbToHsl(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Circular hue distance in degrees (0..180). */
function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Downscales `img` to a few pixels and averages them — cheap "dominant colour" read of the whole photo. */
function sampleAverageColor(img: HTMLImageElement): { lum: number; hue: number } | null {
  try {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    if (!x) return null;
    x.drawImage(img, 0, 0, 16, 16);
    const data = x.getImageData(0, 0, 16, 16).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    r /= n; g /= n; b /= n;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return { lum, hue: rgbToHsl(r / 255, g / 255, b / 255).h };
  } catch {
    return null; // tainted canvas (cross-origin cover without CORS headers) — fall back to the plain palette
  }
}

/** Picks the pill-tag bg/fg for the 'tags' template: the track's own accent colour, unless the photo's own
 * dominant colour sits too close to it (in hue or brightness) to read against — then a high-contrast
 * complementary colour instead, so a tag never quietly disappears into a same-coloured photo. */
function pickTagAccent(img: HTMLImageElement | null, palette: { a: string; onA: string }): { bg: string; fg: string } {
  if (!img) return { bg: palette.a, fg: palette.onA };
  const avg = sampleAverageColor(img);
  if (!avg) return { bg: palette.a, fg: palette.onA };
  const aHsl = hexToHsl(palette.a);
  const tooClose = hueDist(avg.hue, aHsl.h) < 50 || Math.abs(avg.lum - aHsl.l * 255) < 45;
  if (!tooClose) return { bg: palette.a, fg: palette.onA };
  const contrastHue = (avg.hue + 150) % 360;
  const bgLight = avg.lum < 140; // dark photo -> light pill; bright photo -> dark pill, for max separation
  return { bg: `hsl(${Math.round(contrastHue)}, 75%, ${bgLight ? 78 : 24}%)`, fg: bgLight ? '#14142b' : '#ffffff' };
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

/** A hand-drawn-looking irregular blob of roughly radius `r`, deterministic from `seed` — one of the poster's cover shapes. */
function blobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number): void {
  const n = 10;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rad = r * (0.76 + rand01(seed + i * 17) * 0.4);
    return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad };
  });
  ctx.beginPath();
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const next = mid(pts[i], pts[(i + 1) % n]);
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, next.x, next.y);
  }
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

/** The house signature: a tiny plasma-ASCII stamp (same generator as the "capa viva" live cover art), with a
 * faint red/cyan fringe offset either side to read as a little chromatic-aberration glitch. */
function asciiCornerStamp(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, align: 'left' | 'right' = 'left'): void {
  const art = liveCover(seed * 0.4, seed, 12, 4);
  const linesArr = art.split('\n');
  ctx.save();
  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = align;
  ctx.globalCompositeOperation = 'screen';
  const draw = (dx: number, color: string) => {
    ctx.fillStyle = color;
    linesArr.forEach((line, i) => ctx.fillText(line, x + dx, y + i * 13));
  };
  draw(-2, 'rgba(255,60,90,.5)');
  draw(2, 'rgba(60,200,255,.5)');
  draw(0, 'rgba(255,255,255,.4)');
  ctx.restore();
}

/** Soft radial vignette — darkens the corners a touch so scattered text/tags always have somewhere to sit. */
function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.5): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.78);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
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

/** Cover shapes the poster picks from, one per track (deterministic), so not every card is the same tilted square. */
type CoverShape = 'square' | 'circle' | 'diamond' | 'blob';
const COVER_SHAPES: CoverShape[] = ['square', 'circle', 'diamond', 'blob'];

function clipCoverShape(ctx: CanvasRenderingContext2D, shape: CoverShape, size: number, seed: number): void {
  const half = size / 2;
  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.closePath();
      break;
    case 'diamond': {
      const r = half * 1.12;
      ctx.beginPath();
      ctx.moveTo(half, half - r);
      ctx.lineTo(half + r, half);
      ctx.lineTo(half, half + r);
      ctx.lineTo(half - r, half);
      ctx.closePath();
      break;
    }
    case 'blob':
      blobPath(ctx, half, half, half * 1.02, seed);
      break;
    default:
      roundRect(ctx, 0, 0, size, size, 10);
  }
}

async function renderPoster(ctx: CanvasRenderingContext2D, data: StoryCardData, img: HTMLImageElement | null): Promise<void> {
  const palette = await getTrackPalette({ id: `${data.title}:${data.artist}`, coverImage: data.image });
  const seed = hashString(`${data.title}:${data.artist}`);

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

  // cover inset — shape picked per track (square / circle / diamond / blob), "brincando com formatos", at a
  // deterministic-but-varied tilt so not every card tilts the same -3°.
  const coverX = PAD;
  const coverY = ly - size * 0.8 + POSTER_GAP1;
  const shape = COVER_SHAPES[seed % COVER_SHAPES.length];
  const tiltDeg = -8 + rand01(seed) * 16;
  if (img) {
    ctx.save();
    ctx.translate(coverX + coverSize / 2, coverY + coverSize / 2);
    ctx.rotate(tiltDeg * (Math.PI / 180));
    ctx.translate(-coverSize / 2, -coverSize / 2);
    clipCoverShape(ctx, shape, coverSize, seed);
    ctx.save(); ctx.clip(); drawCover(ctx, img, 0, 0, coverSize, coverSize); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 5;
    clipCoverShape(ctx, shape, coverSize, seed);
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

  // a second, smaller playful shape scattered near the cover — pure decoration, varies per track
  const trinketShape = COVER_SHAPES[(seed + 1) % COVER_SHAPES.length];
  const trinketSize = coverSize * 0.22;
  ctx.save();
  ctx.translate(coverX + coverSize + 140 + rand01(seed + 3) * 40, coverY + coverSize - trinketSize * 0.6);
  ctx.rotate(rand01(seed + 5) * Math.PI * 2);
  ctx.translate(-trinketSize / 2, -trinketSize / 2);
  clipCoverShape(ctx, trinketShape, trinketSize, seed + 9);
  ctx.fillStyle = hexWithAlpha(palette.a, 0.5);
  ctx.fill();
  ctx.restore();

  // house signature, top-right corner, with its little chromatic-aberration fringe
  asciiCornerStamp(ctx, STORY_WIDTH - PAD, 70, seed, 'right');

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

  // footer, always pinned to the bottom regardless of how tall the composition above ended up — the house
  // wordmark as a bigger ASCII block logo instead of a small line of italic serif text.
  const footY = STORY_HEIGHT - 50;
  drawAsciiWordmark(ctx, PAD, footY, palette.a, 'left', 560);
}

function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// 'tags' template — cover photo full-bleed, lyric words scattered in the app's own serif, mixing big plain
// words with small colour pill-tags — not a tidy grid of uniform boxes.
// ---------------------------------------------------------------------------

interface TagWord { text: string; isTag: boolean; size: number; rot: number; colorAccent: boolean; w: number; line: number }

async function renderTags(ctx: CanvasRenderingContext2D, data: StoryCardData, img: HTMLImageElement | null): Promise<void> {
  const palette = await getTrackPalette({ id: `${data.title}:${data.artist}`, coverImage: data.image });
  const seed = hashString(`${data.title}:${data.artist}`);

  if (img) {
    drawCover(ctx, img, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  } else {
    ctx.fillStyle = palette.deep;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  }

  drawVignette(ctx, STORY_WIDTH, STORY_HEIGHT, 0.46);

  // bottom gradient so the footer always reads
  const fade = ctx.createLinearGradient(0, STORY_HEIGHT - 460, 0, STORY_HEIGHT);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, STORY_HEIGHT - 460, STORY_WIDTH, 460);

  asciiCornerStamp(ctx, PAD, 68, seed, 'left');

  // The pill/accent colour is the track's `palette.a` — but that colour is itself derived from the cover,
  // so on a photo whose own dominant colour sits close to it (an orange carnival shot with an orange
  // accent, say) every tag and coloured word quietly vanishes into the background. `pickTagAccent` samples
  // the photo and swaps in a contrasting colour whenever that happens.
  const { bg: tagBg, fg: tagFg } = pickTagAccent(img, palette);

  // No hard cap on word count — a fixed slice used to silently drop whatever didn't fit. Every word of the
  // excerpt always renders, in the app's own lyric typeface (Instrument Serif) — most words set big and
  // plain straight over the photo (with a dark halo for legibility), roughly a third picked out as small
  // coloured pill-tags (the same "sung word" treatment the real lyric view uses), each at its own slight
  // random size and tilt so the whole thing reads as a loose, hand-scattered collage, not a grid.
  //
  // Each word remembers which SELECTED LINE it came from (`line`), and a row never mixes words from two
  // different lines — a wrapped line just continues onto the next row, but a new selected line always
  // starts its own fresh row, with extra breathing room before it. Without this, a scattered word-cloud
  // reads as one jumbled mess with no sense of where one picked verse ends and the next begins.
  const wordLines = data.lines.map((l) => l.trim().split(/\s+/).filter(Boolean));
  const topY = 230;
  const bottomY = STORY_HEIGHT - 560;
  const usableW = STORY_WIDTH - PAD * 2;

  const buildWords = (scale: number): TagWord[] => {
    let i = 0;
    const out: TagWord[] = [];
    wordLines.forEach((lineWords, line) => {
      lineWords.forEach((text) => {
        const isTag = rand01(seed + i * 11) < 0.32;
        const base = isTag ? 34 + rand01(seed + i * 5) * 14 : 56 + rand01(seed + i * 3) * 26;
        const size = Math.max(18, base * scale);
        const rot = (rand01(seed + i * 19) - 0.5) * (isTag ? 10 : 8);
        const colorAccent = !isTag && rand01(seed + i * 23) < 0.22;
        ctx.font = `400 ${size}px ${SERIF}`;
        const w = ctx.measureText(text).width;
        out.push({ text, isTag, size, rot, colorAccent, w, line });
        i++;
      });
    });
    return out;
  };

  const wrapIntoRows = (list: TagWord[]): { row: TagWord[]; h: number; stanzaStart: boolean }[] => {
    const rows: { row: TagWord[]; h: number; stanzaStart: boolean }[] = [];
    let row: TagWord[] = [];
    let rowW = 0;
    let rowH = 0;
    const gap = 22;
    const flush = () => { if (row.length) { rows.push({ row, h: rowH, stanzaStart: false }); row = []; rowW = 0; rowH = 0; } };
    let prevLine = -1;
    for (const tw of list) {
      const boxW = tw.w + (tw.isTag ? 44 : 10);
      const newStanza = tw.line !== prevLine;
      const extra = row.length ? gap + boxW : boxW;
      if (row.length && (newStanza || rowW + extra > usableW)) flush();
      row.push(tw);
      rowW += row.length === 1 ? boxW : gap + boxW;
      rowH = Math.max(rowH, tw.size * (tw.isTag ? 1.5 : 1.3));
      prevLine = tw.line;
    }
    flush();
    // Mark the first row of each new selected line so rendering can give it extra breathing room above it.
    let lastLine = -2;
    rows.forEach((r) => {
      const firstLine = r.row[0].line;
      r.stanzaStart = firstLine !== lastLine;
      lastLine = firstLine;
    });
    return rows;
  };

  const rowGap = 14;
  const stanzaGap = 44;
  const gapAbove = (r: { stanzaStart: boolean }, idx: number) => (idx === 0 ? 0 : r.stanzaStart ? stanzaGap : rowGap);

  let scale = 1;
  let rows = wrapIntoRows(buildWords(scale));
  let totalH = rows.reduce((s, r, i) => s + r.h + gapAbove(r, i), 0);
  const availH = bottomY - topY;
  if (totalH > availH && totalH > 0) {
    scale = Math.max(0.42, scale * (availH / totalH));
    rows = wrapIntoRows(buildWords(scale));
    totalH = rows.reduce((s, r, i) => s + r.h + gapAbove(r, i), 0);
  }
  const blockStartY = topY + Math.max(0, (availH - totalH) / 2);

  let y = blockStartY;
  rows.forEach((r, ri) => {
    y += gapAbove(r, ri);
    const rowWidth = r.row.reduce((s, tw, i) => s + tw.w + (tw.isTag ? 44 : 10) + (i ? 22 : 0), 0);
    const jitter = rand01(seed + ri * 31);
    let x = PAD + Math.max(0, usableW - rowWidth) * jitter;
    const baseline = y + r.h * 0.74;
    r.row.forEach((tw) => {
      const boxW = tw.w + (tw.isTag ? 44 : 10);
      const cx = x + boxW / 2;
      const vJitter = (rand01(seed + ri * 7 + tw.text.length) - 0.5) * 10;
      ctx.save();
      ctx.translate(cx, baseline + vJitter);
      ctx.rotate((tw.rot * Math.PI) / 180);
      ctx.font = `400 ${tw.size}px ${SERIF}`;
      ctx.textAlign = 'center';
      if (tw.isTag) {
        // a soft drop shadow under the pill itself too — on a busy photo even a contrasting flat colour
        // can lose its edges, so the pill gets a little lift of its own, same as the plain words below.
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.5)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 3;
        roundRect(ctx, -boxW / 2, -tw.size * 0.84, boxW, tw.size * 1.2, tw.size * 0.3);
        ctx.fillStyle = tagBg;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = tagFg;
        ctx.fillText(tw.text, 0, 0);
      } else {
        // dark outline + shadow halo, strong enough to read on any photo regardless of colour — "arruma
        // isso criando uma sombra maior" — a colour-only fix can't save a word sitting on same-hue detail.
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, tw.size * 0.16);
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.strokeText(tw.text, 0, 0);
        ctx.shadowColor = 'rgba(0,0,0,.7)';
        ctx.shadowBlur = 22;
        ctx.fillStyle = tw.colorAccent ? tagBg : '#ffffff';
        ctx.fillText(tw.text, 0, 0);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      x += boxW + 22;
    });
    y += r.h;
  });
  ctx.textAlign = 'left';

  const footY = STORY_HEIGHT - 70;
  ctx.fillStyle = '#fff';
  ctx.font = "700 30px 'Arimo', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(data.title, PAD, footY - 30);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.font = "500 22px 'Arimo', sans-serif";
  ctx.fillText(data.artist, PAD, footY);
  drawAsciiWordmark(ctx, STORY_WIDTH - PAD, footY, palette.a, 'right', 300);
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
