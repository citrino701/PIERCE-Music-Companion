export type BrowserKind = 'opera' | 'edge' | 'chrome' | 'firefox' | 'safari' | 'other';

/** Best-effort browser detection from the user agent (Opera GX reports itself as Opera, "OPR/"). */
export function detectBrowser(ua: string): BrowserKind {
  if (/OPR\/|Opera/i.test(ua)) return 'opera';
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

export const BROWSER_LABEL: Record<BrowserKind, string> = {
  opera: 'Opera / Opera GX', edge: 'Edge', chrome: 'Chrome', firefox: 'Firefox', safari: 'Safari', other: 'este navegador',
};

/** Chromium browsers can install the site as an app and open the floating Picture-in-Picture widget. */
export const supportsInstall = (b: BrowserKind): boolean => b === 'opera' || b === 'edge' || b === 'chrome';

/** What to tell the person when the browser did not offer a one-click install prompt. */
export function manualInstallHint(b: BrowserKind): string {
  switch (b) {
    case 'opera': return 'No Opera/Opera GX: procure o ícone de instalar na barra de endereço, ou o menu ▸ "Instalar PiErCe" / "Instalar como aplicativo".';
    case 'edge': return 'No Edge: menu ⋯ ▸ Aplicativos ▸ Instalar este site como um aplicativo.';
    case 'chrome': return 'No Chrome: ícone de instalar na barra de endereço, ou menu ⋮ ▸ Transmitir, salvar e compartilhar ▸ Instalar página como app.';
    default: return 'Este navegador não instala o site como app nem abre o widget flutuante; use Chrome, Edge ou Opera.';
  }
}
