import assert from 'node:assert/strict';
import test from 'node:test';
import { contrastRatio, dominantHues, hueDistance, paletteFromHues, paletteFromId, paletteFromPixels } from './trackPalette';

function solid(r: number, g: number, b: number, n = 64): number[] {
  return Array.from({ length: n }).flatMap(() => [r, g, b, 255]);
}

test('palette keeps the contrast promises for every hue', () => {
  for (let h = 0; h < 360; h += 15) {
    const p = paletteFromHues(h, (h + 90) % 360);
    assert.ok(contrastRatio(p.deep, p.bg) >= 4.5, `deep on bg at hue ${h}`);
    assert.ok(contrastRatio(p.b, '#ffffff') >= 4.5, `white on b at hue ${h}`);
    assert.ok(contrastRatio(p.onA, p.a) >= 4.5, `onA on a at hue ${h}`);
  }
});

test('secondary hue is forced away from the primary', () => {
  const near = paletteFromHues(10, 30);
  const far = paletteFromHues(10, 200);
  assert.notEqual(near.b, far.b);
});

test('dominant hues follow the pixels', () => {
  const red = solid(230, 30, 40);
  const blue = solid(40, 60, 220, 32);
  const hues = dominantHues([...red, ...blue]);
  assert.ok(hues && hueDistance(hues.a, 355) < 20);
  assert.ok(hues?.b !== undefined && hueDistance(hues.b, 230) < 20);
});

test('grayscale cover yields no palette (caller uses the hash fallback)', () => {
  assert.equal(paletteFromPixels(solid(120, 120, 120)), null);
});

test('hash fallback is deterministic and differs between tracks', () => {
  assert.deepEqual(paletteFromId('spotify-abc'), paletteFromId('spotify-abc'));
  assert.notEqual(paletteFromId('spotify-abc').a, paletteFromId('spotify-xyz').a);
});
