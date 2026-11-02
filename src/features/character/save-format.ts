import { normalizeStoragePositions, STORAGE_CAPACITY } from './character-storage';
import { dungeonById } from '../dungeons/dungeons';
import { EQUIPMENT_SLOTS } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import type { Item } from '../items/item';
import { isRarity } from '../items/rarity';
import { Character, MAX_DESCENT_GRADE, type DescentRecord, type DungeonRecord } from './character';
import { MINIONS } from '../minions/minion-catalog';
import { cleanBlessings } from '../run/blessings';
import { LIEUTENANT_LORE } from '../run/bestiary-lore';
import { isCharacterClass } from './character-class';
import { cleanCharacterName } from './creation';
import { cleanItemLevel } from '../items/gear-score';

/**
 * Versione del formato di salvataggio. Se cambia la struttura, alzarla e aggiungere la migrazione in `deserializeCharacter`.
 * v9: posizioni persistenti nelle 20 caselle del deposito; v8: oro condiviso e deposito.
 * v7: braci, benedizioni dell'Altare, bestiario, record delle discese e del Pellegrinaggio (vuoti nei salvataggi vecchi).
 */
export const SAVE_VERSION = 10;

/**
 * Tetto per i numeri degli `uid` (`i1`, `i2`, ...): lascia un ampio margine sotto 2^53, oltre cui gli interi non sono
 * piu' esatti e `nextItemNumber + 1` potrebbe restare uguale (uid duplicati). Nessuna partita vera ci arriva.
 */
export const MAX_ITEM_NUMBER = 1_000_000_000;

/** Dati del singolo personaggio v6, inclusi nel roster locale. GS e skill restano derivati. */
export function serializeCharacter(character: Character): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    name: character.name,
    starterPending: character.starterPending,
    totalXp: character.totalXp,
    tradeReceipts: character.tradeReceipts,
    bodyType: character.bodyType,
    characterClass: character.characterClass,
    storedUids: character.storage.map(item => item.uid),
    storagePositions: character.storagePositions,
    items: [...character.inventory, ...character.storage].map(({ uid, familyId, rarity,level,upgrade }) => ({ uid, familyId, rarity,...(upgrade?{upgrade}:{}),...(cleanItemLevel(level)>1?{level:cleanItemLevel(level)}:{}) })),
    equipped: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, character.equipped[slot]])),
    records: character.records,
    nextItemNumber: character.nextItemNumber,
    embers: character.embers,
    blessings: character.blessings,
    bestiary: character.bestiary,
    descents: character.descents,
    pilgrimage: character.pilgrimage,
  });
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Legge un salvataggio con validazione rigorosa; `null` se il testo non e' utilizzabile (JSON non valido, non un oggetto,
 * versione assente o piu' recente di `SAVE_VERSION`). Il contenuto parzialmente valido si ripara senza lanciare eccezioni:
 *  - oggetti con famiglia o rarita' sconosciute, `uid` non stringa o duplicati: scartati;
 *  - equipaggiamento verso `uid` inesistenti o di una famiglia di un altro slot: slot vuoto;
 *  - record di dungeon sconosciuti: scartati; numeri non validi riportati a valori validi;
 *  - `nextItemNumber` sempre maggiore di ogni numero degli `uid` presenti e mai oltre `MAX_ITEM_NUMBER`;
 *  - nessun oggetto valido: inventario ed equipaggiamento del personaggio iniziale (i record restano).
 */
