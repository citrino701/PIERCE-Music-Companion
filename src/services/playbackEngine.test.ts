import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  formatPreciseTime,
  findActiveLyricIndex,
  findActiveChapterIndex,
  computeSimulatedAudioFeatures,
  getNextMode
} from './playbackEngine';
import { LyricLine, NarrativeChapter } from '../types';

test('formatTime formats seconds and minutes with padding', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65000), '01:05');
  assert.equal(formatTime(214000), '03:34');
  assert.equal(formatTime(-10), '00:00');
});

test('formatPreciseTime formats with centiseconds', () => {
  assert.equal(formatPreciseTime(65230), '01:05.23');
  assert.equal(formatPreciseTime(0), '00:00.00');
});

test('findActiveLyricIndex finds exact matching line in sequence', () => {
  const lyrics: LyricLine[] = [
    { id: '1', startMs: 0, endMs: 4000, text: 'Primeira linha' },
    { id: '2', startMs: 4000, endMs: 8000, text: 'Segunda linha' },
    { id: '3', startMs: 8000, endMs: 14000, text: 'Terceira linha' }
  ];

  assert.equal(findActiveLyricIndex(lyrics, 2000), 0);
  assert.equal(findActiveLyricIndex(lyrics, 6000), 1);
  assert.equal(findActiveLyricIndex(lyrics, 9500), 2);
  assert.equal(findActiveLyricIndex(lyrics, 20000), 2);
});

test('findActiveChapterIndex resolves narrative chapters correctly', () => {
  const chapters: NarrativeChapter[] = [
    { id: 'c1', title: 'Capítulo 1', startMs: 0, endMs: 30000, emotion: 'Calma', theme: 'Intro', visualBrief: 'Luz difusa' },
    { id: 'c2', title: 'Capítulo 2', startMs: 30000, endMs: 70000, emotion: 'Tensão', theme: 'Clímax', visualBrief: 'Cortes rápidos' }
  ];

  assert.equal(findActiveChapterIndex(chapters, 15000), 0);
  assert.equal(findActiveChapterIndex(chapters, 35000), 1);
  assert.equal(findActiveChapterIndex(chapters, 90000), 1);
});

test('computeSimulatedAudioFeatures returns low values when stopped and dynamic values when playing', () => {
  const idle = computeSimulatedAudioFeatures(1000, 120, false);
  assert.equal(idle.onset, false);
  assert.ok(idle.energy < 0.2);

  const playing = computeSimulatedAudioFeatures(0, 120, true);
  assert.equal(typeof playing.energy, 'number');
  assert.ok(playing.energy >= 0 && playing.energy <= 1);
  assert.ok(playing.rms >= 0 && playing.rms <= 1);
});

test('getNextMode cycles properly through the modes', () => {
  assert.equal(getNextMode('reduced'), 'fullscreen');
  assert.equal(getNextMode('fullscreen'), 'reduced');
});
