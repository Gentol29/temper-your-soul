import type { Camera } from '../../../core/camera';
import { TAU } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import { drawLight } from '../lights';
import { faceSpots } from './decor';
import type { ArenaTheme } from './theme';
import { drawBottomWallLip, drawTopWallFace, wallFaceHeight, type WallFaceStyle } from './wall';
import { FloorCache } from '../floor-cache';
import { drawFloorScenery, drawFloorSceneryLights, floorVersion, sceneryReady } from './scenery';
import { drawTile, tileAt, tileColors, tileSheet, TILE_SIZE } from './tiles';

/**
 * Il ghiacciaio: lastre di ghiaccio azzurro con crepe e riflessi che scorrono, banchi di neve, cristalli che brillano,
 * pulviscolo di neve e un muro di ghiaccio con stalattiti. Solo aspetto. Tutto e' deterministico (nessuna casualita':
 * la posizione di ogni dettaglio deriva dalla sua cella) e viene disegnato solo nella parte visibile.
 */
const GLACIER_DECOR = {
  /** Lato delle lastre di ghiaccio. */
  slabSize: 96,
  /** Lato delle celle dei banchi di neve, dei cristalli e del pulviscolo. */
  snowCell: 192,
  crystalCell: 288,
  moteCell: 256,
  /** Passo delle stalattiti lungo il muro. */
  toothSpacing: 56,
};

/** Faccia del muro in alto: una parete di ghiaccio con colate chiare e scure. */
const GLACIER_WALL_FACE: WallFaceStyle = { face: '#7fb0d3', dark: '#5f8fb8', light: '#e4f4fc', pattern: 'ice', tiles: 'glacier' };

/** Tre sfumature di lastra, dalla piu' scura alla piu' chiara. */
const SLAB_COLORS = ['#17344f', '#1b3c5a', '#214566'] as const;

/** Numero pseudo-casuale stabile in [0, 1) per una cella: sempre lo stesso a parita' di coordinate. */
function cellValue(x: number, y: number, salt = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * La parte ferma di una lastra: il colore (o, con il foglio caricato, i tile di 0x72 ricolorati nei toni del ghiaccio),
 * le giunture con il bordo illuminato e, a volte, una crepa.
 */
function drawSlab(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, sheet: HTMLImageElement | null): void {
  const h = cellValue(x, y);
  ctx.fillStyle = SLAB_COLORS[Math.floor(h * 3)]!;
  ctx.fillRect(x, y, size, size);
  if (sheet !== null) {
    // Una lastra su tre di ghiaccio piu' scuro, come i tre toni delle lastre disegnate nel codice.
    const material = h < 0.34 ? 'floorDark' : 'floor';
    for (let ty = y; ty < y + size; ty += TILE_SIZE) {
      for (let tx = x; tx < x + size; tx += TILE_SIZE) {
        const tile = tileAt('glacier', material, tx, ty, cellValue(tx, ty, 3));
        if (tile !== undefined) drawTile(ctx, sheet, tile, tx, ty);
      }
    }
  }
  // Con le scenografie giunture e crepe stanno gia' nella superficie.
  if (sceneryReady('glacier')) return;
  // Giunture tra le lastre e bordo illuminato in alto a sinistra.
  ctx.fillStyle = '#0d2238';
  ctx.fillRect(x, y, size, 2);
  ctx.fillRect(x, y, 2, size);
  ctx.fillStyle = '#4a7ca64d';
  ctx.fillRect(x + 2, y + 2, size - 2, 1);
  ctx.fillRect(x + 2, y + 2, 1, size - 2);

  // Crepa: spezzata di quattro segmenti con un filo di luce accanto.
  if (h > 0.82) {
    const points: Array<[number, number]> = [];
    for (let i = 0; i < 5; i++) {
      points.push([x + 10 + i * (size - 20) / 4, y + size * 0.3 + cellValue(x, y, i + 1) * size * 0.4]);
    }
    for (const [color, dy] of [['#0a1b2e', 0], ['#8fd3f080', 2]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = dy === 0 ? 2 : 1;
      ctx.beginPath();
      points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py + dy) : ctx.lineTo(px, py + dy)));
      ctx.stroke();
    }
  }
}

