import { MOB_REWARDS, mobReward } from './mob-rewards';
import { Vec2 } from '../../core/vec2';
import type { Encounter } from '../match/encounter';
import type { Match } from '../match/match';
import { THEME_ELITES } from '../minions/elites';
import type { Minion } from '../minions/minion';
import type { MinionDefinition } from '../minions/minion-definition';
import type { Loadout } from '../skills/skill-definition';
import { planWaves, WaveDirector, type WavePlan } from './director';
import { HazardRunner, HAZARDS } from './hazards';
import { bestiaryEntry, ROOM_BESTIARY, type BestiaryEntry } from './room-bestiary';
import { onDoor, roomDoors, spawnPoints, type RoomDoor, type RoomTemplate } from './room-templates';
import { DESCENT, ROOM_COMBAT, type DoorOption } from './rooms';
import type { TemperPick } from './tempers';

/*
 * Una stanza della discesa: il suo obiettivo (ondate, Assedio, Caccia, luogotenente, calma), le insidie e le porte. Nessuna ricompensa intermedia. E' guidata dalla partita (`Encounter`): tutto passa dal suo
 * generatore, quindi in cooperativa il server la esegue e i client ne ricevono la vista (`RoomView`).
 */

/** Che cosa c'e' a terra da raccogliere. */
export type PickupKind = 'gold' | 'temper' | 'embers' | 'heal' | 'seal' | 'fountain' | 'anvil' | 'chest';

export interface RoomPickup {
  readonly id: number;
  readonly kind: PickupKind;
  readonly position: Vec2;
  /** Braci o frazione di vita. */
  readonly amount: number;
  /** Chi l'ha gia' preso (ogni giocatore ha il suo premio; il sigillo e' di tutti). */
  readonly takenBy: string[];
  readonly shared: boolean;
  /** Premi alternativi (fonte o incudine del santuario): prenderne uno toglie gli altri dello stesso gruppo. */
  readonly group?: string;
  /** Tempo dall'uscita dell'oro dal corpo: emissione, poi volo e assorbimento. */
  age?: number;
}

/** Un giocatore nella stanza: le skill dell'equipaggiamento, le tempre gia' scelte, quante offerte vede. */
export interface RoomMember {
  readonly loadout: Loadout;
  readonly tempers: readonly TemperPick[];
  readonly offers: number;
  readonly secondLife: boolean;
  /** Scelte di tempra in piu' da proporre quando la stanza e' libera (benedizione Prima scintilla). */
  readonly extraOffers?: number;
}

export interface RoomSetup {
  readonly dungeonId: string;
  readonly option: DoorOption;
  /** Tappa della discesa (da 0). */
  readonly stage: number;
  readonly template: RoomTemplate;
  /** Porte d'uscita (le scelte della tappa successiva); 0 nella stanza del boss. */
  readonly exits: number;
  readonly members: ReadonlyMap<string, RoomMember>;
  /** Grado di tempra della discesa (difficolta' facoltativa). */
  readonly grade: number;
  /** Servitori gia' visti nella discesa. */
  readonly seen: ReadonlySet<string>;
  /** I servitori della stanza (la sua vena, con l'eventuale ospite); senza, quelli di sempre del dungeon. */
  readonly bestiary?: readonly BestiaryEntry[];
}

/** Cio' che la stanza ha dato: la discesa lo raccoglie quando il gruppo attraversa una porta. */
export interface RoomGrants {
  readonly gold: Map<string, number>;
  readonly xp: Map<string, number>;
  readonly embers: Map<string, number>;
  seals: number;
  readonly tempers: Map<string, TemperPick[]>;
  readonly pacts: Set<string>;
  readonly usedSecondLife: Set<string>;
  /** Servitori abbattuti per tipo (per il bestiario). */
  readonly kills: Map<string, number>;
  cleared: boolean;
  /** Esito della Prova (null fuori dalle Prove). */
  trial: boolean | null;
}

/** La stanza vista dai client: rappresentazione, interfaccia, rete. Dati semplici. */
export interface RoomView {
  readonly kind: DoorOption['kind'];
  readonly reward: DoorOption['reward'];
  readonly rule?: DoorOption['rule'];
  readonly cleared: boolean;
  readonly wave: number;
  readonly waves: number;
  /** Secondi rimasti (Assedio, Prova a tempo), se contano. */
  readonly countdown: number | null;
  readonly trialFailed: boolean;
  readonly doors: readonly { readonly x: number; readonly y: number; readonly progress: number }[];
  readonly doorsOpen: boolean;
  readonly pickups: readonly { readonly id: number; readonly kind: PickupKind; readonly x: number; readonly y: number; readonly takenBy: readonly string[]; readonly age?: number }[];
  /** Offerte di tempra in attesa, per giocatore. */
  readonly offers: Readonly<Record<string, readonly TemperPick[]>>;
  /** Giocatori a cui il forziere propone un patto. */
  readonly pacts: readonly string[];
  /** Nome della preda della Caccia, se c'e'. */
  readonly preyId: number | null;
}

