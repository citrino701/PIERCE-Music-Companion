import { WIDGET_SIZES, type WidgetVariant } from './widgetLayout';

/**
 * Browser version of the floating widget, built on the Document Picture-in-Picture API
 * (Chrome/Edge 116+). The OS keeps that small window above every other program.
 * Must be opened from a user gesture (click or key press).
 */

interface DocumentPiP {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

const pipApi = (): DocumentPiP | undefined =>
  typeof window === 'undefined' ? undefined : (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture;

export const isPipSupported = (): boolean => !!pipApi();

/** Copy fonts and styles of the app into the PiP document so the widget looks the same. */
export function copyStyles(target: Document, source: Document = document): void {
  source.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    target.head.appendChild(node.cloneNode(true));
  });
  target.body.style.margin = '0';
  target.body.style.background = '#e9e6df';
}

export async function openPipWindow(variant: WidgetVariant): Promise<Window | null> {
  const api = pipApi();
  if (!api) return null;
  if (api.window) return api.window; // already open
  const { width, height } = WIDGET_SIZES[variant];
  const win = await api.requestWindow({ width, height });
  copyStyles(win.document);
  return win;
}

export function resizePipWindow(win: Window, variant: WidgetVariant): void {
  const { width, height } = WIDGET_SIZES[variant];
  try { win.resizeTo(width, height); } catch { /* browsers may refuse resizing */ }
}
