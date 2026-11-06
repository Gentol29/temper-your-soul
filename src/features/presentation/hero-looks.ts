import { accentRamp, mixed, rampOf, tinted, type HeroWorn } from './hero-sprite';

/*
 * Colori di Guerriero e Arciere resi in 3D: rampe predefinite a sei toni (ombra -> luce) senza oggetto nello slot,
 * e quali rampe cambiano armatura e stivali. Solo aspetto; valori provvisori.
 */

const CRIMSON = ['#2c060c', '#480a10', '#6c1016', '#8e1a1c', '#ae2a24', '#cc4430'] as const;
const TRIM = ['#33261a', '#4f3b24', '#715832', '#927643', '#ae9255', '#c4a868'] as const;
const BELT = ['#1c1410', '#2c2018', '#402e22', '#58402e', '#70543c', '#8c6c4e'] as const;
const SKIN = ['#3f2d28', '#63483f', '#8a6452', '#ae7d69', '#c69b81', '#dcbb9f'] as const;
const BOOT = ['#121014', '#1e1a20', '#2e282e', '#423a40', '#584e54', '#70666a'] as const;
const LEG = ['#0f0e12', '#17151a', '#211f26', '#2d2a32', '#3a373f', '#48454e'] as const;

export type WarriorLookMaterial = 'piastra' | 'maglia' | 'tabarro' | 'rifinitura' | 'cintura' | 'pelle' | 'capelli' | 'stivale' | 'gamba' | 'mantello';
export type ArcherLookMaterial = 'cuoio' | 'mantello' | 'sciarpa' | 'rifinitura' | 'cintura' | 'pelle' | 'capelli' | 'stivale' | 'gamba';

export const WARRIOR_RAMPS: Readonly<Record<WarriorLookMaterial, readonly string[]>> = {
  piastra: ['#18181e', '#24242c', '#34343e', '#484853', '#60606b', '#7e7e88'],
  maglia: ['#131317', '#1c1c22', '#28282f', '#36363d', '#46464d', '#58585f'],
  tabarro: CRIMSON, rifinitura: TRIM, cintura: BELT, pelle: SKIN,
  capelli: ['#1f1614', '#2e211d', '#433029', '#5a4137', '#715246', '#8a6555'],
  stivale: BOOT, gamba: LEG,
  // Mantello corto: cremisi spento quasi carbone, perche' di spalle non diventi una lastra rossa.
  mantello: ['#110a0d', '#1a0e13', '#25131a', '#311820', '#3e1d27', '#4c2430'],
};

export const ARCHER_RAMPS: Readonly<Record<ArcherLookMaterial, readonly string[]>> = {
  cuoio: ['#1c1410', '#2a1e17', '#3c2b20', '#523b2b', '#6a4d38', '#836148'],
  mantello: ['#111412', '#1a1e1b', '#252a26', '#323832', '#424840', '#555b51'],
  sciarpa: CRIMSON, rifinitura: TRIM, cintura: BELT, pelle: SKIN,
  capelli: ['#2a1610', '#40231a', '#5a3324', '#74442f', '#8e573b', '#a86c4a'],
  stivale: BOOT, gamba: LEG,
};

/** Il Guerriero: l'armatura ricolora piastre, maglia, tabarro, mantello e rifiniture; gli stivali ricolorano gli stivali. */
export function warriorWorn({ armor, boots, armorTrim }: HeroWorn): Partial<Record<WarriorLookMaterial, readonly string[]>> {
  return {
    ...(armor ? { piastra: rampOf(armor), maglia: rampOf({ shade: armor.shade, base: armor.shade, edge: armor.base }), tabarro: accentRamp(armor.accent), rifinitura: accentRamp(armorTrim ?? armor.edge),
      mantello: rampOf({ shade: tinted(armor.shade, 0.7), base: armor.shade, edge: mixed(armor.shade, armor.base) }) } : {}),
    ...(boots ? { stivale: rampOf(boots) } : {}),
  };
}

/** L'Arciere: l'armatura ricolora cuoio, mantello, sciarpa e rifiniture; gli stivali ricolorano gli stivali. */
export function archerWorn({ armor, boots, armorTrim }: HeroWorn): Partial<Record<ArcherLookMaterial, readonly string[]>> {
  return {
    ...(armor ? { cuoio: rampOf(armor), mantello: rampOf({ shade: armor.shade, base: armor.shade, edge: armor.base }), sciarpa: accentRamp(armor.accent), rifinitura: accentRamp(armorTrim ?? armor.edge) } : {}),
    ...(boots ? { stivale: rampOf(boots) } : {}),
  };
}
