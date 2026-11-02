import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { pillarAt } from '../arena/arena';
import { HIT_RADIUS } from '../combat/collision';
import { Projectile } from '../combat/projectile';
import { CRYPT, CRYPT_ARENA } from '../dungeons/crypt';
import { DUNGEONS } from '../dungeons/dungeons';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import type { SkillDefinition } from '../skills/skill-definition';
import { createQuietMatch, eventsOfType, intent, recordEvents, run, STEP } from '../../testing';
import { Minion } from './minion';
import { CINDER_WISP, FROST_SENTINEL, MINIONS, SPORELING } from './minion-catalog';
import type { MinionDefinition } from './minion-definition';
import type { Match } from '../match/match';

/** Porta il boss appena sotto la soglia della furia e fa un passo: entra in fase 2 ed evoca. */
function enrage(match: Match): void {
  match.boss!.health.current = match.boss!.health.max * match.boss!.stats.phaseTwoThreshold - 1;
  match.step(STEP, intent(match));
}

/** Mette un servitore in partita a mano (per provare un comportamento alla volta). */
function place(match: Match, definition: MinionDefinition, position: Vec2): Minion {
  const minion = new Minion(9000 + match.minions.length, definition, position);
  match.minions.push(minion);
  return minion;
}

const PLAYER_SHOT = { team: 'player' as const, speed: 0, damage: 25, radius: 4, lifetime: 2, visual: 'arcane_bolt' };

describe('servitori: evocazione', () => {
  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: entrando in furia il boss evoca i suoi servitori, dentro l'arena e fuori dai pilastri`, () => {
      const summons = dungeon.boss.summons;
      expect(summons, 'ogni boss ha dei servitori').toBeDefined();
      const match = createQuietMatch(1, { dungeon });
      const events = recordEvents(match);
      enrage(match);
      expect(match.boss!.phase).toBe(2);
      expect(match.minions).toHaveLength(summons!.onRage);
      expect(eventsOfType(events, 'minion_spawned')).toHaveLength(summons!.onRage);
      const { arena } = dungeon;
      for (const minion of match.minions) {
        expect(minion.definition.id).toBe(summons!.minion.id);
        expect(pillarAt(arena, minion.position, minion.hitRadius - 0.5)).toBeUndefined();
        expect(minion.position.x).toBeGreaterThanOrEqual(arena.playerMargin);
        expect(minion.position.y).toBeLessThanOrEqual(arena.height - arena.playerMargin);
      }
      expect(Object.hasOwn(MINIONS, summons!.minion.id)).toBe(true);
    });
  }

  it('in furia ne arrivano altri ogni tot attacchi, mai oltre il massimo dei vivi', () => {
    // Palude: gli sporelli inseguono senza esplodere, quindi restano vivi e si accumulano.
    const swamp = DUNGEONS.find((dungeon) => dungeon.id === 'swamp')!;
    const match = createQuietMatch(3, { dungeon: swamp });
    const events = recordEvents(match);
    enrage(match);
    const summons = swamp.boss.summons!;
    match.boss!.attackTimer = 0;
    for (let i = 0; i < 60 * 60; i++) {
      match.player.invulnerableFor = 1;
      match.player.health.current = 100;
      match.step(STEP, intent(match));
      expect(match.minions.length).toBeLessThanOrEqual(summons.maxAlive);
    }
    expect(match.minions.length).toBe(summons.maxAlive);
    expect(eventsOfType(events, 'minion_spawned').length).toBe(summons.maxAlive);
  });

  it('i valori dei servitori sono limitati: niente colpi che uccidono e vita positiva', () => {
    for (const minion of Object.values(MINIONS)) {
      expect(minion.maxHealth, minion.id).toBeGreaterThan(0);
      expect(minion.contactDamage, minion.id).toBeLessThanOrEqual(20);
      expect(minion.hitRadius, minion.id).toBeGreaterThanOrEqual(6);
      if (minion.shot) expect(minion.shot.projectile.damage, minion.id).toBeLessThanOrEqual(15);
      if (minion.behavior === 'turret') expect(minion.speed).toBe(0);
    }
  });
});

