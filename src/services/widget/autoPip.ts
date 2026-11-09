import { isPipSupported } from './pipWindow';

/**
 * Chrome (134+) opens a Picture-in-Picture window by itself when you leave a tab that is playing media and has a
 * Media Session "enterpictureinpicture" handler. Conditions: the page is playing audio that was audible in the last 2 s.
 * PiErCe plays no audio (Spotify does), so while Spotify is playing we keep a tone far below hearing level running.
 */

export const supportsAutoPip = (): boolean =>
  typeof navigator !== 'undefined' && 'mediaSession' in navigator && isPipSupported();

/** ~ -54 dBFS at 40 Hz: above Chrome's silence threshold (about -72 dBFS) but inaudible under music, even on speakers. */
export const KEEPALIVE_FREQUENCY_HZ = 40;
export const KEEPALIVE_GAIN = 0.002;

export interface KeepAlive {
  /** Must run inside a user gesture the first time (browser autoplay policy). */
  unlock(): void;
  start(): void;
  stop(): void;
}

export function createKeepAlive(): KeepAlive {
  let ctx: AudioContext | null = null;
  let osc: OscillatorNode | null = null;
  let wanted = false;

  const ensure = (): AudioContext | null => {
    if (ctx) return ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  };
  const run = () => {
    const c = ensure();
    if (!c || !wanted || osc) return;
    if (c.state === 'suspended') void c.resume().catch(() => undefined);
    const gain = c.createGain();
    gain.gain.value = KEEPALIVE_GAIN;
    osc = c.createOscillator();
    osc.frequency.value = KEEPALIVE_FREQUENCY_HZ;
    osc.connect(gain).connect(c.destination);
    osc.start();
  };
  return {
    unlock() { ensure(); if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined); run(); },
    start() { wanted = true; if (ctx && ctx.state !== 'closed') run(); },
    stop() { wanted = false; try { osc?.stop(); } catch { /* already stopped */ } osc?.disconnect(); osc = null; },
  };
}

export interface MediaHandlers {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  enterPip: () => void;
}

export function registerMediaSession(h: MediaHandlers): () => void {
  if (!('mediaSession' in navigator)) return () => undefined;
  const set = (action: string, fn: (() => void) | null) => {
    try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, fn); } catch { /* action not supported in this browser */ }
  };
  set('play', h.play); set('pause', h.pause); set('nexttrack', h.next); set('previoustrack', h.previous);
  set('enterpictureinpicture', h.enterPip);
  return () => { ['play', 'pause', 'nexttrack', 'previoustrack', 'enterpictureinpicture'].forEach((a) => set(a, null)); };
}

export function updateMediaMetadata(track: { title: string; artist: string; album: string; coverImage: string } | null, playing: boolean): void {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = track
    ? new MediaMetadata({ title: track.title, artist: track.artist, album: track.album, artwork: track.coverImage ? [{ src: track.coverImage }] : [] })
    : null;
  navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}
