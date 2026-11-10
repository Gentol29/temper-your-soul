import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Character } from '../character/character';
import type { CharacterClass } from '../character/character-class';
import { CRYPT } from '../dungeons/crypt';
import { Match, type MatchMember, type PlayerIntent } from '../match/match';
import { Projectile } from '../combat/projectile';
import { StatusRuntime } from '../combat/status-effects/status-runtime';
import { familyById, ITEM_FAMILIES } from '../items/item-families';
import { resolveItemSkill } from '../items/item';
import { SKILL_ICONS } from '../presentation/skill-icons';
import { snapshotOf, replicaMatch, applySnapshot } from '../network/protocol';
import { SnapshotEncoder, SnapshotDecoder } from '../network/snapshot-codec';
import { NetworkView } from '../presentation/network-view';
import { BLEEDING } from './archer/pet';
import { MINIONS } from '../minions/minion-catalog';
import { deserializeCharacter, serializeCharacter } from '../character/save-format';
import { DungeonRoom } from '../network/dungeon-room';

const STEP = 1 / 60;
function member(kind: CharacterClass): MatchMember {
  const character = Character.createStarter(kind); character.completeCreation(kind, 'male', kind);
  return { id: kind, characterClass: kind, loadout: character.loadout() };
}
function fixture(kind: CharacterClass, members = [member(kind)], rng = { next: () => 0 }): Match {
  const match = new Match({ dungeon: CRYPT, rng, members, loadout: [],
    arena: { ...CRYPT.arena, pillars: [], playerSpawn: new Vec2(500, 500), bossSpawn: new Vec2(700, 500) },
    boss: { ...CRYPT.boss, stats: { ...CRYPT.boss.stats, maxHealth: 10000, speed: 0, orbitSpeedFactor: 0, contactDistance: 0 } },
  });
  match.boss!.attackTimer = 999;
  return match;
}
const intent = (slot = -1, move = Vec2.ZERO): PlayerIntent => ({ move, aimOffset: new Vec2(300, 0), skills: [0, 1, 2, 3].map(index => index === slot) });
function cast(match: Match, id: string, slot: number): void { match.stepParty(0, new Map([[id, intent(slot)]])); }
function advance(match: Match, seconds: number): void { for (let i = 0; i < Math.round(seconds / STEP); i++) match.stepParty(STEP, new Map()); }
const enemyShot = (match: Match, red = false, offset = 0): Projectile => new Projectile(900 + match.projectiles.length,
  { team: 'enemy', speed: 0, damage: 100, radius: 5, lifetime: 2, visual: red ? 'boss_unstoppable' : 'arcane_bolt', unblockable: red },
  match.players.get('warrior')!.position.add(new Vec2(offset, 0)), 0);

