import { afterEach, describe, expect, it, vi } from 'vitest';
import { EQUIPMENT_SLOTS } from '../items/equipment-slot';
import { resolveItemSkill } from '../items/item';
import { familyById } from '../items/item-families';
import { MAGE_CLASS_SKILLS } from '../classes/mage/skills';
const MAGE_SKILLS = ['arcane_staff', 'frost_grimoire', 'meteor_mantle', 'astral_boots'].map(id => MAGE_CLASS_SKILLS[id]);
import { Character } from './character';
import { deserializeCharacter, MAX_ITEM_NUMBER, serializeCharacter } from './save-format';
import { browserStorage, CORRUPT_BACKUP_KEY, MemoryStore, SAVE_KEY, SAVE_VERSION, SaveStore, type KeyValueStore } from './save-store';
import {CharacterRoster,deserializeRoster,serializeRoster} from './character-roster';

/** Un archivio che fallisce come un browser con dati del sito bloccati o quota piena. */
class BrokenStore implements KeyValueStore {
  constructor(private readonly failOn: ReadonlyArray<'get' | 'set' | 'remove'>) {}
  getItem(): string | null {
    if (this.failOn.includes('get')) throw new Error('accesso negato');
    return null;
  }
  setItem(): void {
    if (this.failOn.includes('set')) throw new Error('quota piena');
  }
  removeItem(): void {
    if (this.failOn.includes('remove')) throw new Error('accesso negato');
  }
}

/** Un archivio che contiene gia' dei dati, con possibilita' di far fallire la scrittura. */
class SeededStore extends MemoryStore {
  failWrites = false;
  override setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('quota piena');
    super.setItem(key, value);
  }
}

function sampleCharacter(): Character {
  const character = Character.createStarter();
  const [bow, , wisps] = character.addRolls([
    { familyId: 'hunter_bow', rarity: 'rare' },
    { familyId: 'frost_lance', rarity: 'legendary' },
    { familyId: 'spirit_talisman', rarity: 'uncommon' },
  ]);
  character.equip(bow!.uid);
  character.equip(wisps!.uid);
  character.recordVictory('crypt', 95.5);
  character.recordVictory('crypt', 80.25);
  character.recordVictory('forge', 140);
  return character;
}

function saveText(overrides: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(serializeCharacter(sampleCharacter())), ...overrides });
}

