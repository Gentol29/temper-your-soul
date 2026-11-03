import type { GameEvent } from '../../combat/events';
import type { Projectile } from '../../combat/projectile';
import type { Match } from '../../match/match';
import { drawVfx, isVfxReady, type VfxId } from './assets';

export interface Burst { readonly attachment?: { readonly owner?: string; readonly offsetY?: number; readonly range?: number; readonly arc?: number }; readonly id: VfxId; readonly x: number; readonly y: number; readonly width: number; readonly angle: number; readonly duration: number; age: number }
const MAX_BURSTS = 96;
/** Misura dell’atlante: lama opaca entro 48 px dal pivot; scintille escluse dal settore colpibile. */
export const CLEAVE_ART = { canvasSize: 128, bladeRadius: 48, duration: 0.24 } as const;
export const PROJECTILE_VFX: Readonly<Record<string, VfxId>> = {
  mage_fire_bolt: 'mage-fireball', mage_fire_cinder: 'mage-fireball', arcane_bolt: 'mage-fireball', cinder_fragment: 'mage-fireball',
  mage_water_orb: 'mage-water-orb', mage_water_mirror: 'mage-water-orb', frost_orb: 'mage-water-orb', mirror_shard: 'mage-water-orb',
  mage_earth_light: 'mage-earth-wisp', ossuary_light: 'mage-earth-wisp',
  mage_wind_bolt: 'mage-wind-orb', storm_bolt: 'mage-wind-orb', hunter_arrow: 'archer-arrow', thorn_spike: 'archer-arrow',
};
const DASH_VFX: Readonly<Record<string, VfxId>> = {
  warrior_rush: 'warrior-rush', wind_dash: 'archer-dash', astral_step: 'mage-blink', rime_step: 'mage-blink',
};

/** Animazioni degli asset: ascoltano eventi esistenti e non modificano la partita. */
export class SpriteEffects {
  readonly bursts: Burst[] = [];
  clear(): void { this.bursts.length = 0; }
  add(id: VfxId, x: number, y: number, width: number, duration: number, angle = 0, attachment?: Burst['attachment']): void {
    if (this.bursts.length >= MAX_BURSTS) this.bursts.shift();
    this.bursts.push({ id, x, y, width, duration, angle, attachment, age: 0 });
  }
  handle(event: GameEvent): void {
    switch (event.type) {
      case 'skill_cast': {
        if (event.kind === 'melee_arc') {
          const wolf = event.visual === 'archer_wolf';
          this.add(wolf ? 'archer-predator' : 'warrior-cleave', event.origin.x, event.origin.y, wolf ? 44 : (event.range ?? 100) * CLEAVE_ART.canvasSize / CLEAVE_ART.bladeRadius, wolf ? 0.2 : CLEAVE_ART.duration, event.angle, wolf ? undefined : { owner: event.playerId, range: event.range ?? 100, arc: event.arc ?? Math.PI * 1.2 });
        } else if (event.kind === 'dash') {
          const id = DASH_VFX[event.visual] ?? 'mage-blink';
          this.add(id, event.origin.x, event.origin.y, event.travelSeconds ? 76 : 95, 0.4, event.angle);
          if (!event.travelSeconds) this.add('mage-blink', event.destination.x, event.destination.y, 125, 0.5);
        } else if (event.kind === 'summon') this.add('archer-summon', event.origin.x, event.origin.y, 100, 0.65, 0, { owner: event.playerId });

        break;
      }
      case 'projectile_hit': {
        if (event.team !== 'player' || event.struck === 'obstacle') break;
        const flight = PROJECTILE_VFX[event.visual];
        // Le frecce conservano le scintille puntuali: nessun fendente o falso segnale di sanguinamento.
        if (!flight || flight === 'archer-arrow') break;
        const id = flight === 'mage-water-orb' ? 'mage-water-explosion' : flight === 'mage-fireball' ? 'mage-fire-explosion'
          : flight === 'mage-earth-wisp' ? 'mage-earth-aura' : flight === 'mage-wind-orb' ? 'mage-wind-orb' : 'warrior-cleave';
        this.add(id, event.position.x, event.position.y, 50 + event.radius * 2, 0.32);
        break;
      }
      case 'zone_detonated': {
        if (event.team !== 'player') break;
        const visual = event.visual ?? 'meteor';
        const id = visual === 'mage_blink_burst' ? 'mage-blink' : /veil|water|frost|mirror/.test(visual) ? 'mage-water-explosion'
          : /earth|shroud/.test(visual) ? 'mage-earth-aura' : 'mage-fire-explosion';
        this.add(id, event.position.x, event.position.y, event.radius * 2.3, 0.65);
        break;
      }
      case 'guard_blocked': this.add('warrior-guard', event.position.x, event.position.y - 12, 130, 0.38, 0, { owner: event.playerId, offsetY: -12 }); break;

    }
  }
  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      this.bursts[i].age += dt;
      if (this.bursts[i].age >= this.bursts[i].duration) this.bursts.splice(i, 1);
    }
  }
  draw(ctx: CanvasRenderingContext2D, match?: Match): void {
    for (const burst of this.bursts) {
      const position = match ? burstPosition(burst, match) : burst;
      if (!position) continue;
      ctx.save();
      const shape = burst.attachment;
      if (shape?.range !== undefined && shape.arc !== undefined) {
        // La luce resta nel settore colpibile: origine mobile, direzione fissata al lancio.
        ctx.beginPath(); ctx.moveTo(position.x, position.y);
        ctx.arc(position.x, position.y, shape.range, burst.angle - shape.arc / 2, burst.angle + shape.arc / 2);
        ctx.closePath(); ctx.clip();
      }
      drawVfx(ctx, burst.id, position.x, position.y, burst.width, burst.age, burst.angle, 0.95 * Math.min(1, (burst.duration - burst.age) / 0.12), burst.duration);
      ctx.restore();
    }
  }
}

