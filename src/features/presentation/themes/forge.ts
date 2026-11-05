import type { Camera } from '../../../core/camera';
import { TAU, Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import { drawLight } from '../lights';
import { faceSpots, isClearSpot, wallSpots } from './decor';
import type { ArenaTheme } from './theme';
import { drawIsoWallLights, paintWallFootShadows } from '../iso/iso-scenery';
import type { IsoArtFrame } from '../iso/iso-theme';
import { drawBottomWallLip, drawTopWallFace, wallFaceHeight, type WallFaceStyle } from './wall';
import { FloorCache } from '../floor-cache';
import { drawFloorScenery, drawFloorSceneryLights, drawScenicPillar, drawSceneryPiece, floorVersion, sceneryReady } from './scenery';
import { drawTile, tileAt, tileColors, tileSheet, TILE_SIZE } from './tiles';

/**
 * Decorazione della fucina (solo aspetto). Valori provvisori: pavimento di basalto nero-bruno con crepe di lava che
 * pulsano, bracieri lungo i muri, incudini addossate ai muri, scintille che salgono. Le posizioni dipendono dalla
 * misura della mappa e lasciano liberi ingresso e porte.
 */
const FORGE_DECOR = {
  /** Lato delle lastre di basalto. */
  tileSize: 64,
  /** Una lastra su cinque circa ha una crepa di lava (soglia sul valore pseudocasuale della lastra). */
  crackThreshold: 0.78,
  /** Una lastra su venti circa emette una scintilla. */
  sparkThreshold: 0.95,
  /** Bracieri lungo i muri: distanza dal bordo e passo. */
  braziers: { inset: 95, spacing: 450 },
  /**
   * Incudini addossate ai muri, a `inset` dal bordo: `at` e' la frazione del muro (da sinistra o dall'alto).
   * Ricavate dall'arena del prototipo (3600 x 2200).
   */
  anvils: {
    inset: 125,
    spots: [
      { wall: 'top', at: 0.156 },
      { wall: 'top', at: 0.819 },
      { wall: 'bottom', at: 0.397 },
      { wall: 'bottom', at: 0.889 },
      { wall: 'left', at: 0.709 },
    ] as const,
  },
  /** Luce dei bracieri e bagliore delle crepe. */
  brazierLight: { color: '#ff7a2a', radius: 220 },
  crackLight: { color: '#ff5a1a', radius: 70 },
};

/** Faccia del muro in alto: lastre di ferro ribattute. */
const FORGE_WALL_FACE: WallFaceStyle = { face: '#2a2420', dark: '#120e0c', light: '#5e544c', pattern: 'plates', tiles: 'forge' };

const anvilCache = new WeakMap<ArenaDefinition, readonly Vec2[]>();

/** Le incudini di questa mappa, tolte quelle che coprirebbero ingresso o porte. */
function anvilsOf(arena: ArenaDefinition): readonly Vec2[] {
  let anvils = anvilCache.get(arena);
  if (anvils) return anvils;
  const { inset, spots } = FORGE_DECOR.anvils;
  anvils = spots
    .map(({ wall, at }) =>
      wall === 'top' ? new Vec2(at * arena.width, inset)
        : wall === 'bottom' ? new Vec2(at * arena.width, arena.height - inset)
          : new Vec2(inset, at * arena.height))
    .filter((anvil) => isClearSpot(arena, anvil.x, anvil.y, 50));
  anvilCache.set(arena, anvils);
  return anvils;
}

const COLORS = {
  void: '#0c0908',
  basalt: ['#1b1614', '#211b18', '#27201c'],
  grout: '#0e0b0a',
  fleck: '#2f2824',
  wall: '#2c2622',
  wallEdge: '#4a3f38',
  rivet: '#6b5d52',
  lava: '#ff6a1f',
  lavaCore: '#ffc15a',
  lavaDark: '#7a2a0c',
  iron: '#3a332e',
  ironLight: '#5e544c',
};

/** Valore pseudocasuale in [0, 1) legato alla posizione: il disegno non cambia da un fotogramma all'altro. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawCrack(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, clock: number): void {
  const size = FORGE_DECOR.tileSize;
  // Una spezzata di tre tratti che parte dal bordo sinistro o alto della lastra e attraversa il centro.
  const points: Array<[number, number]> = [
    [x + (h * 7) % 1 * size * 0.3, y + size * 0.15],
    [x + size * (0.35 + ((h * 13) % 1) * 0.2), y + size * (0.35 + ((h * 29) % 1) * 0.2)],
    [x + size * (0.6 + ((h * 31) % 1) * 0.2), y + size * 0.6],
    [x + size * (0.85 + ((h * 17) % 1) * 0.15), y + size * (0.8 + ((h * 5) % 1) * 0.2)],
  ];
  const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + h * 40);
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]![0], points[i]![1]);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLORS.lavaDark;
  ctx.lineWidth = 6;
  path();
  ctx.stroke();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = COLORS.lava;
  ctx.lineWidth = 3;
  path();
  ctx.stroke();
  ctx.strokeStyle = COLORS.lavaCore;
  ctx.lineWidth = 1;
  path();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBrazier(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number): void {
  const flicker = Math.sin(clock * 9 + x * 0.1);
  const light = FORGE_DECOR.brazierLight;
  drawLight(ctx, x, y - 10, light.color, light.radius + flicker * 5, 0.8 + flicker * 0.1);
  if (drawSceneryPiece(ctx, 'forge', 'brazier', 0, x, y + 16)) {
    // La brace viva sopra il braciere del foglio.
    ctx.fillStyle = COLORS.lava;
    ctx.fillRect(x - 6, y - 26 + flicker * 2, 12, 10);
    ctx.fillStyle = COLORS.lavaCore;
    ctx.fillRect(x - 3, y - 31 + Math.sin(clock * 11 + x) * 2, 6, 11);
    return;
  }
  // Ciotola di ferro su tre piedi.
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(x - 15, y + 4, 4, 11);
  ctx.fillRect(x + 11, y + 4, 4, 11);
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(x - 17, y - 8, 34, 14);
  ctx.fillStyle = COLORS.ironLight;
  ctx.fillRect(x - 17, y - 8, 34, 3);
  // Brace e fiamme.
  ctx.fillStyle = COLORS.lavaDark;
  ctx.fillRect(x - 13, y - 12, 26, 5);
  ctx.fillStyle = COLORS.lava;
  ctx.fillRect(x - 9, y - 22 + flicker * 2, 18, 12);
  ctx.fillStyle = COLORS.lavaCore;
  ctx.fillRect(x - 5, y - 28 + Math.sin(clock * 11 + x) * 3, 10, 14);
  ctx.fillStyle = '#fff2c0';
  ctx.fillRect(x - 2, y - 24 + Math.sin(clock * 13 + x * 0.3) * 2, 4, 8);
}

/** Bocca di forno nella faccia del muro: una grata scura con la brace che pulsa dietro. */
function drawFurnaceMouth(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number): void {
  const pulse = 0.6 + 0.4 * Math.sin(clock * 1.7 + x * 0.05);
  drawLight(ctx, x, y + 6, FORGE_DECOR.brazierLight.color, 170, 0.45 + 0.25 * pulse);
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(x - 11, y - 7, 22, 14);
  ctx.fillStyle = COLORS.lavaDark;
  ctx.fillRect(x - 9, y - 1, 18, 6);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.lava;
  ctx.fillRect(x - 8, y + 1, 16, 3);
  ctx.fillStyle = COLORS.lavaCore;
  ctx.fillRect(x - 4, y + 2, 8, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.ironLight;
  for (const bx of [-6, -1, 4]) ctx.fillRect(x + bx, y - 7, 2, 14);
}

function drawAnvil(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number): void {
  if (drawSceneryPiece(ctx, 'forge', 'anvil', 0, x, y + 22)) return;
  ctx.fillStyle = '#0c090880';
  ctx.fillRect(x - 36, y + 10, 76, 12);
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(x - 24, y + 4, 48, 14);
  ctx.fillRect(x - 12, y - 6, 24, 12);
  // Piano battente con la punta (il "corno") a sinistra.
  ctx.fillStyle = COLORS.ironLight;
  ctx.fillRect(x - 32, y - 18, 64, 12);
  ctx.beginPath();
  ctx.moveTo(x - 32, y - 18);
  ctx.lineTo(x - 50, y - 12);
  ctx.lineTo(x - 32, y - 6);
  ctx.fill();
  // Il piano e' ancora caldo: un velo di lava che pulsa.
  ctx.fillStyle = `rgba(255, 138, 42, ${0.22 + 0.18 * Math.sin(clock * 1.6 + x)})`;
  ctx.fillRect(x - 24, y - 18, 40, 4);
}

/** Lato delle zone di basalto piu' scuro, quando il pavimento e' fatto di tile. */
const DARK_ZONE = 192;

/**
 * La parte ferma del pavimento, dipinta una volta nei tasselli della cache: basalto (lastre nel codice, o i tile di 0x72
 * ricolorati quando il foglio e' caricato), il muro perimetrale con la sua faccia e i rivetti.
 */
function drawStaticFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;

  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);

  drawForgeTiles(ctx, arena, camera);

  drawFloorScenery(ctx, arena, camera, 'forge');
  drawForgeWalls(ctx, arena, camera);
}

