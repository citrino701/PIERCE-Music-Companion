import React, { useMemo } from 'react';
import { asciiLayer, compOffset } from '../../services/colagem/colagem';

const CHAR_W = 7.2;
const CHAR_H = 13;

/** ASCII texture around the edges of the whole stage; the lyric area stays clean. Flickers at 2 fps. */
export const AsciiVignette: React.FC<{ t: number; w: number; h: number; mask?: string }> = ({ t, w, h, mask: maskOverride }) => {
  const frame = Math.floor(t * 2);
  const cols = Math.ceil(w / CHAR_W);
  const rows = Math.ceil(h / CHAR_H);
  const [blue, deep] = useMemo(() => [asciiLayer(5, 0.36, frame / 2, cols, rows), asciiLayer(1, 0.3, frame / 2, cols, rows)], [frame, cols, rows]);
  const { ox, oy } = compOffset(w, h);
  const mask = maskOverride ?? `radial-gradient(ellipse 589px 334px at ${ox + 845}px ${oy + 319}px, transparent 48%, #000 100%)`;
  const base: React.CSSProperties = {
    position: 'absolute', left: 0, top: 0, margin: 0, width: w, height: h, overflow: 'hidden',
    font: "12px/13px 'DM Mono', monospace", whiteSpace: 'pre', WebkitMaskImage: mask, maskImage: mask,
    transition: 'color .8s', pointerEvents: 'none',
  };
  return (
    <>
      <pre aria-hidden="true" style={{ ...base, color: 'var(--track-b)', opacity: 0.5 }}>{blue}</pre>
      <pre aria-hidden="true" style={{ ...base, color: 'var(--track-deep)', opacity: 0.55 }}>{deep}</pre>
    </>
  );
};
