export interface PlaybackClockState {
  trackId: string | null;
  positionMs: number;
  durationMs: number | null;
  isPlaying: boolean;
  /** Monotonic timestamp from performance.now(), never wall-clock time. */
  anchorTimeMs: number;
}

export interface PlaybackClockSnapshot {
  trackId: string | null;
  positionMs: number;
  durationMs?: number | null;
  isPlaying: boolean;
  /** Monotonic timestamp captured when the provider snapshot was received. */
  receivedAtMonotonicMs: number;
}

const clampPosition = (positionMs: number, durationMs: number | null): number => {
  const safePosition = Number.isFinite(positionMs) ? Math.max(0, positionMs) : 0;
  return durationMs && durationMs > 0 ? Math.min(safePosition, durationMs) : safePosition;
};

/** Deterministic playback clock; all timestamps use the performance.now() timebase. */
export class PlaybackClock {
  private state: PlaybackClockState = { trackId: null, positionMs: 0, durationMs: null, isPlaying: false, anchorTimeMs: 0 };

  synchronize(snapshot: PlaybackClockSnapshot): void {
    const trackChanged = snapshot.trackId !== this.state.trackId;
    const durationMs = snapshot.durationMs ?? (trackChanged ? null : this.state.durationMs);
    this.state = { trackId: snapshot.trackId, positionMs: clampPosition(snapshot.positionMs, durationMs), durationMs, isPlaying: snapshot.isPlaying, anchorTimeMs: snapshot.receivedAtMonotonicMs };
  }

  getPosition(nowMs: number): number {
    const elapsedMs = this.state.isPlaying ? Math.max(0, nowMs - this.state.anchorTimeMs) : 0;
    return clampPosition(this.state.positionMs + elapsedMs, this.state.durationMs);
  }

  getSnapshot(nowMs: number): PlaybackClockState {
    return { ...this.state, positionMs: this.getPosition(nowMs), anchorTimeMs: nowMs };
  }

  play(nowMs: number): void {
    if (this.state.isPlaying) return;
    this.state = { ...this.state, isPlaying: true, anchorTimeMs: nowMs };
  }

  pause(nowMs: number): void {
    if (!this.state.isPlaying) return;
    this.state = { ...this.state, positionMs: this.getPosition(nowMs), isPlaying: false, anchorTimeMs: nowMs };
  }

  seek(positionMs: number, nowMs: number): void {
    this.state = { ...this.state, positionMs: clampPosition(positionMs, this.state.durationMs), anchorTimeMs: nowMs };
  }

  reset(nowMs: number): void {
    this.state = { trackId: null, positionMs: 0, durationMs: null, isPlaying: false, anchorTimeMs: nowMs };
  }
}