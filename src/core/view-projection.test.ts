import { describe, expect, it } from 'vitest';
import {
  ISOMETRIC,
  TOP_DOWN,
  isoPixel,
  isoPixelSource,
  screenDirectionToWorld,
  viewBoundsOfWorld,
  worldBoundsOfView,
} from './view-projection';

describe('proiezioni della vista', () => {
  it('la vista dall alto e l identita', () => {
    expect(TOP_DOWN.toView(12.5, -7)).toEqual({ x: 12.5, y: -7 });
    expect(TOP_DOWN.toWorld(12.5, -7)).toEqual({ x: 12.5, y: -7 });
    expect(TOP_DOWN.depth(3, 9)).toBe(9);
    expect(TOP_DOWN.spread).toBeCloseTo(1, 12);
  });

  it("l'isometria 2:1 manda gli assi del mondo sulle diagonali e un tile da 32 in un rombo 64 x 32", () => {
    expect(ISOMETRIC.toView(32, 0)).toEqual({ x: 32, y: 16 });
    expect(ISOMETRIC.toView(0, 32)).toEqual({ x: -32, y: 16 });
    const corners = [ISOMETRIC.toView(0, 0), ISOMETRIC.toView(32, 0), ISOMETRIC.toView(32, 32), ISOMETRIC.toView(0, 32)];
    const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(64);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(32);
    // Conserva l'area: determinante 1.
    const [a, b, c, d] = ISOMETRIC.matrix;
    expect(a * d - b * c).toBe(1);
    expect(ISOMETRIC.spread).toBeCloseTo(Math.SQRT2, 12);
  });

  it('andata e ritorno fra mondo e vista restituiscono lo stesso punto', () => {
    for (const projection of [TOP_DOWN, ISOMETRIC]) {
      for (const [x, y] of [[0, 0], [123.25, -40.5], [-900, 1600], [1e4, 3]]) {
        const view = projection.toView(x!, y!);
        const back = projection.toWorld(view.x, view.y);
        expect(back.x).toBeCloseTo(x!, 9);
        expect(back.y).toBeCloseTo(y!, 9);
      }
    }
  });

  it('la profondita isometrica cresce verso chi guarda: in basso sullo schermo sta davanti', () => {
    expect(ISOMETRIC.depth(100, 100)).toBeGreaterThan(ISOMETRIC.depth(0, 0));
    // Due punti sulla stessa riga dello schermo hanno la stessa profondita'.
    const left = ISOMETRIC.toWorld(-50, 80), right = ISOMETRIC.toWorld(70, 80);
    expect(ISOMETRIC.depth(left.x, left.y)).toBeCloseTo(ISOMETRIC.depth(right.x, right.y), 9);
    expect(ISOMETRIC.depth(left.x, left.y)).toBeCloseTo(80, 9);
  });
});

