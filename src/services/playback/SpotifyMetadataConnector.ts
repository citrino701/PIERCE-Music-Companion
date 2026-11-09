/**
 * Spotify Web API experimental metadata connector.
 * Uses Authorization Code + PKCE. No client secret is stored or required.
 * Spotify audio is never captured, analyzed, or synchronized to visuals here.
 */
import { pickBestLyricsRecord } from '../lyrics/lrc';
import { mergeRefreshedToken, needsRefresh, pickDevice, withDevice, type SpotifyDevice } from './spotifyResilience';

const CLIENT_ID = '22cbfb1b63b146b79892330d3838609f';
const WEB_REDIRECT_URI = 'https://pierce-music-companion.hugoviajante.workers.dev/';
/**
 * Spotify only accepts https URLs or the loopback IP 127.0.0.1 (not "localhost"). The desktop app in dev runs on
 * http://127.0.0.1:3000 so the login returns to the same origin (keeps the Tauri bridge and the saved token);
 * every other origin keeps using the deployed site. Add http://127.0.0.1:3000/ to the app's Redirect URIs in the Spotify dashboard.
 */
export const spotifyRedirectUri = (): string =>
  typeof window !== 'undefined' && window.location.hostname === '127.0.0.1' ? `${window.location.origin}/` : WEB_REDIRECT_URI;
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
  shuffle_state?: boolean;
  device?: SpotifyDevice | null;
  progress_ms: number | null;
  item: {
    id: string;
    name: string;
    duration_ms: number;
    explicit?: boolean;
    artists: Array<{ id: string; name: string }>;
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
      redirect_uri: spotifyRedirectUri(),
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
      redirect_uri: spotifyRedirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error(`Falha ao trocar código Spotify (${response.status}).`);
  const token = await response.json() as Omit<SpotifyToken, 'expires_at'>;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...token, expires_at: Date.now() + token.expires_in * 1000 }));
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  window.history.replaceState({}, document.title, spotifyRedirectUri());
  return true;
}

function readStoredToken(): SpotifyToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SpotifyToken; } catch { localStorage.removeItem(TOKEN_KEY); return null; }
}

/** Still-valid access token, without renewing (kept for synchronous checks). */
export function getSpotifyToken(): SpotifyToken | null {
  const token = readStoredToken();
  return token && token.expires_at > Date.now() + 30_000 ? token : null;
}

/** True while there is a session we can use or renew: the person does not need to log in again. */
export function hasSpotifySession(): boolean {
  const token = readStoredToken();
  return !!token && (!!token.refresh_token || token.expires_at > Date.now() + 30_000);
}

let refreshing: Promise<SpotifyToken | null> | null = null;

/** Trades the refresh token for a new access token (PKCE flow: no client secret). */
export function refreshSpotifyToken(): Promise<SpotifyToken | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const old = readStoredToken();
    if (!old?.refresh_token) return null;
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: old.refresh_token, client_id: CLIENT_ID }),
    });
    if (response.status === 400 || response.status === 401) { localStorage.removeItem(TOKEN_KEY); return null; } // revoked: login needed
    if (!response.ok) throw new Error(`Falha ao renovar a sessão Spotify (${response.status}).`);
    const merged = mergeRefreshedToken(old, await response.json());
    localStorage.setItem(TOKEN_KEY, JSON.stringify(merged));
    return merged;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/** Access token that is valid right now, renewing it first when it is about to expire. */
export async function getValidSpotifyToken(): Promise<SpotifyToken | null> {
  const token = readStoredToken();
  if (!token) return null;
  if (!needsRefresh(token)) return token;
  if (!token.refresh_token) return token.expires_at > Date.now() ? token : null;
  return refreshSpotifyToken();
}

/** fetch with Bearer auth; on 401 renews once and retries. */
async function spotifyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getValidSpotifyToken();
  if (!token) throw new Error('Conecte novamente sua conta Spotify para liberar os controles.');
  const call = (t: SpotifyToken) => fetch(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: 'Bearer ' + t.access_token } });
  let response = await call(token);
  if (response.status === 401) {
    token = await refreshSpotifyToken();
    if (token) response = await call(token);
  }
  return response;
}

let lastDeviceId: string | null = null;

