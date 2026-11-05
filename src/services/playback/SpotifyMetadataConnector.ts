/**
 * Spotify Web API experimental metadata connector.
 * Uses Authorization Code + PKCE. No client secret is stored or required.
 * Spotify audio is never captured, analyzed, or synchronized to visuals here.
 */
const CLIENT_ID = '22cbfb1b63b146b79892330d3838609f';
const REDIRECT_URI = 'https://pierce-music-companion.hugoviajante.workers.dev/';
const SCOPES = ['user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state'];
const TOKEN_KEY = 'pierce.spotify.token';
const VERIFIER_KEY = 'pierce.spotify.pkce.verifier';
const STATE_KEY = 'pierce.spotify.oauth.state';

export interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  expires_at: number;
  scope: string;
}

export interface SpotifyNowPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  item: {
    id: string;
    name: string;
    duration_ms: number;
    explicit?: boolean;
    artists: Array<{ name: string }>;
    album: { name: string; images?: Array<{ url: string; height?: number; width?: number }> };
  } | null;
}

function base64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function createChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
}

export function beginSpotifyAuthorization(): void {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)).buffer);
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)).buffer);
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);
  void createChallenge(verifier).then((challenge) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      scope: SCOPES.join(' '),
    });
    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });
}

export async function completeSpotifyAuthorization(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (!code) return false;
  const state = url.searchParams.get('state');
  const expectedState = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!state || state !== expectedState || !verifier) {
    throw new Error('A validação de segurança do Spotify falhou. Tente conectar novamente.');
  }
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error(`Falha ao trocar código Spotify (${response.status}).`);
  const token = await response.json() as Omit<SpotifyToken, 'expires_at'>;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...token, expires_at: Date.now() + token.expires_in * 1000 }));
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  window.history.replaceState({}, document.title, REDIRECT_URI);
  return true;
}

export function getSpotifyToken(): SpotifyToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const token = JSON.parse(raw) as SpotifyToken;
    return token.expires_at > Date.now() + 30_000 ? token : null;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export async function getSpotifyNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const token = getSpotifyToken();
  if (!token) throw new Error('Conecte sua conta Spotify novamente para atualizar a sessão.');
  const response = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (response.status === 204) return null;
  if (response.status === 401) throw new Error('A sessão Spotify expirou. Conecte novamente.');
  if (!response.ok) throw new Error(`Spotify API respondeu com erro ${response.status}.`);
  return await response.json() as SpotifyNowPlaying;
}

export async function pauseSpotifyPlayback(): Promise<void> {
  return spotifyPlaybackCommand('pause');
}

export async function resumeSpotifyPlayback(): Promise<void> {
  return spotifyPlaybackCommand('play');
}

async function spotifyPlaybackCommand(action: 'pause' | 'play'): Promise<void> {
  const token = getSpotifyToken();
  if (!token) throw new Error('Conecte novamente sua conta Spotify para liberar os controles.');
  const response = await fetch('https://api.spotify.com/v1/me/player/' + action, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token.access_token },
  });
  // Spotify documents 204, but some successful Player API responses arrive as 200/202.
  // Treat every 2xx response as success; only surface actual HTTP failures.
  if (response.ok) return;
  if (response.status === 401) throw new Error('A sessão Spotify expirou. Conecte novamente.');
  if (response.status === 403) throw new Error('O Spotify exige uma conta Premium e um dispositivo ativo para controlar a reprodução.');
  if (response.status === 404) throw new Error('Nenhum dispositivo Spotify ativo foi encontrado. Abra o Spotify e inicie uma faixa.');
  throw new Error('Não foi possível controlar o Spotify (erro ' + response.status + ').');
}

export async function seekSpotifyPlayback(positionMs: number): Promise<void> {
  return spotifyPlayerRequest('/seek?position_ms=' + Math.max(0, Math.round(positionMs)), 'PUT');
}

export async function skipSpotifyTrack(direction: 'next' | 'previous'): Promise<void> {
  return spotifyPlayerRequest('/' + direction, 'POST');
}

export async function setSpotifyShuffle(enabled: boolean): Promise<void> {
  return spotifyPlayerRequest('/shuffle?state=' + String(enabled), 'PUT');
}

async function spotifyPlayerRequest(path: string, method: 'PUT' | 'POST'): Promise<void> {
  const token = getSpotifyToken();
  if (!token) throw new Error('Conecte novamente sua conta Spotify para liberar os controles.');
  const response = await fetch('https://api.spotify.com/v1/me/player' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token.access_token },
  });
  if (response.ok) return;
  if (response.status === 401) throw new Error('A sessão Spotify expirou. Conecte novamente.');
  if (response.status === 403) throw new Error('O Spotify exige uma conta Premium e um dispositivo ativo para controlar a reprodução.');
  if (response.status === 404) throw new Error('Nenhum dispositivo Spotify ativo foi encontrado. Abra o Spotify e inicie uma faixa.');
  throw new Error('Não foi possível controlar o Spotify (erro ' + response.status + ').');
}

export interface LyricsRecord { plainLyrics: string | null; syncedLyrics: string | null; instrumental: boolean; }

export async function fetchTrackLyrics(track: { title: string; artist: string; album: string; durationMs: number }): Promise<LyricsRecord | null> {
  const params = new URLSearchParams({
    track_name: track.title,
    artist_name: track.artist.split(',')[0].trim(),
    album_name: track.album,
    duration: String(Math.round(track.durationMs / 1000)),
  });
  const response = await fetch('https://lrclib.net/api/get?' + params.toString(), {
    headers: { 'Lrclib-Client': 'PIERCE-Music-Companion/0.1.0' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Não foi possível buscar a letra (LRCLIB ' + response.status + ').');
  return await response.json() as LyricsRecord;
}

export function disconnectSpotify(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
}
