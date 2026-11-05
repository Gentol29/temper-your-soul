import { bossForParty } from '../combat/party-health';
import { centered } from '../../core/rng';
import { TAU, Vec2 } from '../../core/vec2';
import { clampToArena, pushOutOfPillars } from '../arena/arena';
import { pick, type BossDefinition, type BossPattern, type BossStats, type ByPhase } from '../boss/boss-definition';
import type { DangerZoneSpec } from '../combat/danger-zone';
import { enemyShot, pointAround, schedule, spawnFan, spawnRing, startCharge } from '../boss/pattern-kit';
import { BELFRY_BAT } from '../minions/catalog/crypt';
import { SLAG_PEBBLE } from '../minions/catalog/forge';
import { RAZOR_FLAKE } from '../minions/catalog/glacier';
import { BOG_GNAT } from '../minions/catalog/swamp';

/*
 * I luogotenenti: un servitore maggiore a meta' della discesa, con due o tre schemi del boss in piccolo. Si annunciano
 * e si leggono come il boss; in furia chiamano la folla del loro dungeon. Valori provvisori: la vita resta sotto la
 * meta' di quella del boss del dungeon.
 */

const baseStats = (overrides: Partial<BossStats> & Pick<BossStats, 'maxHealth' | 'speed' | 'hitRadius'>): BossStats => ({
  phaseTwoThreshold: 0.5,
  slowedSpeed: overrides.speed * 0.35,
  orbitDistance: 170,
  orbitSpeedFactor: 0.4,
  firstAttackDelay: 1.6,
  attackInterval: { normal: 2.1, rage: 1.65 },
  attackPose: 0.5,
  contactDistance: overrides.hitRadius + 4,
  contactDamage: 14,
  chargeDamage: 20,
  chargeHitDistance: overrides.hitRadius + 10,
  ...overrides,
});

// --- Cripta: il Doccione del campanile ----------------------------------------------------------------------------

const GARGOYLE_DIVE: BossPattern = {
  id: 'gargoyle_dive',
  name: 'PICCHIATA · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: -38,
  execute(boss, ctx) {
    startCharge(boss, ctx, 0.85, 0.42);
  },
};

const STONE_VOLLEY = { half: 2, spread: 0.17, speed: { normal: 165, rage: 195 } satisfies ByPhase<number>, damage: 12 };

const STONE_VOLLEY_PATTERN: BossPattern = {
  id: 'stone_volley',
  name: 'RAFFICA DI PIETRA',
  labelColor: '#d8cfc0',
  labelOffsetY: -38,
  execute(boss, ctx) {
    const spec = enemyShot(pick(STONE_VOLLEY.speed, boss), STONE_VOLLEY.damage, 5, 'crypt_stone');
    spawnFan(ctx, boss.position, spec, boss.position.angleTo(ctx.target), STONE_VOLLEY.half, STONE_VOLLEY.spread);
  },
};

const BELL_TOLL: BossPattern = {
  id: 'bell_toll',
  name: 'RINTOCCO',
  labelColor: '#eeb184',
  labelOffsetY: -38,
  execute(boss, _ctx) {
    const rings = boss.isEnraged ? 2 : 1;
    for (let ring = 0; ring < rings; ring++) {
      schedule(boss, ring * 0.45, 'bell_ring', (actor, c) => {
        spawnRing(c, actor.position, enemyShot(115 + ring * 20, 11, 5, 'crypt_bell_note'), 14, c.time * 0.7 + ring * 0.22);
      });
    }
  },
};

export const BELFRY_GARGOYLE: BossDefinition = {
  id: 'belfry_gargoyle',
  name: 'DOCCIONE DEL CAMPANILE',
  art: 'belfry_gargoyle',
  rageText: 'IL DOCCIONE SPIEGA LE ALI',
  stats: baseStats({ maxHealth: 800, speed: 110, hitRadius: 22, contactDamage: 14, chargeDamage: 20 }),
  patterns: [STONE_VOLLEY_PATTERN, GARGOYLE_DIVE, BELL_TOLL],
  summons: { minion: BELFRY_BAT, onRage: 4, everyAttacks: 4, wave: 3, maxAlive: 6, ringRadius: 70 },
};

// --- Palude: il Rospo re ------------------------------------------------------------------------------------------

const GREAT_LEAP = { windup: 0.9, duration: 0.5, zone: { team: 'enemy', radius: 70, delay: 1.35, damage: 18, visual: 'swamp_toad_landing' } satisfies DangerZoneSpec };

const GREAT_LEAP_PATTERN: BossPattern = {
  id: 'great_leap',
  name: 'GRANDE BALZO · SPOSTATI!',
  labelColor: '#d6e06a',
  labelOffsetY: -44,
  execute(boss, ctx) {
    startCharge(boss, ctx, GREAT_LEAP.windup, GREAT_LEAP.duration);
    if (boss.charge !== null) ctx.spawnZone(GREAT_LEAP.zone, boss.charge.target);
  },
};

const MUD_RAIN = { zones: { normal: 4, rage: 6 } satisfies ByPhase<number>, spread: 320, zone: { team: 'enemy', radius: 44, delay: 1.2, damage: 16, visual: 'swamp_spit' } satisfies DangerZoneSpec };