/** Le lastre di basalto (dal foglio o nel codice) dentro il rettangolo della camera dall'alto. */
function drawForgeTiles(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;
  const { tileSize } = FORGE_DECOR;
  const sheet = tileSheet('forge');
  if (sheet !== null) {
    const x0 = Math.max(0, Math.floor(camX / TILE_SIZE) * TILE_SIZE);
    const y0 = Math.max(0, Math.floor(camY / TILE_SIZE) * TILE_SIZE);
    for (let y = y0; y < Math.min(arena.height, camY + camera.height + TILE_SIZE); y += TILE_SIZE) {
      for (let x = x0; x < Math.min(arena.width, camX + camera.width + TILE_SIZE); x += TILE_SIZE) {
        const zone = hash(Math.floor(x / DARK_ZONE) + 311, Math.floor(y / DARK_ZONE));
        const tile = tileAt('forge', zone < 0.3 ? 'floorDark' : 'floor', x, y, hash(x + 7, y));
        if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
      }
    }
  } else {
    const x0 = Math.max(0, Math.floor(camX / tileSize) * tileSize);
    const y0 = Math.max(0, Math.floor(camY / tileSize) * tileSize);
    for (let y = y0; y < Math.min(arena.height, camY + camera.height + tileSize); y += tileSize) {
      for (let x = x0; x < Math.min(arena.width, camX + camera.width + tileSize); x += tileSize) {
        const h = hash(x, y);
        ctx.fillStyle = COLORS.basalt[Math.floor(h * 3)]!;
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.fillStyle = COLORS.grout;
        ctx.fillRect(x, y, tileSize, 2);
        ctx.fillRect(x, y, 2, tileSize);
        if (h > 0.5 && h < 0.62) {
          ctx.fillStyle = COLORS.fleck;
          ctx.fillRect(x + 12, y + 14, 14, 3);
          ctx.fillRect(x + 38, y + 40, 3, 10);
        }
      }
    }
  }
}

