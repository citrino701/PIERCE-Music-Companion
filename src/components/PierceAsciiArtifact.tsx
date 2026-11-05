import React, { useEffect, useState } from 'react';

interface PierceAsciiArtifactProps {
  isPlaying: boolean;
}

interface ArtifactPlacement {
  left: number;
  top: number;
  rotation: number;
  scale: number;
  tone: 'blue' | 'yellow';
  art: string;
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const ARTWORKS = [
  {
    tone: 'blue' as const,
    art: String.raw`      .----------------.
      |   P i E r C e   |
      '----------------'`,
  },
  {
    tone: 'yellow' as const,
    art: String.raw`          .-.
      .--.(   ).--.
     (     `-'     )
      `-.       .-'
         `-----'`,
  },
  {
    tone: 'blue' as const,
    art: String.raw`   P I E R C E
  -------------
   / / / / / /
  / / / / / /
`,
  },
  {
    tone: 'yellow' as const,
    art: String.raw`     .  *  .
  *  .---.  *
    /     \\
   |  ~~~  |
    \\     /
  *  '---'  *
     .  *  .`,
  },
];

export const PierceAsciiArtifact: React.FC<PierceAsciiArtifactProps> = ({ isPlaying }) => {
  const [placement, setPlacement] = useState<ArtifactPlacement | null>(null);

  useEffect(() => {
    if (!isPlaying || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlacement(null);
      return;
    }

    let showTimer = 0;
    let hideTimer = 0;
    let cancelled = false;
    let lastArtwork = -1;

    const scheduleNext = () => {
      showTimer = window.setTimeout(() => {
        if (cancelled) return;
        let artworkIndex = Math.floor(Math.random() * ARTWORKS.length);
        if (ARTWORKS.length > 1 && artworkIndex === lastArtwork) {
          artworkIndex = (artworkIndex + 1) % ARTWORKS.length;
        }
        lastArtwork = artworkIndex;
        const artwork = ARTWORKS[artworkIndex];

        setPlacement({
          left: randomBetween(12, 82),
          top: randomBetween(17, 72),
          rotation: randomBetween(-7, 7),
          scale: randomBetween(0.82, 1.08),
          tone: artwork.tone,
          art: artwork.art,
        });

        hideTimer = window.setTimeout(() => {
          setPlacement(null);
          scheduleNext();
        }, randomBetween(2600, 4200));
      }, randomBetween(6500, 12500));
    };

    scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isPlaying]);

  return (
    <div
      aria-hidden="true"
      className={`pierce-ascii-artifact pointer-events-none absolute z-[8] ${placement ? 'is-visible' : ''} ${placement?.tone === 'yellow' ? 'tone-yellow' : 'tone-blue'}`}
      style={{
        left: placement ? `${placement.left}%` : '50%',
        top: placement ? `${placement.top}%` : '50%',
        transform: `translate(-50%, -50%) rotate(${placement?.rotation ?? 0}deg) scale(${placement?.scale ?? 0.9})`,
      }}
    >
      <pre>{placement?.art ?? ''}</pre>
    </div>
  );
};