const MUD_RAIN_PATTERN: BossPattern = {
  id: 'mud_rain',
  name: 'PIOGGIA DI FANGO',
  labelColor: '#c9d870',
  labelOffsetY: -44,
  execute(boss, ctx) {
    for (let i = 0; i < pick(MUD_RAIN.zones, boss); i++) {
      const dx = i ? centered(ctx.rng) * MUD_RAIN.spread : 0;
      const dy = i ? centered(ctx.rng) * MUD_RAIN.spread : 0;
      ctx.spawnZone(MUD_RAIN.zone, clampToArena(boss.arena, new Vec2(ctx.target.x + dx, ctx.target.y + dy), boss.arena.bossMargin));
    }
  },
};

const TONGUE_LASH: BossPattern = {
  id: 'tongue_lash',
  name: 'LINGUATA',
  labelColor: '#e7a0c0',
  labelOffsetY: -44,
  execute(boss, _ctx) {
    const bursts = boss.isEnraged ? 4 : 3;
    for (let i = 0; i < bursts; i++) {
      schedule(boss, i * 0.3, 'tongue', (actor, c) => {
        spawnFan(c, actor.position, enemyShot(190, 13, 6, 'swamp_spore'), actor.position.angleTo(c.target), 1, 0.12);
      });
    }
  },
};

export const TOAD_KING: BossDefinition = {
  id: 'toad_king',
  name: 'ROSPO RE',
  art: 'toad_king',
  rageText: 'IL ROSPO RE SI GONFIA',
  stats: baseStats({ maxHealth: 1000, speed: 80, hitRadius: 28, contactDamage: 16, chargeDamage: 22 }),
  patterns: [MUD_RAIN_PATTERN, GREAT_LEAP_PATTERN, TONGUE_LASH],
  summons: { minion: BOG_GNAT, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 80 },
};

// --- Palude: la Regina serpente (al posto del Rospo re) -----------------------------------------------------------

const VENOM_SPIT = { half: 2, spread: 0.14, speed: { normal: 185, rage: 215 } satisfies ByPhase<number>, damage: 13 };

const VENOM_SPIT_PATTERN: BossPattern = {
  id: 'venom_spit',
  name: 'SPUTO VELENOSO',
  labelColor: '#9fd070',
  labelOffsetY: -98,
  execute(boss, ctx) {
    const spec = enemyShot(pick(VENOM_SPIT.speed, boss), VENOM_SPIT.damage, 6, 'swamp_spore');
    spawnFan(ctx, boss.position, spec, boss.position.angleTo(ctx.target), VENOM_SPIT.half, VENOM_SPIT.spread);
  },
};

const TAIL_LUNGE: BossPattern = {
  id: 'tail_lunge',
  name: 'COLPO DI CODA · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: -98,
  execute(boss, ctx) {
    startCharge(boss, ctx, 0.9, 0.5);
  },
};

const VENOM_RING = { zone: { team: 'enemy', radius: 40, delay: 1.2, damage: 16, visual: 'swamp_spit' } satisfies DangerZoneSpec, shots: 14 };

const VENOM_RING_PATTERN: BossPattern = {
  id: 'venom_ring',
  name: 'ANELLO DI VELENO',
  labelColor: '#d6e06a',
  labelOffsetY: -98,
  execute(boss, ctx) {
    ctx.spawnZone(VENOM_RING.zone, clampToArena(boss.arena, ctx.target, boss.arena.bossMargin));
    const rings = boss.isEnraged ? 2 : 1;
    for (let ring = 0; ring < rings; ring++) {
      schedule(boss, ring * 0.45, 'venom_ring_shots', (actor, c) => {
        spawnRing(c, actor.position, enemyShot(120 + ring * 25, 11, 6, 'swamp_spore'), VENOM_RING.shots, c.time * 0.6 + ring * 0.22);
      });
    }
  },
};

export const SERPENT_QUEEN: BossDefinition = {
  id: 'serpent_queen',
  name: 'REGINA SERPENTE',
  art: 'serpent_queen',
  rageText: 'LA REGINA SERPENTE SI SRODOLA',
  // Stessa vita, velocita' e danni del Rospo re che sostituisce; solo il raggio di colpo segue la figura piu' grande.
  stats: baseStats({ maxHealth: 1000, speed: 80, hitRadius: 40, contactDamage: 16, chargeDamage: 22 }),
  patterns: [VENOM_SPIT_PATTERN, VENOM_RING_PATTERN, TAIL_LUNGE],
  summons: { minion: BOG_GNAT, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 90 },
};

// --- Fucina: il Mastro d'incudine ---------------------------------------------------------------------------------

const ANVIL_SLAM = { zone: { team: 'enemy', radius: 64, delay: 1, damage: 22, visual: 'forge_anvil_slam' } satisfies DangerZoneSpec, shards: 12 };

