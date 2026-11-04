import type { Camera } from '../../../core/camera';
import { TAU } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import { drawLight } from '../lights';
import { faceSpots } from './decor';
import type { ArenaTheme } from './theme';
import { drawBottomWallLip, drawTopWallFace, wallFaceHeight, type WallFaceStyle } from './wall';
import { FloorCache } from '../floor-cache';
import { drawFloorScenery, drawFloorSceneryLights, drawScenicPillar, floorVersion, sceneryReady } from './scenery';
import type { TileGrid } from './tile-atlas';
import { drawTile, pickVariant, tileColors, tileGrid, tileSheet, tileVariants, TILE_SIZE } from './tiles';

/*
 * La palude spenta: acque nere con isolotti di fango, canne, funghi che brillano, nebbia che deriva e alberi morti.
 * Solo aspetto. Il rumore e' deterministico (funzione di posizione), cosi' la mappa e' sempre uguale; `clock` anima
 * increspature, bagliori e nebbia. Si disegna solo cio' che e' nella vista.
 */

const SWAMP_DECOR = {
  /** Lato delle celle di acqua e fango. */
  cell: 48,
  /**
   * Chiazze di fango e acqua: un rumore interpolato su una griglia larga `patchCells` celle, piu' un tremolio per cella
   * (`edgeJitter`), cosi' i bordi sono irregolari e non quadrati. Sopra la soglia fango, appena sotto la riva bagnata.
   */
  patchCells: 4,
  mudThreshold: 0.58,
  shoreBand: 0.05,
  edgeJitter: 0.14,
  /** Passo della griglia dei funghi luminosi e della nebbia. */
  mushroomGrid: 170,
  fogGrid: 420,
  water: ['#0b1512', '#0e1a16', '#112019'],
  mud: ['#2a2b1b', '#25261a', '#30301e'],
  shore: ['#161e16', '#182219', '#1a251b'],
  wall: { base: '#1b2216', roots: '#2d3a20', moss: '#3f5428' },
  /** Funghi luminosi: cappelli e luce (anche il fungo a mensola sugli alberi). */
  mushroom: { cap: '#5fe0c8', glow: '#2fd0b8', paleCap: '#a8f0ff', paleGlow: '#6fd8ff' },
};

/** Faccia del muro in alto: un argine di terra con radici che pendono. */
const SWAMP_WALL_FACE: WallFaceStyle = { face: '#232c1a', dark: '#141a0f', light: '#3f5428', pattern: 'earth', tiles: 'swamp' };

/** Numero pseudo-casuale in [0, 1) che dipende solo dalla posizione. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Rumore a valori della cella (`cx`, `cy`) sulla griglia larga delle chiazze, interpolato in modo morbido. */
function patchNoise(cx: number, cy: number): number {
  const size = SWAMP_DECOR.patchCells;
  const gx = cx / size;
  const gy = cy / size;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const sx = smooth(gx - ix);
  const sy = smooth(gy - iy);
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** Le celle di terreno visibili (dentro la stanza): `visit` riceve la cella, il suo valore e se e' fango. */
function forGroundCells(
  arena: ArenaDefinition,
  camera: Camera,
  visit: (cx: number, cy: number, n: number, level: number, isMud: boolean) => void,
): void {
  const { cell, mudThreshold, edgeJitter } = SWAMP_DECOR;
  const { x: camX, y: camY } = camera.position;
  const x0 = Math.max(0, Math.floor(camX / cell));
  const y0 = Math.max(0, Math.floor(camY / cell));
  const x1 = Math.min(Math.ceil(arena.width / cell), Math.ceil((camX + camera.width) / cell) + 1);
  const y1 = Math.min(Math.ceil(arena.height / cell), Math.ceil((camY + camera.height) / cell) + 1);
  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const n = hash(cx, cy);
      const level = patchNoise(cx, cy) + (n - 0.5) * edgeJitter;
      visit(cx, cy, n, level, level > mudThreshold);
    }
  }
}

/**
 * La parte ferma del terreno, dipinta una volta nei tasselli della cache: acqua, riva e fango (con la grana dei tile
 * quando il foglio e' caricato) e le macchie scure del fango.
 */
