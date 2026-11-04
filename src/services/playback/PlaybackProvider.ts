import type { TrackData } from '../../types';

/**
 * Normalized playback contract used by the UI.
 * Providers may be a local demo, Spotify metadata adapter, or another source.
 * Keep provider-specific SDK/API shapes outside React components.
 */
export interface PlaybackSnapshot {
  track: TrackData | null;
  progressMs: number;
  isPlaying: boolean;
  volume: number | null;
  receivedAt: number;
}

export interface PlaybackProvider {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getSnapshot(): Promise<PlaybackSnapshot>;
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
}

/** Audio analysis is intentionally independent from playback metadata. */
export interface AudioAnalysisProvider {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (features: import('../../types').AudioFeatures) => void): () => void;
}
