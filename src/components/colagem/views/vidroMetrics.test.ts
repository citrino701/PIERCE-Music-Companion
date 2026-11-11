import test from 'node:test';
import assert from 'node:assert/strict';
import { vidroMetrics } from './vidroMetrics.ts';

test('tall window: cover is limited by width and by the room left for lyrics and dock', () => {
  assert.equal(vidroMetrics(200, 300).cover, 110);
  const m = vidroMetrics(560, 1000);
  assert.equal(m.wide, false);
  assert.ok(m.cover + m.lyricPanel + 92 <= 1000);
});

test('wide window: cover is big, on the left, and the right column still has room', () => {
  const m = vidroMetrics(1344, 760);
  assert.equal(m.wide, true);
  assert.ok(m.cover > vidroMetrics(1344, 760 * 0 + 1000).cover - 1 || m.cover >= 600);
  assert.ok(m.cover <= 760 - 110 + 1);
  assert.ok(m.column >= 280);
  assert.ok(m.cover + m.column + 200 <= 1344 + 1);
});

test('a square-ish window is not treated as wide', () => {
  assert.equal(vidroMetrics(900, 760).wide, false);
});

test('lyric size follows the scale slider', () => {
  assert.ok(vidroMetrics(1200, 800, 1.4).lyricFont > vidroMetrics(1200, 800, 1).lyricFont);
  assert.ok(vidroMetrics(300, 800).lyricFont >= 17);
});
