import { Camera } from '../../../core/camera';
import { Vec2 } from '../../../core/vec2';
import type { ArenaThemeId, Bridge, Solid } from '../../arena/arena';
import { drawBridge, drawChasmBed } from '../draw-hazards';
import { FEEDBACK } from '../effects';
import { drawTile, tileAt, tileSheet, tileVariants, TILE_SIZE } from '../themes/tiles';
import type { TileMaterial } from '../themes/tile-atlas';
import type { IsoArtFrame } from './iso-theme';
import { canvasBlitter, shearOntoWall, wallPieceBounds } from './iso-shear';
import { permutedRect } from './iso-scenery';
import { behindRect, stampFromScene, type IsoOccluder } from './occluders';

/*
 * Pozzi, ponti, massicci e ripari in isometria. Pozzi e ponti sono piatti: dipinti dall'alto con gli stessi fogli e
 * disposti a rombo, il loro bordo coincide al pixel con il rettangolo di gioco. Massicci e ripari sono scatole sul loro
 * ingombro proiettato: cima alzata e due facce verso chi guarda (sud e est), poi tornano davanti a chi passa loro dietro.
 */

/** Altezze provvisorie (pixel della vista): i massicci come la faccia dall'alto, i ripari bassi. */
export const ISO_BOXES = { blockFace: 26, coverFace: 18 } as const;

interface Placed {
  readonly canvas: HTMLCanvasElement;
  readonly left: number;
  readonly top: number;
}

function canvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, width);
  c.height = Math.max(1, height);
  c.getContext('2d')!.imageSmoothingEnabled = false;
  return c;
}

function paintSurface(ctx: CanvasRenderingContext2D, theme: ArenaThemeId, material: TileMaterial, x0: number, y0: number, w: number, h: number): void {
  const sheet = tileSheet(theme);
  if (sheet === null) return;
  ctx.save();
  // Ritaglio rettangolare allineato ai pixel: nessun bordo sfumato.
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  for (let y = Math.floor(y0 / TILE_SIZE) * TILE_SIZE; y < y0 + h; y += TILE_SIZE) {
    for (let x = Math.floor(x0 / TILE_SIZE) * TILE_SIZE; x < x0 + w; x += TILE_SIZE) {
      const tile = tileAt(theme, material, x, y, 0);
      if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
    }
  }
  ctx.restore();
}

function inView(frame: IsoArtFrame, placed: Placed): boolean {
  const { camera } = frame;
  return placed.left < camera.position.x + camera.width && placed.left + placed.canvas.width > camera.position.x
    && placed.top < camera.position.y + camera.height && placed.top + placed.canvas.height > camera.position.y;
}

// --- Pozzi e ponti ---------------------------------------------------------------------------------------------------

const pits = new WeakMap<Solid, { readonly key: string; readonly placed: Placed }>();
const decks = new WeakMap<Bridge, { readonly key: string; readonly placed: Placed }>();

/**
 * Un pozzo disposto a rombo. In isometria si vedono le pareti interne dei due lati lontani (in alto a destra e a sinistra):
 * il lato sinistro riceve lo stesso pezzo d'orlo del lato in alto, ruotato di un quarto di giro (esatto per la pixel art).
 */
function pit(theme: ArenaThemeId, rect: Solid): Placed {
  const key = `${theme}|${tileSheet(theme) === null ? '' : 'tile'}`;
  const known = pits.get(rect);
  if (known !== undefined && known.key === key) return known.placed;
  const placed = permutedRect((ctx) => {
    drawChasmBed(ctx, rect, theme, rect);
    const sheet = tileSheet(theme);
    const rim = tileVariants(theme, 'chasm');
    if (sheet !== null && rim.length === 9) {
      const top = rim[1]!;
      const rows = Math.max(2, Math.ceil(rect.height / TILE_SIZE));
      for (let j = 1; j < rows - 1; j++) {
        const y = rect.y + j * TILE_SIZE;
        ctx.save();
        // Il bordo alto del pezzo diventa il bordo sinistro: rotazione di -90 gradi attorno all'angolo della cella.
        ctx.translate(rect.x, y + TILE_SIZE);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(sheet, top.x, top.y, top.w, top.h, 0, 0, TILE_SIZE, TILE_SIZE);
        ctx.restore();
      }
    }
  }, rect.x, rect.y, rect.width, rect.height);
  pits.set(rect, { key, placed });
  return placed;
}

