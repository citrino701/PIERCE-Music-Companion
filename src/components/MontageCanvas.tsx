import React, { useMemo } from 'react';
import { TrackData, LyricLine, NarrativeChapter, AudioFeatures, VisualSettings } from '../types';
import { formatTime } from '../services/playbackEngine';

interface MontageCanvasProps {
  track: TrackData;
  progressMs: number;
  isPlaying: boolean;
  activeLyric?: LyricLine;
  activeChapter?: NarrativeChapter;
  audioFeatures: AudioFeatures;
  visualSettings: VisualSettings;
  className?: string;
  variant?: 'compact' | 'expanded' | 'fullscreen';
}

export const MontageCanvas: React.FC<MontageCanvasProps> = ({
  track,
  progressMs,
  isPlaying,
  activeLyric,
  activeChapter,
  audioFeatures,
  visualSettings,
  className = '',
  variant = 'expanded',
}) => {
  // Determine which montage scene is active based on track progress
  const sceneIndex = useMemo(() => {
    if (!track.scenes.length) return 0;
    const sceneDuration = track.durationMs / track.scenes.length;
    const idx = Math.floor(progressMs / sceneDuration);
    return Math.min(track.scenes.length - 1, Math.max(0, idx));
  }, [track, progressMs]);

  const activeScene = track.scenes[sceneIndex] || track.scenes[0];

  // Subtle beat pulse scale for organic breathing
  const pulseScale = isPlaying
    ? 1 + audioFeatures.energy * 0.02 + (audioFeatures.onset ? 0.012 : 0)
    : 1;

  // Trigger point-glitch burst on sudden transient onset
  const glitchClass = audioFeatures.onset ? 'point-glitch' : '';

  return (
    <div
      data-testid="montage-canvas"
      className={`relative overflow-hidden select-none bg-[#f7f5f0] text-[#121110] ${className}`}
    >
      {/* Background Editorial Canvas: Archival warm paper with subtle dot matrix */}
      <div className="absolute inset-0 subtle-paper opacity-40 pointer-events-none" />

      {/* Visual Media Layer: High-Contrast 35mm Photography with Experimental Masking */}
      <div
        className={`absolute inset-0 transition-transform duration-700 ease-out ${glitchClass}`}
        style={{ transform: `scale(${pulseScale})` }}
      >
        {activeScene.layout === 'split' && activeScene.secondaryImage ? (
          <div className="w-full h-full grid grid-cols-2 gap-px bg-[#111114]">
            <div className="relative h-full overflow-hidden">
              <img
                src={activeScene.image}
                alt={activeScene.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter grayscale contrast-125 brightness-[0.95]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>
            <div className="relative h-full overflow-hidden">
              <img
                src={activeScene.secondaryImage}
                alt={activeScene.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter contrast-150 brightness-[0.9]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={activeScene.image}
              alt={activeScene.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter contrast-110 brightness-[0.9]"
            />
            {/* Editorial Contrast Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
          </div>
        )}
      </div>

      {/* BRUTALIST GEOMETRIC COMPOSITION (Homage to Footnote No. 1 reference image_f1bd0a05) */}
      <div className="absolute right-4 top-12 bottom-12 w-28 md:w-36 pointer-events-none z-10 hidden sm:flex flex-col justify-between opacity-80 mix-blend-difference">
        {/* Horizontal Black Bar 1 */}
        <div
          className="h-7 bg-white rounded-xs transition-all duration-300"
          style={{ width: `${Math.min(100, 60 + audioFeatures.lowBand * 40)}%` }}
        />
        {/* Horizontal Black Bar 2 */}
        <div
          className="h-10 bg-white rounded-xs transition-all duration-300"
          style={{ width: `${Math.min(100, 40 + audioFeatures.midBand * 60)}%` }}
        />
        {/* Square Blocks */}
        <div className="flex gap-2">
          <div
            className="w-8 h-8 bg-white rounded-xs transition-transform duration-200"
            style={{ transform: audioFeatures.onset ? 'scale(1.15)' : 'scale(1)' }}
          />
          <div
            className="w-8 h-8 bg-white rounded-xs transition-transform duration-200"
            style={{ transform: audioFeatures.onset ? 'scale(0.9)' : 'scale(1)' }}
          />
        </div>
      </div>

      {/* Dot-matrix vertical dividing column rule */}
      <div className="absolute left-1/3 top-0 bottom-0 w-3 dot-matrix-column opacity-25 pointer-events-none hidden md:block" />

      {/* 35mm Film Grain Layer */}
      {visualSettings.filmGrain && (
        <div
          aria-hidden="true"
          className="absolute inset-0 film-grain pointer-events-none opacity-35 mix-blend-screen"
        />
      )}

      {/* CRT Scanline Layer */}
      {visualSettings.scanlines && (
        <div
          aria-hidden="true"
          className="absolute inset-0 crt-scanlines pointer-events-none opacity-20"
        />
      )}

      {/* Transient Onset Light Leak Flash (Warm Tungsten / Solarized) */}
      {visualSettings.filmBurns && audioFeatures.onset && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-white/15 mix-blend-overlay pointer-events-none transition-opacity duration-100"
        />
      )}

      {/* 1-Bit Dither Matrix Layer */}
      {visualSettings.asciiOverlay && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay subtle-paper"
        />
      )}

      {/* Editorial Chapter Tag & Registration Bar */}
      {variant !== 'compact' && activeChapter && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 text-xs font-mono tracking-wider">
          <div className="flex items-center gap-2 bg-[#121110]/80 text-[#f7f5f0] backdrop-blur-md px-3 py-1 rounded-xs border border-white/10 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
            <span className="font-semibold uppercase tracking-widest">{activeChapter.title}</span>
            <span className="opacity-40">·</span>
            <span className="opacity-70">{activeChapter.emotion}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-black/40 text-white/70 backdrop-blur-md px-2.5 py-1 rounded-xs border border-white/5 text-[11px]">
            <span>PAGE 08</span>
            <span>·</span>
            <span>ISSUE 01</span>
            <span>·</span>
            <span className="tracking-widest">▪▪▪▪▪</span>
          </div>
        </div>
      )}

      {/* Waveform Micro-Stepped Audio Monitor */}
      <div className="absolute bottom-4 right-4 z-20 flex items-end gap-1 h-7 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-xs">
        {[
          audioFeatures.lowBand,
          audioFeatures.midBand,
          audioFeatures.highBand,
          audioFeatures.energy,
          audioFeatures.rms,
        ].map((val, idx) => (
          <div
            key={idx}
            className="w-1 rounded-t-xs transition-all duration-75"
            style={{
              height: `${Math.max(3, val * 20)}px`,
              backgroundColor: audioFeatures.onset && idx === 2 ? '#ff3b30' : '#ffffff',
            }}
          />
        ))}
      </div>

      {/* PERSISTENT KINETIC LYRICS OVERLAY */}
      {visualSettings.kineticLyrics && activeLyric && (
        <div
          className={`absolute z-20 flex flex-col justify-end transition-all duration-300 pointer-events-none ${
            variant === 'fullscreen'
              ? 'inset-x-8 md:inset-x-16 bottom-36 md:bottom-40'
              : variant === 'compact'
              ? 'inset-x-3 bottom-3'
              : 'inset-x-6 bottom-8'
          }`}
        >
          <div className="max-w-2xl lg:max-w-3xl">
            {/* Timestamp & Line index */}
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-white/70 mb-2 tracking-widest uppercase">
              <span className="bg-black/70 px-2 py-0.5 rounded-xs backdrop-blur-md font-bold text-white">
                {formatTime(activeLyric.startMs)}
              </span>
              <span>—</span>
              <span className="text-[#ff3b30] font-bold">REC SYNC</span>
              {activeLyric.emphasis && (
                <>
                  <span>·</span>
                  <span className="text-amber-400 font-bold bg-amber-400/20 px-1.5 py-0.5 rounded-xs">
                    BEAT DESTAQUE
                  </span>
                </>
              )}
            </div>

            {/* Kinetic Lyric Title: Editorial Swiss Grotesque & Serif hybrid */}
            <h2
              className={`font-['Syne',sans-serif] font-bold tracking-tight text-white leading-[1.12] drop-shadow-2xl transition-all duration-300 ${
                variant === 'fullscreen'
                  ? 'text-3xl md:text-5xl lg:text-6xl'
                  : variant === 'compact'
                  ? 'text-sm font-semibold truncate'
                  : 'text-2xl md:text-3xl lg:text-4xl'
              } ${activeLyric.emphasis ? 'italic font-serif text-[#fff8ee]' : ''}`}
            >
              {activeLyric.text}
            </h2>

            {/* Subtext / Translation */}
            {variant !== 'compact' && activeLyric.subtext && (
              <p className="mt-2 text-xs md:text-sm font-mono text-white/80 italic tracking-wide max-w-xl bg-black/50 px-2.5 py-1 rounded-xs backdrop-blur-sm inline-block">
                {activeLyric.subtext}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Archival Registration Tick Marks */}
      <div className="absolute inset-0 pointer-events-none border border-black/10 z-10">
        <div className="absolute top-2 right-2 text-[8px] font-mono text-white/40 tracking-widest">
          SELVA // FIG. 01
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] font-mono text-white/40 tracking-widest">
          WASAPI DSP · ARCHIVAL COMPOSITOR
        </div>
      </div>
    </div>
  );
};
