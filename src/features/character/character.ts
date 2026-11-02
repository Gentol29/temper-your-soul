import type { BodyType, CharacterAppearance } from './appearance';
import type { CharacterClass } from './character-class';
import { EQUIPMENT_SLOTS, type EquipmentSlot } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import { resolveItem, type Item, type ItemRoll } from '../items/item';
import type { Loadout } from '../skills/skill-definition';
import { cleanCharacterName, STARTER_SETS } from './creation';
import { cleanItemLevel, gearScore } from '../items/gear-score';
import type { BlessingId } from '../run/blessings';

/** Progressi in un dungeon: vittorie e miglior tempo (null finche' non si vince). */
export interface DungeonRecord {
  clears: number;
  bestTimeSeconds: number | null;
}

/** Esito della registrazione di una vittoria. La prima vittoria e' anche un nuovo record (non c'era un tempo prima). */
export interface VictoryResult {
  firstClear: boolean;
  newBest: boolean;
}

/** Progressi nelle discese di un dungeon: vittorie, miglior tempo, grado di tempra piu' alto superato, tappa migliore. */
export interface DescentRecord {
  clears: number;
  bestTimeSeconds: number | null;
  /** Grado di tempra piu' alto con cui la discesa e' stata vinta (-1 se mai vinta). */
  bestGrade: number;
  /** Tappa piu' lontana raggiunta (anche perdendo), da 1. */
  furthestStage: number;
}

/** Il grado di tempra massimo sbloccabile. */
export const MAX_DESCENT_GRADE = 5;

/**
 * Il personaggio del giocatore: inventario, equipaggiamento e progressi. Stato puro, senza DOM ne' casualita'.
 *
 * - L'inventario contiene TUTTI gli oggetti posseduti, anche quelli equipaggiati: `equipped` conserva solo gli `uid`.
 * - Gli `uid` sono unici e stabili (`i1`, `i2`, ...) e non si riusano mai, nemmeno dopo uno scarto.
 * - La skill di ogni slot viene dall'oggetto equipaggiato (`loadout()`).
 */
export class Character {
  name: string | null = null;
  /** Solo i personaggi nuovi ricevono il set di classe; le migrazioni conservano tutto. */
  starterPending = false;
  totalXp = 0;
  tradeReceipts: string[] = [];
  bodyType: BodyType | null = null;
  characterClass: CharacterClass | null = null;
  chooseClass(value: CharacterClass): boolean {
    if(this.characterClass!==null) return this.characterClass===value;
    this.characterClass=value;this.reconcileEquipment();return true;
  }
  get created():boolean { return this.name!==null && this.bodyType!==null && this.characterClass!==null; }
  chooseBody(value:BodyType):boolean {
    if(this.bodyType!==null)return this.bodyType===value;
    this.bodyType=value;return true;
  }
  completeCreation(rawName:string,body:BodyType,kind:CharacterClass):boolean {
    const name=cleanCharacterName(rawName);
    if(this.created || name===null || (this.bodyType!==null && this.bodyType!==body) || (this.characterClass!==null && this.characterClass!==kind))return false;
    this.name=name;this.bodyType=body;this.characterClass=kind;
    if(this.starterPending){
      this.inventory=[];this.equipped={primary_hand:null,secondary_hand:null,armor:null,boots:null};
      const added=this.addRolls(STARTER_SETS[kind].map(familyId=>({familyId,rarity:'common' as const})));
      for(const item of added)this.equip(item.uid);
    }
    this.reconcileEquipment();this.starterPending=false;return true;
  }
  get gearScore():number { return EQUIPMENT_SLOTS.reduce((sum,slot)=>{const item=this.equippedItem(slot);return sum+(item?gearScore(item):0);},0); }
  appearance(): CharacterAppearance {
    const equipment: Partial<Record<EquipmentSlot, Item>> = {};
    for(const slot of EQUIPMENT_SLOTS) { const item=this.equippedItem(slot); if(item) equipment[slot]=item; }
    return {body:this.bodyType ?? 'male',characterClass:this.characterClass ?? 'mage',equipment};
  }
  storage: Item[] = [];
  storagePositions: Record<string,number> = {};
  inventory: Item[] = [];
  equipped: Record<EquipmentSlot, string | null> = { primary_hand: null, secondary_hand: null, armor: null, boots: null };
  records: Record<string, DungeonRecord> = {};
  /** Il numero del prossimo `uid` da coniare. */
  nextItemNumber = 1;
  /** Braci dell'anima: valuta permanente della discesa, si spende all'Altare. */
  embers = 0;
  /** Benedizioni dell'Altare (livello per id). */
  blessings: Partial<Record<BlessingId, number>> = {};
  /** Servitori abbattuti per tipo: il bestiario si sblocca con la prima uccisione. */
  bestiary: Record<string, number> = {};
  /** Progressi delle discese, per dungeon. */
  descents: Record<string, DescentRecord> = {};
  /** Pellegrinaggi vinti e miglior tempo. */
  pilgrimage: { clears: number; bestTimeSeconds: number | null } = { clears: 0, bestTimeSeconds: null };