export async function getSpotifyNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const response = await spotifyFetch('https://api.spotify.com/v1/me/player');
  // 204 = no active device (Spotify drops it a few minutes after pausing). Not an error and not a logout.
  if (response.status === 204) return null;
  if (response.status === 401) throw new Error('A sessão Spotify expirou. Conecte novamente.');
  if (!response.ok) throw new Error(`Spotify API respondeu com erro ${response.status}.`);
  const snapshot = await response.json() as SpotifyNowPlaying;
  if (snapshot.device?.id) lastDeviceId = snapshot.device.id;
  return snapshot;
}

export async function pauseSpotifyPlayback(): Promise<void> {
  return spotifyPlaybackCommand('pause');
}

export async function resumeSpotifyPlayback(): Promise<void> {
  return spotifyPlaybackCommand('play');
}

async function spotifyPlaybackCommand(action: 'pause' | 'play'): Promise<void> {
  return spotifyPlayerRequest('/' + action, 'PUT');
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

const NO_DEVICE_MESSAGE = 'Não achei nenhum dispositivo Spotify. Abra o Spotify no PC ou no celular, toque uma faixa uma vez e tente de novo.';

async function wakeDevice(): Promise<string | null> {
  const response = await spotifyFetch('https://api.spotify.com/v1/me/player/devices');
  if (!response.ok) return null;
  const { devices } = await response.json() as { devices?: SpotifyDevice[] };
  const chosen = pickDevice(devices ?? [], lastDeviceId);
  if (chosen?.id) lastDeviceId = chosen.id;
  return chosen?.id ?? null;
}

/**
 * Player command. Always targets the last known device; if Spotify answers "no active device"
 * (it forgets an idle device after a few minutes) the device list is consulted and the command is retried there.
 */
async function spotifyPlayerRequest(path: string, method: 'PUT' | 'POST'): Promise<void> {
  const send = (deviceId: string | null) => spotifyFetch('https://api.spotify.com/v1/me/player' + withDevice(path, deviceId), { method });
  let response = await send(lastDeviceId);
  if (response.status === 404) {
    const deviceId = await wakeDevice();
    if (!deviceId) throw new Error(NO_DEVICE_MESSAGE);
    response = await send(deviceId);
  }
  // Spotify documents 204, but some successful Player API responses arrive as 200/202.
  if (response.ok) return;
  if (response.status === 401) throw new Error('A sessão Spotify expirou. Conecte novamente.');
  if (response.status === 403) throw new Error('O Spotify exige uma conta Premium para controlar a reprodução.');
  if (response.status === 404) throw new Error(NO_DEVICE_MESSAGE);
  throw new Error('Não foi possível controlar o Spotify (erro ' + response.status + ').');
}


const artistGenreCache=new Map<string,string[]>();
const trackGenreCache=new Map<string,string[]>();
const trackGenrePending=new Map<string,Promise<string[]>>();
let lastMbRequest=0;
async function mbFetch(url:string):Promise<Response>{const wait=Math.max(0,1100-(Date.now()-lastMbRequest));if(wait)await new Promise(resolve=>window.setTimeout(resolve,wait));lastMbRequest=Date.now();return fetch(url,{headers:{Accept:'application/json'}});}
async function spotifyArtistGenres(ids:string[]):Promise<string[]>{const token=await getValidSpotifyToken();if(!token)return[];const missing=[...new Set(ids.filter(Boolean))].filter(id=>!artistGenreCache.has(id));for(let i=0;i<missing.length;i+=5){const results=await Promise.all(missing.slice(i,i+5).map(async id=>{try{const res=await fetch('https://api.spotify.com/v1/artists/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token.access_token}});if(!res.ok)return{id,genres:[] as string[]};const data=await res.json() as {genres?:string[]};return{id,genres:Array.isArray(data.genres)?data.genres.filter(Boolean):[]};}catch{return{id,genres:[] as string[]};}}));results.forEach(x=>artistGenreCache.set(x.id,x.genres));}return[...new Set(ids.flatMap(id=>artistGenreCache.get(id)??[]))];}
async function musicBrainzArtistTags(artist:string):Promise<string[]>{
 const query=`artist:"${artist.split(',')[0].trim()}"`;
 const search=await mbFetch('https://musicbrainz.org/ws/2/artist/?'+new URLSearchParams({query,fmt:'json',limit:'5'}));
 if(!search.ok)return[];
 const data=await search.json() as {artists?:Array<{id:string;score?:number}>};
 const match=data.artists?.sort((a,b)=>(b.score??0)-(a.score??0))[0];
 if(!match?.id)return[];
 const response=await mbFetch('https://musicbrainz.org/ws/2/artist/'+encodeURIComponent(match.id)+'?'+new URLSearchParams({inc:'tags',fmt:'json'}));
 if(!response.ok)return[];
 const body=await response.json() as {tags?:Array<{name:string;count?:number}>};
 const ignored=new Set(['seen live','favorites','favorite','spotify','all','music','my music']);
 return(body.tags??[]).filter(t=>!ignored.has(t.name.toLowerCase())).sort((a,b)=>(b.count??0)-(a.count??0)).slice(0,4).map(t=>t.name);
}
async function musicBrainzRecordingTags(title:string,artist:string):Promise<string[]>{const query=`recording:"${title}" AND artist:"${artist.split(',')[0].trim()}"`;const search=await mbFetch('https://musicbrainz.org/ws/2/recording/?'+new URLSearchParams({query,fmt:'json',limit:'5'}));if(!search.ok)return[];const data=await search.json() as {recordings?:Array<{id:string;score?:number}>};const rec=data.recordings?.sort((a,b)=>(b.score??0)-(a.score??0))[0];if(!rec?.id)return[];const response=await mbFetch('https://musicbrainz.org/ws/2/recording/'+encodeURIComponent(rec.id)+'?'+new URLSearchParams({inc:'tags',fmt:'json'}));if(!response.ok)return[];const body=await response.json() as {tags?:Array<{name:string;count?:number}>};const ignored=new Set(['seen live','favorites','favorite','spotify','all','music','my music']);return(body.tags??[]).filter(t=>!ignored.has(t.name.toLowerCase())).sort((a,b)=>(b.count??0)-(a.count??0)).slice(0,4).map(t=>t.name);}
export async function getTrackGenres(input:{artistIds:string[];title:string;artist:string}):Promise<string[]>{const key=input.title.toLowerCase()+'::'+input.artist.toLowerCase();if(trackGenreCache.has(key))return trackGenreCache.get(key)!;const pending=trackGenrePending.get(key);if(pending)return pending;const job=(async()=>{const spotify=await spotifyArtistGenres(input.artistIds);const recordingTags=spotify.length?[]:await musicBrainzRecordingTags(input.title,input.artist).catch(()=>[]);const genres=spotify.length?spotify:(recordingTags.length?recordingTags:await musicBrainzArtistTags(input.artist).catch(()=>[]));trackGenreCache.set(key,genres);return genres;})();trackGenrePending.set(key,job);try{return await job;}finally{trackGenrePending.delete(key);}}
export interface LyricsRecord {plainLyrics:string|null;syncedLyrics:string|null;instrumental:boolean;duration?:number|null;}
export async function fetchTrackLyrics(track:{title:string;artist:string;album:string;durationMs:number}):Promise<LyricsRecord|null>{
 const headers={'Lrclib-Client':'PIERCE-Music-Companion/0.1.0'},artist=track.artist.split(',')[0].trim();
 const exact=await fetch('https://lrclib.net/api/get?'+new URLSearchParams({track_name:track.title,artist_name:artist,album_name:track.album,duration:String(Math.round(track.durationMs/1000))}),{headers});
 let exactRecord:LyricsRecord|null=null;
 if(exact.ok){exactRecord=await exact.json() as LyricsRecord;if(exactRecord.syncedLyrics||exactRecord.instrumental)return exactRecord;}else if(exact.status!==404)throw new Error('Não foi possível buscar a letra (LRCLIB '+exact.status+').');
 const search=await fetch('https://lrclib.net/api/search?'+new URLSearchParams({track_name:track.title,artist_name:artist}),{headers}).catch(()=>null);
 const candidates=search?.ok?await search.json() as LyricsRecord[]:[];
 const best=pickBestLyricsRecord(candidates,track.durationMs);
 return best?.syncedLyrics?best:(exactRecord??best);
}
export function disconnectSpotify(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
}
