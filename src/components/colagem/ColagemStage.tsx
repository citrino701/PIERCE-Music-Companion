import React, { useLayoutEffect, useRef, useState } from 'react';
import { compOffset, splitTitle, STAGE_H, STAGE_W, titleFontSize } from '../../services/colagem/colagem';
import { elementsFor, lyricSizes } from '../../services/colagem/layout';
import { INK } from '../../services/palette/trackPalette';
import { CompactLayout } from './CompactLayout';
import type { StageViewProps } from './views/types';
import { AsciiVignette } from './AsciiVignette';
import { LiveCover } from './LiveCover';
import { LyricStack } from './LyricStack';
import { PlayDock } from './PlayDock';
import { TrackNotes } from './TrackNotes';
import { useStageClock } from './useStageClock';
import { useTrackPalette } from './useTrackPalette';
import { WordDots } from './WordDots';

/**
 * "Bagunça 3" filling its container. The 1280x760 composition is scaled to fit and centred; the texture
 * layers (grain, ASCII, dots) keep going into whatever margin is left so the edges are never empty.
 */
export const ColagemStage: React.FC<StageViewProps> = ({ track, tracks, progressMs, isPlaying, activeLyric, lyricsText, audioFeatures, titleOpacity = 0.8, shuffleEnabled, onToggleShuffle, onTogglePlay, onSeek, onPrevious, onNext, layout, elements: elementsProp, lyricScale }) => {
  const pal = useTrackPalette(track);
  const t = useStageClock(isPlaying);
  const [isRepeat, setRepeat] = useState(false);
  const [size, setSize] = useState({ w: STAGE_W, h: STAGE_H, scale: 1, cw: STAGE_W, ch: STAGE_H });
  const wrap = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth || STAGE_W, ch = el.clientHeight || STAGE_H;
      const scale = Math.min(cw / STAGE_W, ch / STAGE_H);
      setSize({ w: Math.max(STAGE_W, cw / scale), h: Math.max(STAGE_H, ch / scale), scale, cw, ch });
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h, scale, cw, ch } = size;
  const el = elementsProp ?? elementsFor('full', { elements: {} });
  const { ox, oy } = compOffset(w, h);
  const [l1, l2] = splitTitle(track.title);
  const n = String(Math.max(0, tracks.findIndex((x) => x.id === track.id)) + 1).padStart(2, '0');
  const progress = progressMs / Math.max(1, track.durationMs);
  const vars = { '--track-bg': pal.bg, '--track-a': pal.a, '--track-b': pal.b, '--track-deep': pal.deep, '--track-on-a': pal.onA, '--ink': INK } as React.CSSProperties;
  const plainWords = !track.lyrics.length && lyricsText ? [...new Set(lyricsText.toLowerCase().match(/[\p{L}']{5,}/gu) ?? [])].slice(0, 24) : undefined;

  if (layout !== 'full') {
    return (
      <div ref={wrap} data-testid="colagem-stage" className="absolute inset-0 select-none overflow-hidden">
        <CompactLayout style={layout} elements={el} lyricScale={lyricScale} w={cw} h={ch} t={t} pal={pal} track={track} tracks={tracks} progressMs={progressMs} isPlaying={isPlaying}
          activeLyric={activeLyric} lyricsText={lyricsText} plainWords={plainWords} audioFeatures={audioFeatures} titleOpacity={titleOpacity} shuffleEnabled={shuffleEnabled}
          onToggleShuffle={onToggleShuffle} onTogglePlay={onTogglePlay} onSeek={onSeek} onPrevious={onPrevious} onNext={onNext} />
      </div>
    );
  }

  return (
    <div ref={wrap} data-testid="colagem-stage" className="absolute inset-0 select-none overflow-hidden">
      <div style={{ ...vars, position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', overflow: 'hidden', fontFamily: "'Arimo', Helvetica, Arial, sans-serif", color: 'var(--ink)', background: 'var(--track-bg)', transition: 'background .8s' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(20,20,43,0.14) 0.7px, transparent 0.9px)', backgroundSize: '4px 4px' }} />

        {el.bigTitle && <div style={{ position: 'absolute', left: ox, top: oy, width: STAGE_W, height: STAGE_H }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: 300, top: -150, font: "italic 400 520px/1 'Instrument Serif', Georgia, serif", color: 'var(--track-a)', opacity: titleOpacity, whiteSpace: 'nowrap', transition: 'color .8s' }}>Pi</div>
          <div aria-hidden="true" style={{ position: 'absolute', left: 470, top: 330, font: "italic 400 380px/1 'Instrument Serif', Georgia, serif", color: 'var(--track-b)', opacity: titleOpacity, whiteSpace: 'nowrap', transition: 'color .8s' }}>ErCe</div>
          <div aria-hidden="true" style={{ position: 'absolute', left: 470, top: 430, width: 2400, height: 1600, background: 'repeating-linear-gradient(color-mix(in srgb, var(--track-bg) 70%, transparent) 0 3px, transparent 3px 10px)' }} />
        </div>}

        {el.ascii && <AsciiVignette t={t} w={w} h={h} />}

        <div style={{ position: 'absolute', left: ox, top: oy, width: STAGE_W, height: STAGE_H }}>
          {el.titleBlock && <div style={{ position: 'absolute', left: 40, top: 40, width: 400, height: 300, background: 'var(--track-a)', overflow: 'hidden', transition: 'background .8s' }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.3px, transparent 1.7px) 0 0 / 6px 6px', WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)', maskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)' }} />
            <h2 style={{ position: 'absolute', left: 22, top: 16, margin: 0, font: `700 ${titleFontSize([l1, l2])}px/0.92 'Arimo', Helvetica, Arial, sans-serif`, color: 'var(--track-on-a)', letterSpacing: '-0.04em', whiteSpace: 'nowrap', transition: 'color .8s' }} aria-label={track.title}>
              <span aria-hidden="true">{l1}{l2 && <><br />{l2}</>}</span>
            </h2>
            <div style={{ position: 'absolute', left: 24, right: 24, bottom: 16, font: "500 15px/1.3 'Arimo', sans-serif", color: 'var(--track-on-a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .8s' }}>
              {track.artist}<br />faixa {n}{track.year ? ` · ${track.year}` : ''}{track.album ? ` · ${track.album}` : ''}
            </div>
          </div>}

          {el.cover && <LiveCover t={t} track={track} progress={progress} onset={isPlaying && audioFeatures.onset} pal={pal} />}

          <LyricStack lines={track.lyrics} active={activeLyric} progressMs={progressMs} plainText={lyricsText} sizes={lyricSizes('full', STAGE_W, lyricScale)} />
          {el.notes && <TrackNotes track={track} progressMs={progressMs} />}

          <div aria-hidden="true" style={{ position: 'absolute', left: 24, top: 336, width: 120, height: 30, background: 'rgba(255,225,77,0.8)', transform: 'rotate(-7deg)' }} />
          <div aria-hidden="true" className="cg-spin" style={{ position: 'absolute', left: 1204, top: 250, font: "40px/1 'Arimo', sans-serif", color: 'var(--track-a)', transition: 'color .8s', animationPlayState: isPlaying ? 'running' : 'paused' }}>✺</div>
          <div aria-hidden="true" className="cg-wob" style={{ position: 'absolute', left: 456, top: 100, font: "28px/1 'Arimo', sans-serif", color: 'var(--ink)', animationPlayState: isPlaying ? 'running' : 'paused' }}>✦</div>

          <PlayDock track={track} progressMs={progressMs} isPlaying={isPlaying} audioFeatures={audioFeatures} t={t} shuffleEnabled={shuffleEnabled} isRepeat={isRepeat}
            onToggleShuffle={onToggleShuffle} onToggleRepeat={() => setRepeat((v) => !v)} onTogglePlay={onTogglePlay} onPrevious={onPrevious} onNext={onNext} onSeek={onSeek} />
        </div>

        {el.dots && <WordDots track={track} playing={isPlaying} w={w} h={h} extraWords={plainWords} />}
      </div>
    </div>
  );
};
