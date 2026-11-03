import type { Camera } from '../../../core/camera';
import type { Rng } from '../../../core/rng';
import { TAU, Vec2 } from '../../../core/vec2';
import type { GameEvent } from '../../combat/events';
import type { Match } from '../../match/match';
import { minionArt } from '../minion-art';
import { drawSprite } from '../sprites';

/** Taratura estetica provvisoria; budget indipendente dal numero di nemici o giocatori. */
export const COMBAT_VFX = {
  particles: 2400, stains: 180, deaths: 48, hit: 24, death: 64,
  buffRate: 54, rushRate: 100, statusRate: 20, stainLife: 14, deathLife: 0.48,
} as const;
type MoteKind = 'blood' | 'chip' | 'smoke' | 'glow';
export interface CombatMote {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  readonly kind: MoteKind; readonly color: string; readonly size: number;
  remaining: number; readonly total: number;
}
export interface BloodStain {
  readonly x: number; readonly y: number; readonly size: number; readonly color: string;
  remaining: number;
}
export interface MinionDeath {
  readonly visual: string; readonly x: number; readonly y: number; readonly direction: number;
  remaining: number;
}
const BLOOD = ['#542437', '#8f3042', '#bc4650', '#e37165'] as const;
const BUFF_COLORS = { warrior: '#efc17c', archer: '#b7d99d', mage: '#cfb5e5' } as const;

/** La materia è una scelta d'aspetto: costrutti e spiriti perdono schegge/energia, le creature sangue. */
export function impactKind(visual: string): 'blood' | 'chip' | 'glow' {
  if (/wisp|gnat|spirit|ghost|soul|flame|spark|fairy|flake|droplet/.test(visual)) return 'glow';
  if (/skeleton|gargoyle|bell|reliquary|candle|blade|page|crossbow|flail|armor(?!er)|cart|turret|golem|crystal|icicle|totem|obelisk|sentinel|construct|pebble|anvil|slag|crucible|ice_block|guardian|colossus|frost_warden/.test(visual)) return 'chip';
  return 'blood';
}

/** Sangue balistico, frammenti, fumo e moti continui: nessuna scrittura nel dominio o nel protocollo. */
export class CombatVfx {
  particles: CombatMote[] = [];
  stains: BloodStain[] = [];
  deaths: MinionDeath[] = [];
  private readonly visuals = new Map<number, string>();
  private readonly debts = new Map<string, number>();
  private readonly positions = new Map<string, Vec2>();
  private bossVisual = '';

  constructor(private readonly rng: Rng) {}

  clear(): void {
    this.particles = []; this.stains = []; this.deaths = [];
    this.visuals.clear(); this.debts.clear(); this.positions.clear(); this.bossVisual = '';
  }

