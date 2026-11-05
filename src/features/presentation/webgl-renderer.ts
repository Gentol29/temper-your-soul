import type * as PixiTypes from 'pixi.js';
import type * as PixiModules from './pixi-modules';

/*
 * Strato WebGL della rappresentazione, con PixiJS. Durante la migrazione il gioco disegna ancora la scena in Canvas 2D;
 * PixiJS disegna i suoi strati sulla propria tela e li compone nel contesto 2D nel punto esatto dell'ordine di disegno
 * (`compositePixi`), con la stessa trasformazione (camera e scostamenti dell'isometria). Cosi' la profondita' resta
 * quella della scena: i muri in primo piano coprono ancora cio' che sta dietro.
 *
 * PixiJS si carica alla prima richiesta, in modo asincrono: finche' non e' pronto, o se WebGL manca, chi chiama usa il
 * disegno Canvas 2D di sempre. Nessun riferimento a PixiJS fuori da `presentation/`: simulazione, rete e `game.ts` non
 * lo conoscono, e i test senza browser non lo caricano (import dinamico).
 */

/** Le parti di PixiJS disponibili allo strato WebGL (`pixi-modules.ts`). */
export type Pixi = typeof PixiModules;

export interface PixiLayer {
  readonly pixi: Pixi;
  readonly app: PixiTypes.Application;
}

type State = 'idle' | 'loading' | 'ready' | 'failed';
let state: State = 'idle';
let layer: PixiLayer | null = null;
let failure = '';

async function start(): Promise<void> {
  try {
    const pixi = await import('./pixi-modules');
    // Pixel art Hi-bit: campionamento nearest per ogni trama, nessuna sfumatura frazionaria.
    pixi.TextureSource.defaultOptions.scaleMode = 'nearest';
    const app = new pixi.Application();
    await app.init({
      preference: 'webgl',
      width: 1,
      height: 1,
      resolution: 1,
      antialias: false,
      backgroundAlpha: 0,
      // La tela si legge con drawImage subito dopo il disegno, nello stesso fotogramma.
      preserveDrawingBuffer: true,
      autoStart: false,
      sharedTicker: false,
    });
    app.ticker.stop();
    layer = { pixi, app };
    state = 'ready';
  } catch (error) {
    state = 'failed';
    failure = error instanceof Error ? error.message : String(error);
    console.warn('PixiJS/WebGL non disponibile: resta il disegno Canvas 2D.', error);
  }
}

/** Lo strato PixiJS se e' pronto; alla prima chiamata comincia a prepararlo. Null finche' non c'e' (o se WebGL manca). */
export function pixiLayer(): PixiLayer | null {
  if (state === 'ready') return layer;
  if (state === 'idle' && typeof document !== 'undefined') {
    state = 'loading';
    void start();
  }
  return null;
}

/** Quale disegno e' attivo, per il pannello Prestazioni (F2). */
export function rendererLabel(): string {
  if (state === 'ready') return 'WebGL · PixiJS';
  if (state === 'loading') return 'WebGL in preparazione';
  if (state === 'failed') return `Canvas 2D · WebGL non disponibile${failure ? ` (${failure.slice(0, 60)})` : ''}`;
  return 'Canvas 2D';
}

/** Vero se PixiJS non si puo' usare su questo browser: nessun altro tentativo. */
export function pixiFailed(): boolean {
  return state === 'failed';
}

/**
 * Disegna con PixiJS lo strato `group`, aggiornato da `build`, e lo compone nel contesto 2D al punto corrente della scena.
 * Lo stage riceve la trasformazione corrente del contesto, quindi `build` posiziona tutto in coordinate di mondo come il
 * codice 2D.
 * Falso (e strato disattivato) se il disegno WebGL fallisce: chi chiama ripiega sul Canvas 2D.
 */
export function compositePixi(ctx: CanvasRenderingContext2D, target: PixiLayer, group: PixiTypes.Container, build: () => void, operation: GlobalCompositeOperation = 'source-over'): boolean {
  const { app, pixi } = target;
  try {
    const canvas = ctx.canvas;
    if (app.renderer.width !== canvas.width || app.renderer.height !== canvas.height) app.renderer.resize(canvas.width, canvas.height);
    const m = ctx.getTransform();
    app.stage.setFromMatrix(new pixi.Matrix(m.a, m.b, m.c, m.d, m.e, m.f));
    // Ogni strato sta a una profondita' diversa della scena: in questa composizione si vede solo il suo.
    if (group.parent !== app.stage) app.stage.addChild(group);
    for (const child of app.stage.children) child.visible = child === group;
    build();
    app.renderer.render(app.stage);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // `lighter` per gli strati di luce: si sommano alla scena sotto, non solo al vuoto della tela di PixiJS.
    ctx.globalCompositeOperation = operation;
    ctx.drawImage(app.canvas, 0, 0);
    ctx.restore();
    return true;
  } catch (error) {
    state = 'failed';
    layer = null;
    failure = error instanceof Error ? error.message : String(error);
    console.warn('Disegno WebGL non riuscito: resta il disegno Canvas 2D.', error);
    return false;
  }
}
