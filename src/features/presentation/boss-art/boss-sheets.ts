import type { BossSheet } from './boss-sheet';
import { BOSS_IA_SHEETS } from './boss-ia-layout';

/** I fogli fatti con il generatore locale, per boss e luogotenenti: un pixel del foglio e' un'unita' di mondo. */
const GENERATED_BOSS_SHEETS: Readonly<Record<string, BossSheet>> = Object.fromEntries(
  Object.entries(BOSS_IA_SHEETS).map(([id, sheet]) => [id, { ...sheet, scale: 1, facesLeft: false, credits: ['local-sdxl-boss'] }]),
);

/**
 * I fogli in uso. Una figura senza foglio, o con l'immagine non ancora caricata, usa la grafica a matrici di `BOSS_ART`.
 */
export const BOSS_SHEETS: Readonly<Record<string, BossSheet>> = GENERATED_BOSS_SHEETS;

/** Il foglio di un boss, o null se non ne ha uno. */
export function bossSheet(id: string): BossSheet | null {
  return BOSS_SHEETS[id] ?? null;
}
