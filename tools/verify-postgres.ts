import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { PostgresProfiles, copyProfile } from '../server/storage/profiles';

/** Verifica SQL reale, esplicitamente separata dai test headless senza infrastruttura. */
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Impostare TEST_DATABASE_URL verso un database di prova dedicato.');
const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
const schema = `mmo_test_${randomUUID().replaceAll('-', '')}`;
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  await pool.query(`CREATE TABLE "${schema}".profiles (id text PRIMARY KEY,character jsonb NOT NULL,gold bigint NOT NULL DEFAULT 0,revision bigint NOT NULL DEFAULT 0)`);
  const repo = new PostgresProfiles(pool, { PROFILES_SCHEMA: schema });
  const seed = { name: 'Verifica', characterClass: 'mage' as const, body: 'male' as const };
  const a = await repo.load('a', seed), b = await repo.load('b', seed);
  assert.equal(a.character.inventory.length, 4); assert.equal(a.character.totalXp, 0);
  a.gold = 100; await repo.save([a]); assert.equal((await repo.load('a', seed)).gold, 100);
  const stale = copyProfile(a); a.gold = 120; await repo.save([a]);
  stale.gold = 999; b.gold = 999;
  await assert.rejects(repo.save([b, stale])); assert.equal((await repo.load('b', seed)).gold, 0);
  const current = await repo.load('a', seed); current.gold = 20; b.gold = 100; await repo.save([current, b]);
  assert.equal((await repo.load('a', seed)).gold, 20); assert.equal((await repo.load('b', seed)).gold, 100);
  console.log('POSTGRESQL: creazione, caricamento, UPSERT, revisioni e rollback atomico OK');
} finally {
  await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
}
