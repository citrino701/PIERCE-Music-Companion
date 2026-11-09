import React, { useMemo, useState } from 'react';
import type { StageViewProps } from './types';
import { bpmOf, useBox, useFrameTime, useReducedMotion } from './hooks';
import { ALPHABET, CELL, COLS, fallbackLines, layoutGrid, rowOfLine, type GridCell } from './cacaGrid';
import { useTimedLines } from './lines';
import { beatInfo, formatTime, hash, lineIndexAt, seedFromId } from '../../../services/views/rhythm';

const INK = '#111111', SCRAMBLE = '#A3A3A3', PEEK = '#EDEDED';
const FRAME_W = COLS * CELL; // 1400
const FOOT = 96;
const css = `@keyframes pierce-k-tap{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pierce-k-light{from{transform:translateY(-160px)}to{transform:translateY(960px)}}`;

interface CellProps { c: GridCell; ch: string; kind: 'future' | 'cur' | 'sung' | 'peek'; img: string; S: number; onEnter: () => void; onLeave: () => void; onClick: () => void }
const Cell = React.memo(({ c, ch, kind, img, S, onEnter, onLeave, onClick }: CellProps) => {
  const x = c.col * CELL, y = c.row * CELL;
  const style: React.CSSProperties = {
    position: 'absolute', left: x, top: y, width: CELL, height: CELL, display: 'grid', placeItems: 'center', cursor: 'pointer',
    font: "400 60px/1 'Inter', 'Arimo', sans-serif", textTransform: 'uppercase', userSelect: 'none', transition: 'background .2s',
    color: kind === 'future' ? SCRAMBLE : kind === 'peek' ? INK : '#fff',
    background: kind === 'cur' ? INK : kind === 'peek' ? PEEK : kind === 'sung' && img ? `#444 url(${img}) ${-(x + 200)}px ${-(y + 100)}px / ${S}px ${S}px no-repeat` : kind === 'sung' ? '#444' : 'transparent',
    filter: kind === 'sung' && img ? 'grayscale(1) contrast(1.6)' : undefined,
  };
  return <span style={style} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick} className="pierce-k-cell">{ch}</span>;
});

/**
 * K · Caça-letras — all lyrics scattered over a grid of loose letters: the future is scrambled, the sung word is
 * revealed letter by letter with a little hand pointing, sung cells become windows onto a huge ghost cover.
 */
