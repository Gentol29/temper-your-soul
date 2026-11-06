import { ARCHER_FRAMES, ARCHER_OUTLINE, ARCHER_SYMBOLS, ARCHER_VOID } from './archer-sprite-data';
import { ARCHER_RAMPS, WARRIOR_RAMPS, archerWorn, warriorWorn, type ArcherLookMaterial, type WarriorLookMaterial } from './hero-looks';
import type { HeroSpec } from './hero-sprite';
import { WARRIOR_FRAMES, WARRIOR_OUTLINE, WARRIOR_SYMBOLS, WARRIOR_VOID } from './warrior-sprite-data';

/** Guerriero e Arciere resi in 3D: dati generati (`*-sprite-data.ts`) e colori (`hero-looks.ts`). Solo aspetto. */
export const WARRIOR_SPEC: HeroSpec<WarriorLookMaterial> = {
  kind: 'warrior', frames: WARRIOR_FRAMES, symbols: WARRIOR_SYMBOLS, outline: WARRIOR_OUTLINE, voidSymbol: WARRIOR_VOID,
  ramps: WARRIOR_RAMPS, worn: warriorWorn,
};

export const ARCHER_SPEC: HeroSpec<ArcherLookMaterial> = {
  kind: 'archer', frames: ARCHER_FRAMES, symbols: ARCHER_SYMBOLS, outline: ARCHER_OUTLINE, voidSymbol: ARCHER_VOID,
  ramps: ARCHER_RAMPS, worn: archerWorn,
};