/** Lato della grana della riva e della griglia su cui si interpola il livello: la riva e' a un pixel, il livello cambia piano. */
const SHORE_GRAIN = 128;
const SHORE_LATTICE = 8;
let shoreGrainValues: Float32Array | null = null;
let mudPixels: { sheet: HTMLImageElement; data: Uint8ClampedArray } | null = null;
let shoreLayer: HTMLCanvasElement | null = null;

/** Rumori a piu' scale su un quadrato che ripete: i periodi dividono il lato, quindi senza cuciture. */
function shoreGrain(): Float32Array {
  if (shoreGrainValues !== null) return shoreGrainValues;
  const values = new Float32Array(SHORE_GRAIN * SHORE_GRAIN);
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  for (const [period, weight] of [[32, 0.5], [16, 0.28], [8, 0.15], [4, 0.07]] as const) {
    const count = SHORE_GRAIN / period;
    const node = (x: number, y: number): number => hash(x % count + period, y % count + period * 3);
    for (let y = 0; y < SHORE_GRAIN; y++) {
      const iy = Math.floor(y / period);
      const sy = smooth(y / period - iy);
      for (let x = 0; x < SHORE_GRAIN; x++) {
        const ix = Math.floor(x / period);
        const sx = smooth(x / period - ix);
        const top = node(ix, iy) + (node(ix + 1, iy) - node(ix, iy)) * sx;
        const bottom = node(ix, iy + 1) + (node(ix + 1, iy + 1) - node(ix, iy + 1)) * sx;
        values[y * SHORE_GRAIN + x]! += (top + (bottom - top) * sy) * weight;
      }
    }
  }
  shoreGrainValues = values;
  return values;
}

/** I pixel del fango dal foglio, letti una volta sola. */
function readMudPixels(sheet: HTMLImageElement, mud: TileGrid, span: number): Uint8ClampedArray {
  if (mudPixels !== null && mudPixels.sheet === sheet) return mudPixels.data;
  const canvas = document.createElement('canvas');
  canvas.width = span;
  canvas.height = span;
  const painter = canvas.getContext('2d', { willReadFrequently: true })!;
  painter.drawImage(sheet, mud.x, mud.y, span, span, 0, 0, span, span);
  const data = painter.getImageData(0, 0, span, span).data;
  mudPixels = { sheet, data };
  return data;
}

/**
 * Fango e acqua con le superfici del foglio. La riva corre a un pixel per unita', come tutto il resto: il livello si
 * interpola da una griglia rada, gli si somma la grana e il tassello si compone pixel per pixel, una volta sola.
 */