describe('Guerriero: gli oggetti concedono il kit difensivo', () => {
  it('il personaggio già salvato riceve skill di classe senza rinominare famiglie o perdere equipaggiamento', () => {
    const character = Character.createStarter('warrior'); character.completeCreation('Tank salvato', 'male', 'warrior');
    const restored = deserializeCharacter(serializeCharacter(character))!;
    expect(restored.inventory).toEqual(character.inventory);
    const loadout = restored.loadout();
    expect(loadout.map(skill => skill?.effect.kind)).toEqual(['melee_arc', 'buff', 'buff', 'dash']);
    expect(loadout.map(skill => skill?.id)).toEqual(['guardian_blade', 'spirit_talisman', 'ember_aegis', 'bog_boots']);
    expect(new Set(ITEM_FAMILIES.map(family => family.skill.id)).size).toBe(25);
    for (const family of ITEM_FAMILIES) expect(SKILL_ICONS[family.skill.id], family.id).toBeDefined();
    expect(SKILL_ICONS.spirit_talisman.pixels).not.toEqual(SKILL_ICONS.frost_orb.pixels);
  });

  it('il fendente danneggia e cancella colpi ordinari, lasciando intatti quelli rossi', () => {
    const match = fixture('warrior'); match.boss!.position = new Vec2(580, 500);
    match.projectiles.push(enemyShot(match, false, 70), enemyShot(match, true, 90));
    cast(match, 'warrior', 0);
    expect(match.boss!.health.current).toBe(9964);
    expect(match.projectiles).toHaveLength(1); expect(match.projectiles[0].spec.unblockable).toBe(true);
    expect(match.player.mana).toBe(60);
  });

  it('il taunt forza boss e servitori a scegliere il tank; scadenza, distanza e KO lo annullano', () => {
    const match = fixture('warrior', [member('warrior'), member('mage')]);
    const tank = match.players.get('warrior')!, mage = match.players.get('mage')!;
    mage.position = new Vec2(680, 500);
    expect(match.nearestPlayer(match.boss!.position)).toBe(mage);
    cast(match, 'warrior', 0);
    expect(match.nearestPlayer(match.boss!.position)).toBe(tank);
    expect(match.nearestPlayer(new Vec2(650, 500))).toBe(tank);
    expect(match.nearestPlayer(new Vec2(1000, 500))).toBe(mage);
    tank.health.current = 0; expect(match.nearestPlayer(match.boss!.position)).toBe(mage);
    tank.health.current = 100; advance(match, 3.1); expect(match.nearestPlayer(match.boss!.position)).toBe(mage);
  });

  it('lo scudo assorbe esattamente un colpo rosso; il successivo supera l’invulnerabilità ordinaria', () => {
    const match = fixture('warrior'); let blocks = 0;
    match.events.connect(event => { if (event.type === 'guard_blocked') blocks++; });
    cast(match, 'warrior', 1); const health = match.player.health.current;
    match.projectiles.push(enemyShot(match, true)); match.stepParty(0, new Map());
    expect(match.player.health.current).toBe(health); expect(blocks).toBe(1); expect(match.player.guarding).toBe(false);
    match.player.invulnerableFor = 1;
    match.projectiles.push(enemyShot(match, true)); match.stepParty(0, new Map());
    expect(match.player.health.current).toBe(health - 71);
  });

  it('il buff rigenera HP contabilizzati nel report e la difesa temporanea scade', () => {
    const match = fixture('warrior'); match.player.health.current = 100;
    cast(match, 'warrior', 2); expect(match.player.buffValue('armor')).toBe(40);
    advance(match, 5);
    expect(match.player.health.current).toBeCloseTo(125); expect(match.report.get('warrior')!.healing).toBeCloseTo(25);
    expect(match.player.buffValue('armor')).toBe(0);
  });

  it('la carica percorre lo spazio nel tempo e colpisce lo stesso nemico una volta sola', () => {
    const match = fixture('warrior'); match.boss!.position = new Vec2(610, 500);
    cast(match, 'warrior', 3); expect(match.player.position.x).toBe(500);
    advance(match, 0.1); expect(match.player.position.x).toBeGreaterThan(500); expect(match.player.position.x).toBeLessThan(670);
    advance(match, 0.3); expect(match.player.rush).toBeNull(); expect(match.boss!.health.current).toBe(9965);
  });

  it('la corsa non attraversa un pilastro lungo il percorso', () => {
    const match = fixture('warrior');
    const pillar = CRYPT.arena.pillars[0];
    const blocked = new Match({ dungeon: CRYPT, rng: new SeededRng(1), members: [member('warrior')], loadout: [],
      arena: { ...match.arena, pillars: [{ ...pillar, position: new Vec2(550, 500), radius: 20 }] }, boss: null });
    blocked.player.position = new Vec2(500, 500); cast(blocked, 'warrior', 3); advance(blocked, 0.5);
    expect(blocked.player.position.x).toBeLessThan(550);
  });
});

