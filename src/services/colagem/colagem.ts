import type { LyricLine, TrackData } from '../../types';
import { hashString } from '../palette/trackPalette';

export const STAGE_W = 1280;
export const STAGE_H = 760;

/** Small seeded PRNG so every layout is stable for a given track. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const STOPWORDS = new Set((
  'that this with have from your what when will they them then than were been being into just like over only also ' +
  'more some such very much there their about would could should know dont cant wont aint gonna wanna cause ' +
  'para como mais mas por uma uns umas que com não nao você voce está esta estou isso esse essa dele dela eles elas ' +
  'meu minha seu sua nos nós tudo todo toda quando onde porque pois ainda sobre entre até ate sem sou são foi era ser ter'
).split(' '));

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}']+/gu)?.map((w) => w.replace(/^'+|'+$/g, '')) ?? [];
}

/** Most frequent meaningful words (4+ letters, no stopwords) of the lyrics; falls back to title/artist. */
export function pickDotWords(track: Pick<TrackData, 'title' | 'artist' | 'lyrics'>, limit = 24): string[] {
  const count = new Map<string, number>();
  const order: string[] = [];
  for (const line of track.lyrics) {
    for (const w of tokenize(line.text)) {
      if (w.length < 4 || STOPWORDS.has(w)) continue;
      if (!count.has(w)) order.push(w);
      count.set(w, (count.get(w) ?? 0) + 1);
    }
  }
  const ranked = order.sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || order.indexOf(a) - order.indexOf(b));
  if (ranked.length > 0) return ranked.slice(0, limit);
  const fallback = [...new Set([...tokenize(track.title), ...tokenize(track.artist)].filter((w) => w.length >= 2))];
  return fallback.slice(0, limit);
}

export interface Dot {
  x: number;
  y: number;
  r: number;
  color: 'a' | 'b' | 'ink';
  label: string;
  /** Left-zone dots sit over coloured blocks and need white labels. */
  onBlock: boolean;
  dur: number;
  delay: number;
}

const hit = (x: number, y: number, x0: number, x1: number, y0: number, y1: number) => x > x0 && x < x1 && y > y0 && y < y1;

/** Composition coordinates (1280x760 core). True where a dot would cover lyrics, notes, dock, title or glyphs. */
export function isProtected(cx: number, cy: number): boolean {
  return (
    hit(cx, cy, 470, 1255, 120, 585) || // lyrics + notes
    hit(cx, cy, 30, 440, 30, 265) || // big title
    hit(cx, cy, 30, 1250, 585, 745) || // dock
    hit(cx, cy, 440, 500, 90, 140) || // ✦
    hit(cx, cy, 1190, 1255, 235, 305) // ✺
  );
}

/** Offset of the 1280x760 composition inside a stage of w x h (stage is always >= the core). */
export const compOffset = (w: number, h: number) => ({ ox: Math.max(0, (w - STAGE_W) / 2), oy: Math.max(0, (h - STAGE_H) / 2) });

/** Stage coordinates, stage is w x h. The top-right corner is kept free for the Spotify panel. */
export function layoutDots(trackId: string, words: string[], w = STAGE_W, h = STAGE_H, count?: number): Dot[] {
  const total = count ?? Math.max(30, Math.min(70, Math.round((30 * w * h) / (STAGE_W * STAGE_H))));
  const { ox, oy } = compOffset(w, h);
  const rnd = seeded(hashString(trackId));
  const dots: Dot[] = [];
  for (let i = 0; i < 2000 && dots.length < total; i++) {
    const x = Math.round(rnd() * (w - 40));
    const y = Math.round(rnd() * (h - 40));
    const cx = x - ox, cy = y - oy;
    if (isProtected(cx, cy) || (x > w - 380 && y < 80)) continue;
    const onBlock = hit(cx, cy, 30, 450, 30, 590);
    const pick = rnd();
    const color = onBlock ? (pick > 0.5 ? 'b' : 'ink') : pick > 0.66 ? 'a' : pick > 0.33 ? 'b' : 'ink';
    const wantsLabel = words.length > 0 && rnd() > 0.3;
    dots.push({
      x, y, onBlock, color,
      r: Math.round(14 + rnd() * 12),
      label: wantsLabel ? words[Math.floor(rnd() * words.length)] : '',
      dur: Math.round((2.6 + rnd() * 2) * 10) / 10,
      delay: Math.round(rnd() * 20) / 10,
    });
  }
  return dots;
}

