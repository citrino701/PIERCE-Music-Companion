import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ellipsize } from './shareCard';

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