  handle(event: GameEvent): void {
    switch (event.type) {
      case 'minion_spawned': this.visuals.set(event.minionId, event.visual); break;
      case 'damage_dealt': {
        if (event.amount <= 0) break;
        const visual = event.target === 'minion' ? this.visuals.get(event.minionId ?? -1) ?? '' : event.target === 'boss' ? this.bossVisual : '';
        const kind = impactKind(visual), owner = this.positions.get(event.playerId ?? 'local');
        const angle = owner && event.target !== 'player' ? owner.angleTo(event.position) : this.rng.next() * TAU;
        const color = kind === 'blood' ? BLOOD[1] : kind === 'chip' ? minionArt(visual).color : '#d6c4e8';
        this.spray(event.position, kind, color, COMBAT_VFX.hit + Math.min(16, Math.floor(event.amount / 25)), angle, 1.8);
        this.spray(event.position, 'glow', '#fff0ca', 8, angle, TAU);
        break;
      }
      case 'minion_defeated': {
        const kind = impactKind(event.visual), color = minionArt(event.visual).color;
        this.spray(event.position, kind, color, event.revives ? 20 : COMBAT_VFX.death, this.rng.next() * TAU, TAU);
        this.spray(event.position, 'smoke', '#68586a', event.revives ? 5 : 16, 0, TAU);
        if (!event.revives) {
          this.deaths.push({ visual: event.visual, x: event.position.x, y: event.position.y, direction: this.rng.next() < 0.5 ? -1 : 1, remaining: COMBAT_VFX.deathLife });
          if (this.deaths.length > COMBAT_VFX.deaths) this.deaths.shift();
        }
        this.visuals.delete(event.minionId);
        break;
      }
      case 'boss_defeated':
        this.spray(event.position, 'glow', '#ffe1a3', 140, 0, TAU);
        this.spray(event.position, 'smoke', '#6f5469', 36, 0, TAU);
        break;
      case 'guard_blocked': this.spray(event.position, 'glow', '#ffe5ad', 70, 0, TAU); break;
      case 'skill_cast': {
        const color = /warrior/.test(event.visual) ? BUFF_COLORS.warrior : /archer|hunter|wind_dash/.test(event.visual) ? BUFF_COLORS.archer
          : /fire|cinder|ember/.test(event.visual) ? '#ffb267' : /water|frost|rime|mirror/.test(event.visual) ? '#a3e3eb' : BUFF_COLORS.mage;
        if (event.kind === 'melee_arc') {
          const count = event.visual === 'archer_wolf' ? 12 : 44;
          for (let i = 0; i < count; i++) {
            const angle = event.angle + (this.rng.next() - 0.5) * (event.arc ?? 1.8);
            const point = event.origin.add(Vec2.fromAngle(angle, (event.range ?? 80) * (0.55 + this.rng.next() * 0.4)));
            this.mote(point, 'glow', color, angle, 25 + this.rng.next() * 45);
          }
        } else if (event.kind === 'dash') {
          // I rush si seguono nello stato; solo i blink lasciano subito l'intero percorso.
          this.spray(event.origin, 'glow', color, 40, event.angle + Math.PI, 1.5);
          if (!event.travelSeconds) {
            for (let i = 0; i < 60; i++) this.mote(event.origin.lerp(event.destination, i / 60), 'glow', color, event.angle + Math.PI, 25);
            this.spray(event.destination, 'glow', color, 46, 0, TAU);
          }
        } else this.spray(event.origin, 'glow', color, event.kind === 'projectile' ? 22 : 56, event.angle, event.kind === 'projectile' ? 0.8 : TAU);
        break;
      }
      case 'projectile_hit':
        this.spray(event.position, event.struck === 'obstacle' ? 'chip' : 'glow', event.struck === 'obstacle' ? '#b9a68d' : '#ffe8bf', 28, 0, TAU);
        break;
      case 'zone_detonated':
        this.spray(event.position, 'glow', /water|frost|veil/.test(event.visual ?? '') ? '#b0e4ed' : '#ffd099', 110, 0, TAU);
        this.spray(event.position, 'smoke', '#6b596c', 24, 0, TAU);
        break;
      case 'status_applied':
        this.spray(event.position, 'glow', event.status === 'burning' ? '#ffad64' : event.status === 'bleeding' ? '#bf5260' : '#c3dcb5', 22, 0, TAU);
        break;
    }
  }

