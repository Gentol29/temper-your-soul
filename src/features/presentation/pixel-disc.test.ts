import { describe, expect, it } from 'vitest';
import { Camera } from '../../core/camera';
import { Vec2 } from '../../core/vec2';
import { pillarAt } from '../arena/arena';
import { DUNGEONS } from '../dungeons/dungeons';
import { rasterDisc } from './pixel-disc';

describe('impronta sul pavimento ortogonale', () => {
  it.each(DUNGEONS)('$id: il puntatore incontra il pilastro al bordo dei suoi pixel', (dungeon) => {
    const arena = dungeon.arena;
    const pillar = arena.pillars[0]!;
    const camera = new Camera();
    camera.setViewSize(640, 400);
    camera.follow(pillar.position.add(new Vec2(64, -24)));

    const rows = new Map<number, { left: number; end: number }>();
    rasterDisc(pillar.position.x, pillar.position.y, pillar.radius, (left, y, width) => {
      rows.set(y, { left, end: left + width });
    });
    const { x, y } = pillar.position;
    for (let row = Math.floor(y - pillar.radius) - 1; row <= y + pillar.radius + 1; row++) {
      const span = rows.get(row);
      const center = Math.floor(x);
      for (const col of span ? [span.left - 1, span.left, center, span.end - 1, span.end] : [center]) {
        const pointer = new Vec2((col + 0.5 - camera.position.x) / camera.width, (row + 0.5 - camera.position.y) / camera.height);
        const hit = pillarAt(arena, camera.pointerToWorld(pointer)) === pillar;
        expect(hit).toBe(span !== undefined && col >= span.left && col < span.end);
      }
    }
  });

  it('il centro di ogni pixel appartiene al disco anche con centro e raggio frazionari', () => {
    const pixels = new Set<string>();
    rasterDisc(-2.5, 4.5, 3.5, (left, y, width) => {
      for (let x = left; x < left + width; x++) pixels.add(`${x},${y}`);
    });
    for (let y = 0; y <= 9; y++) for (let x = -8; x <= 2; x++) {
      expect(pixels.has(`${x},${y}`)).toBe(Math.hypot(x + 0.5 + 2.5, y + 0.5 - 4.5) < 3.5);
    }
  });
});
