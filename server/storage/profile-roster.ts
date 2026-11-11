import { CharacterRoster, deserializeRoster, serializeRoster } from '../../src/features/character/character-roster';
import type { PersistentProfile } from './profiles';

/** L'oro nella colonna dell'account è autorevole; il JSON conserva tutti i personaggi. */
export function profileRoster(profile: PersistentProfile): CharacterRoster {
  const roster = profile.roster ?? new CharacterRoster();
  if (!roster.active) roster.add(profile.character);
  const index = roster.profiles.findIndex(p => p.id === roster.activeId);
  roster.profiles.splice(index, 1, { id: roster.activeId!, character: profile.character });
  roster.gold = profile.gold;
  profile.roster = roster;
  return roster;
}

/** Adotta anche il vecchio JSON singolo, senza perdere inventario, XP o record. */
export function readProfileRoster(raw: unknown, gold: number): CharacterRoster {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const roster = deserializeRoster(text ?? '');
  let data: unknown;
  try { data = JSON.parse(text ?? 'null'); }
  catch { throw new Error('Profilo sul database non valido: dati conservati, accesso sospeso.'); }
  if (!roster?.active || roster.profiles.some(p => !p.character.created)
    || (typeof data === 'object' && data !== null && 'format' in data && data.format === 'character-roster'
      && (!('activeId' in data) || data.activeId !== roster.activeId))) {
    throw new Error('Profilo sul database non valido: dati conservati, accesso sospeso.');
  }
  roster.gold = gold;
  return roster;
}

export function serializeProfileRoster(profile: PersistentProfile): string {
  return serializeRoster(profileRoster(profile));
}
