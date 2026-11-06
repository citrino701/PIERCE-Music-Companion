import React, { useEffect, useRef } from 'react';
import { formatTime } from '../services/playbackEngine';

interface Props { progressMs: number; durationMs: number; isPlaying: boolean; onSeek: (positionMs: number) => void; }
const STEP = 6;
const peakAt = (i: number) => 0.2 + 0.8 * Math.abs(Math.sin(i * 0.19) * Math.sin(i * 0.053 + 1) * 0.7 + (Math.sin(i * 12.9898) % 1) * 0.3);

export const PierceWaveProgress: React.FC<Props> = ({ progressMs, durationMs, isPlaying, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wave = waveRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wave || !ctx) return;
    let width = 0;
    const height = 44;
    let dpr = 1;

    const draw = () => {
      const bounds = wave.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const styles = getComputedStyle(document.documentElement);
      const ink = styles.getPropertyValue('--ink').trim() || '#242720';
      const faint = styles.getPropertyValue('--faint').trim() || '#bdb8ab';
      const accent = styles.getPropertyValue('--pixel-accent').trim() || '#e8cf83';
      const p = Math.max(0, Math.min(1, progressMs / Math.max(1, durationMs)));
      const count = Math.floor(width / STEP);
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < count; i++) {
        const magnitude = Math.round(peakAt(i) * 5.4);
        ctx.fillStyle = i / Math.max(1, count) < p ? ink : faint;
        for (let k = -magnitude; k <= magnitude; k++) {
          ctx.beginPath();
          ctx.arc(i * STEP + STEP / 2, height / 2 + k * 3.2, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const x = p * width;
      ctx.fillStyle = accent;
      ctx.fillRect(x - 0.5, 4, 1, height - 8);
      ctx.fillStyle = accent;
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦', x, 9);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wave);
    return () => observer.disconnect();
  }, [progressMs, durationMs]);

  // Mantém a assinatura compatível com o player; a forma de onda não pulsa a cada tick.
  void isPlaying;

  const seek = (x: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) onSeek(Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * durationMs);
  };

  return (
    <div className="pierce-wave-wrap">
      <div ref={waveRef} className="pierce-wave" role="slider" tabIndex={0}
        aria-label="Progresso da faixa" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(progressMs / Math.max(1, durationMs) * 100)}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seek(e.clientX); }}
        onPointerMove={e => { if (e.buttons === 1) seek(e.clientX); }}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(durationMs, progressMs + 5000)); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(Math.max(0, progressMs - 5000)); }
        }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="pierce-wave-times">
        <span>{formatTime(progressMs)}</span>
        <span>−{formatTime(Math.max(0, durationMs - progressMs))}</span>
      </div>
    </div>
  );
};