  /** Il personaggio di partenza: 4 oggetti Comuni, uno per slot, gia' equipaggiati (le 4 skill base del mago). */
  static createStarter(kind:CharacterClass='mage'): Character {
    const character = new Character();
    character.starterPending=true;
    const items = character.addRolls(STARTER_SETS[kind].map((familyId) => ({ familyId, rarity: 'common' as const })));
    for (const item of items) character.equip(item.uid);
    return character;
  }

  itemByUid(uid: string): Item | undefined {
    return this.inventory.find((item) => item.uid === uid);
  }

  /** L'oggetto equipaggiato nello slot, o `null` se lo slot e' vuoto. */
  equippedItem(slot: EquipmentSlot): Item | null {
    const uid = this.equipped[slot];
    return uid===null||!this.canEquip(uid)?null:this.itemByUid(uid)??null;
  }

  canEquip(uid:string):boolean {
    const item=this.itemByUid(uid),family=item? familyById(item.familyId):undefined;
    return family!==undefined && (this.characterClass===null||family.characterClass===this.characterClass);
  }
  /** Conserva tutti gli oggetti, svuota soltanto gli slot incompatibili con la classe. */
  reconcileEquipment():void {
    for(const slot of EQUIPMENT_SLOTS){const uid=this.equipped[slot];if(uid!==null&&!this.canEquip(uid))this.equipped[slot]=null;}
  }

  /**
   * Equipaggia un oggetto dell'inventario nello slot della sua famiglia; quello che c'era resta nell'inventario.
   * Restituisce false se l'oggetto non e' nell'inventario o la sua famiglia non esiste.
   */
  equip(uid: string): boolean {
    const item = this.itemByUid(uid);
    const family = item === undefined ? undefined : familyById(item.familyId);
    if (item === undefined || family === undefined || !this.canEquip(uid)) return false;
    this.equipped[family.slot] = item.uid;
    return true;
  }

  /** Svuota lo slot (l'oggetto resta nell'inventario). */
  unequip(slot: EquipmentSlot): void {
    this.equipped[slot] = null;
  }

  /** Elimina un oggetto dall'inventario. Non si scarta un oggetto equipaggiato: restituisce false (e lo stesso se non esiste). */
  discard(uid: string): boolean {
    const index = this.inventory.findIndex((item) => item.uid === uid);
    if (index < 0 || EQUIPMENT_SLOTS.some((slot) => this.equipped[slot] === uid)) return false;
    this.inventory.splice(index, 1);
    return true;
  }

  /** Le skill risolte (con i valori della rarita') per slot, nell'ordine degli slot di skill; `null` = slot vuoto. */
  loadout(): Loadout {
    return EQUIPMENT_SLOTS.map((slot) => {
      const item = this.equippedItem(slot);
      return item === null ? null : (resolveItem(item)?.skill ?? null);
    });
  }

  /** Aggiunge all'inventario gli oggetti estratti, con `uid` nuovi. Le famiglie sconosciute vengono ignorate. */
  addRolls(rolls: readonly ItemRoll[]): Item[] {
    const added: Item[] = [];
    for (const roll of rolls) {
      if (familyById(roll.familyId) === undefined) continue;
      const level=cleanItemLevel(roll.level);
      // Difesa contro salvataggi manomessi: un uid gia' presente non si riusa mai.
      while (this.itemByUid(`i${this.nextItemNumber}`) !== undefined) this.nextItemNumber += 1;
      const item: Item = { uid: `i${this.nextItemNumber}`, familyId: roll.familyId, rarity: roll.rarity, ...(level>1?{level}:{}) };
      this.nextItemNumber += 1;
      this.inventory.push(item);
      added.push(item);
    }
    return added;
  }

