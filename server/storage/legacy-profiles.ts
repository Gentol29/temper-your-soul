import type { Pool, PoolClient } from 'pg';
import { Character } from '../../src/features/character/character';
import { deserializeCharacter, serializeCharacter, SAVE_VERSION } from '../../src/features/character/save-format';
import { levelProgress } from '../../src/features/character/progression';
import { profileIdentifier, type PersistentProfile, type ProfileSeed, type ProfileStore } from './profiles';

/** Schema Supabase esistente: metadati separati e salvataggio completo nel JSON inventory. */
export class LegacyProfiles implements ProfileStore {
  private readonly table: string;
  private readonly id: string;
  private readonly data: string;
  private readonly gold: string;
  private readonly updated: string;
  constructor(private readonly pool: Pool, env: NodeJS.ProcessEnv = process.env) {
    this.table = `${profileIdentifier(env.PROFILES_SCHEMA ?? 'public')}.${profileIdentifier(env.PROFILES_TABLE ?? 'profiles')}`;
    this.id = profileIdentifier(env.PROFILES_ID_COLUMN ?? 'account_id');
    this.data = profileIdentifier(env.PROFILES_CHARACTER_COLUMN ?? 'inventory');
    this.gold = profileIdentifier(env.PROFILES_GOLD_COLUMN ?? 'gold');
    this.updated = profileIdentifier(env.PROFILES_REVISION_COLUMN ?? 'updated_at');
  }
  /** Timestamp PostgreSQL in microsecondi: confrontabile senza perdere precisione fino al limite safe integer. */
  private revision(alias = ''): string {
    return `COALESCE((EXTRACT(EPOCH FROM ${alias ? alias + '.' : ''}${this.updated}) * 1000000)::bigint,0)`;
  }
  private values(profile: PersistentProfile): unknown[] {
    const c = profile.character;
    if (!c.created || !Number.isSafeInteger(profile.gold) || profile.gold < 0) throw new Error('Profilo o saldo non valido.');
    return [profile.accountId, c.name, c.characterClass, levelProgress(c.totalXp).level, c.totalXp, profile.gold, SAVE_VERSION, serializeCharacter(c)];
  }
  async load(accountId: string, seed: ProfileSeed): Promise<PersistentProfile> {
    const character = Character.createStarter(seed.characterClass);
    if (!character.completeCreation(seed.name, seed.body, seed.characterClass)) throw new Error('Nome o classe non validi.');
    await this.pool.query(`INSERT INTO ${this.table} (${this.id},name,class,level,xp,${this.gold},save_version,${this.data},${this.updated})
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,clock_timestamp()) ON CONFLICT (${this.id}) DO NOTHING`,
      this.values({ accountId, character, gold: 0, revision: 0 }));
    const result = await this.pool.query<{ character: unknown; gold: string | number; revision: string | number; name: string; class: string; xp: number }>(
      `SELECT ${this.data} AS character,${this.gold} AS gold,${this.revision()} AS revision,name,class,xp FROM ${this.table} WHERE ${this.id}=$1`, [accountId]);
    const row = result.rows[0];
    const saved = row && deserializeCharacter(typeof row.character === 'string' ? row.character : JSON.stringify(row.character));
    const gold = Number(row?.gold), revision = Number(row?.revision);
    if (!saved?.created || !Number.isSafeInteger(gold) || gold < 0 || !Number.isSafeInteger(revision) || revision < 0
      || row.name !== saved.name || row.class !== saved.characterClass || row.xp !== saved.totalXp) {
      throw new Error('Profilo legacy sul database non valido o non coerente: dati conservati, accesso sospeso.');
    }
    return { accountId, character: saved, gold, revision };
  }
  async save(profiles: readonly PersistentProfile[]): Promise<void> {
    if (!profiles.length) return;
    const client = await this.pool.connect();
    const revisions = new Map<PersistentProfile, number>();
    try {
      await client.query('BEGIN');
      for (const p of [...profiles].sort((a,b) => a.accountId.localeCompare(b.accountId))) revisions.set(p, await this.upsert(client,p));
      await client.query('COMMIT');
      for (const [p, revision] of revisions) p.revision = revision;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  private async upsert(client: PoolClient, profile: PersistentProfile): Promise<number> {
    const result = await client.query<{ revision: string }>(`INSERT INTO ${this.table} AS saved
      (${this.id},name,class,level,xp,${this.gold},save_version,${this.data},${this.updated})
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,clock_timestamp()) ON CONFLICT (${this.id}) DO UPDATE SET
      name=EXCLUDED.name,class=EXCLUDED.class,level=EXCLUDED.level,xp=EXCLUDED.xp,${this.gold}=EXCLUDED.${this.gold},
      save_version=EXCLUDED.save_version,${this.data}=EXCLUDED.${this.data},
      ${this.updated}=GREATEST(clock_timestamp()::timestamp,COALESCE(saved.${this.updated},'epoch'::timestamp)+interval '1 microsecond')
      WHERE ${this.revision('saved')}=$9::bigint RETURNING ${this.revision()} AS revision`, [...this.values(profile), profile.revision]);
    const revision = Number(result.rows[0]?.revision);
    if (result.rowCount !== 1 || !Number.isSafeInteger(revision) || revision <= profile.revision) throw new Error('Il profilo è stato modificato da un’altra sessione. Rientra nel mondo.');
    return revision;
  }
}
