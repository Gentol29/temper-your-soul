import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Cripta, vene B e C (fase 7 dello studio sulla grafica). Valori provvisori dalle schede dello studio, da tarare con
 * Jabbaz: la vita e' quella della cripta, le altre stanze la scalano.
 * - Catacombe: ossa murate, becchini, lumini. Colpi verde freddo e lilla sulla pietra scura.
 * - Cantoria: coro e organo della chiesa sepolta, dove il suono si fa anello. Colpi crema e viola.
 */

// --- Vena B: Catacombe -------------------------------------------------------------------------------------------

/** Teschio saltellante: salti corti sul giocatore, in sciame (la FRATTURA in piccolo). */
export const HOPPING_SKULL: MinionDefinition = {
  id: 'hopping_skull',
  name: 'Teschio saltellante',
  visual: 'crypt_skull',
  behavior: 'leaper',
  tier: 'swarm',
  maxHealth: 14,
  speed: 70,
  hitRadius: 9,
  contactDamage: 5,
  leap: { range: 260, windup: 0.45, flight: 0.4, cooldown: 2.4, zone: minionZone(22, 0.85, 6, 'crypt_skull_landing') },
};

/** Ratto dei loculi: veloce, a branchi; esce dalla Fossa comune. */
export const CRYPT_RAT: MinionDefinition = {
  id: 'crypt_rat',
  name: 'Ratto dei loculi',
  visual: 'crypt_rat',
  behavior: 'chaser',
  maxHealth: 10,
  speed: 135,
  hitRadius: 8,
  contactDamage: 4,
};

/** Becchino: scava sotto il pavimento, emerge con la vanga (la FRATTURA) e, scoperto, getta terra di sepoltura. */
export const GRAVEDIGGER: MinionDefinition = {
  id: 'gravedigger',
  name: 'Becchino',
  visual: 'crypt_gravedigger',
  behavior: 'burrower',
  maxHealth: 60,
  speed: 80,
  hitRadius: 12,
  contactDamage: 6,
  burrow: { emergeRange: 240, emergeTime: 0.8, exposed: 2.6, lash: { zone: minionZone(24, 0.6, 8, 'crypt_spade'), count: 4, spacing: 44 } },
  lob: { zone: minionZone(34, 1, 8, 'crypt_grave_dirt'), interval: 2.2, firstDelay: 0.3, range: 520, shape: 'spots', count: 3, scatter: 80 },
};

/** Lanterna cimiteriale: spenta finche' qualcuno non passa, poi una raffica di sette colpi (la RAFFICA). */
export const GRAVE_LANTERN: MinionDefinition = {
  id: 'grave_lantern',
  name: 'Lanterna cimiteriale',
  visual: 'crypt_lantern',
  behavior: 'turret',
  maxHealth: 50,
  speed: 0,
  hitRadius: 9,
  contactDamage: 5,
  dormant: { wakeRadius: 300 },
  shot: { projectile: minionShot(150, 6, 4, 'crypt_lantern_flame'), interval: 3.6, firstDelay: 1.2, windup: 0.6, pattern: { kind: 'aimed', count: 7, spread: 0.16 } },
};

/** Prefica velata: due lacrime lente e grosse che rallentano (schivare presto). */
export const VEILED_MOURNER: MinionDefinition = {
  id: 'veiled_mourner',
  name: 'Prefica velata',
  visual: 'crypt_mourner',
  behavior: 'shooter',
  maxHealth: 45,
  speed: 65,
  hitRadius: 12,
  contactDamage: 5,
  preferredDistance: 300,
  slowOnHit: 1.2,
  shot: { projectile: minionShot(85, 8, 8, 'crypt_tear', 5), interval: 3, firstDelay: 1.5, windup: 0.6, pattern: { kind: 'aimed', count: 2, spread: 0.3 } },
};

/** Colosso d'ossa: carica lenta e annunciata (la CARICA); quando cade si divide in tre teschi. */
export const BONE_COLOSSUS: MinionDefinition = {
  id: 'bone_colossus',
  name: 'Colosso d\'ossa',
  visual: 'crypt_bone_colossus',
  behavior: 'charger',
  tier: 'heavy',
  maxHealth: 190,
  speed: 55,
  hitRadius: 22,
  contactDamage: 9,
  charge: { range: 360, windup: 1.1, distance: 300, speed: 420, recover: 1, cooldown: 3.4, damage: 12 },
  onDeath: { kind: 'split', into: 'hopping_skull', count: 3 },
};

/** Fossa comune: una lastra spaccata da cui escono ratti; rotta, sputa un anello d'ossa (la NOVA in piccolo). */
export const MASS_GRAVE: MinionDefinition = {
  id: 'mass_grave',
  name: 'Fossa comune',
  visual: 'crypt_mass_grave',
  behavior: 'nest',
  maxHealth: 160,
  speed: 0,
  hitRadius: 20,
  contactDamage: 5,
  dormant: { wakeRadius: 320 },
  nest: { spawn: 'crypt_rat', interval: 4, firstDelay: 1.2, burst: 3, maxChildren: 6 },
  onDeath: { kind: 'ring', projectile: minionShot(120, 6, 4, 'crypt_bone_shard'), count: 10 },
};

