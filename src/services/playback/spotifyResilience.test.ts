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

import { hasScopes, mapPlaylists, mapSearchTracks, mapTopArtists, mapTopTracks, rangeLabel, tallyRecentlyPlayed } from './spotifyResilience.ts';

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

test('mapTopArtists drops entries with no id and defaults genres/image', () => {
  const out = mapTopArtists([{ id: 'a1', name: 'KATSEYE', genres: ['pop'], images: [{ url: 'a.jpg' }] }, null, { id: null }]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { id: 'a1', name: 'KATSEYE', genres: ['pop'], image: 'a.jpg' });
  assert.deepEqual(mapTopArtists([{ id: 'a2' }])[0], { id: 'a2', name: 'Artista desconhecido', genres: [], image: '' });
});

test('mapTopTracks drops entries with no id and joins artist names', () => {
  const out = mapTopTracks([{ id: 't1', name: 'Gabriela', artists: [{ name: 'KATSEYE' }], album: { images: [{ url: 't.jpg' }] } }, null]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { id: 't1', uri: 'spotify:track:t1', name: 'Gabriela', artist: 'KATSEYE', image: 't.jpg' });
});

test('rangeLabel maps every stats window to a Portuguese label', () => {
  assert.equal(rangeLabel('week'), 'Última semana');
  assert.equal(rangeLabel('short_term'), 'Últimas 4 semanas');
  assert.equal(rangeLabel('medium_term'), 'Últimos 6 meses');
  assert.equal(rangeLabel('long_term'), 'Desde sempre');
});

const NOW = Date.parse('2026-11-16T12:00:00Z');
const WEEK_AGO = NOW - 7 * 24 * 60 * 60 * 1000;
const playedAt = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

test('tallyRecentlyPlayed counts plays and ranks the most-played first', () => {
  const items = [
    { played_at: playedAt(1), track: { id: 't1', name: 'Gabriela', artists: [{ id: 'a1', name: 'KATSEYE' }], album: { images: [{ url: 'g.jpg' }] } } },
    { played_at: playedAt(2), track: { id: 't1', name: 'Gabriela', artists: [{ id: 'a1', name: 'KATSEYE' }], album: { images: [{ url: 'g.jpg' }] } } },
    { played_at: playedAt(3), track: { id: 't2', name: 'Push 2 Start', artists: [{ id: 'a2', name: 'Tyla' }], album: { images: [{ url: 'p.jpg' }] } } },
  ];
  const { artists, tracks } = tallyRecentlyPlayed(items, WEEK_AGO, 10);
  assert.deepEqual(tracks[0], { id: 't1', uri: 'spotify:track:t1', name: 'Gabriela', artist: 'KATSEYE', image: 'g.jpg' });
  assert.equal(tracks[1].id, 't2');
  assert.equal(artists[0].id, 'a1');
  assert.equal(artists[0].name, 'KATSEYE');
});

test('tallyRecentlyPlayed drops plays older than the cutoff and entries with no track id', () => {
  const items = [
    { played_at: playedAt(24 * 10), track: { id: 'old', name: 'Faixa antiga', artists: [{ id: 'a9', name: 'X' }] } },
    { played_at: playedAt(1), track: { id: null, name: 'Sem id' } },
    { played_at: playedAt(1), track: { id: 't3', name: 'Faixa válida', artists: [{ id: 'a3', name: 'Y' }] } },
  ];
  const { artists, tracks } = tallyRecentlyPlayed(items, WEEK_AGO, 10);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].id, 't3');
  assert.equal(artists.length, 1);
  assert.equal(artists[0].id, 'a3');
});

test('tallyRecentlyPlayed respects the limit', () => {
  const items = Array.from({ length: 5 }, (_, i) => ({
    played_at: playedAt(1), track: { id: `t${i}`, name: `Faixa ${i}`, artists: [{ id: `a${i}`, name: `Art ${i}` }] },
  }));
  const { tracks } = tallyRecentlyPlayed(items, WEEK_AGO, 2);
  assert.equal(tracks.length, 2);
});
