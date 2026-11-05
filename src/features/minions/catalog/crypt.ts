import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Cripta: una chiesa sepolta dell'Ordine della Brace. Cera, incenso, campane, pietra che si sveglia. Ogni servitore
 * porta in piccolo uno schema del Guardiano (NOVA DI BRACE, RAFFICA, FRATTURA, CARICA, SPIRALE DEL VUOTO,
 * TRIPLICE VENTAGLIO). Valori provvisori: la vita e' quella della cripta, le altre stanze la scalano.
 */

/** Braci del guardiano che inseguono e scoppiano a contatto (evocate anche dal boss in furia). */
export const CINDER_WISP: MinionDefinition = {
  id: 'cinder_wisp',
  name: 'Fuoco fatuo di brace',
  visual: 'crypt_wisp',
  behavior: 'kamikaze',
  maxHealth: 60,
  speed: 120,
  hitRadius: 12,
  contactDamage: 14,
  blastRadius: 34,
};

/** Cero vivo: una candela che spruzza cera in cerchio; morendo lascia una pozza che brucia anche i nemici. */
export const WAX_CANDLE: MinionDefinition = {
  id: 'wax_candle',
  name: 'Cero vivo',
  visual: 'crypt_candle',
  behavior: 'turret',
  tier: 'swarm',
  maxHealth: 22,
  speed: 0,
  hitRadius: 9,
  contactDamage: 5,
  shot: { projectile: minionShot(115, 6, 4, 'crypt_wax', 2.6), interval: 3.4, firstDelay: 1.8, windup: 0.5, pattern: { kind: 'ring', count: 6 } },
  onDeath: { kind: 'pool', zone: minionZone(28, 0.5, 6, 'crypt_wax_pool', { hurtsMinions: true }), pulses: 3, interval: 0.7 },
};

/** Pipistrello del campanile: stormi rapidi che volano sopra i ripari. */
export const BELFRY_BAT: MinionDefinition = {
  id: 'belfry_bat',
  name: 'Pipistrello del campanile',
  visual: 'crypt_bat',
  behavior: 'flyer',
  maxHealth: 14,
  speed: 150,
  hitRadius: 8,
  contactDamage: 5,
  flying: true,
  weave: 40,
};

/** Ossario: scheletro che insegue; se non lo finisce una zona o un colpo ravvicinato si rialza una volta. */
export const OSSUARY_SKELETON: MinionDefinition = {
  id: 'ossuary_skeleton',
  name: 'Ossario',
  visual: 'crypt_skeleton',
  behavior: 'chaser',
  maxHealth: 22,
  speed: 82,
  hitRadius: 13,
  contactDamage: 6,
  onDeath: { kind: 'revive', delay: 1.6, fraction: 0.5 },
};

/** Doccione: piccolo gargoyle immobile sui piedistalli; sveglio vola, segna una linea e piomba (la CARICA). */
export const GARGOYLE: MinionDefinition = {
  id: 'gargoyle',
  name: 'Doccione',
  visual: 'crypt_gargoyle',
  behavior: 'charger',
  maxHealth: 70,
  speed: 95,
  hitRadius: 15,
  contactDamage: 7,
  flying: true,
  dormant: { wakeRadius: 270 },
  charge: { range: 340, windup: 0.7, distance: 330, speed: 520, recover: 0.9, cooldown: 2.8, damage: 10 },
};

/** Accolito turiferario: fa oscillare l'incensiere e lancia tre braci a ventaglio (il TRIPLICE VENTAGLIO). */
export const CENSER_ACOLYTE: MinionDefinition = {
  id: 'censer_acolyte',
  name: 'Accolito turiferario',
  visual: 'crypt_acolyte',
  behavior: 'shooter',
  maxHealth: 45,
  speed: 72,
  hitRadius: 12,
  contactDamage: 5,
  preferredDistance: 300,
  shot: { projectile: minionShot(140, 8, 5, 'crypt_censer'), interval: 2.7, firstDelay: 1.5, windup: 0.5, pattern: { kind: 'aimed', count: 3, spread: 0.24 } },
};

/** Campana del vespro: rintocca e spara un anello con un varco che ruota a ogni rintocco (la SPIRALE DEL VUOTO). */
export const VESPER_BELL: MinionDefinition = {
  id: 'vesper_bell',
  name: 'Campana del vespro',
  visual: 'crypt_bell',
  behavior: 'turret',
  tier: 'heavy',
  maxHealth: 150,
  speed: 0,
  hitRadius: 14,
  contactDamage: 6,
  shot: { projectile: minionShot(112, 8, 5, 'crypt_bell_note', 4.5), interval: 3.4, firstDelay: 2, windup: 0.8, pattern: { kind: 'ring', count: 16, gap: 3, turn: 0.55 } },
};

/** Reliquiario: cassa d'ossa che genera fuochi fatui finche' non si rompe. */
export const BONE_RELIQUARY: MinionDefinition = {
  id: 'bone_reliquary',
  name: 'Reliquiario',
  visual: 'crypt_reliquary',
  behavior: 'nest',
  maxHealth: 160,
  speed: 0,
  hitRadius: 16,
  contactDamage: 5,
  nest: { spawn: 'cinder_wisp', interval: 4.2, firstDelay: 1.5, burst: 2, maxChildren: 4 },
};

export const CRYPT_MINIONS: readonly MinionDefinition[] = [
  CINDER_WISP,
  WAX_CANDLE,
  BELFRY_BAT,
  OSSUARY_SKELETON,
  GARGOYLE,
  CENSER_ACOLYTE,
  VESPER_BELL,
  BONE_RELIQUARY,
];
