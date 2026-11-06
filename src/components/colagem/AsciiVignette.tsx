import React, { useMemo } from 'react';
import { asciiLayer, STAGE_H, STAGE_W } from '../../services/colagem/colagem';

const MASK = 'radial-gradient(ellipse 46% 44% at 66% 42%, transparent 48%, #000 100%)';

/** ASCII texture around the edges; the centre (lyrics) stays clean. Flickers at 2 fps. */
export const AsciiVignette: React.FC<{ t: number }> = ({ t }) => {
  const frame = Math.floor(t * 2);
  const [blue, deep] = useMemo(() => [asciiLayer(5, 0.36, frame / 2), asciiLayer(1, 0.3, frame / 2)], [frame]);
  const base: React.CSSProperties = {
    position: 'absolute', left: 0, top: 0, margin: 0, width: STAGE_W, height: STAGE_H, overflow: 'hidden',
    font: "12px/13px 'DM Mono', monospace", whiteSpace: 'pre', WebkitMaskImage: MASK, maskImage: MASK,
    transition: 'color .8s', pointerEvents: 'none',
  };
  return (
    <>
      <pre aria-hidden="true" style={{ ...base, color: 'var(--track-b)', opacity: 0.5 }}>{blue}</pre>
      <pre aria-hidden="true" style={{ ...base, color: 'var(--track-deep)', opacity: 0.55 }}>{deep}</pre>
    </>
  );
};
