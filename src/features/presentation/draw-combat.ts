import { drawVfx } from './vfx/assets';
import { fallingMeteorOffset } from './vfx/meteor-glow';
import { drawProjectileVfx } from './vfx/sprite-effects';
import { clamp, TAU } from '../../core/vec2';
import type { Camera } from '../../core/camera';
import type { Charge } from '../boss/boss';
import type { DangerZone } from '../combat/danger-zone';
import type { Projectile } from '../combat/projectile';
import type { Vec2 } from '../../core/vec2';
import type { ZoneFlash } from './effects';
import { projectileLook, zoneLook } from './visuals';

/** Segnale a terra della carica del boss: la fascia di percorso e il punto d'arrivo. Solo durante la preparazione. */
export function drawChargeTelegraph(ctx: CanvasRenderingContext2D, charge: Charge): void {
  if (charge.elapsed >= charge.windup) return;
  ctx.save();
  ctx.strokeStyle = '#ffad7060';
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.moveTo(charge.start.x, charge.start.y);
  ctx.lineTo(charge.target.x, charge.target.y);
  ctx.stroke();
  ctx.strokeStyle = '#ffbc81';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(charge.target.x, charge.target.y, 26, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Zona in attesa di scoppiare: area segnalata con il conto alla rovescia. `time` anima le tacche. */
export function drawPendingZone(ctx: CanvasRenderingContext2D, zone: DangerZone, time: number): void {
  const u = zone.progress;
  const friendly = zone.team === 'player';
  const look = zoneLook(zone.team, zone.spec.visual);
  ctx.save();
  ctx.translate(zone.position.x, zone.position.y);
  ctx.fillStyle = look.fill;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = look.ring;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius + 4, -Math.PI / 2, -Math.PI / 2 + u * TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.3 + u * 0.45;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius * (1 - u), 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + (friendly ? time * 0.6 : -time * 0.3);
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = look.ring;
    ctx.fillRect(zone.radius * 0.78, -2, 7, 4);
    ctx.restore();
  }
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.restore();
}

/** Bagliore che resta per un attimo dopo lo scoppio di una zona. */
export function drawZoneFlash(ctx: CanvasRenderingContext2D, flash: ZoneFlash): void {
  const color = flash.look.ring;
  const fade = clamp(flash.remaining / flash.total, 0, 1);
  const r = flash.radius;
  ctx.save();
  ctx.translate(flash.position.x, flash.position.y);
  ctx.globalAlpha = fade * 0.25;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = fade * 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a + 0.13) * r * 0.45, Math.sin(a + 0.13) * r * 0.45);
    ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** Meteora in caduta (zone del giocatore) o presagio degli ultimi istanti (zone nemiche). */
