import type {HubView,HubCommand,TradeDelta} from './hub-protocol';
import type { ClassCombatSnapshot } from '../classes/class-combat';
import type { CharacterClass } from '../character/character-class';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import type { CharacterAppearance } from '../character/appearance';
import type { GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import { DangerZone, type DangerZoneSpec } from '../combat/danger-zone';
import type { Charge } from '../boss/boss';
import type { BossDefinition } from '../boss/boss-definition';
import { DUNGEONS } from '../dungeons/dungeons';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { isEliteId } from '../minions/elites';
import { Minion, type MinionState } from '../minions/minion';
import { MINIONS } from '../minions/minion-catalog';
import type { ItemRoll } from '../items/item';
import { Match, type MatchStatus, type PlayerIntent } from '../match/match';
import type { RunView } from '../run/descent';
import type { RoomView } from '../run/encounter';
import { LIEUTENANTS } from '../run/lieutenants';
import { VEIN_LIEUTENANTS } from '../run/vein-lieutenants';
import { roomArena, roomTemplateById } from '../run/room-templates';
import type { Loadout } from '../skills/skill-definition';
import type { SnapshotFrame } from './snapshot-codec';

/**
 * Valori di rete provvisori: simulazione 60 Hz, snapshot e input 30 Hz. Protocollo 7: skill e stati di classe; classe nel setup; la discesa (stanze, porte, premi,
 * tempre) e i servitori compatti (tipo alla nascita, poi posizione e stato).
 */
export const NETWORK = { protocolVersion: 12, capacity: 4, step: 1 / 60, snapshotSteps: 2, inputMs: 1000 / 30, staleInputMs: 350, maxBufferedBytes: 512_000 } as const;

/** Come il party entra nel dungeon: la Discesa, il Duello con il solo boss, il Pellegrinaggio dei quattro dungeon. */
export type PartyMode = 'descent' | 'duel' | 'pilgrimage';
export const PARTY_MODES: readonly PartyMode[] = ['descent', 'duel', 'pilgrimage'];

export interface PartyMember { id: string; name: string; character: string; appearance: CharacterAppearance; gearScore: number; ready: boolean }
export interface PartyState { code: string; leaderId: string; dungeonId: string; mode: PartyMode; grade: number; members: PartyMember[]; visitors?: PartyMember[]; playing: boolean }
export interface CombatStats { damageDealt: number; damageReceived: number; healing: number }

/** Come il client ricostruisce la partita di una stanza: mappa (stanza modello o arena del dungeon), boss, vita massima. */
export interface BattleSetup {
  /** Id della stanza modello; null = l'arena del dungeon (duello, stanza del boss). */
  readonly arena: string | null;
  /** Id del boss o del luogotenente; null = nessun boss. */
  readonly boss: string | null;
  /** Vita massima del boss (il luogotenente cresce con il gruppo). */
  readonly bossHealth: number | null;
  readonly maxHealth: Readonly<Record<string, number>>;
  readonly experience?: Readonly<Record<string, number>>;
  readonly classes?: Readonly<Record<string, CharacterClass | null>>;
}

/** Un servitore nella vista di rete: tipo, posizione, vita, variante e stato (per disegnarlo come sul server). */
export interface MinionSnapshot {
  id: number;
  kind: string;
  position: Vec2;
  health: number;
  maxHealth: number;
  elite: string | null;
  state: MinionState;
  shield: boolean;
  warded: boolean;
  prey: boolean;
  slowed: boolean;
}

export interface BattleSnapshot {
  classState?: ClassCombatSnapshot;
  id: string; dungeonId: string; time: number; status: MatchStatus; setup: BattleSetup;
  players: { id: string; position: Vec2; aim: Vec2; health: number; mana: number; invulnerableFor: number; moving: boolean; cooldowns: number[] }[];
  boss: { position: Vec2; health: number; phase: 1 | 2; slowFor: number; charge: Charge | null } | null;
  projectiles: { id: number; spec: ProjectileSpec; position: Vec2; angle: number; lifetime: number }[];
  zones: { id: number; spec: DangerZoneSpec; position: Vec2; remaining: number }[];
  /** Servitori vivi (protocollo 4): tipo per id stabile, posizione, vita e stato. */
  minions: MinionSnapshot[];
  report: Record<string, CombatStats>; rewards: Record<string, ItemRoll[]>; events: GameEvent[];
  /** La stanza e la discesa (protocollo 4); null nel duello. */
  room: RoomView | null;
  run: RunView | null;
  /** Vita dei ripari della stanza per indice (protocollo 8); assente nelle stanze senza ripari. */
  covers?: number[];
}
export type ClientMessage = HubCommand
  | { type: 'enter'; code?: string; character: string; protocol: number; visitor?:boolean; identity?:string }
  | { type: 'character'; character: string }
  | { type: 'choose'; dungeonId: string }
  | { type: 'mode'; mode: PartyMode; grade: number }
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'input'; intent: PlayerIntent }
  | { type: 'temper'; index: number }
  | { type: 'pact'; accept: boolean }
  | { type: 'ping'; sent: number };
