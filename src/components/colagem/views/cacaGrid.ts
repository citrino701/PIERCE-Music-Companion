import { rng, wordTimings, type TimedLine, type TimedWord } from '../../../services/views/rhythm';

export const COLS = 20;
export const CELL = 70;

export interface GridCell { ch: string; col: number; row: number; w: number; ci: number; n: number }
export interface Grid { cells: GridCell[]; words: TimedWord[]; lineRow: number[]; rows: number }

/** Deterministic letter grid (same seed → same layout): irregular gaps between letters, a fresh row per verse. */
export function layoutGrid(lines: TimedLine[], seed: number): Grid {
  const rnd = rng(seed);
  let col = 0, row = 0;
  const cells: GridCell[] = [], words: TimedWord[] = [], lineRow: number[] = [];
  let li = 0;
  for (const line of lines) {
    if (line.gap) { lineRow.push(row); continue; }
    col = Math.floor(rnd() * 3);
    lineRow.push(row);
    for (const w of wordTimings(line, li)) {
      const wid = words.push(w) - 1;
      const chars = [...w.text];
      chars.forEach((ch, ci) => {
        if (col >= COLS) { col = 0; row++; }
        cells.push({ ch, col, row, w: wid, ci, n: chars.length });
        col += 1 + (rnd() < 0.3 ? 1 : 0) + (rnd() < 0.1 ? 1 : 0);
      });
      col += 1 + Math.floor(rnd() * 3);
    }
    row++;
    li++;
  }
  return { cells, words, lineRow, rows: row };
}

/** `lineRow` is indexed by position in the original `lines` array (gaps included). */
export function rowOfLine(lines: TimedLine[], grid: Grid, index: number): number {
  return index < 0 ? 0 : (grid.lineRow[Math.min(index, grid.lineRow.length - 1)] ?? 0);
}

/** Without synced lyrics: title and artist repeated, all revealed. */
export function fallbackLines(title: string, artist: string, durationS: number): TimedLine[] {
  const text = `${title} ${artist} `.repeat(3).trim();
  return Array.from({ length: 12 }, (_, i) => ({ t: (i * durationS) / 12, end: ((i + 1) * durationS) / 12, text, gap: false }));
}

export const ALPHABET = 'ABCDEFGHIJLMNOPQRSTUVXZ';
