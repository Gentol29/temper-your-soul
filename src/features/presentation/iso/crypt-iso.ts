import { faceSpots, wallSpots } from '../themes/decor';
import { CRYPT_TORCHES, cryptIsoGroundVersion, drawCryptRuneLights, drawCryptTorch, paintCryptIsoGround } from '../themes/crypt';
import { drawIsoBackWalls, drawIsoFrontEdges, drawIsoPillars, drawIsoScatter, sconceAnchor } from './iso-scenery';
import { drawIsoBlocks, drawIsoHazards } from './iso-hazards';
import type { IsoArtFrame, IsoThemeArt } from './iso-theme';

/** Le applique sui due muri di fondo: dove le mette la Cripta dall'alto in alto, e con lo stesso passo a sinistra. */
function drawSconces(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void {
  const { arena, camera, clock } = frame;
  const t = arena.wallThickness;
  const spacing = CRYPT_TORCHES.sconceSpacing;
  const put = (wall: 'ne' | 'nw', along: number): void => {
    const at = sconceAnchor(wall, t, along);
    if (at.x < camera.position.x - 220 || at.x > camera.position.x + camera.width + 220 || at.y < camera.position.y - 220 || at.y > camera.position.y + camera.height + 260) return;
    ctx.save();
    ctx.translate(at.x - along, at.y);
    drawCryptTorch(ctx, along, 0, clock, true);
    ctx.restore();
  };
  for (const spot of faceSpots(arena, 0, spacing)) put('ne', spot.x);
  for (let b = t + spacing / 2; b < arena.height - t - spacing / 3; b += spacing) put('nw', b);
}

/** Le torce in piedi vicino ai bordi davanti (a sinistra ci sono le applique del muro di fondo). */
function drawStandingTorches(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void {
  const { arena, view, camera, clock } = frame;
  const { inset, spacing } = CRYPT_TORCHES;
  for (const spot of wallSpots(arena, inset, spacing, 20, false)) {
    if (spot.x === inset) continue;
    if (!camera.isVisible(spot, 120)) continue;
    // La base della torcia sta 10 pixel sotto il suo punto: alzata di tanto, poggia sul punto proiettato.
    view.at(ctx, spot.x, spot.y, 10, () => drawCryptTorch(ctx, spot.x, spot.y, clock, false));
  }
}

/** La Cripta in isometria: i fogli della Cripta (lastre, tappeto, facciate gotiche, statue) disposti nella vista 2:1. */
export const cryptIsoArt: IsoThemeArt = {
  void: '#05070c',
  paintGround: paintCryptIsoGround,
  groundVersion: cryptIsoGroundVersion,
  drawBackdrop(ctx, frame) {
    drawIsoBackWalls(ctx, frame, 'crypt');
    drawSconces(ctx, frame);
    drawCryptRuneLights(ctx, frame.arena, frame.clock, (x, y, draw) => frame.view.at(ctx, x, y, 0, draw));
  },
  drawHazards(ctx, frame) {
    drawIsoHazards(ctx, frame, 'crypt');
  },
  drawDecor(ctx, frame) {
    drawIsoScatter(ctx, frame, 'crypt');
    drawStandingTorches(ctx, frame);
  },
  drawOccluders(ctx, frame) {
    return [...drawIsoPillars(ctx, frame, 'crypt'), ...drawIsoBlocks(ctx, frame, 'crypt')];
  },
  drawForeground(ctx, frame) {
    drawIsoFrontEdges(ctx, frame, 'crypt');
  },
};
