import { useMemo } from 'react';
import type { StageViewProps } from './types';
import { timedLines, type TimedLine } from '../../../services/views/rhythm';

/** Synced lines of the track; when only plain text exists the view falls back to its "no lyrics" behaviour. */
export function useTimedLines(track: StageViewProps['track']): TimedLine[] {
  return useMemo(() => timedLines(track.lyrics, track.durationMs / 1000), [track.id, track.lyrics, track.durationMs]);
}

/** Start (ms) of the line before/after the current moment,, for the "verso anterior / próximo verso" buttons. */
export function verseSeek(lines: TimedLine[], nowS: number, dir: -1 | 1): number | null {
  const real = lines.map((l, i) => ({ l, i })).filter((x) => !x.l.gap);
  if (!real.length) return null;
  if (dir === 1) { const n = real.find((x) => x.l.t > nowS + 0.05); return n ? n.l.t * 1000 : null; }
  // previous: if we are well into the current line go to its start, otherwise to the one before
  const cur = real.filter((x) => x.l.t <= nowS);
  if (!cur.length) return 0;
  const here = cur[cur.length - 1];
  if (nowS - here.l.t > 1.5 || cur.length === 1) return here.l.t * 1000;
  return cur[cur.length - 2].l.t * 1000;
}
