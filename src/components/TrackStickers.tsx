import React from 'react';
import { TrackData } from '../types';

function tagsFor(track: TrackData): string[] {
  const mood = track.mood.toLowerCase();
  const tags: string[] = [];
  if (mood.includes('psychedelic')) tags.push('psicodelia pop');
  if (mood.includes('indie disco')) tags.push('indie dance');
  if (mood.includes('nostalgia')) tags.push('nostalgia líquida');
  if (mood.includes('melancolia')) tags.push('noir urbano');
  if (mood.includes('cinema noir')) tags.push('cinema noturno');
  if (mood.includes('dream')) tags.push('sonho enevoado');
  if (mood.includes('ambient')) tags.push('paisagem sonora');
  if (mood.includes('rock')) tags.push('guitarras em foco');
  if (track.bpm < 95) tags.push('pulso lento');
  else if (track.bpm <= 125) tags.push('groove médio');
  else tags.push('alta rotação');
  return [...new Set(tags)].slice(0, 4);
}
const COLORS = ['#a8c1a4', '#f0c08f', '#aec4e6', '#e6b3b0'];
const TILTS = [-3, 2, -1.5, 2.5];
export const TrackStickers: React.FC<{ track: TrackData }> = ({ track }) => <div className="pierce-stickers" aria-label="Gênero e clima da faixa">
  {tagsFor(track).map((tag, i) => <span key={tag} style={{ backgroundColor: COLORS[i % 4], transform: `rotate(${TILTS[i % 4]}deg)` }}>{tag}</span>)}
</div>;