export function drawFallingSpell(ctx: CanvasRenderingContext2D, zone: DangerZone): void {
  if (zone.remaining <= 0) return;
  const u = zone.progress;
  if (zone.team === 'player') {
    // Solo la meteora cade dall’alto; la marea conserva il segnale a terra.
    if (zone.spec.visual !== undefined && zone.spec.visual !== 'meteor') return;
    const head = fallingMeteorOffset(u);
    const x = zone.position.x + head.x;
    const y = zone.position.y + head.y;
    if (drawVfx(ctx, 'mage-fireball', x, y, 150 + u * 25, zone.spec.delay - zone.remaining, Math.atan2(1, 0.35), 0.9)) return;
    ctx.save();
    ctx.strokeStyle = '#cb4939';
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 65);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f0bd72';
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#e77c40';
    ctx.beginPath();
    ctx.arc(x, y, 9 + u * 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff0df';
    ctx.fillRect(x - 4, y - 5, 7, 8);
    ctx.restore();
  } else if (u > 0.7) {
    ctx.save();
    ctx.globalAlpha = (u - 0.7) * 2;
    ctx.strokeStyle = '#ffbe85';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(zone.position.x + Math.cos(a) * zone.radius * 0.6, zone.position.y + Math.sin(a) * zone.radius * 0.6);
      ctx.lineTo(zone.position.x + Math.cos(a) * zone.radius * 0.25, zone.position.y + Math.sin(a) * zone.radius * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Come si distinguono i proiettili per squadra. Quelli nemici hanno alone, contorno scuro e nucleo chiaro: si leggono
 * su qualunque pavimento. Quelli dei giocatori sono piu' trasparenti, con scia leggera e senza alone, cosi' non si
 * confondono con le minacce. Valori provvisori.
 */
export const PROJECTILE_STYLE = {
  enemyRim: '#120c18',
  enemyRimWidth: 3,
  enemyHalo: 0.13,
  enemyTrail: 0.55,
  playerAlpha: 0.7,
  playerTrail: 0.3,
} as const;

type ProjectileShape = ReturnType<typeof projectileLook>['shape'];

/** Il profilo della forma lungo l'asse x (la direzione del volo): un solo percorso da riempire o ripassare. */
function traceShape(ctx: CanvasRenderingContext2D, shape: ProjectileShape, r: number): void {
  ctx.beginPath();
  switch (shape) {
    case 'wisp':
      ctx.moveTo(10, 0); ctx.quadraticCurveTo(1, -12, -10, -3); ctx.lineTo(-4, 0); ctx.lineTo(-12, 5); ctx.quadraticCurveTo(2, 11, 10, 0);
      break;
    case 'thorn':
      ctx.moveTo(15, 0); ctx.lineTo(-8, -5); ctx.lineTo(-3, 0); ctx.lineTo(-8, 5); ctx.closePath();
      break;
    case 'ember':
      ctx.moveTo(9, 0); ctx.lineTo(2, -6); ctx.lineTo(-12, -3); ctx.lineTo(-7, 1); ctx.lineTo(-14, 5); ctx.lineTo(2, 5); ctx.closePath();
      break;
    case 'mirror':
      ctx.moveTo(12, 0); ctx.lineTo(3, -7); ctx.lineTo(-9, -3); ctx.lineTo(-5, 7); ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(11, 0); ctx.lineTo(0, 8); ctx.lineTo(-11, 0); ctx.lineTo(0, -8); ctx.closePath();
      break;
    case 'dart':
      ctx.moveTo(8, 0); ctx.lineTo(-7, -4); ctx.lineTo(-4, 0); ctx.lineTo(-7, 4); ctx.closePath();
      break;
    case 'arrow': {
      // Asta sottile e punta: la larghezza dell'asta segue il raggio del proiettile.
      const half = Math.max(1, r * 0.4);
      ctx.rect(-14, -half, 20, half * 2);
      ctx.moveTo(13, 0); ctx.lineTo(6, -3.5); ctx.lineTo(6, 3.5); ctx.closePath();
      break;
    }
    case 'shard':
      ctx.moveTo(14, 0); ctx.lineTo(0, -4.5); ctx.lineTo(-10, 0); ctx.lineTo(0, 4.5); ctx.closePath();
      break;
    default:
      ctx.arc(0, 0, r, 0, TAU);
  }
}

/**
 * Proiettile con la sua scia e la sua forma. `time` fa ruotare il rombo e oscillare lo specchio. `rimWidth` e' lo
 * spessore del contorno scuro dei proiettili nemici (piu' spesso sui pavimenti chiari, vedi `ArenaTheme.projectileRim`).
 */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
  trail: readonly Vec2[],
  camera: Camera,
  time: number,
  rimWidth: number = PROJECTILE_STYLE.enemyRimWidth,
): void {
  if (!camera.isVisible(projectile.position, 80)) return;
  if (drawProjectileVfx(ctx, projectile, time)) return;
  const look = projectileLook(projectile.spec.visual);
  const r = projectile.radius;
  const enemy = projectile.team === 'enemy';
  const style = PROJECTILE_STYLE;
  ctx.save();
  ctx.strokeStyle = look.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trailAlpha = enemy ? style.enemyTrail : style.playerTrail;
  for (let i = 1; i < trail.length; i++) {
    ctx.globalAlpha = (i / trail.length) * trailAlpha;
    ctx.lineWidth = Math.max(1, (r * i) / trail.length);
    ctx.beginPath();
    ctx.moveTo(trail[i - 1]!.x, trail[i - 1]!.y);
    ctx.lineTo(trail[i]!.x, trail[i]!.y);
    ctx.stroke();
  }
  ctx.translate(projectile.position.x, projectile.position.y);
  ctx.rotate(projectile.velocity.angle());
  if (look.shape === 'diamond') ctx.rotate(time * 3);
  else if (look.shape === 'mirror') ctx.rotate(Math.sin(time * 7) * 0.4);
  if (enemy) {
    ctx.globalAlpha = style.enemyHalo;
    ctx.fillStyle = look.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    traceShape(ctx, look.shape, r);
    ctx.strokeStyle = style.enemyRim;
    ctx.lineWidth = rimWidth;
    ctx.stroke();
  }
  const body = enemy ? 1 : style.playerAlpha;
  ctx.globalAlpha = body;
  traceShape(ctx, look.shape, r);
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.globalAlpha = body * 0.55;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Nucleo chiaro: un quadrato al centro dei corpi tondi, un tratto lungo l'asse per quelli allungati.
  ctx.globalAlpha = body;
  ctx.fillStyle = '#fffaf0';
  if (look.shape === 'orb' || look.shape === 'diamond') {
    const core = Math.max(2, Math.round(r * 0.8));
    ctx.fillRect(-core / 2, -core / 2, core, core);
  } else {
    ctx.fillRect(-2, -1, 6, 2);
  }
  ctx.restore();
}
