import { Camera } from '../../core/camera';
import { Vec2 } from '../../core/vec2';
import type { ArenaDefinition } from '../arena/arena';

/** Cache limitata a 8 MiB per arena, senza prerenderizzare una mappa intera; di piu' solo se la vista ne richiede di piu'. */
export const FLOOR_CACHE = { chunkSize: 256, maxChunks: 32 } as const;
type PaintFloor = (ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera) => void;

export class FloorCache {
  private readonly arenas = new WeakMap<ArenaDefinition, { version: string; chunks: Map<string, HTMLCanvasElement> }>();
  constructor(private readonly paint: PaintFloor) {}
  /**
   * Disegna il pavimento visibile dai tasselli in cache. `version` dice con che cosa sono dipinti (per esempio i tile
   * dopo il caricamento del foglio): se cambia, i tasselli vecchi si buttano e si ridipingono.
   */
  draw(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, version = ''): void {
    // Senza DOM (i test dei temi) non ci sono canvas da tenere: si dipinge direttamente la vista.
    if (typeof document === 'undefined') {
      this.paint(ctx, arena, camera);
      return;
    }
    let entry = this.arenas.get(arena);
    if (!entry || entry.version !== version) { entry = { version, chunks: new Map() }; this.arenas.set(arena, entry); }
    const chunks = entry.chunks;
    const size = FLOOR_CACHE.chunkSize;
    // Copre anche l'arrotondamento e la scossa senza lasciare bordi scoperti.
    const x0 = Math.floor((camera.position.x - 16) / size), y0 = Math.floor((camera.position.y - 16) / size);
    const x1 = Math.floor((camera.position.x + camera.width + 16) / size), y1 = Math.floor((camera.position.y + camera.height + 16) / size);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const key = `${cx},${cy}`; let tile = chunks.get(key);
      if (tile) chunks.delete(key);
      else {
        tile = document.createElement('canvas'); tile.width = size; tile.height = size;
        const painter = tile.getContext('2d')!; painter.translate(-cx * size, -cy * size);
        const view = new Camera(); view.setViewSize(size, size); view.position = new Vec2(cx * size, cy * size);
        this.paint(painter, arena, view);
      }
      chunks.set(key, tile);
      // Con una finestra grande la vista copre piu' tasselli del limite: buttarli la farebbe ridipingere a ogni fotogramma.
      if (chunks.size > Math.max(FLOOR_CACHE.maxChunks, (x1 - x0 + 1) * (y1 - y0 + 1) + 4)) chunks.delete(chunks.keys().next().value!);
      ctx.drawImage(tile, cx * size, cy * size);
    }
  }
}