function drawScenicGround(ctx: CanvasRenderingContext2D, camera: Camera, sheet: HTMLImageElement, water: TileGrid, mud: TileGrid): void {
  const { cell, mudThreshold, shoreBand, edgeJitter } = SWAMP_DECOR;
  const span = mud.cells * mud.size;
  const wrap = (value: number, side: number): number => ((value % side) + side) % side;
  const left = Math.floor(camera.position.x);
  const top = Math.floor(camera.position.y);
  const width = Math.ceil(camera.width) + 1;
  const height = Math.ceil(camera.height) + 1;
  for (let y = Math.floor(top / span) * span; y < top + height; y += span) {
    for (let x = Math.floor(left / span) * span; x < left + width; x += span) {
      ctx.drawImage(sheet, water.x, water.y, span, span, x, y, span, span);
    }
  }

  const lattice0x = Math.floor(left / SHORE_LATTICE);
  const lattice0y = Math.floor(top / SHORE_LATTICE);
  const columns = Math.ceil(width / SHORE_LATTICE) + 2;
  const rows = Math.ceil(height / SHORE_LATTICE) + 2;
  const levels = new Float32Array(columns * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      levels[j * columns + i] = patchNoise(((lattice0x + i) * SHORE_LATTICE) / cell, ((lattice0y + j) * SHORE_LATTICE) / cell);
    }
  }

  if (shoreLayer === null) shoreLayer = document.createElement('canvas');
  if (shoreLayer.width !== width || shoreLayer.height !== height) {
    shoreLayer.width = width;
    shoreLayer.height = height;
  }
  const painter = shoreLayer.getContext('2d')!;
  const image = painter.createImageData(width, height);
  const out = image.data;
  const grain = shoreGrain();
  const source = readMudPixels(sheet, mud, span);
  const shoreLimit = mudThreshold - shoreBand;
  const rimLimit = shoreLimit + shoreBand * 0.16;
  for (let y = 0; y < height; y++) {
    const worldY = top + y;
    const row = Math.floor(worldY / SHORE_LATTICE) - lattice0y;
    const fy = worldY / SHORE_LATTICE - lattice0y - row;
    const grainRow = wrap(worldY, SHORE_GRAIN) * SHORE_GRAIN;
    const sourceRow = wrap(worldY, span) * span;
    for (let x = 0; x < width; x++) {
      const worldX = left + x;
      const column = Math.floor(worldX / SHORE_LATTICE) - lattice0x;
      const fx = worldX / SHORE_LATTICE - lattice0x - column;
      const at = row * columns + column;
      const upper = levels[at]! + (levels[at + 1]! - levels[at]!) * fx;
      const lower = levels[at + columns]! + (levels[at + columns + 1]! - levels[at + columns]!) * fx;
      const level = upper + (lower - upper) * fy + (grain[grainRow + wrap(worldX, SHORE_GRAIN)]! - 0.5) * edgeJitter * 1.4;
      if (level <= shoreLimit) continue;
      const from = (sourceRow + wrap(worldX, span)) * 4;
      // Il fango; verso l'acqua e' bagnato e piu' scuro, con una linea scura sul bordo come gli oggetti.
      const light = level > mudThreshold ? 1 : level > rimLimit ? 0.44 : 0.2;
      const to = (y * width + x) * 4;
      out[to] = source[from]! * light + 6 * (1 - light);
      out[to + 1] = source[from + 1]! * light + 12 * (1 - light);
      out[to + 2] = source[from + 2]! * light + 10 * (1 - light);
      out[to + 3] = 255;
    }
  }
  painter.putImageData(image, 0, 0);
  ctx.drawImage(shoreLayer, left, top);
}

function drawStaticGround(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { cell, mudThreshold, shoreBand, water, mud, shore } = SWAMP_DECOR;
  const sheet = tileSheet('swamp');
  const grain = tileVariants('swamp', 'floor');
  // L'ultima fila e l'ultima colonna di celle sborderebbero oltre la stanza: si ritaglia sul suo rettangolo.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, arena.width, arena.height);
  ctx.clip();
  const waterGrid = tileGrid('swamp', 'water');
  const mudGrid = tileGrid('swamp', 'floor');
  if (sheet !== null && waterGrid !== undefined && mudGrid !== undefined) {
    drawScenicGround(ctx, camera, sheet, waterGrid, mudGrid);
    drawFloorScenery(ctx, arena, camera, 'swamp');
    ctx.restore();
    return;
  }
  forGroundCells(arena, camera, (cx, cy, n, level, isMud) => {
    const palette = isMud ? mud : level > mudThreshold - shoreBand ? shore : water;
    ctx.fillStyle = palette[n > 0.75 ? 2 : n > 0.35 ? 1 : 0]!;
    ctx.fillRect(cx * cell, cy * cell, cell, cell);
    const px = cx * cell;
    const py = cy * cell;
    if (isMud && sheet !== null && grain.length > 0) {
      // Grana del fango: tile allineati al mondo, ritagliati sulla cella.
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, cell, cell);
      ctx.clip();
      for (let ty = Math.floor(py / TILE_SIZE) * TILE_SIZE; ty < py + cell; ty += TILE_SIZE) {
        for (let tx = Math.floor(px / TILE_SIZE) * TILE_SIZE; tx < px + cell; tx += TILE_SIZE) {
          const tile = pickVariant(grain, hash(tx + 3, ty + 5));
          if (tile !== undefined) drawTile(ctx, sheet, tile, tx, ty);
        }
      }
      ctx.restore();
    }
    if (isMud && n < 0.1) {
      ctx.fillStyle = '#1c1d12';
      ctx.fillRect(px + 10, py + 24, 14, 5);
    }
  });
  ctx.restore();
}

