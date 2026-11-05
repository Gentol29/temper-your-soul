import type { Camera } from '../../../core/camera';
import type { ArenaDefinition, ArenaThemeId, Pillar } from '../../arena/arena';
import { preloadSheets, sheetImage } from '../boss-art/sheet-images';
import { drawLight } from '../lights';
import { SCENERY_ATLASES, type SceneryPiece } from './scenery-atlas';
import { classicTilesRequested, drawTile, tileAt, tileSheet, TILE_SIZE } from './tiles';

/*
 * Le scenografie dei dungeon, a un pixel per unita' di mondo come personaggio, boss e mob: facciate gotiche del muro in
 * alto, colonne e statue al posto dei pilastri, arredi a terra. Fogli preparati da `tools/arte/prepara_scenari.py`. Solo
 * aspetto: gli ingombri restano quelli di `ArenaDefinition`. Finche' i fogli non sono caricati (o con `?tile=classici`, o
 * senza DOM) ogni funzione risponde falso e i temi disegnano come prima, nel codice.
 */

/** Comincia a caricare i fogli (all'avvio, con quelli dei tile). */
export function preloadScenery(): void {
  if (!classicTilesRequested) preloadSheets(Object.values(SCENERY_ATLASES).map((atlas) => atlas.url));
}

function sheetOf(theme: ArenaThemeId): HTMLImageElement | null {
  return classicTilesRequested ? null : sheetImage(SCENERY_ATLASES[theme].url);
}

/** Il foglio delle scenografie del tema, se e' pronto (per la vista isometrica). */
export function scenerySheet(theme: ArenaThemeId): HTMLImageElement | null {
  return sheetOf(theme);
}

/** I pezzi di un ruolo del foglio del tema (facciate, lesene, pilastri...). */
export function sceneryPieces(theme: ArenaThemeId, role: string): readonly SceneryPiece[] {
  return piecesOf(theme, role);
}

/** Valore pseudocasuale stabile in [0, 1), lo stesso delle scenografie dall'alto. */
export function sceneryNoise(x: number, y: number, salt = 0): number {
  return noise(x, y, salt);
}

