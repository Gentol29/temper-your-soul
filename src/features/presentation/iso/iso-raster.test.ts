import { describe, expect, it } from 'vitest';
import { isoPixel } from '../../../core/view-projection';
import { isoRasterBounds, permuteToIso } from './iso-raster';

/** Una raster di prova: ogni pixel ha un valore diverso (mai 0, che vuol dire trasparente). */
function numbered(width: number, height: number): Uint32Array {
  return Uint32Array.from({ length: width * height }, (_, i) => i + 1);
}

describe('raster del pavimento disposte a rombo', () => {
  it('ogni pixel finisce dove dice isoPixel, per entrambe le parita della posizione', () => {
    for (const [x, y] of [[0, 0], [7, 2], [256, 512], [-33, 64], [5, -9]]) {
      const width = 13, height = 9;
      const raster = permuteToIso(numbered(width, height), width, height, x!, y!);
      for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
        const view = isoPixel(x! + i, y! + j);
        expect(raster.data[(view.y - raster.top) * raster.width + (view.x - raster.left)]).toBe(j * width + i + 1);
      }
    }
  });

  it('non perde e non duplica pixel: il resto del riquadro resta trasparente', () => {
    for (const [x, y] of [[0, 0], [1, 0]]) {
      const width = 32, height = 32;
      const raster = permuteToIso(numbered(width, height), width, height, x!, y!);
      const values = [...raster.data].filter((value) => value !== 0);
      expect(values.length).toBe(width * height);
      expect(new Set(values).size).toBe(width * height);
    }
  });

  it('un tassello di 256 unita diventa un rombo largo 511 e alto 256, come i quattro angoli proiettati', () => {
    expect(isoRasterBounds(256, 256, 0, 0)).toEqual({ width: 511, height: 256, left: -255, top: 0 });
    expect(isoRasterBounds(256, 256, 256, 0)).toEqual({ width: 511, height: 256, left: 1, top: 128 });
    expect(isoRasterBounds(256, 256, 0, 256)).toEqual({ width: 511, height: 256, left: -511, top: 128 });
  });

  it('i tasselli vicini si incastrano senza buchi ne sovrapposizioni', () => {
    const size = 16;
    const covered = new Map<string, number>();
    for (let cy = -1; cy <= 1; cy++) for (let cx = -1; cx <= 1; cx++) {
      const raster = permuteToIso(numbered(size, size), size, size, cx * size, cy * size);
      raster.data.forEach((value, index) => {
        if (value === 0) return;
        const key = `${raster.left + (index % raster.width)},${raster.top + Math.floor(index / raster.width)}`;
        covered.set(key, (covered.get(key) ?? 0) + 1);
      });
    }
    expect([...covered.values()].every((count) => count === 1)).toBe(true);
    expect(covered.size).toBe(9 * size * size);
    // Il tassello centrale e' circondato: ogni pixel della vista vicino al suo centro e' coperto.
    const center = isoPixel(size / 2, size / 2);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -12; dx <= 12; dx++) {
      expect(covered.has(`${center.x + dx},${center.y + dy}`)).toBe(true);
    }
  });
});
