import { ISOMETRIC, TOP_DOWN, type ViewProjection } from '../../../core/view-projection';
import type { ArenaThemeId } from '../../arena/arena';
import { classicTilesRequested } from '../themes/tiles';
import { cryptIsoArt } from './crypt-iso';
import { forgeIsoArt, glacierIsoArt, swampIsoArt } from './theme-iso';
import type { IsoThemeArt } from './iso-theme';

/**
 * I temi con la grafica isometrica. Per portare un altro dungeon nella vista isometrica basta aggiungere qui il suo tema
 * con la sua `IsoThemeArt`: tutto il resto (camera, mira, movimento, figure, effetti) segue la proiezione.
 */
export const ISO_THEME_ART: Readonly<Partial<Record<ArenaThemeId, IsoThemeArt>>> = {
  crypt: cryptIsoArt,
  swamp: swampIsoArt,
  forge: forgeIsoArt,
  glacier: glacierIsoArt,
};

/**
 * `?vista=classica` riporta ogni mappa alla vista dall'alto, per confronto (come `?tile=classici`). Anche i tile classici
 * restano dall'alto: sono disegnati per quella vista.
 */
export const classicViewRequested = typeof location !== 'undefined' && new URLSearchParams(location.search).get('vista') === 'classica';

/** La proiezione con cui si mostra una mappa del tema dato. Solo aspetto: la simulazione resta dall'alto. */
export function projectionFor(theme: ArenaThemeId): ViewProjection {
  if (classicViewRequested || classicTilesRequested) return TOP_DOWN;
  return ISO_THEME_ART[theme] !== undefined ? ISOMETRIC : TOP_DOWN;
}

/** La grafica isometrica del tema, se c'e'. */
export function isoArtFor(theme: ArenaThemeId): IsoThemeArt | undefined {
  return ISO_THEME_ART[theme];
}
