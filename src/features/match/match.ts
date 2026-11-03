import { CONTACT_ATTACKS, ContactAttacks } from '../combat/contact-attacks';
import { projectileImpactFraction } from '../combat/projectile-impact';
import { partyHealthMultiplier } from '../combat/party-health';
import { ClassCombat, type EnemyTarget } from '../classes/class-combat';
import type { HitEffect } from '../classes/skill-mechanics';
import type { CharacterClass } from '../character/character-class';
import type { Rng } from '../../core/rng';
import { Signal } from '../../core/signal';
import { angleDifference, TAU, Vec2 } from '../../core/vec2';
import { blockerBetween, clampToArena, detourAround, isOutsideProjectileBounds, moveBody, pillarAt, pushOutOfPillars, sightBlocked, solidAt, type ArenaDefinition, type Solid } from '../arena/arena';
import { NAV_FIELD, NavField, NavGrid } from '../arena/nav-field';
import { Boss } from '../boss/boss';
import type { BossContext } from '../boss/boss-context';
import type { BossDefinition } from '../boss/boss-definition';
import { HIT_RADIUS, ZONE_EDGE_FORGIVENESS } from '../combat/collision';
import { DangerZone, type DangerZoneSpec } from '../combat/danger-zone';
import type { DamageSource, GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { Minion, type MinionOptions } from '../minions/minion';
import { stepMinion, wakeIfDormant, type MinionContext } from '../minions/minion-ai';
import { MINIONS } from '../minions/minion-catalog';
import type { BossSummons, MinionDefinition } from '../minions/minion-definition';
import { Player } from '../player/player';
import type { Loadout } from '../skills/skill-definition';
import { stepSkillChannel, tryCastSkill, type SkillContext } from '../skills/skill-effects';
import type { Encounter } from './encounter';

/** Che cosa vuole fare il giocatore in questo passo. Lo produce l'input (o un test). */
export interface PlayerIntent {
  /** Direzione di movimento, lunghezza al massimo 1. */
  readonly move: Vec2;
  /**
   * Dove punta il mouse, relativo al giocatore. Il client converte il puntatore usando la posizione effettiva
   * della camera, che può essere decentrata. La mira in coordinate del mondo si ricava DOPO il movimento e prima
   * di ogni skill, conservando l'offset anche dopo uno scatto.
   */
  readonly aimOffset: Vec2;
  /** Per ogni slot di skill: vero se e' tenuto premuto o e' stato premuto dall'ultimo passo. */
  readonly skills: readonly boolean[];
}

export type MatchStatus = 'playing' | 'won' | 'lost';

/** Un giocatore della partita: skill e, fra una stanza e l'altra della discesa, la vita e il mana che porta con se'. */
export interface MatchMember {
  readonly id: string;
  readonly loadout: Loadout;
  readonly totalXp?: number;
  readonly characterClass?: CharacterClass | null;
  readonly health?: number;
  readonly maxHealth?: number;
  readonly mana?: number;
}

export interface MatchOptions {
  /** Casualita' della simulazione: con lo stesso seme e gli stessi comandi la partita e' identica. */
  readonly rng: Rng;
  readonly dungeon: DungeonDefinition;
  /** Le skill del giocatore per slot (derivano dall'equipaggiamento). */
  readonly loadout: Loadout;
  readonly totalXp?: number;
  readonly characterClass?: CharacterClass | null;
  readonly members?: readonly MatchMember[];
  /** La mappa: predefinita quella del dungeon (il duello); le stanze della discesa hanno la propria. */
  readonly arena?: ArenaDefinition;
  /** Il boss: predefinito quello del dungeon; `null` = nessun boss (stanza di servitori); un luogotenente nelle stanze. */
  readonly boss?: BossDefinition | null;
  /** L'obiettivo della stanza della discesa (ondate, porte, premi). Senza: il duello di sempre. */
  readonly encounter?: Encounter;
}

/** Limiti del gruppo dei servitori. Provvisori (vedi lo studio sulla progressione). */
export const MINION_LIMITS = {
  /** Proiettili dei servitori vivi insieme: oltre, chi deve sparare salta la raffica. */
  projectiles: 80,
  /** Gettoni d'attacco: quanti servitori possono annunciare una raffica insieme, piu' uno per giocatore. */
  tokens: 3,
} as const;

/** Chi infligge i danni dell'ambiente (zone dei servitori che feriscono altri servitori): non e' un giocatore. */
export const ENVIRONMENT_ID = 'ambiente';

/**
 * Ripari distruttibili delle stanze (fase 5 dello studio grafico, proposta per Jabbaz). Valori provvisori: la vita di un
 * riparo, consumata dal danno dei colpi di entrambe le squadre che lo raggiungono.
 */
export const COVER_RULES = { health: 160 } as const;

/** Un riparo della stanza: il suo rettangolo nella mappa della partita e la vita che gli resta (0 = rotto). */
export interface CoverState {
  readonly index: number;
  readonly solid: Solid;
  health: number;
  readonly maxHealth: number;
}

/**
 * Le mappe di partita con i ripari e i loro massicci vivi. Una partita costruita con una di queste mappe (la copia di
 * disegno della cooperativa, `NetworkView`) condivide gli stessi ripari: quelli rotti spariscono per tutte e due, anche
 * quando sono gia' rotti tutti.
 */
const LIVE_SOLIDS = new WeakMap<ArenaDefinition, Solid[]>();

/**
 * La mappa di una partita con i ripari: una copia con i ripari aggiunti ai massicci, cosi' fermano corpi e colpi con
 * le stesse regole. I ripari rotti escono da `solids`. La stanza modello non cambia mai.
 */
function withCovers(arena: ArenaDefinition): { arena: ArenaDefinition; solids: Solid[] | null } {
  const shared = LIVE_SOLIDS.get(arena);
  if (shared !== undefined) return { arena, solids: shared };
  if ((arena.covers ?? []).length === 0) return { arena, solids: null };
  const solids: Solid[] = [...(arena.solids ?? []), ...arena.covers!.map((cover, index) => ({ x: cover.x, y: cover.y, width: cover.width, height: cover.height, cover: index }))];
  const copy: ArenaDefinition = { ...arena, solids };
  LIVE_SOLIDS.set(copy, solids);
  return { arena: copy, solids };
}

/** Fonte dei danni di contatto con il boss. */
const CONTACT_SOURCE: DamageSource = { kind: 'contact', name: 'Contatto con il boss' };

/** Come un colpo ha raggiunto un servitore: decide scudi e rinascite. */
type MinionHitVia = 'projectile' | 'zone' | 'arc' | 'environment';

/**
 * Una partita: i giocatori contro il boss di un dungeon, oppure una stanza della discesa (servitori, luogotenente,
 * premi). E' la simulazione completa, senza DOM ne' disegno: avanza a passo fisso con `step()` e racconta cio' che
 * accade con gli eventi (`events`).
 */
export class Match {
  /** Eventi della simulazione, per rappresentazione e audio. */
  readonly classCombat: ClassCombat;
  readonly events = new Signal<[GameEvent]>();
  readonly dungeon: DungeonDefinition;
  readonly arena: ArenaDefinition;
  readonly rng: Rng;
  readonly players = new Map<string, Player>();
  readonly report = new Map<string, { damageDealt: number; damageReceived: number; healing: number }>();
  viewPlayerId = 'local';
  get player(): Player { return this.players.get(this.viewPlayerId) ?? this.players.values().next().value!; }
  private readonly contactAttacks = new ContactAttacks();
  private readonly owners = new Map<number, string>();
  /** Da quale schema del boss (o servitore) viene ogni proiettile o zona nemica (per la fonte dei danni subiti). */
  private readonly sources = new Map<number, DamageSource>();
  /** Proiettili dei servitori ancora vivi (per il loro limite). */
  private readonly minionShots = new Set<number>();
  /** Proiettili nemici che rallentano chi colpiscono: secondi. */
  private readonly slowingShots = new Map<number, number>();
  /** Servitori che tengono un gettone d'attacco. */
  private readonly tokens = new Set<number>();
  /** Zone programmate (pozze che pulsano): partono quando `at` arriva. */
  private delayed: { at: number; spec: DangerZoneSpec; position: Vec2; source: DamageSource }[] = [];
  /** Nome dell'ultimo schema annunciato dal boss: le sue azioni programmate gli appartengono. */
  private currentPattern = '';
  private actingId = 'local';
  /** Il boss: quello del dungeon nel duello, il luogotenente nella sua stanza, nessuno nelle stanze di servitori. */
  readonly boss: Boss | null;
  readonly encounter: Encounter | null;
  projectiles: Projectile[] = [];
  zones: DangerZone[] = [];
  /** Servitori vivi (evocati dal boss o mandati dal regista della stanza). */
  minions: Minion[] = [];
  status: MatchStatus = 'playing';
  /** Secondi di partita trascorsi (si fermano alla fine). */
  time = 0;
  /** Ripari distruttibili della stanza (vuoto altrove). */
  readonly covers: CoverState[] = [];
  /** I massicci della mappa di questa partita, se ha ripari: i ripari rotti ne escono. */
  private readonly liveSolids: Solid[] | null;
  /**
   * Le celle percorribili delle stanze con massicci, ripari o pozzi, un campo di flusso per giocatore vivo e quanti
   * passi mancano al prossimo ricalcolo delle distanze.
   */
  private readonly navGrid: NavGrid | null;
  private readonly navFields = new Map<string, NavField>();
  private navCountdown = 0;

  private nextId = 1;
  private readonly minionContext: MinionContext;

  constructor(options: MatchOptions) {
    this.dungeon = options.dungeon;
    const map = withCovers(options.arena ?? options.dungeon.arena);
    this.arena = map.arena;
    this.liveSolids = map.solids;
    for (const [index, cover] of (this.arena.covers ?? []).entries()) {
      const solid = this.liveSolids?.find((candidate) => candidate.cover === index);
      this.covers.push({ index, solid: solid ?? { ...cover, cover: index }, health: solid === undefined ? 0 : COVER_RULES.health, maxHealth: COVER_RULES.health });
    }
    const shaped = (this.arena.solids ?? []).length + (this.arena.chasms ?? []).length > 0;
    this.navGrid = shaped ? new NavGrid(this.arena) : null;
    this.rng = options.rng;
    const members = options.members ?? [{ id: 'local', loadout: options.loadout, totalXp: options.totalXp, characterClass: options.characterClass }];
    this.viewPlayerId = members[0]!.id;
    for (const member of members) {
      const player = new Player(this.arena, member.loadout, member.maxHealth, member.characterClass, member.totalXp);
      if (member.health !== undefined) player.health.current = Math.max(0, Math.min(player.health.max, member.health));
      if (member.mana !== undefined) player.mana = Math.max(0, Math.min(player.maxMana, member.mana));
      this.players.set(member.id, player);
      this.report.set(member.id, { damageDealt: 0, damageReceived: 0, healing: 0 });
    }
    const bossDefinition = options.boss === undefined ? options.dungeon.boss : options.boss;
    this.boss = bossDefinition === null ? null : new Boss(bossDefinition, this.arena);
    this.classCombat = new ClassCombat({ players: this.players, arena: this.arena, rng: this.rng,
      enemies: () => this.classTargets(), heal: (id, amount) => this.heal(id, amount), emit: event => this.events.emit(event),
      enemyProjectile: (spec, position, angle) => {
        this.spawnProjectile(spec, position, angle);
        this.sources.set(this.nextId - 1, { kind: 'projectile', name: 'Colpo imparabile' });
      },
    });
    this.encounter = options.encounter ?? null;
    this.minionContext = this.createMinionContext();
    this.encounter?.attach(this);
  }

  /** Adattatori leggeri per le regole di classe: il controller non dipende da Match. */
  private classTargets(): EnemyTarget[] {
    const targets: EnemyTarget[] = this.minions.filter(minion => !minion.isDead && !minion.isHidden && minion.hostile).map(minion => ({
      id: `minion:${minion.id}`, position: minion.position, health: minion.health, radius: minion.hitRadius, kind: 'minion',
      slow: seconds => { minion.slowFor = Math.max(minion.slowFor, seconds); },
      root: seconds => { minion.rootFor = Math.max(minion.rootFor, seconds); },
      hurt: (damage, owner) => this.hitMinion(minion, damage, owner, 'arc'),
    }));
    const boss = this.boss;
    if (boss && !boss.health.isDead) targets.push({ id: 'boss', position: boss.position, health: boss.health, radius: boss.stats.hitRadius,
      kind: boss.definition.id === this.dungeon.boss.id ? 'boss' : 'lieutenant',
      slow: seconds => { boss.slowFor = Math.max(boss.slowFor, seconds); },
      root: seconds => { boss.rootFor = Math.max(boss.rootFor, seconds); },
      hurt: (damage, owner) => this.hitBoss(damage, owner),
    });
    return targets;
  }

  /** Il prossimo id di un'entita' (proiettili, zone, servitori): unico nella partita. */
  private mintId(): number {
    return this.nextId++;
  }

  private context(id: string, player: Player): SkillContext {
    return {
      player,
      spawnProjectile: (spec, position, angle) => { this.spawnProjectile(spec, position, angle); this.owners.set(this.nextId - 1, id); },
      spawnZone: (spec, position) => { this.spawnZone(spec, position); this.owners.set(this.nextId - 1, id); },
      strikeArc: (origin, angle, range, arc, damage) => this.strikeArc(origin, angle, range, arc, damage),
      emit: event => this.events.emit({ ...event, playerId: id }),
      taunt: (radius, duration) => this.classCombat.taunt(id, radius, duration),
      summon: spec => this.classCombat.summon(id, spec),
      clearProjectiles: (origin, angle, range, arc) => {
        for (const shot of this.projectiles) {
          if (shot.team === 'enemy' && !shot.spec.unblockable && this.inArc(origin, angle, range, arc, shot.position, shot.radius)) {
            shot.expire(); this.emitProjectileHit(shot, 'obstacle');
          }
        }
      },
    };
  }

  /** Un passo di simulazione di `dt` secondi. Dopo la fine della partita non fa nulla. */
  step(dt: number, intent: PlayerIntent): void {
    this.stepParty(dt, new Map([[this.viewPlayerId, intent]]));
  }

  /** Simulazione cooperativa autorevole: tutti agiscono prima dell'unico passo del boss. */
  stepParty(dt: number, intents: ReadonlyMap<string, PlayerIntent>): void {
    if (this.status !== 'playing') return;
    this.time += dt;

    this.boss?.tick(dt);
    for (const [id, player] of this.players) {
      if (player.health.isDead) continue;
      player.tick(dt);
      this.actingId = id;
      stepSkillChannel(dt, this.context(id, player));
      const intent = intents.get(id);
      player.moving = false;
      if (!intent) continue;
      this.actingId = id;
      player.moveBy(dt, intent.move);
      const syncAim = (): void => { player.aim = player.position.add(intent.aimOffset); };
      syncAim();
      for (let slot = 0; slot < intent.skills.length && this.status === 'playing'; slot++) {
        if (!intent.skills[slot]) continue;
        syncAim();
        tryCastSkill(slot, this.context(id, player));
      }
      syncAim();
    }
    if (this.status !== 'playing') return;
    this.classCombat.step(dt);
    if (this.status !== 'playing') return;
    const boss = this.boss;
    if (boss !== null && !boss.health.isDead) {
      const target = this.nearestPlayer(boss.position);
      if (!target) { this.end(false); return; }
      boss.step(dt, this.bossContext(target));
      for (const player of this.players.values()) {
        if (player.position.distanceTo(boss.position) < boss.stats.contactDistance) this.hurtByContact(boss.stats.contactDamage, player, boss, boss.stats.contactInterval ?? CONTACT_ATTACKS.bossInterval, CONTACT_SOURCE);
      }
    }

    this.encounter?.step(dt, this);
    if (this.status !== 'playing') return;
    this.runDelayed();
    this.refreshNav();
    this.stepMinions(dt);
    this.stepProjectiles(dt);
    this.stepZones(dt);
    this.minions = this.minions.filter((minion) => !minion.isDead);
  }

  /**
   * Ricalcola i campi di flusso (uno per giocatore vivo) ogni `NAV_FIELD.refreshSteps` passi, solo nelle stanze con
   * massicci, ripari o pozzi.
   */
  private refreshNav(): void {
    const grid = this.navGrid;
    if (grid === null) return;
    if (this.navCountdown <= 0) {
      for (const [id, player] of this.players) {
        if (player.health.isDead) {
          this.navFields.delete(id);
          continue;
        }
        let field = this.navFields.get(id);
        if (field === undefined) {
          field = new NavField(grid);
          this.navFields.set(id, field);
        }
        field.update([player.position]);
      }
      this.navCountdown = NAV_FIELD.refreshSteps;
    }
    this.navCountdown--;
  }

  /**
   * Dove dirigersi a piedi verso `to`: la strada libera, il campo di flusso del giocatore a cui si va (il piu' vicino a
   * `to`, cioe' il bersaglio del servitore anche quando lo provoca il Guerriero) o l'angolo dell'ostacolo.
   */
  private route(from: Vec2, to: Vec2, bodyRadius: number): Vec2 {
    if (this.navGrid !== null && blockerBetween(this.arena, from, to) !== undefined) {
      let field: NavField | undefined;
      let nearest = 160;
      for (const [id, player] of this.players) {
        if (player.health.isDead) continue;
        const distance = player.position.distanceTo(to);
        if (distance < nearest) {
          nearest = distance;
          field = this.navFields.get(id);
        }
      }
      const next = field?.next(from) ?? null;
      if (next !== null) return next;
    }
    return detourAround(this.arena, from, to, bodyRadius);
  }

  /**
   * Un colpo raggiunge un riparo: perde vita pari al danno e a zero si rompe. Vale per i colpi di entrambe le squadre;
   * il danno ai ripari non conta nel resoconto della partita.
   */
  private hitCover(index: number, damage: number, position: Vec2): void {
    const cover = this.covers[index];
    if (cover === undefined || cover.health <= 0) return;
    // Come per la vita (`Health.takeDamage`): il danno finale si arrotonda per difetto.
    cover.health = Math.max(0, cover.health - Math.floor(Math.max(0, damage)));
    this.events.emit({ type: 'cover_hit', position, cover: index, left: cover.health / cover.maxHealth });
    if (cover.health <= 0) this.breakCover(index, true);
  }

  /**
   * Il riparo si rompe ed esce dai massicci della mappa: non ferma piu' corpi e colpi. `announce` falso sul client
   * della cooperativa, dove l'evento arriva gia' dal server.
   */
  breakCover(index: number, announce: boolean): void {
    const cover = this.covers[index];
    if (cover === undefined) return;
    cover.health = 0;
    const at = this.liveSolids?.indexOf(cover.solid) ?? -1;
    if (at < 0) return;
    this.liveSolids!.splice(at, 1);
    // Le celle del riparo tornano libere: i campi di flusso si ricalcolano al prossimo passo.
    this.navGrid?.rebuild();
    this.navCountdown = 0;
    const { solid } = cover;
    if (announce) this.events.emit({ type: 'cover_broken', position: new Vec2(solid.x + solid.width / 2, solid.y + solid.height / 2), cover: index });
  }

  /** Il giocatore vivo piu' vicino a un punto. */
  nearestPlayer(point: Vec2): Player | undefined {
    const forced = this.classCombat?.forcedTarget(point);
    if (forced) return forced;
    let target: Player | undefined;
    let nearest = Infinity;
    for (const p of this.players.values()) {
      if (p.health.isDead) continue;
      const distance = p.position.distanceTo(point);
      if (distance < nearest) { nearest = distance; target = p; }
    }
    return target;
  }

  /** I giocatori ancora in piedi. */
  livingPlayers(): Player[] {
    return [...this.players.values()].filter((player) => !player.health.isDead);
  }

  private bossContext(target: Player): BossContext {
    const chargeSource = (): DamageSource => ({ kind: 'charge', name: this.currentPattern || 'Carica' });
    return {
      target: target.position,
      time: this.time,
      rng: this.rng,
      spawnProjectile: (spec, position, angle) => {
        this.spawnProjectile(spec, position, angle);
        this.sources.set(this.nextId - 1, { kind: 'projectile', name: this.currentPattern });
      },
      spawnZone: (spec, position) => {
        this.spawnZone(spec, position);
        this.sources.set(this.nextId - 1, { kind: 'zone', name: this.currentPattern });
      },
      hurtPlayer: amount => {
        if (this.boss) this.hurtByContact(amount, target, this.boss, this.boss.stats.contactInterval ?? CONTACT_ATTACKS.bossInterval, chargeSource());
      },
      hurtNearbyPlayers: amount => {
        const boss = this.boss;
        if (boss === null) return;
        for (const player of this.players.values()) {
          if (player.position.distanceTo(boss.position) < boss.stats.chargeHitDistance) this.hurtByContact(amount, player, boss, boss.stats.contactInterval ?? CONTACT_ATTACKS.bossInterval, chargeSource());
        }
      },
      summon: (summons, count, center) => this.summon(summons, count, center),
      emit: (event) => {
        if (event.type === 'boss_attack') this.currentPattern = event.name;
        this.events.emit(event);
      },
    };
  }

  private spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void {
    this.projectiles.push(new Projectile(this.mintId(), spec, position, angle));
  }

  private spawnZone(spec: DangerZoneSpec, position: Vec2): void {
    this.zones.push(new DangerZone(this.mintId(), spec, position));
  }

  /** Una zona nemica dell'ambiente (insidie della stanza): `source` dice cosa l'ha creata. */
  spawnHazardZone(spec: DangerZoneSpec, position: Vec2, source: DamageSource): void {
    this.spawnZone(spec, clampToArena(this.arena, position, this.arena.playerMargin));
    this.sources.set(this.nextId - 1, source);
  }

  /**
   * Mette in campo un servitore (regista della stanza, nidi, divisioni, test): dentro l'arena, fuori dai pilastri se
   * non vola, e lo annuncia con `minion_spawned`.
   */
  spawnMinion(definition: MinionDefinition, position: Vec2, options: MinionOptions = {}): Minion {
    const inside = clampToArena(this.arena, position, this.arena.playerMargin);
    const placed = definition.flying ? inside : pushOutOfPillars(this.arena, inside, definition.hitRadius);
    const minion = new Minion(this.mintId(), definition, placed, options.exactHealth ? options : { ...options, maxHealth: Math.round((options.maxHealth ?? definition.maxHealth) * partyHealthMultiplier(this.players.size)) });
    this.minions.push(minion);
    this.events.emit({
      type: 'minion_spawned',
      position: placed,
      minionId: minion.id,
      visual: definition.visual,
      ...(options.elite ? { elite: options.elite } : {}),
    });
    return minion;
  }

  /**
   * Evoca fino a `count` servitori in cerchio attorno a `center` (fuori dai pilastri, dentro l'arena), senza superare i
   * vivi ammessi. Posizioni fisse, senza casualita': la partita resta riproducibile.
   */
  private summon(summons: BossSummons, count: number, center: Vec2): void {
    const alive = this.minions.filter((minion) => minion.definition.id === summons.minion.id).length;
    const n = Math.max(0, Math.min(count, summons.maxAlive - alive));
    const start = center.angleTo(this.nearestPlayer(center)?.position ?? center);
    for (let i = 0; i < n; i++) {
      const angle = start + Math.PI / 4 + (i * TAU) / Math.max(n, 1);
      this.spawnMinion(summons.minion, center.add(Vec2.fromAngle(angle, summons.ringRadius)));
    }
  }

  /** Quanti servitori ostili sono ancora vivi (o stanno per rialzarsi). */
  hostileCount(): number {
    let count = 0;
    for (const minion of this.minions) if (!minion.isDead && minion.hostile) count++;
    return count;
  }

  /** Fa sparire tutti i servitori, senza i loro effetti di morte (stanza liberata, boss caduto). */
  dismissMinions(): void {
    for (const minion of [...this.minions]) this.killMinion(minion, false, 'environment', false);
    this.minions = [];
    this.tokens.clear();
  }

  /** Comportamento dei servitori, poi la spinta che li tiene separati. */
  private stepMinions(dt: number): void {
    for (const minion of [...this.minions]) {
      if (minion.isDead || this.status !== 'playing') continue;
      stepMinion(minion, this.minionContext, dt);
    }
    this.separateMinions();
    this.minions = this.minions.filter((minion) => !minion.isDead);
  }

  /** I servitori non si ammucchiano in un punto: chi si sovrappone viene spinto via (le torrette restano ferme). */
  private separateMinions(): void {
    const bodies = this.minions.filter((m) => !m.isDead && !m.isHidden && m.state !== 'airborne' && m.state !== 'dash');
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i]!;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j]!;
        if (a.definition.flying !== b.definition.flying) continue;
        const minimum = (a.hitRadius + b.hitRadius) * 0.85;
        const offset = b.position.sub(a.position);
        const distance = offset.length();
        if (distance >= minimum) continue;
        const direction = distance > 0.01 ? offset.mul(1 / distance) : Vec2.fromAngle(((a.id * 7 + b.id * 13) % 360) * (Math.PI / 180));
        const aMoves = a.definition.speed > 0, bMoves = b.definition.speed > 0;
        if (!aMoves && !bMoves) continue;
        const overlap = minimum - distance;
        const share = aMoves && bMoves ? 0.5 : 1;
        if (aMoves) a.position = this.settle(a, a.position.sub(direction.mul(overlap * share)));
        if (bMoves) b.position = this.settle(b, b.position.add(direction.mul(overlap * share)));
      }
    }
  }

  private settle(minion: Minion, point: Vec2): Vec2 {
    const inside = clampToArena(this.arena, point, this.arena.playerMargin);
    return minion.definition.flying ? inside : pushOutOfPillars(this.arena, inside, minion.hitRadius);
  }

  /** Che cosa la partita offre ai servitori (vedi `minion-ai.ts`). */
  private createMinionContext(): MinionContext {
    const sourceOf = (minion: Minion): DamageSource => ({ kind: 'minion', name: minion.definition.name });
    // Il getter legge sempre la lista corrente: la partita la sostituisce a ogni passo.
    const self = this;
    return {
      arena: this.arena,
      rng: this.rng,
      get minions() { return self.minions; },
      nearestPlayer: (point) => this.nearestPlayer(point),
      route: (from, to, bodyRadius) => this.route(from, to, bodyRadius),
      spawnProjectile: (spec, position, angle, minion) => {
        if (this.minionShots.size >= MINION_LIMITS.projectiles) return false;
        this.spawnProjectile(spec, position, angle);
        const id = this.nextId - 1;
        this.sources.set(id, sourceOf(minion));
        this.minionShots.add(id);
        const slow = minion.definition.slowOnHit ?? minion.elite?.slowOnHit;
        if (slow !== undefined) this.slowingShots.set(id, slow);
        return true;
      },
      spawnZone: (spec, position, minion) => {
        this.spawnZone(spec, position);
        this.sources.set(this.nextId - 1, sourceOf(minion));
      },
      spawnChild: (definitionId, position, parent) => {
        const definition = MINIONS[definitionId];
        if (definition === undefined) return;
        this.spawnMinion(definition, position, { parentId: parent.id, maxHealth: this.minionHealth(definition) });
      },
      hurtPlayer: (amount, player, minion) => {
        if (this.hurtByContact(amount, player, minion, minion.definition.contactInterval ?? CONTACT_ATTACKS.minionInterval, sourceOf(minion))) {
          const slow = minion.definition.slowOnHit ?? minion.elite?.slowOnHit;
          if (slow !== undefined) player.slowFor = Math.max(player.slowFor, slow);
        }
      },
      explode: (minion) => {
        const reach = minion.definition.blastRadius ?? minion.hitRadius;
        for (const player of this.players.values()) {
          if (player.position.distanceTo(minion.position) < reach + HIT_RADIUS.player) this.hurtPlayer(minion.definition.contactDamage, player, sourceOf(minion));
        }
        this.killMinion(minion, true, 'environment');
      },
      takeToken: (minion) => {
        if (this.tokens.has(minion.id)) return true;
        if (this.tokens.size >= MINION_LIMITS.tokens + this.livingPlayers().length) return false;
        this.tokens.add(minion.id);
        minion.hasToken = true;
        return true;
      },
      releaseToken: (minion) => {
        this.tokens.delete(minion.id);
        minion.hasToken = false;
      },
      emit: (event) => this.events.emit(event),
    };
  }

  /** Vita di un servitore generato in partita: quella della stanza, se la stanza la decide. */
  private minionHealth(definition: MinionDefinition): number {
    return this.encounter?.minionHealth?.(definition) ?? definition.maxHealth;
  }

  /** Il primo servitore colpibile che il punto tocca (entro `extra` dal suo raggio di colpo). */
  private minionAt(point: Vec2, extra: number): Minion | undefined {
    return this.minions.find((minion) => !minion.isDead && !minion.isHidden && point.distanceTo(minion.position) < minion.hitRadius + extra);
  }

  /**
   * Colpo ravvicinato del giocatore: ferisce il boss e i servitori entro `range` dal loro bordo, nell'arco attorno ad
   * `angle` e se nessun pilastro si mette in mezzo (come per i proiettili, che i pilastri assorbono).
   */
  private strikeArc(origin: Vec2, angle: number, range: number, arc: number, damage: number): void {
    for (const minion of [...this.minions]) {
      if (minion.isDead || minion.isHidden) continue;
      if (this.inArc(origin, angle, range, arc, minion.position, minion.hitRadius)) this.hitMinion(minion, damage, this.actingId, 'arc');
    }
    const boss = this.boss;
    if (boss !== null && this.inArc(origin, angle, range, arc, boss.position, boss.stats.hitRadius)) this.hitBoss(damage);
  }

  private inArc(origin: Vec2, angle: number, range: number, arc: number, target: Vec2, hitRadius: number): boolean {
    const offset = target.sub(origin);
    const distance = offset.length();
    if (distance > range + hitRadius) return false;
    // Il bersaglio addosso al giocatore (centri sovrapposti) viene colpito a prescindere dalla direzione.
    if (distance > 0 && Math.abs(angleDifference(angle, offset.angle())) > arc / 2) return false;
    // La linea di vista arriva al bordo del bersaglio piu' vicino: un boss che vola sopra un pilastro piu' piccolo di
    // lui resta colpibile dove sporge.
    if (distance > hitRadius) {
      const nearestEdge = origin.add(offset.mul((distance - hitRadius) / distance));
      if (sightBlocked(this.arena, origin, nearestEdge)) return false;
    }
    return true;
  }

  /**
   * Muove i proiettili, risolve i colpi e rimuove quelli finiti. Un colpo a segno o un ostacolo consumano il
   * proiettile (i pilastri fermano i proiettili di entrambe le squadre). I servitori fanno da scudo al boss.
   * Un proiettile del giocatore che finisce nel vuoto e' un colpo mancato (`projectile_faded`).
   */
  private stepProjectiles(dt: number): void {
    const boss = this.boss;
    for (const projectile of this.projectiles) {
      if (projectile.isExpired) continue;
      const previous = projectile.position;
      projectile.advance(dt);
      const solid = solidAt(this.arena, projectile.position);
      if (pillarAt(this.arena, projectile.position) !== undefined || solid !== undefined) {
        if (solid?.cover !== undefined) this.hitCover(solid.cover, projectile.damage, projectile.position);
        this.emitProjectileHit(projectile, 'obstacle');
        projectile.expire();
        continue;
      }
      if (projectile.team === 'enemy') {
        let victim: Player | undefined;
        let firstImpact = Infinity;
        for (const p of this.players.values()) {
          if (p.health.isDead) continue;
          const fraction = projectileImpactFraction(previous, projectile.position, p.position, projectile.radius + HIT_RADIUS.player);
          if (fraction !== null && fraction < firstImpact) { victim = p; firstImpact = fraction; }
        }
        if (victim) {
          projectile.position = previous.lerp(projectile.position, firstImpact);
          if (this.hurtPlayer(projectile.damage, victim, this.sources.get(projectile.id), projectile.spec.unblockable)) {
            const slow = this.slowingShots.get(projectile.id);
            if (slow !== undefined) victim.slowFor = Math.max(victim.slowFor, slow);
          }
          this.emitProjectileHit(projectile, 'player');
          projectile.expire();
        }
      } else {
        const owner = this.owners.get(projectile.id);
        const minion = this.minionAt(projectile.position, projectile.radius);
        if (minion !== undefined) {
          this.hitMinion(minion, projectile.damage, owner, 'projectile', projectile.spec.onHit);
          if (projectile.spec.slowSeconds !== undefined) minion.slowFor = Math.max(minion.slowFor, projectile.spec.slowSeconds);
          this.emitProjectileHit(projectile, 'minion');
          projectile.expire();
        } else if (boss !== null && !boss.health.isDead && projectile.position.distanceTo(boss.position) < projectile.radius + boss.stats.hitRadius) {
          this.hitBoss(projectile.damage, owner, projectile.spec.onHit);
          if (projectile.spec.slowSeconds !== undefined) boss.slowFor = projectile.spec.slowSeconds;
          this.emitProjectileHit(projectile, 'boss');
          projectile.expire();
        } else if (projectile.isExpired || isOutsideProjectileBounds(this.arena, projectile.position)) {
          this.events.emit({ type: 'projectile_faded', position: projectile.position, visual: projectile.spec.visual, ...(owner ? { playerId: owner } : {}) });
        }
      }
      if (isOutsideProjectileBounds(this.arena, projectile.position)) projectile.expire();
    }
    this.projectiles = this.projectiles.filter(projectile => {
      if (projectile.isExpired) {
        this.owners.delete(projectile.id);
        this.sources.delete(projectile.id);
        this.minionShots.delete(projectile.id);
        this.slowingShots.delete(projectile.id);
      }
      return !projectile.isExpired;
    });
  }

  /** Fa scoppiare le zone arrivate a fine conto alla rovescia e le rimuove. */
  private stepZones(dt: number): void {
    const pending: DangerZone[] = [];
    for (const zone of this.zones) {
      zone.remaining -= dt;
      if (!zone.isDue) {
        pending.push(zone);
        continue;
      }
      this.events.emit({
        type: 'zone_detonated',
        position: zone.position,
        radius: zone.radius,
        team: zone.team,
        ...(zone.spec.visual !== undefined ? { visual: zone.spec.visual } : {}),
      });
      if (zone.team === 'player') {
        const owner = this.owners.get(zone.id);
        for (const minion of [...this.minions]) {
          if (minion.isDead || minion.isHidden) continue;
          if (zone.position.distanceTo(minion.position) < zone.radius + minion.hitRadius - ZONE_EDGE_FORGIVENESS) {
            this.hitMinion(minion, zone.spec.damage, owner, 'zone', zone.spec.onHit);
            if (zone.spec.slowSeconds !== undefined) minion.slowFor = Math.max(minion.slowFor, zone.spec.slowSeconds);
          }
        }
        const boss = this.boss;
        if (boss !== null && !boss.health.isDead) {
          const reach = zone.radius + boss.stats.hitRadius - ZONE_EDGE_FORGIVENESS;
          if (zone.position.distanceTo(boss.position) < reach) {
            this.hitBoss(zone.spec.damage, owner, zone.spec.onHit);
            if (zone.spec.slowSeconds !== undefined) boss.slowFor = zone.spec.slowSeconds;
          }
        }
      } else {
        for (const player of this.players.values()) {
          if (zone.position.distanceTo(player.position) < zone.radius + HIT_RADIUS.player - ZONE_EDGE_FORGIVENESS) {
            if (this.hurtPlayer(zone.spec.damage, player, this.sources.get(zone.id), zone.spec.unblockable) && zone.spec.slowSeconds !== undefined) {
              player.slowFor = Math.max(player.slowFor, zone.spec.slowSeconds);
            }
          }
        }
        if (zone.spec.hurtsMinions) {
          for (const minion of [...this.minions]) {
            if (minion.isDead || minion.isHidden) continue;
            if (zone.position.distanceTo(minion.position) < zone.radius + minion.hitRadius - ZONE_EDGE_FORGIVENESS) {
              this.hitMinion(minion, zone.spec.damage, ENVIRONMENT_ID, 'environment');
            }
          }
        }
      }
      this.owners.delete(zone.id);
      this.sources.delete(zone.id);
    }
    this.zones = pending;
  }

  /** Zone programmate (pozze): partono al loro momento, con la fonte che le ha create. */
  private runDelayed(): void {
    if (this.delayed.length === 0) return;
    const due = this.delayed.filter((entry) => entry.at <= this.time);
    if (due.length === 0) return;
    this.delayed = this.delayed.filter((entry) => entry.at > this.time);
    for (const entry of due) this.spawnHazardZone(entry.spec, entry.position, entry.source);
  }

  private emitProjectileHit(projectile: Projectile, struck: 'boss' | 'player' | 'minion' | 'obstacle'): void {
    const owner = this.owners.get(projectile.id);
    this.events.emit({
      type: 'projectile_hit',
      position: projectile.position,
      radius: projectile.radius,
      visual: projectile.spec.visual,
      team: projectile.team,
      struck,
      ...(owner ? { playerId: owner } : {}),
    });
  }

  private hurtByContact(amount: number, player: Player, attacker: object, interval: number, source: DamageSource): boolean {
    if (this.status !== 'playing' || player.health.isDead || amount <= 0) return false;
    if (!this.contactAttacks.tryAttack(attacker, player, this.time, interval)) return false;
    return this.hurtPlayer(amount, player, source);
  }

  /**
   * Danno al giocatore: ignorato se e' invulnerabile o la partita e' finita. `source` dice da dove viene. Restituisce
   * vero se il colpo e' andato a segno.
   */
  private hurtPlayer(amount: number, player: Player = this.player, source?: DamageSource, unblockable = false): boolean {
    if (this.status !== 'playing' || player.health.isDead) return false;
    const before = player.health.current;
    const guarded = player.guarding;
    if (!player.tryHurt(amount, unblockable)) return false;
    if (guarded) this.events.emit({ type: 'guard_blocked', position: player.position, playerId: [...this.players].find(([, p]) => p === player)?.[0] });
    const actual = before - player.health.current;
    if (actual <= 0) return true;
    const id = [...this.players].find(([, p]) => p === player)![0];
    this.report.get(id)!.damageReceived += actual;
    this.events.emit({ type: 'damage_dealt', target: 'player', amount: actual, position: player.position, playerId: id, ...(source && source.name ? { source } : {}) });
    if (player.health.isDead && this.encounter?.onPlayerDown?.(this, id)) return true;
    if ([...this.players.values()].every(p => p.health.isDead)) this.end(false);
    return true;
  }

  /** Cura un giocatore (premi della discesa), entro la vita massima; conta nel resoconto. */
  heal(playerId: string, amount: number): number {
    const player = this.players.get(playerId);
    if (player === undefined || player.health.isDead) return 0;
    const healed = player.health.heal(amount);
    const stats = this.report.get(playerId);
    if (stats) stats.healing += healed;
    return healed;
  }

  private hitBoss(amount: number, owner = this.actingId, hit?: HitEffect): void {
    const boss = this.boss;
    if (this.status !== 'playing' || boss === null || boss.health.isDead) return;
    const resolved = amount * this.classCombat.damageMultiplier('boss');
    const actual = boss.health.takeDamage(resolved);
    if (actual > 0) { this.classCombat.onDamage(owner, actual); this.classCombat.applyHit('boss', owner, hit); }
    const stats = this.report.get(owner);
    if (stats) stats.damageDealt += actual;
    this.events.emit({ type: 'damage_dealt', target: 'boss', amount: actual, position: boss.position, playerId: owner });
    if (boss.health.isDead) {
      this.events.emit({ type: 'boss_defeated', position: boss.position });
      // Con il boss cadono anche i suoi servitori.
      this.dismissMinions();
      if (this.encounter !== null) this.encounter.onBossDefeated(this);
      else this.end(true);
    }
  }

  private hitMinion(minion: Minion, amount: number, owner: string = this.actingId, via: MinionHitVia = 'projectile', hit?: HitEffect): void {
    if (this.status !== 'playing' || minion.isDead || minion.isHidden) return;
    wakeIfDormant(minion, this.minionContext);
    if (minion.warded) {
      // Lo scudo dell'elite ferma i proiettili; una zona o un colpo ravvicinato lo spezzano.
      if (via === 'projectile') return;
      minion.warded = false;
    }
    let damage = amount * this.classCombat.damageMultiplier(`minion:${minion.id}`);
    if (via === 'projectile' && minion.shield > 0) {
      const absorbed = Math.min(minion.shield, damage * (1 - (hit?.penetration ?? 0)));
      minion.shield -= absorbed;
      damage -= absorbed;
      if (damage <= 0) return;
    }
    const actual = minion.health.takeDamage(damage);
    if (actual > 0) { this.classCombat.onDamage(owner, actual); this.classCombat.applyHit(`minion:${minion.id}`, owner, hit); }
    const stats = this.report.get(owner);
    if (stats) stats.damageDealt += actual;
    this.events.emit({ type: 'damage_dealt', target: 'minion', amount: actual, position: minion.position, minionId: minion.id, playerId: owner });
    if (minion.health.isDead) this.killMinion(minion, false, via);
  }

  /**
   * Toglie un servitore (morto, esploso o sparito con il boss o con la stanza) e lo racconta. Con `effects` (la morte
   * in combattimento) scattano i suoi effetti: rinascita, divisione, pozza, anello di schegge, gemello.
   */
  private killMinion(minion: Minion, exploded: boolean, via: MinionHitVia, effects = true): void {
    const definition = minion.definition;
    this.tokens.delete(minion.id);
    minion.hasToken = false;
    const death = definition.onDeath;
    if (effects && !exploded && death?.kind === 'revive' && !minion.revived && via === 'projectile') {
      // Lo scheletro crolla e si rialza, a meno che non lo finisca una zona o un colpo ravvicinato.
      minion.revived = true;
      minion.health.current = 0;
      minion.state = 'reviving';
      minion.stateTimer = death.delay;
      minion.pending = null;
      this.events.emit({ type: 'minion_defeated', position: minion.position, minionId: minion.id, visual: definition.visual, revives: true });
      return;
    }
    if (minion.state === 'reviving') minion.state = 'idle';
    if (!minion.health.isDead) minion.health.takeDamage(minion.health.current);
    this.events.emit({ type: 'minion_defeated', position: minion.position, minionId: minion.id, visual: definition.visual, ...(exploded ? { exploded } : {}) });
    if (!effects) return;
    this.deathEffects(minion);
    this.encounter?.onMinionKilled?.(this, minion, exploded);
  }

  private deathEffects(minion: Minion): void {
    const { definition } = minion;
    const source: DamageSource = { kind: 'minion', name: definition.name };
    const death = definition.onDeath;
    if (death?.kind === 'split' && !(definition.inertWhenSlowed && minion.slowFor > 0)) {
      const into = MINIONS[death.into];
      if (into !== undefined) {
        for (let i = 0; i < death.count; i++) {
          const angle = (i * TAU) / death.count + minion.id;
          this.spawnMinion(into, minion.position.add(Vec2.fromAngle(angle, minion.hitRadius)), { maxHealth: this.minionHealth(into), parentId: minion.id });
        }
      }
    }
    if (death?.kind === 'pool') this.pool(death, minion.position, source);
    if (death?.kind === 'ring') {
      for (let i = 0; i < death.count; i++) {
        this.spawnProjectile(death.projectile, minion.position, (i * TAU) / death.count + minion.heading);
        this.sources.set(this.nextId - 1, source);
      }
    }
    const elite = minion.elite;
    if (elite?.deathPool) this.pool(elite.deathPool, minion.position, source);
    if (elite?.twin) this.spawnMinion(definition, minion.position, { maxHealth: this.minionHealth(definition) });
  }

  /** Una pozza: la prima zona subito, le altre a intervalli nello stesso punto. */
  private pool(pool: { readonly zone: DangerZoneSpec; readonly pulses: number; readonly interval: number }, position: Vec2, source: DamageSource): void {
    this.spawnHazardZone(pool.zone, position, source);
    for (let i = 1; i < pool.pulses; i++) this.delayed.push({ at: this.time + i * pool.interval, spec: pool.zone, position, source });
  }

  /** Fine della partita (vittoria o sconfitta). La discesa la chiama quando il gruppo attraversa una porta. */
  end(won: boolean): void {
    if (this.status !== 'playing') return;
    this.status = won ? 'won' : 'lost';
    this.events.emit({ type: 'match_ended', won });
  }
}

/** Sposta i giocatori attorno alla partenza, cosi' in cooperativa non nascono uno sopra l'altro. */
export function spreadPlayers(match: Match): void {
  let index = 0;
  for (const player of match.players.values()) {
    const offset = new Vec2((index % 2) * 48 - 24, Math.floor(index / 2) * 48);
    player.position = moveBody(match.arena, player.position, player.position.add(offset), 10, match.arena.playerMargin);
    player.aim = player.position;
    index++;
  }
}
