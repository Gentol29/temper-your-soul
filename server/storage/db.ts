import { Pool } from 'pg';

/** Solo server: nessuna credenziale viene inclusa nel bundle del browser. */
export function createDatabase(env: NodeJS.ProcessEnv = process.env): Pool {
  if (!env.DATABASE_URL) throw new Error('Configurare DATABASE_URL per il mondo persistente.');
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 12,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30_000, statement_timeout: 10_000 });
  pool.on('error', () => console.error('Connessione PostgreSQL interrotta.'));
  return pool;
}
