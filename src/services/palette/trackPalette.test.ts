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

test('a muted-but-majority warm tone beats a small vivid blue patch (regression: "tudo fica azul")', () => {
  // Downscaling a real photo to a tiny thumbnail blends most of it into muted, moderately-saturated
  // colour (skin, clothes, pavement...) while leaving small patches — sky, denim, a sign — fully
  // saturated. A too-aggressive saturation cutoff threw away all of the former and kept only the latter,
  // so almost any busy photo with a hint of blue in it read as a "blue cover" regardless of what it
  // actually showed.
  const mutedWarm = solid(195, 180, 165, 800); // s ≈ 0.20, hue 30° — most of the frame
  const vividBlue = solid(90, 140, 220, 100); // s ≈ 0.65, hue 217° — a small sky patch
  const hues = dominantHues([...mutedWarm, ...vividBlue]);
  assert.ok(hues && hueDistance(hues.a, 30) < 20, `expected the majority warm tone to win, got ${hues?.a}`);
});

test('hash fallback is deterministic and differs between tracks', () => {
  assert.deepEqual(paletteFromId('spotify-abc'), paletteFromId('spotify-abc'));
  assert.notEqual(paletteFromId('spotify-abc').a, paletteFromId('spotify-xyz').a);
});
