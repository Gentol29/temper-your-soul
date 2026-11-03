import { shadowItemIcon } from './shadow-item-icons';
import { SHADOW_EQUIPMENT } from './shadow-equipment';
import type { Palette, SpriteFrame } from './sprites';

export interface ItemSprite {
  readonly size?: number;
  readonly image?: string;
  readonly pixels: SpriteFrame;
  readonly palette: Palette;
}

// Disegni originali a 16×16: stessa identità a ogni rarità, senza asset remoti.
function art(rows: readonly string[], main: string, light: string, accent: string): ItemSprite {
  return {
    pixels: [...rows.map((row) => row.padEnd(16, '.')), ...Array<string>(16 - rows.length).fill('.'.repeat(16))],
    palette: { o: '#171521', s: '#554352', m: main, h: light, a: accent, g: '#e5bc73', w: '#f3eee1' },
  };
}

export const BACKPACK_SPRITE = art([
  '......oooo', '.....oggggo', '....og....go', '....oooooooo', '...oommmmmmoo',
  '..osmhmmmmhmso', '..osmhgggghmso', '..osmmgoogmmso', '..osmmgoogmmso',
  '..osmmmmmmmmso', '..osmoooooomso', '..osmoggggomso', '..osmommmmomso',
  '...osmmmmmmso', '....oooooooo',
], '#93623e', '#ce9860', '#88bbb0');

/** Nuove icone Hi-bit coerenti con le 25 famiglie indossate; nessun PNG esterno sostituisce la matrice. */
export const ITEM_SPRITES: Readonly<Record<string, ItemSprite>> = Object.fromEntries(
  Object.keys(SHADOW_EQUIPMENT).map(id=>[id,shadowItemIcon(id)]),
);
