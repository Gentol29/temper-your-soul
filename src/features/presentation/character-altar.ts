import type { CharacterAppearance } from '../character/appearance';
import type { CharacterClass } from '../character/character-class';
import { sheetImage } from './boss-art/sheet-images';
import { drawGameCharacter } from './game-character-preview';
import { drawPortalVortex } from './hub-portal';
import { MENU_FLOOR_URL, MENU_MODULES, menuLayoutFor } from './menu-layout';

/*
 * La soglia della pagina Personaggi: lo stesso portale del rifugio, inquadrato da vicino, con il personaggio sui gradini.
 * Tutto alla stessa densita' di pixel del mondo: l'ingrandimento lo fa il CSS, sempre per un intero.
 */

/** Quanto mondo si vede. */
export const ALTAR = { width: 130, height: 150 } as const;
/** La bocca del portale nello sprite della cattedrale (gli stessi punti di `menu-scene.ts`). */
const MOUTH = { points: [[113, 134], [113, 90], [120, 80], [137, 66], [154, 80], [161, 90], [161, 134]], x: 137, y: 150 } as const;
/** Dove comincia l'inquadratura nello sprite: il portale resta al centro. */
export const altarCrop = { x: MOUTH.x - ALTAR.width / 2, y: 14 } as const;
const HERO = { x: ALTAR.width / 2, y: 118 } as const;
/** Quanto dura il lampo quando si cambia classe o sesso, in secondi. */
const FLASH_SECONDS = 0.55;

const INK = '#08070a';

/** Il colore che accompagna ogni classe: rame, salvia, azzurro elementale. Solo aspetto. */
export const CLASS_ACCENTS: Readonly<Record<CharacterClass, string>> = { warrior: '#dba777', archer: '#a3b97f', mage: '#8fb0e6' };

const hash = (x: number): number => {
  const n = Math.imul(x + 311, 374761393);
  return ((n ^ (n >>> 13)) >>> 0) % 1000;
};