export function deserializeCharacter(text: string): Character | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;
  const { version, items, equipped, records, nextItemNumber } = data;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
  if (!Array.isArray(items)) return null;

  const character = new Character();
  character.name=cleanCharacterName(data.name);
  character.starterPending=version>=5 && data.starterPending===true && character.name===null;
  character.bodyType = data.bodyType === 'male' || data.bodyType === 'female' ? data.bodyType : null;
  character.characterClass = isCharacterClass(data.characterClass) ? data.characterClass : null;
  character.totalXp = typeof data.totalXp === 'number' && Number.isSafeInteger(data.totalXp) && data.totalXp >= 0 ? Math.min(data.totalXp, 1000000000) : 0;
  if(version>=10&&Array.isArray(data.tradeReceipts))character.tradeReceipts=[...new Set(data.tradeReceipts.filter((v):v is string=>typeof v==='string'&&v.length<=160))].slice(-256);
  const seen = new Set<string>();
  for (const raw of items) {
    if (!isObject(raw)) continue;
    const { uid, familyId, rarity } = raw;
    if (typeof uid !== 'string' || uid === '' || seen.has(uid)) continue;
    if (typeof familyId !== 'string' || familyById(familyId) === undefined || !isRarity(rarity)) continue;
    seen.add(uid);
    const level=cleanItemLevel(raw.level);
    const upgrade=typeof raw.upgrade==='number'&&Number.isInteger(raw.upgrade)?Math.max(0,Math.min(5,raw.upgrade)):0;
    const item: Item = { uid, familyId, rarity, ...(upgrade?{upgrade}:{}), ...(level>1?{level}:{}) };
    character.inventory.push(item);
  }

  if (isObject(equipped)) {
    for (const slot of EQUIPMENT_SLOTS) {
      const uid = equipped[slot];
      const item = typeof uid === 'string' ? character.itemByUid(uid) : undefined;
      character.equipped[slot] = item !== undefined && familyById(item.familyId)?.slot === slot ? item.uid : null;
    }
  }

  character.records = cleanRecords(records);
  if (version >= 7) {
    character.embers = cleanCount(data.embers);
    character.blessings = cleanBlessings(data.blessings);
    character.bestiary = cleanBestiary(data.bestiary);
    character.descents = cleanDescents(data.descents);
    character.pilgrimage = cleanPilgrimage(data.pilgrimage);
  }

  let highest = 0;
  for (const { uid } of character.inventory) {
    const match = /^i(\d+)$/.exec(uid);
    const number = match === null ? 0 : Number(match[1]);
    // Un numero oltre il tetto non puo' coincidere con gli uid nuovi, che restano sotto: non conta.
    if (number <= MAX_ITEM_NUMBER) highest = Math.max(highest, number);
  }
  const saved =
    typeof nextItemNumber === 'number' && Number.isInteger(nextItemNumber) && nextItemNumber <= MAX_ITEM_NUMBER ? nextItemNumber : 1;
  character.nextItemNumber = Math.max(saved, highest + 1, 1);

  if (character.inventory.length === 0 && (version<10 || items.length>0)) {
    const starter = Character.createStarter(character.characterClass??'mage');
    character.inventory = starter.inventory;
    character.equipped = starter.equipped;
    character.nextItemNumber = Math.max(character.nextItemNumber, starter.nextItemNumber);
  }
  if (version >= 8 && Array.isArray(data.storedUids)) {
    const stored = new Set(data.storedUids.filter((id): id is string => typeof id === 'string'));
    character.storage = character.inventory.filter(item => stored.has(item.uid) && !Object.values(character.equipped).includes(item.uid));
    const ids = new Set(character.storage.map(item => item.uid));
    character.inventory = character.inventory.filter(item => !ids.has(item.uid));
  }
  if(version>=9 && isObject(data.storagePositions)) {
    for(const [uid,index] of Object.entries(data.storagePositions)) {
      if(typeof index==='number'&&Number.isInteger(index)&&index>=0&&index<STORAGE_CAPACITY&&character.storage.some(item=>item.uid===uid))character.storagePositions[uid]=index;
    }
  }
  normalizeStoragePositions(character);
  character.reconcileEquipment();
  return character;
}

/** Un conteggio intero, non negativo, entro un tetto ragionevole (0 se non valido). */
function cleanCount(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.min(1_000_000_000, Math.floor(raw)) : 0;
}

function cleanTime(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : null;
}

/** Bestiario: solo servitori noti. */
function cleanBestiary(raw: unknown): Record<string, number> {
  const bestiary: Record<string, number> = {};
  if (!isObject(raw)) return bestiary;
  for (const [id, count] of Object.entries(raw)) {
    const value = cleanCount(count);
    if ((Object.hasOwn(MINIONS, id) || Object.hasOwn(LIEUTENANT_LORE, id)) && value > 0) bestiary[id] = value;
  }
  return bestiary;
}

function cleanDescents(raw: unknown): Record<string, DescentRecord> {
  const descents: Record<string, DescentRecord> = {};
  if (!isObject(raw)) return descents;
  for (const [dungeonId, value] of Object.entries(raw)) {
    if (dungeonById(dungeonId) === undefined || !isObject(value)) continue;
    const grade = typeof value.bestGrade === 'number' && Number.isInteger(value.bestGrade) ? Math.max(-1, Math.min(MAX_DESCENT_GRADE, value.bestGrade)) : -1;
    descents[dungeonId] = {
      clears: cleanCount(value.clears),
      bestTimeSeconds: cleanTime(value.bestTimeSeconds),
      bestGrade: cleanCount(value.clears) > 0 ? Math.max(0, grade) : -1,
      furthestStage: Math.min(64, cleanCount(value.furthestStage)),
    };
  }
  return descents;
}

function cleanPilgrimage(raw: unknown): { clears: number; bestTimeSeconds: number | null } {
  if (!isObject(raw)) return { clears: 0, bestTimeSeconds: null };
  return { clears: cleanCount(raw.clears), bestTimeSeconds: cleanTime(raw.bestTimeSeconds) };
}

function cleanRecords(raw: unknown): Record<string, DungeonRecord> {
  const records: Record<string, DungeonRecord> = {};
  if (!isObject(raw)) return records;
  for (const [dungeonId, value] of Object.entries(raw)) {
    if (dungeonById(dungeonId) === undefined || !isObject(value)) continue;
    const { clears, bestTimeSeconds } = value;
    records[dungeonId] = {
      clears: typeof clears === 'number' && Number.isFinite(clears) ? Math.max(0, Math.floor(clears)) : 0,
      bestTimeSeconds: typeof bestTimeSeconds === 'number' && Number.isFinite(bestTimeSeconds) && bestTimeSeconds > 0 ? bestTimeSeconds : null,
    };
  }
  return records;
}