describe('Mago: stati e canalizzazione', () => {
  it('il proc parte al 15%: 0,149 entra e 0,15 non entra; la bruciatura infligge danni periodici', () => {
    for (const [roll, proc] of [[0.149, true], [0.15, false]] as const) {
      const match = fixture('mage', [member('mage')], { next: () => roll });
      match.boss!.position = new Vec2(530, 493); cast(match, 'mage', 0); advance(match, 0.05);
      expect(match.classCombat.statuses.has('boss', 'burning')).toBe(proc);
      const hp = match.boss!.health.current; advance(match, 1);
      expect(match.boss!.health.current).toBeCloseTo(hp - (proc ? 8 : 0));
    }
  });

  it('acqua rallenta, terra immobilizza il movimento ordinario, vento aumenta il danno subito', () => {
    const match = fixture('mage');
    match.classCombat.applyHit('boss', 'mage', { status: 'soaked', duration: 3 });
    match.classCombat.applyHit('boss', 'mage', { status: 'rooted', duration: 1 });
    advance(match, 0.1);
    expect(match.boss!.slowFor).toBeGreaterThan(0); expect(match.boss!.rootFor).toBeGreaterThan(0);
    match.classCombat.applyHit('boss', 'mage', { status: 'exposed', duration: 4 });
    expect(match.classCombat.damageMultiplier('boss')).toBe(1.2);
    advance(match, 4.1); expect(match.classCombat.damageMultiplier('boss')).toBe(1);
  });

  it('la meteora attende il channeling, rallenta il movimento e paga il mana una sola volta', () => {
    const match = fixture('mage'); cast(match, 'mage', 2);
    expect(match.zones).toHaveLength(0); expect(match.player.mana).toBe(178);
    const start = match.player.position.x;
    match.stepParty(STEP, new Map([['mage', intent(-1, new Vec2(1, 0))]]));
    expect(match.player.position.x - start).toBeCloseTo(179 * 0.35 * STEP);
    advance(match, 0.7); expect(match.player.channel).toBeNull(); expect(match.zones).toHaveLength(1);
    expect(match.zones[0].spec.onHit?.status).toBe('burning');
  });

  it('il blink danneggia immediatamente all’arrivo e non crea una corsa', () => {
    const match = fixture('mage'); match.boss!.position = new Vec2(650, 500);
    cast(match, 'mage', 3);
    expect(match.player.position.x).toBe(625); expect(match.player.rush).toBeNull();
    expect(match.boss!.health.current).toBe(9907);
    expect(match.classCombat.statuses.has('boss', 'exposed')).toBe(true);
  });
});

