/** Pure helpers that keep the Spotify connection alive (token renewal and device choice). */

export interface StoredToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  expires_at: number;
  scope: string;
}

export interface SpotifyDevice {
  id: string | null;
  name?: string;
  type?: string;
  is_active?: boolean;
  is_restricted?: boolean;
  volume_percent?: number | null;
}

/** Renew a minute before the access token (1 h) expires. */
export const REFRESH_MARGIN_MS = 60_000;

export function needsRefresh(token: Pick<StoredToken, 'expires_at'>, now = Date.now()): boolean {
  return token.expires_at - now < REFRESH_MARGIN_MS;
}

/** Spotify may omit refresh_token when renewing; the old one stays valid then. */
export function mergeRefreshedToken(
  old: StoredToken,
  fresh: Partial<Omit<StoredToken, 'expires_at'>> & { access_token: string; expires_in: number },
  now = Date.now(),
): StoredToken {
  return {
    ...old,
    ...fresh,
    refresh_token: fresh.refresh_token ?? old.refresh_token,
    scope: fresh.scope ?? old.scope,
    token_type: fresh.token_type ?? old.token_type,
    expires_at: now + fresh.expires_in * 1000,
  };
}

/** Which device to wake when none is active: the last one we saw, else the active one, else a computer, else any usable one. */
export function pickDevice(devices: SpotifyDevice[], preferredId?: string | null): SpotifyDevice | null {
  const usable = devices.filter((d) => d.id && !d.is_restricted);
  return (
    usable.find((d) => d.id === preferredId) ??
    usable.find((d) => d.is_active) ??
    usable.find((d) => d.type === 'Computer') ??
    usable[0] ??
    null
  );
}

/** Adds device_id to a player path ("/pause", "/seek?position_ms=1"). */
/** True when a stored token's granted scope string covers every scope the caller needs. */
export function hasScopes(scope: string | undefined, needed: string[]): boolean {
  const granted = new Set((scope ?? '').split(' ').filter(Boolean));
  return needed.every((s) => granted.has(s));
}

export interface SpotifySearchTrack {
  id: string; uri: string; name: string; artist: string; album: string; durationMs: number; image: string;
}
export interface SpotifyPlaylistSummary {
  id: string; uri: string; name: string; owner: string; trackCount: number; image: string;
}

/** Spotify search/track JSON -> the shape the UI needs. Drops entries missing an id (local files, removed tracks). */
export function mapSearchTracks(items: Array<{
  id?: string | null; uri?: string; name?: string; duration_ms?: number;
  artists?: Array<{ name?: string }>; album?: { name?: string; images?: Array<{ url?: string }> };
} | null | undefined>): SpotifySearchTrack[] {
  return (items ?? []).filter((t): t is NonNullable<typeof t> => !!t?.id).map((t) => ({
    id: t.id as string, uri: t.uri ?? `spotify:track:${t.id}`, name: t.name ?? 'Sem título',
    artist: (t.artists ?? []).map((a) => a.name).filter(Boolean).join(', ') || 'Artista desconhecido',
    album: t.album?.name ?? '', durationMs: t.duration_ms ?? 0, image: t.album?.images?.[0]?.url ?? '',
  }));
}

/** Playlist list JSON -> the shape the UI needs. Drops null entries (Spotify pads deleted playlists with null). */
export function mapPlaylists(items: Array<{
  id?: string; uri?: string; name?: string; owner?: { display_name?: string };
  tracks?: { total?: number }; images?: Array<{ url?: string }>;
} | null | undefined>): SpotifyPlaylistSummary[] {
  return (items ?? []).filter((p): p is NonNullable<typeof p> => !!p?.id).map((p) => ({
    id: p.id as string, uri: p.uri ?? `spotify:playlist:${p.id}`, name: p.name ?? 'Playlist sem nome',
    owner: p.owner?.display_name ?? '', trackCount: p.tracks?.total ?? 0, image: p.images?.[0]?.url ?? '',
  }));
}

export function withDevice(path: string, deviceId?: string | null): string {
  if (!deviceId) return path;
  return path + (path.includes('?') ? '&' : '?') + 'device_id=' + encodeURIComponent(deviceId);
}
