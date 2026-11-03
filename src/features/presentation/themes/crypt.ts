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

/** Colori delle ossa e dell'ombra delle orbite, usati dagli ostacoli della cripta. */
const CRYPT_BONE_PILLAR = {
  bone: '#d8d0b8',
  boneShade: '#a89f86',
  socket: '#17141a',
};

/**
 * Pixel art degli ostacoli: ogni ostacolo e' disegnato una volta in uno sprite a bassa risoluzione (1 pixel d'arte =
 * `PIXEL_ART_SCALE` unita' di mondo, come le piastrelle), poi ridotto a una palette fissa con contorno scuro e ombra a
 * scacchi, e infine mostrato senza sfumature. Candele e luci restano animate dal vivo sopra lo sprite.
 */
const PIXEL_ART_SCALE = 2;
const PIXEL_OUTLINE = '#0b0d12';
const PIXEL_PALETTE = [
  PIXEL_OUTLINE, '#14121a', '#1d1a20', '#2c2a30', '#3a3e4a', '#4a4f5c', '#5c6270', '#6b7080', '#767c8c', '#8b92a4', '#3f434f',
  '#7a7360', '#a89f86', '#d8d0b8', '#efe8d0',
  '#0f1116', '#17141a', '#1b2230', '#2a3a3c',
  '#2a261f', '#3a3328', '#4f4636',
  '#4a3a78', '#8b6bd4', '#a888e8', '#d0c0ff',
  '#34353f', '#4b4d5a', '#5d5f6e',
  '#d9d2a8', '#3d4a3a', '#5b7a4e',
].map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as const);

/** Toni di ogni colore base (scuro → chiaro): la palette finale ha cinque gradini per materiale. */
const PIXEL_TONES = [0.5, 0.74, 1, 1.24, 1.5];
const PIXEL_RAMPS: readonly (readonly [number, number, number])[] = PIXEL_PALETTE.flatMap((c) =>
  PIXEL_TONES.map((t) => [Math.min(255, Math.round(c[0] * t)), Math.min(255, Math.round(c[1] * t)), Math.min(255, Math.round(c[2] * t))] as const),
);

function nearestPaletteColor(r: number, g: number, b: number): readonly [number, number, number] {
  let best = PIXEL_RAMPS[0]!;
  let bestDistance = Infinity;
  for (const color of PIXEL_RAMPS) {
    const distance = (color[0] - r) ** 2 + (color[1] - g) ** 2 + (color[2] - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
}

/** Ellisse dell'ombra, in pixel dello sprite. */
interface PixelShadow { readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number }

/** Matrice di Bayer 4x4 (0-15) per il dithering ordinato. */
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Passata Hi-bit: soglia sull'alpha, luce dall'alto a sinistra (bordi chiari in alto/sinistra, scuri in basso/destra,
 * piu' scuro verso il fondo), dithering ordinato sui gradienti, palette a cinque toni, contorno colorato (il colore
 * vicino, scurito) e ombra a scacchi sul lato opposto alla luce.
 */
function pixelate(image: ImageData, shadow: PixelShadow): void {
  const { data, width, height } = image;
  const body = new Uint8Array(width * height);
  let minY = height;
  let maxY = 0;
  for (let i = 0; i < body.length; i++) {
    if (data[i * 4 + 3]! >= 128) {
      body[i] = 1;
      const y = Math.floor(i / width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && body[y * width + x] === 1;
  const span = Math.max(1, maxY - minY);
  const lit = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!body[i]) continue;
      const o = i * 4;
      let f = 1.14 - (0.34 * (y - minY)) / span;
      if (!solid(x - 1, y) || !solid(x, y - 1)) f *= 1.28;
      if (!solid(x + 1, y) || !solid(x, y + 1)) f *= 0.7;
      f += (BAYER_4[(y % 4) * 4 + (x % 4)]! / 15 - 0.5) * 0.14;
      const [r, g, b] = nearestPaletteColor(Math.min(255, data[o]! * f), Math.min(255, data[o + 1]! * f), Math.min(255, data[o + 2]! * f));
      lit[o] = r;
      lit[o + 1] = g;
      lit[o + 2] = b;
      lit[o + 3] = 255;
    }
  }
  const shade = nearestPaletteColor(0x10, 0x15, 0x1e);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (body[i]) continue;
      const neighbour = solid(x + 1, y) ? i + 1 : solid(x - 1, y) ? i - 1 : solid(x, y + 1) ? i + width : solid(x, y - 1) ? i - width : -1;
      if (neighbour >= 0) {
        const n = neighbour * 4;
        const [r, g, b] = nearestPaletteColor(lit[n]! * 0.32, lit[n + 1]! * 0.32, lit[n + 2]! * 0.34);
        lit[o] = r;
        lit[o + 1] = g;
        lit[o + 2] = b;
        lit[o + 3] = 255;
      } else if (((x - shadow.cx) / shadow.rx) ** 2 + ((y - shadow.cy) / shadow.ry) ** 2 <= 1 && (x + y) % 2 === 0) {
        lit[o] = shade[0];
        lit[o + 1] = shade[1];
        lit[o + 2] = shade[2];
        lit[o + 3] = 150;
      }
    }
  }
  data.set(lit);
}