describe('Arciere: compagno, sanguinamento e mobilità', () => {
  it('evoca il lupo che segue, acquisisce il marchio e attacca il bersaglio', () => {
    const match = fixture('archer'); cast(match, 'archer', 2);
    expect(match.classCombat.pets.size).toBe(1);
    advance(match, 0.5); expect(match.boss!.health.current).toBe(10000);
    cast(match, 'archer', 0); advance(match, 1);
    expect(match.classCombat.marks.get('archer')).toBe('boss');
    expect(match.classCombat.pets.get('archer')!.target).toBe('boss');
    expect(match.boss!.health.current).toBeLessThan(10000 - 14);
    expect(match.classCombat.statuses.has('boss', 'bleeding')).toBe(true);
  });

  it('il sanguinamento usa 20% di probabilità e danno per categoria; la rarità potenzia il morso', () => {
    const runtime = new StatusRuntime();
    expect(runtime.apply('boss', 'archer', { status: 'bleeding', chance: BLEEDING.chance }, { next: () => 0.199 })).toBe(true);
    expect(runtime.apply('minion:1', 'archer', { status: 'bleeding', chance: BLEEDING.chance }, { next: () => 0.2 })).toBe(false);
    expect(BLEEDING.boss).toBeLessThan(BLEEDING.lieutenant); expect(BLEEDING.lieutenant).toBeLessThan(BLEEDING.minion);
    const common = resolveItemSkill(familyById('reed_mantle')!, 'common').effect;
    const legendary = resolveItemSkill(familyById('reed_mantle')!, 'legendary').effect;
    if (common.kind !== 'summon' || legendary.kind !== 'summon') throw new Error('Atteso compagno');
    expect(legendary.pet.damage).toBe(common.pet.damage * 3);
  });

  it('il buff predatorio aumenta la cadenza e cura sulla perdita reale di HP del nemico', () => {
    const match = fixture('archer'); match.player.health.current = 50;
    cast(match, 'archer', 1); cast(match, 'archer', 0);
    const base = match.player.baseLoadout[0]!.cooldown;
    expect(match.player.skillBar.cooldowns()[0]).toBeCloseTo(base / 1.2 / 1.35);
    advance(match, 0.5); expect(match.player.health.current).toBeGreaterThan(50);
    expect(match.report.get('archer')!.healing).toBeGreaterThan(0);
  });

  it('le due cariche sono spendibili e recuperano una alla volta', () => {
    const match = fixture('archer'); cast(match, 'archer', 3); advance(match, 0.2);
    cast(match, 'archer', 3); advance(match, 0.2);
    expect(match.player.skillBar.availableCharges(3)).toBe(0);
    advance(match, 2.7); expect(match.player.skillBar.availableCharges(3)).toBe(1);
    advance(match, 3); expect(match.player.skillBar.availableCharges(3)).toBe(2);
  });

  it('il compagno svanisce alla scadenza e al KO del proprietario', () => {
    const match = fixture('archer'); cast(match, 'archer', 2); advance(match, 20.1);
    expect(match.classCombat.pets.size).toBe(0);
    const effect = member('archer').loadout[2]!.effect;
    if (effect.kind !== 'summon') throw new Error('Atteso compagno');
    match.classCombat.summon('archer', effect.pet); match.player.health.current = 0; match.classCombat.step(STEP);
    expect(match.classCombat.pets.size).toBe(0);
  });

  it('dopo una uccisione il lupo salta al prossimo nemico vicino', () => {
    const match = fixture('archer');
    const definition = Object.values(MINIONS).find(minion => !minion.dormant && !minion.burrow)!;
    const first = match.spawnMinion(definition, new Vec2(550, 500), { maxHealth: 10 });
    const next = match.spawnMinion(definition, new Vec2(600, 500), { maxHealth: 100 });
    cast(match, 'archer', 2);
    const pet = match.classCombat.pets.get('archer')!; pet.position = first.position;
    match.classCombat.applyHit(`minion:${first.id}`, 'archer', { mark: true });
    match.classCombat.step(0);
    expect(first.health.isDead).toBe(true);
    expect(pet.target).toBe(`minion:${next.id}`);
    expect(pet.position).toEqual(next.position);
  });

  it('il lupo acquisisce un nemico senza marchio e riparte quando arriva un nuovo bersaglio', () => {
    const match = fixture('archer'); match.boss!.health.current = 0;
    const definition = Object.values(MINIONS).find(minion => !minion.dormant && !minion.burrow && !minion.flying)!;
    cast(match, 'archer', 2);
    const pet = match.classCombat.pets.get('archer')!;
    match.classCombat.step(STEP); expect(pet.target).toBeNull();
    const first = match.spawnMinion(definition, pet.position.add(new Vec2(320, 0)), { maxHealth: 1000 });
    for (let i = 0; i < 120 && first.health.current === first.health.max; i++) match.classCombat.step(STEP);
    expect(pet.target).toBe(`minion:${first.id}`); expect(first.health.current).toBeLessThan(first.health.max);
    first.health.current = 0; match.classCombat.step(STEP); expect(pet.target).toBeNull();
    const next = match.spawnMinion(definition, pet.position.add(new Vec2(70, 0)), { maxHealth: 1000 });
    for (let i = 0; i < 120 && next.health.current === next.health.max; i++) match.classCombat.step(STEP);
    expect(pet.target).toBe(`minion:${next.id}`); expect(next.health.current).toBeLessThan(next.health.max);
  });

  it('nelle stanze con i massicci il lupo non salta attraverso un blocco', () => {
    const match = new Match({ dungeon: CRYPT, rng: { next: () => 0 }, members: [member('archer')], loadout: [],
      arena: { ...CRYPT.arena, pillars: [], solids: [{ x: 570, y: 380, width: 30, height: 240 }], playerSpawn: new Vec2(500, 700), bossSpawn: new Vec2(700, 900) },
      boss: null });
    const definition = Object.values(MINIONS).find(minion => !minion.dormant && !minion.burrow)!;
    const first = match.spawnMinion(definition, new Vec2(550, 500), { maxHealth: 10 });
    const next = match.spawnMinion(definition, new Vec2(620, 500), { maxHealth: 100 });
    cast(match, 'archer', 2);
    const pet = match.classCombat.pets.get('archer')!; pet.position = first.position;
    match.classCombat.applyHit(`minion:${first.id}`, 'archer', { mark: true });
    match.classCombat.step(0);
    expect(first.health.isDead).toBe(true);
    expect(pet.position.x).toBeLessThan(570);
    expect(next.health.current).toBe(100);
  });

  it('nelle stanze con i massicci il lupo aggira il blocco per raggiungere il bersaglio', () => {
    const solid = { x: 580, y: 380, width: 40, height: 240 };
    const match = new Match({ dungeon: CRYPT, rng: { next: () => 0 }, members: [member('archer')], loadout: [],
      arena: { ...CRYPT.arena, pillars: [], solids: [solid], playerSpawn: new Vec2(400, 500), bossSpawn: new Vec2(700, 900) },
      boss: null });
    const definition = Object.values(MINIONS).find(minion => !minion.dormant && !minion.burrow && !minion.flying)!;
    const target = match.spawnMinion(definition, new Vec2(700, 500), { maxHealth: 10000 });
    cast(match, 'archer', 2);
    const pet = match.classCombat.pets.get('archer')!; pet.position = new Vec2(520, 500); pet.target = `minion:${target.id}`;
    let reached = false;
    for (let i = 0; i < 240 && !reached; i++) {
      target.position = new Vec2(700, 500);
      match.classCombat.step(STEP);
      // Il corpo del lupo (raggio 8) tocca al piu' il blocco, senza entrarci.
      const nearest = new Vec2(Math.min(Math.max(pet.position.x, solid.x), solid.x + solid.width), Math.min(Math.max(pet.position.y, solid.y), solid.y + solid.height));
      expect(nearest.distanceTo(pet.position), `${pet.position.x},${pet.position.y}`).toBeGreaterThan(7.9);
      reached = target.health.current < 10000;
    }
    expect(reached).toBe(true);
  });

  it('la penetrazione danneggia anche un bersaglio protetto da scudo numerico', () => {
    const match = fixture('archer'); const definition = Object.values(MINIONS).find(minion => !minion.dormant && !minion.burrow)!;
    const minion = match.spawnMinion(definition, new Vec2(530, 493), { maxHealth: 100 }); minion.shield = 100;
    cast(match, 'archer', 0); advance(match, 0.05);
    expect(minion.health.current).toBeLessThan(minion.health.max);
    expect(match.classCombat.marks.get('archer')).toBe(`minion:${minion.id}`);
  });
});

