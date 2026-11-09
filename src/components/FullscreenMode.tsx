import React, { useEffect } from 'react';
import {
  TrackData,
  LyricLine,
  NarrativeChapter,
  AudioFeatures,
  VisualSettings,
  ViewMode,
} from '../types';
import { TRACK_CATALOG } from '../data/tracks';
import { ColagemStage } from './colagem/ColagemStage';

interface FullscreenModeProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  volume: number;
  activeLyric?: LyricLine;
  lyricsText?: string | null;
  onToggleShuffle: () => void;
  shuffleEnabled: boolean;
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

/** Fullscreen = "Bagunça 3" (docs/ui-bagunca3-spec.md) over the whole window, beside the navigation rail. */
export const FullscreenMode: React.FC<FullscreenModeProps> = ({
  track,
  progressMs,
  isPlaying,
  activeLyric,
  lyricsText,
  onToggleShuffle,
  shuffleEnabled,
  audioFeatures,
  onSelectMode,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Escape inside the note editor (or any text field) only cancels that edit.
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;
      onSelectMode('compact');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectMode]);

  return (
    <div data-testid="fullscreen-mode-container" className="fixed top-0 right-0 bottom-0 left-16 z-20 overflow-hidden">
      <ColagemStage
        track={track}
        tracks={TRACK_CATALOG}
        progressMs={progressMs}
        isPlaying={isPlaying}
        activeLyric={activeLyric}
        lyricsText={lyricsText}
        audioFeatures={audioFeatures}
        shuffleEnabled={shuffleEnabled}
        onToggleShuffle={onToggleShuffle}
        onTogglePlay={onTogglePlay}
        onSeek={onSeek}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
};
