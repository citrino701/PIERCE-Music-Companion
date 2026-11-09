import { WIDGET_SIZES, clampToScreen, defaultPosition, type WidgetVariant } from './widgetLayout';

/**
 * Morphs the single Tauri window between fullscreen and the floating widget.
 * In a plain browser (vite dev / Cloudflare preview) every call is a harmless no-op.
 */

interface SavedGeometry { width: number; height: number; x: number; y: number; maximized: boolean; fullscreen: boolean }

let saved: SavedGeometry | null = null;

/** True inside the Tauri desktop shell. Several markers are checked because they differ between Tauri versions and dev/prod URLs. */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.isTauri || w.__TAURI_INTERNALS__ || w.__TAURI__ || w.__TAURI_METADATA__ || /tauri/i.test(window.location.protocol + window.location.hostname));
};

async function api() {
  const [{ getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor }] = await Promise.all([
    import('@tauri-apps/api/window'),
  ]);
  return { win: getCurrentWindow(), LogicalSize, LogicalPosition, currentMonitor };
}

/** Runs one window call; a failure is recorded (and logged) instead of aborting the whole morph. */
async function step(errors: string[], name: string, fn: () => Promise<unknown>): Promise<void> {
  try { await fn(); } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[reduzido] ${name} falhou:`, err);
    errors.push(`${name}: ${msg}`);
  }
}

/** Enter the floating widget: small, borderless, transparent, always on top. Returns the steps that failed (empty = all good). */
export async function enterReduced(variant: WidgetVariant, position: { x: number; y: number } | null): Promise<string[]> {
  const errors: string[] = [];
  if (!isTauri()) return errors;
  let win: Awaited<ReturnType<typeof api>>['win'];
  let LogicalSize: Awaited<ReturnType<typeof api>>['LogicalSize'];
  let LogicalPosition: Awaited<ReturnType<typeof api>>['LogicalPosition'];
  let currentMonitor: Awaited<ReturnType<typeof api>>['currentMonitor'];
  try { ({ win, LogicalSize, LogicalPosition, currentMonitor } = await api()); } catch (err) {
    return [`api da janela: ${err instanceof Error ? err.message : String(err)}`];
  }
  let scale = 1;
  await step(errors, 'scaleFactor', async () => { scale = await win.scaleFactor(); });
  if (!saved) {
    let geo: SavedGeometry = { width: 1440, height: 900, x: 80, y: 60, maximized: false, fullscreen: false };
    await step(errors, 'ler geometria', async () => {
      const [size, pos, maximized, fullscreen] = await Promise.all([win.innerSize(), win.outerPosition(), win.isMaximized(), win.isFullscreen()]);
      const ls = size.toLogical(scale), lp = pos.toLogical(scale);
      geo = { width: ls.width, height: ls.height, x: lp.x, y: lp.y, maximized, fullscreen };
    });
    saved = geo;
  }
  const size = WIDGET_SIZES[variant];
  let screen = { width: 1920, height: 1080 };
  await step(errors, 'monitor', async () => {
    const monitor = await currentMonitor();
    if (monitor) screen = { width: monitor.size.width / monitor.scaleFactor, height: monitor.size.height / monitor.scaleFactor };
  });
  const target = position ? clampToScreen(position, size, screen) : defaultPosition(size, screen);

  if (saved.fullscreen) await step(errors, 'sair do fullscreen', () => win.setFullscreen(false));
  if (saved.maximized) await step(errors, 'desmaximizar', () => win.unmaximize());
  await step(errors, 'sem borda', () => win.setDecorations(false));
  await step(errors, 'redimensionável', () => win.setResizable(false));
  await step(errors, 'tamanho mínimo', () => win.setMinSize(new LogicalSize(size.width, size.height)));
  await step(errors, 'tamanho máximo', () => win.setMaxSize(new LogicalSize(size.width, size.height)));
  await step(errors, 'tamanho', () => win.setSize(new LogicalSize(size.width, size.height)));
  await step(errors, 'posição', () => win.setPosition(new LogicalPosition(target.x, target.y)));
  await step(errors, 'sempre no topo', () => win.setAlwaysOnTop(true));
  await step(errors, 'sombra', () => win.setShadow(false));
  return errors;
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
