import { useEffect, useState } from 'react';
import type { TrackData, TrackPalette } from '../../types';
import { fallbackPalette, getTrackPalette } from '../../services/palette/trackPalette';

/** Palette of the current track: instant hash fallback, upgraded from the cover when readable. */
export function useTrackPalette(track: Pick<TrackData, 'id' | 'coverImage'>): TrackPalette {
  const [state, setState] = useState<{ id: string; palette: TrackPalette }>(() => ({ id: track.id, palette: fallbackPalette(track) }));
  useEffect(() => {
    let cancelled = false;
    setState((s) => (s.id === track.id ? s : { id: track.id, palette: fallbackPalette(track) }));
    void getTrackPalette(track).then((palette) => {
      if (!cancelled) setState({ id: track.id, palette });
    });
    return () => { cancelled = true; };
  }, [track.id, track.coverImage]);
  return state.id === track.id ? state.palette : fallbackPalette(track);
}