  /**
   * Registra una vittoria. `firstClear`: era la prima volta in questo dungeon. `newBest`: il tempo batte il record
   * (o non c'era). Un tempo non valido (non finito o <= 0) conta la vittoria ma non tocca il record.
   */
  recordVictory(dungeonId: string, seconds: number): VictoryResult {
    const record = Object.hasOwn(this.records, dungeonId) ? this.records[dungeonId]! : { clears: 0, bestTimeSeconds: null };
    const firstClear = record.clears === 0;
    const validTime = Number.isFinite(seconds) && seconds > 0;
    const newBest = validTime && (record.bestTimeSeconds === null || seconds < record.bestTimeSeconds);
    this.records[dungeonId] = { clears: record.clears + 1, bestTimeSeconds: newBest ? seconds : record.bestTimeSeconds };
    return { firstClear, newBest };
  }

  /** Una copia dei progressi nel dungeon (vuota se non ancora vinto): modificarla non cambia il personaggio. */
  recordFor(dungeonId: string): DungeonRecord {
    const record = Object.hasOwn(this.records, dungeonId) ? this.records[dungeonId]! : undefined;
    return record === undefined ? { clears: 0, bestTimeSeconds: null } : { ...record };
  }

  /** Una copia dei progressi nelle discese del dungeon. */
  descentFor(dungeonId: string): DescentRecord {
    const record = Object.hasOwn(this.descents, dungeonId) ? this.descents[dungeonId]! : undefined;
    return record === undefined ? { clears: 0, bestTimeSeconds: null, bestGrade: -1, furthestStage: 0 } : { ...record };
  }

  /** Il Duello (il boss da solo) si apre dopo aver battuto il boss almeno una volta, in una discesa o prima. */
  canDuel(dungeonId: string): boolean {
    return this.recordFor(dungeonId).clears > 0;
  }

  /** Il grado di tempra piu' alto scelto per una discesa: uno oltre il migliore vinto. */
  maxGrade(dungeonId: string): number {
    return Math.min(MAX_DESCENT_GRADE, this.descentFor(dungeonId).bestGrade + 1);
  }

  /** Il Pellegrinaggio si apre dopo aver vinto una discesa in ogni dungeon. */
  canPilgrimage(dungeonIds: readonly string[]): boolean {
    return dungeonIds.every((id) => this.descentFor(id).clears > 0);
  }

  /**
   * Registra una discesa finita (vinta o persa): tappa piu' lontana, e per le vittorie tempo e grado. Restituisce se
   * il tempo e' un nuovo record.
   */
  recordDescent(dungeonId: string, outcome: { won: boolean; seconds: number; grade: number; stage: number }): VictoryResult {
    const record = this.descentFor(dungeonId);
    const firstClear = outcome.won && record.clears === 0;
    const validTime = outcome.won && Number.isFinite(outcome.seconds) && outcome.seconds > 0;
    const newBest = validTime && (record.bestTimeSeconds === null || outcome.seconds < record.bestTimeSeconds);
    this.descents[dungeonId] = {
      clears: record.clears + (outcome.won ? 1 : 0),
      bestTimeSeconds: newBest ? outcome.seconds : record.bestTimeSeconds,
      bestGrade: outcome.won ? Math.max(record.bestGrade, Math.min(MAX_DESCENT_GRADE, outcome.grade)) : record.bestGrade,
      furthestStage: Math.max(record.furthestStage, outcome.stage),
    };
    return { firstClear, newBest };
  }

  /** Aggiunge le uccisioni al bestiario. */
  addKills(kills: Readonly<Record<string, number>>): void {
    for (const [id, count] of Object.entries(kills)) {
      if (count > 0) this.bestiary[id] = Math.min(1_000_000_000, (this.bestiary[id] ?? 0) + Math.floor(count));
    }
  }

  /** Compatibilità v7: i vecchi dati restano salvati, ma l'altare non è più utilizzabile. */
  buyBlessing(_id: BlessingId): boolean { return false; }

}
