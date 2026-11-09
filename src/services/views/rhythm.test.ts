import test from 'node:test';
import assert from 'node:assert/strict';
import { beatInfo, formatTime, hash, lineIndexAt, momentAt, normalizeWord, rng, seedFromId, timedLines, wordTimings } from './rhythm.ts';

const lyric = (id: string, startMs: number, text: string) => ({ id, startMs, endMs: startMs + 1000, text });
const lines = timedLines([lyric('a', 1000, 'um dois'), lyric('b', 5000, ''), lyric('c', 7000, 'três quatro cinco')], 12);

test('timedLines ends each line where the next begins', () => {
  assert.equal(lines[0].end, 5);
  assert.equal(lines[2].end, 12);
  assert.equal(lines[1].gap, true);
});

test('lineIndexAt is -1 before the first line', () => {
  assert.equal(lineIndexAt(lines, 0.5), -1);
  assert.equal(lineIndexAt(lines, 1), 0);
  assert.equal(lineIndexAt(lines, 8), 2);
});

test('wordTimings spreads words over 85% of the line', () => {
  const w = wordTimings(lines[0]);
  assert.equal(w.length, 2);
  assert.ok(Math.abs(w[1].end - (1 + 4 * 0.85)) < 1e-9);
});

test('momentAt: gap before start and on empty lines, current word inside', () => {
  assert.equal(momentAt(lines, 0).gap, true);
  assert.equal(momentAt(lines, 5.5).gap, true);
  const m = momentAt(lines, 1.2);
  assert.equal(m.gap, false);
  assert.equal(m.wordIndex, 0);
  assert.equal(momentAt(lines, 3.5).wordIndex, 1);
});

test('beatInfo kick is 1 on the beat and 0 after a third of it', () => {
  assert.equal(beatInfo(0, 120).kick, 1);
  assert.equal(beatInfo(0.4, 120).kick, 0);
  assert.equal(beatInfo(1, 120).beat, 2);
});

test('hash and rng are deterministic', () => {
  assert.equal(hash(3, 4), hash(3, 4));
  const a = rng(seedFromId('x')), b = rng(seedFromId('x'));
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(seedFromId('x'), seedFromId('y'));
});

test('formatTime and normalizeWord', () => {
  assert.equal(formatTime(65), '1:05');
  assert.equal(normalizeWord('Olá,'), 'olá');
});
