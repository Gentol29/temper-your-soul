import { drawWebGLParticles } from './vfx/particle-webgl';
import type { Camera } from '../../core/camera';
import { clamp, TAU, Vec2 } from '../../core/vec2';
import { FEEDBACK, type Effects, type Particle } from './effects';
import { canvasFont } from './fonts';

export function drawText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color = '#d8d0c8',
  size = 12,
  align: CanvasTextAlign = 'left',
): void {
  ctx.fillStyle = color;
  ctx.font = canvasFont(size, 'pixel');
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

/** Valore in [0, 1) da un seme e un indice: la forma di una traccia resta la stessa per tutta la sua vita. */
function decalNoise(seed: number, index: number): number {
  const s = Math.sin(seed * 9301 + index * 49.297) * 233280;
  return s - Math.floor(s);
}

/**
 * Le tracce dello scontro sul pavimento (sotto la luce, quindi illuminate come il resto dell'ambiente): bruciature
 * scure con un filo del colore della zona, resti a macchie del colore del servitore. Svaniscono nell'ultimo terzo.
 */
export function drawDecals(ctx: CanvasRenderingContext2D, effects: Effects, camera: Camera): void {
  if (effects.decals.length === 0) return;
  ctx.save();
  for (const decal of effects.decals) {
    if (!camera.isVisible(new Vec2(decal.x, decal.y), decal.radius + 8)) continue;
    const fade = clamp(decal.remaining / (decal.total / 3), 0, 1);
    if (decal.kind === 'scorch') {
      ctx.globalAlpha = 0.32 * fade;
      ctx.fillStyle = '#050307';
      ctx.beginPath();
      ctx.ellipse(decal.x, decal.y, decal.radius, decal.radius * 0.8, decal.seed * TAU, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.22 * fade;
      ctx.fillStyle = '#050307';
      ctx.beginPath();
      ctx.ellipse(decal.x, decal.y, decal.radius * 0.55, decal.radius * 0.45, decal.seed * TAU, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.18 * fade;
      ctx.strokeStyle = decal.color;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + decal.seed * 7;
        const reach = decal.radius * (0.6 + decalNoise(decal.seed, i) * 0.45);
        ctx.beginPath();
        ctx.moveTo(decal.x + Math.cos(a) * decal.radius * 0.25, decal.y + Math.sin(a) * decal.radius * 0.2);
        ctx.lineTo(decal.x + Math.cos(a) * reach, decal.y + Math.sin(a) * reach * 0.8);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = '#050307';
      ctx.beginPath();
      ctx.ellipse(decal.x, decal.y + 3, decal.radius, decal.radius * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.65 * fade;
      ctx.fillStyle = decal.color;
      for (let i = 0; i < 5; i++) {
        const a = decalNoise(decal.seed, i) * TAU;
        const d = decalNoise(decal.seed, i + 7) * decal.radius * 0.9;
        const size = 2 + Math.floor(decalNoise(decal.seed, i + 13) * 3);
        ctx.fillRect(Math.round(decal.x + Math.cos(a) * d), Math.round(decal.y + Math.sin(a) * d * 0.5), size, size);
      }
    }
  }
  ctx.restore();
}

/** Onde, fendenti e scintille d'impatto, a luce additiva. */
export function drawGlowEffects(ctx: CanvasRenderingContext2D, effects: Effects): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const w of effects.waves) {
    const u = 1 - w.remaining / w.total;
    ctx.globalAlpha = (1 - u) * 0.85;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 1 + (1 - u) * 5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius * Math.sqrt(u), 0, TAU);
    ctx.stroke();
  }
  for (const slash of effects.slashes) {
    const u = 1 - slash.remaining / slash.total;
    ctx.globalAlpha = (1 - u) * 0.9;
    ctx.strokeStyle = slash.color;
    ctx.lineWidth = 3 + (1 - u) * 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(slash.position.x, slash.position.y, slash.range * (0.75 + u * 0.25), slash.angle - slash.arc / 2, slash.angle + slash.arc / 2);
    ctx.stroke();
  }
  for (const spark of effects.sparks) {
    // Scintilla d'impatto: una stella a quattro punte che si allarga e svanisce in un lampo.
    const u = 1 - spark.remaining / spark.total;
    const r = spark.size * (0.6 + u * 0.6);
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = spark.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = spark.angle + (i * Math.PI) / 2;
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x + Math.cos(a) * r, spark.y + Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
  }
  ctx.restore();
}

/** Particelle (scie, scoppi), a luce additiva. Si disegnano sotto i proiettili nemici, che non devono sbiadire. */
export function drawParticles(ctx: CanvasRenderingContext2D, effects: Effects): void {
  if (!drawWebGLParticles(ctx, effects.particles)) drawCanvasParticles(ctx, effects.particles);
}

/** Ripiego senza GPU, usato anche nello studio per confrontare i due percorsi. */
export function drawCanvasParticles(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of particles) {
    const alpha = clamp(f.remaining / f.total, 0, 1);
    const size = Math.max(1, f.size * Math.sqrt(alpha));
    ctx.fillStyle = f.color;
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillRect(f.x - size, f.y - size, size * 3, size * 3);
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), size, size);
  }
  ctx.restore();
}