/** Un elemento di una lista scelto da un valore in [0, 1). */
export function sceneryPick<T>(list: readonly T[], h: number): T | undefined {
  return pick(list, h);
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

/** Un'ellisse a righe intere: un'ombra a terra senza bordi sfumati. */
export function pixelEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  const top = Math.round(cy - ry);
  for (let row = 0; row < ry * 2; row += 2) {
    const t = (row + 1 - ry) / ry;
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    if (half > 0) ctx.fillRect(Math.round(cx - half), top + row, half * 2, 2);
  }
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

/**
 * Il muro in alto come una facciata: moduli gotici appoggiati a `base` (dove arrivano i piedi di chi si avvicina), lesene
 * sui giunti e, sopra, la stessa pietra che sale nel buio. La camera non ha limiti, quindi la facciata puo' salire oltre
 * il bordo della stanza: l'ingombro di gioco resta quello di prima. Falso se i fogli non ci sono.
 */
export function drawFacade(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId, base: number, edge: WallEdge): boolean {
  const sheet = sheetOf(theme);
  const modules = piecesOf(theme, 'facade');
  if (sheet === null || tileSheet(theme) === null || modules.length === 0) return false;
  drawWallBands(ctx, arena, camera, theme, base, edge);
  const { x: camX, y: camY } = camera.position;
  if (camY > base + 40) return true;
  const width = modules[0]!.w;
  const tallest = Math.max(...modules.map((module) => module.h));
  const roof = base - tallest;
  // Sopra le facciate: pietra che sale e si spegne a bande.
  if (camY < roof) {
    fillSurface(ctx, theme, 'wall', 0, roof - 96, arena.width, 96);
    for (const [offset, alpha] of [[0, '50'], [24, '90'], [48, 'c8'], [72, 'f0']] as const) {
      ctx.fillStyle = `#050408${alpha}`;
      ctx.fillRect(0, roof - offset - 24, arena.width, 24);
    }
  }
  // Oltre i bordi della stanza c'e' solo il buio dei muri.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, roof - 96, arena.width, base - roof + 96);
  ctx.clip();
  const first = Math.max(0, Math.floor(camX / width) - 1);
  const last = Math.min(Math.ceil(arena.width / width), Math.ceil((camX + camera.width) / width) + 1);
  const pilasters = piecesOf(theme, 'pilaster');
  const hangs = piecesOf(theme, 'hang');
  for (let k = first; k < last; k++) {
    const module = pick(modules, noise(k, 3, arena.width));
    if (module !== undefined) put(ctx, sheet, module, k * width, base - module.h);
  }
  for (let k = first; k <= last; k++) {
    const h = noise(k, 11, arena.width);
    if (h < 0.42 && hangs.length > 0) {
      const hang = pick(hangs, h / 0.42);
      if (hang !== undefined) put(ctx, sheet, hang, k * width + width * (0.3 + noise(k, 13) * 0.4) - hang.w / 2, base - hang.h - 4);
    }
    const pilaster = pick(pilasters, noise(k, 7));
    if (pilaster !== undefined) put(ctx, sheet, pilaster, k * width - pilaster.w / 2, base - pilaster.h);
  }
  ctx.restore();
  // Base della facciata e ombra corta sul pavimento.
  ctx.fillStyle = edge.dark;
  ctx.fillRect(0, base - 2, arena.width, 2);
  for (const [offset, alpha] of [[0, '60'], [5, '38'], [10, '1c']] as const) {
    ctx.fillStyle = `#000000${alpha}`;
    ctx.fillRect(arena.wallThickness, base + offset, arena.width - arena.wallThickness * 2, 5);
  }
  return true;
}

/** Quanto sono fitti gli arredi a terra, per tema (quota delle celle che ne hanno uno). */
const SCATTER_DENSITY: Readonly<Record<ArenaThemeId, number>> = { crypt: 0.42, swamp: 0.5, forge: 0.46, glacier: 0.44 };
const SCATTER_CELL = 168;

/**
 * Gli arredi a terra nel rettangolo del mondo visibile (dall'alto e' la vista stessa; in isometria il rettangolo che la
 * contiene): pezzo, centro della base e valore stabile.
 */
export function forScatter(arena: ArenaDefinition, camera: Camera, theme: ArenaThemeId, margin: number, visit: (piece: SceneryPiece, x: number, y: number, h: number) => void): void {
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

/** Un pezzo della scenografia posato per un pilastro. */
interface PlacedPiece {
  readonly piece: SceneryPiece;
  readonly left: number;
  readonly top: number;
  readonly floor: number;
  /** Chi sta sopra questa riga passa dietro al pezzo. */
  readonly baseline: number;
}

const placedPieces = new WeakMap<Pillar, readonly PlacedPiece[]>();

/**
 * I pezzi di un pilastro, fissi dalla posizione. Devono coprire il cerchio di collisione, o figure e colpi si fermerebbero
 * nel vuoto: si sceglie un pezzo della larghezza giusta, e per i cerchi piu' larghi di qualunque pezzo un gruppo.
 */
function pillarPieces(theme: ArenaThemeId, pillar: Pillar): readonly PlacedPiece[] {
  const known = placedPieces.get(pillar);
  if (known !== undefined) return known;
  const all = ['pillarS', 'pillarM', 'pillarL'].flatMap((role) => piecesOf(theme, role));
  if (all.length === 0) return [];
  const { x, y } = pillar.position;
  const r = pillar.radius;
  const sag = Math.round(r * 0.68);
  const placed: PlacedPiece[] = [];
  const place = (piece: SceneryPiece, cx: number, floor: number): void => {
    placed.push({ piece, left: Math.round(cx - piece.w / 2), top: floor - piece.h, floor, baseline: floor - sag });
  };
  const byWidth = [...all].sort((a, b) => a.w - b.w);
  const fits = all.filter((piece) => piece.w >= r * 1.6 && piece.w <= r * 2.8);
  if (fits.length > 0) {
    place(pick(fits, noise(x, y, 5))!, x, Math.round(y + sag));
  } else if (byWidth[0]!.w > r * 2.8) {
    place(byWidth[0]!, x, Math.round(y + sag));
  } else {
    // Piu' largo di tutti i pezzi: un gruppo, dietro e davanti, dai piu' larghi.
    const widest = byWidth.slice(-3);
    const width = widest[0]!.w;
    const rows: readonly (readonly [number, number])[] = r > 80 ? [[-0.25, 0.7], [sag / r, 1]] : [[sag / r, 1]];
    let index = 0;
    for (const [row, span] of rows) {
      const across = r * 2 * span;
      const count = Math.max(2, Math.ceil(across / (width * 0.8)));
      for (let k = 0; k < count; k++) {
        const piece = widest[(index + Math.floor(noise(x, y, 6) * widest.length)) % widest.length]!;
        const cx = x + (count === 1 ? 0 : (k / (count - 1) - 0.5) * (across - piece.w));
        const edge = Math.abs(cx - x) / r;
        place(piece, cx, Math.round(y + r * row * Math.sqrt(Math.max(0.2, 1 - edge * edge))));
        index++;
      }
    }
    placed.sort((a, b) => a.floor - b.floor);
  }
  placedPieces.set(pillar, placed);
  return placed;
}

/** Un pilastro come oggetto della scenografia, con la sua ombra e la sua luce. Falso se i fogli non ci sono. */
export function drawScenicPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, theme: ArenaThemeId, clock: number): boolean {
  const sheet = sheetOf(theme);
  const pieces = sheet === null ? [] : pillarPieces(theme, pillar);
  if (sheet === null || pieces.length === 0) return false;
  const reach = pillar.radius + Math.max(...pieces.map(({ piece }) => Math.max(piece.w, piece.h))) + 20;
  if (!camera.isVisible(pillar.position, reach)) return true;
  pixelEllipse(ctx, pillar.position.x + 5, pillar.position.y + pillar.radius * 0.62, pillar.radius * 1.15, Math.max(5, pillar.radius * 0.42), '#04040870');
  for (const { piece, left, top } of pieces) {
    put(ctx, sheet, piece, left, top);
    const light = piece.light;
    if (light !== undefined) {
      const pulse = Math.sin(clock * 2 + left);
      drawLight(ctx, left + light.x, top + light.y, light.color, light.radius + pulse * 5, light.intensity * (0.85 + pulse * 0.15));
    }
  }
  return true;
}

/** Rimette i pilastri sopra macchie e tracce dello scontro: il sangue sta a terra, non sul fusto di una colonna. */
export function drawPillarsOverDecals(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const sheet = sheetOf(arena.theme);
  if (sheet === null) return;
  for (const pillar of arena.pillars) {
    const pieces = pillarPieces(arena.theme, pillar);
    if (pieces.length === 0) continue;
    if (!camera.isVisible(pillar.position, pillar.radius + 160)) continue;
    for (const { piece, left, top } of pieces) put(ctx, sheet, piece, left, top);
  }
}

/** La parte alta di un pezzo che deve stare davanti a chi gli passa dietro. */
export interface PillarTop {
  readonly piece: SceneryPiece;
  readonly x: number;
  readonly left: number;
  readonly top: number;
  readonly height: number;
  /** Si ordina con le figure su questa riga: chi sta piu' in basso resta davanti. */
  readonly y: number;
}

/**
 * Le colonne sono alte e le figure si disegnano dopo l'ambiente: chi passa dietro una colonna ci finirebbe sopra. Qui si
 * cercano i pezzi che hanno davvero qualcuno dietro.
 */
export function pillarTopsBehind(arena: ArenaDefinition, camera: Camera, figures: readonly { readonly x: number; readonly y: number }[]): readonly PillarTop[] {
  if (sheetOf(arena.theme) === null) return [];
  const tops: PillarTop[] = [];
  for (const pillar of arena.pillars) {
    if (!camera.isVisible(pillar.position, pillar.radius + 200)) continue;
    for (const { piece, left, top, baseline } of pillarPieces(arena.theme, pillar)) {
      if (baseline <= top) continue;
      const cx = left + piece.w / 2;
      if (figures.some((figure) => figure.y < baseline && figure.y > top - 24 && Math.abs(figure.x - cx) < piece.w / 2 + 26)) {
        tops.push({ piece, x: cx, left, top, height: Math.min(piece.h, baseline - top), y: baseline });
      }
    }
  }
  return tops;
}

let scene: HTMLCanvasElement | null = null;
let stencil: HTMLCanvasElement | null = null;

/** Copia la scena illuminata prima di disegnare le figure: le colonne tornano davanti con la loro luce vera. */
export function rememberScene(ctx: CanvasRenderingContext2D): void {
  const source = ctx.canvas;
  scene ??= document.createElement('canvas');
  if (scene.width !== source.width || scene.height !== source.height) {
    scene.width = source.width;
    scene.height = source.height;
  }
  scene.getContext('2d')!.drawImage(source, 0, 0);
}

/**
 * Rimette sopra le figure i pixel di un pezzo, presi dalla copia della scena e ritagliati sulla sagoma. Un poco
 * trasparente: chi sta dietro si intravede, un nemico non deve sparire del tutto.
 */
export function drawPillarTop(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, top: PillarTop): void {
  const sheet = sheetOf(arena.theme);
  if (sheet === null || scene === null) return;
  const view = ctx.getTransform();
  stencil ??= document.createElement('canvas');
  const { piece, left, height } = top;
  if (stencil.width < piece.w || stencil.height < height) {
    stencil.width = Math.max(stencil.width, piece.w);
    stencil.height = Math.max(stencil.height, height);
  }
  const paint = stencil.getContext('2d')!;
  paint.globalCompositeOperation = 'source-over';
  paint.clearRect(0, 0, stencil.width, stencil.height);
  paint.drawImage(sheet, piece.x, piece.y, piece.w, height, 0, 0, piece.w, height);
  paint.globalCompositeOperation = 'source-in';
  paint.drawImage(scene, left + view.e, top.top + view.f, piece.w, height, 0, 0, piece.w, height);
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.drawImage(stencil, 0, 0, piece.w, height, left, top.top, piece.w, height);
  ctx.restore();
}

/** Il portale gotico di una porta, se i fogli ci sono: il foglio e il pezzo. */
export function gateFrame(theme: ArenaThemeId): { readonly sheet: HTMLImageElement; readonly piece: SceneryPiece } | null {
  const sheet = sheetOf(theme);
  const piece = piecesOf(theme, 'gate')[0];
  return sheet === null || piece === undefined ? null : { sheet, piece };
}

/** Un pezzo qualsiasi del tema, appoggiato con il centro della base in (`x`, `y`). Falso se non c'e'. */
export function drawSceneryPiece(ctx: CanvasRenderingContext2D, theme: ArenaThemeId, role: string, h: number, x: number, y: number): boolean {
  const sheet = sheetOf(theme);
  const piece = sheet === null ? undefined : pick(piecesOf(theme, role), h);
  if (sheet === null || piece === undefined) return false;
  put(ctx, sheet, piece, x - piece.w / 2, y - piece.h);
  return true;
}
