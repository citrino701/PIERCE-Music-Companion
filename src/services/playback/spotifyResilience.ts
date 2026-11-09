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
export function withDevice(path: string, deviceId?: string | null): string {
  if (!deviceId) return path;
  return path + (path.includes('?') ? '&' : '?') + 'device_id=' + encodeURIComponent(deviceId);
}