  update(dt: number, match: Match, camera: Camera): void {
    const elapsed = Math.max(0, dt);
    this.bossVisual = match.boss?.definition.art ?? '';
    const alive = new Set<number>();
    for (const minion of match.minions) {
      if (minion.isDead) continue;
      alive.add(minion.id); this.visuals.set(minion.id, minion.definition.visual);
    }
    for (const id of this.visuals.keys()) if (!alive.has(id)) this.visuals.delete(id);
    this.positions.clear();
    for (const [id, player] of match.players) this.positions.set(id, player.position);
    for (const mote of this.particles) {
      mote.remaining -= elapsed;
      const drag = Math.exp(-elapsed * (mote.kind === 'smoke' ? 2 : 1.4));
      mote.x += mote.vx * elapsed; mote.y += mote.vy * elapsed;
      mote.vx *= drag; mote.vy *= drag;
      mote.z += mote.vz * elapsed;
      if (mote.kind === 'blood' || mote.kind === 'chip') {
        mote.vz -= 340 * elapsed;
        if (mote.z <= 0) {
          if (mote.kind === 'blood') {
            this.stains.push({ x: mote.x, y: mote.y, size: mote.size * (1.5 + this.rng.next()), color: mote.color, remaining: COMBAT_VFX.stainLife });
            mote.remaining = 0;
          } else { mote.z = 0; mote.vz *= -0.26; mote.vx *= 0.5; mote.vy *= 0.5; }
        }
      }
    }
    this.particles = this.particles.filter(p => p.remaining > 0);
    for (const stain of this.stains) stain.remaining -= elapsed;
    this.stains = this.stains.filter(s => s.remaining > 0).slice(-COMBAT_VFX.stains);
    for (const death of this.deaths) death.remaining -= elapsed;
    this.deaths = this.deaths.filter(d => d.remaining > 0);

    // Dette separate per proprietario/tipo: emissione indipendente da FPS e snapshot cooperativi.
    const emitters = new Set<string>(), state = match.classCombat.snapshot();
    for (const active of state.players) {
      const player = match.players.get(active.id);
      if (!player || player.health.isDead || !camera.isVisible(player.position, 80)) continue;
      const color = BUFF_COLORS[player.characterClass ?? 'mage'];
      if (active.buff || active.guard || active.channel > 0) this.emitOverTime(`buff:${active.id}`, COMBAT_VFX.buffRate, elapsed, emitters, () => {
        const a = this.rng.next() * TAU;
        this.mote(player.position.add(Vec2.fromAngle(a, 15 + this.rng.next() * 12)), 'glow', color, a + Math.PI / 2, 12);
      });
      if (active.rushing) this.emitOverTime(`rush:${active.id}`, COMBAT_VFX.rushRate, elapsed, emitters, () => {
        this.mote(player.position, 'glow', color, player.position.angleTo(player.aim) + Math.PI, 55);
      });
    }
    const targets = new Map(match.minions.map(minion => [`minion:${minion.id}`, minion]));
    for (const status of state.statuses) {
      const target = status.target === 'boss' ? match.boss : targets.get(status.target);
      if (!target || target.health.isDead || !camera.isVisible(target.position, 80)) continue;
      this.emitOverTime(`status:${status.target}:${status.status}`, COMBAT_VFX.statusRate, elapsed, emitters, () => {
        const kind = status.status === 'bleeding' ? 'blood' : status.status === 'rooted' ? 'chip' : 'glow';
        const color = status.status === 'burning' ? '#f5a059' : status.status === 'soaked' ? '#a4dce3' : status.status === 'exposed' ? '#cde5ce' : '#b4bd83';
        this.mote(target.position, kind, color, this.rng.next() * TAU, 25);
      });
    }
    for (const key of this.debts.keys()) if (!emitters.has(key)) this.debts.delete(key);
  }

  private emitOverTime(key: string, rate: number, dt: number, emitters: Set<string>, emit: () => void): void {
    emitters.add(key);
    const debt = (this.debts.get(key) ?? 0) + Math.min(dt, 0.1) * rate;
    const count = Math.floor(debt + 1e-9);
    this.debts.set(key, debt - count);
    for (let i = 0; i < count; i++) emit();
  }

  private spray(point: Vec2, kind: MoteKind, color: string, count: number, angle: number, spread: number): void {
    for (let i = 0; i < count; i++) this.mote(point, kind, color, angle + (this.rng.next() - 0.5) * spread, 25 + this.rng.next() * (kind === 'smoke' ? 35 : 125));
  }