describe('servitori: comportamento', () => {
  it('chi insegue si avvicina e ferisce a contatto, senza invulnerabilità dopo il colpo', () => {
    const match = createQuietMatch(1);
    const events = recordEvents(match);
    match.player.position = new Vec2(1600, 1400);
    const sporeling = place(match, SPORELING, new Vec2(1600, 1300));
    const start = sporeling.position.distanceTo(match.player.position);
    run(match, 0.5);
    expect(sporeling.position.distanceTo(match.player.position)).toBeLessThan(start);
    run(match, 2);
    const hits = eventsOfType(events, 'damage_dealt').filter((event) => event.target === 'player');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toMatchObject({ amount: SPORELING.contactDamage, source: { kind: 'minion', name: SPORELING.name } });
    expect(hits.length).toBeLessThanOrEqual(4);
    expect(match.player.isInvulnerable).toBe(false);
  });

  it('il kamikaze esplode al contatto: ferisce, muore e lo dice', () => {
    const match = createQuietMatch(1);
    const events = recordEvents(match);
    match.player.position = new Vec2(1600, 1400);
    place(match, CINDER_WISP, match.player.position.add(new Vec2(0, -(CINDER_WISP.hitRadius + HIT_RADIUS.player - 2))));
    match.step(STEP, intent(match));
    expect(match.player.health.current).toBe(100 - CINDER_WISP.contactDamage);
    expect(match.minions).toHaveLength(0);
    expect(eventsOfType(events, 'minion_defeated')[0]).toMatchObject({ exploded: true, visual: CINDER_WISP.visual });
  });

  it('la sentinella resta ferma e spara verso il giocatore a intervalli', () => {
    const match = createQuietMatch(1);
    match.player.position = new Vec2(1600, 1400);
    const sentinel = place(match, FROST_SENTINEL, new Vec2(1300, 1400));
    run(match, FROST_SENTINEL.shot!.firstDelay + 0.05);
    expect(sentinel.position).toEqual(new Vec2(1300, 1400));
    const shots = match.projectiles.filter((p) => p.team === 'enemy');
    expect(shots).toHaveLength(1);
    expect(Math.abs(shots[0]!.velocity.angle())).toBeLessThan(0.01);
  });
});

describe('servitori: si possono colpire', () => {
  it('un proiettile del giocatore si ferma sul servitore prima del boss (fa da scudo) e conta nei danni', () => {
    const match = createQuietMatch(1);
    const events = recordEvents(match);
    match.boss!.position = new Vec2(1600, 1100);
    const wisp = place(match, CINDER_WISP, new Vec2(1600, 1180));
    match.player.position = new Vec2(1600, 1400);
    match.projectiles.push(new Projectile(1, PLAYER_SHOT, wisp.position, 0));
    match.step(STEP, intent(match));
    expect(wisp.health.current).toBe(CINDER_WISP.maxHealth - 25);
    expect(match.boss!.health.current).toBe(match.boss!.health.max);
    expect(eventsOfType(events, 'projectile_hit')[0]).toMatchObject({ struck: 'minion' });
    expect(eventsOfType(events, 'damage_dealt')[0]).toMatchObject({ target: 'minion', amount: 25, minionId: wisp.id });
    expect(match.report.get('local')!.damageDealt).toBe(25);
  });

  it('colpo ravvicinato e zone del giocatore feriscono anche i servitori; alla morte del servitore c\'e\' l\'evento', () => {
    const slash: SkillDefinition = { id: 'test_slash', name: 'Fendente', description: 'prova', cooldown: 0.1, visual: 'test_slash', effect: { kind: 'melee_arc', range: 60, arc: Math.PI / 2, damage: 80 } };
    const match = createQuietMatch(1, { loadout: [slash, null, null, null] });
    const events = recordEvents(match);
    match.player.position = new Vec2(1600, 1400);
    match.boss!.position = new Vec2(1000, 600);
    place(match, CINDER_WISP, match.player.position.add(new Vec2(50, 0)));
    match.step(STEP, { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [true, false, false, false] });
    expect(match.minions).toHaveLength(0);
    expect(eventsOfType(events, 'minion_defeated')).toHaveLength(1);
    expect(eventsOfType(events, 'minion_defeated')[0]!.exploded).toBeUndefined();
  });

  it('quando il boss cade cadono anche i servitori', () => {
    const match = createQuietMatch(1);
    const events = recordEvents(match);
    enrage(match);
    const count = match.minions.length;
    expect(count).toBeGreaterThan(0);
    match.boss!.health.current = 1;
    match.boss!.position = new Vec2(2400, 600);
    match.projectiles.push(new Projectile(1, PLAYER_SHOT, match.boss!.position, 0));
    match.step(STEP, intent(match));
    expect(match.status).toBe('won');
    expect(match.minions).toHaveLength(0);
    expect(eventsOfType(events, 'minion_defeated').length).toBeGreaterThanOrEqual(count);
  });
});

