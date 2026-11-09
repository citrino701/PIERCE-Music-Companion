import test from 'node:test';
import assert from 'node:assert/strict';
import { N_DOTS, dither, isCoverMode, normalizePoints, stepDot } from './dotShapes.ts';

test('normalizePoints always returns N points and is deterministic', () => {
  const few: [number, number][] = [[50, 130], [60, 140]];
  const a = normalizePoints(few, 1), b = normalizePoints(few, 1);
  assert.equal(a.x.length, N_DOTS);
  assert.deepEqual(Array.from(a.x), Array.from(b.x));
  assert.equal(a.a.reduce((s, v) => s + v, 0), 2);
  const many: [number, number][] = Array.from({ length: 3000 }, (_, i) => [i, i]);
  assert.equal(normalizePoints(many, 1).a.reduce((s, v) => s + v, 0), N_DOTS);
});

test('dither is monotonic in coverage', () => {
  assert.equal(dither(0, 0, 0), false);
  assert.equal(dither(1, 3, 3), true);
});

test('dots converge to their target and wind pushes them away', () => {
  let [x, y] = [0, 0];
  for (let i = 0; i < 80; i++) [x, y] = stepDot(x, y, 100, 100, 0, null);
  assert.ok(Math.abs(x - 100) < 1 && Math.abs(y - 100) < 1);
  const [wx] = stepDot(100, 100, 100, 100, 0, { x: 90, y: 100 });
  assert.ok(wx > 100);
});

test('cover mode on pause, gaps and line tails', () => {
  const base = { paused: false, hasLyrics: true, index: 0, gap: false, sungEnd: 15 };
  assert.equal(isCoverMode({ ...base, now: 12 }), false);
  assert.equal(isCoverMode({ ...base, now: 15.5 }), true);
  assert.equal(isCoverMode({ ...base, now: 12, paused: true }), true);
  assert.equal(isCoverMode({ ...base, now: 12, index: -1 }), true);
});
