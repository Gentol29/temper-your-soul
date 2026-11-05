import { describe, expect, it } from 'vitest';
import { MINIONS } from '../../minions/minion-catalog';
import { MINION_ART } from '../minion-art';
import { BLENDER_SPRITES } from './blender-sprites';
import { GENERATED_SPRITES } from './generated-sprites';
import { SPRITE_DIRECTIONS } from './minion-directions';

const OUTLINE = 'a';

/** Il contorno di uno sprite: 'a' e, per quelli resi con Blender, i simboli dei contorni colorati (bagliore delle braci). */
function outlineOf(id: string): ReadonlySet<string> {
  return new Set([OUTLINE, ...(BLENDER_SPRITES[id]?.outline ?? [])]);
}

/** Tutti i fotogrammi di uno sprite: la serie di riferimento e, per quelli a 8 direzioni, anche tutte le serie. */
function allFrames(id: string, frames: readonly (readonly string[])[]): readonly (readonly string[])[] {
  return [...frames, ...(BLENDER_SPRITES[id]?.directions.flat() ?? [])];
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
      for (const frame of allFrames(id, sprite.frames)) {
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
      for (const frame of allFrames(id, sprite.frames)) {
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
      for (const series of [sprite.frames, ...(BLENDER_SPRITES[id]?.directions ?? [])]) {
        const mass = series.map((frame) => frame.join('').replace(/\./g, '').length);
        expect((Math.max(...mass) - Math.min(...mass)) / mass[0]!, id).toBeLessThan(0.3);
      }
    }
  });

  it('gli sprite a 8 direzioni hanno otto serie di quattro fotogrammi e il gioco le usa; senza specchio', () => {
    for (const [id, sprite] of Object.entries(BLENDER_SPRITES)) {
      expect(sprite.directions.length, id).toBe(SPRITE_DIRECTIONS.length);
      for (const series of sprite.directions) expect(series.length, id).toBe(4);
      // La serie di riferimento (bestiario, morte) e' la SE.
      expect(sprite.frames, id).toBe(sprite.directions[SPRITE_DIRECTIONS.indexOf('SE')]);
      expect(sprite.faces, id).toBe(false);
      expect(MINION_ART[id]!.directions, id).toBe(sprite.directions);
      expect(MINION_ART[id]!.faces, id).toBe(false);
      // Le serie non sono la stessa figura ripetuta: guardano in direzioni diverse.
      expect(new Set(sprite.directions.map((series) => series[0]!.join('|'))).size, id).toBe(SPRITE_DIRECTIONS.length);
    }
  });

  it('chi cammina tocca terra in ogni direzione: il disegno arriva al suo punto a terra, senza restare sospeso', () => {
    for (const [id, sprite] of Object.entries(BLENDER_SPRITES)) {
      expect(sprite.footRow, id).toBeGreaterThan(0);
      expect(MINION_ART[id]!.footRow, id).toBe(sprite.footRow);
      // Chi ondeggia sta sospeso apposta.
      if (sprite.bob) continue;
      sprite.directions.forEach((series, direction) => {
        const lowest = Math.max(...series.map((frame) => frame.reduce((last, row, y) => (row.replace(/\./g, '') === '' ? last : y), 0)));
        expect(lowest, `${id} direzione ${direction}`).toBeGreaterThanOrEqual(sprite.footRow - 2);
      });
    }
  });

  it('in isometria il cerchio di colpo e\' proporzionato allo sprite: non molto piu\' largo, ne\' molto piu\' stretto', () => {
    const byVisual = new Map(Object.values(MINIONS).map((minion) => [minion.visual, minion]));
    for (const [id, sprite] of Object.entries(BLENDER_SPRITES)) {
      const onScreen = 2 * Math.SQRT2 * byVisual.get(id)!.hitRadius;
      const width = sprite.frames[0]![0]!.length;
      expect(onScreen, id).toBeLessThanOrEqual(width * 1.2);
      expect(onScreen, id).toBeGreaterThanOrEqual(width * 0.33);
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
