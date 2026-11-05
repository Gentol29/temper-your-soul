import { describe, expect, it } from 'vitest';
import { MINIONS } from '../../minions/minion-catalog';
import { MINION_ART } from '../minion-art';
import { BLENDER_SPRITES } from './blender-sprites';
import { GENERATED_SPRITES } from './generated-sprites';

const OUTLINE = 'a';

/** Il contorno di uno sprite: 'a' e, per quelli resi con Blender, i simboli dei contorni colorati (bagliore delle braci). */
function outlineOf(id: string): ReadonlySet<string> {
  return new Set([OUTLINE, ...(BLENDER_SPRITES[id]?.outline ?? [])]);
}

describe('sprite dei mob dal generatore locale e da Blender', () => {
  // Gli sprite di Blender hanno la precedenza su quelli del generatore locale, come in `minion-art.ts`.
  const entries = Object.entries({ ...GENERATED_SPRITES, ...BLENDER_SPRITES });

  it('ogni sprite appartiene a un mob del gioco, che lo usa a scala 1', () => {
    const visuals = new Set(Object.values(MINIONS).map((minion) => minion.visual));
    for (const [id, sprite] of entries) {
      expect(visuals.has(id), id).toBe(true);
      expect(MINION_ART[id]!.frames, id).toBe(sprite.frames);
      expect(MINION_ART[id]!.scale, id).toBe(1);
    }
  });

  it('quattro fotogrammi della stessa misura, con tutti i simboli in tavolozza', () => {
    for (const [id, sprite] of entries) {
      expect(sprite.frames.length, id).toBe(4);
      const height = sprite.frames[0]!.length;
      const width = sprite.frames[0]![0]!.length;
      for (const frame of sprite.frames) {
        expect(frame.length, id).toBe(height);
        for (const row of frame) {
          expect(row.length, id).toBe(width);
          for (const symbol of row) if (symbol !== '.') expect(Object.hasOwn(sprite.palette, symbol), `${id}: ${symbol}`).toBe(true);
        }
      }
    }
  });

  it('ogni fotogramma ha il contorno chiuso: nessun pixel della figura tocca il vuoto', () => {
    for (const [id, sprite] of entries) {
      const outline = outlineOf(id);
      for (const frame of sprite.frames) {
        frame.forEach((row, y) => {
          [...row].forEach((symbol, x) => {
            if (symbol === '.' || outline.has(symbol)) return;
            const around = [frame[y - 1]?.[x], frame[y + 1]?.[x], row[x - 1], row[x + 1]];
            expect(around.some((near) => near === undefined || near === '.'), `${id} ${x},${y}`).toBe(false);
          });
        });
      }
    }
  });

  it('il disegno resta lo stesso: i fotogrammi usano la stessa tavolozza e la massa cambia poco', () => {
    for (const [id, sprite] of entries) {
      const mass = sprite.frames.map((frame) => frame.join('').replace(/\./g, '').length);
      expect((Math.max(...mass) - Math.min(...mass)) / mass[0]!, id).toBeLessThan(0.3);
    }
  });

  it('la figura copre almeno il cerchio di colpo e il ritmo e\' ragionevole', () => {
    const byVisual = new Map(Object.values(MINIONS).map((minion) => [minion.visual, minion]));
    for (const [id, sprite] of entries) {
      const minion = byVisual.get(id)!;
      const longest = Math.max(sprite.frames[0]!.length, sprite.frames[0]![0]!.length);
      expect(longest, id).toBeGreaterThanOrEqual(minion.hitRadius * 1.5);
      expect(sprite.fps, id).toBeGreaterThanOrEqual(3);
      expect(sprite.fps, id).toBeLessThanOrEqual(16);
    }
  });
});
