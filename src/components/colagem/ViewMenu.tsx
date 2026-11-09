import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  ELEMENT_LABELS, ELEMENT_PRESETS, LAYOUT_LABELS, LYRIC_SCALE_MAX, LYRIC_SCALE_MIN,
  elementsFor, withElement, withPreset,
  type LayoutId, type StageElements, type ViewPrefs,
} from '../../services/colagem/layout';
import { STAGE_VIEWS } from './views/registry';

interface Props {
  prefs: ViewPrefs;
  /** Layout currently on screen (auto already resolved). */
  layout: LayoutId;
  onChange: (next: ViewPrefs) => void;
}

const seg = (on: boolean): React.CSSProperties => ({
  padding: '5px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #111',
  background: on ? '#111' : '#fff', color: on ? '#fff' : '#111',
});

/** Gear button + panel: choose the visualisation, the layout, which elements show, and the lyric size. */
export const ViewMenu: React.FC<Props> = ({ prefs, layout, onChange }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const els = elementsFor(layout, prefs);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true); };
  }, [open]);

  const group = (title: string, children: React.ReactNode) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ font: "700 10px/1 'Arimo', sans-serif", letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div ref={root} style={{ position: 'absolute', left: 12, top: 12, zIndex: 30, fontFamily: "'Arimo', sans-serif" }}>
      <button type="button" aria-label="Elementos e layout" aria-expanded={open} title="Elementos e layout" onClick={() => setOpen((o) => !o)}
        style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#fff', color: '#111', border: '2px solid #111', boxShadow: '3px 3px 0 #111', cursor: 'pointer', opacity: open ? 1 : 0.55 }}>
        <SlidersHorizontal size={16} />
      </button>
      {open && (
        <div role="dialog" aria-label="Elementos e layout" style={{ marginTop: 8, width: 260, maxWidth: 'calc(100vw - 100px)', padding: 14, background: '#fff', color: '#111', border: '2px solid #111', boxShadow: '5px 5px 0 #111', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
          {STAGE_VIEWS.length > 1 && group('Visualização', (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {STAGE_VIEWS.map((v) => <button key={v.id} type="button" title={v.description} style={seg(prefs.viewId === v.id)} onClick={() => onChange({ ...prefs, viewId: v.id })}>{v.label}</button>)}
            </div>
          ))}
          {group('Layout', (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <button type="button" style={seg(prefs.layout === 'auto')} onClick={() => onChange({ ...prefs, layout: 'auto' })}>Auto</button>
              {(Object.keys(LAYOUT_LABELS) as LayoutId[]).map((id) => (
                <button key={id} type="button" style={seg(prefs.layout === id)} onClick={() => onChange({ ...prefs, layout: id })}>{LAYOUT_LABELS[id]}</button>
              ))}
            </div>
          ))}
          {prefs.layout === 'auto' && group('Quando a janela é pequena', (
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" style={seg(prefs.compactStyle === 'reading')} onClick={() => onChange({ ...prefs, compactStyle: 'reading' })}>Leitura</button>
              <button type="button" style={seg(prefs.compactStyle === 'stacked')} onClick={() => onChange({ ...prefs, compactStyle: 'stacked' })}>Vertical</button>
            </div>
          ))}
          {group(`Elementos (${LAYOUT_LABELS[layout]})`, (
            <>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {(Object.keys(ELEMENT_PRESETS) as (keyof typeof ELEMENT_PRESETS)[]).map((p) => (
                  <button key={p} type="button" style={seg(false)} onClick={() => onChange(withPreset(prefs, layout, p))}>{ELEMENT_PRESETS[p].label}</button>
                ))}
              </div>
              {(Object.keys(ELEMENT_LABELS) as (keyof StageElements)[]).map((k) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={els[k]} onChange={(e) => onChange(withElement(prefs, layout, k, e.target.checked))} />
                  {ELEMENT_LABELS[k]}
                </label>
              ))}
            </>
          ))}
          {group(`Tamanho da letra · ${Math.round(prefs.lyricScale * 100)}%`, (
            <input type="range" aria-label="Tamanho da letra" min={LYRIC_SCALE_MIN} max={LYRIC_SCALE_MAX} step={0.05} value={prefs.lyricScale}
              onChange={(e) => onChange({ ...prefs, lyricScale: Number(e.target.value) })} style={{ width: '100%' }} />
          ))}
        </div>
      )}
    </div>
  );
};