  private mote(point: Vec2, kind: MoteKind, color: string, angle: number, speed: number): void {
    if (this.particles.length >= COMBAT_VFX.particles) return;
    const life = kind === 'blood' ? 1.1 : kind === 'smoke' ? 0.7 + this.rng.next() * 0.4 : 0.3 + this.rng.next() * 0.55;
    this.particles.push({ x: point.x, y: point.y, z: 8 + this.rng.next() * 12,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.65,
      vz: kind === 'blood' || kind === 'chip' ? 45 + this.rng.next() * 80 : 15 + this.rng.next() * 30,
      kind, color: kind === 'blood' ? BLOOD[Math.floor(this.rng.next() * BLOOD.length)] : color,
      size: kind === 'smoke' ? 6 + this.rng.next() * 8 : 1 + this.rng.next() * 2.5, remaining: life, total: life });
  }
}

/** Sangue in alpha normale: resta cremisi anche su fuoco e neve; mai luce additiva rosa. */
export function drawBloodStains(ctx: CanvasRenderingContext2D, vfx: CombatVfx, camera: Camera): void {
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  for (const stain of vfx.stains) {
    if (!camera.isVisible(new Vec2(stain.x, stain.y), 12)) continue;
    ctx.globalAlpha = Math.min(0.85, stain.remaining / 3); ctx.fillStyle = stain.color;
    const x = Math.round(stain.x), y = Math.round(stain.y), s = Math.max(2, Math.round(stain.size));
    ctx.fillRect(x - s / 2, y, s, Math.max(1, Math.round(s * 0.45)));
    ctx.fillRect(x - s / 2 + 1, y - 1, Math.max(1, s - 2), 1);
  }
  ctx.restore();
}

export function drawCombatMotes(ctx: CanvasRenderingContext2D, vfx: CombatVfx): void {
  ctx.save();
  // Due passate evitano cambi di compositing per ogni particella.
  for (const glow of [false, true]) {
    ctx.globalCompositeOperation = glow ? 'lighter' : 'source-over';
    for (const p of vfx.particles) {
      if ((p.kind === 'glow') !== glow) continue;
      const fade = Math.min(1, p.remaining / Math.min(0.2, p.total));
      const x = Math.round(p.x), y = Math.round(p.y - p.z), s = Math.max(1, Math.round(p.size));
      ctx.fillStyle = p.color;
      if (glow) {
        ctx.globalAlpha = fade * 0.12; ctx.fillRect(x - 2, y - 2, s + 4, s + 4);
        ctx.globalAlpha = fade; ctx.fillRect(x, y, s, s);
        if (s > 2) { ctx.fillStyle = '#fff4d4'; ctx.fillRect(x, y, 1, 1); }
      } else if (p.kind === 'smoke') {
        ctx.globalAlpha = fade * 0.22; ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.fillRect(x - s / 2 - 2, y - s / 2 + 2, s + 4, s - 4);
      } else {
        ctx.globalAlpha = fade;
        const stretch = p.kind === 'blood' ? Math.min(7, Math.round(Math.abs(p.vz) / 30)) : 0;
        ctx.fillRect(x, y, s, s + stretch);
        ctx.fillStyle = p.kind === 'blood' ? '#e88879' : '#eee0bf'; ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.restore();
}

/** Riusa la sagoma esistente: lampo, sobbalzo, cedimento e dissolvenza. */
export function drawMinionDeaths(ctx: CanvasRenderingContext2D, vfx: CombatVfx): void {
  for (const death of vfx.deaths) {
    const art = minionArt(death.visual), u = 1 - death.remaining / COMBAT_VFX.deathLife;
    ctx.save(); ctx.translate(Math.round(death.x), Math.round(death.y + u * 8));
    ctx.rotate(death.direction * u * 0.35); ctx.scale(1 + u * 0.1, Math.max(0.1, 1 - u * 0.8));
    ctx.globalAlpha = Math.min(1, (1 - u) * 2);
    const palette = u < 0.15 ? Object.fromEntries(Object.keys(art.palette).map(key => [key, '#fff2d3'])) : art.palette;
    drawSprite(ctx, art.frames[0], 0, 0, art.scale, palette);
    ctx.restore();
  }
}
