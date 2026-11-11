import type { EquipmentSlot } from '../items/equipment-slot';
import type { CharacterClass } from '../character/character-class';
import type { BodyType } from '../character/appearance';
export type CharacterCommand =
  | { kind: 'equip'; uid: string } | { kind: 'unequip'; slot: EquipmentSlot }
  | { kind: 'discard'; uid: string }
  | { kind: 'buy' | 'craft'; slot: number } | { kind: 'upgrade'; uid: string }
  | { kind: 'deposit'; uid: string; target?: number } | { kind: 'withdraw'; uid: string }
  | { kind: 'move_storage'; uid: string; target: number };
/** Le scelte della creazione: nome, classe e sesso restano fissi. */
export interface CharacterSeed { name: string; characterClass: CharacterClass; body: BodyType }
/**
 * Prima si accede con il solo token per leggere la raccolta privata. Poi si invia `characterId`
 * per scegliere un proprio personaggio, oppure `creation` per aggiungerne uno nuovo.
 */
export interface LoginMessage {
  type: 'login'; protocol: number; token: string;
  creation?: CharacterSeed;
  characterId?: string;
}
/** Account verificato: apre sempre la scelta; con raccolta vuota propone la creazione. */
export interface CharacterRequiredMessage { type: 'character_required'; roster?: string }
export interface ProfileMessage { type: 'profile'; characterId?: string; character: string; gold: number; revision: number }