/** Il muro perimetrale e la faccia in alto (vista dall'alto). */
function drawForgeWalls(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;
  // Il muro perimetrale appartiene al mondo, non allo schermo: si disegna solo il tratto che la vista raggiunge.
  const wall = arena.wallThickness;
  const left = Math.max(0, camX - 4);
  const right = Math.min(arena.width, camX + camera.width + 4);
  const top = Math.max(0, camY - 4);
  const bottom = Math.min(arena.height, camY + camera.height + 4);
  ctx.fillStyle = COLORS.wall;
  if (camY < wall) ctx.fillRect(left, 0, right - left, wall);
  if (camY + camera.height > arena.height - wall) ctx.fillRect(left, arena.height - wall, right - left, wall);
  if (camX < wall) ctx.fillRect(0, top, wall, bottom - top);
  if (camX + camera.width > arena.width - wall) ctx.fillRect(arena.width - wall, top, wall, bottom - top);
  drawTopWallFace(ctx, arena, camera, FORGE_WALL_FACE);
  if (sceneryReady('forge')) return;
  ctx.fillStyle = COLORS.rivet;
  for (let x = Math.ceil(left / 96) * 96; x < right; x += 96) {
    if (camY < wall) ctx.fillRect(x, 12, 6, 6);
    if (camY + camera.height > arena.height - wall) ctx.fillRect(x, arena.height - 18, 6, 6);
  }
}

