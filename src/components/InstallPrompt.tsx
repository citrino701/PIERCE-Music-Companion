import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { BROWSER_LABEL, detectBrowser, manualInstallHint, supportsInstall } from '../services/install/browser';
import { isTauri } from '../services/widget/reducedWindow';

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const DISMISS_KEY = 'pierce:install-dismissed';

/** Small "install as app" pill, shown only in a regular browser tab (not in the desktop shell or an installed app). */
export const InstallPrompt: React.FC = () => {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [hint, setHint] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const browser = detectBrowser(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const standalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  if (hidden || standalone || isTauri()) return null;

  const dismiss = () => {
    setHidden(true);
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
  };
  const install = async () => {
    if (!event) { setHint(true); return; }
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === 'accepted') setHidden(true);
  };

  return (
    <div className="fixed left-20 top-3 z-[60] flex max-w-[360px] flex-col gap-1 font-mono text-[10px]">
      <div className="flex items-center gap-1 rounded-full border-2 border-[#14142b] bg-[#fbfaf6] px-1 py-1 shadow-[3px_3px_0_#14142b]">
        <button type="button" onClick={() => void install()} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[#14142b] hover:bg-black/5">
          <Download size={12} aria-hidden /> Instalar PiErCe no {BROWSER_LABEL[browser]}
        </button>
        <button type="button" onClick={dismiss} aria-label="Dispensar" className="rounded-full p-1 text-black/50 hover:text-black"><X size={12} /></button>
      </div>
      {hint && (
        <div role="status" className="rounded-lg border-2 border-[#14142b] bg-[#fbfaf6] px-2 py-1.5 text-[#14142b]">
          {supportsInstall(browser) ? manualInstallHint(browser) : manualInstallHint('other')}
        </div>
      )}
    </div>
  );
};
