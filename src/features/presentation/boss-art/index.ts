import type { BossArt } from './boss-art';
import { FORGE_COLOSSUS_ART } from './forge-colossus';
import { FROST_WARDEN_ART } from './frost-warden';
import { GUARDIAN_ART } from './guardian';
import { ANVIL_MASTER_ART, BELFRY_GARGOYLE_ART, FIRST_APPRENTICE_ART, TOAD_KING_ART } from './lieutenants';
import { SPORE_MOTHER_ART } from './spore-mother';
import {
  ASTRONOMER_ART,
  COLONY_QUEEN_ART,
  ELDER_WASHER_ART,
  GRAND_GRAVEDIGGER_ART,
  HOLLOW_CHAMPION_ART,
  IRON_FOREMAN_ART,
  MOTHER_BEAR_ART,
  ORGAN_MASTER_ART,
} from './vein-lieutenants';

export type { BossArt } from './boss-art';
export type { BossSheet, SheetFrame, SheetState } from './boss-sheet';
export { DEATH_ANIMATION_SHARE, sheetFrame } from './boss-sheet';
export { BOSS_SHEETS, bossSheet } from './boss-sheets';

/** La grafica dei boss, per id (`BossDefinition.art`). */
export const BOSS_ART: Readonly<Record<string, BossArt>> = {
  guardian: GUARDIAN_ART,
  spore_mother: SPORE_MOTHER_ART,
  forge_colossus: FORGE_COLOSSUS_ART,
  frost_warden: FROST_WARDEN_ART,
  // I luogotenenti della discesa.
  belfry_gargoyle: BELFRY_GARGOYLE_ART,
  toad_king: TOAD_KING_ART,
  anvil_master: ANVIL_MASTER_ART,
  first_apprentice: FIRST_APPRENTICE_ART,
  // I luogotenenti delle vene B e C.
  grand_gravedigger: GRAND_GRAVEDIGGER_ART,
  organ_master: ORGAN_MASTER_ART,
  elder_washer: ELDER_WASHER_ART,
  colony_queen: COLONY_QUEEN_ART,
  hollow_champion: HOLLOW_CHAMPION_ART,
  iron_foreman: IRON_FOREMAN_ART,
  mother_bear: MOTHER_BEAR_ART,
  astronomer: ASTRONOMER_ART,
};

/** La grafica di un boss; se l'id e' sconosciuto usa quella del guardiano (un test controlla che i dati non ne usino). */
export function bossArt(id: string): BossArt {
  return BOSS_ART[id] ?? GUARDIAN_ART;
}
