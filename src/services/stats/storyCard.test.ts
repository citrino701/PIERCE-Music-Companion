import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutLyricLines } from './storyCard';

function fakeCtx(widthPerChar: number) {
  return { measureText: (s: string) => ({ width: s.length * widthPerChar }) } as unknown as CanvasRenderingContext2D;
}

test('layoutLyricLines keeps a short line as a single visual line', () => {
  const out = layoutLyricLines(fakeCtx(10), ['curta'], 400);
  assert.deepEqual(out, ['curta']);
});

test('layoutLyricLines wraps a long line across the given width', () => {
  const out = layoutLyricLines(fakeCtx(10), ['uma linha de letra bem mais longa do que cabe de uma vez'], 150);
  assert.ok(out.length > 1);
  out.forEach((l) => assert.ok(l.length * 10 <= 150));
});

test('layoutLyricLines preserves the order of multiple selected lines', () => {
  const out = layoutLyricLines(fakeCtx(10), ['primeira', 'segunda', 'terceira'], 400);
  assert.deepEqual(out, ['primeira', 'segunda', 'terceira']);
});