/** Cio' che si muove sul terreno: increspature sull'acqua e ciuffi di canne che ondeggiano sul fango. */
function drawGroundMotion(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const { cell } = SWAMP_DECOR;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, arena.width, arena.height);
  ctx.clip();
  // Il muro e la sua faccia stanno nella cache, sotto: increspature e canne solo nelle celle libere dal muro.
  const wall = arena.wallThickness;
  const top = wall + wallFaceHeight(arena);
  forGroundCells(arena, camera, (cx, cy, n, _level, isMud) => {
    const px = cx * cell;
    const py = cy * cell;
    if (px < wall || py < top || px + cell > arena.width - wall || py + cell > arena.height - wall) return;
    if (!isMud && n > 0.7) {
      // Increspatura che oscilla sull'acqua.
      ctx.fillStyle = '#27493b66';
      ctx.fillRect(px + 8, py + 20 + Math.sin(clock * 1.4 + cx * 0.7 + cy) * 3, 20, 2);
    } else if (isMud && n > 0.82 && !sceneryReady('swamp')) {
      // Ciuffo di canne che ondeggia piano.
      ctx.fillStyle = '#566a2e';
      for (let i = 0; i < 3; i++) {
        const sway = Math.sin(clock * 0.9 + cx + i) * 1.5;
        ctx.fillRect(px + 12 + i * 8 + sway, py + 10 - i * 2, 2, 22);
      }
    }
  });
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { wall } = SWAMP_DECOR;
  const t = arena.wallThickness;
  ctx.fillStyle = wall.base;
  ctx.fillRect(0, 0, arena.width, t);
  ctx.fillRect(0, arena.height - t, arena.width, t);
  ctx.fillRect(0, 0, t, arena.height);
  ctx.fillRect(arena.width - t, 0, t, arena.height);
  drawTopWallFace(ctx, arena, camera, SWAMP_WALL_FACE);
  if (sceneryReady('swamp')) return;
  const face = wallFaceHeight(arena);
  // Un groviglio di radici e muschio sul lato interno, solo nel tratto visibile (in alto, sotto la faccia).
  const { x: camX, y: camY } = camera.position;
  const step = 36;
  const xa = Math.max(0, Math.floor(camX / step));
  const xb = Math.min(Math.ceil(arena.width / step), Math.ceil((camX + camera.width) / step));
  for (let i = xa; i < xb; i++) {
    const h = hash(i, 3);
    ctx.fillStyle = h > 0.5 ? wall.roots : wall.moss;
    const len = 8 + h * 14;
    if (camY < t + face + 24) ctx.fillRect(i * step, t + face, 10 + h * 10, len * 0.6);
    if (camY + camera.height > arena.height - t - 24) ctx.fillRect(i * step, arena.height - t - len, 10 + h * 10, len);
  }
  const ya = Math.max(0, Math.floor(camY / step));
  const yb = Math.min(Math.ceil(arena.height / step), Math.ceil((camY + camera.height) / step));
  for (let j = ya; j < yb; j++) {
    const h = hash(7, j);
    ctx.fillStyle = h > 0.5 ? wall.roots : wall.moss;
    const len = 8 + h * 14;
    if (camX < t + 24) ctx.fillRect(t, j * step, len, 10 + h * 10);
    if (camX + camera.width > arena.width - t - 24) ctx.fillRect(arena.width - t - len, j * step, len, 10 + h * 10);
  }
}

/** Grappoli di funghi luminosi nati sull'argine, sulla faccia del muro in alto. */
function drawWallMushrooms(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const t = arena.wallThickness;
  const face = wallFaceHeight(arena);
  for (const spot of faceSpots(arena, t + face * 0.55, 170)) {
    if (!camera.isVisible(spot, 120)) continue;
    const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + spot.x * 0.03);
    drawLight(ctx, spot.x, spot.y, SWAMP_DECOR.mushroom.glow, 110, 0.4 + 0.3 * pulse);
    if (sceneryReady('swamp')) continue;
    ctx.fillStyle = SWAMP_DECOR.mushroom.cap;
    ctx.fillRect(spot.x - 7, spot.y - 3, 6, 3);
    ctx.fillRect(spot.x + 1, spot.y - 6, 8, 3);
    ctx.fillStyle = SWAMP_DECOR.mushroom.paleCap;
    ctx.fillRect(spot.x - 2, spot.y + 1, 5, 2);
  }
}

