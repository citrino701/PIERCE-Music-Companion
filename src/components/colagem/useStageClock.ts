import { useEffect, useState } from 'react';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Seconds counter (140 ms steps) that only runs while `active` and motion is allowed. */
export function useStageClock(active: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active || prefersReducedMotion()) return;
    const id = window.setInterval(() => setT((v) => v + 0.14), 140);
    return () => window.clearInterval(id);
  }, [active]);
  return t;
}
