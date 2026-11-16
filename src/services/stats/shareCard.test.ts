import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ellipsize, sectionHeight, computeCardHeight } from './shareCard';

function fakeCtx(widthPerChar: number) {
  return { measureText: (s: string) => ({ width: s.length * widthPerChar }) };
}

test('ellipsize keeps short text untouched', () => {
  assert.equal(ellipsize(fakeCtx(10), 'KATSEYE', 200), 'KATSEYE');
});

test('ellipsize shortens text that overflows the given width', () => {
  const result = ellipsize(fakeCtx(10), 'Um nome de artista bem comprido', 100);
  assert.ok(result.endsWith('…'));
  assert.ok(result.length < 'Um nome de artista bem comprido'.length);
});

test('ellipsize never returns something wider than requested', () => {
  const ctx = fakeCtx(10);
  const result = ellipsize(ctx, 'Outro nome gigante de uma banda qualquer', 50);
  assert.ok(ctx.measureText(result).width <= 50 || result === '…');
});

test('computeCardHeight grows with item count instead of staying fixed', () => {
  const small = computeCardHeight(5);
  const big = computeCardHeight(10);
  assert.ok(big > small, 'a card with more rows must be taller, not clipped at a fixed height');
});

test('computeCardHeight never understates the actual content (no room for overlap)', () => {
  for (const n of [0, 1, 5, 8, 10, 15]) {
    const height = computeCardHeight(n);
    const cappedN = Math.min(n, 10);
    const contentEnd = 280 + sectionHeight(cappedN);
    assert.ok(height > contentEnd, `card height must leave room below the last row for n=${n}`);
  }
});

test('sectionHeight for zero items is still positive (room for the "sem dados" line)', () => {
  assert.ok(sectionHeight(0) > 0);
  assert.ok(sectionHeight(5) > sectionHeight(0));
});