/** Riflesso: una fascia diagonale la cui luminosita' oscilla lentamente e in modo diverso per ogni lastra. */
function drawSlabShine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, clock: number): void {
  const h = cellValue(x, y);
  if (h <= 0.3 || h >= 0.7) return;
  const alpha = 0.05 + 0.06 * (Math.sin(clock * 0.9 + h * TAU) * 0.5 + 0.5);
  ctx.fillStyle = `rgba(214, 243, 255, ${alpha.toFixed(3)})`;
  const offset = h * 40;
  ctx.beginPath();
  ctx.moveTo(x + offset, y + size);
  ctx.lineTo(x + offset + 26, y + size);
  ctx.lineTo(x + offset + 62, y);
  ctx.lineTo(x + offset + 36, y);
  ctx.closePath();
  ctx.fill();
}

/** Un cristallo (tre schegge appoggiate a terra) che scintilla: `shine` va da 0 a 1. */
function drawCrystalCluster(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, shine: number): void {
  ctx.fillStyle = '#081a2c80';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 18, 6, 0, 0, TAU);
  ctx.fill();
  const shards: Array<[number, number, number]> = [
    [-9, 15 + h * 8, 7],
    [0, 24 + h * 10, 9],
    [10, 13 + h * 6, 6],
  ];
  for (const [dx, height, half] of shards) {
    ctx.fillStyle = '#5fa9d6';
    ctx.beginPath();
    ctx.moveTo(x + dx - half, y);
    ctx.lineTo(x + dx, y - height);
    ctx.lineTo(x + dx + half, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shine > 0.5 ? '#e8fbff' : '#a9e6fa';
    ctx.beginPath();
    ctx.moveTo(x + dx, y - height);
    ctx.lineTo(x + dx + half, y);
    ctx.lineTo(x + dx, y);
    ctx.closePath();
    ctx.fill();
  }
}

/** Visita le celle di lato `cell` che toccano la vista (con un margine), chiamando `visit` con l'angolo alto a sinistra. */
function forVisibleCells(
  arena: ArenaDefinition,
  camera: Camera,
  cell: number,
  margin: number,
  visit: (x: number, y: number) => void,
): void {
  const { x: camX, y: camY } = camera.position;
  const x0 = Math.max(0, Math.floor((camX - margin) / cell) * cell);
  const y0 = Math.max(0, Math.floor((camY - margin) / cell) * cell);
  for (let y = y0; y < Math.min(arena.height, camY + camera.height + margin); y += cell) {
    for (let x = x0; x < Math.min(arena.width, camX + camera.width + margin); x += cell) visit(x, y);
  }
}

