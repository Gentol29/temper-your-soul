import type * as PixiTypes from 'pixi.js';
import type { DangerZone } from '../../combat/danger-zone';
import { TOP_DOWN_VIEW, type SceneView } from '../iso/scene-view';
import { compositePixi, pixiLayer, type Pixi } from '../webgl-renderer';
import { flashIntensity, isFallingMeteor, METEOR_GLOW, fallingMeteorOffset, sparkLook, sparkPoint, type MeteorGlow } from './meteor-glow';

/*
 * Luce della meteora con PixiJS in fusione additiva: aloni (sprite su trame a gradini, fatte nel codice) e scintille in un
 * ParticleContainer, tutti con `blendMode = 'add'` e raggruppati per non spezzare i lotti di disegno. Lo strato si compone
 * sulla scena con `lighter`: la luce si somma davvero al pavimento e alle figure, non solo al vuoto della tela di PixiJS.
 * Senza WebGL non si disegna nulla (e' decorazione). Solo aspetto.
 */

/** Ellisse 2:1 (luce sul pavimento) o cerchio (alone in aria), a quattro gradini di opacita': niente sfumature continue. */
function haloCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const d = Math.hypot((x + 0.5 - width / 2) / (width / 2), (y + 0.5 - height / 2) / (height / 2));
    const alpha = d < 0.35 ? 255 : d < 0.6 ? 150 : d < 0.82 ? 80 : d < 1 ? 32 : 0;
    image.data.set([255, 255, 255, alpha], (y * width + x) * 4);
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

interface GlowScene {
  readonly group: PixiTypes.Container;
  readonly halos: PixiTypes.Container;
  readonly sparks: PixiTypes.ParticleContainer;
  readonly ground: PixiTypes.Texture;
  readonly round: PixiTypes.Texture;
}

let scene: GlowScene | null = null;
const haloPool: PixiTypes.Sprite[] = [];
const sparkPool: PixiTypes.Particle[] = [];
const tints = new Map<string, number>();
const tintOf = (hex: string): number => { let v = tints.get(hex); if (v === undefined) { v = parseInt(hex.slice(1), 16); tints.set(hex, v); } return v; };

function ensure(pixi: Pixi): GlowScene {
  if (scene !== null) return scene;
  const texture = (canvas: HTMLCanvasElement): PixiTypes.Texture => { const t = pixi.Texture.from(canvas); t.source.scaleMode = 'nearest'; return t; };
  const group = new pixi.Container();
  // Tutto additivo: gli aloni prima, le scintille dopo, ciascun gruppo con la stessa fusione (un lotto per gruppo).
  const halos = new pixi.Container({ blendMode: 'add' });
  const sparks = new pixi.ParticleContainer({
    texture: pixi.Texture.WHITE,
    dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false },
    roundPixels: true,
    boundsArea: new pixi.Rectangle(-100000, -100000, 200000, 200000),
  });
  sparks.blendMode = 'add';
  group.addChild(halos, sparks);
  scene = { group, halos, sparks, ground: texture(haloCanvas(64, 32)), round: texture(haloCanvas(24, 24)) };
  return scene;
}

/** Disegna luci e scintille della meteora e le somma alla scena. Le zone servono per le meteore ancora in caduta. */
export function drawMeteorGlow(ctx: CanvasRenderingContext2D, glow: MeteorGlow, zones: readonly DangerZone[], view: SceneView = TOP_DOWN_VIEW): void {
  const falling = zones.filter(isFallingMeteor);
  if (glow.sparks.length === 0 && glow.flashes.length === 0 && falling.length === 0) return;
  const layer = pixiLayer();
  if (layer === null) return;
  const { pixi } = layer;
  const s = ensure(pixi);
  compositePixi(ctx, layer, s.group, () => {
    let used = 0;
    const halo = (texture: PixiTypes.Texture, x: number, y: number, width: number, height: number, color: string, alpha: number): void => {
      if (alpha <= 0.01) return;
      let sprite = haloPool[used];
      if (sprite === undefined) { sprite = new pixi.Sprite({ texture, anchor: 0.5 }); haloPool.push(sprite); s.halos.addChild(sprite); }
      sprite.texture = texture;
      sprite.visible = true;
      sprite.position.set(Math.round(x), Math.round(y));
      sprite.width = Math.round(width); sprite.height = Math.round(height);
      sprite.tint = tintOf(color);
      sprite.alpha = alpha;
      used++;
    };
    // Meteore in caduta: luce sul pavimento che cresce avvicinandosi e alone attorno alla testa.
    for (const zone of falling) {
      const shift = view.shift(zone.position.x, zone.position.y, 0);
      const gx = Math.round(zone.position.x) + shift.x, gy = Math.round(zone.position.y) + shift.y;
      const r = zone.radius, u = zone.progress, head = fallingMeteorOffset(u);
      halo(s.ground, gx, gy, r * 2.4 * (0.5 + u * 0.5), r * 1.2 * (0.5 + u * 0.5), METEOR_GLOW.ground.color, METEOR_GLOW.ground.alpha * u);
      halo(s.round, gx + head.x, gy + head.y, METEOR_GLOW.head.size, METEOR_GLOW.head.size, METEOR_GLOW.head.color, METEOR_GLOW.head.alpha);
    }
    // Lampi d'impatto: ellisse del danno (2:1 sul pavimento) e un nucleo piu' chiaro.
    for (const flash of glow.flashes) {
      const shift = view.shift(flash.x, flash.y, 0), k = flashIntensity(flash.age);
      const gx = Math.round(flash.x) + shift.x, gy = Math.round(flash.y) + shift.y;
      const w = flash.radius * 2.83 * METEOR_GLOW.flash.scale, h = w / 2;
      halo(s.ground, gx, gy, w, h, METEOR_GLOW.flash.color, METEOR_GLOW.flash.alpha * k);
      halo(s.ground, gx, gy - 6, w * 0.45, h * 0.6, METEOR_GLOW.flash.core, METEOR_GLOW.flash.alpha * k);
    }
    for (let i = used; i < haloPool.length; i++) haloPool[i]!.visible = false;
    // Scintille: punto del pavimento proiettato piu' scostamento sullo schermo e altezza.
    const list = s.sparks.particleChildren;
    list.length = 0;
    while (sparkPool.length < glow.sparks.length) sparkPool.push(new pixi.Particle({ texture: pixi.Texture.WHITE, anchorX: 0.5, anchorY: 0.5 }));
    glow.sparks.forEach((spark, i) => {
      const p = sparkPoint(spark), shift = view.shift(p.x, p.y, 0), look = sparkLook(spark), particle = sparkPool[i]!;
      particle.x = Math.round(p.x + shift.x + p.dx);
      particle.y = Math.round(p.y + shift.y + p.dy);
      particle.scaleX = particle.scaleY = spark.size;
      particle.tint = tintOf(look.color);
      particle.alpha = look.alpha;
      list.push(particle);
    });
    s.sparks.update();
  }, 'lighter');
}
