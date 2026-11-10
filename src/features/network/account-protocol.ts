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
 * Prima si accede con il solo token. `creation` si aggiunge soltanto dopo che il server ha risposto
 * `character_required`: l'account e' gia' verificato e non ha ancora un personaggio.
 */
export interface LoginMessage {
  type: 'login'; protocol: number; token: string;
  creation?: CharacterSeed;
}
/** L'account e' valido ma non ha un personaggio: il client apre la creazione e accede di nuovo con `creation`. */
export interface CharacterRequiredMessage { type: 'character_required' }
export interface ProfileMessage { type: 'profile'; character: string; gold: number; revision: number }
