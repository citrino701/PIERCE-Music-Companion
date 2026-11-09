import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

interface Props {
  /** 0..1 */
  volume: number;
  onChange: (volume: number) => void;
  onToggleMute: () => void;
}

const STEP = 0.05;

/** Volume for every visualisation: button in the navigation rail (click = mute, panel = slider) and ↑/↓ keys (±5%). */
export const VolumeControl: React.FC<Props> = ({ volume, onChange, onToggleMute }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef({ volume, onChange });
  latest.current = { volume, onChange };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;
      e.preventDefault();
      const { volume: v, onChange: change } = latest.current;
      change(Math.round((v + (e.key === 'ArrowUp' ? STEP : -STEP)) * 100) / 100);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pct = Math.round(volume * 100);
  const Icon = volume <= 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return createPortal(
    <div ref={root} style={{ position: 'fixed', left: 0, bottom: 0, zIndex: 90, fontFamily: "'Arimo', sans-serif" }}>
      <button type="button" className="pierce-rail-button" aria-label={volume <= 0 ? 'Ativar o som' : 'Volume'} title={`Volume ${pct}% (↑/↓ ajustam; duplo clique muta)`}
        onClick={() => setOpen((o) => !o)} onDoubleClick={onToggleMute}
        style={{ position: 'fixed', left: 19, bottom: 56, padding: 6, cursor: 'pointer', background: 'transparent', border: 'none', color: open ? '#fff' : undefined }}>
        <Icon size={16} />
      </button>
      {open && (
        <div role="dialog" aria-label="Volume" style={{ position: 'fixed', left: 72, bottom: 48, width: 220, padding: 12, background: '#fff', color: '#111', border: '2px solid #111', boxShadow: '4px 4px 0 #111', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" aria-label={volume <= 0 ? 'Ativar o som' : 'Mutar'} onClick={onToggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#111', display: 'grid' }}><Icon size={18} /></button>
          <input type="range" aria-label="Volume" min={0} max={100} step={1} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)} style={{ flex: 1 }} />
          <span style={{ font: "700 12px 'Arimo', sans-serif", width: 34, textAlign: 'right' }}>{pct}%</span>
        </div>
      )}
    </div>,
    document.body,
  );
};
