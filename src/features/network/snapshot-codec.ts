import type { ClassCombatSnapshot } from '../classes/class-combat';
import { Vec2 } from '../../core/vec2';
import type { Charge } from '../boss/boss';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import type { MatchStatus } from '../match/match';
import type { RunView } from '../run/descent';
import type { RoomView } from '../run/encounter';
import { MINION_STATES, type BattleSetup, type BattleSnapshot, type MinionSnapshot } from './protocol';

type PlayerState = [number, number, number, number, number, number, number, number, number[]];
type ProjectileBirth = [number, number, number, number, number, number];
type ZoneBirth = [number, number, number, number, number];
/** Nascita di un servitore: id, tipo (id stabile), x, y, vita, vita massima, elite ('' se nessuna). Una sola volta. */
type MinionBirth = [number, string, number, number, number, number, string];
/** Servitore a ogni frame: id, x e y in unita' intere, stato (indice di `MINION_STATES`), segnali (bit). */
type MinionFrame = [number, number, number, number, number];

/** Bit dei segnali di un servitore. */
const MINION_FLAGS = { shield: 1, warded: 2, prey: 4, slowed: 8 } as const;

/**
 * Ordine garantito da WebSocket: definizioni e nascite una volta, poi soltanto rimozioni.
 * Proiettili lineari e countdown sono ricavati dal tempo autorevole, senza simulare collisioni lato client.
 * I servitori nascono una volta (tipo, vita, elite), poi viaggiano come posizione intera, stato e segnali; la vita solo
 * quando cambia. Stanza e discesa solo quando cambiano.
 */
export interface SnapshotFrame {
  ep?: Readonly<Record<string, number>>;
  cs?: ClassCombatSnapshot;
  type: 'frame'; q: number; t: number; s: MatchStatus;
  start?: [string, string, string[], BattleSetup];
  roster?: [string[], BattleSetup];
  p: PlayerState[]; b: [number, number, number, 1 | 2, number, Charge | null] | null;
  ps?: ProjectileSpec[]; zs?: DangerZoneSpec[];
  a?: ProjectileBirth[]; r?: number[]; z?: ZoneBirth[]; d?: number[];
  e?: GameEvent[]; result?: Pick<BattleSnapshot, 'report' | 'rewards'>;
  mb?: MinionBirth[]; m?: MinionFrame[]; mh?: [number, number][]; mr?: number[];
  rv?: RoomView; nv?: RunView;
  /** Vita dei ripari, solo quando cambia (protocollo 8). */
  cv?: number[];
}

/** Arrotondamento solo della rappresentazione: errore massimo 0,005 unità, mai applicato alla simulazione. */
const compact = (value: number): number => Math.round(value * 100) / 100;

const flagsOf = (minion: MinionSnapshot): number =>
  (minion.shield ? MINION_FLAGS.shield : 0) | (minion.warded ? MINION_FLAGS.warded : 0) | (minion.prey ? MINION_FLAGS.prey : 0) | (minion.slowed ? MINION_FLAGS.slowed : 0);

