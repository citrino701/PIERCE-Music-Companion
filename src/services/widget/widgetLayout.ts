/** Pure helpers for the floating "reduced" widget (sizes, persisted preferences). */

export type WidgetVariant = 'normal' | 'disc' | 'mini';

export const WIDGET_VARIANTS: WidgetVariant[] = ['normal', 'disc', 'mini'];

/**
 * Logical window size per variant. The window itself IS the widget now (no background shows
 * through): 'normal' and 'mini' shells fill 100% of the window exactly, so their size here is the
 * widget's real on-screen size (392x196 / 300x48, rounded up a hair for border/shadow crispness).
 * 'disc' still draws itself at a fixed 204px diameter and needs a little real margin around it for
 * its (non-clipped) drop shadow to bleed into, so it keeps a small surrounding box.
 */
export const WIDGET_SIZES: Record<WidgetVariant, { width: number; height: number }> = {
  normal: { width: 394, height: 198 },
  disc: { width: 220, height: 220 },
  mini: { width: 302, height: 50 },
};

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

export function nextVariant(v: WidgetVariant): WidgetVariant {
  return WIDGET_VARIANTS[(WIDGET_VARIANTS.indexOf(v) + 1) % WIDGET_VARIANTS.length];
}

/** Progress ring/bar dots filled so far. */
export function filledDots(progressMs: number, durationMs: number, total: number): number {
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(total, Math.floor((progressMs / durationMs) * total)));
}
