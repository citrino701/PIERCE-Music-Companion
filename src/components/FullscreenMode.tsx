import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  TrackData,
  LyricLine,
  NarrativeChapter,
  AudioFeatures,
  VisualSettings,
  ViewMode,
} from '../types';
import { TRACK_CATALOG } from '../data/tracks';
import {
  VIEW_STORAGE_KEY, elementsFor, parseViewPrefs, resolveLayout, serializeViewPrefs, type ViewPrefs,
} from '../services/colagem/layout';
import { getStageView } from './colagem/views/registry';
import { ViewMenu } from './colagem/ViewMenu';

function loadPrefs(): ViewPrefs {
  try { return parseViewPrefs(localStorage.getItem(VIEW_STORAGE_KEY)); } catch { return parseViewPrefs(null); }
}

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
  const [prefs, setPrefs] = useState<ViewPrefs>(loadPrefs);
  const [box, setBox] = useState({ w: 1280, h: 760 });
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(VIEW_STORAGE_KEY, serializeViewPrefs(prefs)); } catch { /* storage may be blocked */ }
  }, [prefs]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth || 1280, h: el.clientHeight || 760 });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = resolveLayout(box.w, box.h, prefs);
  const View = getStageView(prefs.viewId).Component;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Escape inside the note editor (or any text field) only cancels that edit.
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;
      onSelectMode('reduced');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectMode]);

  return (
    <div ref={host} data-testid="fullscreen-mode-container" className="fixed top-0 right-0 bottom-0 left-16 z-20 overflow-hidden">
      <View
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
        layout={layout}
        compactStyle={prefs.compactStyle}
        elements={elementsFor(layout, prefs)}
        lyricScale={prefs.lyricScale}
      />
      <ViewMenu prefs={prefs} layout={layout} onChange={setPrefs} />
    </div>
  );
};
