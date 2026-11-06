import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface Props { isPlaying: boolean; progress: number; onClick: () => void; }

export const PixelPlayButton: React.FC<Props> = ({ isPlaying, progress, onClick }) => {
  const [pulse, setPulse] = useState(false);
  const previousPlaying = useRef(isPlaying);

  // O efeito acompanha a confirmação real do estado, não o clique nem cada atualização da posição.
  useEffect(() => {
    if (previousPlaying.current !== isPlaying) {
      setPulse(true);
      previousPlaying.current = isPlaying;
    }
  }, [isPlaying]);

  return (
    <button type="button" onClick={onClick} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      aria-pressed={isPlaying} className={`pierce-pixel-play ${isPlaying ? 'is-playing' : 'is-paused'}`}>
      <svg className="pierce-pixel-ring-svg" viewBox="0 0 76 76" aria-hidden="true">
        <circle className="pierce-pixel-ring" cx="38" cy="38" r="36" fill="none"
          stroke="var(--faint)" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" />
        <circle cx="38" cy="38" r="36" fill="none" stroke="var(--pixel-accent)"
          strokeWidth="2" strokeLinecap="round" strokeDasharray="226.2"
          strokeDashoffset={226.2 * (1 - Math.max(0, Math.min(1, progress)))}
          transform="rotate(-90 38 38)" />
      </svg>
      {pulse && <span className="pierce-button-pixel-pulse" onAnimationEnd={() => setPulse(false)} />}
      <span className="pierce-pixel-core">
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </span>
    </button>
  );
};
