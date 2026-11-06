import assert from 'node:assert/strict';
import test from 'node:test';
import { asciiLayer, formatClock, isProtected, layoutDots, liveCover, lyricFontSize, lyricWords, pickDotWords, splitTitle, titleFontSize } from './colagem';

const line = (text: string) => ({ id: 'x', startMs: 1000, endMs: 5000, text });

test('dot words skip stopwords and short words, most frequent first', () => {
  const words = pickDotWords({ title: 'T', artist: 'A', lyrics: [line('Light light dance with the light'), line('dance forever, forever and ever')] as never });
  assert.deepEqual(words.slice(0, 3), ['light', 'dance', 'forever']);
  assert.ok(!words.includes('with') && !words.includes('the'));
});

test('dot words fall back to title and artist without lyrics', () => {
  assert.deepEqual(pickDotWords({ title: 'Gabriela', artist: 'KATSEYE', lyrics: [] }), ['gabriela', 'katseye']);
});

test('dots are deterministic and never land on protected zones', () => {
  const a = layoutDots('track-1', ['luz', 'voz']);
  assert.deepEqual(a, layoutDots('track-1', ['luz', 'voz']));
  assert.notDeepEqual(a, layoutDots('track-2', ['luz', 'voz']));
  assert.equal(a.length, 30);
  for (const d of a) assert.equal(isProtected(d.x, d.y), false);
});

test('title splits over two lines', () => {
  assert.deepEqual(splitTitle('Gabriela'), ['Gabri', 'ela']);
  assert.deepEqual(splitTitle('The Eyes of Ibad'), ['The Eyes', 'of Ibad']);
  assert.deepEqual(splitTitle('Oi'), ['Oi', '']);
  assert.equal(titleFontSize(['Gabri', 'ela']), 104);
  assert.ok(titleFontSize(['Neon Genesis', 'Evangelion II']) < 60);
});

test('lyric words advance with progress', () => {
  const l = line('a b c d');
  assert.deepEqual(lyricWords(l, 0).map((w) => w.state), ['current', 'next', 'rest', 'rest']);
  assert.deepEqual(lyricWords(l, 3200).map((w) => w.state), ['sung', 'sung', 'current', 'next']);
  assert.equal(lyricWords(l, 99999)[3].state, 'current');
  assert.ok(lyricFontSize('x'.repeat(100)) < lyricFontSize('curta'));
});

test('ascii generators have the expected shape', () => {
  const layer = asciiLayer(1, 0.3, 0);
  assert.equal(layer.split('\n').length, 58);
  assert.equal(layer.split('\n')[0].length, 178);
  assert.notEqual(liveCover(0, 0), liveCover(0, 1));
  assert.equal(formatClock(65000), '01:05');
});
