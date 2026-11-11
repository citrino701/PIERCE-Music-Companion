export interface VidroMetrics { cover: number; lyricFont: number; lyricPanel: number; wide: boolean; column: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Sizes for the glass view. Tall windows stack everything (cover on top, lyrics under it); wide windows put the cover
 * on the left, as big as the height allows, and everything else in a column on the right.
 */
export function vidroMetrics(w: number, h: number, lyricScale = 1): VidroMetrics {
  const wide = w / h >= 1.3 && w >= 760;
  const scale = clamp(lyricScale, 0.8, 1.4);
  if (wide) {
    const cover = clamp(Math.min(w * 0.44, h - 110), 200, 760);
    const column = Math.max(280, w - cover - 200); // cover frame (~2x16) + gap 56 + side padding 2x48
    return { cover: Math.round(cover), column: Math.round(column), wide, lyricPanel: clamp(h * 0.26, 110, 230), lyricFont: Math.round(clamp(column * 0.06, 20, 44) * scale) };
  }
  const lyricPanel = clamp(h * 0.2, 96, 190);
  const fixed = 28 + 34 + 62 + lyricPanel + 34 + 92 + 70; // header, prev line, caption, lyric panel, next line, dock, gaps
  const cover = clamp(Math.min(w * 0.62, h - fixed), 110, 640);
  return { cover: Math.round(cover), column: Math.round(w - 40), wide, lyricPanel: Math.round(lyricPanel), lyricFont: Math.round(clamp(w * 0.042, 17, 44) * scale) };
}
