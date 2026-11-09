import { hashString } from '../palette/trackPalette';
import { lyricFontSize, seeded, type Dot } from './colagem';

/**
 * Responsive layouts of the stage.
 *  - full:    the 1280x760 composition scaled to the window (large windows).
 *  - reading: lyrics first, slim header, slim dock (narrow / split-screen windows). Default for small windows.
 *  - stacked: one column: title block + cover on top, big lyrics, two-row dock.
 */
export type LayoutId = 'full' | 'reading' | 'stacked';
export type CompactStyle = Exclude<LayoutId, 'full'>;

export interface StageElements {
  titleBlock: boolean;
  cover: boolean;
  dots: boolean;
  ascii: boolean;
  bigTitle: boolean;
  notes: boolean;
}

export const ELEMENT_LABELS: Record<keyof StageElements, string> = {
  titleBlock: 'Título e artista',
  cover: 'Capa viva',
  dots: 'Bolinhas de palavras',
  ascii: 'ASCII e grão',
  bigTitle: 'Pi / ErCe ao fundo',
  notes: 'Notas',
};

export const LAYOUT_LABELS: Record<LayoutId, string> = { full: 'Completo', reading: 'Leitura', stacked: 'Vertical' };

const DEFAULT_ELEMENTS: Record<LayoutId, StageElements> = {
  full: { titleBlock: true, cover: true, dots: true, ascii: true, bigTitle: true, notes: true },
  reading: { titleBlock: true, cover: false, dots: true, ascii: true, bigTitle: true, notes: false },
  stacked: { titleBlock: true, cover: true, dots: true, ascii: true, bigTitle: true, notes: true },
};

/** Ready-made sets for the "Elementos" menu. */
export const ELEMENT_PRESETS: Record<'complete' | 'reading' | 'minimal', { label: string; elements: StageElements }> = {
  complete: { label: 'Completo', elements: { titleBlock: true, cover: true, dots: true, ascii: true, bigTitle: true, notes: true } },
  reading: { label: 'Leitura', elements: { titleBlock: true, cover: false, dots: true, ascii: true, bigTitle: true, notes: false } },
  minimal: { label: 'Mínimo', elements: { titleBlock: true, cover: false, dots: false, ascii: false, bigTitle: false, notes: false } },
};

export interface ViewPrefs {
  /** Which visualisation is shown (see components/colagem/views/registry.ts). */
  viewId: string;
  /** 'auto' picks by window size. */
  layout: 'auto' | LayoutId;
  /** Layout used automatically when the window is small. */
  compactStyle: CompactStyle;
  /** Per-layout overrides of the defaults above. */
  elements: Partial<Record<LayoutId, Partial<StageElements>>>;
  /** Multiplies the lyric font size (0.8 – 1.4). */
  lyricScale: number;
}

export const DEFAULT_VIEW_PREFS: ViewPrefs = { viewId: 'colagem', layout: 'auto', compactStyle: 'reading', elements: {}, lyricScale: 1 };
export const VIEW_STORAGE_KEY = 'pierce:view';
export const LYRIC_SCALE_MIN = 0.8;
export const LYRIC_SCALE_MAX = 1.4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isLayoutId = (v: unknown): v is LayoutId => v === 'full' || v === 'reading' || v === 'stacked';

/** Below ~1000 px wide, or in a clearly portrait-ish window, the full composition would just be shrunk. */
export function autoLayout(width: number, height: number, compact: CompactStyle = 'reading'): LayoutId {
  return width >= 1000 && width / Math.max(1, height) >= 1.1 ? 'full' : compact;
}

export function resolveLayout(width: number, height: number, prefs: ViewPrefs): LayoutId {
  return prefs.layout === 'auto' ? autoLayout(width, height, prefs.compactStyle) : prefs.layout;
}

export function elementsFor(layout: LayoutId, prefs: Pick<ViewPrefs, 'elements'>): StageElements {
  return { ...DEFAULT_ELEMENTS[layout], ...(prefs.elements[layout] ?? {}) };
}

export function withElement(prefs: ViewPrefs, layout: LayoutId, key: keyof StageElements, value: boolean): ViewPrefs {
  return { ...prefs, elements: { ...prefs.elements, [layout]: { ...(prefs.elements[layout] ?? {}), [key]: value } } };
}