/** Raggio entro cui un giocatore raccoglie un premio. */


export class RoomEncounter implements Encounter {
  readonly grants: RoomGrants = {
    gold: new Map(), xp: new Map(),
    embers: new Map(),
    seals: 0,
    tempers: new Map(),
    pacts: new Set(),
    usedSecondLife: new Set(),
    kills: new Map(),
    cleared: false,
    trial: null,
  };
  readonly doors: RoomDoor[];
  readonly pickups: RoomPickup[] = [];
  /** Offerte di tempra in attesa di scelta, per giocatore. */
  readonly offers = new Map<string, TemperPick[]>();
  /** Giocatori a cui il forziere propone un patto. */
  readonly pendingPacts = new Set<string>();
  readonly doorProgress: number[];
  director: WaveDirector | null = null;
  /** Le ondate pianificate (per sapere quali servitori compaiono). */
  waves: readonly WavePlan[] = [];
  private hazard: HazardRunner | null = null;

  private trialFailed = false;
  private trialTimer = 0;
  private siegeRemaining = 0;
  private readonly siegeNests = new Set<number>();
  prey: Minion | null = null;
  private lastEnemyAnnounced = false;
  /** Porta attraversata (indice), quando il gruppo esce. */
  exit: number | null = null;
  private readonly healthScale: number;


  private readonly members: Map<string,RoomMember>;
  constructor(readonly setup: RoomSetup) {
    this.members = new Map(setup.members);
    this.doors = roomDoors(setup.template, setup.exits);
    this.doorProgress = this.doors.map(() => 0);
    this.healthScale = (DESCENT.healthScale[setup.dungeonId] ?? 1);
  }

  get kind(): DoorOption['kind'] {
    return this.setup.option.kind;
  }

  get cleared(): boolean {
    return this.grants.cleared;
  }

  attach(match: Match): void {
    const { option, dungeonId } = this.setup;
    const bestiary = this.setup.bestiary ?? ROOM_BESTIARY[dungeonId] ?? [];
    const combat = ROOM_COMBAT[option.kind];
    if (combat.waves > 0 && combat.budget > 0) {
      const players = this.members.size;
      const budget =
        DESCENT.baseBudget * (1 + DESCENT.budgetPerStage * this.setup.stage) * combat.budget * DESCENT.partyBudget(players);
      this.waves = planWaves(
        {
          budget,
          waves: combat.waves,
          bestiary: option.kind === 'hunt' ? bestiary.filter((item) => item.role === 'swarm') : bestiary,
          stage: this.setup.stage,
          eliteChance: option.kind === 'threshold' ? 0 : Math.min(0.9, DESCENT.eliteChance + 0.05 * this.setup.stage),
          maxElites: option.kind === 'threshold' ? 0 : players >= 3 ? 2 : 1,
          themeElite: THEME_ELITES[dungeonId] ?? 'robust',
          seen: this.setup.seen,
        },
        match.rng,
      );
      this.director = new WaveDirector(this.waves, {
        healthScale: this.healthScale,
        aliveCap: DESCENT.aliveCap + DESCENT.aliveCapPerPlayer * Math.max(0, players - 1),
        spawnPoints: spawnPoints(this.setup.template),
        ...(option.kind === 'siege' ? { timedWaves: DESCENT.siegeSeconds / combat.waves } : {}),
      });
    }
    const hazard = HAZARDS[dungeonId];
    if (hazard !== undefined && this.setup.stage >= 2 && ['combat', 'trial', 'siege', 'hunt'].includes(option.kind)) {
      this.hazard = new HazardRunner(hazard, spawnPoints(this.setup.template), match);
    }
    if (option.kind === 'trial') this.grants.trial = null;
    if (option.kind === 'siege') this.startSiege(match, bestiary);
    if (option.kind === 'hunt') this.startHunt(match, bestiary);
    if (option.kind === 'sanctuary' || option.kind === 'reliquary' || option.kind === 'antechamber') this.clear(match, false);
  }

  /** Assedio: due nidi (o pesanti) e un conto alla rovescia; ogni nido distrutto lo accorcia. */
  private startSiege(match: Match, bestiary: readonly BestiaryEntry[]): void {
    this.siegeRemaining = DESCENT.siegeSeconds;
    const anchors = bestiary.filter((item) => item.role === 'nest' || item.role === 'support');
    const pool = anchors.length > 0 ? anchors : bestiary.filter((item) => item.role === 'heavy');
    const center = new Vec2(match.arena.width / 2, match.arena.height * 0.4);
    pool.slice(0, 1).forEach((item) => {
      for (const side of [-1, 1]) {
        const nest = match.spawnMinion(item.minion, center.add(new Vec2(side * match.arena.width * 0.28, 0)), {
          maxHealth: Math.round(item.health * this.healthScale),
        });
        this.siegeNests.add(nest.id);
      }
    });
  }

