import { expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresProfiles } from './profiles';
import { Character } from '../../src/features/character/character';
import { serializeCharacter } from '../../src/features/character/save-format';
import { createDatabase } from './db';

const seed = { name: 'Maga', characterClass: 'mage' as const, body: 'female' as const };
function profile() { const character = Character.createStarter(); character.completeCreation(seed.name, seed.body, seed.characterClass); return { accountId: 'account', character, gold: 0, revision: 0 }; }
it('query parametrizzate caricano il JSON salvato e non sovrascrivono il profilo alla creazione', async () => {
  const p = profile(), query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ character: JSON.parse(serializeCharacter(p.character)) as unknown, gold: '125', revision: '7' }] });
  const repo = new PostgresProfiles({ query } as unknown as Pool);
  const loaded = await repo.load("account' OR true --", seed);
  expect(loaded.gold).toBe(125); expect(loaded.revision).toBe(7);
  expect(query.mock.calls[0]![0]).toContain('DO NOTHING'); expect(query.mock.calls[1]![0]).not.toContain("account' OR true"); expect(query.mock.calls[1]![1]).toEqual(["account' OR true --"]);
});
it('un profilo corrotto rimane nel database e l’accesso fallisce senza rigenerare il set', async () => {
  const query = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ character: { version: 999 }, gold: 0, revision: 0 }] });
  await expect(new PostgresProfiles({ query } as unknown as Pool).load('a', seed)).rejects.toThrow('conservati'); expect(query).toHaveBeenCalledTimes(2);
});
it('carica profili v9 conservando XP, classe, equipaggiamento e posizioni del deposito',async()=>{
  const p=profile();p.character.totalXp=350;
  const item=p.character.addRolls([{familyId:'arcane_staff',rarity:'rare',level:7}])[0]!;
  p.character.discard(item.uid);p.character.storage.push(item);p.character.storagePositions[item.uid]=12;
  const data=JSON.parse(serializeCharacter(p.character)) as Record<string,unknown>;data.version=9;
  const query=vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rows:[{character:data,gold:'75',revision:'0'}]});
  const loaded=await new PostgresProfiles({query} as unknown as Pool).load('a',seed);
  expect(loaded.character.totalXp).toBe(350);expect(loaded.character.characterClass).toBe('mage');expect(loaded.character.gearScore).toBe(80);
  expect(loaded.character.storagePositions[item.uid]).toBe(12);expect(loaded.character.storage[0]).toMatchObject({level:7,rarity:'rare'});expect(loaded.gold).toBe(75);
});
it('due UPSERT usano lo stesso client e una transazione, con revisioni aggiornate dopo COMMIT', async () => {
  const query = vi.fn().mockResolvedValue({ rowCount: 1 }), release = vi.fn(), client = { query, release };
  const repo = new PostgresProfiles({ connect: async () => client } as unknown as Pool), a = profile(), b = { ...profile(), accountId: 'b' };
  await repo.save([b, a]); expect(query.mock.calls[0]![0]).toBe('BEGIN'); expect(query.mock.calls.at(-1)![0]).toBe('COMMIT'); expect(release).toHaveBeenCalled(); expect(a.revision).toBe(1); expect(b.revision).toBe(1);
  expect(query.mock.calls[1]![0]).toContain('ON CONFLICT'); expect(query.mock.calls[1]![1][0]).toBe('account');
});
it('una revisione concorrente esegue ROLLBACK e non avanza nessuna revisione in memoria', async () => {
  const query = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValue({}), release = vi.fn();
  const repo = new PostgresProfiles({ connect: async () => ({ query, release }) } as unknown as Pool), a = profile();
  await expect(repo.save([a])).rejects.toThrow('altra sessione'); expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK'); expect(a.revision).toBe(0); expect(release).toHaveBeenCalled();
});
it('la configurazione SQL rifiuta identificatori arbitrari e DATABASE_URL è obbligatoria', () => {
  expect(() => new PostgresProfiles({} as Pool, { PROFILES_TABLE: 'profiles; DROP TABLE profiles' })).toThrow('SQL'); expect(() => createDatabase({})).toThrow('DATABASE_URL');
});
