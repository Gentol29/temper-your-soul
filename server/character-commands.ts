import type { PersistentProfile } from './storage/profiles';
import { CharacterRoster } from '../src/features/character/character-roster';
import { acquireBasic, upgradeItem } from '../src/features/character/hub-services';
import { depositItem, withdrawItem, moveStorageItem } from '../src/features/character/character-storage';
import { EQUIPMENT_SLOTS } from '../src/features/items/equipment-slot';

/** Input esterno: soltanto intenzioni; nessun inventario o saldo inviato dal browser. */
export function applyCharacterCommand(profile: PersistentProfile, raw: unknown): void {
  if (!raw || typeof raw !== 'object') throw new Error('Operazione non valida.');
  const m = raw as Record<string, unknown>, c = profile.character;
  const uid = typeof m.uid === 'string' && m.uid.length <= 160 ? m.uid : '';
  const roster = new CharacterRoster(); roster.gold = profile.gold;
  const target = m.target === undefined ? undefined : typeof m.target === 'number' && Number.isInteger(m.target) ? m.target : -1;
  let changed = false;
  switch (m.kind) {
    case 'equip': changed = c.equip(uid); break;
    case 'unequip': if (EQUIPMENT_SLOTS.some(slot => slot === m.slot)) { c.unequip(m.slot as typeof EQUIPMENT_SLOTS[number]); changed = true; } break;
    case 'discard': changed = c.discard(uid); break;
    case 'buy': case 'craft': if (typeof m.slot === 'number' && Number.isInteger(m.slot)) changed = acquireBasic(roster, c, m.slot, m.kind === 'craft'); break;
    case 'upgrade': changed = upgradeItem(roster, c, uid); break;
    case 'deposit': changed = depositItem(c, uid, target); break;
    case 'withdraw': changed = withdrawItem(c, uid); break;
    case 'move_storage': if (target !== undefined) changed = moveStorageItem(c, uid, target); break;
  }
  if (!changed) throw new Error('Operazione non consentita o risorse insufficienti.');
  profile.gold = roster.gold;
}
