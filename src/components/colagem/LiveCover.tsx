import React, { useMemo } from 'react';
import { hashString } from '../../services/palette/trackPalette';
import { liveCover } from '../../services/colagem/colagem';

/** ASCII "cover" whose shape changes per track and drifts with time. */
export const LiveCover: React.FC<{ t: number; trackId: string }> = ({ t, trackId }) => {
  const seed = useMemo(() => hashString(trackId) % 7, [trackId]);
  return (
    <div
      style={{ position: 'absolute', left: 40, top: 356, width: 400, height: 228, background: 'var(--track-bg)', border: '2px solid var(--ink)', boxSizing: 'border-box', overflow: 'hidden', transition: 'background .8s' }}
    >
      <pre aria-label="Imagem animada em ASCII que muda a cada faixa" style={{ position: 'absolute', left: 2, top: 4, margin: 0, font: "12px/13px 'DM Mono', monospace", color: 'var(--track-deep)', whiteSpace: 'pre', transition: 'color .8s' }}>
        {liveCover(t, seed)}
      </pre>
      <div style={{ position: 'absolute', right: 8, bottom: 6, padding: '2px 7px', background: 'var(--ink)', color: '#fff', font: "10px 'DM Mono', monospace", letterSpacing: '0.08em' }}>CAPA VIVA</div>
    </div>
  );
};
