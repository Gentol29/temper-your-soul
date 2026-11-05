/*
 * Copie a pixel interi per l'isometria fatte solo con copie di rettangoli (drawImage senza scala): nessuna lettura dei pixel,
 * quindi funzionano anche aprendo dist/index.html da file://, dove leggere un canvas che ha disegnato un foglio PNG e' vietato.
 * Nessun pixel viene ricampionato: ogni pixel di partenza finisce in un pixel di arrivo, con lo stesso colore.
 *
 * Due operazioni:
 * - il pavimento: il pixel (a, b) del mondo visto dall'alto va nel pixel (a - b, ceil((a + b) / 2)) della vista (`isoPixel`).
 *   Si ottiene in due passate: ogni riga b si sposta di -b (colonna X = a - b), poi ogni colonna X scende di ceil(X / 2).
 * - i muri: un disegno frontale (facciata, portale, lesena) si appoggia su un muro di fondo spostando ogni sua colonna in
 *   verticale come il bordo del pavimento davanti a lui (2 pixel di lato, 1 di altezza).
 */

/** La sola operazione che serve: copiare un rettangolo di `source` in `(dx, dy)` senza scala. */
export interface Blitter<S> {
  blit(source: S, sx: number, sy: number, width: number, height: number, dx: number, dy: number): void;
}

/** Un `Blitter` sopra un contesto 2D vero. */
export function canvasBlitter(ctx: CanvasRenderingContext2D): Blitter<CanvasImageSource> {
  return {
    blit(source, sx, sy, width, height, dx, dy) {
      ctx.drawImage(source, sx, sy, width, height, dx, dy, width, height);
    },
  };
}

/**
 * Prima passata del pavimento: `world` contiene il rettangolo del mondo con l'angolo alto a sinistra in (`wx0`, `wy0`),
 * largo `ww` e alto `wh`. Ogni riga b va nella riga `b - wy0` di `target`, con il pixel (a, b) nella colonna `a - b - vx0`:
 * si tengono solo le colonne della vista [vx0, vx0 + vw).
 */
export function shearRows<S>(target: Blitter<S>, world: S, wx0: number, wy0: number, ww: number, wh: number, vx0: number, vw: number): void {
  for (let j = 0; j < wh; j++) {
    const b = wy0 + j;
    const a0 = Math.max(wx0, vx0 + b);
    const a1 = Math.min(wx0 + ww, vx0 + vw + b);
    if (a1 > a0) target.blit(world, a0 - wx0, j, a1 - a0, 1, a0 - b - vx0, j);
  }
}

/**
 * Seconda passata del pavimento: `rows` e' il risultato di `shearRows` (colonne della vista da `vx0`, righe del mondo da
 * `wy0`, alto `wh`). La riga b della colonna X va nella riga `b + ceil(X / 2) - vy0` di `target`. Le colonne 2k - 1 e 2k
 * scendono insieme, quindi si copiano a strisce larghe due pixel.
 */
export function shearColumns<S>(target: Blitter<S>, rows: S, wy0: number, wh: number, vx0: number, vw: number, vy0: number): void {
  let x = vx0;
  const end = vx0 + vw;
  while (x < end) {
    // Una colonna dispari scende come la pari che la segue.
    const width = Math.min((x & 1) !== 0 ? 2 : 1, end - x);
    target.blit(rows, x - vx0, 0, width, wh, x - vx0, wy0 + Math.ceil(x / 2) - vy0);
    x += width;
  }
}

/** Il rettangolo del mondo (interi, angolo e misure) che serve a riempire il rettangolo della vista dato. */
export function worldRectForView(vx0: number, vy0: number, vw: number, vh: number): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  // Il pixel (X, Y) della vista viene dal pixel del mondo con a + b in {2Y - 1, 2Y} e a - b = X.
  const sumMin = 2 * vy0 - 1;
  const sumMax = 2 * (vy0 + vh - 1);
  const diffMin = vx0;
  const diffMax = vx0 + vw - 1;
  const x = Math.floor((sumMin + diffMin) / 2);
  const y = Math.floor((sumMin - diffMax) / 2);
  const x1 = Math.ceil((sumMax + diffMax) / 2);
  const y1 = Math.ceil((sumMax - diffMin) / 2);
  return { x, y, width: x1 - x + 1, height: y1 - y + 1 };
}

/** Quale muro di fondo: 'ne' sta sulla riga y = costante del mondo (in alto a destra), 'nw' sulla colonna x = costante (in alto a sinistra). */
export type BackWall = 'ne' | 'nw';

/**
 * La riga della vista del primo pixel del pavimento sotto il muro, nella colonna X della vista, per il muro sulla linea del
 * mondo `line` (y = line per 'ne', x = line per 'nw'). Il muro si appoggia sulla riga sopra: `wallFloorRow(...) - 1`.
 */
export function wallFloorRow(wall: BackWall, line: number, x: number): number {
  // 'ne': pixel (X + line, line) -> ceil((X + 2 line) / 2) = line + ceil(X / 2). 'nw': pixel (line, line - X) -> line - floor(X / 2).
  return wall === 'ne' ? line + Math.ceil(x / 2) : line - Math.floor(x / 2);
}

/** La colonna della vista di un punto del muro: per 'ne' il punto (a, line), per 'nw' il punto (line, b). */
export function wallColumn(wall: BackWall, line: number, along: number): number {
  return wall === 'ne' ? along - line : line - along;
}

/**
 * Appoggia sul muro di fondo un disegno frontale (`source`, rettangolo `sx, sy, sw, sh`): la sua colonna u va nella colonna
 * `x0 + u` della vista e il suo bordo basso sta `lift` pixel sopra il pavimento del muro. Le colonne che scendono insieme si
 * copiano in strisce. `originY` e' la riga della vista che corrisponde alla riga 0 di `target` (per disegnare in un canvas
 * di appoggio); 0 se `target` e' gia' nella vista.
 */
export function shearOntoWall<S>(target: Blitter<S>, source: S, sx: number, sy: number, sw: number, sh: number, wall: BackWall, line: number, x0: number, lift = 0, originX = 0, originY = 0): void {
  let u = 0;
  while (u < sw) {
    const x = x0 + u;
    const row = wallFloorRow(wall, line, x);
    // Quante colonne di fila restano alla stessa altezza (una o due).
    let width = 1;
    while (u + width < sw && wallFloorRow(wall, line, x + width) === row) width++;
    target.blit(source, sx + u, sy, width, sh, x - originX, row - lift - sh - originY);
    u += width;
  }
}

/**
 * Misure del canvas che contiene un disegno largo `sw` e alto `sh` appoggiato al muro da `x0`: si disegna con
 * `shearOntoWall(..., originX = x0, originY = top)` e poi in vista nel punto (`x0`, `top`).
 */
export function wallPieceBounds(wall: BackWall, line: number, x0: number, sw: number, sh: number, lift = 0): { readonly top: number; readonly height: number } {
  let top = Infinity;
  let bottom = -Infinity;
  for (let u = 0; u < sw; u++) {
    const row = wallFloorRow(wall, line, x0 + u);
    top = Math.min(top, row - lift - sh);
    bottom = Math.max(bottom, row - lift);
  }
  return { top, height: bottom - top };
}
