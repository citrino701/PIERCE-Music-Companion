import React, { useEffect, useRef, useState } from 'react';

const RAMP = ' .·:-=+*#%@';

export const PierceAsciiField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'ascii' | 'points'>('ascii');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cell = 9;
    let columns = 0;
    let rows = 0;
    let mask = new Float32Array();
    let random = new Float32Array();
    let animationFrame = 0;
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -9999, y: -9999 };

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      cell = width < 600 ? 8 : 11;
      columns = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const source = document.createElement('canvas');
      source.width = columns;
      source.height = rows;
      const sourceContext = source.getContext('2d');
      if (!sourceContext) return;
      sourceContext.fillStyle = '#000';
      sourceContext.fillRect(0, 0, columns, rows);
      sourceContext.fillStyle = '#fff';
      sourceContext.textAlign = 'center';
      sourceContext.textBaseline = 'middle';
      const face = "'Arial Black', Impact, 'Helvetica Neue', sans-serif";
      sourceContext.font = `900 100px ${face}`;
      const measured = sourceContext.measureText('PiErCe').width;
      const fontSize = Math.min(100 * columns * 0.38 / measured, rows * 0.19);
      sourceContext.font = `900 ${fontSize}px ${face}`;
      sourceContext.fillText('PiErCe', columns / 2, rows / 2);
      const pixels = sourceContext.getImageData(0, 0, columns, rows).data;
      mask = new Float32Array(columns * rows);
      random = new Float32Array(columns * rows);
      for (let i = 0; i < mask.length; i += 1) {
        mask[i] = pixels[i * 4] / 255;
        random[i] = Math.random();
      }
    };

    const draw = (now: number) => {
      const elapsed = reducedMotion ? 4 : (now - startedAt) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#8f8b83';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${cell * 1.2}px ui-monospace, Menlo, Consolas, monospace`;

      const reveal = Math.min(1, elapsed / 2.8);
      const radius = 90;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          const index = y * columns + x;
          const revealMask = clamp((reveal * 1.7 - (x / columns) * 0.7 - random[index] * 0.4) * 3, 0, 1);
          const logo = mask[index] * revealMask;
          const shimmer = 0.5 + 0.5 * Math.sin(x * 0.21 + elapsed * 0.9) * Math.cos(y * 0.17 - elapsed * 0.6);
          let intensity = logo * 0.92 + (1 - logo) * (0.018 + 0.07 * shimmer);

          let px = x * cell + cell / 2;
          let py = y * cell + cell / 2;
          const dx = px - pointer.x;
          const dy = py - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0.001 && distance < radius) {
            const force = (1 - distance / radius) ** 2;
            px += (dx / distance) * force * 28;
            py += (dy / distance) * force * 28;
            intensity = Math.min(1, intensity + force * 0.35);
          }

          if (intensity < 0.035) continue;
          ctx.globalAlpha = Math.min(0.82, 0.12 + intensity * 0.62);
          if (mode === 'points') {
            ctx.beginPath();
            ctx.arc(px, py, cell * 0.42 * Math.sqrt(intensity), 0, Math.PI * 2);
            ctx.fill();
          } else {
            const character = RAMP[Math.min(RAMP.length - 1, (intensity * RAMP.length) | 0)];
            if (character !== ' ') ctx.fillText(character, px, py);
          }
        }
      }
      ctx.globalAlpha = 1;
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onResize = () => {
      build();
      if (reducedMotion) draw(performance.now());
    };

    build();
    animationFrame = window.requestAnimationFrame(draw);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [mode]);

  return (
    <div className="pierce-ascii-interaction absolute inset-0 z-[2]" aria-label="Campo ASCII interativo">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      <button
        type="button"
        className="pierce-ascii-mode"
        onClick={() => setMode((current) => current === 'ascii' ? 'points' : 'ascii')}
        aria-label={mode === 'ascii' ? 'Alternar para pontos' : 'Alternar para ASCII'}
        title="Alternar ASCII / pontos"
      >
        {mode === 'ascii' ? 'ASCII' : 'POINTS'}
      </button>
    </div>
  );
};
