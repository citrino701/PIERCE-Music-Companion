import React, { useEffect, useMemo, useRef } from 'react';
import type { StageViewProps } from './types';
import { bpmOf, useBox, useFrameTime, useReducedMotion, useSmoothNow } from './hooks';
import { N_DOTS, STAGE_H, STAGE_W, isCoverMode, stepDot, type Shape } from './dotShapes';
import { glowSprite, sampleCover, sampleWord, wordKey } from './dotSampling';
import { useTimedLines, verseSeek } from './lines';
import { beatInfo, formatTime, momentAt } from '../../../services/views/rhythm';

const BG = '#0B0D16', FG = '#F3EEE6', FG2 = '#C9C2B8';
const css = `@keyframes pierce-l-breathe{0%,100%{transform:scale(1.04)}50%{transform:scale(1.14) rotate(1.5deg)}}`;
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'faixa';

/**
 * L · Pontilhado — 1100 persistent dots on a canvas: the current word is a cloud of dots, they fly into the next word,
 * and between verses (or when paused) they assemble the cover. The mouse is a fan that blows them away.
 */
export const PontilhadoView: React.FC<StageViewProps> = ({ track, progressMs, isPlaying, onTogglePlay, onSeek }) => {
  const [host, box] = useBox<HTMLDivElement>();
  const reduced = useReducedMotion();
  const now = useSmoothNow(progressMs, isPlaying);
  const t = useFrameTime(progressMs, isPlaying, 10);
  const lines = useTimedLines(track);
  const hasLyrics = lines.some((l) => !l.gap);
  const bpm = bpmOf(track.bpm, 96);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const coverShape = useRef<Shape | null>(null);
  const live = useRef({ lines, hasLyrics, bpm, isPlaying, reduced, track });
  live.current = { lines, hasLyrics, bpm, isPlaying, reduced, track };

  const s = Math.min(box.w / STAGE_W, box.h / STAGE_H);

  // cover stipple, rebuilt when the track changes
  useEffect(() => {
    coverShape.current = sampleCover(null, track.id);
    if (!track.coverImage) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (!cancelled) coverShape.current = sampleCover(img, track.id); };
    img.src = track.coverImage;
    return () => { cancelled = true; };
  }, [track.id, track.coverImage]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = STAGE_W * dpr; cv.height = STAGE_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sprite = glowSprite();
    const cache = new Map<string, Shape>();
    const px = new Float32Array(N_DOTS), py = new Float32Array(N_DOTS), pa = new Float32Array(N_DOTS);
    for (let i = 0; i < N_DOTS; i++) { px[i] = STAGE_W / 2; py[i] = STAGE_H / 2; }
    let fontReady = false;
    void document.fonts?.load("900 200px 'Archivo'").then(() => { fontReady = true; cache.clear(); }).catch(() => { fontReady = true; });
    let raf = 0;
    const frame = () => {
      const L = live.current;
      const tt = now();
      const m = momentAt(L.lines, tt);
      const kick = L.isPlaying && !L.reduced ? beatInfo(tt, L.bpm).kick : 0;
      const cover = isCoverMode({ paused: !L.isPlaying, hasLyrics: L.hasLyrics, index: m.index, gap: m.gap, now: tt, start: m.line?.t, end: m.line?.end });
      let target: Shape | null = null;
      if (cover) target = coverShape.current;
      else {
        const w = m.words[m.wordIndex]?.text;
        if (w) {
          const key = wordKey(w);
          if (!cache.has(key)) { if (cache.size > 80) cache.clear(); cache.set(key, sampleWord(key)); }
          target = cache.get(key) ?? null;
        }
      }
      void fontReady;
      ctx.clearRect(0, 0, STAGE_W, STAGE_H);
      const wind = L.reduced ? null : mouse.current;
      for (let i = 0; i < N_DOTS; i++) {
        const tx = target ? target.x[i] : px[i], ty = target ? target.y[i] : py[i], ta = target ? target.a[i] : 0;
        const [nx, ny] = stepDot(px[i], py[i], tx, ty, kick, wind);
        px[i] = nx; py[i] = ny;
        pa[i] += (ta - pa[i]) * 0.1;
        if (pa[i] < 0.02) continue;
        ctx.globalAlpha = pa[i];
        ctx.drawImage(sprite, nx - 10.5, ny - 10.5);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const r = stage.current?.getBoundingClientRect();
    if (!r) return;
    mouse.current = { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };

  const m = useMemo(() => momentAt(lines, t), [lines, t]);
  const real = lines.map((l, i) => ({ l, i })).filter((x) => !x.l.gap);
  const cur = m.line && !m.line.gap ? m.index : -1;
  const prev = [...real].reverse().find((x) => x.i < (cur >= 0 ? cur : m.index + 1) && x.i <= Math.max(m.index, -1) && x.i !== cur);
  const next = real.find((x) => x.i > (m.index < 0 ? -1 : m.index));
  const p = m.line && !m.gap ? Math.min(1, Math.max(0, (t - m.line.t) / Math.max(0.1, m.line.end - m.line.t))) : 0;
  const cover = isCoverMode({ paused: !isPlaying, hasLyrics, index: m.index, gap: m.gap, now: t, start: m.line?.t, end: m.line?.end });
  const state = !isPlaying ? 'pausado · a capa espera' : cover ? 'intervalo · os pontos montam a capa' : 'cantando';
  const { kick } = beatInfo(t, bpm);
  const k = isPlaying && !reduced ? kick : 0;
  const grainSeed = reduced ? 4 : beatInfo(t, bpm).beat % 97;
  const lineText = m.line && !m.line.gap ? m.line.text : '';

  const btn = (filled: boolean): React.CSSProperties => ({ font: "500 14px 'Inter', 'Arimo', sans-serif", padding: '10px 16px', cursor: 'pointer', border: `1.5px solid ${FG}`, background: filled ? FG : 'transparent', color: filled ? BG : FG });

  return (
    <div ref={host} data-testid="pontilhado-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BG, color: FG, fontFamily: "'Inter', 'Arimo', sans-serif" }}>
      <style>{css}</style>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{lineText}</div>

      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', animation: reduced ? undefined : 'pierce-l-breathe 24s ease-in-out infinite' }}>
        {track.coverImage && <img src={track.coverImage} alt="" style={{ position: 'absolute', inset: '-12%', width: '124%', height: '124%', objectFit: 'cover', filter: 'blur(42px) saturate(1.35) brightness(.8)', transform: `scale(${1 + 0.025 * k})` }} />}
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 65% at 50% 45%, rgba(11,13,22,0) 30%, rgba(11,13,22,.55) 70%, rgba(5,6,12,.95) 100%)' }} />
      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'overlay', opacity: 0.55 + 0.25 * k, pointerEvents: 'none' }}>
        <filter id="lGrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={grainSeed} /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="0 .5" /></feComponentTransfer></filter>
        <rect width="100%" height="100%" filter="url(#lGrain)" />
      </svg>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 4px)', pointerEvents: 'none' }} />

      <div ref={stage} onPointerMove={onMove} onPointerLeave={() => { mouse.current = null; }}
        style={{ position: 'absolute', left: (box.w - STAGE_W * s) / 2, top: (box.h - STAGE_H * s) / 2, width: STAGE_W, height: STAGE_H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        {prev && <div style={{ position: 'absolute', left: 0, right: 0, top: 84, textAlign: 'center', font: "italic 400 30px 'Instrument Serif', Georgia, serif", opacity: 0.42, filter: 'blur(1.2px)' }}>
          <span style={{ font: "500 12px 'Inter', sans-serif", letterSpacing: '.1em', marginRight: 12 }}>ANTES</span>{prev.l.text}</div>}

        <canvas ref={canvas} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: STAGE_W, height: STAGE_H }} />
        <button type="button" aria-label={isPlaying ? 'Pausar' : 'Tocar'} onClick={onTogglePlay} style={{ position: 'absolute', left: 40, top: 120, width: 1360, height: 560, background: 'transparent', border: 'none', cursor: 'pointer' }} />

        {next && <div style={{ position: 'absolute', left: 0, right: 0, top: 690, textAlign: 'center', font: "italic 400 34px 'Instrument Serif', Georgia, serif", opacity: 0.28 + 0.6 * p, filter: `blur(${4.5 * (1 - p)}px)`, pointerEvents: 'none' }}>
          <span style={{ font: "500 12px 'Inter', sans-serif", letterSpacing: '.1em', marginRight: 12 }}>DEPOIS</span>{next.l.text}</div>}

        <div style={{ position: 'absolute', left: 40, right: 40, top: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ font: "400 13px 'Inter', sans-serif", letterSpacing: '.04em' }}>PiErCe · pontilhado</span>
          <span style={{ font: "900 34px 'Archivo', 'Arimo', sans-serif" }}>{formatTime(t)}</span>
        </div>

        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
          {track.coverImage && <img src={track.coverImage} alt="" style={{ width: 56, height: 56, objectFit: 'cover', filter: 'grayscale(1)', flex: 'none' }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "500 14px 'Inter', sans-serif" }}>{slug(track.title)}.gif</div>
            <div style={{ font: "400 13px 'Inter', sans-serif", color: FG2, margin: '2px 0 6px' }}>{state}</div>
            <div style={{ font: "400 22px/1.25 'Inter', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {m.line && !m.line.gap ? m.words.map((w, i) => (
                <span key={i} style={{ marginRight: '.3em', color: i > m.wordIndex ? '#B4AEA6' : FG, textDecoration: i === m.wordIndex ? 'underline' : 'none', textDecorationThickness: 2, textUnderlineOffset: 5 }}>{w.text}</span>
              )) : <span style={{ color: '#B4AEA6' }}>{track.title} — {track.artist}</span>}
            </div>
            <div style={{ font: "400 13px 'Inter', sans-serif", color: FG2, marginTop: 6 }}>cada palavra vira uma nuvem de pontos; o mouse sopra como um ventilador.</div>
          </div>
          <button type="button" style={btn(false)} onClick={() => { const ms = verseSeek(lines, now(), -1); if (ms != null) onSeek(Math.round(ms)); }}>verso anterior</button>
          <button type="button" style={btn(false)} onClick={() => { const ms = verseSeek(lines, now(), 1); if (ms != null) onSeek(Math.round(ms)); }}>próximo verso</button>
          <button type="button" style={btn(true)} onClick={onTogglePlay}>{isPlaying ? 'pausar' : 'tocar'}</button>
        </div>
      </div>
    </div>
  );
};
