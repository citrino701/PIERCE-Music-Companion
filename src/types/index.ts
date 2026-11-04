export type ViewMode = 'compact' | 'disc' | 'expanded' | 'fullscreen' | 'zen';

export interface LyricLine {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  subtext?: string;
  emphasis?: boolean;
}

export interface NarrativeChapter {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  emotion: string;
  theme: string;
  visualBrief: string;
}

export interface MontageScene {
  id: string;
  title: string;
  image: string;
  secondaryImage?: string;
  tag: string;
  layout: 'single' | 'split' | 'collage' | 'dither';
  speed: 'normal' | 'slow' | 'jumpcut';
  aspectRatio: string;
  caption?: string;
}

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  durationMs: number;
  bpm: number;
  key: string;
  mood: string;
  accentColor: string;
  secondaryColor: string;
  coverImage: string;
  discArtwork: string;
  chapters: NarrativeChapter[];
  lyrics: LyricLine[];
  scenes: MontageScene[];
}

export interface AudioFeatures {
  energy: number; // 0..1
  rms: number; // 0..1
  lowBand: number; // 0..1
  midBand: number; // 0..1
  highBand: number; // 0..1
  onset: boolean; // transient beat hit
}

export interface VisualSettings {
  filmGrain: boolean;
  scanlines: boolean;
  asciiOverlay: boolean;
  kineticLyrics: boolean;
  filmBurns: boolean;
  intensity: number; // 0..1
}
