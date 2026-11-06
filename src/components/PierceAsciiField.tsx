import React, { useEffect, useRef } from 'react';
type Point3D = { x: number; y: number; z: number; edge: boolean };
const FACE = ['·', ':', '+', '=', '*', '&', '#'];
const EDGE = ['%', '&', '#', '8'];
const hash = (n: number) => { const value = Math.sin(n * 127.1) * 43758.5453; return value - Math.floor(value); };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const PierceAsciiField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now(), rotation = { x: -0.12, y: -0.35, z: 0 };
    const drag = { active: false, pointerId: -1, lastX: 0, lastY: 0 };
    let width = 0, height = 0, dpr = 1, points: Point3D[] = [], frame = 0;
    const buildGeometry = () => {
      const source = document.createElement('canvas'); source.width = 640; source.height = 190;
      const sc = source.getContext('2d'); if (!sc) return;
      sc.fillStyle = '#fff'; sc.textAlign = 'center'; sc.textBaseline = 'middle';
      sc.font = '900 150px Arial Black, Impact, sans-serif'; sc.fillText('PiErCe', 320, 98);
      const pixels = sc.getImageData(0, 0, 640, 190).data, next: Point3D[] = [], depthSteps = 7;
      for (let y = 15; y < 180; y += 5) for (let x = 8; x < 632; x += 5) {
        if (pixels[(y * 640 + x) * 4 + 3] < 100) continue;
        const edge = !(
          pixels[(y * 640 + Math.max(0, x - 5)) * 4 + 3] >= 100 &&
          pixels[(y * 640 + Math.min(639, x + 5)) * 4 + 3] >= 100 &&
          pixels[(Math.max(0, y - 5) * 640 + x) * 4 + 3] >= 100 &&
          pixels[(Math.min(189, y + 5) * 640 + x) * 4 + 3] >= 100
        );
        for (let layer = 0; layer < depthSteps; layer++) next.push({
          x: (x - 320) / 640, y: (y - 95) / 640,
          z: -0.025 + layer / (depthSteps - 1) * 0.05, edge
        });
      }
      points = next;
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.parentElement?.getBoundingClientRect();
      width = Math.max(1, bounds?.width ?? window.innerWidth - 64);
      height = Math.max(1, bounds?.height ?? window.innerHeight);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); buildGeometry();
    };
    const down = (e: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const localX = e.clientX - bounds.left, localY = e.clientY - bounds.top;
      const scale = Math.min(width * 0.68, 780);
      if (Math.abs(localX - width * 0.48) > scale * 0.54 || Math.abs(localY - height * 0.58) > scale * 0.20) return;
      drag.active = true; drag.pointerId = e.pointerId; drag.lastX = e.clientX; drag.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grabbing');
    };
    const move = (e: PointerEvent) => {
      if (!drag.active || drag.pointerId !== e.pointerId) return;
      rotation.y += (e.clientX - drag.lastX) * 0.009;
      rotation.x = clamp(rotation.x + (e.clientY - drag.lastY) * 0.009, -1.05, 1.05);
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      if (reducedMotion) draw(performance.now());
    };
    const up = (e: PointerEvent) => {
      if (drag.pointerId !== e.pointerId) return;
      drag.active = false; drag.pointerId = -1; canvas.classList.remove('is-grabbing');
      if (reducedMotion) draw(performance.now());
    };
    const draw = (now: number) => {
      const time = (now - startedAt) / 1000;
      if (!drag.active && !reducedMotion) {
        rotation.y += 0.0018;
        rotation.x += (Math.sin(time * 0.22) * 0.18 - rotation.x) * 0.0018;
      }
      const cx = Math.cos(rotation.x), sx = Math.sin(rotation.x), cy = Math.cos(rotation.y), sy = Math.sin(rotation.y);
      const cz = Math.cos(rotation.z), sz = Math.sin(rotation.z);
      const scale = Math.min(width * 0.68, 780), centerX = width * 0.48, centerY = height * 0.58;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = (width < 600 ? '7px' : '9px') + ' ui-monospace, Menlo, Consolas, monospace';
      for (let i = 0; i < points.length; i++) {
        const p = points[i], x0 = p.x * scale, y0 = p.y * scale * 1.48, z0 = p.z * scale;
        const x1 = x0 * cy + z0 * sy, z1 = -x0 * sy + z0 * cy;
        const y1 = y0 * cx - z1 * sx, z2 = y0 * sx + z1 * cx;
        const x2 = x1 * cz - y1 * sz, y2 = x1 * sz + y1 * cz;
        const perspective = 1.8 / (1.8 - z2 / Math.max(scale, 1));
        const px = centerX + x2 * perspective, py = centerY + y2 * perspective;
        if (px < 4 || px > width - 4 || py < 4 || py > height - 4) continue;
        const light = clamp(0.5 + z2 / (scale * 0.18), 0.16, 1);
        const glyph = p.edge ? EDGE[Math.floor(hash(i * 3) * EDGE.length)] : FACE[Math.min(FACE.length - 1, Math.floor(light * FACE.length))];
        ctx.globalAlpha = p.edge ? 0.54 : 0.34 + light * 0.42;
        ctx.fillStyle = p.edge ? '#69766a' : (light > 0.72 ? '#596f83' : '#41443e');
        ctx.fillText(glyph, px, py);
      }
      ctx.globalAlpha = 1; if (!reducedMotion) frame = requestAnimationFrame(draw);
    };
    resize(); frame = requestAnimationFrame(draw);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); window.removeEventListener('resize', resize);
    };
  }, []);
  return <div className="pierce-ambient-composition absolute inset-0 z-[2]" aria-hidden="true">
    <canvas ref={canvasRef} className="h-full w-full pierce-3d-wordmark" />
  </div>;
};
