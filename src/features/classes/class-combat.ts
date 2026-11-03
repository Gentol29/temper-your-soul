import { BOSS_SPECIAL, CLASS_COMBAT } from './combat-tuning';
import { BODY_RADIUS } from '../combat/collision';
import { Vec2 } from '../../core/vec2';
import type { Rng } from '../../core/rng';
import { blockerAt, clampToArena, detourAround, moveBody, pushOutOfPillars, sightBlocked, type ArenaDefinition } from '../arena/arena';
import type { Health } from '../combat/health';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import { StatusRuntime, type ActiveStatus } from '../combat/status-effects/status-runtime';
import type { Player } from '../player/player';
import { BLEEDING, type CombatPet } from './archer/pet';
import type { HitEffect, PetSpec } from './skill-mechanics';

export interface EnemyTarget {
  readonly id: string;
  readonly position: Vec2;
  readonly health: Health;
  readonly radius: number;
  readonly kind: 'boss' | 'lieutenant' | 'minion';
  slow(seconds: number): void;
  root(seconds: number): void;
  hurt(damage: number, owner: string): void;
}
interface CombatContext {
  readonly players: ReadonlyMap<string, Player>;
  readonly arena: ArenaDefinition;
  readonly rng: Rng;
  enemies(): EnemyTarget[];
  heal(owner: string, amount: number): number;
  emit(event: GameEvent): void;
  enemyProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void;
}
export interface ClassCombatSnapshot {
  pets: { owner: string; position: Vec2; remaining: number; target: string | null }[];
  statuses: { target: string; status: string; remaining: number }[];
  players: { id: string; guard: boolean; buff: boolean; channel: number; rushing: boolean; charges: number[] }[];
  marks: { owner: string; target: string }[];
  taunts: { owner: string; remaining: number; radius: number }[];
  heavy: { position: Vec2; target: Vec2; remaining: number } | null;
}

/** Meccaniche di classe isolate dal ciclo generale della partita. Solo il server/singolo le fa avanzare. */
export class ClassCombat {
  readonly statuses = new StatusRuntime();
  readonly pets = new Map<string, CombatPet>();
  readonly marks = new Map<string, string>();
  private taunts: { owner: string; remaining: number; radius: number }[] = [];
  private heavyIn: number = BOSS_SPECIAL.firstDelay;
  private heavy: ClassCombatSnapshot['heavy'] = null;
  remote: ClassCombatSnapshot | null = null;

  constructor(private readonly ctx: CombatContext) {}

  taunt(owner: string, radius: number, duration: number): void {
    this.taunts = this.taunts.filter(entry => entry.owner !== owner);
    this.taunts.push({ owner, radius, remaining: duration });
    const player = this.ctx.players.get(owner);
    if (player) this.ctx.emit({ type: 'status_applied', position: player.position, status: 'taunted', seconds: duration, playerId: owner });
  }

  forcedTarget(point: Vec2): Player | undefined {
    for (let i = this.taunts.length - 1; i >= 0; i--) {
      const entry = this.taunts[i], player = this.ctx.players.get(entry.owner);
      if (entry.remaining > 0 && player && !player.health.isDead && point.distanceTo(player.position) <= entry.radius) return player;
    }
    return undefined;
  }

  summon(owner: string, spec: PetSpec): void {
    const player = this.ctx.players.get(owner);
    if (!player) return;
    this.pets.set(owner, { owner, spec, position: this.petGround(player.position.add(new Vec2(-32, 24))), remaining: spec.duration, attackIn: 0, target: null });
  }

  /** Il punto del pavimento piu' vicino per il lupo (raggio 8): mai dentro un pilastro, un massiccio, un riparo o un pozzo. */
  private petGround(point: Vec2): Vec2 {
    const arena = this.ctx.arena;
    return pushOutOfPillars(arena, clampToArena(arena, point, arena.playerMargin), 8);
  }

  applyHit(targetId: string, owner: string, hit?: HitEffect): void {
    if (!hit) return;
    const target = this.ctx.enemies().find(enemy => enemy.id === targetId);
    if (!target || target.health.isDead) return;
    if (hit.mark) this.marks.set(owner, targetId);
    if (this.statuses.apply(targetId, owner, hit, this.ctx.rng)) {
      this.ctx.emit({ type: 'status_applied', position: target.position, status: hit.status!, seconds: hit.duration ?? 3, playerId: owner });
    }
  }