export type ServerMessage =
  | {type:'hub';state:HubView}
  | {type:'trade_committed';delta:TradeDelta}
  | {type:'trade_saved';id:string}

  | { type: 'party'; playerId: string; state: PartyState; inviteBase?: string }
  | { type: 'snapshot'; snapshot: BattleSnapshot }
  | SnapshotFrame
  | { type: 'error'; message: string }
  | { type: 'pong'; sent: number };

/** Gli stati dei servitori in ordine stabile: in rete viaggia l'indice. */
export const MINION_STATES: readonly MinionState[] = ['idle', 'windup', 'dash', 'airborne', 'recover', 'dormant', 'burrowed', 'emerging', 'exposed', 'reviving'];

/** Tutti i luogotenenti: quelli di sempre e quelli delle vene B e C. */
const ALL_LIEUTENANTS: readonly BossDefinition[] = [...Object.values(LIEUTENANTS), ...Object.values(VEIN_LIEUTENANTS).flatMap((veins) => Object.values(veins))];

/** Un boss o un luogotenente per id. */
export function bossById(id: string): BossDefinition | undefined {
  return DUNGEONS.find((dungeon) => dungeon.boss.id === id)?.boss ?? ALL_LIEUTENANTS.find((lieutenant) => lieutenant.id === id);
}

/** La preparazione di una partita (per la rete): stanza modello o arena, boss, vita massima di ciascuno. */
export function setupOf(match: Match): BattleSetup {
  return {
    arena: match.arena === match.dungeon.arena ? null : match.arena.id,
    boss: match.boss?.definition.id ?? null,
    bossHealth: match.boss?.health.max ?? null,
    experience: Object.fromEntries([...match.players].map(([id, player]) => [id, player.totalXp])),
    classes: Object.fromEntries([...match.players].map(([id, player]) => [id, player.characterClass])),
    maxHealth: Object.fromEntries([...match.players].map(([id, player]) => [id, player.health.max])),
  };
}

/**
 * La partita replica sul client, dalla preparazione ricevuta: stessa mappa, stesso boss (o luogotenente), stessa vita
 * massima. Il luogotenente ha la vita del gruppo: arriva con la prima istantanea.
 */
export function replicaMatch(dungeon: DungeonDefinition, setup: BattleSetup, members: readonly { id: string; loadout: Loadout }[]): Match {
  const template = setup.arena === null ? undefined : roomTemplateById(setup.arena);
  const found = setup.boss === null ? null : bossById(setup.boss) ?? null;
  const boss = found === null || setup.bossHealth === null || setup.bossHealth === found.stats.maxHealth
    ? found
    : { ...found, stats: { ...found.stats, maxHealth: setup.bossHealth } };
  return new Match({
    rng: new SeededRng(1),
    dungeon,
    loadout: members[0]?.loadout ?? [],
    members: members.map((member) => ({ ...member, totalXp: setup.experience?.[member.id] ?? 0, characterClass: setup.classes?.[member.id] ?? null, ...(setup.maxHealth[member.id] !== undefined ? { maxHealth: setup.maxHealth[member.id] } : {}) })),
    ...(template !== undefined ? { arena: roomArena(template, dungeon.arena.theme) } : {}),
    boss,
  });
}

/** JSON conserva i vettori come coordinate; qui si ripristinano soltanto i metodi geometrici. */
export function parseWire(text: string): unknown {
  return JSON.parse(text, (_key: string, value: unknown) => {
    if (value && typeof value === 'object' && 'x' in value && 'y' in value && Object.keys(value).length === 2) {
      const point = value as { x: unknown; y: unknown };
      if (typeof point.x === 'number' && typeof point.y === 'number') return new Vec2(point.x, point.y);
    }
    return value;
  });
}

export function snapshotOf(
  match: Match,
  id: string,
  events: GameEvent[],
  rewards: Record<string, ItemRoll[]>,
  extra: { readonly room?: RoomView | null; readonly run?: RunView | null; readonly status?: MatchStatus } = {},
): BattleSnapshot {
  return {
    classState: match.classCombat.snapshot(),
    id, dungeonId: match.dungeon.id, time: match.time, status: extra.status ?? match.status, setup: setupOf(match),
    players: [...match.players].map(([playerId, p]) => ({ id: playerId, position: p.position, aim: p.aim, health: p.health.current,
      mana: p.mana, invulnerableFor: p.invulnerableFor, moving: p.moving, cooldowns: p.skillBar.cooldowns() })),
    boss: match.boss === null ? null
      : { position: match.boss.position, health: match.boss.health.current, phase: match.boss.phase, slowFor: match.boss.slowFor, charge: match.boss.charge },
    projectiles: match.projectiles.map(p => ({ id: p.id, spec: p.spec, position: p.position, angle: p.velocity.angle(), lifetime: p.lifetime })),
    zones: match.zones.map(z => ({ id: z.id, spec: z.spec, position: z.position, remaining: z.remaining })),
    minions: match.minions.map(m => ({
      id: m.id, kind: m.definition.id, position: m.position, health: m.health.current, maxHealth: m.health.max, elite: m.elite?.id ?? null,
      state: m.state, shield: m.shield > 0, warded: m.warded, prey: m.prey, slowed: m.slowFor > 0,
    })),
    report: Object.fromEntries(match.report), rewards, events,
    room: extra.room ?? null, run: extra.run ?? null,
    ...(match.covers.length > 0 ? { covers: match.covers.map((cover) => cover.health) } : {}),
  };
}

