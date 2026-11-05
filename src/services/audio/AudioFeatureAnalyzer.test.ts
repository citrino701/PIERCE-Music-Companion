import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioFeatureAnalyzer } from './AudioFeatureAnalyzer';

test('silence produces zeroed normalized features', () => {
  const analyzer = new AudioFeatureAnalyzer();
  const result = analyzer.analyze({ samples: new Float32Array(1024), sampleRate: 48000, capturedAtMonotonicMs: 10 });
  assert.deepEqual(result, { energy: 0, rms: 0, lowBand: 0, midBand: 0, highBand: 0, onset: false });
});
test('a non-silent signal produces finite normalized features', () => {
  const analyzer = new AudioFeatureAnalyzer();
  const samples = Float32Array.from({ length: 2048 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5);
  const result = analyzer.analyze({ samples, sampleRate: 48000, capturedAtMonotonicMs: 20 });
  for (const value of [result.energy, result.rms, result.lowBand, result.midBand, result.highBand]) { assert.ok(Number.isFinite(value)); assert.ok(value >= 0 && value <= 1); }
  assert.ok(result.rms > 0);
});
test('invalid frames safely return silence', () => {
  const result = new AudioFeatureAnalyzer().analyze({ samples: new Float32Array(0), sampleRate: 0, capturedAtMonotonicMs: 30 });
  assert.equal(result.energy, 0); assert.equal(result.onset, false);
});
test('reset clears onset history', () => {
  const analyzer = new AudioFeatureAnalyzer({ onsetThreshold: 0.01, smoothing: 0 });
  const loud = Float32Array.from({ length: 512 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / 48000));
  assert.equal(analyzer.analyze({ samples: loud, sampleRate: 48000, capturedAtMonotonicMs: 1 }).onset, true);
  analyzer.reset();
  assert.equal(analyzer.analyze({ samples: new Float32Array(512), sampleRate: 48000, capturedAtMonotonicMs: 2 }).onset, false);
});