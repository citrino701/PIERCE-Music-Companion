import React from 'react';
import { TrackData } from '../types';

const COLORS = ['#a8c1a4', '#f0c08f', '#aec4e6', '#e6b3b0'];
const TILTS = [-3, 2, -1.5, 2.5];

function climateFromGenres(genres: string[]): string[] {
  const normalized = genres.map((genre) => genre.toLowerCase());
  const tags: string[] = [];
  const has = (...terms: string[]) => normalized.some((genre) => terms.some((term) => genre.includes(term)));

  if (has('shoegaze', 'dream pop', 'dream-pop', 'ethereal')) tags.push('◐ atmosfera etérea');
  if (has('indie dance', 'dance punk', 'nu disco', 'disco')) tags.push('✳ pista alternativa');
  if (has('psychedelic', 'psych rock', 'neo-psychedelia')) tags.push('✦ psicodelia');
  if (has('ambient', 'drone', 'new age')) tags.push('◌ contemplativo');
  if (has('metal', 'hardcore', 'punk')) tags.push('⚡ intensidade');
  if (has('jazz', 'bossa nova', 'soul', 'r&b')) tags.push('〰 groove orgânico');
  if (has('folk', 'acoustic', 'singer-songwriter')) tags.push('⌁ intimista');
  if (has('techno', 'house', 'trance', 'electronic')) tags.push('◉ eletrônico');
  if (has('dream pop', 'shoegaze', 'post-rock', 'sad', 'emo')) tags.push('☾ melancolia');

  return tags;
}

export const TrackStickers: React.FC<{ track: TrackData }> = ({ track }) => {
  const genres = [...new Set((track.genres ?? []).map((genre) => genre.trim()).filter(Boolean))];
  const labels = [...genres.slice(0, 3), ...climateFromGenres(genres).slice(0, 2)].slice(0, 5);

  if (labels.length === 0) {
    return <div className="pierce-stickers" aria-label="Gênero indisponível">
      <span className="pierce-sticker-unavailable">gênero não informado pelo Spotify</span>
    </div>;
  }

  return <div className="pierce-stickers" aria-label="Gêneros e clima da faixa">
    {labels.map((tag, i) => <span key={tag} style={{ backgroundColor: COLORS[i % COLORS.length], transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}>{tag}</span>)}
  </div>;
};