  damageMultiplier(target: string): number { return this.statuses.has(target, 'exposed') ? CLASS_COMBAT.exposedMultiplier : 1; }

  onDamage(owner: string, actual: number): void {
    const player = this.ctx.players.get(owner);
    if (player && !player.health.isDead) this.ctx.heal(owner, actual * player.buffValue('lifesteal'));
  }

  step(dt: number): void {
    const targets = this.ctx.enemies(), byId = new Map(targets.map(target => [target.id, target]));
    this.statuses.step(dt, id => { const target = byId.get(id); return target !== undefined && !target.health.isDead; }, (id, damage, owner) => {
      byId.get(id)?.hurt(damage, owner);
    });
    for (const target of targets) {
      if (this.statuses.has(target.id, 'soaked')) target.slow(dt * 2);
      if (this.statuses.has(target.id, 'rooted')) target.root(dt * 2);
    }
    for (const [id, player] of this.ctx.players) {
      if (player.health.isDead) { player.rush = null; player.channel = null; player.buffs = []; continue; }
      this.ctx.heal(id, player.buffs.reduce((sum, buff) => sum + (buff.regeneration ?? 0) * Math.min(dt, buff.remaining), 0));
      for (const buff of player.buffs) buff.remaining -= dt;
      player.buffs = player.buffs.filter(buff => buff.remaining > 1e-9);
      this.stepRush(player, id, dt, targets);
    }
    for (const entry of this.taunts) entry.remaining -= dt;
    this.taunts = this.taunts.filter(entry => entry.remaining > 0 && !this.ctx.players.get(entry.owner)?.health.isDead);
    this.stepPets(dt);
    this.stepHeavy(dt);
  }

  private stepRush(player: Player, owner: string, dt: number, targets: readonly EnemyTarget[]): void {
    const rush = player.rush;
    if (!rush) return;
    const travel = Math.min(dt, rush.remaining) * rush.speed;
    const steps = Math.max(1, Math.ceil(travel / 4));
    for (let i = 0; i < steps; i++) {
      const next = player.position.add(Vec2.fromAngle(rush.angle, travel / steps));
      const moved = moveBody(this.ctx.arena, player.position, next, BODY_RADIUS.player, this.ctx.arena.playerMargin);
      if (moved.distanceTo(player.position) < travel / steps * 0.3) { rush.remaining = 0; break; }
      player.position = moved;
      for (const target of targets) {
        if (!target.health.isDead && rush.damage > 0 && !rush.hit.has(target.id) && moved.distanceTo(target.position) < target.radius + CLASS_COMBAT.rushHitMargin && !sightBlocked(this.ctx.arena, moved, target.position)) {
          rush.hit.add(target.id); target.hurt(rush.damage, owner);
        }
      }
    }
    rush.remaining -= dt;
    if (rush.remaining <= 0) player.rush = null;
  }

