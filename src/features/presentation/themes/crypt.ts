import type { Camera } from '../../../core/camera';
import { TAU, Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import { drawLight } from '../lights';
import { faceSpots, wallSpots } from './decor';
import type { ArenaTheme } from './theme';
import { drawBottomWallLip, drawTopWallFace, wallFaceHeight, type WallFaceStyle } from './wall';
import { FloorCache } from '../floor-cache';
import { drawTile, pickVariant, tileColors, tileSheet, tileVariants } from './tiles';

/**
 * Decorazione della cripta (solo aspetto). Le posizioni sono frazioni della mappa, ricavate dall'arena del prototipo
 * (3200 x 2400): li' il disegno resta lo stesso, nelle stanze della discesa si adatta. Le torce stanno lungo i muri.
 */
const CRYPT_DECOR = {
  /** Lato delle piastrelle del pavimento e delle zone piu' consumate o piu' scure (scala larga). */
  tileSize: 32,
  zoneSize: 160,
  /** Fasce centrali piu' scure (tappeto): una verticale e una orizzontale, estremi esclusi (frazioni della mappa). */
  carpet: { xMin: 0.45, xMax: 0.55, yMin: 0.433, yMax: 0.533 },
  /** Cerchi runici sul pavimento (frazioni della mappa): il primo e' sotto il boss. */
  runeCircles: [new Vec2(0.5, 0.458), new Vec2(0.2, 0.267), new Vec2(0.8, 0.267), new Vec2(0.2, 0.747), new Vec2(0.8, 0.747)],
  /** Torce lungo i muri: distanza dal bordo e passo; sul muro in alto sono appese alla faccia, piu' fitte. */
  torches: { inset: 64, spacing: 384, sconceSpacing: 192 },
  /** Luce delle torce: colore e raggio. */
  torchLight: { color: '#ffb066', radius: 190 },
};

/** Toni delle lastre (scura, media, chiara) nelle zone normali, consumate e in ombra. */
const CRYPT_FLOOR = {
  base: ['#222831', '#252b34', '#292f39'],
  worn: ['#272c33', '#2b3038', '#30353e'],
  dark: ['#1d222a', '#20252d', '#242932'],
} as const;

/** Il muro: cima, faccia di mattoni in alto (vista a tre quarti) e bordo chiaro. */
const CRYPT_WALL = {
  cap: '#424652',
  edge: '#5c6272',
  face: { face: '#353946', dark: '#23262e', light: '#5c6272', pattern: 'bricks', tiles: 'crypt' } satisfies WallFaceStyle,
};

/** Valore pseudocasuale in [0, 1) legato alla posizione: il disegno non cambia da un fotogramma all'altro. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawStaticFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;
  const { tileSize } = CRYPT_DECOR;
  const carpet = {
    xMin: CRYPT_DECOR.carpet.xMin * arena.width,
    xMax: CRYPT_DECOR.carpet.xMax * arena.width,
    yMin: CRYPT_DECOR.carpet.yMin * arena.height,
    yMax: CRYPT_DECOR.carpet.yMax * arena.height,
  };

  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = '#10151d';
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);

  const x0 = Math.max(0, Math.floor(camX / tileSize) * tileSize);
  const y0 = Math.max(0, Math.floor(camY / tileSize) * tileSize);
  const sheet = tileSheet('crypt');
  for (let y = y0; y < Math.min(arena.height, camY + camera.height + tileSize); y += tileSize) {
    for (let x = x0; x < Math.min(arena.width, camX + camera.width + tileSize); x += tileSize) {
      // Un hash vero (la vecchia sinusoide disegnava strisce regolari) su due scale: la lastra e la zona di qualche
      // lastra attorno, piu' consumata o piu' nuova. Cosi' il pavimento ha punti di riferimento senza rumore fitto.
      const n = hash(x, y);
      const zone = hash(Math.floor(x / CRYPT_DECOR.zoneSize), Math.floor(y / CRYPT_DECOR.zoneSize) + 977);
      const carpeted = (x > carpet.xMin && x < carpet.xMax) || (y > carpet.yMin && y < carpet.yMax);
      // Con il foglio dei tile: le lastre di 0x72 ricolorate negli stessi tre toni.
      const tile = sheet === null ? undefined : pickVariant(tileVariants('crypt', zone > 0.72 ? 'floorWorn' : zone < 0.22 ? 'floorDark' : 'floor'), n);
      if (sheet !== null && tile !== undefined) {
        drawTile(ctx, sheet, tile, x, y);
        if (carpeted) {
          ctx.fillStyle = '#38313c50';
          ctx.fillRect(x + 2, y + 2, 28, 28);
        }
        continue;
      }
      const tones = zone > 0.72 ? CRYPT_FLOOR.worn : zone < 0.22 ? CRYPT_FLOOR.dark : CRYPT_FLOOR.base;
      ctx.fillStyle = tones[n > 0.8 ? 2 : n > 0.4 ? 1 : 0]!;
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#1a2029';
      ctx.fillRect(x, y, tileSize, 1);
      ctx.fillRect(x, y, 1, tileSize);
      if (n > 0.85) {
        ctx.fillStyle = '#363b45';
        ctx.fillRect(x + 6, y + 7, 9, 2);
        ctx.fillStyle = '#1b2129';
        ctx.fillRect(x + 19, y + 18, 2, 8);
      } else if (n < 0.025) {
        // Lastra spaccata: una crepa a zig-zag da un bordo all'altro.
        ctx.fillStyle = '#14181f';
        ctx.fillRect(x + 2, y + 9, 7, 2);
        ctx.fillRect(x + 8, y + 10, 2, 6);
        ctx.fillRect(x + 9, y + 15, 8, 2);
        ctx.fillRect(x + 16, y + 16, 2, 7);
        ctx.fillRect(x + 17, y + 22, 11, 2);
      }
      if (carpeted) {
        ctx.fillStyle = '#38313c50';
        ctx.fillRect(x + 2, y + 2, 28, 28);
      }
    }
  }

  // Il muro perimetrale appartiene al mondo, non allo schermo.
  const wall = arena.wallThickness;
  ctx.fillStyle = CRYPT_WALL.cap;
  ctx.fillRect(0, 0, arena.width, wall);
  ctx.fillRect(0, arena.height - wall, arena.width, wall);
  ctx.fillRect(0, 0, wall, arena.height);
  ctx.fillRect(arena.width - wall, 0, wall, arena.height);
  drawTopWallFace(ctx, arena, camera, CRYPT_WALL.face);

}

/** Rune nel contesto finale: evita giunzioni antialias visibili fra i tasselli della cache. */
function drawRunes(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  for (const fraction of CRYPT_DECOR.runeCircles) {
    const circle = new Vec2(fraction.x * arena.width, fraction.y * arena.height);
    if (!camera.isVisible(circle, 140)) continue;
    ctx.strokeStyle = '#575064';
    ctx.lineWidth = 2;
    for (const r of [90, 108]) {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, r, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.save();
      ctx.translate(circle.x + Math.cos(a) * 99, circle.y + Math.sin(a) * 99);
      ctx.rotate(a);
      ctx.fillStyle = '#8b6b94';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

}

const floorCache = new FloorCache(drawStaticFloor);

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  floorCache.draw(ctx, arena, camera, tileSheet('crypt') === null ? '' : 'tiles');
  drawRunes(ctx, arena, camera);
  // I cerchi runici brillano appena: punti di riferimento nel buio.
  for (const fraction of CRYPT_DECOR.runeCircles) {
    const x = fraction.x * arena.width;
    const y = fraction.y * arena.height;
    drawLight(ctx, x, y, '#8b6bd4', 150, 0.22 + 0.06 * Math.sin(clock * 1.2 + x));
  }
  const { inset, spacing, sconceSpacing } = CRYPT_DECOR.torches;
  const light = CRYPT_DECOR.torchLight;
  const sconceY = arena.wallThickness + wallFaceHeight(arena) * 0.6;
  for (const { x, y } of faceSpots(arena, sconceY, sconceSpacing)) {
    if (camera.isVisible(new Vec2(x, y), light.radius)) drawTorch(ctx, x, y, clock, true);
  }
  for (const { x, y } of wallSpots(arena, inset, spacing, 20, false)) {
    if (camera.isVisible(new Vec2(x, y), light.radius)) drawTorch(ctx, x, y, clock, false);
  }
}

/** Luce delle torce, riusata dalle torce del rifugio. */
export const TORCH_LIGHT = CRYPT_DECOR.torchLight;

/** Una torcia con la sua luce: su un piede sul pavimento, oppure appesa alla faccia del muro (`sconce`). */
function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number, sconce: boolean): void {
  const light = CRYPT_DECOR.torchLight;
  const flicker = Math.sin(clock * 8 + x) * 0.5 + Math.sin(clock * 13 + y) * 0.5;
  drawLight(ctx, x, y - 12, light.color, light.radius + flicker * 4, 0.85 + flicker * 0.1);
  if (sconce) {
    // Staffa di ferro murata.
    ctx.fillStyle = '#2a2730';
    ctx.fillRect(x - 6, y - 2, 12, 4);
    ctx.fillRect(x - 2, y - 8, 4, 8);
  } else {
    ctx.fillStyle = '#10151e70';
    ctx.fillRect(x - 12, y, 28, 13);
    ctx.fillStyle = '#504b58';
    ctx.fillRect(x - 7, y - 8, 14, 15);
  }
  ctx.fillStyle = '#e7a76c';
  ctx.fillRect(x - 4, y - 17, 8, 10);
  ctx.fillStyle = '#ffe4a0';
  ctx.fillRect(x - 2, y - 19 + Math.sin(clock * 8 + x) * 2, 4, 7);
}

/** Colonna di pietra (la cripta del prototipo non ne ha: serve se una mappa con tema cripta ne usa). */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera): void {
  if (!camera.isVisible(pillar.position, pillar.radius + 20)) return;
  const { x, y } = pillar.position;
  ctx.fillStyle = '#10151e80';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + pillar.radius * 0.5, pillar.radius * 1.05, pillar.radius * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a4f5c';
  ctx.beginPath();
  ctx.arc(x, y, pillar.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6b7080';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5c6270';
  ctx.beginPath();
  ctx.arc(x - pillar.radius * 0.25, y - pillar.radius * 0.25, pillar.radius * 0.55, 0, TAU);
  ctx.fill();
}

export const cryptTheme: ArenaTheme = {
  drawFloor,
  drawPillar,
  drawForeground: (ctx, arena, camera, _clock, ambient) => drawBottomWallLip(ctx, arena, camera, CRYPT_WALL.cap, CRYPT_WALL.edge, ambient),
  ambient: '#262c44',
  block: { cap: '#3a3e4a', edge: CRYPT_WALL.edge, face: CRYPT_WALL.face, tiles: 'crypt' },
  silhouette: '#d8d2ff73',
  vignette: '#05070c',
  groundColors: [
    ...CRYPT_FLOOR.base, ...CRYPT_FLOOR.worn, ...CRYPT_FLOOR.dark, CRYPT_WALL.cap, '#8b6b94',
    ...tileColors('crypt', 'floor'), ...tileColors('crypt', 'floorWorn'), ...tileColors('crypt', 'floorDark'),
    ...tileColors('crypt', 'chasm'), ...tileColors('crypt', 'bridgeEW'),
  ],
};
