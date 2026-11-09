import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoLayout, resolveLayout, elementsFor, withElement, withPreset, parseViewPrefs, serializeViewPrefs, lyricSizes, layoutDotsCompact,
  DEFAULT_VIEW_PREFS, LYRIC_SCALE_MAX, LYRIC_SCALE_MIN,
} from './layout';

const prefs = () => ({ ...DEFAULT_VIEW_PREFS, elements: {} });

test('autoLayout: full only for wide landscape windows', () => {
  assert.equal(autoLayout(1440, 900), 'full');
  assert.equal(autoLayout(663, 730), 'reading'); // split screen
  assert.equal(autoLayout(1050, 1000), 'reading'); // wide but nearly square
  assert.equal(autoLayout(900, 500), 'reading');
  assert.equal(autoLayout(663, 730, 'stacked'), 'stacked');
});

test('resolveLayout honours a forced layout', () => {
  assert.equal(resolveLayout(663, 730, { ...prefs(), layout: 'full' }), 'full');
  assert.equal(resolveLayout(1600, 900, { ...prefs(), layout: 'stacked' }), 'stacked');
  assert.equal(resolveLayout(1600, 900, prefs()), 'full');
});

test('element overrides are kept per layout', () => {
  let p = withElement(prefs(), 'reading', 'cover', true);
  assert.equal(elementsFor('reading', p).cover, true);
  assert.equal(elementsFor('stacked', p).cover, true); // default there
  p = withElement(p, 'stacked', 'cover', false);
  assert.equal(elementsFor('stacked', p).cover, false);
  assert.equal(elementsFor('reading', p).cover, true);
  assert.equal(elementsFor('full', p).cover, true);
});

test('presets replace the elements of one layout', () => {
  const p = withPreset(prefs(), 'full', 'minimal');
  const e = elementsFor('full', p);
  assert.deepEqual([e.titleBlock, e.dots, e.ascii, e.bigTitle, e.notes, e.cover], [true, false, false, false, false, false]);
});

test('prefs round-trip and tolerate garbage', () => {
  const p = withElement({ ...prefs(), layout: 'stacked', compactStyle: 'stacked', lyricScale: 1.2 }, 'reading', 'notes', true);
  assert.deepEqual(parseViewPrefs(serializeViewPrefs(p)), p);
  assert.deepEqual(parseViewPrefs('nope'), prefs());
  const bad = parseViewPrefs(JSON.stringify({ layout: 'zen', lyricScale: 99, compactStyle: 'x', elements: { reading: { cover: 'yes', dots: false } } }));
  assert.equal(bad.layout, 'auto');
  assert.equal(bad.lyricScale, LYRIC_SCALE_MAX);
  assert.equal(bad.compactStyle, 'reading');
  assert.deepEqual(bad.elements, { reading: { dots: false } });
});

test('lyricSizes: full keeps the original sizes, compact grows with the window', () => {
  const full = lyricSizes('full', 1280);
  assert.equal(full.current('short line'), 68);
  assert.equal(full.next1, 32);
  const small = lyricSizes('reading', 480), big = lyricSizes('reading', 760);
  assert.ok(big.current('x') > small.current('x'));
  assert.ok(small.current('x') >= 34 && big.current('x') <= 84);
  assert.ok(lyricSizes('reading', 663).current('a'.repeat(80)) < lyricSizes('reading', 663).current('a'));
  assert.ok(lyricSizes('reading', 663, 5).current('x') <= Math.round(lyricSizes('reading', 663).current('x') * LYRIC_SCALE_MAX) + 1);
  assert.ok(lyricSizes('reading', 663, 0.1).current('x') >= Math.round(lyricSizes('reading', 663).current('x') * LYRIC_SCALE_MIN) - 1);
  assert.ok(lyricSizes('reading', 663).current('x') > 35, 'readable: larger than the shrunk full layout (~35px)');
});

test('layoutDotsCompact stays between header and dock and is deterministic', () => {
  const a = layoutDotsCompact('t1', ['one', 'two'], 663, 730, 90, 90), b = layoutDotsCompact('t1', ['one', 'two'], 663, 730, 90, 90);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 5);
  for (const d of a) { assert.ok(d.y >= 90 && d.y <= 730 - 90, `y=${d.y}`); assert.ok(d.x >= 0 && d.x <= 663); }
  assert.notDeepEqual(a, layoutDotsCompact('t2', ['one'], 663, 730, 90, 90));
});
