import React, { useEffect, useRef, useState } from 'react';

interface PierceAsciiArtifactProps {
  isPlaying: boolean;
}

interface ArtifactPlacement {
  left: number;
  top: number;
  width: number;
  rotation: number;
  opacity: number;
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export const PierceAsciiArtifact: React.FC<PierceAsciiArtifactProps> = ({ isPlaying }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [placement, setPlacement] = useState<ArtifactPlacement | null>(null);

  useEffect(() => {
    if (!isPlaying || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlacement(null);
      return;
    }

    let showTimer = 0;
    let hideTimer = 0;
    let cancelled = false;

    const scheduleNext = () => {
      showTimer = window.setTimeout(() => {
        if (cancelled) return;

        setPlacement({
          left: randomBetween(8, 76),
          top: randomBetween(10, 66),
          width: randomBetween(190, 390),
          rotation: randomBetween(-9, 9),
          opacity: randomBetween(0.58, 0.9),
        });

        hideTimer = window.setTimeout(() => {
          setPlacement(null);
          scheduleNext();
        }, randomBetween(2200, 4300));
      }, randomBetween(9000, 19000));
    };

    scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (placement) {
      video.currentTime = 0;
      void video.play().catch(() => {
        // Autoplay may be blocked by the host; the visual remains non-blocking.
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [placement]);

  return (
    <video
      ref={videoRef}
      src="/assets/pierce-ascii-blue.webm"
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none absolute z-[8] h-auto max-w-[42vw] object-contain mix-blend-screen"
      style={{
        left: placement ? `${placement.left}%` : '50%',
        top: placement ? `${placement.top}%` : '50%',
        width: placement ? `${placement.width}px` : '0px',
        opacity: placement?.opacity ?? 0,
        transform: `translate(-50%, -50%) rotate(${placement?.rotation ?? 0}deg)`,
        transition: 'opacity 420ms ease, transform 650ms cubic-bezier(.2,.8,.2,1)',
      }}
    />
  );
};
