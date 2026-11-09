import type { AudioFeatures, LyricLine, TrackData } from '../../../types';
import type { CompactStyle, LayoutId, StageElements } from '../../../services/colagem/layout';

/** Everything a visualisation receives. Playback state and controls come from the app; layout comes from the user's prefs. */
export interface StageViewProps {
  track: TrackData;
  tracks: TrackData[];
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  lyricsText?: string | null;
  audioFeatures: AudioFeatures;
  titleOpacity?: number;
  shuffleEnabled: boolean;
  onToggleShuffle: () => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Resolved layout for the current window (see services/colagem/layout.ts). A view may ignore the ones it does not support. */
  layout: LayoutId;
  compactStyle: CompactStyle;
  /** Elements the person switched on/off for this layout. */
  elements: StageElements;
  lyricScale: number;
}
