import type { TrackData, TrackPalette } from '../../types';

export const INK = '#14142b';

export interface Hsl { h: number; s: number; l: number }

export function hslToHex({ h, s, l }: Hsl): string {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Darken (reduce lightness) until `fg` has at least `min` contrast against `against`. */
function darkenUntil(hsl: Hsl, against: string, min: number): string {
  let l = hsl.l;
  let hex = hslToHex({ ...hsl, l });
  while (contrastRatio(hex, against) < min && l > 0.05) {
    l -= 0.02;
    hex = hslToHex({ ...hsl, l });
  }
  return hex;
}

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Main colour: nudge lightness until white or ink text reads on it (>= 4.5). */
function readableAccent(h: number): string {
  let l = 0.55;
  let hex = hslToHex({ h, s: 0.85, l });
  for (let i = 0; i < 20; i++) {
    const white = contrastRatio(hex, '#ffffff');
    const ink = contrastRatio(hex, INK);
    if (Math.max(white, ink) >= 4.5) break;
    l += white >= ink ? -0.02 : 0.02;
    hex = hslToHex({ h, s: 0.85, l });
  }
  return hex;
}

/** Build a full palette from two hues (b is forced to be >= 60° from a). */
export function paletteFromHues(hueA: number, hueB?: number): TrackPalette {
  const hb = hueB !== undefined && hueDistance(hueA, hueB) > 60 ? hueB : (hueA + 180) % 360;
  const bg = hslToHex({ h: hueA, s: 0.08, l: 0.92 });
  const a = readableAccent(hueA);
  const b = darkenUntil({ h: hb, s: 0.7, l: 0.5 }, '#ffffff', 4.5);
  const deep = darkenUntil({ h: hueA, s: 0.8, l: 0.5 }, bg, 4.5);
  const onA = contrastRatio(a, '#ffffff') >= contrastRatio(a, INK) ? '#ffffff' : INK;
  return { bg, a, b, deep, onA };
}

/** Deterministic fallback: FNV-1a hash of the track id picks the hue. */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function paletteFromId(id: string): TrackPalette {
  const h = hashString(id);
  return paletteFromHues(h % 360, (h >>> 9) % 360);
}

/**
 * Pick the two dominant hues of an RGBA pixel buffer (e.g. a 32x32 downscale of the cover).
 * Returns null when the image has no colourful pixels (black & white cover).
 */
export function dominantHues(rgba: ArrayLike<number>): { a: number; b?: number } | null {
  const BINS = 24;
  const weight = new Array<number>(BINS).fill(0);
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const { h, s, l } = rgbToHsl(rgba[i], rgba[i + 1], rgba[i + 2]);
    if (s < 0.25 || l < 0.15 || l > 0.9) continue;
    weight[Math.floor(h / (360 / BINS)) % BINS] += s * (1 - Math.abs(2 * l - 1));
  }
  const binHue = (i: number) => (i + 0.5) * (360 / BINS);
  const order = weight.map((w, i) => ({ w, i })).filter((x) => x.w > 0).sort((x, y) => y.w - x.w);
  if (order.length === 0) return null;
  const a = binHue(order[0].i);
  const second = order.find((x) => hueDistance(binHue(x.i), a) > 60);
  return { a, b: second ? binHue(second.i) : undefined };
}

export function paletteFromPixels(rgba: ArrayLike<number>): TrackPalette | null {
  const hues = dominantHues(rgba);
  return hues ? paletteFromHues(hues.a, hues.b) : null;
}

const cache = new Map<string, TrackPalette>();

function readCoverPixels(src: string): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('no 2d context');
        ctx.drawImage(img, 0, 0, 32, 32);
        resolve(ctx.getImageData(0, 0, 32, 32).data); // throws if the canvas is tainted (CORS)
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('cover failed to load'));
    img.src = src;
  });
}

/** Synchronous palette used until (or instead of) the cover-based one. */
export function fallbackPalette(track: Pick<TrackData, 'id'>): TrackPalette {
  return cache.get(track.id) ?? paletteFromId(track.id);
}

/** Palette from the cover; falls back to the id hash when the cover is missing or unreadable. */
export async function getTrackPalette(track: Pick<TrackData, 'id' | 'coverImage'>): Promise<TrackPalette> {
  const hit = cache.get(track.id);
  if (hit) return hit;
  let palette: TrackPalette | null = null;
  if (track.coverImage) {
    try {
      palette = paletteFromPixels(await readCoverPixels(track.coverImage));
    } catch {
      palette = null;
    }
  }
  const result = palette ?? paletteFromId(track.id);
  cache.set(track.id, result);
  return result;
}