  /** Caccia: la preda (una minaccia del dungeon, molto robusta) fugge e chiama la folla. */
  private startHunt(match: Match, bestiary: readonly BestiaryEntry[]): void {
    const threats = bestiary.filter((item) => item.role === 'threat' && item.minion.behavior !== 'turret');
    const swarm = bestiary.find((item) => item.role === 'swarm');
    const quarry = threats[Math.floor(match.rng.next() * threats.length)] ?? bestiary[0];
    if (quarry === undefined) return;
    const definition: MinionDefinition = {
      ...quarry.minion,
      speed: Math.max(quarry.minion.speed, 90),
      ...(swarm ? { nest: { spawn: swarm.minion.id, interval: 3.4, firstDelay: 1.2, burst: 2, maxChildren: 6 } } : {}),
    };
    this.prey = match.spawnMinion(definition, new Vec2(match.arena.width / 2, match.arena.height * 0.3), {
      maxHealth: Math.round(quarry.health * this.healthScale * 7),
      prey: true,
      elite: 'robust',
    });
  }

  step(dt: number, match: Match): void {
    for (const pickup of this.pickups) {
      if (pickup.kind !== 'gold') continue;
      pickup.age = Math.min(MOB_REWARDS.emergeSeconds + MOB_REWARDS.flightSeconds, (pickup.age ?? 0) + Math.max(0, dt));
      if (pickup.age + 1e-9 >= MOB_REWARDS.emergeSeconds + MOB_REWARDS.flightSeconds) this.absorbGold(match, pickup);
    }
    if (!this.grants.cleared) {
      this.director?.step(dt, match);
      this.hazard?.step(dt, match);
      this.checkTrial(dt, match);
      if (this.kind === 'siege') {
        this.siegeRemaining -= dt;
        if (this.siegeRemaining <= 0) this.clear(match, true);
      } else if (this.kind === 'hunt') {
        if (this.prey === null || this.prey.isDead) this.clear(match, true);
      } else if (this.director !== null && this.director.done) {
        const hostile = match.hostileCount();
        if (hostile === 1 && !this.lastEnemyAnnounced) {
          this.lastEnemyAnnounced = true;
          const last = match.minions.find((minion) => !minion.isDead && minion.hostile);
          if (last) match.events.emit({ type: 'last_enemy', position: last.position });
        }
        if (hostile === 0) this.clear(match, true);
      }
      return;
    }
    this.walkDoors(dt, match);
  }

  private absorbGold(match: Match, pickup: RoomPickup): void {
    for (const [id, player] of match.players) {
      if (player.health.isDead || pickup.takenBy.includes(id)) continue;
      pickup.takenBy.push(id);
      this.grants.gold.set(id, (this.grants.gold.get(id) ?? 0) + pickup.amount);
      match.events.emit({type:'reward_taken',reward:'gold',amount:pickup.amount,position:player.position,playerId:id});
    }
  }

  /** Il cambio stanza non perde l'oro già emesso che stava volando verso i superstiti. */
  settleGold(match: Match): void {
    for (const pickup of this.pickups) if (pickup.kind === 'gold') this.absorbGold(match, pickup);
  }

  /** Prova: senza un graffio (nessun danno subito) o contro il tempo. */
  private checkTrial(dt: number, match: Match): void {
    const rule = this.setup.option.rule;
    if (this.kind !== 'trial' || this.trialFailed || rule === undefined) return;
    this.trialTimer += dt;
    const hurt = [...match.report.values()].some((stats) => stats.damageReceived > 0);
    if ((rule === 'unscathed' && hurt) || (rule === 'timed' && this.trialTimer > DESCENT.trialSeconds)) this.trialFailed = true;
  }

  onBossDefeated(match: Match): void {
    // Nella stanza del boss la discesa finisce; il luogotenente libera la stanza.
    if (this.kind === 'boss') {
      match.end(true);
      return;
    }
    // Il luogotenente apre la sua pagina del bestiario come un servitore.
    if (match.boss !== null) this.rewardMob(match, match.boss.position);
    if (match.boss !== null) this.grants.kills.set(match.boss.definition.id, (this.grants.kills.get(match.boss.definition.id) ?? 0) + 1);
    this.clear(match, true, match.boss?.position);
  }

