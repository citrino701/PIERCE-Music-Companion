/** Pure helpers for the floating "reduced" widget (sizes, persisted preferences). */

/**
 * Only one format is chosen by the person now ('normal'). The widget also has a "nano" layout —
 * a single skip button, nothing else — but that one is never picked manually: ReducedWidget
 * switches to it on its own, purely from the window's actual measured size (see NANO_MAX_SIZE),
 * so it only shows up once the window has actually been shrunk down that small.
 */
export type WidgetVariant = 'normal';

export const WIDGET_VARIANTS: WidgetVariant[] = ['normal'];

/** Logical window size for the (only) manually-chosen format — the widget's real on-screen size. */
export const WIDGET_SIZES: Record<WidgetVariant, { width: number; height: number }> = {
  normal: { width: 394, height: 198 },
};

/**
 * Below this real, measured size the widget drops everything but a single skip-track button — at
 * that point there's no room left for the cover, the text or even the play/pause control, so skip
 * is the one thing that still has to work. Triggers on EITHER dimension alone (not both at once):
 * the window usually gets squeezed in one direction (short and still wide, or narrow and still
 * tall), and either one on its own is already enough to break the normal layout.
 */
export const NANO_MAX_SIZE = { width: 220, height: 100 };

export const WIDGET_STORAGE_KEY = 'pierce:widget';

export interface WidgetPrefs {
  variant: WidgetVariant;
  /** Last top-left position of the widget window, in logical pixels. */
  position: { x: number; y: number } | null;
}

export const DEFAULT_WIDGET_PREFS: WidgetPrefs = { variant: 'normal', position: null };

export function isWidgetVariant(value: unknown): value is WidgetVariant {
  return typeof value === 'string' && (WIDGET_VARIANTS as string[]).includes(value);
}

/** Tolerant parser: anything malformed falls back to defaults field by field. */
export function parseWidgetPrefs(raw: string | null | undefined): WidgetPrefs {
  if (!raw) return { ...DEFAULT_WIDGET_PREFS };
  try {
    const data = JSON.parse(raw) as Partial<WidgetPrefs> | null;
    const variant = isWidgetVariant(data?.variant) ? data.variant : DEFAULT_WIDGET_PREFS.variant;
    const p = data?.position;
    const position = p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
    return { variant, position };
  } catch {
    return { ...DEFAULT_WIDGET_PREFS };
  }
}

export function serializeWidgetPrefs(prefs: WidgetPrefs): string {
  return JSON.stringify(prefs);
}

/** Keep the widget fully inside the screen (used when restoring a saved position on a changed monitor setup). */
export function clampToScreen(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  screen: { width: number; height: number },
): { x: number; y: number } {
  const maxX = Math.max(0, screen.width - size.width);
  const maxY = Math.max(0, screen.height - size.height);
  return { x: Math.min(maxX, Math.max(0, Math.round(pos.x))), y: Math.min(maxY, Math.max(0, Math.round(pos.y))) };
}

/** Default spot: bottom-right corner with a margin. */
export function defaultPosition(size: { width: number; height: number }, screen: { width: number; height: number }, margin = 24) {
  return clampToScreen({ x: screen.width - size.width - margin, y: screen.height - size.height - margin - 40 }, size, screen);
}

/** Progress ring/bar dots filled so far. */
export function filledDots(progressMs: number, durationMs: number, total: number): number {
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(total, Math.floor((progressMs / durationMs) * total)));
}
