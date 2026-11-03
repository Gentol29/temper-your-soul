import type { MenuSceneFocus } from './menu-scene';

/*
 * Il rifugio del menu a pezzi: cortile vuoto piu' una struttura per volta. I pezzi sono PNG trasparenti in pixel di
 * mondo; questa tabella dice dove stanno, cosi' impaginare significa cambiare numeri e non ridipingere la scena.
 */

export type MenuModuleId = 'cathedral' | 'storage' | 'forge' | 'merchant' | 'gate' | 'wall_west' | 'wall_east';

/** Un punto che si accende nel pezzo, in pixel dello sprite. */
export interface MenuFlame {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface MenuModule {
  readonly id: MenuModuleId;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** La riga dello sprite che tocca terra: decide chi copre chi. */
  readonly base: number;
  readonly flames: readonly MenuFlame[];
  /** Il punto del rifugio che questo pezzo rappresenta per i comandi del menu. */
  readonly focus?: MenuSceneFocus;
}

export const MENU_FLOOR_URL = new URL('../../assets/art/menu/courtyard.png', import.meta.url).href;

const url = (name: string): string => new URL(`../../assets/art/menu/${name}.png`, import.meta.url).href;

export const MENU_MODULES: readonly MenuModule[] = [
  { id: 'cathedral', url: url('cathedral'), width: 264, height: 168, base: 162, focus: 'portal',
    flames: [{ x: 80, y: 108, size: 2 }, { x: 86, y: 108, size: 2 }, { x: 178, y: 106, size: 2 }, { x: 184, y: 106, size: 2 }, { x: 54, y: 124, size: 2 }] },
  { id: 'storage', url: url('storage'), width: 174, height: 208, base: 202, focus: 'storage',
    flames: [{ x: 128, y: 112, size: 3 }, { x: 138, y: 112, size: 3 }, { x: 26, y: 180, size: 4 }] },
  { id: 'forge', url: url('forge'), width: 209, height: 196, base: 190, focus: 'forge',
    flames: [{ x: 100, y: 124, size: 5 }, { x: 108, y: 128, size: 5 }, { x: 116, y: 124, size: 4 }, { x: 83, y: 100, size: 2 }, { x: 25, y: 90, size: 2 }, { x: 31, y: 90, size: 2 }] },
  { id: 'merchant', url: url('merchant'), width: 172, height: 136, base: 130, focus: 'merchant',
    flames: [{ x: 76, y: 66, size: 2 }, { x: 112, y: 66, size: 3 }, { x: 72, y: 118, size: 3 }, { x: 56, y: 104, size: 2 }] },
  { id: 'gate', url: url('gate'), width: 210, height: 149, base: 143, focus: 'gate',
    flames: [{ x: 49, y: 96, size: 5 }, { x: 159, y: 96, size: 5 }] },
  { id: 'wall_west', url: url('wall_west'), width: 180, height: 112, base: 106, flames: [] },
  { id: 'wall_east', url: url('wall_east'), width: 169, height: 182, base: 176, flames: [] },
];

/** Dove sta l'angolo alto a sinistra di un pezzo, in pixel di mondo. */
export type MenuLayout = Readonly<Record<MenuModuleId | 'hero', { readonly x: number; readonly y: number }>>;

/** La disposizione della scena scelta dall'utente. Per impaginare diversamente bastano questi numeri. */
const WIDE_LAYOUT: MenuLayout = {
  cathedral: { x: 378, y: 93 },
  storage: { x: 216, y: 93 },
  forge: { x: 629, y: 135 },
  merchant: { x: 216, y: 295 },
  gate: { x: 408, y: 376 },
  wall_west: { x: 246, y: 425 },
  wall_east: { x: 604, y: 355 },
  hero: { x: 700, y: 332 },
};

/** Telefono in verticale: gli edifici laterali si stringono attorno al portale, per restare inquadrati. */
const TALL_LAYOUT: MenuLayout = {
  ...WIDE_LAYOUT,
  storage: { x: 320, y: 130 },
  forge: { x: 540, y: 160 },
  merchant: { x: 350, y: 305 },
  hero: { x: 560, y: 332 },
};

export function menuLayoutFor(viewWidth: number, viewHeight: number): MenuLayout {
  return viewWidth / viewHeight >= 0.85 ? WIDE_LAYOUT : TALL_LAYOUT;
}