function rect(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Alone a tre fasce piene, da disegnare in somma: anche la luce resta pixel art. */
function glow(c: CanvasRenderingContext2D, color: string, x: number, y: number, radius: number, alpha: number): void {
  c.fillStyle = color;
  for (const [reach, share] of [[1, 0.1], [0.68, 0.12], [0.38, 0.16]] as const) {
    c.globalAlpha = share * alpha;
    const size = Math.round(radius * reach);
    for (let row = -size; row <= size; row++) {
      const half = Math.round(Math.sqrt(size * size - row * row));
      c.fillRect(Math.round(x) - half, Math.round(y) + row, half * 2, 1);
    }
  }
  c.globalAlpha = 1;
}

function flame(c: CanvasRenderingContext2D, x: number, base: number, size: number, time: number, seed: number): void {
  const beat = Math.floor(time * 11 + seed) % 4, lean = beat === 1 ? 1 : beat === 3 ? -1 : 0, tall = size + (beat % 2);
  rect(c, '#a82a30', x - Math.floor(size / 2), base - Math.ceil(tall * 0.55), size, Math.ceil(tall * 0.55));
  rect(c, '#c8802e', x - Math.floor(size / 2) + lean, base - tall, Math.max(1, size - 1), Math.ceil(tall * 0.7));
  rect(c, '#ffd77a', x + lean - (size > 2 ? 1 : 0), base - Math.ceil(tall * 0.6), Math.max(1, size - 2), Math.ceil(tall * 0.45));
}

/** Il personaggio davanti al portale, animato finche' la pagina e' aperta. */
export class CharacterAltar {
  readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private time = 0;
  private flashAt = -10;

  constructor(private appearance: CharacterAppearance, private accent: string) {
    this.canvas.className = 'altar-scene';
    this.canvas.width = ALTAR.width;
    this.canvas.height = ALTAR.height;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Il personaggio con il suo equipaggiamento, davanti al portale');
    this.ctx = this.canvas.getContext('2d')!;
    const frame = (now: number) => {
      this.time = now / 1000;
      // A pagina nascosta non si disegna: la partita non paga per una scena che nessuno vede.
      if (this.canvas.offsetParent !== null) this.draw();
      // La pagina ridisegna spesso: un altare tolto dal documento smette da solo.
      if (this.canvas.isConnected) requestAnimationFrame(frame);
    };
    requestAnimationFrame((now) => { this.time = now / 1000; this.draw(); requestAnimationFrame(frame); });
  }

  /** Un nuovo aspetto: il lampo dice che la scelta ha avuto effetto. */
  show(appearance: CharacterAppearance, accent: string): void {
    this.appearance = appearance;
    this.accent = accent;
    this.flashAt = this.time;
  }

  private draw(): void {
    const c = this.ctx, t = this.calm ? 2.5 : this.time;
    const flash = this.calm ? 0 : Math.max(0, 1 - (this.time - this.flashAt) / FLASH_SECONDS);
    const cathedral = MENU_MODULES.find((module) => module.id === 'cathedral')!;
    const world = menuLayoutFor(16, 9).cathedral;
    c.save();
    c.imageSmoothingEnabled = false;
    c.fillStyle = INK;
    c.fillRect(0, 0, ALTAR.width, ALTAR.height);
    const floor = sheetImage(MENU_FLOOR_URL);
    if (floor !== null) c.drawImage(floor, -(world.x + altarCrop.x), -(world.y + altarCrop.y));
    const image = sheetImage(cathedral.url);
    if (image !== null) c.drawImage(image, -altarCrop.x, -altarCrop.y);
    this.drawPortal(c, t);
    for (const [index, light] of cathedral.flames.entries()) flame(c, light.x - altarCrop.x, light.y - altarCrop.y, light.size, t, index * 3);

    c.globalCompositeOperation = 'lighter';
    const pulse = Math.floor(t * 3) % 2;
    glow(c, '#a82a30', HERO.x, 70, 62, 0.55 + pulse * 0.06);
    glow(c, this.accent, HERO.x, HERO.y + 10, 30, 0.42 + flash * 0.5);
    c.globalCompositeOperation = 'source-over';

    for (const [width, y] of [[14, 13], [24, 14], [14, 15]] as const) rect(c, INK, HERO.x - width / 2, HERO.y + y, width, 1);
    drawGameCharacter(c, this.appearance, HERO.x, HERO.y, t, false, 1);
    this.drawEmbers(c, t, flash);
    if (flash > 0) {
      // Il lampo: una colonna di luce che sale dai gradini e si spegne a fasce.
      c.globalCompositeOperation = 'lighter';
      for (const [half, alpha] of [[18, 0.1], [10, 0.16], [4, 0.26]] as const) {
        c.globalAlpha = alpha * flash;
        rect(c, this.accent, HERO.x - half, 0, half * 2, HERO.y + 14);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    this.drawEdges(c);
    c.restore();
  }

  private drawPortal(c: CanvasRenderingContext2D, t: number): void {
    c.save();
    c.beginPath();
    MOUTH.points.forEach(([x, y], index) => {
      if (index === 0) c.moveTo(x - altarCrop.x, y - altarCrop.y);
      else c.lineTo(x - altarCrop.x, y - altarCrop.y);
    });
    c.closePath();
    c.clip();
    drawPortalVortex(c, MOUTH.x - altarCrop.x, MOUTH.y - altarCrop.y, t);
    c.restore();
  }

  private drawEmbers(c: CanvasRenderingContext2D, t: number, flash: number): void {
    for (let i = 0; i < 26; i++) {
      const speed = 0.08 + (hash(i) % 5) * 0.015 + flash * 0.25;
      const u = (t * speed + i * 0.137) % 1;
      const x = HERO.x + ((hash(i + 40) % 80) - 40) + Math.sin(u * 9 + i) * 5, y = 134 - u * 112;
      rect(c, u > 0.72 ? '#7a1a26' : i % 3 === 0 ? this.accent : i % 3 === 1 ? '#f0a93f' : '#d9423a', x, y, 1, 1);
    }
  }

  /** Bordi che affondano a fasce nette: la scena si stacca dalla cornice senza sfumature lisce. */
  private drawEdges(c: CanvasRenderingContext2D): void {
    c.fillStyle = INK;
    for (const [size, alpha] of [[12, 0.2], [8, 0.3], [4, 0.45]] as const) {
      c.globalAlpha = alpha;
      c.fillRect(0, 0, size, ALTAR.height);
      c.fillRect(ALTAR.width - size, 0, size, ALTAR.height);
      c.fillRect(0, 0, ALTAR.width, size);
      c.fillRect(0, ALTAR.height - size, ALTAR.width, size);
    }
    c.globalAlpha = 1;
  }
}
