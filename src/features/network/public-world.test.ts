import { describe, expect, it } from 'vitest';
import { Character } from '../character/character';
import { PublicWorld } from './public-world';
import { HubEncoder, HubDecoder } from './hub-codec';
import { SnapshotEncoder, SnapshotDecoder } from './snapshot-codec';
import { applySnapshot, replicaMatch } from './protocol';
import { Vec2 } from '../../core/vec2';
import { hubBlocked } from '../character/hub-state';
import { NetworkView } from '../presentation/network-view';

function hero(name = 'Eroe'): Character { const c = Character.createStarter(); c.completeCreation(name, 'male', 'mage'); return c; }
describe('mondo pubblico persistente', () => {
  it('64 accessi automatici allo stesso HUB, spawn validi e nessun leader o pronto', () => {
    const world = new PublicWorld();
    for (let i = 0; i < 64; i++) world.enter(String(i), hero());
    expect(world.id).toBe('HUB'); expect(world.characters.size).toBe(64);
    expect(world.locations.size).toBe(0);
    for (const p of world.hub.positions.values()) expect(hubBlocked(p.position)).toBe(false);
    expect(() => world.enter('overflow', hero())).toThrow('pieno');
  });
  it('uscita immediata, nessun KO e HUB ancora esistente dopo l’ultimo giocatore', () => {
    const world = new PublicWorld(); world.enter('a', hero()); world.enter('b', hero());
    world.leave('a'); expect(world.hub.view('').players.map(p => p.id)).toEqual(['b']);
    world.leave('b'); expect(world.id).toBe('HUB'); expect(world.hub.positions.size).toBe(0);
    world.enter('c', hero()); expect(world.characters.size).toBe(1);
  });
  it('il portale ammette ingressi tardivi nella stessa discesa pubblica e mantiene gli altri nell’HUB', () => {
    const world = new PublicWorld(); for (const id of ['a', 'b', 'c']) world.enter(id, hero());
    const room = world.start('a', 'crypt', 'descent', 'run', 12); world.tick(0);
    const time = room.match!.time;
    expect(world.start('b', 'crypt', 'descent', 'unused', 99)).toBe(room);
    expect(room.match!.time).toBe(time); expect([...room.match!.players.keys()]).toEqual(['a', 'b']);
    expect(world.hub.present.get('c')).toBe(true); expect(world.hub.present.get('a')).toBe(false);
    world.leave('a'); expect(room.match!.players.has('a')).toBe(false); expect(room.playing).toBe(true);
    world.tick(1); expect(room.match!.time).toBeGreaterThan(time);
  });
  it('il movimento di 32 giocatori resta deterministico, input scaduti fermi e nessuna dipendenza dal rendering', () => {
    const worlds = [new PublicWorld(), new PublicWorld()];
    for (const world of worlds) for (let i = 0; i < 32; i++) { world.enter(String(i), hero()); world.hub.inputs.set(String(i), { move: new Vec2(i % 2 ? 1 : -1, 0), at: 0 }); }
    for (let step = 0; step < 120; step++) for (const world of worlds) world.tick(step * 1000 / 60);
    expect(worlds[0]!.hub.view('')).toEqual(worlds[1]!.hub.view(''));
    const before = worlds[0]!.hub.positions.get('0')!.position; worlds[0]!.tick(3000); expect(worlds[0]!.hub.positions.get('0')!.position).toEqual(before);
  });
});
describe('codec ordinato e interpolazione HUB', () => {
  it('profili una volta, tuple a 30 Hz, ingresso tardivo completo e rimozioni esplicite', () => {
    const world = new PublicWorld(); for (let i = 0; i < 32; i++) world.enter(String(i), hero());
    const encoder = new HubEncoder(), decoder = new HubDecoder();
    const first = encoder.encode(world.hub.view('')); expect(first.a).toHaveLength(32); expect(decoder.decode(first).players).toHaveLength(32);
    world.hub.inputs.set('0', { move: new Vec2(1, 0), at: 0 }); world.tick(0);
    const frame = encoder.encode(world.hub.view('')); expect(frame.a).toBeUndefined(); expect(frame.p).toHaveLength(32); decoder.decode(frame);
    expect(JSON.stringify(frame).length).toBeLessThan(JSON.stringify(first).length / 8);
    const late = new HubDecoder().decode(new HubEncoder().encode(world.hub.view(''))); expect(late.players).toHaveLength(32);
    world.leave('0'); const removal = encoder.encode(world.hub.view('')); expect(removal.r).toEqual(['0']); expect(decoder.decode(removal).players).toHaveLength(31);
  });
  it('un salto nella sequenza è un errore esplicito', () => {
    const world = new PublicWorld(), encoder = new HubEncoder(), decoder = new HubDecoder(); world.enter('a', hero());
    decoder.decode(encoder.encode(world.hub.view(''))); encoder.encode(world.hub.view(''));
    expect(() => decoder.decode(encoder.encode(world.hub.view('')))).toThrow('ordine');
  });
  it('interpola le posizioni, conserva le coordinate autorevoli e rimuove subito i disconnessi', () => {
    const world = new PublicWorld(); world.enter('a', hero()); const view = new NetworkView.Hub();
    const players = world.hub.view('').players; view.accept(players, 0);
    view.accept(players.map(p => ({ ...p, x: p.x + 20 })), 40);
    expect(view.sample(40 + 1000 / 60)[0]!.x).toBeCloseTo(players[0]!.x + 10);
    expect(players[0]!.x).toBe(world.hub.positions.get('a')!.position.x);
    view.accept([], 60); expect(view.sample(60)).toEqual([]);
  });
  it('il codec dungeon conserva le identità quando un giocatore entra o esce durante un incontro', () => {
    const world = new PublicWorld(); world.enter('a', hero()); world.enter('b', hero());
    const room = world.start('a', 'crypt', 'descent', 'run', 1), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    const first = decoder.decode(encoder.encode(room.snapshot()!));
    const replica = replicaMatch(room.match!.dungeon, first.setup, [{ id: 'a', loadout: hero().loadout() }]); applySnapshot(replica, first);
    world.start('b', 'crypt', 'descent', 'unused', 2);
    const joined = encoder.encode(room.snapshot()!); expect(joined.roster?.[0]).toEqual(['a', 'b']); applySnapshot(replica, decoder.decode(joined));
    expect(replica.players.has('b')).toBe(true);
    world.leave('b'); applySnapshot(replica, decoder.decode(encoder.encode(room.snapshot()!))); expect(replica.players.has('b')).toBe(false);
  });
});
