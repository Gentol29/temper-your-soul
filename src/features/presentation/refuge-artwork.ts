import { preloadSheets, sheetImage } from './boss-art/sheet-images';
import { drawPortalVortex } from './hub-portal';
import { MENU_FLOOR_URL, MENU_MODULES, type MenuLayout } from './menu-layout';
import type { MenuSceneFocus } from './menu-scene';
export interface RefugeActor { readonly y: number; readonly draw: () => void }
/** La bocca del portale nello sprite della cattedrale. */
const PORTAL_MOUTH = { points: [[113, 134], [113, 90], [120, 80], [137, 66], [154, 80], [161, 90], [161, 134]], x: 137, y: 150 } as const;
/** Dove nasce il fumo nello sprite della fucina. */
const CHIMNEY = { x: 141, y: 8 } as const;

const COLORS = {
  void: '#08070a', crimson1: '#4a0f1b', crimson2: '#7a1a26', crimson3: '#a82a30', crimson4: '#d9423a',
  rustLight: '#b8622f', amber0: '#c8802e', amber1: '#f0a93f', amber2: '#ffd77a', copperLight: '#dba777',
  slate1: '#38353a', slate2: '#4a464b',
} as const;

const hash = (x: number, y: number): number => {
  let n = Math.imul(x + 311, 374761393) ^ Math.imul(y + 97, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
};

/** Luce a tre fasce piene, disegnata una volta per colore e raggio: niente puntini sopra statue e portale. */
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}|${radius}`;
  let sprite = glowCache.get(key);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = radius * 2;
  const c = sprite.getContext('2d')!;
  c.fillStyle = color;
  for (const [reach, alpha] of [[1, 0.1], [0.68, 0.12], [0.38, 0.16]] as const) {
    c.globalAlpha = alpha;
    for (let y = 0; y < radius * 2; y++) {
      const dy = (y - radius + 0.5) * 1.25, span = reach * radius * reach * radius - dy * dy;
      if (span <= 0) continue;
      const half = Math.round(Math.sqrt(span));
      c.fillRect(radius - half, y, half * 2, 1);
    }
  }
  glowCache.set(key, sprite);
  return sprite;
}

function glow(c: CanvasRenderingContext2D, color: string, x: number, y: number, radius: number, alpha: number): void {
  c.globalAlpha = alpha;
  c.drawImage(glowSprite(color, radius), Math.round(x - radius), Math.round(y - radius));
}

function rect(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function flame(c: CanvasRenderingContext2D, x: number, base: number, size: number, time: number, seed: number): void {
  const beat = Math.floor(time * 11 + seed) % 4, lean = beat === 1 ? 1 : beat === 3 ? -1 : 0, tall = size + (beat % 2);
  rect(c, COLORS.crimson3, x - Math.floor(size / 2), base - Math.ceil(tall * 0.55), size, Math.ceil(tall * 0.55));
  rect(c, COLORS.amber0, x - Math.floor(size / 2) + lean, base - tall, Math.max(1, size - 1), Math.ceil(tall * 0.7));
  rect(c, COLORS.amber2, x + lean - (size > 2 ? 1 : 0), base - Math.ceil(tall * 0.6), Math.max(1, size - 2), Math.ceil(tall * 0.45));
}


/** Stesso cortile, edifici, profondità, fuoco e portale nel menu e nella mappa giocabile. */
export class RefugeArtwork {
  focus: MenuSceneFocus | null = null;
  constructor() { preloadSheets([MENU_FLOOR_URL, ...MENU_MODULES.map(module => module.url)]); }
  draw(c: CanvasRenderingContext2D, time: number, layout: MenuLayout, actors: readonly RefugeActor[] = [], focus: MenuSceneFocus | null = null): void {
    this.focus = focus;
    c.save();
    c.imageSmoothingEnabled = false;
    c.fillStyle = COLORS.void; c.fillRect(0, 0, 1024, 576);
    const floor = sheetImage(MENU_FLOOR_URL);
    if (floor !== null) c.drawImage(floor, 0, 0);
    const layers: RefugeActor[] = MENU_MODULES.map(module => ({
      y: layout[module.id].y + module.base - (module.foreground ? 0 : 1024),
      draw: () => {
        const at = layout[module.id], image = sheetImage(module.url);
        if (image !== null) c.drawImage(image, at.x, at.y);
        if (module.id === 'cathedral') this.drawPortal(c, at.x, at.y, time);
        for (const [index, light] of module.flames.entries()) flame(c, at.x + light.x, at.y + light.y, light.size, time, at.x + index * 3);
      },
    }));
    layers.push(...actors); layers.sort((a, b) => a.y - b.y);
    for (const layer of layers) layer.draw();
    this.drawSmokeAndEmbers(c, time, layout.forge.x + CHIMNEY.x, layout.forge.y + CHIMNEY.y, layout.cathedral.x + PORTAL_MOUTH.x, layout.cathedral.y + 130);
    this.drawLights(c, time, layout);
    c.restore();
  }
  private drawPortal(c: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    c.save();
    c.beginPath();
    PORTAL_MOUTH.points.forEach(([px, py], index) => {
      if (index === 0) c.moveTo(x + px, y + py);
      else c.lineTo(x + px, y + py);
    });
    c.closePath();
    c.clip();
    drawPortalVortex(c, x + PORTAL_MOUTH.x, y + PORTAL_MOUTH.y, t);
    c.restore();
  }

  private drawSmokeAndEmbers(c: CanvasRenderingContext2D, t: number, chimneyX: number, chimneyY: number, portalX: number, portalY: number): void {
    for (let i = 0; i < 9; i++) {
      const u = (t * 0.09 + i / 9) % 1, size = 4 + Math.round(u * 12);
      const x = chimneyX + Math.sin(u * 7 + i) * (3 + u * 14) + u * 18, y = chimneyY - u * 44;
      c.globalAlpha = 0.34 * (1 - u);
      rect(c, u < 0.5 ? COLORS.slate2 : COLORS.slate1, x - size / 2, y - size / 2, size, size);
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 34; i++) {
      const fromPortal = i % 2 === 0;
      const u = (t * (0.07 + (i % 5) * 0.012) + i * 0.137) % 1;
      const ox = fromPortal ? portalX + (hash(i, 1) % 70) - 35 : chimneyX + (hash(i, 2) % 16) - 8;
      const oy = fromPortal ? portalY : chimneyY;
      const x = ox + Math.sin(u * 9 + i) * 8, y = oy - u * (fromPortal ? 120 : 70);
      if (y < 0) continue;
      rect(c, u > 0.75 ? COLORS.crimson2 : i % 3 === 0 ? COLORS.amber1 : COLORS.crimson4, x, y, 1, 1);
    }
  }

  private drawLights(c: CanvasRenderingContext2D, t: number, layout: MenuLayout): void {
    c.globalCompositeOperation = 'lighter';
    const pulse = Math.floor(t * 3) % 2;
    glow(c, COLORS.crimson3, layout.cathedral.x + PORTAL_MOUTH.x, layout.cathedral.y + 110, 96, 0.6 + pulse * 0.08);
    glow(c, COLORS.crimson2, layout.cathedral.x + PORTAL_MOUTH.x, layout.cathedral.y + 170, 70, 0.5);
    for (const module of MENU_MODULES) {
      const at = layout[module.id];
      for (const light of module.flames) {
        if (light.size < 3) glow(c, COLORS.amber0, at.x + light.x, at.y + light.y - 2, 14, 0.5);
        else glow(c, COLORS.rustLight, at.x + light.x, at.y + light.y - 4, 18 + light.size * 4, 0.42 + pulse * 0.06);
      }
    }
    if (this.focus === 'hero') glow(c, COLORS.amber2, layout.hero.x, layout.hero.y - 8, 44, 0.8);
    else if (this.focus !== null) {
      const module = MENU_MODULES.find((item) => item.focus === this.focus);
      if (module !== undefined) {
        const at = layout[module.id];
        glow(c, this.focus === 'portal' ? COLORS.crimson4 : this.focus === 'gate' ? COLORS.copperLight : COLORS.amber1, at.x + module.width / 2, at.y + module.height / 2, 90, 0.75);
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}
