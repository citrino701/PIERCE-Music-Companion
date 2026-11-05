import React from 'react';
import { ViewMode } from '../types';
import { Minimize2, Disc3, Maximize2, Monitor, Wind } from 'lucide-react';

interface NavigationRailProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  orientation?: 'horizontal' | 'vertical' | 'radial';
  className?: string;
  compactLabels?: boolean;
  theme?: 'light' | 'dark';
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentMode,
  onSelectMode,
  className = '',
  compactLabels = false,
  theme = 'light',
}) => {
  const modes: { id: ViewMode; label: string; number: string; icon: React.ReactNode }[] = [
    { id: 'compact', label: 'Compacto', number: '01', icon: <Minimize2 className="w-3 h-3" /> },
    { id: 'disc', label: 'Disco', number: '02', icon: <Disc3 className="w-3 h-3" /> },
    { id: 'expanded', label: 'Expandido', number: '03', icon: <Maximize2 className="w-3 h-3" /> },
    { id: 'fullscreen', label: 'Fullscreen', number: '04', icon: <Monitor className="w-3 h-3" /> },
    { id: 'zen', label: 'Zen', number: '05', icon: <Wind className="w-3 h-3" /> },
  ];

  const isDark = theme === 'dark';

  return (
    <nav
      aria-label="Modos de Visualização PIERCE"
      className={`inline-flex items-center gap-1 p-1 rounded-full shadow-sm transition-colors ${
        isDark
          ? 'bg-[#121316]/90 backdrop-blur-md border border-white/10 text-white'
          : 'bg-[#f4f1ea]/90 backdrop-blur-md border border-black/15 text-[#141416]'
      } ${className}`}
    >
      {modes.map((item) => {
        const isActive = currentMode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectMode(item.id)}
            aria-label={`Mudar para modo ${item.label}`}
            aria-pressed={isActive}
            className={`group relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono tracking-wider transition-all duration-200 rounded-full cursor-pointer whitespace-nowrap ${
              isActive
                ? isDark
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-black text-[#f4f1ea] font-semibold shadow-xs'
                : isDark
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-black/60 hover:text-black hover:bg-black/5'
            }`}
          >
            <span
              className={`text-[10px] ${
                isActive
                  ? isDark
                    ? 'text-[#ff3b30]'
                    : 'text-[#ff3b30]'
                  : isDark
                  ? 'text-white/40 group-hover:text-white/70'
                  : 'text-black/40 group-hover:text-black/70'
              }`}
            >
              {item.number}
            </span>
            <span className="shrink-0">{item.icon}</span>
            {!compactLabels && (
              <span className="hidden sm:inline font-sans text-[11px] tracking-normal font-medium">
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
