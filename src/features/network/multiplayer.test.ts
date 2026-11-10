import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Character } from '../character/character';
import { DangerZone } from '../combat/danger-zone';
import { Projectile } from '../combat/projectile';
import { CRYPT } from '../dungeons/crypt';
import { Match, type PlayerIntent } from '../match/match';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { DungeonRoom } from './dungeon-room';
import { applySnapshot, cleanIntent, NETWORK, parseWire, snapshotOf } from './protocol';

function character(name = 'Alice', veteran = true): Character {
  const c = Character.createStarter(); c.completeCreation(name, 'female', 'mage');
  // Un veterano ha gia' battuto i boss: il duello e' aperto.
  if (veteran) for (const id of ['crypt', 'swamp', 'forge', 'glacier']) c.records[id] = { clears: 1, bestTimeSeconds: 60 };
  return c;
}
function room(): DungeonRoom { const r = new DungeonRoom('test'); r.enter('a', character()); r.enter('b', character('Bruno')); return r; }
function match(): Match {
  const m = new Match({ rng: new SeededRng(7), dungeon: CRYPT, loadout: MAGE_SKILLS, members: ['a', 'b'].map(id => ({ id, loadout: MAGE_SKILLS })) });
  m.boss!.attackTimer = 1e6; return m;
}
const idle: PlayerIntent = { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] };

describe('istanze pubbliche autorevoli', () => {
  it('avvio senza leader o prontezza e due giocatori nella stessa simulazione', () => {
    const r = room(); r.start('battle',1); expect(r.playing).toBe(true);expect(r.match!.players.size).toBe(2);
  });
  it('verifica il GS di ciascun giocatore senza cambiare il mondo su rifiuto', () => {
    const r = room();r.choose('forge');expect(()=>r.start('id',1)).toThrow('100 GS');expect(r.match).toBeNull();
    r.choose('glacier');expect(()=>r.start('id',1)).toThrow('200 GS');
  });
  it('destinazione stabile dopo l’avvio e ingresso tardivo nello stesso mondo', () => {
    const r = room();r.choose('swamp');r.start('battle',2);const time=r.match!.time;
    r.enter('c',character('Carlo'));expect(r.match!.players.size).toBe(3);expect(r.match!.time).toBe(time);expect(()=>r.choose('crypt')).toThrow('già iniziata');
  });
  it('capienza di 32 e dati non validi vengono controllati; nessun ruolo cambia all’uscita', () => {
    const r = room();expect(()=>r.enter('c',Character.createStarter())).toThrow('personaggio');
    for(let i=2;i<32;i++)r.enter(String(i),character('Eroe'));expect(()=>r.enter('full',character('Pieno'))).toThrow('completo');
    r.leave('a');expect(r.characters.has('b')).toBe(true);expect(r.characters.size).toBe(31);
  });
  it('un input scaduto ferma movimento e attacchi', () => {
    const r = room(); r.start('battle', 1);
    const p = r.match!.players.get('a')!; const before = p.position;
    r.inputs.set('a', { intent: { ...idle, move: new Vec2(1, 0) }, receivedAt: 0 }); r.tick(NETWORK.staleInputMs + 1);
    expect(p.position).toEqual(before); r.tick(1); expect(p.position.x).toBeGreaterThan(before.x);
  });
  it('la disconnessione rimuove il membro senza KO o attacchi premuti', () => {
    const r = room(); r.start('battle', 1); r.leave('a');
    expect(r.match!.players.has('a')).toBe(false); expect(r.playing).toBe(true);
  });
  it('i premi sono estratti una volta per membro e restano identici negli snapshot successivi', () => {
    const r = room(); r.chooseMode('duel', 0); r.start('battle', 7);
    r.match!.boss!.health.current = 1;
    r.match!.zones.push(new DangerZone(999, { team: 'player', damage: 10, radius: 100, delay: 0 }, r.match!.boss!.position));
    r.tick(0); const first = r.snapshot()!;
    expect(first.status).toBe('won'); expect(Object.keys(first.rewards)).toEqual(['a', 'b']);
    expect(first.rewards.a.length).toBeLessThanOrEqual(1); expect(first.rewards.b.length).toBeLessThanOrEqual(1);
    r.tick(1000); const next = r.snapshot()!;
    expect(next.rewards).toEqual(first.rewards); expect(next.time).toBe(first.time); expect(next.events).toEqual([]);
  });
});

