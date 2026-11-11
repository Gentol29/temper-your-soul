import { describe, expect, it } from 'vitest';
import { WorldService } from './world-service';
import { copyProfile, type PersistentProfile, type ProfileSeed, type ProfileStore } from './storage/profiles';
import { Character } from '../src/features/character/character';
import { serializeCharacter } from '../src/features/character/save-format';
import { applyCharacterCommand } from './character-commands';
import { Vec2 } from '../src/core/vec2';
import { applyRunProgress, emptyProgress } from './run-progress';
import { deserializeRoster } from '../src/features/character/character-roster';

const seed: ProfileSeed = { name: 'Viandante', characterClass: 'warrior', body: 'female' };
class MemoryProfiles implements ProfileStore {
  readonly rows = new Map<string, PersistentProfile>();
  fail = false;
  async find(accountId: string): Promise<PersistentProfile | null> {
    const profile = this.rows.get(accountId);
    return profile ? copyProfile(profile) : null;
  }
  async load(accountId: string, initial: ProfileSeed): Promise<PersistentProfile> {
    let profile = this.rows.get(accountId);
    if (!profile) { const character = Character.createStarter(initial.characterClass); character.completeCreation(initial.name, initial.body, initial.characterClass); profile = { accountId, character, gold: 500, revision: 0 }; this.rows.set(accountId, copyProfile(profile)); }
    return copyProfile(profile);
  }
  async save(profiles: readonly PersistentProfile[]): Promise<void> {
    if (this.fail) throw new Error('database offline');
    for (const p of profiles) if (this.rows.get(p.accountId)?.revision !== p.revision) throw new Error('revision');
    for (const p of profiles) { p.revision++; this.rows.set(p.accountId, copyProfile(p)); }
  }
}
const auth = { verify: async (token: unknown) => { if (typeof token !== 'string' || !token.startsWith('valid-')) throw new Error('Sessione non valida'); return { id: token }; } };
function service() { const store = new MemoryProfiles(); return { store, service: new WorldService(store, auth) }; }
async function login(s: WorldService, id: string, account = id) {
  const roster = deserializeRoster((await s.characterChoices(`valid-${account}`, () => true))!)!;
  await s.login(id, `valid-${account}`, roster.activeId ? null : seed, () => true, roster.activeId ?? undefined);
}

