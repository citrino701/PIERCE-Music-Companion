import React from 'react';
import type { AudioFeatures, LyricLine, TrackData, TrackPalette } from '../../types';
import { formatClock, splitTitle, titleFontSize } from '../../services/colagem/colagem';
import type { CompactStyle, StageElements } from '../../services/colagem/layout';
import { lyricSizes } from '../../services/colagem/layout';
import { INK } from '../../services/palette/trackPalette';
import { AsciiVignette } from './AsciiVignette';
import { COMPACT_DOCK_HEIGHT, CompactDock } from './CompactDock';
import { LiveCover } from './LiveCover';
import { LyricStack } from './LyricStack';
import { TrackNotes } from './TrackNotes';
import { WordDots } from './WordDots';

interface Props {
  style: CompactStyle;
  elements: StageElements;
  lyricScale: number;
  w: number;
  h: number;
  t: number;
  pal: TrackPalette;
  track: TrackData;
  tracks: TrackData[];
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  lyricsText?: string | null;
  plainWords?: string[];
  audioFeatures: AudioFeatures;
  titleOpacity: number;
  shuffleEnabled: boolean;
  onToggleShuffle: () => void;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const NOTES_ROW = 40;

/**
 * Narrow-window layouts, drawn at real pixel size (nothing is scaled down), so the lyrics stay readable.
 *  - reading: slim colour header, lyrics get almost the whole window.
 *  - stacked: title block + cover on top, then the lyrics, then a two-row dock.
 */
export const CompactLayout: React.FC<Props> = ({ style, elements: el, lyricScale, w, h, t, pal, track, tracks, progressMs, isPlaying, activeLyric, lyricsText, plainWords, audioFeatures, titleOpacity, shuffleEnabled, onToggleShuffle, onTogglePlay, onSeek, onPrevious, onNext }) => {
  const vars = { '--track-bg': pal.bg, '--track-a': pal.a, '--track-b': pal.b, '--track-deep': pal.deep, '--track-on-a': pal.onA, '--ink': INK } as React.CSSProperties;
  const [l1, l2] = splitTitle(track.title);
  const n = String(Math.max(0, tracks.findIndex((x) => x.id === track.id)) + 1).padStart(2, '0');
  const progress = progressMs / Math.max(1, track.durationMs);
  const S = Math.min(w, h * 0.9);
  const reading = style === 'reading';

  const headerBottom = !el.titleBlock ? 0
    : reading ? 14 + 54
    : 16 + Math.round(Math.min(190, Math.max(120, h * 0.22)));
  const dockH = COMPACT_DOCK_HEIGHT[style];
  const notesH = el.notes ? NOTES_ROW : 0;
  const lyricTop = headerBottom + (el.titleBlock ? 18 : 54);
  const lyricBottom = 16 + dockH + 12 + notesH;
  const lyricRect = { left: 24, top: lyricTop, width: Math.max(120, w - 48), height: Math.max(80, h - lyricTop - lyricBottom) };
  const sizes = lyricSizes(style, w, lyricScale);
  const bigOpacity = reading ? titleOpacity * 0.5 : titleOpacity * 0.8;

  const stackedBlockW = el.cover ? Math.round((w - 48) * 0.6) : w - 32;
  const stackedH = Math.round(Math.min(190, Math.max(120, h * 0.22)));
  // Title font must fit both the block width (beside the settings button) and its height (one or two lines).
  const titleLines = l2 ? 2 : 1;
  const stackedTitle = Math.max(24, Math.min(
    Math.round(titleFontSize([l1, l2]) * ((stackedBlockW - 68) / 356)),
    Math.floor((stackedH - 40) / (titleLines * 0.92)),
  ));

  return (
    <div data-testid="colagem-compact" data-layout={style} style={{ ...vars, position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: "'Arimo', Helvetica, Arial, sans-serif", color: 'var(--ink)', background: 'var(--track-bg)', transition: 'background .8s' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(20,20,43,0.14) 0.7px, transparent 0.9px)', backgroundSize: '4px 4px' }} />

      {el.bigTitle && <>
        <div aria-hidden="true" style={{ position: 'absolute', left: Math.round(w * 0.48), top: Math.round(-0.05 * h), font: `italic 400 ${Math.round(0.6 * S)}px/1 'Instrument Serif', Georgia, serif`, color: 'var(--track-a)', opacity: bigOpacity, whiteSpace: 'nowrap', transition: 'color .8s' }}>Pi</div>
        <div aria-hidden="true" style={{ position: 'absolute', left: Math.round(w * 0.3), top: Math.round(h * 0.46), font: `italic 400 ${Math.round(0.42 * S)}px/1 'Instrument Serif', Georgia, serif`, color: 'var(--track-b)', opacity: bigOpacity, whiteSpace: 'nowrap', transition: 'color .8s' }}>ErCe</div>
      </>}

      {el.ascii && <AsciiVignette t={t} w={w} h={h} mask="radial-gradient(ellipse 62% 55% at 50% 48%, transparent 50%, #000 100%)" />}
      {el.dots && <WordDots track={track} playing={isPlaying} w={w} h={h} extraWords={plainWords} compact={{ top: headerBottom + 8, bottom: dockH + 24 }} />}

      {el.titleBlock && reading && (
        <div style={{ position: 'absolute', left: 16, right: 16, top: 14, height: 54, boxSizing: 'border-box', background: 'var(--track-a)', border: '2px solid var(--ink)', borderRadius: 14, padding: '0 14px 0 50px', display: 'flex', alignItems: 'center', gap: 12, transition: 'background .8s' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, font: "700 19px/1 'Arimo', Helvetica, Arial, sans-serif", letterSpacing: '-0.03em', color: 'var(--track-on-a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .8s' }}>{track.title}</h2>
            <div style={{ font: "11px/1 'DM Mono', monospace", color: 'var(--track-on-a)', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .8s' }}>{track.artist}{track.year ? ` · ${track.year}` : ''}</div>
          </div>
          <span style={{ font: "11px 'DM Mono', monospace", color: 'var(--track-on-a)', flex: 'none' }}>{formatClock(progressMs)}</span>
        </div>
      )}

      {el.titleBlock && !reading && (
        <>
          <div style={{ position: 'absolute', left: 16, top: 16, width: stackedBlockW, height: stackedH, background: 'var(--track-a)', overflow: 'hidden', transition: 'background .8s' }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.3px, transparent 1.7px) 0 0 / 6px 6px', WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)', maskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)' }} />
            <h2 style={{ position: 'absolute', left: 52, top: 12, margin: 0, font: `700 ${stackedTitle}px/0.92 'Arimo', Helvetica, Arial, sans-serif`, color: 'var(--track-on-a)', letterSpacing: '-0.04em', whiteSpace: 'nowrap', transition: 'color .8s' }} aria-label={track.title}>
              <span aria-hidden="true">{l1}{l2 && <><br />{l2}</>}</span>
            </h2>
            <div style={{ position: 'absolute', left: 16, right: 16, bottom: 10, font: "500 12px/1.3 'Arimo', sans-serif", color: 'var(--track-on-a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .8s' }}>
              {track.artist} · faixa {n}{track.year ? ` · ${track.year}` : ''}
            </div>
          </div>
          {el.cover && (
            <LiveCover t={t} track={track} progress={progress} onset={isPlaying && audioFeatures.onset} pal={pal}
              box={{ left: 16 + stackedBlockW + 10, top: 16, width: w - 32 - stackedBlockW - 10, height: stackedH }} />
          )}
        </>
      )}

      {/* reading layout with the cover switched on: small cover beside the lyrics header is not drawn; it sits top-right under the bar */}
      {reading && el.cover && el.titleBlock && (
        <LiveCover t={t} track={track} progress={progress} onset={isPlaying && audioFeatures.onset} pal={pal}
          box={{ left: w - 16 - 112, top: headerBottom + 10, width: 112, height: 64 }} />
      )}

      <LyricStack lines={track.lyrics} active={activeLyric} progressMs={progressMs} plainText={lyricsText} rect={lyricRect} sizes={sizes} />

      {el.notes && (
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 16 + dockH + 10, height: NOTES_ROW - 6, overflow: 'hidden' }}>
          <TrackNotes track={track} progressMs={progressMs} compact />
        </div>
      )}

      <CompactDock track={track} progressMs={progressMs} isPlaying={isPlaying} t={t} variant={style} showTitle={!el.titleBlock}
        shuffleEnabled={shuffleEnabled} onToggleShuffle={onToggleShuffle} onTogglePlay={onTogglePlay} onPrevious={onPrevious} onNext={onNext} onSeek={onSeek} />
    </div>
  );
};
