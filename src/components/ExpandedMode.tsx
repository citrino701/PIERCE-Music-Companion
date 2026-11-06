import React from 'react';
import {
  TrackData,
  LyricLine,
  NarrativeChapter,
  AudioFeatures,
  VisualSettings,
  ViewMode,
} from '../types';
import { ColagemStage } from './colagem/ColagemStage';

interface ExpandedModeProps {
  track: TrackData;
  tracks: TrackData[];
  onSelectTrack: (track: TrackData) => void;
  progressMs: number;
  isPlaying: boolean;
  volume: number;
  activeLyric?: LyricLine;
  activeChapter?: NarrativeChapter;
  audioFeatures: AudioFeatures;
  visualSettings: VisualSettings;
  onUpdateVisualSettings: (settings: Partial<VisualSettings>) => void;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMute: () => void;
}

/** Expanded view = "Bagunça 3" (see docs/ui-bagunca3-spec.md). */
export const ExpandedMode: React.FC<ExpandedModeProps> = ({
  track,
  tracks,
  progressMs,
  isPlaying,
  activeLyric,
  audioFeatures,
  onSelectMode,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
}) => (
  <div data-testid="expanded-mode-container" className="flex items-center justify-center p-3 sm:p-6 w-full select-none">
    <ColagemStage
      track={track}
      tracks={tracks}
      progressMs={progressMs}
      isPlaying={isPlaying}
      activeLyric={activeLyric}
      audioFeatures={audioFeatures}
      onSelectMode={onSelectMode}
      onTogglePlay={onTogglePlay}
      onSeek={onSeek}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  </div>
);
