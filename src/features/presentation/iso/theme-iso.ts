import type { Camera } from '../../../core/camera';
import type { ArenaDefinition, ArenaThemeId } from '../../arena/arena';
import { drawForgeIsoDetails, paintForgeIsoGround } from '../themes/forge';
import { drawGlacierIsoDetails, paintGlacierIsoGround } from '../themes/glacier';
import { floorVersion } from '../themes/scenery';
import { drawSwampIsoDetails, paintSwampIsoGround } from '../themes/swamp';
import { drawIsoBlocks, drawIsoHazards } from './iso-hazards';
import { drawIsoBackWalls, drawIsoFrontEdges, drawIsoPillars, drawIsoScatter } from './iso-scenery';
import type { IsoArtFrame, IsoThemeArt } from './iso-theme';

/** Cio' che un tema deve dare per la vista isometrica; il resto (muri, colonne, porte, massicci, pozzi) viene dai suoi fogli. */
interface ThemeIsoParts {
  readonly theme: ArenaThemeId;
  readonly void: string;
  /** Il pavimento piatto visto dall'alto, senza muri ne' arredi in piedi. */
  readonly paintGround: (ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera) => void;
  /** I dettagli propri del tema (luci dei muri, cio' che si muove a terra, arredi animati), sotto le figure. */
  readonly details: (ctx: CanvasRenderingContext2D, frame: IsoArtFrame) => void;
}

/** La grafica isometrica di un tema dai suoi fogli, con le parti proprie del tema. */
export function themeIsoArt(parts: ThemeIsoParts): IsoThemeArt {
  const { theme } = parts;
  return {
    void: parts.void,
    paintGround: parts.paintGround,
    groundVersion: () => `${floorVersion(theme)}|iso`,
    drawBackdrop: (ctx, frame) => drawIsoBackWalls(ctx, frame, theme),
    drawHazards: (ctx, frame) => drawIsoHazards(ctx, frame, theme),
    drawDecor: (ctx, frame) => {
      drawIsoScatter(ctx, frame, theme);
      parts.details(ctx, frame);
    },
    drawOccluders: (ctx, frame) => [...drawIsoPillars(ctx, frame, theme), ...drawIsoBlocks(ctx, frame, theme)],
    drawForeground: (ctx, frame) => drawIsoFrontEdges(ctx, frame, theme),
  };
}

/** Palude, Fucina e Ghiacciaio in isometria: stessi fogli, stesse collisioni. */
export const swampIsoArt = themeIsoArt({ theme: 'swamp', void: '#070d0b', paintGround: paintSwampIsoGround, details: drawSwampIsoDetails });
export const forgeIsoArt = themeIsoArt({ theme: 'forge', void: '#0c0908', paintGround: paintForgeIsoGround, details: drawForgeIsoDetails });
export const glacierIsoArt = themeIsoArt({ theme: 'glacier', void: '#0b1c2e', paintGround: paintGlacierIsoGround, details: drawGlacierIsoDetails });
