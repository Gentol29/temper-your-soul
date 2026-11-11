import type { CharacterRoster } from '../character/character-roster';
import { deserializeCharacter } from '../character/save-format';
import type { ProfileMessage } from './account-protocol';

/** Aggiorna il personaggio scelto senza sostituire gli altri o cambiare i loro identificatori. */
export function applyAccountProfile(roster: CharacterRoster, profile: ProfileMessage): boolean {
  const character = deserializeCharacter(profile.character);
  if (!character?.created) return false;
  const id = profile.characterId ?? roster.activeId ?? 'c1';
  const existing = roster.profiles.find(p => p.id === id);
  if (existing) Object.assign(existing.character, character);
  else roster.profiles.push({ id, character });
  roster.select(id);
  roster.gold = profile.gold;
  return true;
}
