import type { CharacterAppearance } from '../character/appearance';
import { preloadSheets, sheetImage } from './boss-art/sheet-images';
import { drawGameCharacter } from './game-character-preview';
import { drawPortalVortex } from './hub-portal';
import { MENU_FLOOR_URL, MENU_MODULES, menuLayoutFor } from './menu-layout';

/*
 * Sfondo del menu: il rifugio a pezzi. Cortile vuoto, strutture ordinate per riga a terra, poi cio' che si muove:
 * vortice nel portale, fiamme, fumo, braci e luci. Le immagini vengono dal modello locale di pixel art, a partire dalla
 * tavola dell'utente (vedi src/assets/art/menu/LEGGIMI.md); il movimento e' disegnato nel codice.
 */

/** Il mondo dipinto. */
export const MENU_SCENE = { width: 1024, height: 576 } as const;
/** Quanto mondo si vede al massimo: abbastanza lontano da abbracciare tutto il rifugio. */
const MENU_FRAME = { width: 1024, height: 576 } as const;

/** Punti del rifugio che i comandi del menu possono illuminare. */
export type MenuSceneFocus = 'portal' | 'storage' | 'forge' | 'merchant' | 'gate' | 'hero';

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

/** La vista copre la finestra mostrando al massimo `MENU_FRAME`; il canvas la ingrandisce con pixel netti, come il rifugio. */
export function menuSceneView(width: number, height: number): { readonly scale: number; readonly width: number; readonly height: number; readonly x: number; readonly y: number } {
  const scale = Math.max(width / MENU_FRAME.width, height / MENU_FRAME.height);
  const viewWidth = Math.ceil(width / scale), viewHeight = Math.ceil(height / scale);
  return { scale, width: viewWidth, height: viewHeight, x: Math.round((MENU_SCENE.width - viewWidth) / 2), y: Math.round((MENU_SCENE.height - viewHeight) / 2) };
}

/** Il rifugio animato dietro il menu. Solo disegno: non conosce personaggi salvati ne' regole. */
export class MenuScene {
  private readonly ctx: CanvasRenderingContext2D;
  focus: MenuSceneFocus | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    preloadSheets([MENU_FLOOR_URL, ...MENU_MODULES.map((module) => module.url)]);
  }

  draw(time: number, appearance: CharacterAppearance | null, calm: boolean): void {
    const view = menuSceneView(window.innerWidth, window.innerHeight);
    if (this.canvas.width !== view.width || this.canvas.height !== view.height) {
      this.canvas.width = view.width;
      this.canvas.height = view.height;
    }
    // Con `calm` (animazioni ridotte) il tempo resta fermo a un istante leggibile.
    const t = calm ? 2.5 : time;
    const c = this.ctx, layout = menuLayoutFor(view.width, view.height);
    c.save();
    c.imageSmoothingEnabled = false;
    c.fillStyle = COLORS.void;
    c.fillRect(0, 0, view.width, view.height);
    c.translate(-view.x, -view.y);
    const floor = sheetImage(MENU_FLOOR_URL);
    if (floor !== null) c.drawImage(floor, 0, 0);

    const modules = [...MENU_MODULES].sort((a, b) => layout[a.id].y + a.base - (layout[b.id].y + b.base));
    let heroDrawn = appearance === null;
    for (const module of modules) {
      const at = layout[module.id];
      // Il personaggio sta davanti a cio' che tocca terra piu' in alto di lui.
      if (!heroDrawn && at.y + module.base > layout.hero.y) {
        this.drawHero(c, appearance!, t, layout.hero);
        heroDrawn = true;
      }
      const image = sheetImage(module.url);
      if (image !== null) c.drawImage(image, at.x, at.y);
      if (module.id === 'cathedral') this.drawPortal(c, at.x, at.y, t);
      for (const [index, light] of module.flames.entries()) flame(c, at.x + light.x, at.y + light.y, light.size, t, at.x + index * 3);
    }
    if (!heroDrawn) this.drawHero(c, appearance!, t, layout.hero);
    this.drawSmokeAndEmbers(c, t, layout.forge.x + CHIMNEY.x, layout.forge.y + CHIMNEY.y, layout.cathedral.x + PORTAL_MOUTH.x, layout.cathedral.y + 130);
    this.drawLights(c, t, layout);
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

  private drawHero(c: CanvasRenderingContext2D, appearance: CharacterAppearance, t: number, at: { readonly x: number; readonly y: number }): void {
    c.globalCompositeOperation = 'lighter';
    glow(c, COLORS.amber0, at.x, at.y - 12, 40, 0.5);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    for (const [width, y] of [[14, 10], [22, 11], [14, 12]] as const) rect(c, COLORS.void, at.x - width / 2, at.y + y, width, 1);
    drawGameCharacter(c, appearance, at.x, at.y, t, false, -1);
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

  private drawLights(c: CanvasRenderingContext2D, t: number, layout: ReturnType<typeof menuLayoutFor>): void {
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