/**
 * Funghi luminosi sparsi, con un alone che pulsa. Ciano e acquamarina: il giallo e il viola sono dei proiettili e
 * delle zone della Madre delle spore, e un fungo dello stesso colore li nasconderebbe.
 */
function drawMushrooms(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  if (sceneryReady('swamp')) return;
  const grid = SWAMP_DECOR.mushroomGrid;
  const { x: camX, y: camY } = camera.position;
  const gx0 = Math.floor((camX - 40) / grid);
  const gx1 = Math.ceil((camX + camera.width + 40) / grid);
  const gy0 = Math.floor((camY - 40) / grid);
  const gy1 = Math.ceil((camY + camera.height + 40) / grid);
  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const h = hash(gx * 3.1, gy * 1.7);
      if (h < 0.5) continue;
      const x = gx * grid + hash(gx, gy + 9) * (grid - 40) + 20;
      const y = gy * grid + hash(gx + 5, gy) * (grid - 40) + 20;
      const margin = arena.wallThickness + 30;
      if (x < margin || x > arena.width - margin || y < margin || y > arena.height - margin) continue;
      const pale = h > 0.78;
      const cap = pale ? SWAMP_DECOR.mushroom.paleCap : SWAMP_DECOR.mushroom.cap;
      const glow = pale ? SWAMP_DECOR.mushroom.paleGlow : SWAMP_DECOR.mushroom.glow;
      const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + h * 20);
      drawLight(ctx, x, y - 4, glow, 96, 0.5 + 0.4 * pulse);
      ctx.fillStyle = '#7a7254';
      ctx.fillRect(x - 2, y - 2, 4, 9);
      ctx.fillStyle = cap;
      ctx.fillRect(x - 8, y - 8, 16, 6);
      ctx.fillRect(x - 5, y - 11, 10, 3);
      // Un secondo fungo, piu' piccolo, accanto al primo.
      ctx.fillRect(x + 11, y - 1, 8, 4);
      ctx.fillStyle = '#7a7254';
      ctx.fillRect(x + 14, y + 3, 2, 5);
    }
  }
}

/** Nebbia: grandi macchie traslucide che derivano lentamente (sopra il pavimento, sotto i personaggi). */
function drawFog(ctx: CanvasRenderingContext2D, camera: Camera, clock: number): void {
  const grid = SWAMP_DECOR.fogGrid;
  const { x: camX, y: camY } = camera.position;
  const gx0 = Math.floor((camX - 300) / grid);
  const gx1 = Math.ceil((camX + camera.width + 300) / grid);
  const gy0 = Math.floor((camY - 200) / grid);
  const gy1 = Math.ceil((camY + camera.height + 200) / grid);
  ctx.save();
  ctx.fillStyle = '#a7bda0';
  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const h = hash(gx * 2.3, gy * 4.1);
      if (h < 0.4) continue;
      const x = gx * grid + h * grid + Math.sin(clock * 0.15 + h * 9) * 90;
      const y = gy * grid + hash(gx, gy) * grid + Math.cos(clock * 0.12 + h * 7) * 40;
      for (const scale of [1, 0.66, 0.36]) {
        ctx.globalAlpha = 0.035;
        ctx.beginPath();
        ctx.ellipse(x, y, 260 * scale, 110 * scale, 0, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** La parte ferma della palude: fondo, terreno e muro, dipinti una volta nei tasselli della cache. */
function drawStaticFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;
  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = '#070d0b';
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);
  drawStaticGround(ctx, arena, camera);
  drawWall(ctx, arena, camera);
}

const floorCache = new FloorCache(drawStaticFloor);

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  floorCache.draw(ctx, arena, camera, floorVersion('swamp'));
  drawFloorSceneryLights(ctx, arena, camera, 'swamp', clock);
  drawGroundMotion(ctx, arena, camera, clock);
  drawWallMushrooms(ctx, arena, camera, clock);
  drawMushrooms(ctx, arena, camera, clock);
  drawFog(ctx, camera, clock);
}

