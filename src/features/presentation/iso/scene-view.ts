import { ISOMETRIC, TOP_DOWN, type ViewProjection } from '../../../core/view-projection';
import { Vec2 } from '../../../core/vec2';

/*
 * Come la rappresentazione mette nella vista cio' che e' scritto in coordinate di mondo. Le funzioni di disegno sono nate
 * dall'alto: disegnano attorno a un punto del mondo P, con gli scostamenti verso l'alto dello schermo gia' sommati (piedi
 * 14 pixel sotto P, scritte sopra la testa). `SceneView` le porta nella vista senza riscriverle:
 * - `at`: le cose in piedi (figure, colonne, scritte, proiettili) traslate di un intero, cosi' P finisce nel suo punto della
 *   vista e il disegno resta dritto e nitido;
 * - `ground`: le forme piatte a terra (zone, cariche, cerchi di gioco), disegnate nel mondo sotto la matrice della proiezione;
 * - `delta`/`angle`: le direzioni (verso di una figura, rotta di un proiettile) come appaiono sullo schermo.
 * Dall'alto ogni metodo e' l'identita' e non tocca il contesto: la vista di sempre resta identica.
 */
export interface SceneView {
  readonly projection: ViewProjection;
  /** Vero in isometria: per i pochi punti che disegnano in modo diverso. */
  readonly iso: boolean;
  /**
   * La traslazione intera che porta cio' che si disegna attorno al punto del mondo (`x`, `y`) nel suo posto della vista,
   * alzato di `lift` pixel. Dall'alto e' sempre (0, 0).
   */
  shift(x: number, y: number, lift?: number): Vec2;
  /** Esegue `draw` (che disegna attorno a (`x`, `y`) come dall'alto) spostato con `shift`. Dall'alto chiama solo `draw`. */
  at(ctx: CanvasRenderingContext2D, x: number, y: number, lift: number, draw: () => void): void;
  /** Esegue `draw` (forme piatte in coordinate di mondo) sotto la matrice della proiezione. Dall'alto chiama solo `draw`. */
  ground(ctx: CanvasRenderingContext2D, draw: () => void): void;
  /** Un vettore del mondo come appare sullo schermo (non normalizzato). */
  delta(dx: number, dy: number): Vec2;
  /** L'angolo sullo schermo della direzione del mondo (`dx`, `dy`). */
  angle(dx: number, dy: number): number;
  /** Un punto del mondo nella vista. */
  point(x: number, y: number): Vec2;
}

/** Quanto sale sullo schermo il corpo di chi sta in piedi rispetto al punto di gioco: i piedi del personaggio (provvisorio). */
export const ISO_BODY_LIFT = 14;

const ZERO = Vec2.ZERO;

/** La vista dall'alto: nessuna trasformazione, nessuna chiamata in piu' sul contesto. */
export const TOP_DOWN_VIEW: SceneView = {
  projection: TOP_DOWN,
  iso: false,
  shift: () => ZERO,
  at: (_ctx, _x, _y, _lift, draw) => draw(),
  ground: (_ctx, draw) => draw(),
  delta: (dx, dy) => new Vec2(dx, dy),
  angle: (dx, dy) => Math.atan2(dy, dx),
  point: (x, y) => new Vec2(x, y),
};

function linearView(projection: ViewProjection): SceneView {
  const [a, b, c, d] = projection.matrix;
  const view: SceneView = {
    projection,
    iso: true,
    shift(x, y, lift = 0) {
      const p = projection.toView(x, y);
      return new Vec2(Math.round(p.x) - Math.round(x), Math.round(p.y) - Math.round(y) - Math.round(lift));
    },
    at(ctx, x, y, lift, draw) {
      const s = view.shift(x, y, lift);
      ctx.save();
      ctx.translate(s.x, s.y);
      draw();
      ctx.restore();
    },
    ground(ctx, draw) {
      ctx.save();
      ctx.transform(a, b, c, d, 0, 0);
      draw();
      ctx.restore();
    },
    delta: (dx, dy) => projection.toView(dx, dy),
    angle(dx, dy) {
      const v = projection.toView(dx, dy);
      return Math.atan2(v.y, v.x);
    },
    point: (x, y) => projection.toView(x, y),
  };
  return view;
}

/** La vista isometrica 2:1. */
export const ISO_VIEW: SceneView = linearView(ISOMETRIC);

/** La vista che corrisponde a una proiezione. */
export function sceneViewFor(projection: ViewProjection): SceneView {
  return projection.kind === 'isometric' ? ISO_VIEW : TOP_DOWN_VIEW;
}
