import { Camera } from '../../../core/camera';
import { Vec2 } from '../../../core/vec2';
import type { ArenaDefinition } from '../../arena/arena';
import { canvasBlitter, shearColumns, shearRows, worldRectForView } from './iso-shear';

/**
 * Tasselli quadrati della vista isometrica, pieni (niente angoli vuoti dei rombi): con una vista di 1280 x 720 ne servono
 * circa 24-35, come i tasselli dall'alto. Provvisori, solo prestazioni.
 */
export const ISO_FLOOR_CACHE = { chunkSize: 256, maxChunks: 40 } as const;

/** Dipinge il pavimento piatto visto dall'alto, in coordinate di mondo, dentro il rettangolo di `camera` (sempre dall'alto). */
export type PaintGround = (ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera) => void;

/** I tasselli (indici di colonna e riga della vista) che toccano il rettangolo di vista dato. */
export function isoChunksInView(left: number, top: number, width: number, height: number, size: number = ISO_FLOOR_CACHE.chunkSize): readonly { readonly cx: number; readonly cy: number }[] {
  const chunks: { cx: number; cy: number }[] = [];
  const x0 = Math.floor(left / size), x1 = Math.floor((left + width - 1) / size);
  const y0 = Math.floor(top / size), y1 = Math.floor((top + height - 1) / size);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) chunks.push({ cx, cy });
  return chunks;
}

/**
 * Il pavimento della vista isometrica a tasselli in cache. Ogni tassello si costruisce dipingendo dall'alto il pezzo di
 * mondo che gli serve e disponendolo a rombo pixel per pixel (`shearRows` + `shearColumns`): stessi pixel, stessi colori.
 */
export class IsoFloorCache {
  private readonly arenas = new WeakMap<ArenaDefinition, { version: string; chunks: Map<string, HTMLCanvasElement> }>();
  private world: HTMLCanvasElement | null = null;
  private rows: HTMLCanvasElement | null = null;

  constructor(private readonly paint: PaintGround) {}

  /**
   * Disegna i tasselli visibili. Il contesto e' traslato dalla camera: si disegna in coordinate della vista. `version`
   * dice con che cosa sono dipinti (fogli caricati): se cambia, si ridipinge tutto.
   */
  draw(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, version = ''): void {
    if (typeof document === 'undefined') return;
    let entry = this.arenas.get(arena);
    if (!entry || entry.version !== version) { entry = { version, chunks: new Map() }; this.arenas.set(arena, entry); }
    const chunks = entry.chunks;
    const size = ISO_FLOOR_CACHE.chunkSize;
    // Copre arrotondamento e scossa senza lasciare bordi scoperti.
    const visible = isoChunksInView(Math.floor(camera.position.x) - 16, Math.floor(camera.position.y) - 16, camera.width + 32, camera.height + 32, size);
    for (const { cx, cy } of visible) {
      const key = `${cx},${cy}`;
      let chunk = chunks.get(key);
      if (chunk) chunks.delete(key);
      else chunk = this.build(arena, cx * size, cy * size, size);
      chunks.set(key, chunk);
      if (chunks.size > Math.max(ISO_FLOOR_CACHE.maxChunks, visible.length + 4)) chunks.delete(chunks.keys().next().value!);
      ctx.drawImage(chunk, cx * size, cy * size);
    }
  }

  private build(arena: ArenaDefinition, vx0: number, vy0: number, size: number): HTMLCanvasElement {
    const rect = worldRectForView(vx0, vy0, size, size);
    this.world ??= document.createElement('canvas');
    this.rows ??= document.createElement('canvas');
    const world = this.world, rows = this.rows;
    resize(world, rect.width, rect.height);
    resize(rows, size, rect.height);
    const painter = world.getContext('2d')!;
    painter.setTransform(1, 0, 0, 1, 0, 0);
    painter.clearRect(0, 0, world.width, world.height);
    painter.imageSmoothingEnabled = false;
    painter.translate(-rect.x, -rect.y);
    const view = new Camera();
    view.setViewSize(rect.width, rect.height);
    view.position = new Vec2(rect.x, rect.y);
    this.paint(painter, arena, view);
    painter.setTransform(1, 0, 0, 1, 0, 0);
    const rowCtx = rows.getContext('2d')!;
    rowCtx.setTransform(1, 0, 0, 1, 0, 0);
    rowCtx.clearRect(0, 0, rows.width, rows.height);
    rowCtx.imageSmoothingEnabled = false;
    shearRows(canvasBlitter(rowCtx), world, rect.x, rect.y, rect.width, rect.height, vx0, size);
    const chunk = document.createElement('canvas');
    chunk.width = size;
    chunk.height = size;
    const chunkCtx = chunk.getContext('2d')!;
    chunkCtx.imageSmoothingEnabled = false;
    shearColumns(canvasBlitter(chunkCtx), rows, rect.y, rect.height, vx0, size, vy0);
    return chunk;
  }
}

function resize(canvas: HTMLCanvasElement, width: number, height: number): void {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}
