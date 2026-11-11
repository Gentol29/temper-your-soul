import type { CharacterAppearance } from '../character/appearance';
import { ITEM_CLASSES } from '../items/item-classes';
import archerManifest from '../../assets/characters/archer-male-pixellab/manifest.json';

/** Gli altri corpi conservano il renderer esistente durante la migrazione. */
export function usesNativeCharacterDirections(appearance: CharacterAppearance): boolean {
  const kind = appearance.characterClass ?? ITEM_CLASSES[appearance.equipment.primary_hand?.familyId ?? '']
    ?? ITEM_CLASSES[appearance.equipment.armor?.familyId ?? ''] ?? 'warrior';
  return appearance.body === 'male' && kind === 'archer';
}

/** Un segno negativo specchierebbe anche le mani: le viste PixelLab sono già complete. */
export function characterRenderFacing(appearance: CharacterAppearance, legacyFacing: 1 | -1): 1 | -1 {
  return usesNativeCharacterDirections(appearance) ? 1 : legacyFacing;
}

/** Appoggio misurato sui frame PixelLab; il punto del mondo resta quello del renderer esistente. */
export function characterFeetY(appearance: CharacterAppearance): number {
  return usesNativeCharacterDirections(appearance) ? archerManifest.pivot[1] : 53;
}