export const CacaView: React.FC<StageViewProps> = ({ track, progressMs, isPlaying, onTogglePlay, onSeek }) => {
  const [host, box] = useBox<HTMLDivElement>();
  const t = useFrameTime(progressMs, isPlaying, 30);
  const reduced = useReducedMotion();
  const synced = useTimedLines(track);
  const hasLyrics = synced.some((l) => !l.gap);
  const lines = useMemo(() => (hasLyrics ? synced : fallbackLines(track.title, track.artist, track.durationMs / 1000)), [hasLyrics, synced, track.title, track.artist, track.durationMs]);
  const grid = useMemo(() => layoutGrid(lines, seedFromId(track.id)), [lines, track.id]);
  const [peekWord, setPeek] = useState<number | null>(null);
  const bpm = bpmOf(track.bpm);
  const { beat, kick } = beatInfo(t, bpm);
  const k = isPlaying && !reduced ? kick : 0;

  const s = box.w / FRAME_W;
  const frameH = box.h / s;
  const viewH = Math.max(CELL * 3, frameH - FOOT);
  const sheetH = Math.max(grid.rows * CELL, viewH);
  const S = Math.max(1800, sheetH + 200);
  const idx = lineIndexAt(lines, t);
  const curRow = rowOfLine(lines, grid, idx);
  const scroll = hasLyrics && idx >= 0 ? Math.max(0, curRow - 3) * CELL : 0;

  const wordState = (wi: number) => {
    const w = grid.words[wi];
    const cur = hasLyrics && t >= w.start && t < w.end;
    const sung = hasLyrics ? t >= w.end : false;
    return { w, cur, sung };
  };

  const firstRow = Math.max(0, Math.floor(scroll / CELL) - 1);
  const lastRow = firstRow + Math.ceil(viewH / CELL) + 3;
  const scrambleTick = Math.floor(t * 8);
  const reveal = !hasLyrics ? t / Math.max(1, track.durationMs / 1000) : 0;

  const cells: React.ReactNode[] = [];
  grid.cells.forEach((c, i) => {
    const { w, cur, sung } = wordState(c.w);
    const curChar = cur ? Math.floor(((t - w.start) / (w.end - w.start)) * c.n) : -1;
    if (c.row < firstRow || c.row > lastRow) return;
    const peek = peekWord === c.w;
    const windowed = hasLyrics ? sung : hash(i, 5) < reveal;
    const revealed = windowed || peek || (cur && c.ci <= curChar) || !hasLyrics;
    const kind: CellProps['kind'] = peek ? 'peek' : windowed ? 'sung' : cur && revealed ? 'cur' : 'future';
    const ch = revealed ? c.ch : ALPHABET[Math.floor(hash(i, scrambleTick) * ALPHABET.length)];
    cells.push(<Cell key={i} c={c} ch={ch} kind={kind} img={track.coverImage} S={S} onEnter={() => setPeek(c.w)} onLeave={() => setPeek(null)}
      onClick={() => hasLyrics && onSeek(Math.round(w.start * 1000))} />);
  });

  const handCell = grid.cells.find((c) => {
    const w = grid.words[c.w];
    return hasLyrics && t >= w.start && t < w.end && c.ci === Math.min(c.n - 1, Math.floor(((t - w.start) / (w.end - w.start)) * c.n));
  });
  const hand = handCell ? { x: handCell.col * CELL + 30, y: handCell.row * CELL + 52 } : null;
  const lineText = idx >= 0 ? lines[idx].text : '';
  const ghostOpacity = 0.13 + 0.07 * k;
  const streakSeed = (reduced ? 0 : Math.max(0, idx)) + 2;

  return (
    <div ref={host} data-testid="caca-view" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#fff', color: INK }}>
      <style>{css}</style>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="kToner"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed={reduced ? 5 : beat % 97} /><feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1 1 1 1 1 1" /><feFuncG type="discrete" tableValues="0 1 1 1 1 1 1" /><feFuncB type="discrete" tableValues="0 1 1 1 1 1 1" /><feFuncA type="table" tableValues="0 0.55" /></feComponentTransfer></filter>
          <filter id="kStreak"><feTurbulence type="fractalNoise" baseFrequency="0.002 0.6" numOctaves="1" seed={streakSeed} /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="0 0 0.22" /></feComponentTransfer></filter>
        </defs>
      </svg>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{lineText}</div>

      <div style={{ position: 'absolute', left: 0, top: 0, width: FRAME_W, height: frameH, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: FRAME_W, height: viewH, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: FRAME_W, height: sheetH, transform: `translateY(${-scroll}px)`, transition: reduced ? undefined : 'transform .9s cubic-bezier(.6,0,.2,1)' }}>
            {track.coverImage && <div aria-hidden="true" style={{ position: 'absolute', left: -200, top: -100, width: S, height: S, background: `url(${track.coverImage}) 0 0 / ${S}px ${S}px no-repeat`, filter: 'grayscale(1) contrast(2.2) brightness(1.15)', opacity: ghostOpacity, pointerEvents: 'none' }} />}
            {cells}
            {hand && (
              <svg aria-hidden="true" width="56" height="64" viewBox="0 0 56 64" style={{ position: 'absolute', left: hand.x, top: hand.y, pointerEvents: 'none', transition: 'left .2s, top .6s', animation: reduced ? undefined : `pierce-k-tap ${60 / bpm}s ease-in-out infinite` }}>
                <path d="M20 4c3 0 5 2 5 5v22l3-1c3-1 6 1 6 4l2-1c3-1 6 1 6 4l1-1c3-1 6 1 6 5v10c0 9-6 15-15 15H26c-6 0-10-3-13-8L4 36c-2-3 0-6 3-6 2 0 4 1 6 3l2 3V9c0-3 2-5 5-5z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" transform="scale(.9)" />
              </svg>
            )}
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
            <svg width="100%" height="100%"><rect width="100%" height="100%" filter="url(#kToner)" /><rect width="100%" height="100%" filter="url(#kStreak)" /></svg>
          </div>
          {!reduced && <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 140, pointerEvents: 'none', mixBlendMode: 'multiply', animation: 'pierce-k-light 7s cubic-bezier(.45,0,.55,1) infinite', background: 'linear-gradient(180deg, rgba(120,140,255,0) 0%, rgba(120,140,255,.16) 45%, rgba(255,255,255,.55) 50%, rgba(120,140,255,.16) 55%, rgba(120,140,255,0) 100%)' }} />}
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 14, height: viewH, background: INK }} />
        <div aria-hidden="true" style={{ position: 'absolute', right: 0, top: 0, width: 14, height: viewH, background: INK }} />

        <div style={{ position: 'absolute', left: 0, top: viewH, width: FRAME_W, height: FOOT, boxSizing: 'border-box', borderTop: `2px solid ${INK}`, background: '#fff', display: 'flex', alignItems: 'center', gap: 20, padding: '0 36px', font: "400 16px/1.3 'Inter', 'Arimo', sans-serif" }}>
          {track.coverImage && <img src={track.coverImage} alt="" crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: 'cover', filter: 'grayscale(1)', flex: 'none' }} />}
          <div style={{ minWidth: 0, flex: 'none', maxWidth: 420 }}>
            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist} — {track.title}</div>
            <div style={{ color: '#777', fontSize: 13 }}>a capa se monta com as letras já cantadas</div>
          </div>
          <div style={{ font: "500 18px 'Inter', sans-serif", flex: 'none' }}>{formatTime(t)} / {formatTime(track.durationMs / 1000)}</div>
          <button type="button" onClick={onTogglePlay} style={{ background: INK, color: '#fff', border: 'none', padding: '12px 22px', font: "500 16px 'Inter', sans-serif", cursor: 'pointer', flex: 'none' }}>{isPlaying ? 'pausar' : 'tocar'}</button>
          <div style={{ marginLeft: 'auto', maxWidth: 360, fontSize: 13, color: '#555', textAlign: 'right' }}>passe o mouse numa letra cinza pra espiar a palavra do futuro, clique pra pular até ela</div>
        </div>
      </div>
    </div>
  );
};