/** I nemici mantengono sagoma e contrasto precedenti: gli asset nuovi sono dedicati ai giocatori. */
export function drawProjectileVfx(ctx: CanvasRenderingContext2D, projectile: Projectile, time: number): boolean {
  if (projectile.team !== 'player') return false;
  const id = PROJECTILE_VFX[projectile.spec.visual]; if (!id) return false;
  const width = id === 'archer-arrow' ? 68 : id === 'mage-wind-orb' ? 44 + projectile.radius * 2 : 76 + projectile.radius * 3;
  return drawVfx(ctx, id, projectile.position.x, projectile.position.y, width, time, projectile.velocity.angle(), 0.85);
}

/** Aure e stati leggono lo snapshot autorevole; il tempo qui anima soltanto il disegno. */
export function drawPersistentVfx(ctx: CanvasRenderingContext2D, match: Match, time: number): void {
  const state = match.classCombat.snapshot();
  for (const active of state.players) {
    const player = match.players.get(active.id); if (!player || player.health.isDead) continue;
    const x = player.position.x, y = player.position.y;
    if (active.guard) drawVfx(ctx, 'warrior-guard', x, y - 12, 82, time, 0, 0.65);
    else if (active.buff) drawVfx(ctx, player.characterClass === 'warrior' ? 'warrior-fortify' : player.characterClass === 'archer' ? 'archer-predator' : 'mage-earth-aura', x, y, 78, time, 0, 0.6);
    if (active.rushing) drawVfx(ctx, player.characterClass === 'archer' ? 'archer-dash' : 'warrior-rush', x, y, 85, time % 0.25, player.position.angleTo(player.aim), 0.7, 0.25);
    if (active.channel > 0) drawVfx(ctx, 'mage-earth-aura', x, y, 82, time, 0, 0.55);
  }
  for (const status of state.statuses) {
    const target = status.target === 'boss' ? match.boss : match.minions.find(minion => `minion:${minion.id}` === status.target);
    if (!target || target.health.isDead || !['burning', 'soaked', 'rooted', 'exposed', 'bleeding'].includes(status.status)) continue;
    const id: VfxId = status.status === 'burning' ? 'mage-fireball' : status.status === 'soaked' ? 'mage-water-orb'
      : status.status === 'rooted' ? 'mage-earth-aura' : status.status === 'exposed' ? 'mage-wind-orb' : 'archer-predator';
    drawVfx(ctx, id, target.position.x, target.position.y - (status.status === 'burning' ? 10 : 0), status.status === 'burning' ? 40 : 66, time, 0, 0.45);
  }
}

/** Nessun riferimento alla posizione vecchia per gli effetti personali, anche in cooperativa. */
export function burstPosition(burst: Burst, match: Pick<Match, 'players' | 'player'>): { readonly x: number; readonly y: number } | undefined {
  if (!burst.attachment) return burst;
  const player = burst.attachment.owner === undefined ? match.player : match.players.get(burst.attachment.owner);
  return player && !player.health.isDead ? { x: player.position.x, y: player.position.y + (burst.attachment.offsetY ?? 0) } : undefined;
}
export function buffVfx(visual: string): VfxId {
  return visual === 'warrior_guard' ? 'warrior-guard' : visual.startsWith('warrior') ? 'warrior-fortify'
    : visual === 'archer_predator' ? 'archer-predator' : 'mage-earth-aura';
}
/** Un solo percorso grafico: il vecchio disegno esiste soltanto come ripiego. */
export function replacesLegacy(event: GameEvent, ready: (id: VfxId) => boolean = isVfxReady): boolean {
  switch (event.type) {
    case 'skill_cast':
      if (event.kind === 'buff') return ready(buffVfx(event.visual));
      if (event.kind === 'melee_arc') return ready(event.visual === 'archer_wolf' ? 'archer-predator' : 'warrior-cleave');
      if (event.kind === 'summon') return ready('archer-summon');
      if (event.kind === 'dash') return ready(DASH_VFX[event.visual] ?? 'mage-blink');
      if (event.kind === 'projectile') { const id = PROJECTILE_VFX[event.visual]; return !!id && ready(id); }
      return ready('mage-fire-explosion');
    case 'guard_blocked': return ready('warrior-guard');
    case 'channel_started': return ready('mage-earth-aura');
    case 'status_applied': return ready('mage-earth-aura');
    case 'zone_detonated': return event.team === 'player' && ready(event.visual === 'mage_blink_burst' ? 'mage-blink' : /veil|water|frost|mirror/.test(event.visual ?? '') ? 'mage-water-explosion' : 'mage-fire-explosion');
    case 'projectile_hit': { const id = PROJECTILE_VFX[event.visual]; return event.team === 'player' && !!id && id !== 'archer-arrow' && ready(id); }
    default: return false;
  }
}
