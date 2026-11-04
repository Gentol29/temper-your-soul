import type { BossSheet } from './boss-sheet';
import { BOSS_IA_SHEETS } from './boss-ia-layout';
import { forgeColossusLayout, frostWardenLayout, guardianLayout, sporeMotherLayout } from './boss-sheet-layout';

/**
 * Fogli di sprite di terzi dei boss (primo lotto grafico, 1 novembre 2026), per id della grafica (`BossDefinition.art`).
 * Valori provvisori: scala e piedi sono scelti perche' la figura copra all'incirca il cerchio di colpo. Restano per
 * confronto: si vedono aprendo il gioco con `?boss=classici`.
 */
export const CLASSIC_BOSS_SHEETS: Readonly<Record<string, BossSheet>> = {
  // Statua animata: 57 pixel di altezza a grandezza naturale, come il guardiano a matrici.
  guardian: { layout: guardianLayout, scale: 1, facesLeft: false, feetY: 25, walkFps: 9, portraitScale: 2, credits: ['oga-animated-statue'] },
  // Fiore demoniaco: non cammina, scivola nella palude con l'animazione di riposo; salta entrando in furia.
  spore_mother: { layout: sporeMotherLayout, scale: 2, facesLeft: true, feetY: 28, walkFps: 6, portraitScale: 3, credits: ['oga-demon-flower'] },
  // Golem corazzato: l'armatura si spezza in fase II e resta la roccia fusa.
  forge_colossus: { layout: forgeColossusLayout, scale: 3, facesLeft: true, feetY: 28, walkFps: 7, portraitScale: 5, credits: ['oga-enemy-galore'] },
  // Mago con la fiamma sul bastone: scivola sul ghiaccio con l'animazione di riposo.
  frost_warden: { layout: frostWardenLayout, scale: 1, facesLeft: false, feetY: 30, walkFps: 9, portraitScale: 2, credits: ['itch-evil-wizard-2'] },
};

/** I fogli fatti con il generatore locale, per boss e luogotenenti: un pixel del foglio e' un'unita' di mondo. */
const GENERATED_BOSS_SHEETS: Readonly<Record<string, BossSheet>> = Object.fromEntries(
  Object.entries(BOSS_IA_SHEETS).map(([id, sheet]) => [id, { ...sheet, scale: 1, facesLeft: false, credits: ['local-sdxl-boss'] }]),
);

const classicRequested = typeof location !== 'undefined' && new URLSearchParams(location.search).get('boss') === 'classici';

/**
 * I fogli in uso. Una figura senza foglio, o con l'immagine non ancora caricata, usa la grafica a matrici di `BOSS_ART`.
 */
export const BOSS_SHEETS: Readonly<Record<string, BossSheet>> = classicRequested ? CLASSIC_BOSS_SHEETS : GENERATED_BOSS_SHEETS;

/** Il foglio di un boss, o null se non ne ha uno. */
export function bossSheet(id: string): BossSheet | null {
  return BOSS_SHEETS[id] ?? null;
}
