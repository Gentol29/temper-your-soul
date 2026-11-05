import { Vec2 } from './vec2';

/*
 * Come il piano del mondo (quello della simulazione, sempre visto dall'alto) diventa la vista disegnata. Solo rappresentazione:
 * la simulazione, le collisioni e la rete non la conoscono. `topdown` e' l'identita', la vista di sempre. `isometric` e'
 * l'isometria 2:1 della pixel art: l'asse x del mondo scende verso destra, l'asse y verso sinistra, e un quadrato del pavimento
 * diventa un rombo largo il doppio dell'altezza (32 unita' -> 64 x 32 pixel). Conserva l'area (determinante 1): ogni pixel del
 * pavimento visto dall'alto diventa esattamente un pixel della vista, senza perderne ne' duplicarne nessuno (`isoPixel`).
 */

export type ViewProjectionKind = 'topdown' | 'isometric';

/** Rettangolo allineato agli assi, estremi inclusi (`x0 <= x1`, `y0 <= y1`). */
export interface AxisRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface ViewProjection {
  readonly kind: ViewProjectionKind;
  /** Parte lineare come gli argomenti `a, b, c, d` di `ctx.transform`: vista = (a*x + c*y, b*x + d*y). */
  readonly matrix: readonly [number, number, number, number];
  /** Massimo allungamento di un vettore del mondo nella vista (valore singolare maggiore): allarga i margini di visibilita'. */
  readonly spread: number;
  /** Un punto (o un vettore) del pavimento del mondo nella vista. */
  toView(x: number, y: number): Vec2;
  /** Un punto (o un vettore) della vista sul pavimento del mondo. */
  toWorld(x: number, y: number): Vec2;
  /** Profondita' di disegno di un punto del pavimento: chi ne ha di piu' sta piu' vicino a chi guarda e copre gli altri. */
  depth(x: number, y: number): number;
}

class LinearProjection implements ViewProjection {
  readonly spread: number;
  private readonly inverse: readonly [number, number, number, number];

  constructor(
    readonly kind: ViewProjectionKind,
    readonly matrix: readonly [number, number, number, number],
  ) {
    const [a, b, c, d] = matrix;
    const det = a * d - b * c;
    this.inverse = [d / det, -b / det, -c / det, a / det];
    // Valore singolare maggiore della matrice [[a, c], [b, d]].
    const sum = a * a + b * b + c * c + d * d;
    this.spread = Math.sqrt((sum + Math.sqrt(Math.max(0, sum * sum - 4 * det * det))) / 2);
  }

  toView(x: number, y: number): Vec2 {
    // Dall'alto si restituiscono gli stessi numeri, senza aritmetica: la vista di sempre resta identica al bit.
    if (this.kind === 'topdown') return new Vec2(x, y);
    const [a, b, c, d] = this.matrix;
    return new Vec2(a * x + c * y, b * x + d * y);
  }

  toWorld(x: number, y: number): Vec2 {
    if (this.kind === 'topdown') return new Vec2(x, y);
    const [a, b, c, d] = this.inverse;
    return new Vec2(a * x + c * y, b * x + d * y);
  }

  depth(x: number, y: number): number {
    if (this.kind === 'topdown') return y;
    const [, b, , d] = this.matrix;
    return b * x + d * y;
  }
}

/** La vista dall'alto: mondo e vista coincidono. */
export const TOP_DOWN: ViewProjection = new LinearProjection('topdown', [1, 0, 0, 1]);

/** Isometria 2:1: vista = (x - y, (x + y) / 2). */
export const ISOMETRIC: ViewProjection = new LinearProjection('isometric', [1, 0.5, -1, 0.5]);

export const VIEW_PROJECTIONS: Readonly<Record<ViewProjectionKind, ViewProjection>> = { topdown: TOP_DOWN, isometric: ISOMETRIC };

/**
 * Una direzione data sullo schermo (frecce, WASD, levetta) diventa la direzione del mondo che, disegnata, punta dalla stessa
 * parte. La lunghezza resta quella dell'ingresso: la velocita' nel mondo non cambia con la proiezione.
 */
export function screenDirectionToWorld(projection: ViewProjection, dx: number, dy: number): Vec2 {
  if (projection.kind === 'topdown') return new Vec2(dx, dy);
  const length = Math.hypot(dx, dy);
  if (length === 0) return Vec2.ZERO;
  const world = projection.toWorld(dx, dy);
  return world.mul(length / world.length());
}

/** Il rettangolo del mondo che contiene i quattro angoli del rettangolo di vista dato. */
export function worldBoundsOfView(projection: ViewProjection, left: number, top: number, width: number, height: number): AxisRect {
  return boundsOf([
    projection.toWorld(left, top),
    projection.toWorld(left + width, top),
    projection.toWorld(left, top + height),
    projection.toWorld(left + width, top + height),
  ]);
}

/** Il rettangolo della vista che contiene il rettangolo del mondo dato, proiettato. */
export function viewBoundsOfWorld(projection: ViewProjection, rect: AxisRect): AxisRect {
  return boundsOf([
    projection.toView(rect.x0, rect.y0),
    projection.toView(rect.x1, rect.y0),
    projection.toView(rect.x0, rect.y1),
    projection.toView(rect.x1, rect.y1),
  ]);
}

function boundsOf(points: readonly Vec2[]): AxisRect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const point of points) {
    x0 = Math.min(x0, point.x); y0 = Math.min(y0, point.y);
    x1 = Math.max(x1, point.x); y1 = Math.max(y1, point.y);
  }
  return { x0, y0, x1, y1 };
}

/**
 * La versione a pixel interi dell'isometria, per i raster del pavimento: il pixel (`a`, `b`) del mondo visto dall'alto va nel
 * pixel (a - b, ceil((a + b) / 2)) della vista. E' una biiezione degli interi: ogni pixel del mondo finisce in un pixel diverso
 * e ogni pixel della vista ne riceve uno, quindi texture, contorni e tavolozza restano identici, solo disposti a rombo (le righe
 * diventano scalini 2:1). Scarta di meno di un pixel rispetto a `ISOMETRIC.toView`.
 */
export function isoPixel(a: number, b: number): { readonly x: number; readonly y: number } {
  // `|| 0` evita lo zero negativo di Math.ceil(-0.5).
  return { x: a - b, y: Math.ceil((a + b) / 2) || 0 };
}

/** L'inversa di `isoPixel`: il pixel del mondo che finisce nel pixel (`x`, `y`) della vista. */
export function isoPixelSource(x: number, y: number): { readonly a: number; readonly b: number } {
  // a - b = x e a + b ha la stessa parita' di x: vale 2y se x e' pari, 2y - 1 se e' dispari.
  const sum = (x & 1) === 0 ? 2 * y : 2 * y - 1;
  return { a: (sum + x) / 2, b: (sum - x) / 2 };
}
