import type { Projectile } from '../../combat/projectile';
import type { VfxId } from './assets';
import { PROJECTILE_VFX } from './sprite-effects';

/*
 * Scie di particelle dei colpi a distanza dei giocatori (frecce e dardi elementali), disegnate con PixiJS
 * (`trail-layer.ts`). Qui la parte pura: emissione a passo fisso lungo il tragitto (non dipende dagli FPS), moto per
 * elemento, colori a gradini e tetto massimo. Nessun numero casuale: tutto viene da un hash dell'id del colpo e del numero
 * della particella, quindi in cooperativa le scie sono uguali per tutti. Solo aspetto. Valori estetici provvisori.
 */

export interface TrailStyle {
  /** Toni dal piu' caldo/chiaro (appena nata) al piu' scuro (prima di sparire): Hi-bit, a gradini. */
  readonly ramp: readonly string[];
  /** Unita' di mondo fra due emissioni lungo il tragitto. */
  readonly spacing: number;
  /** Particelle per emissione. */
  readonly burst: number;
  /** Secondi di vita. */
  readonly life: number;
  /** Lato in pixel (1 o 2, a caso deterministico fra i due). */
  readonly sizes: readonly [number, number];
  /** Velocita' verticale sullo schermo (unita'/s): negativa sale (braci), positiva scende (gocce, schegge). */
  readonly rise: number;
  /** Quanto la particella segue all'indietro il colpo (quota della sua velocita'). */
  readonly drag: number;
  /** Ampiezza della dispersione di lato (unita'/s). */
  readonly spread: number;
}

export const TRAILS = {
  /** Particelle vive al massimo: oltre, le piu' vecchie lasciano il posto. */
  max: 1600,
  /** Altezza sullo schermo da cui partono, come il colpo (`ISO_BODY_LIFT`). */
  lift: 14,
  styles: {
    'mage-fireball': { ramp: ['#f0bd72', '#e77c40', '#cb4939', '#792d3b'], spacing: 7, burst: 2, life: 0.45, sizes: [1, 2], rise: -26, drag: 0.08, spread: 14 },
    'mage-water-orb': { ramp: ['#cce4df', '#91c7cc', '#537b8c', '#35495c'], spacing: 9, burst: 1, life: 0.5, sizes: [1, 2], rise: 34, drag: 0.06, spread: 10 },
    'mage-earth-wisp': { ramp: ['#d0be91', '#a99468', '#70765c', '#41463e'], spacing: 10, burst: 1, life: 0.45, sizes: [2, 2], rise: 46, drag: 0.04, spread: 12 },
    'mage-wind-orb': { ramp: ['#d6e1d1', '#c4d9cd', '#7daba8', '#426064'], spacing: 8, burst: 2, life: 0.35, sizes: [1, 1], rise: 0, drag: 0.12, spread: 24 },
    'archer-arrow': { ramp: ['#eee0c5', '#c4b8b0', '#9d4350', '#492632'], spacing: 9, burst: 1, life: 0.3, sizes: [1, 1], rise: 0, drag: 0.03, spread: 4 },
  } as const satisfies Partial<Record<VfxId, TrailStyle>>,
} as const;

export type TrailId = keyof typeof TRAILS.styles;

export interface TrailMote {
  /** Punto del pavimento da cui e' partita (mondo) e scostamento sullo schermo accumulato dal moto. */
  readonly x: number;
  readonly y: number;
  dx: number;
  dy: number;
  readonly vx: number;
  readonly vy: number;
  readonly style: TrailId;
  readonly size: number;
  age: number;
}

/** Hash intero a 32 bit, stabile e senza stato. */
export function trailHash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return h >>> 0;
}

/** Lo stile della scia di un colpo, o null: solo i colpi dei giocatori con un aspetto a distanza. */
export function trailStyleOf(projectile: Projectile): TrailId | null {
  if (projectile.team !== 'player') return null;
  const id = PROJECTILE_VFX[projectile.spec.visual];
  return id !== undefined && id in TRAILS.styles ? id as TrailId : null;
}

/** Tono (indice nella rampa) e opacita' a gradini all'eta' data: niente dissolvenze continue. */
export function moteLook(mote: TrailMote): { readonly tone: number; readonly alpha: number } {
  const style = TRAILS.styles[mote.style];
  const t = Math.min(0.999, mote.age / style.life);
  return { tone: Math.floor(t * style.ramp.length), alpha: t < 0.5 ? 1 : t < 0.8 ? 0.7 : 0.4 };
}

export class ProjectileTrails {
  readonly motes: TrailMote[] = [];
  private readonly cursors = new Map<number, { x: number; y: number; count: number }>();

  clear(): void { this.motes.length = 0; this.cursors.clear(); }

  update(dt: number, projectiles: readonly Projectile[]): void {
    let alive = 0;
    for (const mote of this.motes) {
      mote.age += dt;
      if (mote.age >= TRAILS.styles[mote.style].life) continue;
      mote.dx += mote.vx * dt; mote.dy += mote.vy * dt;
      this.motes[alive++] = mote;
    }
    this.motes.length = alive;

    const seen = new Set<number>();
    for (const projectile of projectiles) {
      const id = trailStyleOf(projectile);
      if (id === null) continue;
      seen.add(projectile.id);
      const style = TRAILS.styles[id];
      const cursor = this.cursors.get(projectile.id);
      if (cursor === undefined) { this.cursors.set(projectile.id, { x: projectile.position.x, y: projectile.position.y, count: 0 }); continue; }
      let dx = projectile.position.x - cursor.x, dy = projectile.position.y - cursor.y;
      let distance = Math.hypot(dx, dy);
      // Particelle a passo fisso lungo il tratto percorso: la scia e' la stessa a 30 e a 144 FPS.
      while (distance >= style.spacing) {
        const step = style.spacing / distance;
        cursor.x += dx * step; cursor.y += dy * step;
        const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1;
        const ux = projectile.velocity.x / speed, uy = projectile.velocity.y / speed;
        for (let k = 0; k < style.burst; k++) {
          const h = trailHash(projectile.id, cursor.count * 4 + k);
          const side = ((h % 1000) / 1000 - 0.5) * 2;           // -1..1
          const lag = ((h >>> 10) % 1000) / 1000;                // 0..1
          this.motes.push({
            x: cursor.x, y: cursor.y, dx: 0, dy: 0,
            vx: -projectile.velocity.x * style.drag * (0.6 + lag * 0.8) - uy * side * style.spread,
            vy: -projectile.velocity.y * style.drag * (0.6 + lag * 0.8) + ux * side * style.spread + style.rise,
            style: id,
            size: style.sizes[(h >>> 20) & 1]!,
            age: lag * 0.05,
          });
        }
        cursor.count++;
        dx = projectile.position.x - cursor.x; dy = projectile.position.y - cursor.y;
        distance = Math.hypot(dx, dy);
      }
    }
    for (const id of this.cursors.keys()) if (!seen.has(id)) this.cursors.delete(id);
    if (this.motes.length > TRAILS.max) this.motes.splice(0, this.motes.length - TRAILS.max);
  }
}