const ANVIL_SLAM_PATTERN: BossPattern = {
  id: 'anvil_slam',
  name: 'MARTELLATA',
  labelColor: '#ffcf8a',
  labelOffsetY: -48,
  execute(boss, ctx) {
    const point = clampToArena(boss.arena, ctx.target, boss.arena.bossMargin);
    ctx.spawnZone(ANVIL_SLAM.zone, point);
    schedule(boss, ANVIL_SLAM.zone.delay, 'shards', (_actor, c) => {
      spawnRing(c, point, enemyShot(150, 10, 5, 'forge_anvil_shard', 2.4), ANVIL_SLAM.shards, c.time);
    });
  },
};

const IRON_RUSH: BossPattern = {
  id: 'iron_rush',
  name: 'CARICA DI FERRO · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: -48,
  execute(boss, ctx) {
    startCharge(boss, ctx, 0.85, 0.5);
  },
};

const EMBER_CROSS: BossPattern = {
  id: 'ember_cross',
  name: 'CROCE DI BRACI',
  labelColor: '#e8d8ff',
  labelOffsetY: -48,
  execute(boss, _ctx) {
    const waves = boss.isEnraged ? 4 : 3;
    for (let wave = 0; wave < waves; wave++) {
      schedule(boss, wave * 0.25, 'cross', (actor, c) => {
        const base = actor.position.angleTo(c.target) + (actor.isEnraged && wave % 2 ? Math.PI / 4 : 0);
        for (let i = 0; i < 4; i++) c.spawnProjectile(enemyShot(170, 11, 5, 'forge_cross_bolt'), actor.position, base + (i * TAU) / 4);
      });
    }
  },
};

export const ANVIL_MASTER: BossDefinition = {
  id: 'anvil_master',
  name: "MASTRO D'INCUDINE",
  art: 'anvil_master',
  rageText: "IL MASTRO D'INCUDINE ARROVENTA IL MARTELLO",
  stats: baseStats({ maxHealth: 1100, speed: 70, hitRadius: 30, contactDamage: 18, chargeDamage: 24 }),
  patterns: [ANVIL_SLAM_PATTERN, EMBER_CROSS, IRON_RUSH],
  summons: { minion: SLAG_PEBBLE, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 90 },
};

// --- Ghiacciaio: la Prima allieva ---------------------------------------------------------------------------------

const FROST_STEP: BossPattern = {
  id: 'frost_step',
  name: 'SALTO GELIDO',
  labelColor: '#cfefff',
  labelOffsetY: -40,
  execute(boss, ctx) {
    const angle = ctx.rng.next() * TAU;
    const raw = pointAround(boss, ctx.target, angle, 300);
    const to = pushOutOfPillars(boss.arena, raw, boss.stats.hitRadius);
    const from = boss.position;
    boss.position = to;
    ctx.emit({ type: 'boss_teleported', from, to });
    schedule(boss, 0.35, 'blink_fan', (actor, c) => {
      spawnFan(c, actor.position, enemyShot(165, 11, 5, 'glacier_blink_shot'), actor.position.angleTo(c.target), 2, 0.16);
    });
  },
};

const TWIN_NOVA: BossPattern = {
  id: 'twin_nova',
  name: 'NOVA GELIDA',
  labelColor: '#9fe4ff',
  labelOffsetY: -40,
  execute(boss, ctx) {
    spawnRing(ctx, boss.position, enemyShot(120, 11, 5, 'glacier_nova'), 12, ctx.time);
    schedule(boss, 0.4, 'nova_outer', (actor, c) => {
      spawnRing(c, actor.position, enemyShot(150, 11, 5, 'glacier_nova_late'), 12, c.time + Math.PI / 12);
    });
  },
};

const SHARD_SPRAY: BossPattern = {
  id: 'shard_spray',
  name: 'SCHEGGE',
  labelColor: '#aef0ff',
  labelOffsetY: -40,
  execute(boss, ctx) {
    spawnFan(ctx, boss.position, enemyShot(boss.isEnraged ? 195 : 175, 12, 5, 'glacier_shard', 3), boss.position.angleTo(ctx.target), 3, 0.12);
  },
};

export const FIRST_APPRENTICE: BossDefinition = {
  id: 'first_apprentice',
  name: 'PRIMA ALLIEVA',
  art: 'first_apprentice',
  rageText: 'LA PRIMA ALLIEVA ALZA LA BUFERA',
  stats: baseStats({ maxHealth: 1200, speed: 130, hitRadius: 20, contactDamage: 14, chargeDamage: 20, orbitDistance: 220 }),
  patterns: [SHARD_SPRAY, FROST_STEP, TWIN_NOVA],
  summons: { minion: RAZOR_FLAKE, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 80 },
};

/** Il luogotenente di ogni dungeon. */
export const LIEUTENANTS: Readonly<Record<string, BossDefinition>> = {
  crypt: BELFRY_GARGOYLE,
  swamp: SERPENT_QUEEN,
  forge: ANVIL_MASTER,
  glacier: FIRST_APPRENTICE,
};

/** Il luogotenente con la vita scalata per il gruppo: +50% per ogni giocatore in piu'. */
export function scaledLieutenant(definition: BossDefinition, players: number): BossDefinition {
  return bossForParty(definition, players);
}