/** La parte ferma del pavimento, dipinta una volta nei tasselli della cache: lastre, banchi di neve, muro e stalattiti. */
function drawStaticFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;
  const decor = GLACIER_DECOR;

  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = '#0b1c2e';
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);

  const sheet = tileSheet('glacier');
  forVisibleCells(arena, camera, decor.slabSize, 0, (x, y) => drawSlab(ctx, x, y, decor.slabSize, sheet));

  drawFloorScenery(ctx, arena, camera, 'glacier');
  const scenic = sceneryReady('glacier');

  // Banchi di neve: macchie chiare e basse, piu' fitte lungo il muro.
  if (!scenic) forVisibleCells(arena, camera, decor.snowCell, 80, (cx, cy) => {
    const h = cellValue(cx, cy, 11);
    if (h < 0.5) return;
    const x = cx + cellValue(cx, cy, 12) * decor.snowCell;
    const y = cy + cellValue(cx, cy, 13) * decor.snowCell;
    ctx.fillStyle = '#dcedf8aa';
    ctx.beginPath();
    ctx.ellipse(x, y, 26 + h * 30, 9 + h * 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f4fbffcc';
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 3, 14 + h * 16, 4 + h * 5, 0, 0, TAU);
    ctx.fill();
  });

  // Il muro perimetrale appartiene al mondo, non allo schermo: ghiaccio chiaro con stalattiti sul lato interno.
  const wall = arena.wallThickness;
  ctx.fillStyle = '#b4d6ea';
  ctx.fillRect(0, 0, arena.width, wall);
  ctx.fillRect(0, arena.height - wall, arena.width, wall);
  ctx.fillRect(0, 0, wall, arena.height);
  ctx.fillRect(arena.width - wall, 0, wall, arena.height);
  ctx.fillStyle = '#e4f4fc';
  ctx.fillRect(0, 0, arena.width, 5);
  ctx.fillRect(0, 0, 5, arena.height);
  ctx.fillStyle = '#7fb0d3';
  ctx.fillRect(0, arena.height - 6, arena.width, 6);
  ctx.fillRect(arena.width - 6, 0, 6, arena.height);
  drawTopWallFace(ctx, arena, camera, GLACIER_WALL_FACE);
  if (scenic) return;
  const face = wallFaceHeight(arena);

  const spacing = decor.toothSpacing;
  const firstX = Math.max(spacing, Math.floor((camX - spacing) / spacing) * spacing);
  for (let x = firstX; x < Math.min(arena.width - spacing, camX + camera.width + spacing); x += spacing) {
    // In alto le stalattiti pendono dalla base della faccia di ghiaccio.
    const length = 8 + cellValue(x, 1) * 10;
    ctx.fillStyle = '#9ec9e2';
    ctx.beginPath();
    ctx.moveTo(x - 7, wall + face);
    ctx.lineTo(x, wall + face + length);
    ctx.lineTo(x + 7, wall + face);
    ctx.fill();
    const lengthBottom = 12 + cellValue(x, 2) * 14;
    ctx.beginPath();
    ctx.moveTo(x - 8, arena.height - wall);
    ctx.lineTo(x, arena.height - wall - lengthBottom);
    ctx.lineTo(x + 8, arena.height - wall);
    ctx.fill();
  }
  const firstY = Math.max(spacing, Math.floor((camY - spacing) / spacing) * spacing);
  for (let y = firstY; y < Math.min(arena.height - spacing, camY + camera.height + spacing); y += spacing) {
    const lengthLeft = 12 + cellValue(3, y) * 14;
    ctx.fillStyle = '#9ec9e2';
    ctx.beginPath();
    ctx.moveTo(wall, y - 8);
    ctx.lineTo(wall + lengthLeft, y);
    ctx.lineTo(wall, y + 8);
    ctx.fill();
    const lengthRight = 12 + cellValue(4, y) * 14;
    ctx.beginPath();
    ctx.moveTo(arena.width - wall, y - 8);
    ctx.lineTo(arena.width - wall - lengthRight, y);
    ctx.lineTo(arena.width - wall, y + 8);
    ctx.fill();
  }
}