describe('direzioni dello schermo nel mondo', () => {
  it('dall alto la direzione resta quella dei tasti', () => {
    expect(screenDirectionToWorld(TOP_DOWN, 0, -1)).toEqual({ x: 0, y: -1 });
    expect(screenDirectionToWorld(TOP_DOWN, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('in isometria W porta in alto sullo schermo e D a destra, alla stessa velocita nel mondo', () => {
    const up = screenDirectionToWorld(ISOMETRIC, 0, -1);
    expect(up.x).toBeCloseTo(-Math.SQRT1_2, 12);
    expect(up.y).toBeCloseTo(-Math.SQRT1_2, 12);
    const right = screenDirectionToWorld(ISOMETRIC, 1, 0);
    expect(right.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(right.y).toBeCloseTo(-Math.SQRT1_2, 12);
    for (const [dx, dy] of [[0, -1], [1, 0], [0.7071, -0.7071], [-1, 1], [0.3, 0.2]]) {
      const world = screenDirectionToWorld(ISOMETRIC, dx!, dy!);
      expect(world.length()).toBeCloseTo(Math.hypot(dx!, dy!), 9);
      // Disegnata, la direzione del mondo punta dove indicano i tasti.
      const drawn = ISOMETRIC.toView(world.x, world.y);
      expect(Math.atan2(drawn.y, drawn.x)).toBeCloseTo(Math.atan2(dy!, dx!), 9);
    }
  });
});

describe('rettangoli fra mondo e vista', () => {
  it('il rettangolo del mondo di una vista isometrica contiene tutti i suoi punti', () => {
    const bounds = worldBoundsOfView(ISOMETRIC, 100, -40, 640, 360);
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
      const world = ISOMETRIC.toWorld(100 + (640 * i) / 10, -40 + (360 * j) / 10);
      expect(world.x).toBeGreaterThanOrEqual(bounds.x0 - 1e-9);
      expect(world.x).toBeLessThanOrEqual(bounds.x1 + 1e-9);
      expect(world.y).toBeGreaterThanOrEqual(bounds.y0 - 1e-9);
      expect(world.y).toBeLessThanOrEqual(bounds.y1 + 1e-9);
    }
    expect(worldBoundsOfView(TOP_DOWN, 10, 20, 30, 40)).toEqual({ x0: 10, y0: 20, x1: 40, y1: 60 });
  });

  it('un rettangolo del mondo proiettato diventa il rombo atteso', () => {
    expect(viewBoundsOfWorld(ISOMETRIC, { x0: 0, y0: 0, x1: 256, y1: 256 })).toEqual({ x0: -256, y0: 0, x1: 256, y1: 256 });
  });
});

describe('isometria a pixel interi del pavimento', () => {
  it('e una biiezione: ogni pixel del mondo va in un pixel diverso e l inversa lo ritrova', () => {
    const seen = new Set<string>();
    for (let a = -40; a < 40; a++) for (let b = -40; b < 40; b++) {
      const { x, y } = isoPixel(a, b);
      const key = `${x},${y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(isoPixelSource(x, y)).toEqual({ a, b });
    }
  });

  it('ogni pixel della vista riceve un pixel del mondo', () => {
    for (let x = -60; x < 60; x++) for (let y = -60; y < 60; y++) {
      const { a, b } = isoPixelSource(x, y);
      expect(Number.isInteger(a) && Number.isInteger(b)).toBe(true);
      expect(isoPixel(a, b)).toEqual({ x, y });
    }
  });

  it('resta a meno di un pixel dalla proiezione continua e trasforma le righe in scalini 2:1', () => {
    for (let a = -20; a < 20; a++) for (let b = -20; b < 20; b++) {
      const pixel = isoPixel(a, b);
      const exact = ISOMETRIC.toView(a + 0.5, b + 0.5);
      expect(Math.abs(pixel.x + 0.5 - exact.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(pixel.y + 0.5 - exact.y)).toBeLessThanOrEqual(1);
    }
    // Una riga del mondo (b costante): due pixel a destra per ogni pixel in basso.
    const row = Array.from({ length: 8 }, (_, a) => isoPixel(a, 0));
    expect(row.map((p) => p.x)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(row.map((p) => p.y)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });

  it('un tile da 32 unita copre 1024 pixel della vista, in un rombo largo 63 e alto 32, e i tile vicini si incastrano', () => {
    const pixels = new Set<string>();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let a = 0; a < 32; a++) for (let b = 0; b < 32; b++) {
      const { x, y } = isoPixel(a, b);
      pixels.add(`${x},${y}`);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    expect(pixels.size).toBe(1024);
    expect([maxX - minX + 1, maxY - minY + 1]).toEqual([63, 32]);
    // Il tile accanto (a + 32) non sovrappone nessun pixel.
    for (let a = 32; a < 64; a++) for (let b = 0; b < 32; b++) {
      const { x, y } = isoPixel(a, b);
      expect(pixels.has(`${x},${y}`)).toBe(false);
    }
  });
});
