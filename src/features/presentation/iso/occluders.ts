/*
 * Profondita' nella vista isometrica. Le figure si disegnano dopo l'ambiente illuminato, quindi chi passa dietro un ostacolo
 * in piedi (colonna, massiccio, panca) gli finirebbe sopra. Come gia' per le colonne dall'alto, l'ostacolo si ridisegna sopra
 * chi gli sta dietro, prendendo i suoi pixel dalla copia della scena illuminata (luce vera) e un poco trasparente: chi sta
 * dietro si intravede. Qui la regola di chi sta dietro e l'ordine di disegno, senza DOM (per i test), piu' la ristampa.
 */

/** Un rettangolo della vista. */
export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Una figura da ordinare: il suo punto a terra nel mondo, l'ingombro nella vista e come si disegna. */
export interface IsoFigure {
  readonly x: number;
  readonly y: number;
  readonly box: ViewBox;
  draw(): void;
}

/** Un ostacolo in piedi gia' disegnato nella scena illuminata, che deve tornare davanti a chi gli sta dietro. */
export interface IsoOccluder {
  /** L'ingombro della sagoma nella vista. */
  readonly box: ViewBox;
  /** Vero se una figura con i piedi nel punto del mondo (`x`, `y`) sta dietro l'ostacolo. */
  isBehind(x: number, y: number): boolean;
  /** Ridisegna la sagoma (dalla scena ricordata) sopra cio' che c'e'. */
  stamp(): void;
}

/** Una figura sta dietro un blocco rettangolare se non lo ha superato ne' in x ne' in y (il blocco e' fra lei e chi guarda). */
export function behindRect(x1: number, y1: number): (x: number, y: number) => boolean {
  return (x, y) => x < x1 && y < y1;
}

/** Una figura sta dietro un cilindro se il suo punto a terra e' piu' lontano del centro, sulla diagonale della vista. */
export function behindCircle(cx: number, cy: number): (x: number, y: number) => boolean {
  const depth = cx + cy;
  return (x, y) => x + y < depth;
}

export function boxesOverlap(a: ViewBox, b: ViewBox): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * L'ordine di disegno: le figure per profondita' (x + y del punto a terra, come `ISOMETRIC.depth`); ogni ostacolo che ha
 * qualcuno dietro (e sovrapposto nella vista) si ristampa subito dopo l'ultima di quelle figure. Le figure davanti
 * all'ostacolo, sovrapposte e gia' disegnate prima della ristampa, si ridisegnano dopo: un ostacolo lungo puo' avere dietro
 * qualcuno piu' vicino a chi guarda di qualcun altro che gli sta davanti. Ridisegnare una figura nello stesso fotogramma
 * da' gli stessi pixel.
 */
export function orderWithOccluders(figures: readonly IsoFigure[], occluders: readonly IsoOccluder[]): (() => void)[] {
  const sorted = [...figures].sort((p, q) => p.x + p.y - (q.x + q.y));
  type Step = { readonly kind: 'figure'; readonly figure: IsoFigure } | { readonly kind: 'stamp'; readonly occluder: IsoOccluder };
  const steps: Step[] = sorted.map((figure) => ({ kind: 'figure', figure }));
  for (const occluder of occluders) {
    let last = -1;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      if (step.kind === 'figure' && occluder.isBehind(step.figure.x, step.figure.y) && boxesOverlap(step.figure.box, occluder.box)) last = i;
    }
    if (last < 0) continue;
    const redraw: Step[] = [];
    const seen = new Set<IsoFigure>();
    for (let i = 0; i <= last; i++) {
      const step = steps[i]!;
      if (step.kind !== 'figure' || seen.has(step.figure)) continue;
      seen.add(step.figure);
      if (!occluder.isBehind(step.figure.x, step.figure.y) && boxesOverlap(step.figure.box, occluder.box)) redraw.push(step);
    }
    steps.splice(last + 1, 0, { kind: 'stamp', occluder }, ...redraw);
  }
  return steps.map((step) => (step.kind === 'figure' ? () => step.figure.draw() : () => step.occluder.stamp()));
}

let scene: HTMLCanvasElement | null = null;
let scratch: HTMLCanvasElement | null = null;

/** Copia la scena illuminata prima delle figure: da qui le ristampe prendono i pixel veri degli ostacoli. */
export function rememberIsoScene(ctx: CanvasRenderingContext2D): void {
  const source = ctx.canvas;
  scene ??= document.createElement('canvas');
  if (scene.width !== source.width || scene.height !== source.height) {
    scene.width = source.width;
    scene.height = source.height;
  }
  const copy = scene.getContext('2d')!;
  copy.setTransform(1, 0, 0, 1, 0, 0);
  copy.globalCompositeOperation = 'copy';
  copy.drawImage(source, 0, 0);
  copy.globalCompositeOperation = 'source-over';
}

/** Trasparenza della ristampa: chi sta dietro si intravede (provvisoria, come per le colonne dall'alto). */
export const ISO_STAMP_ALPHA = 0.8;

/**
 * Ristampa sopra le figure i pixel della scena ricordata dentro la sagoma `mask` (opaca dove c'e' l'ostacolo), che nella
 * vista ha l'angolo alto a sinistra in (`left`, `top`). Il contesto deve essere solo traslato dalla camera.
 */
export function stampFromScene(ctx: CanvasRenderingContext2D, mask: CanvasImageSource, left: number, top: number, width: number, height: number): void {
  if (scene === null || width <= 0 || height <= 0) return;
  const view = ctx.getTransform();
  scratch ??= document.createElement('canvas');
  if (scratch.width < width || scratch.height < height) {
    scratch.width = Math.max(scratch.width, width);
    scratch.height = Math.max(scratch.height, height);
  }
  const paint = scratch.getContext('2d')!;
  paint.setTransform(1, 0, 0, 1, 0, 0);
  paint.globalCompositeOperation = 'source-over';
  paint.clearRect(0, 0, width, height);
  paint.drawImage(mask, 0, 0);
  paint.globalCompositeOperation = 'source-in';
  paint.drawImage(scene, left + view.e, top + view.f, width, height, 0, 0, width, height);
  paint.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha = ISO_STAMP_ALPHA;
  ctx.drawImage(scratch, 0, 0, width, height, left, top, width, height);
  ctx.restore();
}