const floorCache = new FloorCache(drawStaticFloor);

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const decor = GLACIER_DECOR;
  floorCache.draw(ctx, arena, camera, floorVersion('glacier'));
  drawFloorSceneryLights(ctx, arena, camera, 'glacier', clock);
  const scenic = sceneryReady('glacier');

  // Riflessi sulle lastre, sotto banchi di neve e cristalli come prima (i riflessi sono tenui).
  if (!scenic) forVisibleCells(arena, camera, decor.slabSize, 0, (x, y) => drawSlabShine(ctx, x, y, decor.slabSize, clock));

  // Cristalli a terra: scintillano a turno.
  if (!scenic) forVisibleCells(arena, camera, decor.crystalCell, 60, (cx, cy) => {
    const h = cellValue(cx, cy, 21);
    if (h < 0.45) return;
    const x = cx + 40 + cellValue(cx, cy, 22) * (decor.crystalCell - 80);
    const y = cy + 40 + cellValue(cx, cy, 23) * (decor.crystalCell - 80);
    const shine = Math.sin(clock * 2.2 + h * 20) * 0.5 + 0.5;
    drawLight(ctx, x, y - 10, '#7fd8ff', 110, 0.3 + 0.3 * shine);
    drawCrystalCluster(ctx, x, y, h, shine);
  });

  // Pulviscolo di neve: puntini che scivolano e ondeggiano, avvolti attorno alla cella.
  forVisibleCells(arena, camera, decor.moteCell, 20, (cx, cy) => {
    for (let i = 0; i < 3; i++) {
      const h = cellValue(cx, cy, 31 + i);
      const x = cx + ((h * decor.moteCell + clock * (10 + h * 14)) % decor.moteCell);
      const y = cy + ((cellValue(cx, cy, 41 + i) * decor.moteCell + clock * (16 + h * 10)) % decor.moteCell) + Math.sin(clock * 1.3 + h * TAU) * 6;
      ctx.fillStyle = i === 0 ? '#ffffffb0' : '#cfeeffa0';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  });

  // Cristalli incastonati nella parete, che brillano a turno.
  const face = wallFaceHeight(arena);
  for (const spot of faceSpots(arena, arena.wallThickness + face * 0.5, 200)) {
    if (!camera.isVisible(spot, 130)) continue;
    const shine = Math.sin(clock * 2.2 + spot.x * 0.02) * 0.5 + 0.5;
    drawLight(ctx, spot.x, spot.y, '#7fd8ff', 120, 0.3 + 0.3 * shine);
    if (scenic) continue;
    ctx.fillStyle = '#3f7fb0';
    ctx.beginPath();
    ctx.moveTo(spot.x, spot.y - 9);
    ctx.lineTo(spot.x + 6, spot.y);
    ctx.lineTo(spot.x, spot.y + 9);
    ctx.lineTo(spot.x - 6, spot.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shine > 0.5 ? '#e8fbff' : '#a9e6fa';
    ctx.beginPath();
    ctx.moveTo(spot.x, spot.y - 9);
    ctx.lineTo(spot.x + 6, spot.y);
    ctx.lineTo(spot.x, spot.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** Colonna di cristallo: prisma esagonale a faccette con un nucleo luminoso che pulsa e due schegge alla base. */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void {
  if (!camera.isVisible(pillar.position, pillar.radius + 30)) return;
  const { x, y } = pillar.position;
  const r = pillar.radius;

  ctx.fillStyle = '#06142280';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.55, r * 1.1, r * 0.5, 0, 0, TAU);
  ctx.fill();

  // Faccette: sei triangoli dal centro, piu' chiari verso l'alto a sinistra (la luce).
  const facets = ['#d9f3ff', '#a9dcf3', '#6fb3dc', '#4a86b8', '#5f9cc9', '#8fcbea'] as const;
  for (let i = 0; i < 6; i++) {
    const a0 = (i * TAU) / 6 - Math.PI / 2;
    const a1 = ((i + 1) * TAU) / 6 - Math.PI / 2;
    ctx.fillStyle = facets[i]!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
    ctx.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#eaf9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i * TAU) / 6 - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Nucleo luminoso: pulsa lentamente e rischiara il ghiaccio attorno.
  const glow = 0.35 + 0.3 * (Math.sin(clock * 1.8 + x * 0.01) * 0.5 + 0.5);
  drawLight(ctx, x, y, '#bef4ff', r * 3.2, glow * 0.8);
  ctx.fillStyle = `rgba(190, 244, 255, ${glow.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.38, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffffcc';
  ctx.beginPath();
  ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.12, 0, TAU);
  ctx.fill();
}

export const glacierTheme: ArenaTheme = {
  drawFloor,
  drawPillar,
  drawForeground: (ctx, arena, camera, _clock, ambient) => drawBottomWallLip(ctx, arena, camera, '#b4d6ea', '#e4f4fc', ambient, 'glacier'),
  ambient: '#3e4c64',
  // Pavimento chiaro: i proiettili nemici, quasi tutti chiari, hanno bisogno di un contorno piu' spesso.
  projectileRim: 4.5,
  block: { cap: '#b4d6ea', edge: '#e4f4fc', face: GLACIER_WALL_FACE, tiles: 'glacier' },
  silhouette: '#f0fbff66',
  vignette: '#030a14',
  groundColors: [
    ...SLAB_COLORS, '#0d2238', '#0a1b2e',
    ...tileColors('glacier', 'floor'), ...tileColors('glacier', 'floorDark'), ...tileColors('glacier', 'chasm'), ...tileColors('glacier', 'bridgeEW'),
  ],
};
