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

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ currentMode, onSelectMode }) => (
  <aside className="pierce-editorial-rail pierce-global-sidebar fixed left-0 top-0 z-[80] flex h-[100dvh] w-16 shrink-0 flex-col items-center justify-between border-r py-6">
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
);
