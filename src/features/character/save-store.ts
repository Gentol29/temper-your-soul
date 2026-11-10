import { CharacterRoster,deserializeRoster,serializeRoster } from './character-roster';

export { SAVE_VERSION } from './save-format';

/** Chiave sotto cui sta il salvataggio. Non cambiarla: i salvataggi esistenti andrebbero persi. */
export const SAVE_KEY = 'temper-your-soul:save';

/** Il sottoinsieme di `Storage` che serve al salvataggio (cosi' si puo' provare senza browser). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Archivio in memoria: per i test e come ripiego dove il browser non permette di salvare. */
export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

/**
 * `window.localStorage` se esiste e funziona davvero (puo' mancare o lanciare eccezioni: modalita' privata, dati del sito
 * bloccati, quota piena, ambienti senza `window`), altrimenti `null`. L'unico punto del dominio che tocca il browser.
 */
export function browserStorage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    const probe = `${SAVE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * `fresh`: nessun salvataggio, si parte dal personaggio iniziale. `loaded`: salvataggio letto (anche riparato in parte).
 * `recovered`: salvataggio illeggibile; il testo originale e' stato copiato sotto `SAVE_KEY + ':corrupt'` e si riparte
 * dal personaggio iniziale. L'interfaccia puo' avvisare il giocatore.
 */
export type LoadStatus = 'fresh' | 'loaded' | 'recovered';

/** Chiave della copia di sicurezza di un salvataggio illeggibile. */
export const CORRUPT_BACKUP_KEY = `${SAVE_KEY}:corrupt`;
export const PRE_ROSTER_BACKUP_KEY=`${SAVE_KEY}:before-roster`;

/**
 * La raccolta salvata da un'altra scheda dello stesso browser (dall'evento `storage`: `key`, `newValue`), da adottare al
 * posto di quella in memoria: cosi' il prossimo salvataggio di questa scheda non cancella in silenzio i progressi
 * dell'altra. `null` se la modifica non riguarda il salvataggio, lo cancella o non e' leggibile: allora si tiene la
 * raccolta attuale. Il profilo attivo di questa scheda resta attivo se esiste ancora. Non scrive nulla.
 */
export function rosterFromExternalSave(key: string | null, newValue: string | null, keepActiveId: string | null): CharacterRoster | null {
  if (key !== SAVE_KEY || newValue === null) return null;
  const roster = deserializeRoster(newValue);
  if (roster !== null && keepActiveId !== null) roster.select(keepActiveId);
  return roster;
}

/**
 * Archivio locale dei profili precedenti e delle bozze. I progressi online passano soltanto dal server PostgreSQL.
 * Con `store` null resta utilizzabile in memoria; non sovrascrive l'archivio con il personaggio online.
 */
export class SaveStore {
  constructor(private readonly store: KeyValueStore | null) {}

  loadRoster():{roster:CharacterRoster;status:LoadStatus}{
    let text:string|null;try{text=this.store?.getItem(SAVE_KEY)??null;}catch{return {roster:new CharacterRoster(),status:'fresh'};}
    if(text===null)return {roster:new CharacterRoster(),status:'fresh'};
    const roster=deserializeRoster(text);if(roster)return {roster,status:'loaded'};
    this.backUpCorrupt(text);return {roster:new CharacterRoster(),status:'recovered'};
  }
  saveRoster(roster:CharacterRoster):boolean {
    if(!this.store)return false;
    try{
      const previous=this.store.getItem(SAVE_KEY);
      if(previous!==null && !this.store.getItem(PRE_ROSTER_BACKUP_KEY)){
        let single=false;
        try{const parsed:unknown=JSON.parse(previous);single=typeof parsed==='object'&&parsed!==null&&!('format' in parsed);}catch{/* Il testo illeggibile è già conservato da loadRoster in :corrupt. */}
        if(single)this.store.setItem(PRE_ROSTER_BACKUP_KEY,previous);
      }
      this.store.setItem(SAVE_KEY,serializeRoster(roster));return true;
    }catch{return false;}
  }

  /** Il testo illeggibile non si cancella in silenzio: se la copia fallisce, il salvataggio originale resta dov'e'. */
  private backUpCorrupt(text: string): void {
    try {
      this.store?.setItem(CORRUPT_BACKUP_KEY, text);
    } catch {
      // Nessuna copia possibile: loadRoster non scrive su SAVE_KEY, quindi il testo originale resta intatto.
    }
  }
}