  onMinionKilled(match: Match, minion: Minion, exploded: boolean): void {
    if (!exploded) this.rewardMob(match, minion.position);
    if (!exploded) this.grants.kills.set(minion.definition.id, (this.grants.kills.get(minion.definition.id) ?? 0) + 1);
    if (this.siegeNests.delete(minion.id)) this.siegeRemaining -= DESCENT.siegeNestBonus;
    if (minion === this.prey && !this.grants.cleared) this.clear(match, true);
  }

  private rewardMob(match: Match, position: Vec2): void {
    const reward = mobReward(this.setup.dungeonId);
    for (const [id, player] of match.players) {
      this.grants.xp.set(id, (this.grants.xp.get(id) ?? 0) + reward.xp);
      player.setExperience(player.totalXp + reward.xp);
      match.events.emit({ type: 'reward_taken', reward: 'xp', amount: reward.xp, position: player.position, playerId: id });
    }
    if (match.rng.next() < MOB_REWARDS.chance) this.pickups.push({
      id: this.pickups.length + 1, kind: 'gold', position, amount: reward.gold, takenBy: [], shared: false, age: 0,
    });
  }

  minionHealth(definition: MinionDefinition): number {
    const entry = bestiaryEntry(this.setup.dungeonId, definition.id);
    return Math.max(1, Math.round((entry?.health ?? definition.maxHealth) * this.healthScale));
  }

  /** Nessuna benedizione, patto o seconda vita della vecchia progressione. */
  onPlayerDown(_match: Match, _playerId: string): boolean { return false; }

  /** Una stanza libera apre solo le direzioni: niente premi, ristori o potenziamenti. */
  private clear(match: Match, announce: boolean, at?: Vec2): void {
    if (this.grants.cleared) return;
    this.grants.cleared = true;
    this.grants.trial = this.kind === 'trial' ? !this.trialFailed : null;
    this.director?.stop(); this.hazard = null; match.dismissMinions();
    if (announce) match.events.emit({ type: 'room_cleared', position: at ?? new Vec2(match.arena.width / 2, match.arena.height * .5) });
  }

  // Compatibilità delle viste della PR: le vecchie scelte non attribuiscono più bonus.
  currentTempers(_playerId: string): TemperPick[] { return []; }
  addMember(id: string, member: RoomMember): void {
    // La mappa è posseduta da questa stanza; gli altri dati della definizione restano immutabili.
    this.members.set(id, member);
  }
  temperedLoadout(playerId: string): Loadout { return this.members.get(playerId)?.loadout ?? []; }
  chooseOffer(_match: Match, _playerId: string, _index: number): boolean { return false; }
  answerPact(_match: Match, _playerId: string, _accept: boolean): boolean { return false; }

  /** Il gruppo esce da una porta: tutti i vivi sulla stessa soglia per un attimo, nessuna scelta in sospeso. */
  private walkDoors(dt: number, match: Match): void {
    if (this.doors.length === 0 || this.exit !== null) return;
    const living = match.livingPlayers();
    for (const door of this.doors) {
      const everyone = living.length > 0 && living.every((player) => onDoor(door, player.position));
      const progress = this.doorProgress[door.index]!;
      this.doorProgress[door.index] = everyone ? Math.min(1, progress + dt / DESCENT.doorHold) : Math.max(0, progress - dt * 2);
      if (this.doorProgress[door.index]! >= 1) {
        this.exit = door.index;
        match.events.emit({ type: 'room_exited', door: door.index });
        match.end(true);
        return;
      }
    }
  }

  /** La stanza per i client: rappresentazione, interfaccia e rete. */
  view(): RoomView {
    const countdown = this.kind === 'siege' && !this.grants.cleared
      ? Math.max(0, this.siegeRemaining)
      : this.kind === 'trial' && this.setup.option.rule === 'timed' && !this.grants.cleared
        ? Math.max(0, DESCENT.trialSeconds - this.trialTimer)
        : null;
    return {
      kind: this.kind,
      reward: this.setup.option.reward,
      ...(this.setup.option.rule ? { rule: this.setup.option.rule } : {}),
      cleared: this.grants.cleared,
      wave: this.director === null ? 0 : this.director.wave + 1,
      waves: this.director?.waveCount ?? 0,
      countdown,
      trialFailed: this.trialFailed,
      doors: this.doors.map((door) => ({ x: door.position.x, y: door.position.y, progress: this.doorProgress[door.index]! })),
      doorsOpen: this.grants.cleared,
      pickups: this.pickups.map((pickup) => ({ id: pickup.id, kind: pickup.kind, x: pickup.position.x, y: pickup.position.y, takenBy: [...pickup.takenBy], ...(pickup.age === undefined ? {} : { age: pickup.age }) })),
      offers: Object.fromEntries(this.offers),
      pacts: [...this.pendingPacts],
      preyId: this.prey !== null && !this.prey.isDead ? this.prey.id : null,
    };
  }
}
