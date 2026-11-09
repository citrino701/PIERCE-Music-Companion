import type { LyricLine } from '../../types';

/** Shared helpers for the rhythm-driven views (Respira, Caça-letras, Pontilhado). Times are in seconds like the handoff doc. */
export interface TimedLine { t: number; end: number; text: string; gap: boolean }
export interface TimedWord { text: string; start: number; end: number; line: number }

export const DEFAULT_BPM = 100;

/** Synced lines from the app's lyric model; the end of a line is the start of the next (or the track end). */
export function timedLines(lines: LyricLine[], durationS: number): TimedLine[] {
  const sorted = [...lines].sort((a, b) => a.startMs - b.startMs);
  return sorted.map((l, i) => {
    const t = l.startMs / 1000;
    const end = i + 1 < sorted.length ? sorted[i + 1].startMs / 1000 : Math.max(t + 1, durationS);
    return { t, end, text: l.text.trim(), gap: l.text.trim() === '' };
  });
}

/** Index of the last line starting at or before `now`; -1 before the first. */
export function lineIndexAt(lines: { t: number }[], now: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= now) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * LRC only has per-line timing, so words are timed by length (longer words last longer). The sung part is
 * 92% of the line, but never more than a plausible singing time (~0.16 s per letter, at least 2.5 s):
 * a line followed by an instrumental break ends early instead of dragging the last word across it.
 */
export function wordTimings(line: { t: number; end: number; text: string }, lineIdx = 0): TimedWord[] {
  const words = line.text.split(/\s+/).filter(Boolean);
  const letters = words.reduce((n, w) => n + [...w].length, 0) || 1;
  const span = Math.min((line.end - line.t) * 0.92, Math.max(2.5, letters * 0.16));
  let acc = 0;
  return words.map((w) => {
    const start = line.t + (acc / letters) * span;
    acc += [...w].length;
    return { text: w, start, end: line.t + (acc / letters) * span, line: lineIdx };
  });
}

/** Seconds the lyrics lead the audio clock: Spotify's reported position lags a little behind what is heard. */
export const LYRIC_LEAD_S = 0.25;

/** When the sung part of a line ends (start of the breathing space). */
export function sungEnd(line: { t: number; end: number; text: string }): number {
  const w = wordTimings(line);
  return w.length ? w[w.length - 1].end : line.end;
}

export function beatInfo(now: number, bpm: number, offset = 0) {
  const b = (now - offset) * bpm / 60;
  const beat = Math.floor(b), phase = b - beat;
  return { beat, phase, kick: Math.max(0, 1 - phase * 3), period: 60 / bpm };
}

/** Deterministic 0..1 value, so per-beat "randomness" never flickers between frames. */
export const hash = (a: number, b: number): number => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Seeded PRNG: same seed, same sequence (stable layouts per track). */
export const rng = (seed: number) => {
  let s = Math.max(1, Math.floor(Math.abs(seed)) % 2147483647);
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2147483646 + 1;
}

export const formatTime = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export const normalizeWord = (w: string): string => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/** What a view should show for the current moment. `gap` = breathing space (before 1st line, empty line, tail of a line, after the last one). */
export interface Moment { index: number; line?: TimedLine; words: TimedWord[]; wordIndex: number; gap: boolean }

export function momentAt(lines: TimedLine[], now: number): Moment {
  const index = lineIndexAt(lines, now);
  const line = index >= 0 ? lines[index] : undefined;
  if (!line || line.gap) return { index, line, words: [], wordIndex: -1, gap: true };
  const words = wordTimings(line, index);
  const lastEnd = words.length ? words[words.length - 1].end : line.end;
  const inTail = now > lastEnd;
  let wordIndex = words.findIndex((w) => now >= w.start && now < w.end);
  if (wordIndex < 0) wordIndex = inTail ? words.length - 1 : 0;
  return { index, line, words, wordIndex, gap: inTail && index === lines.length - 1 };
}