it('il colpo speciale del boss è annunciato, rosso e non intercettabile', () => {
  const match = fixture('warrior'); let announced = false;
  match.events.connect(event => { if (event.type === 'boss_attack' && event.patternId === 'unstoppable_strike') announced = true; });
  advance(match, 10.1); expect(announced).toBe(true); expect(match.classCombat.snapshot().heavy).not.toBeNull();
  advance(match, 1.1); expect(match.projectiles.some(shot => shot.spec.unblockable && shot.spec.visual === 'boss_unstoppable')).toBe(true);
});

it('codec e replica visuale conservano compagno, stati, guardia, channeling e cariche', () => {
  const members = [member('warrior'), member('archer'), member('mage')];
  const match = fixture('warrior', members);
  cast(match, 'warrior', 1); cast(match, 'archer', 2); cast(match, 'mage', 2);
  match.classCombat.applyHit('boss', 'mage', { status: 'burning', duration: 4, damagePerSecond: 8 });
  const source = snapshotOf(match, 'skills', [], {});
  const frame = JSON.parse(JSON.stringify(new SnapshotEncoder().encode(source)));
  const decoded = new SnapshotDecoder().decode(frame);
  const replica = replicaMatch(CRYPT, source.setup, members); applySnapshot(replica, decoded);
  const view = new NetworkView(replica); view.accept(decoded, 0);
  expect(view.match.classCombat.snapshot()).toEqual(source.classState);
  expect(view.match.classCombat.snapshot().pets[0].position.distanceTo(match.player.position)).toBeGreaterThanOrEqual(0);
});

it('l’istanza pubblica avvia classi miste con skill e risorse di classe autorevoli', () => {
  const room = new DungeonRoom('classi');
  for (const kind of ['warrior', 'archer', 'mage'] as const) {
    const character = Character.createStarter(kind); character.completeCreation(kind, 'male', kind);
    character.recordVictory('crypt', 60);
    room.enter(kind,character); }
  room.chooseMode('duel', 0);
  room.start('mixed', 42);
  room.inputs.set('warrior', { intent: intent(1), receivedAt: 0 });
  room.inputs.set('archer', { intent: intent(2), receivedAt: 0 });
  room.inputs.set('mage', { intent: intent(2), receivedAt: 0 });
  room.tick(0);
  const snapshot = room.snapshot()!;
  expect(snapshot.classState!.players.find(player => player.id === 'warrior')!.guard).toBe(true);
  expect(snapshot.classState!.players.find(player => player.id === 'mage')!.channel).toBeGreaterThan(0);
  expect(snapshot.classState!.pets[0].owner).toBe('archer');
  expect(room.match!.players.get('mage')!.maxMana).toBe(200);
  expect(room.match!.players.get('warrior')!.skillBar.skills.map(skill => skill?.effect.kind)).toEqual(['melee_arc', 'buff', 'buff', 'dash']);
});