/** Durata del "pop" iniziale dei testi (si ingrandiscono e tornano alla misura normale). */
const TEXT_POP = 0.12;

/** Un testo fatto solo di cifre (e del segno): i numeri del danno e delle cure. */
const NUMERIC = /^[−+-]?\d+$/;

/**
 * Numeri del danno e nomi degli attacchi: grassetto con contorno scuro (leggibili su ogni pavimento), un piccolo "pop"
 * all'apparizione e dissolvenza nell'ultimo terzo della vita.
 */
export function drawFloatingTexts(ctx: CanvasRenderingContext2D, effects: Effects): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const t of effects.texts) {
    const age = t.total - t.remaining;
    const pop = age < TEXT_POP ? 1 + 0.45 * (1 - age / TEXT_POP) : 1;
    ctx.globalAlpha = clamp(t.remaining / (t.total / 3), 0, 1);
    // I numeri in Silkscreen come l'HUD; nomi degli attacchi e scritte nel carattere di sistema, piu' leggibile.
    ctx.font = canvasFont(Math.round(t.size * pop), t.pixel || NUMERIC.test(t.text) ? 'pixel' : 'text', 'bold');
    if (t.outline) {
      ctx.strokeStyle = '#120d16';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

/**
 * Effetti a tutto schermo, in coordinate di vista: vignetta rossa per i colpi subiti e il battito a vita bassa, lampo
 * rosso del passaggio in furia, lampo bianco del colpo finale.
 */
export function drawScreenEffects(ctx: CanvasRenderingContext2D, camera: Camera, effects: Effects, healthFraction: number, clock: number): void {
  const { width: w, height: h } = camera;
  // Sotto il 30% di vita la vignetta pulsa come un battito, piu' forte quanto meno vita resta.
  const low = healthFraction > 0 && healthFraction < LOW_HEALTH ? (1 - healthFraction / LOW_HEALTH) * (0.18 + 0.12 * Math.sin(clock * 7)) : 0;
  const red = Math.min(0.75, effects.hurtFlash / FEEDBACK.hurtFlash * 0.55 + low);
  if (red > 0.01) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, '#b0141000');
    gradient.addColorStop(1, `rgba(176, 20, 16, ${red.toFixed(3)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  if (effects.rageFlash > 0) {
    ctx.fillStyle = `rgba(255, 70, 40, ${(effects.rageFlash / FEEDBACK.rageFlash * 0.28).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (effects.screenFlash > 0) {
    ctx.fillStyle = `rgba(255, 246, 220, ${(effects.screenFlash / FEEDBACK.screenFlash * 0.7).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Sotto questa frazione di vita la vignetta rossa pulsa. Provvisorio. */
export const LOW_HEALTH = 0.3;

/**
 * Freccia ai bordi della vista che indica dov'e' il boss quando e' fuori schermo. In coordinate di vista (non di mondo).
 * I margini lasciano libere le zone coperte dall'interfaccia (barre in alto, skill in basso).
 */
export function drawBossIndicator(ctx: CanvasRenderingContext2D, camera: Camera, player: Vec2, boss: Vec2, label = 'BOSS', color = '#f0b380'): void {
  const { width: w, height: h } = camera;
  const bx = boss.x - camera.position.x;
  const by = boss.y - camera.position.y;
  if (!(bx < 30 || bx > w - 30 || by < 85 || by > h - 80)) return;
  const a = Math.atan2(boss.y - player.y, boss.x - player.x);
  const r = Math.min(
    (w / 2 - 40) / Math.max(0.001, Math.abs(Math.cos(a))),
    (h / 2 - 95) / Math.max(0.001, Math.abs(Math.sin(a))),
  );
  const x = w / 2 + Math.cos(a) * Math.max(30, r);
  const y = h / 2 + Math.sin(a) * Math.max(30, r);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawText(ctx, label, x, y + 22, color, 10, 'center');
}