/** Un ponte disposto a rombo: assi, ringhiere e pali restano piatti, come dall'alto. */
function deck(theme: ArenaThemeId, bridge: Bridge): Placed {
  const key = `${theme}|${tileSheet(theme) === null ? '' : 'tile'}`;
  const known = decks.get(bridge);
  if (known !== undefined && known.key === key) return known.placed;
  // Le assi sporgono di 8 sulle rive, le ringhiere di 2 ai lati e l'ombra cade fino a 8 sotto.
  const pad = 12;
  const x0 = bridge.x - pad, y0 = bridge.y - pad, w = bridge.width + pad * 2, h = bridge.height + pad * 2;
  const placed = permutedRect((ctx) => {
    const view = new Camera();
    view.setViewSize(w, h);
    view.position = new Vec2(x0, y0);
    drawBridge(ctx, bridge, theme, view);
  }, x0, y0, w, h);
  decks.set(bridge, { key, placed });
  return placed;
}

/** Pozzi e ponti della mappa (dopo macchie e sangue, come dall'alto). */
export function drawIsoHazards(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId): void {
  if (typeof document === 'undefined') return;
  for (const chasm of frame.arena.chasms ?? []) {
    const placed = pit(theme, chasm);
    if (inView(frame, placed)) ctx.drawImage(placed.canvas, placed.left, placed.top);
  }
  for (const bridge of frame.arena.bridges ?? []) {
    const placed = deck(theme, bridge);
    if (inView(frame, placed)) ctx.drawImage(placed.canvas, placed.left, placed.top);
  }
}

// --- Massicci e ripari -----------------------------------------------------------------------------------------------

/** L'aspetto di una scatola: materiali di cima e facce, altezza, scurimento (danno) e filo chiaro della cima. */
interface BoxLook {
  readonly cap: TileMaterial;
  readonly face: TileMaterial;
  readonly height: number;
  readonly darken: number;
  readonly edge: string;
}

/**
 * Una scatola sull'ingombro proiettato del rettangolo: faccia est (in basso a destra, piu' scura), faccia sud (in basso
 * a sinistra) e cima alzata dell'altezza della faccia. La base delle facce sta sul bordo davanti dell'ingombro.
 */