/** Albero morto: radici contorte attorno al tronco, rami spogli piegati dal vento e un fungo a mensola che brilla. */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void {
  if (drawScenicPillar(ctx, pillar, camera, 'swamp', clock)) return;
  const { x, y } = pillar.position;
  const r = pillar.radius;
  if (!camera.isVisible(pillar.position, r * 2.2)) return;
  const seed = hash(x, y);
  ctx.save();

  ctx.fillStyle = '#04090780';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.55, r * 1.25, r * 0.55, 0, 0, TAU);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b2218';
  for (let i = 0; i < 7; i++) {
    const a = seed * TAU + (i * TAU) / 7 + hash(i, seed) * 0.4;
    const length = r * (1.25 + hash(seed, i) * 0.45);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
    ctx.lineTo(x + Math.cos(a + 0.15) * length, y + Math.sin(a + 0.15) * length);
    ctx.stroke();
  }

  ctx.fillStyle = '#3a2d1f';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#21180f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#4b3b28';
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.62, 0, TAU);
  ctx.fill();
  // Cerchi del legno e una cavita' scura.
  ctx.strokeStyle = '#2f2418';
  ctx.lineWidth = 2;
  for (const f of [0.28, 0.46]) {
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * f, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#17110b';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.1, r * 0.16, r * 0.26, 0.4, 0, TAU);
  ctx.fill();
  // Muschio sul lato in ombra.
  ctx.fillStyle = '#46602a';
  ctx.beginPath();
  ctx.arc(x + r * 0.55, y + r * 0.45, r * 0.3, 0, TAU);
  ctx.fill();

  // Rami spogli, con una biforcazione, che ondeggiano appena.
  ctx.strokeStyle = '#2a2018';
  for (let i = 0; i < 6; i++) {
    const a = seed * TAU + (i * TAU) / 6 + Math.sin(clock * 0.5 + i + seed * 9) * 0.04;
    const length = r * (1.3 + hash(i, seed * 7) * 0.7);
    const bx = x + Math.cos(a) * r * 0.5;
    const by = y + Math.sin(a) * r * 0.5;
    const ex = x + Math.cos(a) * length;
    const ey = y + Math.sin(a) * length;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const mx = bx + (ex - bx) * 0.6;
    const my = by + (ey - by) * 0.6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(a + 0.7) * r * 0.5, my + Math.sin(a + 0.7) * r * 0.5);
    ctx.stroke();
  }

  // Fungo a mensola luminoso sul tronco.
  const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + seed * 20);
  drawLight(ctx, x - r * 0.62, y + r * 0.1, SWAMP_DECOR.mushroom.glow, r * 0.9, 0.4 + 0.4 * pulse);
  ctx.fillStyle = SWAMP_DECOR.mushroom.cap;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.62, y + r * 0.1, r * 0.2, r * 0.1, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export const swampTheme: ArenaTheme = {
  drawFloor,
  drawPillar,
  drawForeground: (ctx, arena, camera, _clock, ambient) => drawBottomWallLip(ctx, arena, camera, SWAMP_DECOR.wall.base, SWAMP_DECOR.wall.moss, ambient, 'swamp'),
  ambient: '#22302a',
  block: { cap: '#26301c', edge: SWAMP_DECOR.wall.moss, face: SWAMP_WALL_FACE, tiles: 'swamp' },
  silhouette: '#e6f2cc66',
  vignette: '#020504',
  groundColors: [
    ...SWAMP_DECOR.water,
    ...SWAMP_DECOR.mud,
    ...SWAMP_DECOR.shore,
    SWAMP_DECOR.mushroom.cap,
    SWAMP_DECOR.mushroom.glow,
    SWAMP_DECOR.mushroom.paleCap,
    SWAMP_DECOR.mushroom.paleGlow,
    ...tileColors('swamp', 'floor'), ...tileColors('swamp', 'chasm'), ...tileColors('swamp', 'bridgeEW'), ...tileColors('swamp', 'water'),
  ],
};
