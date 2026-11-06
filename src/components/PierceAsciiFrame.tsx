import React, { useEffect, useRef } from 'react';

type BorderGlyph = {
  x: number;
  y: number;
  ring: number;
  phase: number;
  id: number;
};

const RAMP = ['.', '·', ':', '+', '*'];
const PALETTE = [205, 220, 155, 42, 28, 215, 185];
const hash = (n: number) => {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
};

function hueAt(position: number) {
  const count = PALETTE.length;
  const index = Math.floor(position) % count;
  const next = (index + 1) % count;
  const blend = position - Math.floor(position);
  const delta = ((PALETTE[next] - PALETTE[index] + 540) % 360) - 180;
  return (PALETTE[index] + delta * blend + 360) % 360;
}

export const PierceAsciiFrame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -999, y: -999 };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let cellWidth = 10;
    let cellHeight = 18;
    let glyphs: BorderGlyph[] = [];
    let animationId = 0;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.parentElement?.getBoundingClientRect();
      width = Math.max(1, bounds?.width ?? window.innerWidth - 64);
      height = Math.max(1, bounds?.height ?? window.innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      cellWidth = width < 600 ? 8 : 10;
      cellHeight = Math.round(cellWidth * 1.75);

      const columns = Math.ceil(width / cellWidth);
      const rows = Math.ceil(height / cellHeight);
      const offsetX = (width - columns * cellWidth) / 2 + cellWidth / 2;
      const offsetY = (height - rows * cellHeight) / 2 + cellHeight / 2;
      glyphs = [];

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const ring = Math.min(column, row, columns - 1 - column, rows - 1 - row);
          if (ring >= 2) continue;
          glyphs.push({
            x: offsetX + column * cellWidth,
            y: offsetY + row * cellHeight,
            ring,
            phase: hash(column * 31 + row * 17) * Math.PI * 2,
            id: column * 97 + row,
          });
        }
      }
    };

    const draw = (timestamp: number) => {
      const time = reducedMotion ? 0 : timestamp / 1000;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `${cellHeight * 0.88}px "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace`;

      for (const glyph of glyphs) {
        const distance = Math.hypot(glyph.x - pointer.x, glyph.y - pointer.y);
        const proximity = distance < 120 ? 1 - distance / 120 : 0;
        const wave = 0.5 + 0.5 * Math.sin(time * 1.2 + glyph.phase + (glyph.x + glyph.y) * 0.008);
        const intensity = Math.min(1, wave + proximity * 0.5);
        const character = RAMP[Math.min(RAMP.length - 1, Math.floor(intensity * RAMP.length))];
        const y = glyph.y + (wave - 0.5) * cellHeight * 0.7;
        const hue = hueAt(((glyph.x + glyph.y) / 420 + time * 0.12) % PALETTE.length + PALETTE.length);
        const sparkle = hash(glyph.id + Math.floor(time * 3)) > 0.995;
        const alpha = (0.16 + 0.3 * intensity) * (glyph.ring === 0 ? 0.68 : 1)
          + proximity * 0.2 + (sparkle ? 0.22 : 0);

        context.globalAlpha = Math.min(0.72, alpha);
        context.fillStyle = `hsl(${hue.toFixed(0)} 38% ${sparkle ? 55 : 43}%)`;
        context.fillText(character, glyph.x, y);
      }

      context.globalAlpha = 1;
      if (!reducedMotion) animationId = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    };
    const onPointerLeave = () => {
      pointer.x = -999;
      pointer.y = -999;
    };
    const onResize = () => {
      build();
      if (reducedMotion) draw(0);
    };

    build();
    animationId = window.requestAnimationFrame(draw);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pierce-ascii-frame" aria-hidden="true" />;
};
