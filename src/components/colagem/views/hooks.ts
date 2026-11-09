import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../useStageClock';
import { LYRIC_LEAD_S } from '../../../services/views/rhythm';

/** Playback position in seconds, interpolated locally between the app's updates (it only gets one every 250 ms). */
export function useSmoothNow(progressMs: number, isPlaying: boolean, lead = LYRIC_LEAD_S): () => number {
  const anchor = useRef({ ms: progressMs, at: performance.now(), playing: isPlaying });
  const last = useRef(progressMs);
  if (last.current !== progressMs || anchor.current.playing !== isPlaying) {
    const predicted = anchor.current.playing ? anchor.current.ms + (performance.now() - anchor.current.at) : anchor.current.ms;
    // Small forward corrections would make the clock stutter; only re-anchor on seeks, pauses or a real drift.
    if (!isPlaying || anchor.current.playing !== isPlaying || Math.abs(progressMs - predicted) > 600) anchor.current = { ms: progressMs, at: performance.now(), playing: isPlaying };
    last.current = progressMs;
  }
  return () => {
    const a = anchor.current;
    return (a.playing ? a.ms + (performance.now() - a.at) : a.ms) / 1000 + lead;
  };
}

/** Same clock as React state, re-rendered at most `fps` times a second while playing. */
export function useFrameTime(progressMs: number, isPlaying: boolean, fps = 30): number {
  const now = useSmoothNow(progressMs, isPlaying);
  const [t, setT] = useState(() => now());
  useEffect(() => {
    setT(now());
    if (!isPlaying) return;
    let raf = 0, prev = 0;
    const tick = (ts: number) => {
      if (ts - prev >= 1000 / fps) { prev = ts; setT(now()); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, progressMs, fps]);
  return t;
}

export function useBox<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 1280, h: 760 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth || 1280, h: el.clientHeight || 760 });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box];
}

export const useReducedMotion = (): boolean => {
  const [r] = useState(prefersReducedMotion);
  return r;
};

/** Track BPM from the app, or a default; the Spotify audio-features endpoint is closed to newer apps. */
export const bpmOf = (bpm: number | undefined, fallback = 100): number => (bpm && bpm > 40 && bpm < 220 ? bpm : fallback);