describe('eventi per la rappresentazione: colpi, mancati e fonti dei danni', () => {
  it('projectile_hit dice cosa ha colpito: boss, giocatore o ostacolo', () => {
    const pillar = new Vec2(1500, 1350);
    const withPillar: DungeonDefinition = { ...CRYPT, arena: { ...CRYPT_ARENA, pillars: [{ position: pillar, radius: 40 }] } };
    const match = createQuietMatch(1, { dungeon: withPillar });
    const events = recordEvents(match);
    match.boss!.position = new Vec2(2200, 800);
    match.player.position = new Vec2(1700, 1350);
    match.projectiles.push(new Projectile(1, PLAYER_SHOT, match.boss!.position, 0));
    match.projectiles.push(new Projectile(2, PLAYER_SHOT, pillar, 0));
    match.projectiles.push(new Projectile(3, { ...PLAYER_SHOT, team: 'enemy' }, match.player.position, 0));
    match.step(STEP, intent(match));
    expect(eventsOfType(events, 'projectile_hit').map((e) => e.struck).sort()).toEqual(['boss', 'obstacle', 'player']);
  });

  it('un proiettile del giocatore che finisce nel vuoto e\' un colpo mancato; quelli nemici no', () => {
    const match = createQuietMatch(1);
    const events = recordEvents(match);
    match.boss!.position = new Vec2(300, 300);
    match.projectiles.push(new Projectile(1, { ...PLAYER_SHOT, lifetime: 0.05 }, new Vec2(1600, 1600), 0));
    match.projectiles.push(new Projectile(2, { ...PLAYER_SHOT, team: 'enemy', lifetime: 0.05 }, new Vec2(1700, 1700), 0));
    run(match, 0.2);
    const faded = eventsOfType(events, 'projectile_faded');
    expect(faded).toHaveLength(1);
    expect(faded[0]).toMatchObject({ visual: 'arcane_bolt' });
    expect(match.projectiles).toHaveLength(0);
  });

  it('i danni subiti portano la fonte: schema del boss, contatto o carica', () => {
    const match = createQuietMatch(1);
    const events = recordEvents(match);
    match.player.position = new Vec2(1600, 1400);
    match.boss!.position = match.player.position.add(new Vec2(0, 10));
    match.step(STEP, intent(match));
    const contact = eventsOfType(events, 'damage_dealt').find((e) => e.target === 'player');
    expect(contact?.source).toEqual({ kind: 'contact', name: 'Contatto con il boss' });

    // Proiettile di uno schema: il nome viene dall'ultimo annuncio del boss.
    const attack = createQuietMatch(2);
    const attackEvents = recordEvents(attack);
    attack.boss!.attackTimer = 0;
    run(attack, 0.02);
    const announced = eventsOfType(attackEvents, 'boss_attack')[0]!;
    attack.player.invulnerableFor = 0;
    let hit;
    for (let i = 0; i < 60 * 6 && !hit; i++) {
      attack.boss!.attackTimer = 99;
      attack.step(STEP, intent(attack));
      hit = eventsOfType(attackEvents, 'damage_dealt').find((e) => e.target === 'player' && e.source?.kind !== 'contact');
    }
    expect(hit, 'lo schema colpisce il giocatore fermo').toBeDefined();
    expect(hit!.source!.name).toBe(announced.name);
  });
});
