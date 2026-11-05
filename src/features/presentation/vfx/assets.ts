import { drawFrameVfx, frameSheetReady, preloadFrameSheets } from './frame-sheets';

/** Gli effetti delle skill delle tre classi: ognuno ha il suo foglio a fotogrammi (`frame-sheets.ts`). */
export const VFX_IDS = ['warrior-cleave', 'warrior-guard', 'warrior-fortify', 'warrior-rush',
  'mage-fireball', 'mage-water-orb', 'mage-earth-wisp', 'mage-wind-orb', 'mage-fire-explosion',
  'mage-water-explosion', 'mage-earth-aura', 'mage-blink', 'archer-arrow', 'archer-predator', 'archer-summon', 'archer-dash', 'archer-release'] as const;
export type VfxId = typeof VFX_IDS[number];

/** Disegna l'effetto; falso se il foglio non e' ancora caricato (chi chiama usa allora il disegno di ripiego). */
export function drawVfx(ctx: CanvasRenderingContext2D, id: VfxId, x: number, y: number,
  width: number, time: number, angle = 0, alpha = 1, duration?: number): boolean {
  return drawFrameVfx(ctx, id, x, y, width, time, angle, alpha, duration);
}

/** I fogli sono piccoli e locali: si caricano subito, prima del primo lancio. */
preloadFrameSheets(VFX_IDS);

export function isVfxReady(id: VfxId): boolean {
  return frameSheetReady(id);
}
