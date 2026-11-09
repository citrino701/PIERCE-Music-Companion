import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBrowser, supportsInstall, manualInstallHint } from './browser';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
test('detects the browsers used on both machines', () => {
  assert.equal(detectBrowser(CHROME), 'chrome');
  assert.equal(detectBrowser(CHROME + ' OPR/115.0.0.0'), 'opera');
  assert.equal(detectBrowser(CHROME + ' Edg/130.0.0.0'), 'edge');
  assert.equal(detectBrowser('Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0'), 'firefox');
});
test('install support and hints', () => {
  assert.equal(supportsInstall('opera'), true);
  assert.equal(supportsInstall('firefox'), false);
  assert.match(manualInstallHint('opera'), /Opera/);
});