describe('discesa in cooperativa', () => {
  /** Libera la stanza in corso e porta tutti sulla prima porta, prendendo i premi e scegliendo le tempre. */
  function clearAndExit(r: DungeonRoom): void {
    const run = r.run!;
    const match = run.match;
    for (let i = 0; i < 60 * 240 && !run.encounter.cleared && match.status === 'playing'; i++) {
      for (const p of match.players.values()) { if (!p.health.isDead) { p.health.current = p.health.max; p.invulnerableFor = 1; } }
      for (const m of match.minions) if (!m.isHidden) m.health.current = 0;
      if (match.boss !== null && !match.boss.health.isDead && i > 30) {
        match.boss.health.current = 1;
        match.zones.push(new DangerZone(700_000 + i, { team: 'player', damage: 10, radius: 80, delay: 0 }, match.boss.position));
      }
      r.tick(i);
    }
    for (let i = 0; i < 60 * 30 && run.match === match && match.status === 'playing'; i++) {
      const view = run.roomView();
      for (const [id, p] of match.players) {
        if (p.health.isDead) continue;
        if (view.offers[id]) r.chooseTemper(id, 0);
        if (view.pacts.includes(id)) r.answerPact(id, false);
        const pickup = view.pickups.find((q) => !q.takenBy.includes(id) && q.kind !== 'anvil');
        p.position = pickup !== undefined && i < 600 ? new Vec2(pickup.x, pickup.y) : run.encounter.doors[0]!.position;
      }
      r.tick(i);
    }
  }

  it('la modalità è validata e il duello chiede il boss già battuto da tutti', () => {
    const r = new DungeonRoom('d'); r.enter('a', character()); r.enter('b', character('Bruno', false));
    expect(r.mode).toBe('descent');
    r.chooseMode('duel', 0);expect(r.mode).toBe('duel');
    expect(() => r.chooseMode('arena', 0)).toThrow('Modalità');
    expect(() => r.chooseMode('descent', 9)).toThrow('tempra');
    r.chooseMode('duel', 0); expect(() => r.start('x', 1)).toThrow('Bruno: il duello');
    expect(() => r.chooseMode('descent', 1)).toThrow('tempra');
    r.chooseMode('pilgrimage', 0); expect(() => r.start('x', 1)).toThrow('GS');
    expect(r.state()).toMatchObject({ mode: 'pilgrimage', grade: 0 });
  });

  it('una discesa intera sul server: stanze nuove per la rete, nessuna ricompensa intermedia, bottino per giocatore', () => {
    const r = room(); r.start('run', 11);
    const first = r.snapshot()!;
    expect(first.id).toBe('run:1'); expect(first.boss).toBeNull(); expect(first.room?.kind).toBe('threshold');
    expect(first.run?.stage).toBe(0); expect(first.setup.arena).not.toBeNull();
    const ids = new Set<string>([first.id]);
    for (let room = 0; room < 12 && r.playing; room++) {
      clearAndExit(r);
      const snapshot = r.snapshot()!;
      ids.add(snapshot.id);
    }
    expect(r.playing).toBe(false);
    expect(r.run!.status).toBe('won');
    expect(ids.size).toBe(8);
    const last = r.snapshot()!;
    expect(last.status).toBe('won');
    expect(Object.keys(last.rewards).sort()).toEqual(['a', 'b']);
    expect(last.run!.players.a!.tempers).toEqual([]);
    expect(last.run!.players.a!.xp).toBe(104); // Boss e luogotenente; la fixture rimuove gli altri servitori senza ucciderli.
    expect(last.run!.players.a!.embers).toBe(0);
    expect(last.run!.victories).toHaveLength(1);
    expect(() => r.chooseTemper('a', 0)).toThrow();
  });

  it('chi si disconnette a meta\' discesa scompare e non entra nelle stanze dopo', () => {
    const r = room(); r.start('run', 4);
    r.leave('b');
    expect(r.run!.match.players.has('b')).toBe(false);
    clearAndExit(r);
    expect(r.run!.match.players.has('b')).toBe(false);
    expect(r.playing).toBe(true);
  });
});

