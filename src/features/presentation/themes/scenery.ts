import type { Camera } from '../../../core/camera';
import type { ArenaDefinition, ArenaThemeId } from '../../arena/arena';
import { preloadSheets, sheetImage } from '../boss-art/sheet-images';
import { drawLight } from '../lights';
import { SCENERY_ATLASES, type SceneryPiece } from './scenery-atlas';
import { drawTile, tileAt, tileSheet, TILE_SIZE } from './tiles';

/*
 * Le scenografie dei dungeon, a un pixel per unita' di mondo come personaggio, boss e mob: facciate gotiche del muro in
 * alto, colonne e statue al posto dei pilastri, arredi a terra. Fogli preparati con il generatore locale. Solo
 * aspetto: gli ingombri restano quelli di `ArenaDefinition`. Finche' i fogli non sono caricati (o senza DOM) ogni
 * funzione risponde falso e i temi disegnano nel codice.
 */

/** Comincia a caricare i fogli (all'avvio, con quelli dei tile). */
export function preloadScenery(): void {
  preloadSheets(Object.values(SCENERY_ATLASES).map((atlas) => atlas.url));
}

function sheetOf(theme: ArenaThemeId): HTMLImageElement | null {
  return sheetImage(SCENERY_ATLASES[theme].url);
}

/** Vero quando foglio delle scenografie e foglio dei tile del tema sono pronti. */
export function sceneryReady(theme: ArenaThemeId): boolean {
  return sheetOf(theme) !== null && tileSheet(theme) !== null;
}

/** La versione dei tasselli del pavimento in cache: quando arrivano i fogli si ridipingono. */
export function floorVersion(theme: ArenaThemeId): string {
  return `${tileSheet(theme) === null ? '' : 'tile'}|${sheetOf(theme) === null ? '' : 'scene'}`;
}

function piecesOf(theme: ArenaThemeId, role: string): readonly SceneryPiece[] {
  return SCENERY_ATLASES[theme].pieces[role] ?? [];
}

/** Valore pseudocasuale stabile in [0, 1). */
function noise(x: number, y: number, salt = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function pick<T>(list: readonly T[], h: number): T | undefined {
  return list[Math.min(list.length - 1, Math.floor(h * list.length))];
}

function put(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, piece: SceneryPiece, x: number, y: number): void {
  ctx.drawImage(sheet, piece.x, piece.y, piece.w, piece.h, Math.round(x), Math.round(y), piece.w, piece.h);
}

const rings = new Map<string, HTMLCanvasElement>();

/** Un cerchio a pixel interi, senza sfumature: i cerchi runici e i segni a terra. */
export function drawPixelRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, thickness: number, color: string): void {
  const key = `${radius}|${thickness}|${color}`;
  let ring = rings.get(key);
  if (ring === undefined) {
    ring = document.createElement('canvas');
    const size = radius * 2 + 2;
    ring.width = ring.height = size;
    const paint = ring.getContext('2d')!;
    paint.fillStyle = color;
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const d = Math.hypot(x + 1 - size / 2, y + 1 - size / 2);
        if (d <= radius && d > radius - thickness) paint.fillRect(x, y, 2, 2);
      }
    }
    rings.set(key, ring);
  }
  ctx.drawImage(ring, Math.round(cx - ring.width / 2), Math.round(cy - ring.height / 2));
}

/** Colori del filo del muro: chiaro verso la stanza, scuro alla base. */
export interface WallEdge {
  readonly light: string;
  readonly dark: string;
}

