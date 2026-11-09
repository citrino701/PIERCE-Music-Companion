import type React from 'react';
import { ColagemStage } from '../ColagemStage';
import type { StageViewProps } from './types';

export interface StageViewDef {
  /** Stored in the prefs (`viewId`); never rename it once released. */
  id: string;
  label: string;
  description: string;
  Component: React.ComponentType<StageViewProps>;
}

/**
 * Visualisations the Fullscreen mode can show. To add a completely different one, create its component
 * (it receives StageViewProps), append an entry here, and it shows up in the "Elementos" menu.
 * See docs/visualizacoes.md.
 */
export const STAGE_VIEWS: StageViewDef[] = [
  { id: 'colagem', label: 'Colagem', description: 'Bagunça 3: título, capa viva, letra, bolinhas e ASCII.', Component: ColagemStage },
];

export const DEFAULT_VIEW_ID = STAGE_VIEWS[0].id;

export function getStageView(id: string): StageViewDef {
  return STAGE_VIEWS.find((v) => v.id === id) ?? STAGE_VIEWS[0];
}
