import type { Camera } from '../../core/camera';
import type { Solid } from '../arena/arena';

/*
 * La luce della scena. Durante il disegno del pavimento le luci (torce, bracieri, lava, funghi, giocatori...) si
 * raccolgono in una mappa di luce a meta' risoluzione: il buio dell'ambiente del tema, con le luci sommate sopra. La
 * mappa si moltiplica poi sul pavimento, prima dei segnali a terra, delle figure e dei proiettili: l'ambiente si fa
 * cupo e caldo attorno alle fonti, mentre tutto cio' che conta per giocare resta a piena luce.
 *
 * Fuori dalla scena (la vignetta del dungeon nel menu) non c'e' mappa: `drawLight` disegna un alone in somma.
 */

/** Valori provvisori. */
export const LIGHT = {
  /** Trasparenza del buio ai bordi dello schermo. */
  vignetteAlpha: 0.25,
  /** Da quale frazione della mezza diagonale dello schermo comincia il buio. */
  vignetteStart: 0.6,
  /** Risoluzione della mappa di luce rispetto alla vista (piu' bassa = piu' morbida e leggera). */
  mapScale: 0.5,
  /** Al massimo tante luci per fotogramma: oltre, le piu' deboli si scartano. */
  maxLights: 160,
} as const;

/** Una fonte di luce, in coordinate di mondo. `intensity` da 0 a 1. */
export interface LightSource {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
  /**
   * Solo in isometria: il punto del canvas in cui la luce e' disegnata (la trasformazione del contesto al momento di
   * `drawLight`, quindi con lo spostamento della figura o del pezzo che la porta).
   */
  readonly canvasX?: number;
  readonly canvasY?: number;
}

/** In isometria una pozza di luce a terra e' un cerchio del mondo proiettato: ellisse larga sqrt2 r e alta r / sqrt2. */
export const ISO_LIGHT_SHAPE = { rx: Math.SQRT2, ry: Math.SQRT1_2 } as const;

const alphaHex = (alpha: number): string => Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');

/** Senza DOM (i test girano in Node) non si possono creare canvas: luce e vignettatura si saltano. */
const canPaint = (): boolean => typeof document !== 'undefined';

const glowSprites = new Map<string, HTMLCanvasElement>();

