import { ISOMETRIC, type ViewProjection } from '../../../core/view-projection';
import type { ArenaThemeId } from '../../arena/arena';
import { cryptIsoArt } from './crypt-iso';
import { forgeIsoArt, glacierIsoArt, swampIsoArt } from './theme-iso';
import type { IsoThemeArt } from './iso-theme';

/**
 * La grafica isometrica di ogni tema: tutti i dungeon si vedono in isometria 2:1. Un tema nuovo deve averne una (il tipo
 * lo impone); tutto il resto (camera, mira, movimento, figure, effetti) segue la proiezione.
 */
export const ISO_THEME_ART: Readonly<Record<ArenaThemeId, IsoThemeArt>> = {
  crypt: cryptIsoArt,
  swamp: swampIsoArt,
  forge: forgeIsoArt,
  glacier: glacierIsoArt,
};

/** La proiezione con cui si mostra una mappa: sempre l'isometria. Solo aspetto: la simulazione resta dall'alto. */
export function projectionFor(_theme: ArenaThemeId): ViewProjection {
  return ISOMETRIC;
}

/** La grafica isometrica del tema. */
export function isoArtFor(theme: ArenaThemeId): IsoThemeArt {
  return ISO_THEME_ART[theme];
}
