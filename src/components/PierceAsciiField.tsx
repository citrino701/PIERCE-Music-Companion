import React, { useEffect, useRef } from 'react';

type Point3D = { x: number; y: number; z: number; edge: boolean };

const FACE = ['·', ':', '+', '=', '*', '&', '#'];
const EDGE = ['%', '&', '#', '8'];
const GLYPH = [...'魂浄濾靈聲守⊕⊥▽ψ♆&%$#@8Ψ∆∇≡≠'];
const TWINK = ['.', '·', '+', '*', '✦'];
const COLORS = ['#69766a', '#9a8a58', '#637aa8'];

const hash = (n: number) => {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const PierceAsciiField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let cell = 10;
    let points: Point3D[] = [];
    let animationFrame = 0;

    const buildWordmark = () => {
      const source = document.createElement('canvas');
      source.width = 420;
      source.height = 120;
      const sourceContext = source.getContext('2d');
      if (!sourceContext) return;
      sourceContext.clearRect(0, 0, source.width, source.height);
      sourceContext.fillStyle = '#fff';
      sourceContext.textAlign = 'center';
      sourceContext.textBaseline = 'middle';
      sourceContext.font = '900 104px Arial Black, Impact, sans-serif';
      sourceContext.fillText('PiErCe', 210, 62);

      const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
      const next: Point3D[] = [];
      for (let y = 10; y < 112; y += 4) {
        for (let x = 4; x < 416; x += 4) {
          if (pixels[(y * source.width + x) * 4 + 3] < 100) continue;
          const edge =
            pixels[(y * source.width + Math.max(0, x - 4)) * 4 + 3] < 100 ||
            pixels[(y * source.width + Math.min(419, x + 4)) * 4 + 3] < 100 ||
            pixels[(Math.max(0, y - 4) * source.width + x) * 4 + 3] < 100 ||
            pixels[(Math.min(119, y + 4) * source.width + x) * 4 + 3] < 100;
          next.push({ x: (x - 210) / 420, y: (y - 60) / 420, z: 0.035, edge });
          next.push({ x: (x - 210) / 420, y: (y - 60) / 420, z: -0.035, edge });
        }
      }
      points = next;
    };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      cell = width < 600 ? 8 : 10;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      buildWordmark();
    };

    const put = (character: string, x: number, y: number, alpha: number, color = '#77736b') => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillText(character, x, y);
    };

    const drawStar = (time: number) => {
      const centerX = width * 0.255;
      const centerY = height * 0.265;
      const radius = Math.min(width, height) * 0.205;
      const pulsePhase = 0.5 + 0.5 * Math.cos(time * Math.PI * 2 / 7);
      const pulse = 0.12 + 0.88 * Math.pow(pulsePhase, 1.4);
      const angle = 0.12 * Math.sin(time * 0.35);
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const stepX = width < 600 ? 10 : 12;
      const stepY = width < 600 ? 17 : 20;

      ctx.font = (cell * 0.9) + 'px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let y = centerY - radius; y <= centerY + radius; y += stepY) {
        for (let x = centerX - radius; x <= centerX + radius; x += stepX) {
          const rawX = (x - centerX) / radius;
          const rawY = (y - centerY) / radius;
          const rx = rawX * ca + rawY * sa;
          const ry = -rawX * sa + rawY * ca;
          const ax = Math.abs(rx);
          const ay = Math.abs(ry);
          const distance = Math.hypot(rx, ry);
          const core = clamp(1.15 - Math.sqrt(ax) - Math.sqrt(ay), 0, 1);
          const halo = 0.62 / (1 + Math.pow(distance / 0.22, 2));
          const rays =
            Math.exp(-ay * 28) * Math.exp(-ax * 2.2) +
            Math.exp(-ax * 28) * Math.exp(-ay * 2.2);
          const diagonal = 0.22 * (
            Math.exp(-Math.abs(rx + ry) * 28) * Math.exp(-Math.abs(rx - ry) * 3) +
            Math.exp(-Math.abs(rx - ry) * 28) * Math.exp(-Math.abs(rx + ry) * 3)
          );
          let brightness = (core + halo + rays * 0.6 + diagonal) * pulse;
          brightness *= 0.94 + (hash(Math.floor(x * 0.3 + y * 0.7) + Math.floor(time * 8)) - 0.5) * 0.14;
          if (brightness < 0.08) continue;
          const flicker = Math.pow(0.5 + 0.5 * Math.sin(time * 1.4 + hash(x + y) * 6.28), 3);
          const character = brightness > 0.72 && flicker > 0.45
            ? GLYPH[Math.floor(hash(x * 3 + y + Math.floor(time * 4)) * GLYPH.length)]
            : FACE[Math.min(FACE.length - 1, Math.floor(brightness * FACE.length))];
          put(character, x, y, Math.min(0.28, 0.035 + brightness * 0.17), brightness > 0.78 ? '#8c8a7d' : '#9b978e');
        }
      }

      const stars = 42;
      for (let i = 0; i < stars; i += 1) {
        const x = 24 + hash(i + 1) * Math.max(1, width - 48);
        const y = 24 + hash(i + 91) * Math.max(1, height - 48);
        const dx = (x - centerX) / radius;
        const dy = (y - centerY) / radius;
        if (Math.hypot(dx, dy) < 1.05) continue;
        const twinkle = Math.pow(0.5 + 0.5 * Math.sin(time * (0.4 + hash(i + 5)) + hash(i + 9) * 6.28), 3);
        const glyph = TWINK[Math.floor(hash(i + Math.floor(time * 0.3)) * TWINK.length)];
        put(glyph, x, y, 0.035 + twinkle * 0.13, '#89867d');
      }

      return pulse;
    };

    const drawWordmark = (time: number) => {
      const scale = Math.min(width * 0.76, 900);
      const centerX = width * 0.34;
      const centerY = height * 0.54;
      const rotation = reducedMotion ? 0.18 : Math.sin(time * 0.32) * 0.28 + time * 0.12;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);

      ctx.font = (width < 600 ? '8px' : '10px') + ' ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const x = point.x * scale;
        const z = point.z * scale;
        const rotatedX = x * cosine + z * sine;
        const depth = -x * sine + z * cosine;
        const perspective = 1.45 / (1.45 - depth / Math.max(scale, 1));
        const screenX = centerX + rotatedX * perspective;
        const screenY = centerY + point.y * scale * 1.55 * perspective;
        if (screenX < 62 || screenX > width - 12 || screenY < 12 || screenY > height - 12) continue;

        const frontLight = Math.max(0, point.z > 0 ? cosine : -cosine);
        const brightness = point.edge ? 0.35 + Math.abs(sine) * 0.32 : 0.22 + frontLight * 0.62;
        const character = point.edge
          ? EDGE[Math.floor(hash(i) * EDGE.length)]
          : FACE[Math.min(FACE.length - 1, Math.floor(brightness * FACE.length))];
        const color = point.edge ? '#69766a' : (i % 13 === 0 ? '#637aa8' : '#77736b');
        put(character, screenX, screenY, point.edge ? 0.22 : 0.12 + brightness * 0.28, color);
      }
    };

    const drawDetails = (time: number, pulse: number) => {
      ctx.font = '9px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const code = '4CY / LUM ' + String(Math.round(pulse * 100)).padStart(3, '0') + '%';
      [...code].forEach((character, index) => put(character, 25 + index * 8, 34, 0.26, '#77736b'));

      const dotColors = ['#718b76', '#718b76', '#b4a36d', '#b4a36d', '#b4a36d', '#7184a8'];
      for (let row = 0; row < 6; row += 1) {
        for (let column = 0; column < 12; column += 1) {
          const x = 26 + column * 8;
          const y = height - 76 + row * 8;
          if (y < 20 || x > width - 20) continue;
          const opacity = 0.09 + 0.24 * hash(row * 31 + column + Math.floor(time * 1.5));
          put('•', x, y, opacity, dotColors[row]);
        }
      }

      ctx.globalAlpha = 0.11;
      ctx.fillStyle = '#77736b';
      ctx.fillRect(20, 54, 1, Math.max(60, height - 120));
      ctx.fillRect(width - 22, 54, 1, Math.max(60, height - 120));
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const time = reducedMotion ? 1.2 : (now - startedAt) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const pulse = drawStar(time);
      drawWordmark(time);
      drawDetails(time, pulse);
      ctx.globalAlpha = 1;
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(frame);
    };

    const onResize = () => {
      build();
      if (reducedMotion) frame(performance.now());
    };

    build();
    animationFrame = window.requestAnimationFrame(frame);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="pierce-ambient-composition absolute inset-0 z-[2] pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};
