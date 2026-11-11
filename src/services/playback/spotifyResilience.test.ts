import test from 'node:test';
import assert from 'node:assert/strict';
import { needsRefresh, mergeRefreshedToken, pickDevice, withDevice, type StoredToken } from './spotifyResilience';

const tok: StoredToken = { access_token: 'a', token_type: 'Bearer', expires_in: 3600, refresh_token: 'r1', expires_at: 10_000_000, scope: 's' };

test('needsRefresh triggers one minute before expiry', () => {
  assert.equal(needsRefresh(tok, 10_000_000 - 120_000), false);
  assert.equal(needsRefresh(tok, 10_000_000 - 30_000), true);
  assert.equal(needsRefresh(tok, 10_000_000 + 1), true);
});

test('mergeRefreshedToken keeps the old refresh token when none is returned', () => {
  const m = mergeRefreshedToken(tok, { access_token: 'b', expires_in: 3600 }, 1000);
  assert.equal(m.access_token, 'b');
  assert.equal(m.refresh_token, 'r1');
  assert.equal(m.expires_at, 1000 + 3_600_000);
  assert.equal(mergeRefreshedToken(tok, { access_token: 'c', expires_in: 60, refresh_token: 'r2' }, 0).refresh_token, 'r2');
});

test('pickDevice prefers the last used, then active, then computer', () => {
  const devs = [
    { id: 'phone', type: 'Smartphone' },
    { id: 'pc', type: 'Computer' },
    { id: 'tv', type: 'TV', is_active: true },
    { id: null, type: 'Computer' },
    { id: 'locked', type: 'Computer', is_restricted: true },
  ];
  assert.equal(pickDevice(devs, 'phone')?.id, 'phone');
  assert.equal(pickDevice(devs)?.id, 'tv');
  assert.equal(pickDevice(devs.filter((d) => !d.is_active))?.id, 'pc');
  assert.equal(pickDevice([]), null);
  assert.equal(pickDevice([{ id: 'locked', is_restricted: true }]), null);
});

test('withDevice appends the query correctly', () => {
  assert.equal(withDevice('/pause', 'x y'), '/pause?device_id=x%20y');
  assert.equal(withDevice('/seek?position_ms=5', 'd'), '/seek?position_ms=5&device_id=d');
  assert.equal(withDevice('/pause', null), '/pause');
});

import { hasScopes, mapPlaylists, mapSearchTracks } from './spotifyResilience.ts';

test('hasScopes requires every scope to be present', () => {
  assert.equal(hasScopes('user-read-email user-library-read', ['user-library-read']), true);
  assert.equal(hasScopes('user-read-email', ['user-library-read']), false);
  assert.equal(hasScopes(undefined, []), true);
});

test('mapSearchTracks drops entries with no id and fills in sane defaults', () => {
  const out = mapSearchTracks([
    { id: 't1', uri: 'spotify:track:t1', name: 'Faixa', artists: [{ name: 'A' }, { name: 'B' }], album: { name: 'Álbum', images: [{ url: 'x.jpg' }] }, duration_ms: 1000 },
    null, { id: null },
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { id: 't1', uri: 'spotify:track:t1', name: 'Faixa', artist: 'A, B', album: 'Álbum', durationMs: 1000, image: 'x.jpg' });
});

test('mapPlaylists drops null entries (Spotify pads deleted playlists with null)', () => {
  const out = mapPlaylists([{ id: 'p1', name: 'Minha lista', owner: { display_name: 'eu' }, tracks: { total: 5 } }, null]);
  assert.equal(out.length, 1);
  assert.equal(out[0].trackCount, 5);
});
