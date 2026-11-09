import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, fallbackLines, layoutGrid } from './cacaGrid.ts';
import { timedLines } from '../../../services/views/rhythm.ts';

const lines = timedLines([{ id: 'a', startMs: 0, endMs: 1, text: 'olá mundo bom' }, { id: 'b', startMs: 4000, endMs: 5, text: '' }, { id: 'c', startMs: 6000, endMs: 7, text: 'segunda linha' }], 10);

test('same seed gives the same grid, other seed differs', () => {
  assert.deepEqual(layoutGrid(lines, 7), layoutGrid(lines, 7));
  assert.notDeepEqual(layoutGrid(lines, 7).cells, layoutGrid(lines, 8).cells);
});

test('cells stay in the columns, each verse starts on a new row, gaps are skipped', () => {
  const g = layoutGrid(lines, 3);
  assert.ok(g.cells.every((c) => c.col >= 0 && c.col < COLS));
  assert.equal(g.words.length, 5);
  assert.ok(g.lineRow[2] > g.lineRow[0]);
  assert.equal(g.cells.filter((c) => c.w === 0).length, 3);
});

test('fallback lines cover the whole track', () => {
  const f = fallbackLines('A', 'B', 120);
  assert.equal(f.length, 12);
  assert.equal(f[11].end, 120);
});
