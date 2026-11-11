/*
 * Le viste rese dei personaggi in 3D (Mago, Arciere, Guerriero): cinque, le altre tre sono le stesse specchiate,
 * come il resto della figura quando si guarda a sinistra. Solo aspetto.
 */

export const SPRITE_VIEWS = ['S', 'SE', 'E', 'NE', 'N'] as const;
export type SpriteView = (typeof SPRITE_VIEWS)[number];

/** Una direzione sullo schermo (x a destra, y in basso). */
export interface ScreenHeading { readonly x: number; readonly y: number }

/** La direzione predefinita: tre quarti verso destra e verso chi guarda, come la vista SE. */
export const DEFAULT_HEADING: ScreenHeading = { x: 1, y: 1 };

/** La vista da mostrare per una mira sullo schermo (dx, dy): la figura si specchia gia' per il segno di dx. */
export function spriteViewFromAim(dx: number, dy: number): SpriteView {
  const degrees = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
  if (degrees > 67.5) return 'S';
  if (degrees > 22.5) return 'SE';
  if (degrees > -22.5) return 'E';
  return degrees > -67.5 ? 'NE' : 'N';
}

/** Lo specchio della figura per una direzione: verso sinistra si specchia, in verticale si tiene il verso precedente. */
export function spriteFacing(heading: ScreenHeading, previous = 1): 1 | -1 {
  if (heading.x < 0) return -1;
  if (heading.x > 0) return 1;
  return previous < 0 ? -1 : 1;
}

/** Otto viste autonome: il personaggio non viene specchiato, così le mani restano anatomiche. */
export const NATIVE_SPRITE_VIEWS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const;
export type NativeSpriteView = (typeof NATIVE_SPRITE_VIEWS)[number];
export function nativeSpriteViewFromAim(dx: number, dy: number): NativeSpriteView {
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return NATIVE_SPRITE_VIEWS[(sector + 8) % 8]!;
}
