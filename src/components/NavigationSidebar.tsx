import React from 'react';
import { ViewMode } from '../types';
import { PictureInPicture2, Monitor } from 'lucide-react';

interface NavigationSidebarProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
}

const MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'reduced', label: '01. Reduzido (player flutuante)', icon: <PictureInPicture2 className="w-4 h-4" /> },
  { id: 'fullscreen', label: '02. Fullscreen', icon: <Monitor className="w-4 h-4" /> },
];

/**
 * A faixa de navegação fica escondida por padrão (deslizada pra fora da tela) e só se revela quando o
 * mouse passa sobre a área esquerda onde ela mora, ou quando um dos seus controles recebe foco (teclado).
 * A área de detecção do hover (o wrapper) ocupa o mesmo espaço físico que a barra ocupava antes, então o
 * gesto de "passar o mouse onde ela ficava" continua funcionando mesmo com ela invisível.
 */
export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ currentMode, onSelectMode }) => (
  <div className="group fixed left-0 top-0 z-[80] h-[100dvh] w-16">
    <aside className="pierce-editorial-rail pierce-global-sidebar absolute inset-y-0 left-0 flex h-full w-16 shrink-0 flex-col items-center justify-between border-r py-6 -translate-x-full transition-transform duration-200 ease-out group-hover:translate-x-0 focus-within:translate-x-0">
      <div className="font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold tracking-tight text-white">PiErCe</div>
      <nav aria-label="Modos de visualização" className="flex flex-col items-center gap-4">
        {MODES.map((mode) => (
          <button key={mode.id} type="button" onClick={() => onSelectMode(mode.id)}
            aria-label={mode.label} aria-pressed={currentMode === mode.id} title={mode.label}
            className={`pierce-rail-button p-1.5 transition-colors cursor-pointer ${currentMode === mode.id ? 'pierce-rail-button-active font-bold' : ''}`}>
            {mode.icon}
          </button>
        ))}
      </nav>
      <div className="pierce-version font-mono text-[9px]">v0.1</div>
    </aside>
  </div>
);
