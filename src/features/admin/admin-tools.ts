import type { Character } from '../character/character';
import type { CharacterClass } from '../character/character-class';
import { GEAR_SCORE } from '../items/gear-score';
import type { Item } from '../items/item';
import { ITEM_FAMILIES } from '../items/item-families';
import type { Rarity } from '../items/rarity';
import { VEIN_MINIONS } from '../minions/minion-catalog';
import { LIEUTENANTS } from '../run/lieutenants';
import { VEIN_LIEUTENANTS } from '../run/vein-lieutenants';

/**
 * Strumenti di amministrazione per la fase di sviluppo: visibili a tutti finché questo valore resta vero.
 * Provvisorio: da spegnere (o legare a un ruolo) prima di una versione pubblica.
 */
export const ADMIN_TOOLS_ENABLED = true;

/** Famiglie equipaggiabili da una classe, nell'ordine del catalogo. */
export function classFamilyIds(kind: CharacterClass): string[] {
  return ITEM_FAMILIES.filter((family) => family.characterClass === kind).map((family) => family.id);
}

/**
 * Aggiunge allo zaino un pezzo di ogni famiglia della classe del personaggio, alla rarità scelta e al livello
 * massimo. Le famiglie già possedute a quella rarità non si duplicano. Restituisce gli oggetti aggiunti.
 */
export function grantClassItems(character: Character, rarity: Rarity): Item[] {
  if (character.characterClass === null) return [];
  const owned = new Set([...character.inventory, ...character.storage].filter((item) => item.rarity === rarity).map((item) => item.familyId));
  const missing = classFamilyIds(character.characterClass).filter((id) => !owned.has(id));
  return character.addRolls(missing.map((familyId) => ({ familyId, rarity, level: GEAR_SCORE.maxItemLevel })));
}

/** Tutte le pagine del bestiario: servitori di ogni vena e luogotenenti di ogni dungeon. */
export function bestiaryIds(): string[] {
  const ids = new Set<string>();
  for (const veins of Object.values(VEIN_MINIONS)) for (const minions of Object.values(veins)) for (const minion of minions) ids.add(minion.id);
  for (const lieutenant of Object.values(LIEUTENANTS)) ids.add(lieutenant.id);
  for (const veins of Object.values(VEIN_LIEUTENANTS)) for (const lieutenant of Object.values(veins)) ids.add(lieutenant.id);
  return [...ids];
}

/** Apre ogni pagina del bestiario contando un'uccisione dove non ce n'erano; le uccisioni vere restano. Restituisce le pagine aperte ora. */
export function unlockBestiary(character: Character): number {
  const fresh = bestiaryIds().filter((id) => (character.bestiary[id] ?? 0) <= 0);
  character.addKills(Object.fromEntries(fresh.map((id) => [id, 1])));
  return fresh.length;
}