describe('Character', () => {
  it('il personaggio iniziale ha 4 oggetti Comuni, uno per slot, equipaggiati: le 4 skill del mago', () => {
    const starter = Character.createStarter();
    expect(starter.inventory.map((item) => [item.familyId, item.rarity])).toEqual([
      ['arcane_staff', 'common'],
      ['frost_grimoire', 'common'],
      ['meteor_mantle', 'common'],
      ['astral_boots', 'common'],
    ]);
    expect(EQUIPMENT_SLOTS.map((slot) => starter.equippedItem(slot)?.familyId)).toEqual([
      'arcane_staff', 'frost_grimoire', 'meteor_mantle', 'astral_boots',
    ]);
    expect(starter.loadout()).toMatchObject([...MAGE_SKILLS]);
    expect(starter.nextItemNumber).toBe(5);
    expect(starter.records).toEqual({});
  });

  it('equip mette l\'oggetto nello slot della sua famiglia e lascia nell\'inventario quello che c\'era', () => {
    const character = Character.createStarter();
    const [bow, hammer] = character.addRolls([
      { familyId: 'hunter_bow', rarity: 'epic' },
      { familyId: 'forge_hammer', rarity: 'common' },
    ]);
    expect(character.equip(bow!.uid)).toBe(true);
    expect(character.equippedItem('primary_hand')).toEqual(bow);
    expect(character.equippedItem('boots')?.familyId).toBe('astral_boots'); // gli altri slot non cambiano
    expect(character.inventory.map((item) => item.familyId)).toContain('arcane_staff');
    expect(character.inventory).toHaveLength(6);
    expect(character.equip(hammer!.uid)).toBe(true);
    expect(character.equippedItem('primary_hand')).toEqual(hammer);
    expect(character.inventory).toHaveLength(6);
    // Un oggetto che non e' nell'inventario non si equipaggia.
    expect(character.equip('i999')).toBe(false);
    expect(character.equip(bow!.uid)).toBe(true);
    expect(character.equippedItem('primary_hand')).toEqual(bow);
  });

  it('equip rifiuta un oggetto di una famiglia sconosciuta senza cambiare nulla', () => {
    const character = Character.createStarter();
    character.inventory.push({ uid: 'x1', familyId: 'sparita', rarity: 'rare' });
    const before = { ...character.equipped };
    expect(character.equip('x1')).toBe(false);
    expect(character.equipped).toEqual(before);
    expect(character.loadout()).toMatchObject([...MAGE_SKILLS]);
  });

  it('unequip svuota lo slot (loadout null) ma non perde l\'oggetto', () => {
    const character = Character.createStarter();
    character.unequip('armor');
    expect(character.equippedItem('armor')).toBeNull();
    expect(character.loadout()).toMatchObject([MAGE_SKILLS[0], MAGE_SKILLS[1], null, MAGE_SKILLS[3]]);
    expect(character.inventory).toHaveLength(4);
    const mantle = character.inventory.find((item) => item.familyId === 'meteor_mantle')!;
    expect(character.equip(mantle.uid)).toBe(true);
    expect(character.loadout()).toMatchObject([...MAGE_SKILLS]);
  });

  it('discard elimina solo oggetti non equipaggiati', () => {
    const character = Character.createStarter();
    const [spare] = character.addRolls([{ familyId: 'wind_boots', rarity: 'rare' }]);
    expect(character.discard(spare!.uid)).toBe(true);
    expect(character.itemByUid(spare!.uid)).toBeUndefined();
    expect(character.discard(spare!.uid)).toBe(false); // gia' scartato
    const equippedUid = character.equipped.primary_hand!;
    expect(character.discard(equippedUid)).toBe(false);
    expect(character.itemByUid(equippedUid)).toBeDefined();
    expect(character.inventory).toHaveLength(4);
    // Dopo aver tolto l'oggetto dallo slot si puo' scartare.
    character.unequip('primary_hand');
    expect(character.discard(equippedUid)).toBe(true);
  });

  it('il loadout ha le skill risolte con i valori della rarita\' dell\'oggetto, nell\'ordine degli slot', () => {
    const character = sampleCharacter();
    const loadout = character.loadout();
    expect(loadout).toHaveLength(4);
    expect(loadout[0]).toEqual(resolveItemSkill(familyById('hunter_bow')!, 'rare'));
    expect(loadout[0]!.id).toBe('hunter_bow');
    expect(loadout[1]!.id).toBe('spirit_talisman');
    expect(loadout[2]).toMatchObject(MAGE_SKILLS[2]);
    expect(loadout[3]).toMatchObject(MAGE_SKILLS[3]);
    const effect = loadout[0]!.effect;
    if (effect.kind !== 'projectile') throw new Error('atteso un proiettile');
    expect(effect.projectile.damage).toBe(21); // 14 x 1,25 = 17,5 -> 18
    expect(loadout[0]!.cooldown).toBeCloseTo(0.16 * 1.15 * 0.9, 10);
  });

  it('addRolls conia uid unici e stabili e non li riusa mai, nemmeno dopo uno scarto', () => {
    const character = Character.createStarter();
    const first = character.addRolls([
      { familyId: 'storm_scepter', rarity: 'common' },
      { familyId: 'ember_aegis', rarity: 'epic' },
    ]);
    expect(first.map((item) => item.uid)).toEqual(['i5', 'i6']);
    expect(character.nextItemNumber).toBe(7);
    character.discard('i6');
    const second = character.addRolls([{ familyId: 'wind_boots', rarity: 'rare' }]);
    expect(second[0]!.uid).toBe('i7');
    const uids = character.inventory.map((item) => item.uid);
    expect(new Set(uids).size).toBe(uids.length);
    // Le famiglie sconosciute non entrano nell'inventario.
    expect(character.addRolls([{ familyId: 'nope', rarity: 'rare' }])).toEqual([]);
    expect(character.nextItemNumber).toBe(8);
  });

  it('nessun oggetto si perde: tutti i bottini ricevuti restano nell\'inventario finche\' non si scartano', () => {
    const character = Character.createStarter();
    let expected = 4;
    for (let i = 0; i < 25; i++) {
      character.addRolls([{ familyId: 'meteor_mantle', rarity: 'common' }]);
      expected++;
      const added = character.inventory[character.inventory.length - 1]!;
      character.equip(added.uid);
      expect(character.inventory).toHaveLength(expected);
    }
    expect(new Set(character.inventory.map((item) => item.uid)).size).toBe(expected);
  });

  it('recordVictory distingue prima vittoria e nuovo record; un tempo peggiore conta ma non sostituisce il record', () => {
    const character = Character.createStarter();
    expect(character.recordFor('crypt')).toEqual({ clears: 0, bestTimeSeconds: null });
    expect(character.recordVictory('crypt', 100)).toEqual({ firstClear: true, newBest: true });
    expect(character.recordVictory('crypt', 120)).toEqual({ firstClear: false, newBest: false });
    expect(character.recordFor('crypt')).toEqual({ clears: 2, bestTimeSeconds: 100 });
    expect(character.recordVictory('crypt', 99.5)).toEqual({ firstClear: false, newBest: true });
    expect(character.recordVictory('crypt', 99.5)).toEqual({ firstClear: false, newBest: false }); // pari non e' record
    expect(character.recordFor('crypt')).toEqual({ clears: 4, bestTimeSeconds: 99.5 });
    // I dungeon sono indipendenti.
    expect(character.recordVictory('swamp', 300)).toEqual({ firstClear: true, newBest: true });
    expect(character.recordFor('crypt').clears).toBe(4);
    // Un tempo non valido conta la vittoria ma non diventa mai il record.
    expect(character.recordVictory('swamp', Number.NaN)).toEqual({ firstClear: false, newBest: false });
    expect(character.recordVictory('swamp', 0)).toEqual({ firstClear: false, newBest: false });
    expect(character.recordFor('swamp')).toEqual({ clears: 3, bestTimeSeconds: 300 });
    // recordFor restituisce una copia.
    character.recordFor('swamp').clears = 99;
    expect(character.recordFor('swamp').clears).toBe(3);
  });
});