/** Riempie un rettangolo con una superficie del tema, allineata al mondo. */
export function fillSurface(ctx: CanvasRenderingContext2D, theme: ArenaThemeId, material: 'cap' | 'wall', left: number, top: number, width: number, height: number): void {
  const sheet = tileSheet(theme);
  if (sheet === null || width <= 0 || height <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  for (let y = Math.floor(top / TILE_SIZE) * TILE_SIZE; y < top + height; y += TILE_SIZE) {
    for (let x = Math.floor(left / TILE_SIZE) * TILE_SIZE; x < left + width; x += TILE_SIZE) {
      const tile = tileAt(theme, material, x, y, 0);
      if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
    }
  }
  ctx.restore();
}

/** Muri laterali e in basso: pietra del tema con il filo verso la stanza, e fuori la stessa pietra che sparisce nel buio. */
function drawWallBands(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId, base: number, edge: WallEdge): void {
  const t = arena.wallThickness;
  const { x: camX, y: camY } = camera.position;
  const camR = camX + camera.width;
  const camB = camY + camera.height;
  const outer = 72;
  const bands: readonly (readonly [number, number, number, number])[] = [
    [-outer, base - 96, outer + t, arena.height - base + 96 + outer],
    [arena.width - t, base - 96, t + outer, arena.height - base + 96 + outer],
    [t, arena.height - t, arena.width - t * 2, t + outer],
  ];
  for (const [x, y, w, h] of bands) {
    if (x > camR || x + w < camX || y > camB || y + h < camY) continue;
    fillSurface(ctx, theme, 'cap', x, y, w, h);
  }
  // Il buio fuori dalla stanza: a bande, come tutte le ombre.
  for (const [offset, alpha] of [[0, '66'], [24, 'a0'], [48, 'd8']] as const) {
    ctx.fillStyle = `#050408${alpha}`;
    if (camX < 0) ctx.fillRect(-outer, base - 96, outer - offset, arena.height - base + 96 + outer);
    if (camR > arena.width) ctx.fillRect(arena.width + offset, base - 96, outer - offset, arena.height - base + 96 + outer);
    if (camB > arena.height) ctx.fillRect(-outer, arena.height + offset, arena.width + outer * 2, outer - offset);
  }
  // Il filo verso la stanza.
  ctx.fillStyle = edge.light;
  ctx.fillRect(t - 2, base, 2, arena.height - t - base);
  ctx.fillRect(arena.width - t, base, 2, arena.height - t - base);
  ctx.fillRect(t, arena.height - t, arena.width - t * 2, 2);
  ctx.fillStyle = edge.dark;
  ctx.fillRect(t, base, 2, arena.height - t - base);
  ctx.fillRect(arena.width - t - 2, base, 2, arena.height - t - base);
  ctx.fillRect(t, arena.height - t - 2, arena.width - t * 2, 2);
}

/** Fasce di pietra viste dall'alto sui quattro lati della stanza. */
export function drawWallCaps(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId, base: number, edge: WallEdge): boolean {
  if (tileSheet(theme) === null) return false;
  drawWallBands(ctx, arena, camera, theme, base, edge);
  const left = Math.max(0, Math.floor(camera.position.x) - 4);
  const right = Math.min(arena.width, Math.ceil(camera.position.x + camera.width) + 4);
  if (camera.position.y > base + 4 || right <= left) return true;
  fillSurface(ctx, theme, 'cap', left, 0, right - left, base);
  ctx.fillStyle = edge.light;
  ctx.fillRect(left, base - 3, right - left, 1);
  ctx.fillStyle = edge.dark;
  ctx.fillRect(left, base - 2, right - left, 2);
  return true;
}

/** Quanto sono fitti gli arredi a terra, per tema (quota delle celle che ne hanno uno). */
const SCATTER_DENSITY: Readonly<Record<ArenaThemeId, number>> = { crypt: 0.42, swamp: 0.5, forge: 0.46, glacier: 0.44 };
const SCATTER_CELL = 168;

/**
 * Gli arredi a terra nel rettangolo di mondo visibile: pezzo, centro della base e valore stabile.
 */
function forScatter(arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId, margin: number, visit: (piece: SceneryPiece, x: number, y: number, h: number) => void): void {
  const list = piecesOf(theme, 'scatter');
  if (list.length === 0) return;
  const bounds = camera.worldBounds();
  const density = SCATTER_DENSITY[theme];
  const x0 = Math.floor((bounds.x0 - margin) / SCATTER_CELL);
  const x1 = Math.ceil((bounds.x1 + margin) / SCATTER_CELL);
  const y0 = Math.floor((bounds.y0 - margin) / SCATTER_CELL);
  const y1 = Math.ceil((bounds.y1 + margin) / SCATTER_CELL);
  const inset = arena.wallThickness + 24;
  for (let gy = y0; gy < y1; gy++) {
    for (let gx = x0; gx < x1; gx++) {
      const h = noise(gx, gy, 1);
      if (h >= density) continue;
      const piece = pick(list, h / density);
      if (piece === undefined) continue;
      // Sta tutto dentro la stanza, lontano dalla base della facciata.
      const x = gx * SCATTER_CELL + noise(gx, gy, 2) * SCATTER_CELL;
      const y = gy * SCATTER_CELL + noise(gx, gy, 3) * SCATTER_CELL;
      if (x - piece.w / 2 < inset || x + piece.w / 2 > arena.width - inset) continue;
      if (y - piece.h < inset + 40 || y > arena.height - inset) continue;
      visit(piece, x, y, h);
    }
  }
}

/** Gli arredi a terra, dipinti una volta nei tasselli del pavimento: rompono la ripetizione delle superfici. */
export function drawFloorScenery(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId): void {
  const sheet = sheetOf(theme);
  if (sheet === null) return;
  forScatter(arena, camera, theme, 160, (piece, x, y) => put(ctx, sheet, piece, x - piece.w / 2, y - piece.h));
}

/** Le luci degli arredi a terra (candele, funghi, braci): si raccolgono a ogni fotogramma. */
export function drawFloorSceneryLights(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId, clock: number): void {
  if (sheetOf(theme) === null) return;
  forScatter(arena, camera, theme, 120, (piece, x, y, h) => {
    const light = piece.light;
    if (light === undefined) return;
    const pulse = Math.sin(clock * (1.6 + h * 3) + x * 0.02);
    drawLight(ctx, x - piece.w / 2 + light.x, y - piece.h + light.y, light.color, light.radius + pulse * 4, light.intensity * (0.85 + pulse * 0.15));
  });
}

/** Un pezzo qualsiasi del tema, appoggiato con il centro della base in (`x`, `y`). Falso se non c'e'. */
export function drawSceneryPiece(ctx: CanvasRenderingContext2D, theme: ArenaThemeId, role: string, h: number, x: number, y: number): boolean {
  const sheet = sheetOf(theme);
  const piece = sheet === null ? undefined : pick(piecesOf(theme, role), h);
  if (sheet === null || piece === undefined) return false;
  put(ctx, sheet, piece, x - piece.w / 2, y - piece.h);
  return true;
}
