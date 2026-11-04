/** Lo sprite condiviso viene disegnato con i piedi 14 px sotto l'ancora del corpo. */
export const HUB_ACTOR_FEET_OFFSET = 14;

/** Evita che il browser stiri l'ultimo pixel del canvas per riempire una dimensione dispari. */
export function hubCanvasDisplay(width: number, height: number, scale: number): { readonly width: number; readonly height: number } {
  return { width: width * scale, height: height * scale };
}

/** Testi e prompt finiscono sulla griglia fisica dello schermo, senza trasformazioni frazionarie. */
export function snapHubLabel(value: number, pixelRatio: number): number {
  const ratio = pixelRatio > 0 && Number.isFinite(pixelRatio) ? pixelRatio : 1;
  return Math.round(value * ratio) / ratio;
}