describe('formato di salvataggio', () => {
  it('andata e ritorno identica: stesso personaggio e stesso testo', () => {
    const character = sampleCharacter();
    const text = serializeCharacter(character);
    const loaded = deserializeCharacter(text);
    expect(loaded).toEqual(character);
    expect(serializeCharacter(loaded!)).toBe(text);
    expect(loaded!.loadout()).toEqual(character.loadout());
    expect(JSON.parse(text)).toMatchObject({ version: SAVE_VERSION, nextItemNumber: character.nextItemNumber });
    expect(Object.keys(JSON.parse(text)).sort()).toEqual([
      'bestiary', 'blessings', 'bodyType', 'characterClass', 'descents', 'embers', 'equipped', 'items', 'name', 'nextItemNumber',
      'pilgrimage', 'records', 'starterPending', 'storagePositions', 'storedUids', 'totalXp', 'tradeReceipts', 'version',
    ]);
  });

  it('v7: braci, benedizioni, bestiario e discese vanno e tornano; i dati non validi si puliscono', () => {
    const character = sampleCharacter();
    character.embers = 340;
    character.blessings = { vigor: 2, first_spark: 1 };
    character.addKills({ wax_candle: 12, gargoyle: 2, belfry_gargoyle: 1 });
    character.recordDescent('crypt', { won: true, seconds: 612.5, grade: 1, stage: 8 });
    character.recordDescent('swamp', { won: false, seconds: 200, grade: 0, stage: 4 });
    character.pilgrimage = { clears: 1, bestTimeSeconds: 1800 };
    const loaded = deserializeCharacter(serializeCharacter(character))!;
    expect(loaded.embers).toBe(340);
    expect(loaded.blessings).toEqual({ vigor: 2, first_spark: 1 });
    expect(loaded.bestiary).toEqual({ wax_candle: 12, gargoyle: 2, belfry_gargoyle: 1 });
    expect(loaded.descentFor('crypt')).toEqual({ clears: 1, bestTimeSeconds: 612.5, bestGrade: 1, furthestStage: 8 });
    expect(loaded.descentFor('swamp')).toEqual({ clears: 0, bestTimeSeconds: null, bestGrade: -1, furthestStage: 4 });
    expect(loaded.maxGrade('crypt')).toBe(2);
    expect(loaded.maxGrade('swamp')).toBe(0);
    expect(loaded.pilgrimage).toEqual({ clears: 1, bestTimeSeconds: 1800 });

    const dirty = deserializeCharacter(saveText({
      embers: -5, blessings: { vigor: 99, nope: 1 }, bestiary: { nope: 3, wax_candle: 2.7, gargoyle: -1 },
      descents: { crypt: { clears: 2, bestTimeSeconds: -1, bestGrade: 42, furthestStage: 1e9 }, atlantide: { clears: 1 } },
      pilgrimage: 'x',
    }))!;
    expect(dirty.embers).toBe(0);
    expect(dirty.blessings).toEqual({ vigor: 3 });
    expect(dirty.bestiary).toEqual({ wax_candle: 2 });
    expect(dirty.descents).toEqual({ crypt: { clears: 2, bestTimeSeconds: null, bestGrade: 5, furthestStage: 64 } });
    expect(dirty.pilgrimage).toEqual({ clears: 0, bestTimeSeconds: null });
  });

  it('v6 si legge in v7 senza perdere nulla: braci e discese partono da zero, il duello resta aperto a chi aveva vinto', () => {
    const old = JSON.parse(serializeCharacter(sampleCharacter()));
    for (const key of ['embers', 'blessings', 'bestiary', 'descents', 'pilgrimage']) delete old[key];
    old.version = 6;
    old.records = { crypt: { clears: 3, bestTimeSeconds: 90 } };
    const loaded = deserializeCharacter(JSON.stringify(old))!;
    expect(loaded.embers).toBe(0);
    expect(loaded.descents).toEqual({});
    expect(loaded.canDuel('crypt')).toBe(true);
    expect(loaded.canDuel('swamp')).toBe(false);
    expect(loaded.inventory).toEqual(sampleCharacter().inventory);
  });

  it('le braci e benedizioni storiche non possono più essere spese', () => {
    const character = sampleCharacter(); character.embers = 1000; character.blessings = { vigor: 1 };
    expect(character.buyBlessing('vigor')).toBe(false);
    expect(character.embers).toBe(1000); expect(character.blessings).toEqual({ vigor: 1 });
  });

  it('JSON non valido, valori non oggetto, versione mancante o futura => null', () => {
    for (const text of ['', '{', 'non e\' json', 'null', '42', '"testo"', '[]', '{}']) {
      expect(deserializeCharacter(text), text).toBeNull();
    }
    expect(deserializeCharacter(saveText({ version: SAVE_VERSION + 1 }))).toBeNull();
    expect(deserializeCharacter(saveText({ version: '1' }))).toBeNull();
    expect(deserializeCharacter(saveText({ version: 0 }))).toBeNull();
    expect(deserializeCharacter(saveText({ items: 'x' }))).toBeNull();
  });

  it('scarta gli oggetti non validi (famiglia o rarita\' sconosciute, uid non stringa o duplicati) e tiene gli altri', () => {
    const text = saveText({
      items: [
        { uid: 'i1', familyId: 'arcane_staff', rarity: 'common' },
        { uid: 'i2', familyId: 'sparita', rarity: 'common' },
        { uid: 'i3', familyId: 'hunter_bow', rarity: 'mitico' },
        { uid: 7, familyId: 'hunter_bow', rarity: 'rare' },
        { uid: 'i1', familyId: 'wind_boots', rarity: 'epic' }, // duplicato: tiene il primo
        { uid: '', familyId: 'wind_boots', rarity: 'epic' },
        null,
        'testo',
        { uid: 'i9', familyId: 'wind_boots', rarity: 'epic' },
      ],
      equipped: { primary_hand: 'i1', secondary_hand: null, armor: null, boots: 'i9' },
    });
    const character = deserializeCharacter(text)!;
    expect(character.inventory).toEqual([
      { uid: 'i1', familyId: 'arcane_staff', rarity: 'common' },
      { uid: 'i9', familyId: 'wind_boots', rarity: 'epic' },
    ]);
    expect(character.equipped).toEqual({ primary_hand: 'i1', secondary_hand: null, armor: null, boots: 'i9' });
  });

  it('l\'equipaggiamento che punta a uid inesistenti o a una famiglia di un altro slot diventa uno slot vuoto', () => {
    const text = saveText({
      items: [
        { uid: 'i1', familyId: 'arcane_staff', rarity: 'common' },
        { uid: 'i2', familyId: 'meteor_mantle', rarity: 'rare' },
        { uid: 'i3', familyId: 'wind_boots', rarity: 'common' },
      ],
      equipped: { primary_hand: 'i2', secondary_hand: 'i404', armor: 'i2', boots: 5, extra: 'i1' },
    });
    const character = deserializeCharacter(text)!;
    expect(character.equipped).toEqual({ primary_hand: null, secondary_hand: null, armor: 'i2', boots: null });
    expect(character.loadout()[0]).toBeNull();
    expect(Object.keys(character.equipped).sort()).toEqual([...EQUIPMENT_SLOTS].sort());
    // Senza il campo equipaggiamento: tutti gli slot vuoti, oggetti intatti.
    const bare = deserializeCharacter(saveText({ equipped: 'x' }))!;
    expect(EQUIPMENT_SLOTS.every((slot) => bare.equipped[slot] === null)).toBe(true);
    expect(bare.inventory).toHaveLength(sampleCharacter().inventory.length);
  });

  it('nextItemNumber e\' sempre maggiore di ogni numero di uid presente', () => {
    const items = [
      { uid: 'i3', familyId: 'arcane_staff', rarity: 'common' },
      { uid: 'i10', familyId: 'hunter_bow', rarity: 'common' },
      { uid: 'speciale', familyId: 'wind_boots', rarity: 'common' },
    ];
    expect(deserializeCharacter(saveText({ items, nextItemNumber: 2 }))!.nextItemNumber).toBe(11);
    expect(deserializeCharacter(saveText({ items, nextItemNumber: 50 }))!.nextItemNumber).toBe(50);
    expect(deserializeCharacter(saveText({ items, nextItemNumber: 'x' }))!.nextItemNumber).toBe(11);
    expect(deserializeCharacter(saveText({ items, nextItemNumber: -4 }))!.nextItemNumber).toBe(11);
    expect(deserializeCharacter(saveText({ items, nextItemNumber: 7.5 }))!.nextItemNumber).toBe(11);
    // Il nuovo oggetto non collide mai con uno esistente.
    const character = deserializeCharacter(saveText({ items, nextItemNumber: 2 }))!;
    const [added] = character.addRolls([{ familyId: 'ember_aegis', rarity: 'rare' }]);
    expect(character.inventory.filter((item) => item.uid === added!.uid)).toHaveLength(1);
  });

  it('un nextItemNumber o un numero di uid enormi non producono uid duplicati', () => {
    const items = [
      { uid: 'i3', familyId: 'arcane_staff', rarity: 'common' },
      { uid: 'i99999999999999999999', familyId: 'hunter_bow', rarity: 'common' },
    ];
    for (const nextItemNumber of [2 ** 53, Number.MAX_SAFE_INTEGER, 1e300, MAX_ITEM_NUMBER + 1]) {
      const character = deserializeCharacter(saveText({ items, nextItemNumber }))!;
      expect(character.nextItemNumber, String(nextItemNumber)).toBe(4);
      character.addRolls([
        { familyId: 'ember_aegis', rarity: 'rare' },
        { familyId: 'wind_boots', rarity: 'common' },
      ]);
      const uids = character.inventory.map((item) => item.uid);
      expect(new Set(uids).size, String(nextItemNumber)).toBe(uids.length);
    }
    expect(deserializeCharacter(saveText({ items, nextItemNumber: MAX_ITEM_NUMBER }))!.nextItemNumber).toBe(MAX_ITEM_NUMBER);
  });

  it('addRolls salta un uid gia\' presente anche se nextItemNumber e\' rimasto indietro', () => {
    const character = Character.createStarter();
    character.nextItemNumber = 2;
    const [added] = character.addRolls([{ familyId: 'ember_aegis', rarity: 'rare' }]);
    expect(added!.uid).toBe('i5');
    expect(character.nextItemNumber).toBe(6);
  });

  it('i record di dungeon sconosciuti si scartano e i numeri non validi tornano a valori validi', () => {
    const character = deserializeCharacter(
      saveText({
        records: {
          crypt: { clears: -3, bestTimeSeconds: -10 },
          swamp: { clears: 2.9, bestTimeSeconds: 'x' },
          forge: { clears: 'molte', bestTimeSeconds: 0 },
          glacier: { clears: 4, bestTimeSeconds: 61.5 },
          fantasma: { clears: 1, bestTimeSeconds: 10 },
        },
      }),
    )!;
    expect(character.records).toEqual({
      crypt: { clears: 0, bestTimeSeconds: null },
      swamp: { clears: 2, bestTimeSeconds: null },
      forge: { clears: 0, bestTimeSeconds: null },
      glacier: { clears: 4, bestTimeSeconds: 61.5 },
    });
    // Numeri non finiti (1e999 in JSON diventa Infinity), record non oggetto.
    const inf = deserializeCharacter(
      '{"version":1,"items":[],"equipped":{},"records":{"crypt":{"clears":1e999,"bestTimeSeconds":1e999},"swamp":5,"__proto__":{"clears":1}},"nextItemNumber":1}',
    )!;
    expect(inf.records).toEqual({ crypt: { clears: 0, bestTimeSeconds: null } });
  });

  it('senza oggetti validi il personaggio riparte dall\'iniziale, senza perdere i record', () => {
    const character = deserializeCharacter(
      saveText({ items: [{ uid: 'a', familyId: 'sparita', rarity: 'common' }], equipped: { armor: 'a' } }),
    )!;
    expect(character.inventory).toEqual(Character.createStarter().inventory);
    expect(character.loadout()).toMatchObject([...MAGE_SKILLS]);
    expect(character.recordFor('crypt').clears).toBe(2);
    expect(deserializeCharacter(saveText({ version:9,items: [] }))!.loadout()).toMatchObject([...MAGE_SKILLS]);
  });
});

