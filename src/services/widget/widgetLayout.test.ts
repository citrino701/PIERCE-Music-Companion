import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWidgetPrefs, serializeWidgetPrefs, clampToScreen, defaultPosition, nextVariant, filledDots, WIDGET_SIZES, DEFAULT_WIDGET_PREFS,
} from './widgetLayout';

test('parseWidgetPrefs falls back to defaults on bad input', () => {
  assert.deepEqual(parseWidgetPrefs(null), DEFAULT_WIDGET_PREFS);
  assert.deepEqual(parseWidgetPrefs('not json'), DEFAULT_WIDGET_PREFS);
  assert.deepEqual(parseWidgetPrefs('{"variant":"zen"}'), DEFAULT_WIDGET_PREFS);
  assert.deepEqual(parseWidgetPrefs('{"variant":"mini","position":{"x":"a","y":2}}'), { variant: 'mini', position: null });
});

test('prefs round-trip', () => {
  const prefs = { variant: 'disc' as const, position: { x: 10, y: 20 } };
  assert.deepEqual(parseWidgetPrefs(serializeWidgetPrefs(prefs)), prefs);
});

test('clampToScreen keeps the widget visible', () => {
  const size = WIDGET_SIZES.normal;
  assert.deepEqual(clampToScreen({ x: -50, y: 5000 }, size, { width: 1920, height: 1080 }), { x: 0, y: 1080 - size.height });
  assert.deepEqual(clampToScreen({ x: 100, y: 100 }, size, { width: 1920, height: 1080 }), { x: 100, y: 100 });
});

test('defaultPosition sits inside the screen', () => {
  const p = defaultPosition(WIDGET_SIZES.mini, { width: 1366, height: 768 });
  assert.ok(p.x >= 0 && p.x + WIDGET_SIZES.mini.width <= 1366);
  assert.ok(p.y >= 0 && p.y + WIDGET_SIZES.mini.height <= 768);
});

test('nextVariant cycles normal -> disc -> mini', () => {
  assert.equal(nextVariant('normal'), 'disc');
  assert.equal(nextVariant('disc'), 'mini');
  assert.equal(nextVariant('mini'), 'normal');
});

test('filledDots is clamped', () => {
  assert.equal(filledDots(0, 0, 56), 0);
  assert.equal(filledDots(50000, 100000, 56), 28);
  assert.equal(filledDots(200000, 100000, 56), 56);
});
