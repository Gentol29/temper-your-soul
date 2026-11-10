import type { Pool } from 'pg';
import { PostgresProfiles, type ProfileStore } from './profiles';
import { LegacyProfiles } from './legacy-profiles';
export function createProfileStore(pool: Pool, env: NodeJS.ProcessEnv = process.env): ProfileStore {
  const layout = env.PROFILES_LAYOUT ?? 'json';
  if (layout === 'legacy-v9') return new LegacyProfiles(pool,env);
  if (layout === 'json') return new PostgresProfiles(pool,env);
  throw new Error('PROFILES_LAYOUT deve essere json oppure legacy-v9.');
}