export class SnapshotEncoder {
  private roster = '';
  private experience = '';
  private battle = '';
  private sequence = 0;
  private shots = new Set<number>();
  private zones = new Set<number>();
  private minions = new Map<number, number>();
  private projectileTypes = new Map<string, number>();
  private zoneTypes = new Map<string, number>();
  private room = '';
  private run = '';
  private covers = '';
  private readonly keys = new WeakMap<object, string>();
  encode(snapshot: BattleSnapshot): SnapshotFrame {
    const initial = snapshot.id !== this.battle;
    if (initial) {
      this.experience = ''; this.battle = snapshot.id; this.sequence = 0; this.shots.clear(); this.zones.clear(); this.minions.clear();
      this.projectileTypes.clear(); this.zoneTypes.clear(); this.room = ''; this.run = ''; this.covers = '';
    }
    const frame: SnapshotFrame = {
      cs: snapshot.classState,
      type: 'frame', q: this.sequence++, t: snapshot.time, s: snapshot.status,
      p: snapshot.players.map(p => [compact(p.position.x), compact(p.position.y), compact(p.aim.x), compact(p.aim.y),
        p.health, compact(p.mana), compact(p.invulnerableFor), p.moving ? 1 : 0, p.cooldowns.map(compact)]),
      b: snapshot.boss === null ? null
        : [compact(snapshot.boss.position.x), compact(snapshot.boss.position.y), snapshot.boss.health, snapshot.boss.phase, compact(snapshot.boss.slowFor), snapshot.boss.charge],
    };
    if (initial) frame.start = [snapshot.id, snapshot.dungeonId, snapshot.players.map(p => p.id), snapshot.setup];
    const roster = JSON.stringify(snapshot.players.map(p => p.id));
    if (!initial && roster !== this.roster) frame.roster = [snapshot.players.map(p => p.id), snapshot.setup];
    this.roster = roster;
    const experience=JSON.stringify(snapshot.setup.experience ?? {});
    if(experience!==this.experience){frame.ep=snapshot.setup.experience;this.experience=experience;}
    const specIndex = <T extends object>(spec: T, registry: Map<string, number>, added: T[]): number => {
      let key = this.keys.get(spec); if (!key) { key = JSON.stringify(spec); this.keys.set(spec, key); }
      let index = registry.get(key);
      if (index === undefined) { index = registry.size; registry.set(key, index); added.push(spec); }
      return index;
    };
    const ps: ProjectileSpec[] = [], zs: DangerZoneSpec[] = [], births: ProjectileBirth[] = [], zones: ZoneBirth[] = [];
    const liveShots = new Set<number>(), liveZones = new Set<number>();
    for (const p of snapshot.projectiles) {
      liveShots.add(p.id);
      if (!this.shots.has(p.id)) births.push([p.id, specIndex(p.spec, this.projectileTypes, ps), p.position.x, p.position.y, p.angle, p.lifetime]);
    }
    for (const z of snapshot.zones) {
      liveZones.add(z.id);
      if (!this.zones.has(z.id)) zones.push([z.id, specIndex(z.spec, this.zoneTypes, zs), z.position.x, z.position.y, z.remaining]);
    }
    const removed = [...this.shots].filter(id => !liveShots.has(id)), detonated = [...this.zones].filter(id => !liveZones.has(id));
    this.shots = liveShots; this.zones = liveZones;
    if (ps.length) frame.ps = ps; if (zs.length) frame.zs = zs;
    if (births.length) frame.a = births; if (zones.length) frame.z = zones;
    if (removed.length) frame.r = removed; if (detonated.length) frame.d = detonated;
    if (snapshot.events.length) frame.e = snapshot.events;
    this.encodeMinions(snapshot.minions, frame);
    if (snapshot.room !== null) {
      const room = JSON.stringify(snapshot.room);
      if (room !== this.room) { this.room = room; frame.rv = snapshot.room; }
    }
    if (snapshot.run !== null) {
      const run = JSON.stringify(snapshot.run);
      if (run !== this.run) { this.run = run; frame.nv = snapshot.run; }
    }
    if (snapshot.covers !== undefined) {
      const covers = snapshot.covers.join(',');
      if (covers !== this.covers) { this.covers = covers; frame.cv = [...snapshot.covers]; }
    }
    if (snapshot.status !== 'playing') frame.result = { report: snapshot.report, rewards: snapshot.rewards };
    return frame;
  }

  private encodeMinions(minions: readonly MinionSnapshot[], frame: SnapshotFrame): void {
    const births: MinionBirth[] = [], moves: MinionFrame[] = [], health: [number, number][] = [];
    const live = new Map<number, number>();
    for (const minion of minions) {
      const known = this.minions.get(minion.id);
      if (known === undefined) {
        births.push([minion.id, minion.kind, compact(minion.position.x), compact(minion.position.y), minion.health, minion.maxHealth, minion.elite ?? '']);
      } else if (known !== minion.health) health.push([minion.id, minion.health]);
      live.set(minion.id, minion.health);
      moves.push([minion.id, Math.round(minion.position.x), Math.round(minion.position.y), Math.max(0, MINION_STATES.indexOf(minion.state)), flagsOf(minion)]);
    }
    const removed = [...this.minions.keys()].filter(id => !live.has(id));
    this.minions = live;
    if (births.length) frame.mb = births;
    if (moves.length) frame.m = moves;
    if (health.length) frame.mh = health;
    if (removed.length) frame.mr = removed;
  }
}

const vector = (p: Vec2): Vec2 => new Vec2(p.x, p.y);
function reviveEvent(event: GameEvent): GameEvent {
  switch (event.type) {
    case 'skill_cast': return { ...event, origin: vector(event.origin), destination: vector(event.destination) };
    case 'boss_teleported': return { ...event, from: vector(event.from), to: vector(event.to) };
    case 'minion_blinked': return { ...event, position: vector(event.position), from: vector(event.from) };
    case 'minion_telegraph': return { ...event, position: vector(event.position), ...(event.to ? { to: vector(event.to) } : {}) };
    case 'boss_pose': case 'match_ended': case 'wave_started': case 'temper_chosen': case 'room_exited': return event;
    default: return { ...event, position: vector(event.position) };
  }
}

