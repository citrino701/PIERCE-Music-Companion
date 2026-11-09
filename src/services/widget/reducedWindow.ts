import { WIDGET_SIZES, clampToScreen, defaultPosition, type WidgetVariant } from './widgetLayout';

/**
 * Morphs the single Tauri window between fullscreen and the floating widget.
 * In a plain browser (vite dev / Cloudflare preview) every call is a harmless no-op.
 */

interface SavedGeometry { width: number; height: number; x: number; y: number; maximized: boolean; fullscreen: boolean }

let saved: SavedGeometry | null = null;

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function api() {
  const [{ getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor }] = await Promise.all([
    import('@tauri-apps/api/window'),
  ]);
  return { win: getCurrentWindow(), LogicalSize, LogicalPosition, currentMonitor };
}

/** Enter the floating widget: small, borderless, transparent, always on top. */
export async function enterReduced(variant: WidgetVariant, position: { x: number; y: number } | null): Promise<void> {
  if (!isTauri()) return;
  const { win, LogicalSize, LogicalPosition, currentMonitor } = await api();
  const scale = await win.scaleFactor();
  if (!saved) {
    const [size, pos, maximized, fullscreen] = await Promise.all([win.innerSize(), win.outerPosition(), win.isMaximized(), win.isFullscreen()]);
    const ls = size.toLogical(scale), lp = pos.toLogical(scale);
    saved = { width: ls.width, height: ls.height, x: lp.x, y: lp.y, maximized, fullscreen };
  }
  const size = WIDGET_SIZES[variant];
  const monitor = await currentMonitor();
  const screen = monitor ? { width: monitor.size.width / monitor.scaleFactor, height: monitor.size.height / monitor.scaleFactor } : { width: 1920, height: 1080 };
  const target = position ? clampToScreen(position, size, screen) : defaultPosition(size, screen);

  if (saved.fullscreen) await win.setFullscreen(false);
  if (saved.maximized) await win.unmaximize();
  await win.setMinSize(new LogicalSize(size.width, size.height));
  await win.setMaxSize(new LogicalSize(size.width, size.height));
  await win.setResizable(false);
  await win.setDecorations(false);
  await win.setShadow(false);
  await win.setSize(new LogicalSize(size.width, size.height));
  await win.setPosition(new LogicalPosition(target.x, target.y));
  await win.setAlwaysOnTop(true);
  await win.setSkipTaskbar(false);
}

/** Change the widget format in place, keeping the top-left corner. */
export async function resizeReduced(variant: WidgetVariant): Promise<void> {
  if (!isTauri()) return;
  const { win, LogicalSize } = await api();
  const size = WIDGET_SIZES[variant];
  await win.setMaxSize(new LogicalSize(size.width, size.height));
  await win.setMinSize(new LogicalSize(size.width, size.height));
  await win.setSize(new LogicalSize(size.width, size.height));
}

/** Leave the widget and restore the previous window. Returns the widget position so it can be remembered. */
export async function exitReduced(): Promise<{ x: number; y: number } | null> {
  if (!isTauri() || !saved) return null;
  const { win, LogicalSize, LogicalPosition } = await api();
  const scale = await win.scaleFactor();
  const pos = (await win.outerPosition()).toLogical(scale);
  const g = saved;
  await win.setAlwaysOnTop(false);
  await win.setMaxSize(null);
  await win.setMinSize(new LogicalSize(900, 600));
  await win.setResizable(true);
  await win.setDecorations(true);
  await win.setShadow(true);
  await win.setSize(new LogicalSize(g.width, g.height));
  await win.setPosition(new LogicalPosition(g.x, g.y));
  if (g.maximized) await win.maximize();
  if (g.fullscreen) await win.setFullscreen(true);
  saved = null;
  return { x: Math.round(pos.x), y: Math.round(pos.y) };
}

/** Current widget position (logical px), for saving after a drag. */
export async function readPosition(): Promise<{ x: number; y: number } | null> {
  if (!isTauri()) return null;
  const { win } = await api();
  const scale = await win.scaleFactor();
  const p = (await win.outerPosition()).toLogical(scale);
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

export async function startDrag(): Promise<void> {
  if (!isTauri()) return;
  const { win } = await api();
  await win.startDragging();
}

/** Subscribe to window moves (logical px). Returns an unsubscribe function; no-op outside Tauri. */
export async function onWindowMoved(cb: (pos: { x: number; y: number }) => void): Promise<() => void> {
  if (!isTauri()) return () => undefined;
  const { win } = await api();
  const scale = await win.scaleFactor();
  return win.onMoved(({ payload }) => {
    const p = payload.toLogical(scale);
    cb({ x: Math.round(p.x), y: Math.round(p.y) });
  });
}
