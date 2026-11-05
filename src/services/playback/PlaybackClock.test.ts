import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackClock } from './PlaybackClock';

test('advances from a monotonic anchor while playing', () => {
  const clock = new PlaybackClock();
  clock.synchronize({ trackId: 'a', positionMs: 1000, durationMs: 5000, isPlaying: true, receivedAtMonotonicMs: 100 });
  assert.equal(clock.getPosition(600), 1500);
});

test('pause freezes position and play resumes from that position', () => {
  const clock = new PlaybackClock();
  clock.synchronize({ trackId: 'a', positionMs: 1000, durationMs: 5000, isPlaying: true, receivedAtMonotonicMs: 100 });
  clock.pause(600);
  assert.equal(clock.getPosition(900), 1500);
  clock.play(900);
  assert.equal(clock.getPosition(1200), 1800);
});

test('seek clamps to track duration and zero', () => {
  const clock = new PlaybackClock();
  clock.synchronize({ trackId: 'a', positionMs: 0, durationMs: 5000, isPlaying: false, receivedAtMonotonicMs: 0 });
  clock.seek(9000, 10);
  assert.equal(clock.getPosition(10), 5000);
  clock.seek(-50, 20);
  assert.equal(clock.getPosition(20), 0);
});

test('switching tracks resets position and adopts the new duration', () => {
  const clock = new PlaybackClock();
  clock.synchronize({ trackId: 'a', positionMs: 4000, durationMs: 5000, isPlaying: true, receivedAtMonotonicMs: 0 });
  clock.synchronize({ trackId: 'b', positionMs: 0, durationMs: 9000, isPlaying: true, receivedAtMonotonicMs: 100 });
  assert.equal(clock.getPosition(600), 500);
  assert.equal(clock.getSnapshot(600).durationMs, 9000);
});
