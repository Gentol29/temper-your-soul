import type { GameEvent } from '../../combat/events';

/** Aspetti delle sole primarie, compresi gli id storici: impatti e abilità secondarie restano indipendenti. */
const BASIC_VISUALS = new Set(['warrior_sweep', 'hunter_arrow', 'thorn_spike', 'mage_fire_bolt', 'mage_wind_bolt', 'arcane_bolt', 'storm_bolt']);
export const isBasicAttackVisual = (visual: string): boolean => BASIC_VISUALS.has(visual);
export function isBasicAttackCast(event: Extract<GameEvent, {type:'skill_cast'}>): boolean {
  return (event.kind==='projectile'||event.kind==='melee_arc')&&isBasicAttackVisual(event.visual);
}