/** Valore pseudocasuale legato alla posizione: stessa scena a ogni fotogramma, scene diverse fra ostacoli diversi. */
function seededRandom(x: number, y: number): () => number {
  let s = Math.floor(hash(x, y) * 4294967296) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

/** Punto casuale in un disco di raggio `radius` attorno a (cx, cy), uniforme sull'area. */
function pointInDisc(rng: Random, cx: number, cy: number, radius: number): Vec2 {
  const a = rng() * TAU;
  const d = Math.sqrt(rng()) * radius;
  return new Vec2(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
}

/** Un teschio visto dall'alto, orientato verso l'esterno (`angle`) e largo `size`. */
function drawSkull(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Mandibola, cranio, poi le due orbite e il naso.
  ctx.fillStyle = CRYPT_BONE_PILLAR.boneShade;
  ctx.fillRect(size * 0.1, -size * 0.28, size * 0.45, size * 0.56);
  ctx.fillStyle = CRYPT_BONE_PILLAR.bone;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CRYPT_BONE_PILLAR.socket;
  ctx.beginPath();
  ctx.arc(size * 0.12, -size * 0.2, size * 0.16, 0, TAU);
  ctx.arc(size * 0.12, size * 0.2, size * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillRect(size * 0.3, -size * 0.06, size * 0.14, size * 0.12);
  ctx.restore();
}

/** Un osso lungo con le due teste arrotondate, centrato in (x, y) e ruotato di `angle`. */
function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, thickness: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = CRYPT_BONE_PILLAR.bone;
  ctx.fillRect(-length / 2, -thickness / 2, length, thickness);
  for (const end of [-length / 2, length / 2]) {
    ctx.beginPath();
    ctx.arc(end, -thickness * 0.5, thickness * 0.7, 0, TAU);
    ctx.arc(end, thickness * 0.5, thickness * 0.7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Scheggia di pietra irregolare. */
function drawChunk(ctx: CanvasRenderingContext2D, rng: Random, x: number, y: number, size: number, fill: string, light: string): void {
  const sides = 5 + Math.floor(rng() * 2);
  const start = rng() * TAU;
  const points: Vec2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = start + (i * TAU) / sides;
    const d = size * (0.6 + rng() * 0.4);
    points.push(new Vec2(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8));
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = light;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Cumulo di teschi: un tumulo scuro, qualche osso e i teschi impilati, quelli piu' in basso davanti. */
function drawSkullPile(ctx: CanvasRenderingContext2D, rng: Random, x: number, y: number, r: number): void {
  ctx.fillStyle = '#2c2a30';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r, r * 0.85, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const p = pointInDisc(rng, x, y, r * 0.5);
    drawBone(ctx, p.x, p.y, rng() * Math.PI, r * 0.9, Math.max(5, r * 0.11));
  }
  // Pochi teschi grandi, in una disposizione a cerchio con uno al centro: si leggono meglio a bassa risoluzione.
  const count = 6 + Math.floor(rng() * 2);
  const offset = rng() * TAU;
  const skulls = [
    { p: new Vec2(x + (rng() - 0.5) * r * 0.2, y + (rng() - 0.5) * r * 0.2), angle: rng() * TAU, size: r * 0.46 },
    ...Array.from({ length: count }, (_, i) => {
      const a = offset + (i * TAU) / count + (rng() - 0.5) * 0.3;
      return { p: new Vec2(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.55), angle: a, size: r * (0.38 + rng() * 0.06) };
    }),
  ].sort((a, b) => a.p.y - b.p.y);
  for (const skull of skulls) drawSkull(ctx, skull.p.x, skull.p.y, skull.angle, skull.size);
}

/** Una candela consumata: lo stoppino e la fiamma sono animati dal vivo (`flames` raccoglie dove). */
function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number, flames: Vec2[]): void {
  ctx.fillStyle = '#d9d2a8';
  ctx.fillRect(x - 3, y - 6, 6, 10);
  ctx.fillStyle = '#3a3e4a';
  ctx.fillRect(x - 3, y + 2, 6, 2);
  flames.push(new Vec2(x, y - 6));
}

/** Sarcofago scoperchiato: cassa di pietra, interno buio con uno scheletro e il coperchio scivolato di lato. */
function drawSarcophagus(ctx: CanvasRenderingContext2D, rng: Random, x: number, y: number, r: number): void {
  const l = r * 0.85;
  const w = r * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rng() * TAU);
  ctx.fillStyle = '#3a3e4a';
  ctx.fillRect(-l, -w, l * 2, w * 2);
  ctx.strokeStyle = '#6b7080';
  ctx.lineWidth = 4;
  ctx.strokeRect(-l + 2, -w + 2, l * 2 - 4, w * 2 - 4);
  ctx.fillStyle = '#0f1116';
  ctx.fillRect(-l * 0.82, -w * 0.66, l * 1.64, w * 1.32);
  // Lo scheletro: teschio a un capo, costole e un femore.
  drawSkull(ctx, -l * 0.55, 0, Math.PI, Math.max(16, r * 0.3));
  ctx.strokeStyle = CRYPT_BONE_PILLAR.boneShade;
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-l * 0.2 + i * l * 0.18, -w * 0.5);
    ctx.lineTo(-l * 0.2 + i * l * 0.18, w * 0.5);
    ctx.stroke();
  }
  drawBone(ctx, l * 0.45, w * 0.1, 0.2, l * 0.5, Math.max(4, r * 0.08));
  // Il coperchio, spostato e inclinato: copre solo un tratto della cassa.
  ctx.save();
  ctx.translate(l * 0.5, w * 0.55);
  ctx.rotate(0.22);
  ctx.fillStyle = '#5c6270';
  ctx.fillRect(-l * 0.55, -w * 0.75, l * 1.1, w * 1.5);
  ctx.strokeStyle = '#8b92a4';
  ctx.lineWidth = 3;
  ctx.strokeRect(-l * 0.55, -w * 0.75, l * 1.1, w * 1.5);
  ctx.fillStyle = '#3f434f';
  ctx.fillRect(-l * 0.4, -2, l * 0.8, 4);
  ctx.fillRect(-2, -w * 0.5, 4, w * 1.0);
  ctx.restore();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const p = pointInDisc(rng, x, y, r * 0.95);
    drawChunk(ctx, rng, p.x, p.y, r * (0.07 + rng() * 0.05), '#5c6270', '#8b92a4');
  }
}