export function withPreset(prefs: ViewPrefs, layout: LayoutId, preset: keyof typeof ELEMENT_PRESETS): ViewPrefs {
  return { ...prefs, elements: { ...prefs.elements, [layout]: { ...ELEMENT_PRESETS[preset].elements } } };
}

export function parseViewPrefs(raw: string | null | undefined): ViewPrefs {
  if (!raw) return { ...DEFAULT_VIEW_PREFS, elements: {} };
  try {
    const d = JSON.parse(raw) as Partial<ViewPrefs> | null;
    const elements: ViewPrefs['elements'] = {};
    for (const id of ['full', 'reading', 'stacked'] as const) {
      const src = d?.elements?.[id];
      if (!src || typeof src !== 'object') continue;
      const clean: Partial<StageElements> = {};
      for (const k of Object.keys(DEFAULT_ELEMENTS.full) as (keyof StageElements)[]) if (typeof src[k] === 'boolean') clean[k] = src[k];
      elements[id] = clean;
    }
    return {
      viewId: typeof d?.viewId === 'string' && d.viewId ? d.viewId : DEFAULT_VIEW_PREFS.viewId,
      layout: d?.layout === 'auto' || isLayoutId(d?.layout) ? d.layout : 'auto',
      compactStyle: d?.compactStyle === 'stacked' ? 'stacked' : 'reading',
      elements,
      lyricScale: typeof d?.lyricScale === 'number' && Number.isFinite(d.lyricScale) ? clamp(d.lyricScale, LYRIC_SCALE_MIN, LYRIC_SCALE_MAX) : 1,
    };
  } catch {
    return { ...DEFAULT_VIEW_PREFS, elements: {} };
  }
}

export const serializeViewPrefs = (p: ViewPrefs): string => JSON.stringify(p);

export interface LyricSizes {
  current: (text: string) => number;
  past: number;
  next1: number;
  next2: number;
  plain: number;
}

const FULL_SIZES = { past: 24, next1: 32, next2: 26, plain: 30 };

/** Lyric sizes: fixed in the full composition, proportional to the window width in the compact layouts. */
export function lyricSizes(layout: LayoutId, width: number, scale = 1): LyricSizes {
  const k = clamp(scale, LYRIC_SCALE_MIN, LYRIC_SCALE_MAX);
  if (layout === 'full') {
    return { current: (t) => Math.round(lyricFontSize(t) * k), past: Math.round(FULL_SIZES.past * k), next1: Math.round(FULL_SIZES.next1 * k), next2: Math.round(FULL_SIZES.next2 * k), plain: Math.round(FULL_SIZES.plain * k) };
  }
  const base = layout === 'reading' ? clamp(width * 0.112, 34, 84) : clamp(width * 0.088, 30, 66);
  const lengthFactor = (t: string) => (t.length <= 40 ? 1 : t.length <= 70 ? 0.8 : 0.65);
  return {
    current: (t) => Math.round(base * lengthFactor(t) * k),
    past: Math.max(14, Math.round(base * 0.32 * k)),
    next1: Math.round(base * 0.5 * k),
    next2: Math.round(base * 0.4 * k),
    plain: Math.round(base * 0.45 * k),
  };
}

/** Dots for the compact layouts: only outside the header and the dock, fewer and smaller. Deterministic per track. */
export function layoutDotsCompact(trackId: string, words: string[], w: number, h: number, top: number, bottom: number): Dot[] {
  const total = clamp(Math.round((w * h) / 42000), 5, 16);
  const rnd = seeded(hashString(trackId) + 17);
  const dots: Dot[] = [];
  for (let i = 0; i < 600 && dots.length < total; i++) {
    const x = Math.round(rnd() * (w - 40));
    const y = Math.round(top + rnd() * Math.max(1, h - top - bottom - 30));
    if (x > w - 340 && y < 80) continue; // top-right belongs to the Spotify panel
    const pick = rnd();
    dots.push({
      x, y, onBlock: false,
      color: pick > 0.66 ? 'a' : pick > 0.33 ? 'b' : 'ink',
      r: Math.round(10 + rnd() * 10),
      label: words.length > 0 && rnd() > 0.45 ? words[Math.floor(rnd() * words.length)] : '',
      dur: Math.round((2.6 + rnd() * 2) * 10) / 10,
      delay: Math.round(rnd() * 20) / 10,
    });
  }
  return dots;
}