/** Split a title over two lines for the colour block. */
export function splitTitle(title: string): [string, string] {
  const t = title.trim();
  const words = t.split(/\s+/);
  if (words.length > 1) {
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (diff < bestDiff) { best = i; bestDiff = diff; }
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  if (t.length >= 6) {
    const cut = Math.ceil(t.length * 0.6);
    return [t.slice(0, cut), t.slice(cut)];
  }
  return [t, ''];
}

export function titleFontSize(lines: [string, string]): number {
  const longest = Math.max(lines[0].length, lines[1].length, 1);
  return Math.max(30, Math.min(104, Math.floor(356 / (longest * 0.6))));
}

/** Lyric font size shrinks for long lines so the current line never reaches the notes row. */
export function lyricFontSize(text: string): number {
  return text.length <= 40 ? 68 : text.length <= 70 ? 54 : 44;
}

export interface WordState { text: string; state: 'sung' | 'current' | 'next' | 'rest' }

/** Words of a lyric line coloured by progress; timing is spread evenly over the line. */
export function lyricWords(line: Pick<LyricLine, 'text' | 'startMs' | 'endMs'>, progressMs: number): WordState[] {
  const words = line.text.split(/\s+/).filter(Boolean);
  const span = Math.max(1, line.endMs - line.startMs);
  const frac = Math.min(0.999, Math.max(0, (progressMs - line.startMs) / span));
  const cur = Math.floor(frac * words.length);
  return words.map((text, i) => ({ text, state: i < cur ? 'sung' : i === cur ? 'current' : i === cur + 1 ? 'next' : 'rest' }));
}

const hash01 = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const GLYPHS = "ÆÉL5%#+i,'.:*Ü8";

/** One ASCII noise layer (cols x rows). `t` should be quantised by the caller (2 frames/s). */
export function asciiLayer(seed: number, threshold: number, t: number, cols = 178, rows = 58): string {
  const f = Math.floor(t * 2);
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let s = '';
    for (let x = 0; x < cols; x++) {
      const n = Math.sin(x * 0.13 + y * 0.21 + seed + t * 0.3) * Math.sin(x * 0.05 - y * 0.11 + seed * 2 + t * 0.2) + (hash01(x * 7 + y * 13 + seed + f) - 0.5) * 0.9;
      s += n > threshold ? GLYPHS[Math.floor(hash01(x + y * 97 + seed) * GLYPHS.length)] : ' ';
    }
    out.push(s);
  }
  return out.join('\n');
}

const RAMP = ' .·:+*#@';

/** "Capa viva": plasma-like ASCII picture; `k` (track seed) changes its shape per song. */
export function liveCover(t: number, k: number, cols = 55, rows = 17): string {
  const ph = k * 1.7;
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let s = '';
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot((x - cols / 2) * 0.55, y - rows / 2);
      let v = Math.sin(x * (0.22 + k * 0.04) + t * 1.1 + ph) + Math.sin(y * 0.5 - t * 0.8) + Math.sin(x * 0.12 + y * 0.3 + t * 0.6) + Math.sin(d * (0.6 + k * 0.1) - t * 2) * 1.2;
      v = Math.max(0, Math.min(0.999, (v + 4) / 8));
      s += RAMP[Math.floor(v * v * RAMP.length)];
    }
    out.push(s);
  }
  return out.join('\n');
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