describe('SaveStore', () => {
  function rosterOf(character:Character):CharacterRoster{const roster=new CharacterRoster();roster.add(character);return roster;}
  it('senza dati salvati: fresh con archivio locale vuoto', () => {
    const { roster, status } = new SaveStore(new MemoryStore()).loadRoster();
    expect(status).toBe('fresh');
    expect(roster.profiles).toEqual([]);
  });

  it('salva e ricarica: loaded con lo stesso personaggio, sotto la chiave prevista', () => {
    const memory = new MemoryStore();
    const store = new SaveStore(memory);
    const character = sampleCharacter();
    const roster=rosterOf(character);
    expect(store.saveRoster(roster)).toBe(true);
    expect(memory.getItem(SAVE_KEY)).toBe(serializeRoster(roster));
    expect(SAVE_KEY).toBe('temper-your-soul:save');
    const loaded = new SaveStore(memory).loadRoster();
    expect(loaded.status).toBe('loaded');
    expect(loaded.roster.active?.character).toEqual(character);
    expect(memory.getItem(CORRUPT_BACKUP_KEY)).toBeNull();
  });

  it('JSON corrotto => recovered: personaggio iniziale e copia di sicurezza del testo originale (mai cancellato)', () => {
    const memory = new MemoryStore();
    memory.setItem(SAVE_KEY, '{"version":1,"items":[');
    const loaded = new SaveStore(memory).loadRoster();
    expect(loaded.status).toBe('recovered');
    expect(loaded.roster.profiles).toEqual([]);
    expect(memory.getItem(CORRUPT_BACKUP_KEY)).toBe('{"version":1,"items":[');
    expect(memory.getItem(SAVE_KEY)).toBe('{"version":1,"items":['); // load non cancella ne' sovrascrive
  });

  it('un salvataggio di una versione futura non si carica ne\' si perde: recovered con copia', () => {
    const memory = new MemoryStore();
    const future = saveText({ version: SAVE_VERSION + 1 });
    memory.setItem(SAVE_KEY, future);
    const loaded = new SaveStore(memory).loadRoster();
    expect(loaded.status).toBe('recovered');
    expect(memory.getItem(CORRUPT_BACKUP_KEY)).toBe(future);
  });

  it('se anche la copia di sicurezza fallisce, load non lancia e il salvataggio originale resta', () => {
    const store = new SeededStore();
    store.setItem(SAVE_KEY, 'rotto');
    store.failWrites = true;
    expect(new SaveStore(store).loadRoster().status).toBe('recovered');
    expect(store.getItem(SAVE_KEY)).toBe('rotto');
  });

  it('uno storage che lancia in setItem: save() restituisce false senza eccezioni', () => {
    const store = new SaveStore(new BrokenStore(['set']));
    expect(() => store.saveRoster(rosterOf(Character.createStarter()))).not.toThrow();
    expect(store.saveRoster(rosterOf(Character.createStarter()))).toBe(false);
    const seeded = new SeededStore();
    const wrapped = new SaveStore(seeded);
    expect(wrapped.saveRoster(rosterOf(Character.createStarter()))).toBe(true);
    seeded.failWrites = true;
    expect(wrapped.saveRoster(rosterOf(sampleCharacter()))).toBe(false);
    expect(deserializeRoster(seeded.getItem(SAVE_KEY)!)?.active?.character).toEqual(Character.createStarter()); // il vecchio resta
  });

  it('uno storage che lancia in getItem: si parte da zero senza eccezioni', () => {
    const loaded = new SaveStore(new BrokenStore(['get'])).loadRoster();
    expect(loaded.status).toBe('fresh');
    expect(loaded.roster.profiles).toEqual([]);
  });

  it('con store null il gioco funziona in memoria: load da\' fresh, save restituisce false', () => {
    const store = new SaveStore(null);
    expect(store.loadRoster().status).toBe('fresh');
    expect(store.loadRoster().roster.profiles).toEqual([]);
    expect(store.saveRoster(rosterOf(sampleCharacter()))).toBe(false);
  });
});

describe('browserStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('senza window (Node, test) restituisce null senza lanciare', () => {
    expect(browserStorage()).toBeNull();
  });

  it('restituisce window.localStorage se funziona, e null se lancia o se non accetta scritture', () => {
    const working = new MemoryStore();
    vi.stubGlobal('window', { localStorage: working });
    expect(browserStorage()).toBe(working);
    expect(working.getItem(`${SAVE_KEY}:probe`)).toBeNull(); // la prova non lascia tracce

    vi.stubGlobal('window', {
      get localStorage(): KeyValueStore {
        throw new Error('SecurityError');
      },
    });
    expect(browserStorage()).toBeNull();

    vi.stubGlobal('window', { localStorage: new BrokenStore(['set']) });
    expect(browserStorage()).toBeNull();
  });
});
