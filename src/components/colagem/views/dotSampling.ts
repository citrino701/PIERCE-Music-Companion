import { dither, normalizePoints, STAGE_H, STAGE_W, type Shape } from './dotShapes';
import { normalizeWord, seedFromId } from '../../../services/views/rhythm';

const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

/** Dither a word set in Archivo 900 inside the 1360×560 area at (40,120). The blur gives the edges a gradient the dither turns into stipple. */
export function sampleWord(word: string): Shape {
  const W = 1360, H = 560, step = 11;
  const c = makeCanvas(W, H);
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return normalizePoints([], seedFromId(word));
  x.font = "900 100px 'Archivo', 'Arimo', sans-serif";
  const mw = x.measureText(word).width || 100;
  const fs = Math.min(420, ((W - 80) / mw) * 100);
  x.font = `900 ${fs}px 'Archivo', 'Arimo', sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if ('filter' in x) x.filter = 'blur(12px)';
  x.fillText(word, W / 2, H / 2);
  const d = x.getImageData(0, 0, W, H).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < H; y += step) for (let X = 0; X < W; X += step) {
    if (dither(d[(y * W + X) * 4 + 3] / 255, X / step, y / step)) pts.push([40 + X, 120 + y]);
  }
  return normalizePoints(pts, seedFromId(word));
}

/** Cover as stipple: bright areas become dots. Falls back to a soft disc when the image is missing or taints the canvas. */
export function sampleCover(img: HTMLImageElement | null, seedKey: string): Shape {
  const size = 600, step = 12, pts: [number, number][] = [];
  let data: Uint8ClampedArray | null = null;
  if (img && img.naturalWidth) {
    try {
      const c = makeCanvas(size, size);
      const x = c.getContext('2d', { willReadFrequently: true });
      x?.drawImage(img, 0, 0, size, size);
      data = x ? x.getImageData(0, 0, size, size).data : null;
    } catch { data = null; }
  }
  for (let y = 0; y < size; y += step) for (let X = 0; X < size; X += step) {
    let bright: number;
    if (data) {
      const i = (y * size + X) * 4;
      const lum = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
      bright = Math.min(1, Math.max(0, lum * 1.7 - 0.45));
    } else bright = Math.max(0, 1 - Math.hypot(X - size / 2, y - size / 2) / (size / 2));
    if (dither(bright, X / step, y / step)) pts.push([420 + X, 100 + y]);
  }
  return normalizePoints(pts, seedFromId(`cover:${seedKey}`), { x: 420, y: 100, w: size, h: size });
}

export const wordKey = (w: string): string => normalizeWord(w) || w.toLowerCase();

export function glowSprite(): HTMLCanvasElement {
  const c = makeCanvas(21, 21);
  const x = c.getContext('2d');
  if (x) {
    x.shadowColor = 'rgba(243,238,230,.35)'; x.shadowBlur = 6;
    x.fillStyle = '#F3EEE6'; x.fillRect(7, 7, 7, 7);
  }
  return c;
}

export const FRAME = { w: STAGE_W, h: STAGE_H };
