import type { DangerZone } from '../../combat/danger-zone';
import type { GameEvent } from '../../combat/events';
import { isMeteorImpact } from './meteor-impact';

/*
 * Luce e scintille della meteora, disegnate con PixiJS in fusione additiva (`glow-layer.ts`): in caduta scintille dietro
 * la testa, un alone attorno e una luce sul pavimento che cresce mentre la meteora si avvicina (anticipazione);
 * all'impatto un lampo di luce schiacciato sul pavimento che sale in fretta e cala piano (slow out) e una raffica di
 * scintille radiali. Qui la parte pura. Nessun numero casuale: tutto dagli id e dai punti. Valori estetici provvisori.
 */

export const METEOR_GLOW = {
  /** Toni delle scintille dal piu' caldo al piu' freddo (rampa del fuoco del gioco). */
  ramp: ['#fff1c6', '#f0bd72', '#e77c40', '#cb4939'] as readonly string[],
  /** Scintille vive al massimo. */
  max: 700,
  fall: {
    /** Una nuova coppia di scintille ogni 1/28 della caduta (non dipende dagli FPS). */
    steps: 28, burst: 2, life: 0.38, drift: 46, spread: 26,
    /** Altezza da cui cade la testa e scostamento laterale (come `drawFallingSpell`). */
    height: 190, lean: 0.35,
  },
  impact: { sparks: 40, life: [0.3, 0.6] as readonly [number, number], speed: [60, 190] as readonly [number, number], rise: [30, 110] as readonly [number, number], gravity: 260 },
  /** Lampo all'impatto: picco presto, poi cala piano. Scala rispetto all'ellisse del danno. */
  flash: { life: 0.6, peak: 0.07, scale: 1.0, color: '#ff9a4a', core: '#fff1c6', alpha: 0.75 },
  /** Luce sul pavimento sotto la meteora che cade e alone attorno alla testa. */
  ground: { color: '#e77c40', alpha: 0.5 },
  head: { color: '#ffb45c', alpha: 0.75, size: 30 },
} as const;

/** Lo scostamento sullo schermo della testa della meteora dal suo punto d'impatto, a un avanzamento della caduta (0..1). */
export function fallingMeteorOffset(progress: number): { readonly x: number; readonly y: number } {
  const h = (1 - progress) * METEOR_GLOW.fall.height;
  return { x: -h * METEOR_GLOW.fall.lean, y: -h };
}

/** Una zona del giocatore che e' la meteora in caduta. */
export function isFallingMeteor(zone: DangerZone): boolean {
  return zone.team === 'player' && (zone.spec.visual ?? 'meteor') === 'meteor' && zone.remaining > 0;
}

export interface GlowSpark {
  /** Punto del pavimento d'ancoraggio (mondo). */
  readonly x: number;
  readonly y: number;
  /** Velocita' sul pavimento (mondo), scostamento e velocita' sullo schermo, altezza verticale. */
  readonly gvx: number;
  readonly gvy: number;
  readonly ox: number;
  readonly oy: number;
  readonly svx: number;
  readonly svy: number;
  readonly vz: number;
  readonly gravity: number;
  readonly life: number;
  readonly size: number;
  age: number;
}

export interface GlowFlash {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  age: number;
}

