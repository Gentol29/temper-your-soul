import { describe, expect, it } from 'vitest';
import { isoPixel, isoPixelSource } from '../../../core/view-projection';
import { shearColumns, shearOntoWall, shearRows, wallColumn, wallFloorRow, wallPieceBounds, worldRectForView, type Blitter } from './iso-shear';

/** Una superficie di pixel finta: copia rettangoli come drawImage senza scala (i pixel trasparenti, 0, non coprono). */
class Surface {
  readonly data: Uint32Array;
  constructor(readonly width: number, readonly height: number) {
    this.data = new Uint32Array(width * height);
  }
  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.width && y < this.height ? this.data[y * this.width + x]! : 0;
  }
  blit(source: Surface, sx: number, sy: number, width: number, height: number, dx: number, dy: number): void {
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
      const value = source.get(sx + i, sy + j);
      const x = dx + i, y = dy + j;
      if (value !== 0 && x >= 0 && y >= 0 && x < this.width && y < this.height) this.data[y * this.width + x] = value;
    }
  }
}

const blitter = (surface: Surface): Blitter<Surface> => ({ blit: (source, ...args) => surface.blit(source, ...args) });

/** Il valore di prova del pixel del mondo (a, b): diverso per ogni pixel, mai 0. */
const worldValue = (a: number, b: number): number => ((a + 5000) * 10007 + (b + 5000)) >>> 0 || 1;

/** Un pezzo di mondo dipinto dall'alto, con l'angolo in (x, y). */
function worldSurface(x: number, y: number, width: number, height: number): Surface {
  const surface = new Surface(width, height);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) surface.data[j * width + i] = worldValue(x + i, y + j);
  return surface;
}

describe('pavimento a rombo con sole copie di rettangoli', () => {
  it('le due passate mettono ogni pixel del mondo dove dice isoPixel, per tasselli in punti diversi della vista', () => {
    for (const [vx0, vy0] of [[0, 0], [256, -256], [-512, 768], [37, 11]]) {
      const size = 48;
      const rect = worldRectForView(vx0!, vy0!, size, size);
      const world = worldSurface(rect.x, rect.y, rect.width, rect.height);
      const rows = new Surface(size, rect.height);
      shearRows(blitter(rows), world, rect.x, rect.y, rect.width, rect.height, vx0!, size);
      const chunk = new Surface(size, size);
      shearColumns(blitter(chunk), rows, rect.y, rect.height, vx0!, size, vy0!);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const { a, b } = isoPixelSource(vx0! + x, vy0! + y);
        expect(chunk.get(x, y)).toBe(worldValue(a, b));
      }
    }
  });

  it('il pezzo di mondo da dipingere contiene ogni pixel che serve al tassello della vista', () => {
    const rect = worldRectForView(-100, 300, 64, 32);
    for (let y = 300; y < 332; y++) for (let x = -100; x < -36; x++) {
      const { a, b } = isoPixelSource(x, y);
      expect(a).toBeGreaterThanOrEqual(rect.x);
      expect(a).toBeLessThan(rect.x + rect.width);
      expect(b).toBeGreaterThanOrEqual(rect.y);
      expect(b).toBeLessThan(rect.y + rect.height);
    }
  });

  it('una stanza con il pavimento solo dentro i muri da un rombo senza buchi: i pixel fuori restano trasparenti', () => {
    const size = 64;
    const rect = worldRectForView(-32, 0, size, size);
    const world = new Surface(rect.width, rect.height);
    // Pavimento solo per a, b >= 0 (l'angolo della stanza in alto).
    for (let j = 0; j < rect.height; j++) for (let i = 0; i < rect.width; i++) {
      if (rect.x + i >= 0 && rect.y + j >= 0) world.data[j * rect.width + i] = 7;
    }
    const rows = new Surface(size, rect.height);
    shearRows(blitter(rows), world, rect.x, rect.y, rect.width, rect.height, -32, size);
    const chunk = new Surface(size, size);
    shearColumns(blitter(chunk), rows, rect.y, rect.height, -32, size, 0);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const { a, b } = isoPixelSource(x - 32, y);
      expect(chunk.get(x, y)).toBe(a >= 0 && b >= 0 ? 7 : 0);
    }
  });
});

describe('disegni frontali appoggiati ai muri di fondo', () => {
  it('la base del muro sta sulla riga sopra il primo pixel del pavimento, per i due muri', () => {
    for (const line of [24, 25]) {
      for (let x = -20; x < 20; x++) {
        // Il primo pixel del pavimento sotto il muro 'ne' viene dal pixel (x + line, line) del mondo.
        expect(wallFloorRow('ne', line, x)).toBe(isoPixel(x + line, line).y);
        expect(wallFloorRow('nw', line, x)).toBe(isoPixel(line, line - x).y);
      }
    }
    expect(wallColumn('ne', 24, 100)).toBe(76);
    expect(wallColumn('nw', 24, 100)).toBe(-76);
  });

  it('ogni colonna del disegno resta intera e scende come il bordo del pavimento, 1 pixel ogni 2', () => {
    const source = new Surface(9, 5);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 9; i++) source.data[j * 9 + i] = 100 * (i + 1) + j + 1;
    for (const wall of ['ne', 'nw'] as const) for (const x0 of [10, 11, -7]) {
      const line = 24;
      const bounds = wallPieceBounds(wall, line, x0, 9, 5);
      const target = new Surface(9, bounds.height);
      shearOntoWall(blitter(target), source, 0, 0, 9, 5, wall, line, x0, 0, x0, bounds.top);
      for (let u = 0; u < 9; u++) {
        const bottom = wallFloorRow(wall, line, x0 + u) - 1 - bounds.top;
        for (let j = 0; j < 5; j++) expect(target.get(u, bottom - 4 + j)).toBe(100 * (u + 1) + j + 1);
        // Sopra e sotto la colonna non c'e' nulla.
        expect(target.get(u, bottom + 1)).toBe(0);
        expect(target.get(u, bottom - 5)).toBe(0);
      }
      // Due colonne vicine differiscono al massimo di un pixel in altezza.
      for (let u = 1; u < 9; u++) {
        expect(Math.abs(wallFloorRow(wall, line, x0 + u) - wallFloorRow(wall, line, x0 + u - 1))).toBeLessThanOrEqual(1);
      }
    }
  });

  it('alzato di lift, il disegno sale di lift pixel', () => {
    const plain = wallPieceBounds('ne', 24, 0, 30, 10);
    const lifted = wallPieceBounds('ne', 24, 0, 30, 10, 6);
    expect(lifted.top).toBe(plain.top - 6);
    expect(lifted.height).toBe(plain.height);
  });
});