/** Alone per il disegno diretto (senza mappa): tenue, da sommare al pavimento. */
function glowSprite(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}|${radius}`;
  let sprite = glowSprites.get(key);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = radius * 2;
  sprite.height = radius * 2;
  const painter = sprite.getContext('2d')!;
  const gradient = painter.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `${color}66`);
  gradient.addColorStop(0.35, `${color}2e`);
  gradient.addColorStop(1, `${color}00`);
  painter.fillStyle = gradient;
  painter.fillRect(0, 0, radius * 2, radius * 2);
  glowSprites.set(key, sprite);
  return sprite;
}

const lightSprites = new Map<string, HTMLCanvasElement>();

/** Luce per la mappa: piena al centro, sfuma a zero sul bordo. Un raster piccolo, ingrandito al disegno. */
function lightSprite(color: string): HTMLCanvasElement {
  let sprite = lightSprites.get(color);
  if (sprite) return sprite;
  const size = 64;
  sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const painter = sprite.getContext('2d')!;
  const half = size / 2;
  const gradient = painter.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `${color}ff`);
  gradient.addColorStop(0.4, `${color}99`);
  gradient.addColorStop(0.75, `${color}33`);
  gradient.addColorStop(1, `${color}00`);
  painter.fillStyle = gradient;
  painter.fillRect(0, 0, size, size);
  lightSprites.set(color, sprite);
  return sprite;
}

/**
 * La mappa di luce di un fotogramma. `begin` apre la raccolta (da quel momento `drawLight` aggiunge luci invece di
 * disegnarle), `composite` la chiude e la moltiplica sulla scena.
 */
export class LightMap {
  private canvas: HTMLCanvasElement | null = null;
  private readonly lights: LightSource[] = [];
  private collecting = false;
  private iso = false;

  get isCollecting(): boolean {
    return this.collecting;
  }

  /** Vero se le luci si raccolgono nel canvas (vista isometrica). */
  get inCanvasSpace(): boolean {
    return this.iso;
  }

  /** Le luci raccolte (per i test). */
  get collected(): readonly LightSource[] {
    return this.lights;
  }

  /** Le luci raccolte finora (per i test e per le misure). */
  get count(): number {
    return this.lights.length;
  }

  /**
   * Apre la raccolta. Con `canvasSpace` (la vista isometrica) ogni luce si registra nel punto del canvas in cui la si
   * disegna e si compone come pozza ellittica; senza, come sempre, in coordinate di mondo.
   */
  begin(canvasSpace = false): void {
    this.lights.length = 0;
    this.collecting = true;
    this.iso = canvasSpace;
    active = this;
  }

  add(light: LightSource): void {
    if (light.intensity <= 0 || light.radius <= 0) return;
    this.lights.push(light);
  }

  /**
   * Toglie le luci raccolte finora che nascono sotto un massiccio (crepe, rune, funghi del pavimento coperti dal
   * blocco): illuminerebbero la sua cima. Si chiama dopo il pavimento, prima delle luci delle figure.
   */
  dropCovered(solids: readonly Solid[] | undefined): void {
    if (!solids || solids.length === 0) return;
    const covered = (light: LightSource): boolean =>
      solids.some((solid) => light.x > solid.x && light.x < solid.x + solid.width && light.y > solid.y && light.y < solid.y + solid.height);
    for (let i = this.lights.length - 1; i >= 0; i--) if (covered(this.lights[i]!)) this.lights.splice(i, 1);
  }

  /**
   * Chiude la raccolta e moltiplica la mappa sulla scena. Il contesto e' gia' traslato sul mondo: (`left`, `top`) e'
   * l'angolo della vista con la stessa traslazione. `ambient` e' il buio del tema (#rrggbb).
   */
  composite(ctx: CanvasRenderingContext2D, camera: Camera, left: number, top: number, ambient: string): void {
    this.collecting = false;
    if (active === this) active = null;
    if (!canPaint()) return;
    const scale = LIGHT.mapScale;
    const width = Math.max(1, Math.ceil(camera.width * scale));
    const height = Math.max(1, Math.ceil(camera.height * scale));
    if (this.canvas === null) this.canvas = document.createElement('canvas');
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const map = this.canvas.getContext('2d')!;
    map.setTransform(1, 0, 0, 1, 0, 0);
    map.globalCompositeOperation = 'source-over';
    map.globalAlpha = 1;
    map.fillStyle = ambient;
    map.fillRect(0, 0, width, height);
    if (this.iso) {
      this.paintCanvasSpace(map, camera, scale);
      this.blend(ctx, camera, left, top);
      return;
    }
    map.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
    map.globalCompositeOperation = 'lighter';
    const right = left + camera.width;
    const bottom = top + camera.height;
    const visible = this.lights.filter((l) => l.x + l.radius > left && l.x - l.radius < right && l.y + l.radius > top && l.y - l.radius < bottom);
    if (visible.length > LIGHT.maxLights) visible.sort((a, b) => b.intensity * b.radius - a.intensity * a.radius).length = LIGHT.maxLights;
    for (const light of visible) {
      map.globalAlpha = Math.min(1, light.intensity);
      map.drawImage(lightSprite(light.color), light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
    }
    // Luce morbida: sotto il grigio medio la mappa scurisce, sopra schiarisce. Cosi' anche i pavimenti molto scuri
    // prendono luce attorno alle fonti, mentre il buio dell'ambiente resta buio.
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, left, top, camera.width, camera.height);
    ctx.restore();
  }

  /** Le luci registrate nel canvas, come pozze ellittiche 2:1 (vista isometrica). */
  private paintCanvasSpace(map: CanvasRenderingContext2D, camera: Camera, scale: number): void {
    map.setTransform(scale, 0, 0, scale, 0, 0);
    map.globalCompositeOperation = 'lighter';
    const visible = this.lights.filter((l) => {
      const x = l.canvasX ?? l.x, y = l.canvasY ?? l.y;
      const rx = l.radius * ISO_LIGHT_SHAPE.rx, ry = l.radius * ISO_LIGHT_SHAPE.ry;
      return x + rx > 0 && x - rx < camera.width && y + ry > 0 && y - ry < camera.height;
    });
    if (visible.length > LIGHT.maxLights) visible.sort((a, b) => b.intensity * b.radius - a.intensity * a.radius).length = LIGHT.maxLights;
    for (const light of visible) {
      const rx = light.radius * ISO_LIGHT_SHAPE.rx, ry = light.radius * ISO_LIGHT_SHAPE.ry;
      map.globalAlpha = Math.min(1, light.intensity);
      map.drawImage(lightSprite(light.color), (light.canvasX ?? light.x) - rx, (light.canvasY ?? light.y) - ry, rx * 2, ry * 2);
    }
  }

  private blend(ctx: CanvasRenderingContext2D, camera: Camera, left: number, top: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas!, left, top, camera.width, camera.height);
    ctx.restore();
  }
}

/** La mappa che sta raccogliendo, se c'e'. */
let active: LightMap | null = null;

/**
 * Una luce in (x, y), in coordinate di mondo. Durante la raccolta di una mappa finisce nella mappa; altrimenti si
 * disegna come alone in somma. `intensity` va da 0 a 1 (tremolio, pulsazione).
 */
export function drawLight(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number, intensity = 1): void {
  if (active !== null && active.isCollecting) {
    if (active.inCanvasSpace) {
      const m = ctx.getTransform();
      active.add({ x, y, color, radius, intensity: Math.max(0, Math.min(1, intensity)), canvasX: m.a * x + m.c * y + m.e, canvasY: m.b * x + m.d * y + m.f });
    } else active.add({ x, y, color, radius, intensity: Math.max(0, Math.min(1, intensity)) });
    return;
  }
  if (!canPaint()) return;
  const r = Math.max(4, Math.round(radius));
  const sprite = glowSprite(color, r);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, intensity));
  ctx.drawImage(sprite, Math.round(x - r), Math.round(y - r));
  ctx.restore();
}

/**
 * Il colore che `color` avrebbe sotto la mappa di luce riempita solo di `ambient` (fusione soft-light, come nel
 * disegno): per cio' che si disegna dopo la luce ma sta nell'ambiente (la cima del muro in basso davanti alle figure).
 */
export function litColor(color: string, ambient: string): string {
  const parse = (hex: string): number[] => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) || 0) / 255);
  const light = parse(ambient);
  return `#${parse(color)
    .map((base, i) => {
      const source = light[i]!;
      const soft = source <= 0.5
        ? base - (1 - 2 * source) * base * (1 - base)
        : base + (2 * source - 1) * ((base <= 0.25 ? ((16 * base - 12) * base + 4) * base : Math.sqrt(base)) - base);
      return Math.round(Math.max(0, Math.min(1, soft)) * 255).toString(16).padStart(2, '0');
    })
    .join('')}`;
}

/** Mescola due colori #rrggbb: `amount` 0 tiene il primo, 1 da' il secondo (l'atmosfera della stanza). */
export function mixColor(color: string, target: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const parse = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  const from = parse(color);
  const to = parse(target);
  return `#${from.map((c, i) => Math.round(c + (to[i]! - c) * t).toString(16).padStart(2, '0')).join('')}`;
}

let vignette: { key: string; canvas: HTMLCanvasElement } | null = null;

/** Il buio ai bordi, in coordinate di schermo (sopra la scena, sotto gli indicatori). Mai al centro. */
export function drawVignette(ctx: CanvasRenderingContext2D, camera: Camera, color: string, alpha: number = LIGHT.vignetteAlpha): void {
  if (!canPaint()) return;
  const width = Math.ceil(camera.width);
  const height = Math.ceil(camera.height);
  const key = `${width}x${height}|${color}|${alphaHex(alpha)}`;
  if (vignette?.key !== key) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const painter = canvas.getContext('2d')!;
    const reach = Math.hypot(width, height) / 2;
    const gradient = painter.createRadialGradient(width / 2, height / 2, reach * LIGHT.vignetteStart, width / 2, height / 2, reach);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(1, `${color}${alphaHex(alpha)}`);
    painter.fillStyle = gradient;
    painter.fillRect(0, 0, width, height);
    vignette = { key, canvas };
  }
  ctx.drawImage(vignette.canvas, 0, 0);
}