/** Altare rituale: lastra tonda con una stella runica viola e quattro candele; la luce pulsa dal vivo. */
function drawRitualAltar(ctx: CanvasRenderingContext2D, rng: Random, x: number, y: number, r: number, flames: Vec2[]): void {
  ctx.fillStyle = '#3a3e4a';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6b7080';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#a888e8';
  ctx.lineWidth = 4;
  for (const ring of [0.72, 0.58]) {
    ctx.beginPath();
    ctx.arc(x, y, r * ring, 0, TAU);
    ctx.stroke();
  }
  // Stella a cinque punte, con una rotazione di partenza diversa da un altare all'altro.
  const start = rng() * TAU;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = start + ((i * 2) % 5) * (TAU / 5);
    const px = x + Math.cos(a) * r * 0.58;
    const py = y + Math.sin(a) * r * 0.58;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  drawSkull(ctx, x, y, rng() * TAU, Math.max(16, r * 0.3));
  for (let i = 0; i < 4; i++) {
    const a = start + (i * TAU) / 4 + TAU / 8;
    drawCandle(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, flames);
  }
}

/** Gabbia di ferro con uno scheletro rimasto dentro: anelli in alto e in basso, sbarre, una sbarra spezzata. */
function drawIronCage(ctx: CanvasRenderingContext2D, rng: Random, x: number, y: number, r: number): void {
  const rx = r * 0.68;
  const ry = r * 0.3;
  const baseY = y + r * 0.35;
  const topY = y - r * 0.4;
  ctx.fillStyle = '#14121a';
  ctx.fillRect(x - rx, topY, rx * 2, baseY - topY);
  ctx.beginPath();
  ctx.ellipse(x, baseY, rx, ry, 0, 0, TAU);
  ctx.fill();
  // Lo scheletro accasciato.
  drawBone(ctx, x - rx * 0.2, baseY - ry * 0.2, 0.3 + rng() * 0.4, r * 0.7, Math.max(4, r * 0.08));
  drawBone(ctx, x + rx * 0.2, baseY - ry * 0.4, -0.5 - rng() * 0.3, r * 0.6, Math.max(4, r * 0.08));
  drawSkull(ctx, x + (rng() - 0.5) * rx * 0.6, baseY - r * 0.28, rng() * TAU, Math.max(16, r * 0.3));
  // Sbarre e anelli.
  ctx.strokeStyle = '#4b4d5a';
  ctx.lineWidth = 4;
  const bars = 7;
  const broken = Math.floor(rng() * bars);
  for (let i = 0; i < bars; i++) {
    const px = x - rx + (i * 2 * rx) / (bars - 1);
    const sag = Math.sin((i / (bars - 1)) * Math.PI) * ry;
    ctx.beginPath();
    ctx.moveTo(px, topY + sag * 0.8);
    ctx.lineTo(px, i === broken ? baseY + sag * 0.3 - r * 0.28 : baseY + sag);
    ctx.stroke();
  }
  ctx.strokeStyle = '#5d5f6e';
  for (const cy of [topY, baseY]) {
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, TAU);
    ctx.stroke();
  }
  // Catena da cui pendeva.
  ctx.strokeStyle = '#4b4d5a';
  ctx.beginPath();
  ctx.moveTo(x, topY - ry);
  ctx.lineTo(x, topY - ry - r * 0.18);
  ctx.stroke();
}