export class SnapshotDecoder {
  private battle = '';
  private dungeon = '';
  private ids: string[] = [];
  private setup: BattleSetup = { arena: null, boss: null, bossHealth: null, maxHealth: {} };
  private sequence = -1;
  private readonly projectileTypes: ProjectileSpec[] = [];
  private readonly zoneTypes: DangerZoneSpec[] = [];
  private readonly shots = new Map<number, { state: BattleSnapshot['projectiles'][number]; origin: Vec2; velocity: Vec2; time: number; lifetime: number }>();
  private readonly zones = new Map<number, { state: BattleSnapshot['zones'][number]; time: number; remaining: number }>();
  private readonly minions = new Map<number, MinionSnapshot>();
  private room: RoomView | null = null;
  private run: RunView | null = null;
  private covers: number[] | null = null;
  decode(frame: SnapshotFrame): BattleSnapshot {
    if (frame.start) {
      [this.battle, this.dungeon, this.ids, this.setup] = frame.start; this.sequence = -1;
      this.projectileTypes.length = 0; this.zoneTypes.length = 0; this.shots.clear(); this.zones.clear(); this.minions.clear(); this.covers = null;
      // Stanza e discesa restano finche' non arrivano quelle nuove (la discesa prosegue fra una stanza e l'altra).
    }
    if (!this.battle || frame.q !== this.sequence + 1) throw new Error('Sequenza di rete interrotta. Rientra nel party.');
    this.sequence = frame.q;
    if (frame.roster) [this.ids, this.setup] = frame.roster;
    if (frame.p.length !== this.ids.length) throw new Error('Elenco giocatori di rete non valido.');
    this.projectileTypes.push(...(frame.ps ?? [])); this.zoneTypes.push(...(frame.zs ?? []));
    for (const [id, index, x, y, angle, lifetime] of frame.a ?? []) {
      const spec = this.projectileTypes[index]; if (!spec) throw new Error('Proiettile di rete sconosciuto.');
      const origin = new Vec2(x, y), state = { id, spec, position: origin, angle, lifetime };
      this.shots.set(id, { state, origin, velocity: Vec2.fromAngle(angle, spec.speed), time: frame.t, lifetime });
    }
    for (const id of frame.r ?? []) this.shots.delete(id);
    for (const [id, index, x, y, remaining] of frame.z ?? []) {
      const spec = this.zoneTypes[index]; if (!spec) throw new Error('Zona di rete sconosciuta.');
      this.zones.set(id, { state: { id, spec, position: new Vec2(x, y), remaining }, time: frame.t, remaining });
    }
    for (const id of frame.d ?? []) this.zones.delete(id);
    this.decodeMinions(frame);
    if (frame.rv) this.room = frame.rv;
    if (frame.nv) this.run = frame.nv;
    if (frame.cv) this.covers = frame.cv;
    const projectiles: BattleSnapshot['projectiles'] = [], zones: BattleSnapshot['zones'] = [];
    for (const shot of this.shots.values()) {
      const elapsed = frame.t - shot.time;
      shot.state.position = shot.origin.add(shot.velocity.mul(elapsed)); shot.state.lifetime = shot.lifetime - elapsed;
      projectiles.push(shot.state);
    }
    for (const zone of this.zones.values()) { zone.state.remaining = zone.remaining - (frame.t - zone.time); zones.push(zone.state); }
    if(frame.ep)this.setup={...this.setup,experience:{...frame.ep}};
    const boss = frame.b;
    return {
      classState: frame.cs ? { ...frame.cs, pets: frame.cs.pets.map(pet => ({ ...pet, position: vector(pet.position) })),
        heavy: frame.cs.heavy ? { ...frame.cs.heavy, position: vector(frame.cs.heavy.position), target: vector(frame.cs.heavy.target) } : null } : undefined,
      id: this.battle, dungeonId: this.dungeon, time: frame.t, status: frame.s, setup: this.setup,
      players: frame.p.map(([px, py, ax, ay, hp, mana, invulnerableFor, moving, cooldowns], i) => ({ id: this.ids[i]!,
        position: new Vec2(px, py), aim: new Vec2(ax, ay), health: hp, mana, invulnerableFor, moving: moving === 1, cooldowns })),
      boss: boss === null ? null : {
        position: new Vec2(boss[0], boss[1]), health: boss[2], phase: boss[3], slowFor: boss[4],
        charge: boss[5] ? { ...boss[5], start: vector(boss[5].start), target: vector(boss[5].target) } : null,
      },
      projectiles, zones, report: frame.result?.report ?? {}, rewards: frame.result?.rewards ?? {}, events: (frame.e ?? []).map(reviveEvent),
      minions: [...this.minions.values()].map((minion) => ({ ...minion })),
      room: this.room, run: this.run,
      ...(this.covers === null ? {} : { covers: [...this.covers] }),
    };
  }

  private decodeMinions(frame: SnapshotFrame): void {
    for (const [id, kind, x, y, health, maxHealth, elite] of frame.mb ?? []) {
      this.minions.set(id, { id, kind, position: new Vec2(x, y), health, maxHealth, elite: elite === '' ? null : elite, state: 'idle', shield: false, warded: false, prey: false, slowed: false });
    }
    for (const [id, health] of frame.mh ?? []) {
      const minion = this.minions.get(id);
      if (minion) minion.health = health;
    }
    for (const [id, x, y, state, flags] of frame.m ?? []) {
      const minion = this.minions.get(id);
      if (!minion) continue;
      minion.position = new Vec2(x, y);
      minion.state = MINION_STATES[state] ?? 'idle';
      minion.shield = (flags & MINION_FLAGS.shield) !== 0;
      minion.warded = (flags & MINION_FLAGS.warded) !== 0;
      minion.prey = (flags & MINION_FLAGS.prey) !== 0;
      minion.slowed = (flags & MINION_FLAGS.slowed) !== 0;
    }
    for (const id of frame.mr ?? []) this.minions.delete(id);
  }
}
