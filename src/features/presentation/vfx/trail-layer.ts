import type * as PixiTypes from 'pixi.js';
import { compositePixi, pixiLayer, type Pixi } from '../webgl-renderer';
import { emberPoint, METEOR_IMPACT, type MeteorEmber } from './meteor-impact';
import { moteLook, TRAILS, type ProjectileTrails } from './projectile-trails';

/*
 * Le scie dei colpi a distanza con PixiJS: un solo ParticleContainer (una chiamata di disegno per tutte le particelle),
 * il pixel bianco di PixiJS tinto e ingrandito a 1-2 pixel, posizioni arrotondate (Hi-bit). Le particelle sono riusate:
 * nessun oggetto nuovo a ogni fotogramma. Senza WebGL le scie non si disegnano (sono solo decorazione).
 */

let container: PixiTypes.ParticleContainer | null = null;
let root: PixiTypes.Container | null = null;
const pool: PixiTypes.Particle[] = [];
const tints = new Map<string, number>();

const tintOf = (hex: string): number => {
  let value = tints.get(hex);
  if (value === undefined) { value = parseInt(hex.slice(1), 16); tints.set(hex, value); }
  return value;
};

function ensure(pixi: Pixi): { readonly root: PixiTypes.Container; readonly particles: PixiTypes.ParticleContainer } {
  if (container === null || root === null) {
    container = new pixi.ParticleContainer({
      texture: pixi.Texture.WHITE,
      // Le scie animano posizione, misura (pool riusato) e colore; nessuna rotazione.
      dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false },
      roundPixels: true,
      boundsArea: new pixi.Rectangle(-100000, -100000, 200000, 200000),
    });
    root = new pixi.Container();
    root.addChild(container);
  }
  return { root, particles: container };
}

/** Colore e opacita' di una scheggia della meteora: calda in volo, brace a terra che si spegne a gradini. */
const EMBER_RAMP = ['#f0bd72', '#e77c40', '#cb4939', '#792d3b'] as const;
function emberLook(ember: MeteorEmber): { readonly color: string; readonly alpha: number } {
  if (ember.age < ember.flight) return { color: EMBER_RAMP[ember.age < ember.flight * 0.5 ? 0 : 1], alpha: 1 };
  const t = (ember.age - ember.flight) / Math.max(0.01, METEOR_IMPACT.embers.life - ember.flight);
  return { color: EMBER_RAMP[t < 0.5 ? 2 : 3], alpha: t < 0.6 ? 1 : 0.6 };
}

/**
 * Disegna le scie dei colpi e le schegge della meteora e le compone nel punto corrente della scena (sotto i colpi dei
 * giocatori, sopra le figure). La camera trasla insieme colpi, scie e schegge.
 */
export function drawProjectileTrails(ctx: CanvasRenderingContext2D, trails: ProjectileTrails, embers: readonly MeteorEmber[] = []): void {
  const live = embers.filter((ember) => ember.age >= 0);
  if (trails.motes.length === 0 && live.length === 0) return;
  const layer = pixiLayer();
  if (layer === null) return;
  const { pixi } = layer;
  const { root: group, particles } = ensure(pixi);
  compositePixi(ctx, layer, group, () => {
    const list = particles.particleChildren;
    while (pool.length < trails.motes.length + live.length) pool.push(new pixi.Particle({ texture: pixi.Texture.WHITE, anchorX: 0.5, anchorY: 0.5 }));
    list.length = 0;
    for (let i = 0; i < trails.motes.length; i++) {
      const mote = trails.motes[i]!, particle = pool[i]!;
      const look = moteLook(mote);
      particle.x = Math.round(mote.x + mote.dx);
      particle.y = Math.round(mote.y + mote.dy);
      particle.scaleX = particle.scaleY = mote.size;
      particle.tint = tintOf(TRAILS.styles[mote.style].ramp[look.tone]!);
      particle.alpha = look.alpha;
      list.push(particle);
    }
    for (let i = 0; i < live.length; i++) {
      const ember = live[i]!, particle = pool[trails.motes.length + i]!;
      const at = emberPoint(ember), look = emberLook(ember);
      particle.x = Math.round(at.x);
      particle.y = Math.round(at.y - at.z);
      particle.scaleX = particle.scaleY = ember.size;
      particle.tint = tintOf(look.color);
      particle.alpha = look.alpha;
      list.push(particle);
    }
    particles.update();
  });
}
