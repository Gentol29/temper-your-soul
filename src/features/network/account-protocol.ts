import type { EquipmentSlot } from '../items/equipment-slot';
import type { CharacterClass } from '../character/character-class';
import type { BodyType } from '../character/appearance';
export type CharacterCommand =
  | { kind: 'equip'; uid: string } | { kind: 'unequip'; slot: EquipmentSlot }
  | { kind: 'discard'; uid: string }
  | { kind: 'buy' | 'craft'; slot: number } | { kind: 'upgrade'; uid: string }
  | { kind: 'deposit'; uid: string; target?: number } | { kind: 'withdraw'; uid: string }
  | { kind: 'move_storage'; uid: string; target: number };
export interface LoginMessage {
  type: 'login'; protocol: number; token: string;
  name: string; characterClass: CharacterClass; body: BodyType;
}
export interface ProfileMessage { type: 'profile'; character: string; gold: number; revision: number }