interface ReplicaObjects {
  projectiles: Map<number, Projectile>; zones: Map<number, DangerZone>; minions: Map<number, Minion>; live: Set<number>;
}
const replicas = new WeakMap<Match, ReplicaObjects>();

/** Riutilizza gli oggetti per id: gli snapshot non ricreano tutti i proiettili e le zone a ogni arrivo. */
export function applySnapshot(match: Match, snapshot: BattleSnapshot): void {
  let objects = replicas.get(match);
  if (!objects) { objects = { projectiles: new Map(), zones: new Map(), minions: new Map(), live: new Set() }; replicas.set(match, objects); }
  match.time = snapshot.time; match.status = snapshot.status;
  match.classCombat.remote = snapshot.classState ?? null;
  for (const state of snapshot.players) {
    const p = match.players.get(state.id); if (!p) continue;
    if (snapshot.setup.experience?.[state.id] !== undefined) p.setExperience(snapshot.setup.experience[state.id]!);
    p.position = state.position; p.aim = state.aim; p.health.current = state.health; p.mana = state.mana;
    p.invulnerableFor = state.invulnerableFor; p.moving = state.moving; p.skillBar.restoreCooldowns(state.cooldowns, snapshot.classState?.players.find(entry => entry.id === state.id)?.charges);
  }
  if (match.boss !== null && snapshot.boss !== null) {
    Object.assign(match.boss, { position: snapshot.boss.position, phase: snapshot.boss.phase, slowFor: snapshot.boss.slowFor, charge: snapshot.boss.charge });
    match.boss.health.current = snapshot.boss.health;
  }
  objects.live.clear(); match.projectiles.length = 0;
  for (const p of snapshot.projectiles) {
    let shot = objects.projectiles.get(p.id);
    if (!shot) { shot = new Projectile(p.id, p.spec, p.position, p.angle); objects.projectiles.set(p.id, shot); }
    shot.position = p.position; shot.lifetime = p.lifetime; objects.live.add(p.id); match.projectiles.push(shot);
  }
  for (const id of objects.projectiles.keys()) if (!objects.live.has(id)) objects.projectiles.delete(id);
  objects.live.clear(); match.zones.length = 0;
  for (const z of snapshot.zones) {
    let zone = objects.zones.get(z.id);
    if (!zone) { zone = new DangerZone(z.id, z.spec, z.position); objects.zones.set(z.id, zone); }
    zone.remaining = z.remaining; objects.live.add(z.id); match.zones.push(zone);
  }
  for (const id of objects.zones.keys()) if (!objects.live.has(id)) objects.zones.delete(id);
  objects.live.clear(); match.minions = [];
  for (const m of snapshot.minions ?? []) {
    const definition = MINIONS[m.kind]; if (!definition) continue;
    let minion = objects.minions.get(m.id);
    if (!minion) {
      minion = new Minion(m.id, definition, m.position, { maxHealth: m.maxHealth, exactHealth: true, elite: isEliteId(m.elite) ? m.elite : null, prey: m.prey });
      objects.minions.set(m.id, minion);
    }
    minion.position = m.position; minion.health.current = m.health; minion.state = m.state;
    minion.shield = m.shield ? 1 : 0; minion.warded = m.warded; minion.slowFor = m.slowed ? 1 : 0;
    objects.live.add(m.id); match.minions.push(minion);
  }
  for (const id of objects.minions.keys()) if (!objects.live.has(id)) objects.minions.delete(id);
  // Ripari: la vita arriva dal server; un riparo rotto esce dai massicci anche qui (l'evento arriva gia' dal server).
  (snapshot.covers ?? []).forEach((health, index) => {
    const cover = match.covers[index];
    if (cover === undefined) return;
    if (health <= 0) match.breakCover(index, false);
    else cover.health = health;
  });
}

/** Input non fidato: nessuna posizione, statistica o skill arbitraria accettata dalla rete. */
export function cleanIntent(raw: unknown): PlayerIntent | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const vector = (v: unknown): Vec2 | null => {
    if (!v || typeof v !== 'object') return null;
    const p = v as Record<string, unknown>;
    return typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)
      ? new Vec2(Math.max(-6000, Math.min(6000, p.x)), Math.max(-6000, Math.min(6000, p.y))) : null;
  };
  const move = vector(value.move), aimOffset = vector(value.aimOffset);
  if (!move || !aimOffset || !Array.isArray(value.skills) || value.skills.length !== 4 || value.skills.some(v => typeof v !== 'boolean')) return null;
  return { move: move.length() > 1 ? move.normalized() : move, aimOffset, skills: value.skills };
}