const floorCache = new FloorCache(drawStaticFloor);

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const { x: camX, y: camY } = camera.position;
  const { tileSize } = FORGE_DECOR;
  floorCache.draw(ctx, arena, camera, floorVersion('forge'));
  drawFloorSceneryLights(ctx, arena, camera, 'forge', clock);
  const scenic = sceneryReady('forge');

  // Crepe di lava che pulsano, solo nelle lastre libere dal muro (il muro e la sua faccia stanno nella cache, sotto).
  const wall = arena.wallThickness;
  const face = wallFaceHeight(arena);
  const x0 = Math.max(0, Math.floor(camX / tileSize) * tileSize);
  const y0 = Math.max(0, Math.floor(camY / tileSize) * tileSize);
  const x1 = Math.min(arena.width, camX + camera.width + tileSize);
  const y1 = Math.min(arena.height, camY + camera.height + tileSize);
  const inside = (x: number, y: number): boolean => x >= wall && y >= wall + face && x + tileSize <= arena.width - wall && y + tileSize <= arena.height - wall;
  for (let y = y0; y < y1; y += tileSize) {
    for (let x = x0; x < x1; x += tileSize) {
      const h = hash(x, y);
      if (!scenic && h > FORGE_DECOR.crackThreshold && inside(x, y)) drawCrack(ctx, x, y, h, clock);
    }
  }

  // Bagliore delle crepe (dopo tutte le lastre, cosi' nessuna lo copre) e scintille che salgono dalle crepe piu'
  // calde e si spengono prima di arrivare in cima.
  const crackLight = FORGE_DECOR.crackLight;
  for (let y = y0; y < y1; y += tileSize) {
    for (let x = x0; x < x1; x += tileSize) {
      const h = hash(x, y);
      if (!inside(x, y)) continue;
      if (!scenic && h > FORGE_DECOR.crackThreshold) drawLight(ctx, x + tileSize / 2, y + tileSize / 2, crackLight.color, crackLight.radius, 0.35 + 0.2 * Math.sin(clock * 2 + h * 40));
      if (h <= FORGE_DECOR.sparkThreshold) continue;
      const t = (clock * 0.5 + h * 20) % 1;
      ctx.fillStyle = `rgba(255, 193, 90, ${1 - t})`;
      ctx.fillRect(x + tileSize / 2 + Math.sin(clock * 3 + h * 50) * 8, y + tileSize - t * 90, 3, 3);
    }
  }

  // Il bordo interno rovente: in alto alla base della faccia, poi sugli altri muri.
  const left = Math.max(0, camX - 4);
  const right = Math.min(arena.width, camX + camera.width + 4);
  const top = Math.max(0, camY - 4);
  const bottom = Math.min(arena.height, camY + camera.height + 4);
  const glow = 0.55 + 0.25 * Math.sin(clock * 1.3);
  ctx.fillStyle = `rgba(255, 106, 31, ${glow})`;
  if (camY < wall + face + 4) ctx.fillRect(Math.max(left, wall), wall + face - 3, Math.min(right, arena.width - wall) - Math.max(left, wall), 3);
  if (camY + camera.height > arena.height - wall - 4) ctx.fillRect(left, arena.height - wall - 3, right - left, 3);
  if (camX < wall + 4) ctx.fillRect(wall, top, 3, bottom - top);
  if (camX + camera.width > arena.width - wall - 4) ctx.fillRect(arena.width - wall - 3, top, 3, bottom - top);

  const { braziers } = FORGE_DECOR;
  // Sul muro in alto, bocche di forno nella faccia; sugli altri muri, bracieri a terra.
  for (const vent of faceSpots(arena, wall + face * 0.5, 210)) {
    if (!camera.isVisible(vent, 160)) continue;
    if (scenic) drawLight(ctx, vent.x, vent.y, FORGE_DECOR.crackLight.color, 130, 0.45 + 0.2 * Math.sin(clock * 1.7 + vent.x));
    else drawFurnaceMouth(ctx, vent.x, vent.y, clock);
  }
  for (const brazier of wallSpots(arena, braziers.inset, braziers.spacing, 40, false)) {
    if (camera.isVisible(brazier, FORGE_DECOR.brazierLight.radius)) drawBrazier(ctx, brazier.x, brazier.y, clock);
  }
  for (const anvil of anvilsOf(arena)) {
    if (camera.isVisible(anvil, 80)) drawAnvil(ctx, anvil.x, anvil.y, clock);
  }
}

