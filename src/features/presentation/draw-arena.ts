import type { Camera } from '../../core/camera';
import type { ArenaDefinition, Pillar } from '../arena/arena';
import { rasterDisc } from './pixel-disc';
import { fillSurface } from './themes/scenery';
import type { ArenaTheme } from './themes/theme';
import { ARENA_THEMES } from './themes';
import { drawSolidBlock } from './themes/wall';

/**
 * Disegna la mappa (pavimento, muro, decorazioni e massicci) con il tema della sua definizione. I ripari, che
 * stanno fra i massicci finche' resistono, si disegnano a parte con pozzi e ponti (`drawHazards`).
 */
export function drawArena(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const theme = ARENA_THEMES[arena.theme];
  theme.drawFloor(ctx, arena, camera, clock);
  for (const solid of arena.solids ?? []) if (solid.cover === undefined) drawSolidBlock(ctx, solid, camera, theme.block);
}

const pillarDiscs = new WeakMap<Pillar, Path2D>();

/** Sagoma a righe di pixel nelle stesse coordinate del cerchio solido. */
function pillarDisc(pillar: Pillar): Path2D {
  const disc = pillarDiscs.get(pillar);
  if (disc !== undefined) return disc;
  const path = new Path2D();
  rasterDisc(pillar.position.x, pillar.position.y, pillar.radius, (x, y, width) => path.rect(x, y, width, 1));
  pillarDiscs.set(pillar, path);
  return path;
}

// I motivi delle colonne vengono dipinti su una griglia di pixel d'arte come i vecchi sprite della Cripta.
const PILLAR_PIXEL = 2;
let pillarCanvas: HTMLCanvasElement | null = null;

function drawPillarSprite(ctx: CanvasRenderingContext2D, theme: ArenaTheme, pillar: Pillar, camera: Camera, clock: number): void {
  const radius = Math.ceil(pillar.radius);
  const size = Math.ceil(2 * radius / PILLAR_PIXEL);
  const { x, y } = pillar.position;
  pillarCanvas ??= document.createElement('canvas');
  // La tela cresce fino alla colonna più grande inquadrata.
  if (pillarCanvas.width < size || pillarCanvas.height < size) pillarCanvas.width = pillarCanvas.height = size;
  const paint = pillarCanvas.getContext('2d')!;
  paint.setTransform(1, 0, 0, 1, 0, 0);
  paint.clearRect(0, 0, size, size);
  paint.setTransform(1 / PILLAR_PIXEL, 0, 0, 1 / PILLAR_PIXEL, (radius - x) / PILLAR_PIXEL, (radius - y) / PILLAR_PIXEL);
  paint.imageSmoothingEnabled = false;
  theme.drawPillar(paint, pillar, camera, clock);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pillarCanvas, 0, 0, size, size, x - radius, y - radius, size * PILLAR_PIXEL, size * PILLAR_PIXEL);
}

/** Materiale e ornamento classico del tema entro il suo ingombro circolare. */
export function drawArenaPillars(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const theme = ARENA_THEMES[arena.theme];
  for (const pillar of arena.pillars) {
    const { position, radius } = pillar;
    if (!camera.isVisible(position, radius + 160)) continue;
    ctx.save();
    ctx.clip(pillarDisc(pillar));
    ctx.fillStyle = theme.block.cap;
    ctx.fillRect(position.x - radius, position.y - radius, 2 * radius, 2 * radius);
    drawPillarSprite(ctx, theme, pillar, camera, clock);
    // La stessa pietra, corteccia o lastra del tema continua sulle faccette e sul basamento.
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.65;
    fillSurface(ctx, arena.theme, 'cap', position.x - radius, position.y - radius, 2 * radius, 2 * radius);
    ctx.restore();
  }
}
