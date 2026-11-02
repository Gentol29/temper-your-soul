import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { CRYPT } from '../dungeons/crypt';
import { Match } from '../match/match';
import { BELFRY_BAT } from '../minions/catalog/crypt';
import { Minion } from '../minions/minion';
import { createQuietMatch, eventsOfType, intent, recordEvents, run, STEP } from '../../testing';
import { Projectile } from './projectile';

const ORB = { team: 'enemy' as const, speed: 0, damage: 12, radius: 5, lifetime: 4, visual: 'crypt_wax' };
function room(): Match {
  const match = new Match({ dungeon: CRYPT, rng: new SeededRng(1), loadout: [], boss: null });
  match.player.position = new Vec2(1600, 1400);
  return match;
}
function bat(match: Match, id = 9000, interval?: number): Minion {
  const minion = new Minion(id, { ...BELFRY_BAT, speed: 0, contactInterval: interval }, match.player.position);
  match.minions.push(minion);
  return minion;
}

describe('ritmo del danno fisico dei nemici', () => {
  for (const hz of [60, 120]) it(`un pipistrello sovrapposto colpisce tre volte in due secondi a ${hz} Hz`, () => {
    const match = room(); bat(match);
    const events = recordEvents(match);
    for (let i = 0; i < 2 * hz; i++) match.step(1 / hz, intent(match));
    expect(match.player.health.current).toBe(85);
    expect(eventsOfType(events, 'damage_dealt')).toHaveLength(3);
    expect(match.player.isInvulnerable).toBe(false);
  });
  it('due mob hanno ritmi indipendenti e possono colpire nello stesso passo', () => {
    const match = room(); bat(match); bat(match, 9001);
    match.step(STEP, intent(match));
    expect(match.player.health.current).toBe(90);
    run(match, 0.7); expect(match.player.health.current).toBe(90);
    run(match, 0.1); expect(match.player.health.current).toBe(80);
  });
  it('uscire e rientrare non azzera il recupero; il dato può configurare ogni famiglia', () => {
    const match = room(); const minion = bat(match, 9000, 1.2);
    match.step(STEP, intent(match));
    minion.position = new Vec2(1800, 1400); run(match, 0.2);
    minion.position = match.player.position; run(match, 0.9);
    expect(match.player.health.current).toBe(95);
    run(match, 0.1); expect(match.player.health.current).toBe(90);
  });
  it('una parata consuma il tentativo melee ma un orb separato può colpire subito', () => {
    const match = room(); bat(match); match.player.addBuff({ guard: true, duration: 1 });
    match.step(STEP, intent(match)); expect(match.player.health.current).toBe(100);
    match.projectiles.push(new Projectile(100, ORB, match.player.position, 0));
    match.step(STEP, intent(match)); expect(match.player.health.current).toBe(88);
    run(match, 0.7); expect(match.player.health.current).toBe(88);
  });
  it('il boss non ripete il contatto per ogni frame e recupera dopo un secondo', () => {
    const match = createQuietMatch(); const boss = match.boss!;
    boss.position = match.player.position; boss.rootFor = 10;
    match.step(STEP, intent(match)); const after = match.player.health.current;
    run(match, 0.9); expect(match.player.health.current).toBe(after);
    run(match, 0.1); expect(match.player.health.current).toBe(after - boss.stats.contactDamage);
  });
  it('la carica del boss e il contatto condividono il recupero fisico', () => {
    const match = createQuietMatch(); const boss = match.boss!;
    boss.position = match.player.position;
    boss.charge = { start: boss.position, target: boss.position, elapsed: 0, windup: 0, duration: 0.7 };
    const events = recordEvents(match); run(match, 0.5);
    expect(eventsOfType(events, 'damage_dealt').filter(e => e.target === 'player')).toHaveLength(1);
    expect(match.player.health.current).toBe(100 - boss.stats.chargeDamage);
  });
});

describe('orb consumati al primo impatto', () => {
  it('un orb fermo sovrapposto scompare e non ripete il danno nei passi successivi', () => {
    const match = room(); const events = recordEvents(match);
    match.projectiles.push(new Projectile(100, ORB, match.player.position, 0));
    run(match, 1); expect(match.player.health.current).toBe(88);
    expect(match.projectiles).toHaveLength(0);
    expect(eventsOfType(events, 'projectile_hit')).toHaveLength(1);
    expect(eventsOfType(events, 'damage_dealt')).toHaveLength(1);
  });
  it('un orb veloce non attraversa il giocatore fra due passi', () => {
    const match = room();
    match.projectiles.push(new Projectile(100, { ...ORB, speed: 12000 }, match.player.position.add(new Vec2(-100, 0)), 0));
    match.step(STEP, intent(match)); expect(match.player.health.current).toBe(88);
    expect(match.projectiles).toHaveLength(0);
  });
  it('un orb già sul corpo viene assorbito anche se il passo lo porterebbe fuori', () => {
    const match = room();
    match.projectiles.push(new Projectile(100, { ...ORB, speed: 6000 }, match.player.position, 0));
    match.step(STEP, intent(match)); expect(match.player.health.current).toBe(88);
    expect(match.projectiles).toHaveLength(0);
  });
  it('in cooperativa il primo corpo lungo la traiettoria assorbe il colpo, non tutti i membri', () => {
    const match = new Match({ dungeon: CRYPT, rng: new SeededRng(1), loadout: [], boss: null,
      members: [{ id: 'far', loadout: [] }, { id: 'near', loadout: [] }] });
    const far = match.players.get('far')!, near = match.players.get('near')!;
    near.position = new Vec2(1500, 1400); far.position = new Vec2(1600, 1400);
    match.projectiles.push(new Projectile(100, { ...ORB, speed: 18000 }, new Vec2(1400, 1400), 0));
    match.stepParty(STEP, new Map());
    expect(near.health.current).toBe(88); expect(far.health.current).toBe(100);
    expect(match.projectiles).toHaveLength(0);
  });
});
