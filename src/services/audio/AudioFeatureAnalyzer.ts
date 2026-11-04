import type { AudioFeatures } from '../../types';

export interface AudioFrame { samples: Float32Array; sampleRate: number; capturedAtMonotonicMs: number; }
export interface AudioFeatureAnalyzerOptions { onsetThreshold?: number; smoothing?: number; }

/** PCM feature extraction kept independent from the operating-system capture adapter. */
export class AudioFeatureAnalyzer {
  private previousEnergy = 0;
  private readonly onsetThreshold: number;
  private readonly smoothing: number;
  constructor(options: AudioFeatureAnalyzerOptions = {}) {
    this.onsetThreshold = options.onsetThreshold ?? 0.12;
    this.smoothing = Math.min(0.99, Math.max(0, options.smoothing ?? 0.65));
  }
  analyze(frame: AudioFrame): AudioFeatures {
    const { samples, sampleRate } = frame;
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samples.length === 0) return this.silence();
    let sumSquares = 0, lowSquares = 0, midSquares = 0, highSquares = 0;
    let lowState = 0, midLowState = 0, midHighState = 0, highState = 0;
    const lowAlpha = this.alpha(180, sampleRate), midLowAlpha = this.alpha(180, sampleRate);
    const midHighAlpha = this.alpha(2200, sampleRate), highAlpha = this.alpha(2200, sampleRate);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i] || 0));
      sumSquares += sample * sample;
      lowState += lowAlpha * (sample - lowState);
      midLowState += midLowAlpha * (sample - midLowState);
      midHighState += midHighAlpha * (sample - midLowState - midHighState);
      highState += highAlpha * (sample - highState);
      lowSquares += lowState * lowState;
      midSquares += midHighState * midHighState;
      highSquares += (sample - highState) ** 2;
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const lowBand = this.normalize(Math.sqrt(lowSquares / samples.length) * 2.2);
    const midBand = this.normalize(Math.sqrt(midSquares / samples.length) * 2.2);
    const highBand = this.normalize(Math.sqrt(highSquares / samples.length) * 2.5);
    const energy = this.normalize(rms * 2.5);
    const onset = energy - this.previousEnergy >= this.onsetThreshold;
    this.previousEnergy = this.previousEnergy * this.smoothing + energy * (1 - this.smoothing);
    return { energy, rms: this.normalize(rms), lowBand, midBand, highBand, onset };
  }
  reset(): void { this.previousEnergy = 0; }
  private alpha(cutoff: number, sampleRate: number): number { return 1 - Math.exp((-2 * Math.PI * Math.min(cutoff, sampleRate * 0.45)) / sampleRate); }
  private normalize(value: number): number { return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)); }
  private silence(): AudioFeatures { this.previousEnergy = 0; return { energy: 0, rms: 0, lowBand: 0, midBand: 0, highBand: 0, onset: false }; }
}