export function boxArt(theme: ArenaThemeId, rect: Solid, look: BoxLook): Placed {
  const { x, y, width: w, height: h } = rect;
  const x1 = x + w, y1 = y + h;
  const fh = look.height;
  const shade = (ctx: CanvasRenderingContext2D, color: string, alpha: number, cw: number, ch: number): void => {
    if (alpha <= 0) return;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  // Le facce: un disegno frontale lungo il lato, alto `fh`, appoggiato alla linea del lato come un muro.
  const face = (length: number, darker: number): HTMLCanvasElement => {
    const c = canvas(length, fh);
    const ctx = c.getContext('2d')!;
    const sheet = tileSheet(theme);
    if (sheet !== null) {
      for (let fx = 0; fx < length; fx += TILE_SIZE) {
        const tile = tileAt(theme, look.face, fx, 0, 0);
        if (tile !== undefined) drawTile(ctx, sheet, tile, fx, 0);
      }
    } else {
      ctx.fillStyle = '#353946';
      ctx.fillRect(0, 0, length, fh);
    }
    shade(ctx, '#000000', darker, length, fh);
    ctx.fillStyle = '#23262e';
    ctx.fillRect(0, fh - 1, length, 1);
    return c;
  };
  const south = face(w, 0.15 + look.darken);
  const east = face(h, 0.4 + look.darken);
  const southBounds = wallPieceBounds('ne', y1, x - y1, w, fh);
  const eastBounds = wallPieceBounds('nw', x1, x1 - (y1 - 1), h, fh);
  const cap = permutedRect((ctx) => {
    paintSurface(ctx, theme, look.cap, x, y, w, h);
    if (tileSheet(theme) === null) {
      ctx.fillStyle = '#3a3e4a';
      ctx.fillRect(x, y, w, h);
    }
    if (look.darken > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${look.darken})`;
      ctx.fillRect(x, y, w, h);
    }
    // Filo chiaro sui lati lontani della cima, scuro su quelli vicini.
    ctx.fillStyle = look.edge;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = '#23262e';
    ctx.fillRect(x, y1 - 1, w, 1);
    ctx.fillRect(x1 - 1, y, 1, h);
  }, x, y, w, h);
  const left = Math.min(cap.left, x - y1, x1 - (y1 - 1));
  const top = Math.min(cap.top - fh, southBounds.top, eastBounds.top);
  const right = Math.max(cap.left + cap.canvas.width, x - y1 + w, x1 - (y1 - 1) + h);
  const bottom = Math.max(cap.top - fh + cap.canvas.height, southBounds.top + southBounds.height, eastBounds.top + eastBounds.height);
  const out = canvas(right - left, bottom - top);
  const ctx = out.getContext('2d')!;
  shearOntoWall(canvasBlitter(ctx), east, 0, 0, h, fh, 'nw', x1, x1 - (y1 - 1), 0, left, top);
  shearOntoWall(canvasBlitter(ctx), south, 0, 0, w, fh, 'ne', y1, x - y1, 0, left, top);
  ctx.drawImage(cap.canvas, cap.left - left, cap.top - fh - top);
  return { canvas: out, left, top };
}

const boxes = new WeakMap<Solid, { readonly key: string; readonly placed: Placed; readonly white: HTMLCanvasElement | null }>();

/** La stessa sagoma tutta bianca (il lampo di un riparo colpito). */
function whiteOf(source: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvas(source.width, source.height);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#fff6e0';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * I massicci e i ripari ancora in piedi come scatole, nella scena illuminata. I ripari scuriscono sotto un terzo della vita
 * e lampeggiano quando sono colpiti. Restituisce le sagome per la profondita'.
 */
export function drawIsoBlocks(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId): IsoOccluder[] {
  if (typeof document === 'undefined') return [];
  const occluders: IsoOccluder[] = [];
  const ready = tileSheet(theme) === null ? '' : 'tile';
  for (const solid of frame.arena.solids ?? []) {
    const cover = solid.cover;
    let damage = 0;
    if (cover !== undefined) {
      const state = frame.covers[cover];
      const left = state === undefined ? 1 : state.health / state.maxHealth;
      damage = left < 1 / 3 ? 2 : left < 2 / 3 ? 1 : 0;
    }
    const key = `${theme}|${ready}|${cover === undefined ? 'block' : 'cover'}|${damage}`;
    let entry = boxes.get(solid);
    if (entry === undefined || entry.key !== key) {
      const look: BoxLook = cover === undefined
        ? { cap: 'cap', face: 'wall', height: Math.min(ISO_BOXES.blockFace, Math.round(solid.height * 0.3)), darken: 0, edge: '#5c6272' }
        : { cap: 'bridgeEW', face: 'bridgeNS', height: ISO_BOXES.coverFace, darken: damage * 0.14, edge: '#664c32' };
      const placed = boxArt(theme, solid, look);
      entry = { key, placed, white: cover === undefined ? null : whiteOf(placed.canvas) };
      boxes.set(solid, entry);
    }
    const { placed, white } = entry;
    if (!inView(frame, placed)) continue;
    const flash = cover === undefined ? 0 : frame.coverFlashes.get(cover) ?? 0;
    const shake = flash > 0 ? Math.round(Math.sin(flash * 90) * 2) : 0;
    ctx.drawImage(placed.canvas, placed.left + shake, placed.top);
    if (flash > 0 && white !== null) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, flash / FEEDBACK.hitFlash) * 0.3;
      ctx.drawImage(white, placed.left + shake, placed.top);
      ctx.restore();
    }
    occluders.push({
      box: { x: placed.left, y: placed.top, width: placed.canvas.width, height: placed.canvas.height },
      isBehind: behindRect(solid.x + solid.width, solid.y + solid.height),
      stamp: () => stampFromScene(ctx, placed.canvas, placed.left, placed.top, placed.canvas.width, placed.canvas.height),
    });
  }
  return occluders;
}
