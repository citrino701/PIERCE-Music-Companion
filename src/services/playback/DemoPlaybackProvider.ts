import type { TrackData } from '../../types';
import { PlaybackClock } from './PlaybackClock';
import type { PlaybackProvider, PlaybackSnapshot } from './PlaybackProvider';

/**
 * Local demo adapter. It deliberately implements the same contract as a real
 * metadata provider, keeping demo controls out of the application shell.
 */
export class DemoPlaybackProvider implements PlaybackProvider {
  readonly id = 'demo';
  private readonly clock = new PlaybackClock();
  private track: TrackData | null;
  private volume = 0.8;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(snapshot: PlaybackSnapshot) => void>();

  constructor(initialTrack: TrackData, initialPositionMs = 102000, initiallyPlaying = true) {
    this.track = initialTrack;
    this.clock.synchronize({
      trackId: initialTrack.id,
      positionMs: initialPositionMs,
      durationMs: initialTrack.durationMs,
      isPlaying: initiallyPlaying,
      receivedAtMonotonicMs: performance.now(),
    });
  }

  async connect(): Promise<void> {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      const snapshot = this.readSnapshot();
      if (this.track && snapshot.progressMs >= this.track.durationMs) {
        this.clock.seek(0, performance.now());
      }
      this.publish();
    }, 250);
    this.publish();
  }

  async disconnect(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  async getSnapshot(): Promise<PlaybackSnapshot> {
    return this.readSnapshot();
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async play(): Promise<void> {
    this.clock.play(performance.now());
    this.publish();
  }

  async pause(): Promise<void> {
    this.clock.pause(performance.now());
    this.publish();
  }

  async seek(positionMs: number): Promise<void> {
    this.clock.seek(positionMs, performance.now());
    this.publish();
  }

  async selectTrack(track: TrackData): Promise<void> {
    this.track = track;
    this.clock.synchronize({
      trackId: track.id,
      positionMs: 0,
      durationMs: track.durationMs,
      isPlaying: this.clock.getSnapshot(performance.now()).isPlaying,
      receivedAtMonotonicMs: performance.now(),
    });
    this.publish();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
    this.publish();
  }

  private readSnapshot(): PlaybackSnapshot {
    const state = this.clock.getSnapshot(performance.now());
    return {
      track: this.track,
      progressMs: state.positionMs,
      isPlaying: state.isPlaying,
      volume: this.volume,
      receivedAtMonotonicMs: performance.now(),
    };
  }

  private publish(): void {
    const snapshot = this.readSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