const hash = (a: number, b: number): number => {
  let h = Math.imul(a ^ 0x68e31da4, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b);
  h ^= h >>> 15; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

/** Posizione di una scintilla all'eta' corrente: punto del pavimento, scostamento sullo schermo e altezza. */
export function sparkPoint(spark: GlowSpark): { readonly x: number; readonly y: number; readonly dx: number; readonly dy: number } {
  const t = spark.age;
  const z = Math.max(0, spark.vz * t - spark.gravity * t * t / 2);
  return { x: spark.x + spark.gvx * t, y: spark.y + spark.gvy * t, dx: spark.ox + spark.svx * t, dy: spark.oy + spark.svy * t - z };
}

/** Tono e opacita' a gradini di una scintilla. */
export function sparkLook(spark: GlowSpark): { readonly color: string; readonly alpha: number } {
  const ramp = METEOR_GLOW.ramp, t = Math.min(0.999, spark.age / spark.life);
  return { color: ramp[Math.floor(t * ramp.length)]!, alpha: t < 0.5 ? 1 : t < 0.8 ? 0.7 : 0.4 };
}

/** Intensita' del lampo all'eta' data: sale fino al picco, poi cala piano (curva quadratica), 0 a fine vita. */
export function flashIntensity(age: number): number {
  const { life, peak } = METEOR_GLOW.flash;
  if (age <= 0 || age >= life) return 0;
  if (age < peak) return age / peak;
  const t = (age - peak) / (life - peak);
  return (1 - t) * (1 - t);
}

export class MeteorGlow {
  readonly sparks: GlowSpark[] = [];
  readonly flashes: GlowFlash[] = [];
  private readonly steps = new Map<number, number>();

  clear(): void { this.sparks.length = 0; this.flashes.length = 0; this.steps.clear(); }

  handle(event: GameEvent): void {
    if (!isMeteorImpact(event)) return;
    const { x, y } = event.position;
    this.flashes.push({ x, y, radius: event.radius, age: 0 });
    const { sparks, life, speed, rise, gravity } = METEOR_GLOW.impact;
    const seed = Math.round(x) * 7919 + Math.round(y);
    for (let i = 0; i < sparks; i++) {
      const a = (i / sparks) * Math.PI * 2 + hash(seed, i) * 0.6;
      const v = speed[0] + (speed[1] - speed[0]) * hash(seed, i + 50);
      this.push({ x, y, gvx: Math.cos(a) * v, gvy: Math.sin(a) * v, ox: 0, oy: -6, svx: 0, svy: 0,
        vz: rise[0] + (rise[1] - rise[0]) * hash(seed, i + 100), gravity,
        life: life[0] + (life[1] - life[0]) * hash(seed, i + 150), size: hash(seed, i + 200) < 0.3 ? 2 : 1, age: 0 });
    }
  }

  update(dt: number, zones: readonly DangerZone[]): void {
    for (const spark of this.sparks) spark.age += dt;
    for (const flash of this.flashes) flash.age += dt;
    let n = 0;
    for (const spark of this.sparks) if (spark.age < spark.life) this.sparks[n++] = spark;
    this.sparks.length = n;
    n = 0;
    for (const flash of this.flashes) if (flash.age < METEOR_GLOW.flash.life) this.flashes[n++] = flash;
    this.flashes.length = n;

    const { steps, burst, life, drift, spread, lean } = METEOR_GLOW.fall;
    const seen = new Set<number>();
    for (const zone of zones) {
      if (!isFallingMeteor(zone)) continue;
      seen.add(zone.id);
      const reached = Math.floor(zone.progress * steps);
      // Scintille a passi fissi della caduta: le stesse a 30 e a 144 FPS.
      for (let step = (this.steps.get(zone.id) ?? -1) + 1; step <= reached; step++) {
        const head = fallingMeteorOffset(step / steps);
        // La scia va all'indietro rispetto alla caduta (in su e verso sinistra) e si allarga di lato.
        const back = Math.hypot(lean, 1);
        for (let k = 0; k < burst; k++) {
          const h = hash(zone.id, step * 4 + k), side = (h - 0.5) * 2;
          this.push({ x: zone.position.x, y: zone.position.y, gvx: 0, gvy: 0, ox: head.x, oy: head.y,
            svx: -lean / back * drift + side * spread, svy: -1 / back * drift * (0.6 + hash(zone.id, step * 4 + k + 2) * 0.8),
            vz: 0, gravity: 0, life: life * (0.7 + h * 0.6), size: h < 0.25 ? 2 : 1, age: 0 });
        }
      }
      this.steps.set(zone.id, reached);
    }
    for (const id of this.steps.keys()) if (!seen.has(id)) this.steps.delete(id);
  }

  private push(spark: GlowSpark): void {
    this.sparks.push(spark);
    if (this.sparks.length > METEOR_GLOW.max) this.sparks.shift();
  }
}
