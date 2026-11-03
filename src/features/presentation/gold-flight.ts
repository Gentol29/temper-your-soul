import { clamp, Vec2 } from '../../core/vec2';
import { MOB_REWARDS } from '../run/mob-rewards';

export const GOLD_ART = { coins: 5, spread: 18, rise: 30, growSeconds: 0.14, fadeSeconds: 0.07, chestOffset: 16 } as const;
export interface FlyingCoin { readonly x: number; readonly y: number; readonly scale: number; readonly alpha: number; readonly width: number }

/** La traiettoria dipende solo dall'età autorevole e dalla posizione corrente del destinatario. */
export function goldCoinFrame(origin: Vec2, collector: Vec2, age: number, index: number, seed = 0): FlyingCoin {
  const emergence = clamp(age / MOB_REWARDS.emergeSeconds, 0, 1);
  const angle = (index * 2.399 + seed * 0.73), spread = GOLD_ART.spread * (0.65 + index % 3 * 0.18);
  const released = origin.add(new Vec2(Math.cos(angle) * spread * emergence, -GOLD_ART.rise * Math.sin(emergence * Math.PI * 0.65) + Math.sin(angle) * 7 * emergence));
  const t = clamp((age - MOB_REWARDS.emergeSeconds) / MOB_REWARDS.flightSeconds, 0, 1);
  const flight = t * t * (3 - 2 * t);
  const point = released.lerp(collector.add(new Vec2(0, -GOLD_ART.chestOffset)), flight);
  const arc = Math.sin(t * Math.PI) * (12 + index * 3);
  return { x: point.x, y: point.y - arc, scale: clamp(age / GOLD_ART.growSeconds, 0, 1),
    alpha: age >= MOB_REWARDS.emergeSeconds + MOB_REWARDS.flightSeconds ? 0 : clamp(age / GOLD_ART.fadeSeconds, 0, 1),
    width: 1 + Math.abs(Math.cos(age * 16 + index * 1.7)) * 3 };
}

export function drawFlyingGold(ctx: CanvasRenderingContext2D, origin: Vec2, collector: Vec2, age: number, seed: number): void {
  ctx.save();
  for (let i = 0; i < GOLD_ART.coins; i++) {
    const coin = goldCoinFrame(origin, collector, age, i, seed); if (coin.alpha <= 0) continue;
    const x = Math.round(coin.x), y = Math.round(coin.y), width = Math.max(1, Math.round(coin.width * coin.scale)), height = Math.max(1, Math.round(6 * coin.scale));
    ctx.globalAlpha = coin.alpha;
    // Il bagliore segue ogni moneta: nessun mucchio o etichetta lasciati a terra.
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#b07137'; ctx.globalAlpha *= .13;
    ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = coin.alpha;
    ctx.fillStyle = '#3b241b'; ctx.fillRect(x - 1, y, width + 2, height);
    ctx.fillStyle = '#c0873c'; ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x, y, Math.max(1, width - 1), Math.max(1, height - 2));
    ctx.fillStyle = '#fff1c6'; ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}