describe('account e autorità del server', () => {
  it('due personaggi persistono al riavvio, con oro comune e inventari e progressi separati', async () => {
    const { service:s,store }=service();await login(s,'first','owner');
    await s.command('first',{kind:'buy',slot:0});
    const before=serializeCharacter(s.profiles.get('first')!.character);
    await s.leave('first');
    await s.login('second','valid-owner',{name:'Arciere',characterClass:'archer',body:'male'},()=>true);
    expect(s.profiles.get('second')!.gold).toBe(470);
    await s.command('second',{kind:'buy',slot:0});
    const second=serializeCharacter(s.profiles.get('second')!.character);
    await s.leave('second');
    const restarted=new WorldService(store,auth);
    const choices=deserializeRoster((await restarted.characterChoices('valid-owner',()=>true))!)!;
    expect(choices.profiles.map(p=>p.character.name)).toEqual(['Viandante','Arciere']);expect(choices.gold).toBe(440);
    expect(restarted.world.characters.size).toBe(0);
    await restarted.login('back','valid-owner',null,()=>true,'c1');
    expect(serializeCharacter(restarted.profiles.get('back')!.character)).toBe(before);
    expect(restarted.profiles.get('back')!.gold).toBe(440);
    expect(serializeCharacter(restarted.profiles.get('back')!.roster!.profiles[1]!.character)).toBe(second);
    await restarted.leave('back');
    await expect(restarted.login('foreign','valid-other',null,()=>true,'c2')).rejects.toThrow('non appartenente');
    expect(store.rows.has('valid-other')).toBe(false);
  });
  it('una creazione fallita non perde personaggi né oro e il login non accetta due scelte insieme',async()=>{
    const {service:s,store}=service();await login(s,'one');await s.leave('one');store.fail=true;
    await expect(s.login('new','valid-one',seed,()=>true)).rejects.toThrow('offline');
    expect(store.rows.get('valid-one')!.roster!.profiles).toHaveLength(1);expect(store.rows.get('valid-one')!.gold).toBe(500);
    await expect(s.login('both','valid-one',seed,()=>true,'c1')).rejects.toThrow('oppure');
  });
  it('identità verificata, set di classe iniziale bianco e inventario ripristinato a ogni login', async () => {
    const { service: s, store } = service(); await login(s, 'a');
    const profile = s.profiles.get('a')!;
    expect(profile.character.totalXp).toBe(0); expect(profile.character.characterClass).toBe('warrior');
    expect(profile.character.inventory).toHaveLength(4); expect(profile.character.inventory.every(i => i.rarity === 'common')).toBe(true);
    await s.command('a', { kind: 'buy', slot: 0 }); const saved = serializeCharacter(profile.character);
    await s.leave('a'); await login(s, 'b', 'a');
    expect(serializeCharacter(s.profiles.get('b')!.character)).toBe(saved); expect(store.rows.get('valid-a')!.gold).toBe(470);
  });
  it('senza personaggio l’accesso verificato non crea nulla: chiede la creazione e lascia libero l’account', async () => {
    const { service: s, store } = service();
    expect(await s.login('a', 'valid-a', null, () => true)).toBe('character_required');
    expect(store.rows.size).toBe(0); expect(s.profiles.size).toBe(0); expect(s.world.characters.size).toBe(0);
    // La creazione arriva dopo, con una nuova richiesta dello stesso account verificato.
    expect(await s.login('b', 'valid-a', seed, () => true)).toBe('entered');
    expect(s.profiles.get('b')!.character.name).toBe('Viandante'); await s.leave('b');
    // Anche con un personaggio si attende la scelta esplicita.
    expect(await s.login('c', 'valid-a', null, () => true)).toBe('character_required');
    expect(await s.login('c', 'valid-a', null, () => true, 'c1')).toBe('entered');
    expect(s.profiles.get('c')!.character.characterClass).toBe('warrior'); expect(store.rows.size).toBe(1);
  });
  it('un token falso non legge la raccolta; una nuova creazione conserva il personaggio esistente', async () => {
    const { service: s, store } = service();
    await expect(s.login('fake', 'account-id', null, () => true)).rejects.toThrow('Sessione'); expect(store.rows.size).toBe(0);
    await login(s, 'a'); await s.leave('a');
    expect(await s.login('b', 'valid-a', { name: 'Altro', characterClass: 'mage', body: 'male' }, () => true)).toBe('entered');
    expect(s.profiles.get('b')!.character.name).toBe('Altro'); expect(s.profiles.get('b')!.character.characterClass).toBe('mage');
    expect(s.profiles.get('b')!.roster!.profiles.map(p=>p.character.name)).toEqual(['Viandante','Altro']);
  });
  it('rifiuta token falsi e doppio accesso concorrente allo stesso account', async () => {
    const { service: s } = service(); await expect(s.login('fake', 'account-id', seed, () => true)).rejects.toThrow('Sessione');
    const results = await Promise.allSettled([login(s, 'a', 'same'), login(s, 'b', 'same')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1); expect(s.world.characters.size).toBe(1);
  });
  it('una connessione chiusa mentre il provider risponde non lascia presenze o account occupati', async () => {
    const { store } = service(), s = new WorldService(store, auth);
    await s.login('old', 'valid-a', seed, () => false); expect(s.profiles.size).toBe(0);
    await login(s, 'new', 'a'); expect(s.world.characters.size).toBe(1);
  });
  it('un errore database non altera oro, oggetti o equipaggiamento in memoria', async () => {
    const { service: s, store } = service(); await login(s, 'a'); const before = s.profileMessage('a'); store.fail = true;
    await expect(s.command('a', { kind: 'buy', slot: 0 })).rejects.toThrow(); expect(s.profileMessage('a')).toEqual(before);
    store.fail = false; await s.command('a', { kind: 'buy', slot: 0 }); expect(s.profiles.get('a')!.gold).toBe(470);
  });
  it('azioni simultanee si serializzano senza perdere acquisti o duplicare il saldo', async () => {
    const { service: s } = service(); await login(s, 'a');
    await Promise.all([s.command('a', { kind: 'buy', slot: 0 }), s.command('a', { kind: 'craft', slot: 1 })]);
    const p = s.profiles.get('a')!; expect(p.gold).toBe(350); expect(p.character.inventory).toHaveLength(6); expect(p.revision).toBe(2);
  });
  it('rifiuta oggetti inventati, oro arbitrario, slot invalidi e comandi HUB durante il dungeon', async () => {
    const { service: s } = service(); await login(s, 'a');
    for (const command of [{ kind: 'equip', uid: 'inventato' }, { kind: 'gold', amount: 99999 }, { kind: 'buy', slot: -1 }, { kind: 'buy', slot: 0.5 }]) await expect(s.command('a', command)).rejects.toThrow();
    s.start('a', 'crypt', 'descent', 'run', 1); await expect(s.command('a', { kind: 'buy', slot: 0 })).rejects.toThrow('rifugio');
  });
  it('equipaggiamento e deposito passano dagli stessi vincoli del dominio e persistono', async () => {
    const { service: s, store } = service(); await login(s, 'a');
    const p = s.profiles.get('a')!, uid = p.character.equipped.primary_hand!;
    await expect(s.command('a', { kind: 'deposit', uid })).rejects.toThrow();
    await s.command('a', { kind: 'unequip', slot: 'primary_hand' }); await s.command('a', { kind: 'deposit', uid, target: 12 });
    expect(store.rows.get('valid-a')!.character.storagePositions[uid]).toBe(12);
    await s.command('a', { kind: 'withdraw', uid }); await s.command('a', { kind: 'equip', uid }); expect(p.character.equipped.primary_hand).toBe(uid);
  });
});
describe('scambi persistenti e premi', () => {
  it('i trasferimenti hanno identità diverse dopo un riavvio del mondo',async()=>{
    const {service:a}=service(),{service:b}=service();
    for(const s of [a,b]){await login(s,'one');await login(s,'two');s.world.hub.positions.get('two')!.position=s.world.hub.positions.get('one')!.position;s.world.hub.request('one','two');}
    expect(a.world.hub.tradeFor('one')!.id).not.toBe(b.world.hub.tradeFor('one')!.id);
  });
  it('una scrittura in uscita fallita conserva il profilo e si completa al ripristino del database',async()=>{
    const {service:s,store}=service();await login(s,'a');const room=s.start('a','crypt','descent','run',1);
    room.run!.players.get('a')!.xp=75;const snapshot=room.snapshot()!;store.fail=true;
    await expect(s.leave('a',snapshot)).rejects.toThrow();expect(s.world.characters.has('a')).toBe(false);expect(s.profiles.has('a')).toBe(true);
    await expect(login(s,'b','a')).rejects.toThrow('già connesso');store.fail=false;await s.retryDepartures();await login(s,'b','a');expect(s.profiles.get('b')!.character.totalXp).toBe(75);
  });
  it('le due conferme producono un unico commit con entrambi i profili; un fallimento non trasferisce nulla', async () => {
    const { service: s, store } = service(); await login(s, 'a'); await login(s, 'b');
    await s.command('a', { kind: 'buy', slot: 0 });
    s.world.hub.positions.get('b')!.position = s.world.hub.positions.get('a')!.position;
    const a = s.profiles.get('a')!, b = s.profiles.get('b')!, item = a.character.inventory.at(-1)!;
    const trade = async (fail: boolean) => {
      s.world.hub.request('a', 'b'); const request = s.world.hub.view('').requests![0]!;
      s.world.hub.acceptTrade('b', request.id, true); s.world.hub.offer('a', [item.uid]); const revision = s.world.hub.views()[0]!.revision;
      expect(await s.trade('a', revision)).toEqual([]); store.fail = fail; return s.trade('b', revision);
    };
    await expect(trade(true)).rejects.toThrow(); expect(a.character.itemByUid(item.uid)).toBeDefined(); expect(b.character.inventory).toHaveLength(4);
    store.fail = false; expect(await trade(false)).toEqual(['a', 'b']); expect(a.character.itemByUid(item.uid)).toBeUndefined(); expect(b.character.inventory).toHaveLength(5);
    expect(store.rows.get('valid-b')!.character.inventory).toHaveLength(5);
  });
  it('premi del server salvati una volta anche con snapshot finali ripetuti e riconnessione', async () => {
    const { service: s, store } = service(); await login(s, 'a'); const c = s.profiles.get('a')!.character; c.records.crypt = { clears: 1, bestTimeSeconds: 1 };
    const room = s.start('a', 'crypt', 'duel', 'run', 1); room.match!.end(true); room.tick(0); const snapshot = room.snapshot()!;
    await s.saveProgress('a', snapshot); const saved = s.profileMessage('a'); await s.saveProgress('a', snapshot); expect(s.profileMessage('a')).toEqual(saved);
    expect(store.rows.get('valid-a')!.character.totalXp).toBeGreaterThan(0);
    await s.leave('a', snapshot); await login(s, 'b', 'a'); expect(s.profileMessage('b').character).toBe(saved.character);
  });
  it('il checkpoint fallito si può riprovare senza avanzare il cursore o duplicare premi', async () => {
    const { service: s, store } = service(); await login(s, 'a'); const room = s.start('a', 'crypt', 'descent', 'run', 1);
    room.run!.players.get('a')!.xp = 50; const snapshot = room.snapshot()!; store.fail = true;
    await expect(s.saveProgress('a', snapshot)).rejects.toThrow(); expect(s.profiles.get('a')!.character.totalXp).toBe(0);
    store.fail = false; await s.saveProgress('a', snapshot); await s.saveProgress('a', snapshot); expect(s.profiles.get('a')!.character.totalXp).toBe(50);
  });
  it('la disconnessione rimuove subito l’avatar mentre il salvataggio termina in coda', async () => {
    const { service: s } = service(); await login(s, 'a'); await login(s, 'b'); const room = s.start('a', 'crypt', 'descent', 'run', 1); s.start('b', 'crypt', 'descent', 'unused', 2);
    const leaving = s.leave('a', room.snapshot()!); expect(s.world.characters.has('a')).toBe(false); expect(room.match!.players.has('a')).toBe(false); expect(room.playing).toBe(true); await leaving;
    expect(s.profiles.has('a')).toBe(false); s.world.tick(1); expect(room.match!.players.has('b')).toBe(true);
  });
  it('il payload del client non può assegnare XP o beni senza una regola del dominio', async () => {
    const store = new MemoryProfiles(), p = await store.load('a', seed), before = serializeCharacter(p.character);
    expect(() => applyCharacterCommand(p, { kind: 'replace', character: { totalXp: 9999999 }, gold: 99999999 })).toThrow(); expect(serializeCharacter(p.character)).toBe(before);
    const world = new WorldService(store, auth); await login(world, 'a'); const room = world.start('a', 'crypt', 'descent', 'run', 1);
    const cursor = applyRunProgress(p, 'absent', room.snapshot()!, emptyProgress()); expect(cursor).toEqual(emptyProgress());
    world.world.hub.inputs.set('a', { move: Vec2.ZERO, at: 0 });
  });
});