describe('combattimento cooperativo', () => {
  it('proiettili e zone alleate non feriscono gli alleati; le zone del boss colpiscono entrambi', () => {
    const m = match(), position = m.player.position;
    m.projectiles.push(new Projectile(99, { team: 'player', speed: 0, damage: 50, radius: 20, lifetime: 2, visual: 'arcane_bolt' }, position, 0));
    m.zones.push(new DangerZone(100, { team: 'player', damage: 50, radius: 50, delay: 0 }, position)); m.stepParty(NETWORK.step, new Map());
    for (const p of m.players.values()) expect(p.health.current).toBe(100);
    m.zones.push(new DangerZone(101, { team: 'enemy', damage: 23, radius: 50, delay: 0 }, position)); m.stepParty(NETWORK.step, new Map());
    for (const [id, p] of m.players) { expect(p.health.current).toBe(77); expect(m.report.get(id)!.damageReceived).toBe(23); }
  });
  it('i proiettili nemici colpiscono anche il secondo giocatore', () => {
    const m = match(); m.players.get('b')!.position = m.player.position.add(new Vec2(100, 0));
    m.projectiles.push(new Projectile(1, { team: 'enemy', speed: 0, damage: 14, radius: 5, lifetime: 2, visual: 'arcane_bolt' }, m.players.get('b')!.position, 0));
    m.stepParty(NETWORK.step, new Map()); expect(m.players.get('b')!.health.current).toBe(86); expect(m.player.health.current).toBe(100);
  });
  it('un KO non ferma gli altri; sconfitta solo quando tutti sono KO', () => {
    const m = match(); m.player.health.current = 0; m.stepParty(NETWORK.step, new Map()); expect(m.status).toBe('playing');
    m.players.get('b')!.health.current = 0; m.stepParty(NETWORK.step, new Map()); expect(m.status).toBe('lost');
  });
  it('carica e contatto possono danneggiare un alleato diverso dal bersaglio', () => {
    const m = match(), b = m.players.get('b')!; b.position = m.boss!.position; m.player.position = m.boss!.position.add(new Vec2(120, 0));
    m.boss!.charge = { start: m.boss!.position, target: m.boss!.position.add(new Vec2(300, 0)), elapsed: 1, windup: 0, duration: 1000 };
    m.stepParty(NETWORK.step, new Map()); expect(b.health.current).toBeLessThan(100); expect(m.player.health.current).toBe(100);
  });
  it('attribuisce il danno di skill al proprietario e limita il report agli HP effettivi', () => {
    const m = match(); const b = m.players.get('b')!; b.position = m.boss!.position.sub(new Vec2(80, 0)); m.boss!.health.current = 1;
    for (let i = 0; i < 60 && m.status === 'playing'; i++) m.stepParty(NETWORK.step, new Map([['b', { ...idle, aimOffset: m.boss!.position.sub(b.position), skills: [true, false, false, false] }]]));
    expect(m.status).toBe('won'); expect(m.report.get('b')!.damageDealt).toBe(1); expect(m.report.get('a')!.damageDealt).toBe(0);
    expect(m.report.get('b')!.healing).toBe(0);
  });
  it('snapshot dopo JSON ripristina vettori, vita, mana, ricariche e boss identici', () => {
    const m = match(); m.stepParty(NETWORK.step, new Map([['b', { ...idle, move: new Vec2(1, 0), skills: [true, false, false, false] }]]));
    const snapshot = snapshotOf(m, 'id', [], {}); const decoded = parseWire(JSON.stringify(snapshot)) as typeof snapshot;
    const replica = match(); replica.viewPlayerId = 'b'; applySnapshot(replica, decoded);
    expect(replica.player.position).toEqual(m.players.get('b')!.position); expect(replica.player.position.distanceTo(Vec2.ZERO)).toBeGreaterThan(0);
    expect(replica.player.mana).toBe(m.players.get('b')!.mana); expect(replica.player.skillBar.cooldowns()).toEqual(m.players.get('b')!.skillBar.cooldowns());
    expect(replica.boss!.position).toEqual(m.boss!.position); expect(replica.projectiles).toHaveLength(m.projectiles.length);
  });
  it('rifiuta input non finiti e skill arbitrarie; normalizza movimento e limita la mira', () => {
    expect(cleanIntent({ ...idle, move: { x: Infinity, y: 0 } })).toBeNull(); expect(cleanIntent({ ...idle, skills: ['hack'] })).toBeNull();
    const clean = cleanIntent({ ...idle, move: { x: 100, y: 100 }, aimOffset: { x: 1e9, y: -1e9 } })!;
    expect(clean.move.length()).toBeCloseTo(1); expect(clean.aimOffset.x).toBe(6000);
  });
});

describe('luogotenenti in cooperativa', () => {
  it('ogni luogotenente (anche quelli delle vene) si ritrova per id: il client lo disegna con la sua vita', async () => {
    const { LIEUTENANTS } = await import('../run/lieutenants');
    const { VEIN_LIEUTENANTS } = await import('../run/vein-lieutenants');
    const { replicaMatch, setupOf, bossById } = await import('./protocol');
    const { dungeonById } = await import('../dungeons/dungeons');
    const { roomArena, ROOM_TEMPLATES } = await import('../run/room-templates');
    const all = [...Object.entries(LIEUTENANTS).map(([dungeonId, l]) => [dungeonId, l] as const), ...Object.entries(VEIN_LIEUTENANTS).flatMap(([dungeonId, veins]) => Object.values(veins).map((l) => [dungeonId, l] as const))];
    expect(all.length).toBe(12);
    for (const [dungeonId, lieutenant] of all) {
      expect(bossById(lieutenant.id), lieutenant.id).toBe(lieutenant);
      const dungeon = dungeonById(dungeonId)!;
      const template = ROOM_TEMPLATES[dungeonId]!.find((room) => room.use === 'calm')!;
      const server = new Match({ rng: new SeededRng(3), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, dungeon.arena.theme), boss: lieutenant });
      const client = replicaMatch(dungeon, setupOf(server), [{ id: 'local', loadout: MAGE_SKILLS }]);
      expect(client.boss?.definition.id, lieutenant.id).toBe(lieutenant.id);
      expect(client.boss?.health.max).toBe(server.boss!.health.max);
    }
  });
});
