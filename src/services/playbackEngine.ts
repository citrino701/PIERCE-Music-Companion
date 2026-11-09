import { LyricLine, NarrativeChapter, AudioFeatures, ViewMode } from '../types';

/**
 * Format milliseconds into MM:SS format
 */
export function formatTime(ms: number): string {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds into fractional time MM:SS.SS
 */
export function formatPreciseTime(ms: number): string {
  if (isNaN(ms) || ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

/**
 * Finds index of active lyric line at given progress timestamp
 */
export function findActiveLyricIndex(lyrics: LyricLine[], progressMs: number): number {
  if (!lyrics.length) return -1;
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    if (progressMs >= line.startMs && progressMs <= line.endMs) {
      return i;
    }
  }
  // If in between lines, return the previous one if within reasonable window, or closest
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (progressMs >= lyrics[i].startMs) {
      return i;
    }
  }
  return 0;
}

/**
 * Finds active narrative chapter at given progress timestamp
 */
export function findActiveChapterIndex(chapters: NarrativeChapter[], progressMs: number): number {
  if (!chapters.length) return 0;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (progressMs >= ch.startMs && progressMs < ch.endMs) {
      return i;
    }
  }
  return chapters.length - 1;
}

/**
 * Simulates real-time audio features DSP envelope based on BPM and progress
 */
export function computeSimulatedAudioFeatures(progressMs: number, bpm: number, isPlaying: boolean): AudioFeatures {
  if (!isPlaying) {
    return {
      energy: 0.1,
      rms: 0.08,
      lowBand: 0.05,
      midBand: 0.08,
      highBand: 0.06,
      onset: false,
    };
  }

  const beatPeriodMs = 60000 / bpm;
  const beatPhase = (progressMs % beatPeriodMs) / beatPeriodMs;
  
  // Sine harmonics with rhythm pulse
  const pulse = Math.pow(1 - beatPhase, 3);
  const onset = beatPhase < 0.08;

  const lowBand = Math.min(1, Math.max(0.1, pulse * 0.8 + 0.2 * Math.sin(progressMs / 300)));
  const midBand = Math.min(1, Math.max(0.15, 0.4 + 0.3 * Math.sin(progressMs / 180) + pulse * 0.3));
  const highBand = Math.min(1, Math.max(0.1, 0.3 + 0.4 * Math.cos(progressMs / 90) + (onset ? 0.3 : 0)));
  const energy = Math.min(1, (lowBand * 0.45 + midBand * 0.35 + highBand * 0.2));
  const rms = Math.min(1, energy * 0.85 + (onset ? 0.15 : 0));

  return {
    energy,
    rms,
    lowBand,
    midBand,
    highBand,
    onset,
  };
}

/**
 * Cycle through visual modes
 */
export function getNextMode(currentMode: ViewMode): ViewMode {
  const modes: ViewMode[] = ['compact', 'disc', 'fullscreen'];
  const currentIndex = modes.indexOf(currentMode);
  return modes[(currentIndex + 1) % modes.length];
}