// --- Vena C: Cantoria -------------------------------------------------------------------------------------------

/** Corista spettrale: lento, ma vola sopra i ripari (i ripari non bastano). */
export const CHOIR_GHOST: MinionDefinition = {
  id: 'choir_ghost',
  name: 'Corista spettrale',
  visual: 'crypt_choir_ghost',
  behavior: 'chaser',
  maxHealth: 14,
  speed: 80,
  hitRadius: 11,
  contactDamage: 5,
  flying: true,
};

/** Salterio volante: un libro chiuso sul leggio finche' non passi (diffidare dell'arredo). */
export const FLYING_PSALTER: MinionDefinition = {
  id: 'flying_psalter',
  name: 'Salterio volante',
  visual: 'crypt_psalter',
  behavior: 'flyer',
  maxHealth: 12,
  speed: 150,
  hitRadius: 8,
  contactDamage: 5,
  flying: true,
  weave: 34,
  dormant: { wakeRadius: 240 },
};

/** Canna d'organo: una nota tenuta che gira, anello di tre colpi in serie (la SPIRALE DEL VUOTO). */
export const ORGAN_PIPE: MinionDefinition = {
  id: 'organ_pipe',
  name: 'Canna d\'organo',
  visual: 'crypt_organ_pipe',
  behavior: 'turret',
  maxHealth: 70,
  speed: 0,
  hitRadius: 10,
  contactDamage: 5,
  shot: {
    projectile: minionShot(120, 6, 4, 'crypt_organ_note', 3.5),
    interval: 4.2,
    firstDelay: 1.5,
    windup: 0.7,
    pattern: { kind: 'ring', count: 3, turn: 0.35 },
    series: { count: 12, gap: 0.12 },
  },
};

/** Cantore del vespro: tre strofe, tre ventagli di cinque colpi, ognuno ruotato (il TRIPLICE VENTAGLIO). */
export const VESPER_CANTOR: MinionDefinition = {
  id: 'vesper_cantor',
  name: 'Cantore del vespro',
  visual: 'crypt_cantor',
  behavior: 'shooter',
  maxHealth: 50,
  speed: 65,
  hitRadius: 13,
  contactDamage: 5,
  preferredDistance: 320,
  shot: {
    projectile: minionShot(135, 7, 5, 'crypt_cantor_note'),
    interval: 3.6,
    firstDelay: 1.6,
    windup: 0.6,
    pattern: { kind: 'aimed', count: 5, spread: 0.2 },
    series: { count: 3, gap: 0.35, turn: 0.1 },
  },
};

/** Maestro di cappella: batte il tempo e il coro accelera (aura di fervore: i vicini sparano piu' spesso). */
export const CHAPEL_MASTER: MinionDefinition = {
  id: 'chapel_master',
  name: 'Maestro di cappella',
  visual: 'crypt_chapel_master',
  behavior: 'support',
  maxHealth: 70,
  speed: 60,
  hitRadius: 12,
  contactDamage: 4,
  preferredDistance: 360,
  aura: { kind: 'haste', radius: 220, amount: 0.7, interval: 5, duration: 3 },
};

/** Aquila del leggio: un salto pesante (la FRATTURA) e, atterrata, un anello di piume di bronzo (la NOVA). */
export const LECTERN_EAGLE: MinionDefinition = {
  id: 'lectern_eagle',
  name: 'Aquila del leggio',
  visual: 'crypt_eagle',
  behavior: 'leaper',
  tier: 'heavy',
  maxHealth: 170,
  speed: 50,
  hitRadius: 20,
  contactDamage: 8,
  leap: {
    range: 420,
    windup: 0.8,
    flight: 0.6,
    cooldown: 3.2,
    zone: minionZone(70, 1.4, 12, 'crypt_eagle_landing'),
    arrivalRing: { projectile: minionShot(110, 7, 5, 'crypt_eagle_feather'), count: 10 },
  },
};

/** Stallo del coro: ogni posto e' prenotato; ne escono coristi, e ogni tanto canta un anello. */
export const CHOIR_STALL: MinionDefinition = {
  id: 'choir_stall',
  name: 'Stallo del coro',
  visual: 'crypt_choir_stall',
  behavior: 'nest',
  maxHealth: 150,
  speed: 0,
  hitRadius: 16,
  contactDamage: 5,
  nest: { spawn: 'choir_ghost', interval: 4.4, firstDelay: 1.4, burst: 2, maxChildren: 4 },
  shot: { projectile: minionShot(100, 6, 4, 'crypt_stall_note', 3), interval: 5, firstDelay: 2.5, windup: 0.7, pattern: { kind: 'ring', count: 8 } },
};

export const CATACOMBS_MINIONS: readonly MinionDefinition[] = [HOPPING_SKULL, CRYPT_RAT, GRAVEDIGGER, GRAVE_LANTERN, VEILED_MOURNER, BONE_COLOSSUS, MASS_GRAVE];
export const CANTORIA_MINIONS: readonly MinionDefinition[] = [CHOIR_GHOST, FLYING_PSALTER, ORGAN_PIPE, VESPER_CANTOR, CHAPEL_MASTER, LECTERN_EAGLE, CHOIR_STALL];