  private stepPets(dt: number): void {
    for (const [owner, pet] of this.pets) {
      const player = this.ctx.players.get(owner);
      pet.remaining -= dt; pet.attackIn -= dt;
      if (!player || player.health.isDead || pet.remaining <= 0) { this.pets.delete(owner); continue; }
      const enemies = this.ctx.enemies().filter(enemy => !enemy.health.isDead);
      const marked = enemies.find(enemy => enemy.id === this.marks.get(owner));
      const previous = enemies.find(enemy => enemy.id === pet.target);
      const nearby = enemies.filter(enemy => enemy.position.distanceTo(pet.position) < CLASS_COMBAT.petAcquireRadius)
        .sort((a, b) => a.position.distanceTo(pet.position) - b.position.distanceTo(pet.position))[0];
      // Può iniziare a cacciare anche senza marchio, e ripartire dopo un'ondata senza bersagli.
      const target = marked ?? previous ?? nearby;
      pet.target = target?.id ?? null;
      // La meta sta sempre sul pavimento: un pipistrello sopra un pozzo si aspetta sulla riva.
      const destination = this.petGround(target?.position ?? player.position.add(new Vec2(-32, 24)));
      // Nelle stanze con i massicci il lupo li aggira da un angolo all'altro, come i servitori a terra.
      const offset = detourAround(this.ctx.arena, pet.position, destination, 8).sub(pet.position), distance = offset.length();
      if (destination.distanceTo(pet.position) > 12 && distance > 0) {
        const next = pet.position.add(offset.mul(Math.min(distance, pet.spec.speed * dt) / distance));
        pet.position = moveBody(this.ctx.arena, pet.position, next, 8, this.ctx.arena.playerMargin);
      }
      if (target && pet.attackIn <= 0 && pet.position.distanceTo(target.position) <= target.radius + CLASS_COMBAT.petHitMargin && !sightBlocked(this.ctx.arena, pet.position, target.position)) {
        const before = target.health.current;
        target.hurt(pet.spec.damage, owner); pet.attackIn = pet.spec.interval;
        if (target.health.current < before) this.applyHit(target.id, owner, {
          status: 'bleeding', chance: BLEEDING.chance, duration: BLEEDING.duration,
          damagePerSecond: target.health.max * BLEEDING[target.kind],
        });
        this.ctx.emit({ type: 'skill_cast', skillId: 'reed_mantle', visual: 'archer_wolf', kind: 'melee_arc', origin: pet.position,
          destination: pet.position, angle: pet.position.angleTo(target.position), range: 24, arc: 1.8, playerId: owner });
        if (target.health.isDead) {
          const next = enemies.find(enemy => enemy.id !== target.id && !enemy.health.isDead && enemy.position.distanceTo(pet.position) <= pet.spec.leapRange);
          pet.target = next?.id ?? null;
          // Il salto atterra solo sul pavimento: niente balzi su chi vola sopra un pozzo o un riparo.
          if (next && !sightBlocked(this.ctx.arena, pet.position, next.position) && blockerAt(this.ctx.arena, next.position, 8) === undefined) pet.position = next.position;
        }
      }
    }
  }

  /** Colpo speciale comune dei boss: preparazione distinta, proiettile rosso non cancellabile. */
  private stepHeavy(dt: number): void {
    if (![...this.ctx.players.values()].some(player => player.characterClass !== null)) return;
    const boss = this.ctx.enemies().find(enemy => enemy.kind !== 'minion');
    if (!boss) { this.heavy = null; return; }
    this.heavyIn -= dt;
    if (this.heavy) {
      this.heavy.position = boss.position;
      this.heavy.remaining -= dt;
      if (this.heavy.remaining <= 0) {
        this.ctx.enemyProjectile(BOSS_SPECIAL.projectile, boss.position, boss.position.angleTo(this.heavy.target));
        this.heavy = null;
      }
      return;
    }
    if (this.heavyIn > 0) return;
    this.heavyIn = BOSS_SPECIAL.interval;
    const target = this.forcedTarget(boss.position) ?? [...this.ctx.players.values()].filter(player => !player.health.isDead)
      .sort((a, b) => a.position.distanceTo(boss.position) - b.position.distanceTo(boss.position))[0];
    if (!target) return;
    this.heavy = { position: boss.position, target: target.position, remaining: BOSS_SPECIAL.windup };
    this.ctx.emit({ type: 'boss_attack', patternId: 'unstoppable_strike', position: boss.position, name: 'Colpo imparabile · usa la parata o schiva!',
      color: '#ff4040', labelOffsetY: -85 });
    this.ctx.emit({ type: 'boss_pose', seconds: BOSS_SPECIAL.windup });
  }

  snapshot(): ClassCombatSnapshot {
    if (this.remote) return this.remote;
    return {
      pets: [...this.pets.values()].map(pet => ({ owner: pet.owner, position: pet.position, remaining: pet.remaining, target: pet.target })),
      statuses: [...this.statuses.active.values()].map((effect: ActiveStatus) => ({ target: effect.target, status: effect.status, remaining: effect.remaining })),
      players: [...this.ctx.players].map(([id, player]) => ({ id, guard: player.guarding, buff: player.buffs.length > 0,
        channel: player.channel?.remaining ?? 0, rushing: player.rush !== null, charges: player.skillBar.chargeCounts() })),
      marks: [...this.marks].map(([owner, target]) => ({ owner, target })),
      taunts: this.taunts.map(entry => ({ ...entry })), heavy: this.heavy,
    };
  }
}
