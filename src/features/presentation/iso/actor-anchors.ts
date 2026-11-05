import type { Boss } from '../../boss/boss';
import type { Minion } from '../../minions/minion';
import { bossArt } from '../boss-art';
import { minionArt } from '../minion-art';
import type { ViewBox } from './occluders';

/*
 * Dove poggiano i piedi delle figure. Dall'alto il punto di gioco P e' disegnato all'altezza del corpo e i piedi stanno
 * piu' in basso sullo schermo; in isometria i piedi (e l'ombra) vanno sul punto proiettato di P, il centro del cerchio di
 * collisione: si alza tutto il disegno della figura di quanti pixel stavano sotto P i suoi piedi.
 */

/** I piedi del personaggio sotto il punto di gioco (lo stesso 14 di `themes/wall.ts` e di `HUB_ACTOR_FEET_OFFSET`). */
export const PLAYER_FEET = 14;

/** I piedi di un boss o luogotenente: l'ombra della sua grafica, che sta proprio sotto i piedi del foglio. */
export function bossFeet(boss: Boss): number {
  return Math.round(bossArt(boss.definition.art).shadow.offsetY);
}

/** I piedi di un servitore: la sua ombra, a meta' altezza del disegno meno due pixel. */
export function minionFeet(minion: Minion): number {
  const art = minionArt(minion.definition.visual);
  return Math.round((art.frames[0]!.length * art.scale) / 2 - 2);
}

/** Misure del disegno di un servitore (pixel), per l'ingombro nella vista. */
export function minionSize(minion: Minion): { readonly width: number; readonly height: number } {
  const art = minionArt(minion.definition.visual);
  const frame = art.frames[0]!;
  return { width: (frame[0]?.length ?? 8) * art.scale, height: frame.length * art.scale };
}

/** L'ingombro nella vista di una figura larga `width` e alta `height` con i piedi nel punto (`x`, `y`) della vista, con margine. */
export function figureBox(x: number, y: number, width: number, height: number, pad = 4): ViewBox {
  return { x: Math.floor(x - width / 2 - pad), y: Math.floor(y - height - pad), width: Math.ceil(width + pad * 2), height: Math.ceil(height + pad * 2) };
}