/** Pilastro di ferro: base di basalto, fascia di ferro ribattuta e un nucleo che si scalda e si raffredda. */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void {
  if (drawScenicPillar(ctx, pillar, camera, 'forge', clock)) return;
  if (!camera.isVisible(pillar.position, pillar.radius + 20)) return;
  const { x, y } = pillar.position;
  const r = pillar.radius;
  ctx.fillStyle = '#0a070680';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.5, r * 1.08, r * 0.5, 0, 0, TAU);
  ctx.fill();
  // Fascia di ferro.
  ctx.fillStyle = COLORS.iron;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.ironLight;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Rivetti sulla fascia.
  ctx.fillStyle = COLORS.rivet;
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    ctx.fillRect(x + Math.cos(a) * (r - 7) - 2, y + Math.sin(a) * (r - 7) - 2, 4, 4);
  }
  // Cima di basalto.
  ctx.fillStyle = '#1f1a17';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, 0, TAU);
  ctx.fill();
  // Il calore che filtra dalle fessure della cima (e un poco di luce attorno).
  drawLight(ctx, x, y, '#ff6a1f', r * 2.4, 0.3 + 0.15 * Math.sin(clock * 2 + x * 0.01));
  ctx.strokeStyle = `rgba(255, 106, 31, ${0.45 + 0.3 * Math.sin(clock * 2 + x * 0.01)})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, a, a + 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a312c';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.22, r * 0.2, 0, TAU);
  ctx.fill();
}

export const forgeTheme: ArenaTheme = {
  drawFloor,
  drawPillar,
  drawForeground: (ctx, arena, camera, _clock, ambient) => drawBottomWallLip(ctx, arena, camera, COLORS.wall, COLORS.wallEdge, ambient, 'forge'),
  ambient: '#33241f',
  block: { cap: COLORS.wall, edge: COLORS.wallEdge, face: FORGE_WALL_FACE, tiles: 'forge' },
  silhouette: '#ffe8d673',
  vignette: '#050302',
  groundColors: [
    ...COLORS.basalt, COLORS.lava, COLORS.lavaCore, COLORS.lavaDark,
    ...tileColors('forge', 'floor'), ...tileColors('forge', 'floorDark'), ...tileColors('forge', 'chasm'), ...tileColors('forge', 'bridgeEW'),
  ],
};

// --- Vista isometrica --------------------------------------------------------------------------------------------------

/** Il basalto piatto della fucina per la cache isometrica, senza arredi ne' muro. */
export function paintForgeIsoGround(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  drawForgeTiles(ctx, arena, camera);
  paintWallFootShadows(ctx, arena);
}

/** In isometria: le bocche di forno come luci sui muri di fondo; bracieri e incudini dritti nel loro punto (sotto le figure). */
export function drawForgeIsoDetails(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void {
  const { arena, camera, clock, view } = frame;
  drawIsoWallLights(ctx, frame, 210, (along) => ({ color: FORGE_DECOR.crackLight.color, radius: 130, intensity: 0.45 + 0.2 * Math.sin(clock * 1.7 + along) }));
  const { braziers } = FORGE_DECOR;
  for (const brazier of wallSpots(arena, braziers.inset, braziers.spacing, 40, false)) {
    if (camera.isVisible(brazier, FORGE_DECOR.brazierLight.radius)) view.at(ctx, brazier.x, brazier.y, 10, () => drawBrazier(ctx, brazier.x, brazier.y, clock));
  }
  for (const anvil of anvilsOf(arena)) {
    if (camera.isVisible(anvil, 80)) view.at(ctx, anvil.x, anvil.y, 8, () => drawAnvil(ctx, anvil.x, anvil.y, clock));
  }
}
