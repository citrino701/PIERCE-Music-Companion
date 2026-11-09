import { rng } from '../../../services/views/rhythm';

export const N_DOTS = 1100;
export const STAGE_W = 1440;
export const STAGE_H = 900;
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export interface Shape { x: Float32Array; y: Float32Array; a: Float32Array }

/** Ordered-dither decision for one sample: `value` is 0..1 coverage (alpha or brightness). */
export const dither = (value: number, gx: number, gy: number): boolean => {
  const th = (BAYER[(gy % 4) * 4 + (gx % 4)] + 0.5) / 16;
  return value > th * 0.92 + 0.04;
};

/** Exactly N points: subsample evenly if there are too many, pad with invisible random points if too few, then shuffle with a fixed seed. */
export function normalizePoints(pts: [number, number][], seed: number, area = { x: 40, y: 120, w: 1360, h: 560 }, n = N_DOTS): Shape {
  const rnd = rng(seed);
  const out: [number, number, number][] = [];
  if (pts.length > n) for (let i = 0; i < n; i++) { const p = pts[Math.floor((i * pts.length) / n)]; out.push([p[0], p[1], 1]); }
  else {
    for (const p of pts) out.push([p[0], p[1], 1]);
    while (out.length < n) out.push([area.x + rnd() * area.w, area.y + rnd() * area.h, 0]);
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  const s: Shape = { x: new Float32Array(n), y: new Float32Array(n), a: new Float32Array(n) };
  out.forEach((p, i) => { s.x[i] = p[0]; s.y[i] = p[1]; s.a[i] = p[2]; });
  return s;
}

/** One frame of motion for one dot. Returns the new [x, y]. */
export function stepDot(x: number, y: number, tx: number, ty: number, kick: number, mouse: { x: number; y: number } | null): [number, number] {
  let nx = x, ny = y;
  // beat: scale about (720, 420)
  const cx = 720, cy = 420, bs = 1 + 0.035 * kick;
  let gx = tx, gy = ty;
  gx = cx + (gx - cx) * bs; gy = cy + (gy - cy) * bs;
  nx += (gx - nx) * 0.12; ny += (gy - ny) * 0.12;
  if (mouse) {
    const dx = nx - mouse.x, dy = ny - mouse.y, d = Math.hypot(dx, dy);
    if (d < 150 && d > 0.001) { const f = (1 - d / 150) * 90; nx += (dx / d) * f; ny += (dy / d) * f * 0.6 - f * 0.4; }
  }
  return [nx, ny];
}

/** "Cover mode": paused, before the first line, a gap, the tail of a line, or no synced lyrics. */
export function isCoverMode(o: { paused: boolean; hasLyrics: boolean; index: number; gap: boolean; now: number; sungEnd?: number }): boolean {
  if (o.paused || !o.hasLyrics || o.index < 0 || o.gap || o.sungEnd == null) return true;
  return o.now > o.sungEnd + 0.2;
}