/** Lapidi inclinate su un tumulo di terra smossa, con un poco di muschio e un teschio affiorato. */
function drawGraves(ctx: CanvasRenderingContext2D, rng: Random, x: number, y: number, r: number): void {
  ctx.fillStyle = '#2a261f';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.95, r * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a3328';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.1, y + r * 0.2, r * 0.6, r * 0.35, 0.2, 0, TAU);
  ctx.fill();
  drawSkull(ctx, x + r * 0.3, y + r * 0.4, rng() * TAU, Math.max(14, r * 0.26));
  const stones = [-0.5, 0, 0.5].map((offset) => ({ x: x + offset * r, y: y - r * 0.05 + Math.abs(offset) * r * 0.25, tilt: (rng() - 0.5) * 0.45, h: r * (0.55 + rng() * 0.25) }));
  for (const stone of stones) {
    ctx.save();
    ctx.translate(stone.x, stone.y);
    ctx.rotate(stone.tilt);
    ctx.fillStyle = '#6b7080';
    ctx.fillRect(-r * 0.2, -stone.h * 0.5, r * 0.4, stone.h);
    ctx.beginPath();
    ctx.arc(0, -stone.h * 0.5, r * 0.2, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#8b92a4';
    ctx.fillRect(-r * 0.2, -stone.h * 0.5, 4, stone.h);
    ctx.fillStyle = '#4a4f5c';
    ctx.fillRect(-2, -stone.h * 0.55, 4, stone.h * 0.35);
    ctx.fillRect(-r * 0.09, -stone.h * 0.45, r * 0.18, 4);
    ctx.fillStyle = '#3d4a3a';
    ctx.fillRect(-r * 0.2, stone.h * 0.25, r * 0.4, stone.h * 0.25);
    ctx.restore();
  }
  for (let i = 0; i < 3; i++) {
    const p = pointInDisc(rng, x, y, r * 0.9);
    drawChunk(ctx, rng, p.x, p.y, r * (0.06 + rng() * 0.04), '#5c6270', '#8b92a4');
  }
}

/** Sprite di un ostacolo: l'immagine gia' ridotta a pixel art e i punti dove animare candele e luce. */
interface PillarSprite {
  readonly canvas: HTMLCanvasElement;
  /** Posizioni delle fiamme rispetto al centro dell'ostacolo, in unita' di mondo. */
  readonly flames: readonly Vec2[];
  readonly glow: boolean;
}

const pillarSprites = new Map<string, PillarSprite | null>();

/** Disegna l'ostacolo in uno sprite a pixel; `null` se non c'e' un canvas (test senza DOM). */
function bakePillar(pillar: Pillar): PillarSprite | null {
  if (typeof document === 'undefined') return null;
  const { x, y } = pillar.position;
  const r = pillar.radius;
  const size = Math.ceil((r * 2.6) / PIXEL_ART_SCALE / 2) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null || typeof ctx.getImageData !== 'function') return null;
  const rng = seededRandom(x, y);
  const variant = Math.floor(rng() * 5);
  const flames: Vec2[] = [];
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(1 / PIXEL_ART_SCALE, 1 / PIXEL_ART_SCALE);
  ctx.translate(-x, -y);
  if (variant === 0) drawSkullPile(ctx, rng, x, y, r);
  else if (variant === 1) drawSarcophagus(ctx, rng, x, y, r);
  else if (variant === 2) drawRitualAltar(ctx, rng, x, y, r, flames);
  else if (variant === 3) drawIronCage(ctx, rng, x, y, r);
  else drawGraves(ctx, rng, x, y, r);
  ctx.restore();
  const image = ctx.getImageData(0, 0, size, size);
  pixelate(image, { cx: size / 2 + 2, cy: size / 2 + (r * 0.5) / PIXEL_ART_SCALE, rx: (r * 1.05) / PIXEL_ART_SCALE, ry: (r * 0.5) / PIXEL_ART_SCALE });
  ctx.putImageData(image, 0, 0);
  return { canvas, flames: flames.map((f) => new Vec2(f.x - x, f.y - y)), glow: variant === 2 };
}

