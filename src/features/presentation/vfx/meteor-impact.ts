import type { GameEvent } from '../../combat/events';
import { TOP_DOWN_VIEW, type SceneView } from '../iso/scene-view';

/*
 * Impatto della meteora in isometria: un foglio di 16 fotogrammi 192x160 (SDXL + Pixel Art XL in locale sulle pose
 * disegnate con i 12 principi dell'animazione, ridotte a pixel Hi-bit; provenienza in `src/assets/vfx/frames/LEGGIMI.md`).
 * Il punto d'impatto del foglio (96, 118) sta sul punto del pavimento proiettato; l'onda d'urto disegnata arriva
 * all'ellisse 2:1 del raggio di gioco (66 nel foglio) e il foglio si scala con il raggio della zona. In piu' schegge e
 * braci (disegnate con PixiJS in `trail-layer.ts`) volano ad arco e ricadono dentro l'area di danno. Solo aspetto:
 * nessun numero casuale, nessuna regola. Valori estetici provvisori.
 */

export const METEOR_IMPACT = {
  frameWidth: 192,
  frameHeight: 160,
  frames: 16,
  fps: 20,
  /** Punto d'impatto nel fotogramma (centro dell'ellisse a terra). */
  pivotX: 96,
  pivotY: 118,
  /** Raggio di gioco per cui e' disegnato il foglio. */
  baseRadius: 66,
  embers: { count: 26, life: 1.1, gravity: 340, startHeight: 10, rise: [80, 150] as readonly [number, number], reach: [0.3, 0.9] as readonly [number, number] },
} as const;

export const METEOR_IMPACT_URL = new URL('../../../assets/vfx/frames/meteor-impact.png', import.meta.url).href;

export interface MeteorImpact {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  age: number;
}

/** Una scheggia: parte dal centro dell'impatto e vola sul pavimento (mondo) con un'altezza che sale e ricade. */
export interface MeteorEmber {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly flight: number;
  readonly size: number;
  readonly seed: number;
  age: number;
}

const hash = (a: number, b: number): number => {
  let h = Math.imul(a ^ 0x2545f491, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b);
  h ^= h >>> 15; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

/** Lo scoppio di una zona del giocatore che e' la meteora (l'aspetto predefinito delle zone del giocatore e' quello). */
export function isMeteorImpact(event: GameEvent): event is Extract<GameEvent, { type: 'zone_detonated' }> {
  return event.type === 'zone_detonated' && event.team === 'player' && (event.visual ?? 'meteor') === 'meteor';
}

/** Fotogramma all'eta' data; null a esplosione finita. */
export function impactFrame(age: number): number | null {
  const frame = Math.floor(Math.max(0, age) * METEOR_IMPACT.fps);
  return frame < METEOR_IMPACT.frames ? frame : null;
}

/** Posizione di una scheggia: punto del mondo sul pavimento e altezza sullo schermo (0 a terra). */
export function emberPoint(ember: MeteorEmber): { readonly x: number; readonly y: number; readonly z: number } {
  const t = Math.min(ember.age, ember.flight);
  const z = Math.max(0, METEOR_IMPACT.embers.startHeight + ember.vz * t - METEOR_IMPACT.embers.gravity * t * t / 2);
  return { x: ember.x + ember.vx * t, y: ember.y + ember.vy * t, z };
}

/** Le schegge di un impatto: direzioni e slanci deterministici dal punto d'impatto, atterraggio dentro il raggio. */
export function impactEmbers(x: number, y: number, radius: number): MeteorEmber[] {
  const { count, gravity, startHeight, rise, reach } = METEOR_IMPACT.embers;
  const seed = Math.round(x) * 7919 + Math.round(y);
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + hash(seed, i) * 0.5;
    const vz = rise[0] + (rise[1] - rise[0]) * hash(seed, i + 100);
    // Tempo di volo fino a terra (parabola dall'altezza di partenza): l'arco atterra a `distance` dal centro.
    const flight = (vz + Math.sqrt(vz * vz + 2 * gravity * startHeight)) / gravity;
    const distance = radius * (reach[0] + (reach[1] - reach[0]) * hash(seed, i + 200));
    return {
      x, y, vx: Math.cos(a) * distance / flight, vy: Math.sin(a) * distance / flight, vz, flight,
      size: hash(seed, i + 300) < 0.35 ? 2 : 1, seed: Math.floor(hash(seed, i + 400) * 1e9), age: 0,
    };
  });
}

export class MeteorImpacts {
  readonly impacts: MeteorImpact[] = [];
  readonly embers: MeteorEmber[] = [];

  clear(): void { this.impacts.length = 0; this.embers.length = 0; }

  handle(event: GameEvent): void {
    if (!isMeteorImpact(event)) return;
    this.impacts.push({ x: event.position.x, y: event.position.y, radius: event.radius, age: 0 });
    // Le schegge partono quando il lampo si apre (anticipazione: il primo fotogramma resta pulito).
    for (const ember of impactEmbers(event.position.x, event.position.y, event.radius)) { ember.age = -2 / METEOR_IMPACT.fps; this.embers.push(ember); }
  }

  update(dt: number): void {
    for (const impact of this.impacts) impact.age += dt;
    for (const ember of this.embers) ember.age += dt;
    let n = 0;
    for (const impact of this.impacts) if (impactFrame(impact.age) !== null) this.impacts[n++] = impact;
    this.impacts.length = n;
    n = 0;
    for (const ember of this.embers) if (ember.age < METEOR_IMPACT.embers.life) this.embers[n++] = ember;
    this.embers.length = n;
  }
}

let sheet: HTMLImageElement | null = null;
function sheetImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (sheet === null) { sheet = new Image(); sheet.decoding = 'async'; sheet.src = METEOR_IMPACT_URL; }
  return sheet.complete && sheet.naturalWidth > 0 ? sheet : null;
}

/** Vero se il foglio e' pronto: allora l'esplosione dritta della palla di fuoco non serve. */
export function meteorImpactReady(): boolean {
  return sheetImage() !== null;
}

/** Riquadro della vista occupato dall'esplosione (per l'ordine con le figure e gli ostacoli). */
export function impactBox(impact: MeteorImpact, view: SceneView = TOP_DOWN_VIEW): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const s = impact.radius / METEOR_IMPACT.baseRadius, at = view.point(impact.x, impact.y);
  return { x: Math.floor(at.x - METEOR_IMPACT.pivotX * s), y: Math.floor(at.y - METEOR_IMPACT.pivotY * s), width: Math.ceil(METEOR_IMPACT.frameWidth * s), height: Math.ceil(METEOR_IMPACT.frameHeight * s) };
}

/** Disegna un impatto con il punto d'impatto sul pavimento proiettato. Falso se il foglio non e' ancora caricato. */
export function drawMeteorImpact(ctx: CanvasRenderingContext2D, impact: MeteorImpact, view: SceneView = TOP_DOWN_VIEW): boolean {
  const image = sheetImage(), frame = impactFrame(impact.age);
  if (image === null || frame === null) return image !== null;
  const { frameWidth: w, frameHeight: h, pivotX, pivotY, baseRadius } = METEOR_IMPACT;
  const s = impact.radius / baseRadius, shift = view.shift(impact.x, impact.y, 0);
  const x = Math.round(impact.x) + shift.x, y = Math.round(impact.y) + shift.y;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, frame * w, 0, w, h, Math.round(x - pivotX * s), Math.round(y - pivotY * s), Math.round(w * s), Math.round(h * s));
  ctx.restore();
  return true;
}
