import { CLASS_LOOKS } from './looks/class-skills';
import type { Team } from '../combat/team';
import { CORE_LOOKS } from './looks/core';
import { DESCENT_LOOKS } from './looks/descent';
import { FORGE_LOOKS } from './looks/forge';
import { GLACIER_LOOKS } from './looks/glacier';
import { ITEM_LOOKS } from './looks/items';
import { SWAMP_LOOKS } from './looks/swamp';
import { VEIN_LOOKS } from './looks/veins';

/** Aspetto di un tipo di proiettile: le regole scelgono l'id (`ProjectileSpec.visual`), qui stanno colore e forma. */
export interface ProjectileLook {
  readonly color: string;
  /**
   * `dart`: freccia arcana; `diamond`: rombo rotante; `orb`: sfera; `arrow`: freccia lunga e sottile;
   * `shard`: scheggia di cristallo allungata.
   */
  readonly shape: 'dart' | 'diamond' | 'orb' | 'arrow' | 'shard' | 'wisp' | 'thorn' | 'ember' | 'mirror';
}

/** Colori di una zona di pericolo: anello e tacche, scoppio, riempimento (colore con trasparenza). */
export interface ZoneLook {
  readonly ring: string;
  readonly burst: string;
  readonly fill: string;
}

/** Gli aspetti che un gruppo di contenuti (un dungeon, gli oggetti) aggiunge alle tabelle. */
export interface PresentationLooks {
  readonly projectiles: Readonly<Record<string, ProjectileLook>>;
  /** Chiavi: `player` e `enemy` (predefinite per squadra) o l'id di `DangerZoneSpec.visual`. */
  readonly zones: Readonly<Record<string, ZoneLook>>;
}

const ALL: readonly PresentationLooks[] = [CORE_LOOKS, ITEM_LOOKS, SWAMP_LOOKS, FORGE_LOOKS, GLACIER_LOOKS, DESCENT_LOOKS, CLASS_LOOKS, VEIN_LOOKS];

export const PROJECTILE_LOOKS: Readonly<Record<string, ProjectileLook>> = Object.assign({}, ...ALL.map((looks) => looks.projectiles));
export const ZONE_LOOKS: Readonly<Record<string, ZoneLook>> = Object.assign({}, ...ALL.map((looks) => looks.zones));

const FALLBACK_PROJECTILE: ProjectileLook = { color: '#d8d0c8', shape: 'orb' };

/** Aspetto di un proiettile; un id sconosciuto non rompe il disegno (un test controlla che i dati non ne usino). */
export function projectileLook(visual: string): ProjectileLook {
  return PROJECTILE_LOOKS[visual] ?? FALLBACK_PROJECTILE;
}

/**
 * Aspetto di una zona: quello del suo `visual` se esiste, altrimenti il predefinito della squadra. Una zona del giocatore
 * senza `visual` e' la meteora (come in `sprite-effects.ts` e `meteor-impact.ts`): prende i toni del fuoco, non il viola.
 */
export function zoneLook(team: Team, visual?: string): ZoneLook {
  const id = visual ?? (team === 'player' ? 'meteor' : undefined);
  return (id !== undefined ? ZONE_LOOKS[id] : undefined) ?? ZONE_LOOKS[team]!;
}