function pillarSprite(pillar: Pillar): PillarSprite | null {
  const key = `${pillar.position.x},${pillar.position.y},${pillar.radius}`;
  let sprite = pillarSprites.get(key);
  if (sprite === undefined) {
    sprite = bakePillar(pillar);
    pillarSprites.set(key, sprite);
  }
  return sprite;
}

/** Porta una coordinata sulla griglia dei pixel d'arte. */
function snap(value: number): number {
  return Math.round(value / PIXEL_ART_SCALE) * PIXEL_ART_SCALE;
}

/**
 * Ostacolo scenografico della cripta (solo aspetto), in pixel art: al posto delle colonne, cumuli di teschi, sarcofagi
 * scoperchiati, altari rituali, gabbie di ferro e lapidi. La variante e la disposizione derivano dalla posizione, quindi
 * non cambiano da un fotogramma all'altro; l'ingombro resta il cerchio della colonna.
 */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void {
  if (!camera.isVisible(pillar.position, pillar.radius + 20)) return;
  const sprite = pillarSprite(pillar);
  if (sprite === null) return;
  const { x, y } = pillar.position;
  const size = sprite.canvas.width * PIXEL_ART_SCALE;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite.canvas, snap(x - size / 2), snap(y - size / 2), size, size);
  ctx.restore();
  if (sprite.glow) {
    const pulse = 0.5 + 0.5 * Math.sin(clock * 1.6 + x);
    drawLight(ctx, x, y, '#8b6bd4', pillar.radius * 1.9, 0.28 + 0.12 * pulse);
  }
  for (const flame of sprite.flames) {
    const fx = x + flame.x;
    const fy = y + flame.y;
    const step = Math.floor(clock * 7 + fx * 0.37) % 3;
    const height = PIXEL_ART_SCALE * (2 + (step % 2));
    drawLight(ctx, fx, fy - 6, '#ffb066', 48 + step * 2, 0.5);
    ctx.fillStyle = '#e7a76c';
    ctx.fillRect(snap(fx) - PIXEL_ART_SCALE, snap(fy) - height, PIXEL_ART_SCALE * 2, height);
    ctx.fillStyle = '#ffe4a0';
    ctx.fillRect(snap(fx), snap(fy) - height + PIXEL_ART_SCALE, PIXEL_ART_SCALE, height - PIXEL_ART_SCALE);
  }
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
