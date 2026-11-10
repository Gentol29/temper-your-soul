import type { Pool, PoolClient } from 'pg';
import { Character } from '../../src/features/character/character';
import { deserializeCharacter, serializeCharacter } from '../../src/features/character/save-format';
import type { CharacterClass } from '../../src/features/character/character-class';
import type { BodyType } from '../../src/features/character/appearance';

export interface PersistentProfile { accountId: string; character: Character; gold: number; revision: number }
export interface ProfileSeed { name: string; characterClass: CharacterClass; body: BodyType }
export interface ProfileStore {
  /** Il profilo dell'account, oppure `null` se non ha ancora un personaggio. Non scrive nulla. */
  find(accountId: string): Promise<PersistentProfile | null>;
  /** Crea il profilo dal seme se manca, poi lo carica: un profilo esistente non viene mai sovrascritto. */
  load(accountId: string, seed: ProfileSeed): Promise<PersistentProfile>;
  save(profiles: readonly PersistentProfile[]): Promise<void>;
}
export function profileIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error('Nome SQL non valido nella configurazione profiles.');
  return `"${value}"`;
}
export function copyProfile(profile: PersistentProfile): PersistentProfile {
  return { ...profile, character: deserializeCharacter(serializeCharacter(profile.character))! };
}

/** Adattabile ai nomi delle colonne esistenti. Nessun DDL automatico su una tabella del proprietario. */
export class PostgresProfiles implements ProfileStore {
  private readonly table: string;
  private readonly id: string;
  private readonly data: string;
  private readonly gold: string;
  private readonly revision: string;
  constructor(private readonly pool: Pool, env: NodeJS.ProcessEnv = process.env) {
    this.table = `${profileIdentifier(env.PROFILES_SCHEMA ?? 'public')}.${profileIdentifier(env.PROFILES_TABLE ?? 'profiles')}`;
    this.id = profileIdentifier(env.PROFILES_ID_COLUMN ?? 'id');
    this.data = profileIdentifier(env.PROFILES_CHARACTER_COLUMN ?? 'character');
    this.gold = profileIdentifier(env.PROFILES_GOLD_COLUMN ?? 'gold');
    this.revision = profileIdentifier(env.PROFILES_REVISION_COLUMN ?? 'revision');
  }
  async find(accountId: string): Promise<PersistentProfile | null> {
    const result = await this.pool.query<{ character: unknown; gold: string | number; revision: string | number }>(
      `SELECT ${this.data} AS character,${this.gold} AS gold,${this.revision} AS revision FROM ${this.table} WHERE ${this.id}=$1`, [accountId]);
    const row = result.rows[0];
    if (!row) return null;
    const loaded = deserializeCharacter(typeof row.character === 'string' ? row.character : JSON.stringify(row.character));
    const gold = Number(row.gold), revision = Number(row.revision);
    if (!loaded?.created || !Number.isSafeInteger(gold) || gold < 0 || !Number.isSafeInteger(revision) || revision < 0) throw new Error('Profilo sul database non valido: dati conservati, accesso sospeso.');
    return { accountId, character: loaded, gold, revision };
  }
  async load(accountId: string, seed: ProfileSeed): Promise<PersistentProfile> {
    const character = Character.createStarter(seed.characterClass);
    if (!character.completeCreation(seed.name, seed.body, seed.characterClass)) throw new Error('Nome o classe non validi.');
    // ON CONFLICT non sovrascrive mai un profilo esistente, anche con due login simultanei.
    await this.pool.query(`INSERT INTO ${this.table} (${this.id},${this.data},${this.gold},${this.revision}) VALUES ($1,$2::jsonb,0,0) ON CONFLICT (${this.id}) DO NOTHING`, [accountId, serializeCharacter(character)]);
    const profile = await this.find(accountId);
    if (!profile) throw new Error('Profilo sul database non valido: dati conservati, accesso sospeso.');
    return profile;
  }
  async save(profiles: readonly PersistentProfile[]): Promise<void> {
    if (!profiles.length) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Ordine stabile dei lock quando due profili partecipano a uno scambio.
      for (const profile of [...profiles].sort((a, b) => a.accountId.localeCompare(b.accountId))) await this.upsert(client, profile);
      await client.query('COMMIT');
      for (const profile of profiles) profile.revision++;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  private async upsert(client: PoolClient, profile: PersistentProfile): Promise<void> {
    if (!Number.isSafeInteger(profile.gold) || profile.gold < 0) throw new Error('Saldo non valido.');
    const result = await client.query(`INSERT INTO ${this.table} AS saved (${this.id},${this.data},${this.gold},${this.revision})
      VALUES ($1,$2::jsonb,$3,$4+1) ON CONFLICT (${this.id}) DO UPDATE SET
      ${this.data}=EXCLUDED.${this.data},${this.gold}=EXCLUDED.${this.gold},${this.revision}=EXCLUDED.${this.revision}
      WHERE saved.${this.revision}=$4 RETURNING ${this.id}`, [profile.accountId, serializeCharacter(profile.character), profile.gold, profile.revision]);
    if (result.rowCount !== 1) throw new Error('Il profilo è stato modificato da un’altra sessione. Rientra nel mondo.');
  }
}
