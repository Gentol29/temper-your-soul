import { blockerAt, pillarAt, type ArenaDefinition, type ArenaThemeId, type Pillar } from '../../arena/arena';
import { Vec2 } from '../../../core/vec2';
import { Camera } from '../../../core/camera';
import { faceSpots } from '../themes/decor';
import { drawLight } from '../lights';
import { forScatter, sceneryNoise, sceneryPick, sceneryPieces, scenerySheet } from '../themes/scenery';
import type { SceneryPiece } from '../themes/scenery-atlas';
import { drawTile, tileAt, tileSheet, TILE_SIZE } from '../themes/tiles';
import type { TileMaterial } from '../themes/tile-atlas';
import type { IsoArtFrame } from './iso-theme';
import { behindCircle, stampFromScene, type IsoOccluder } from './occluders';
import { canvasBlitter, shearColumns, shearOntoWall, shearRows, wallFloorRow, wallPieceBounds, type BackWall } from './iso-shear';

/*
 * La scenografia isometrica di un tema, dai suoi fogli (facciate, lesene, stendardi, pilastri, arredi, superfici):
 * muri di fondo, bordi davanti, arredi, colonne sui basamenti. Tutto a pixel interi: le superfici a terra sono raster
 * disposti a rombo, i disegni frontali appoggiati ai muri colonna per colonna, i pezzi in piedi dritti nel loro punto.
 * Solo aspetto: muri e basamenti stanno sulle linee e sui cerchi di gioco di `ArenaDefinition`.
 */

/** Misure provvisorie della scenografia isometrica (pixel della vista). */
export const ISO_SCENERY = {
  /** Pietra che sale sopra le facciate dei muri di fondo, prima del buio. */
  wallFill: 96,
  /** Altezza del basamento delle colonne. */
  plinth: 8,
  /** Quanto il bordo davanti si alza sul pavimento e quanto scende il dirupo nel buio. */
  parapet: 10,
  cliff: 44,
  /** Altezza delle applique sui muri di fondo (sopra la base). */
  sconce: 30,
  /** Quota della larghezza del basamento che un pezzo puo' coprire, al massimo e al minimo. */
  pieceMax: 0.95,
  pieceMin: 0.45,
} as const;

function canvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, width);
  c.height = Math.max(1, height);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return c;
}

/** Dipinge con una superficie del tema il rettangolo del mondo (coordinate del contesto = mondo). */
function paintSurface(ctx: CanvasRenderingContext2D, theme: ArenaThemeId, material: TileMaterial, x0: number, y0: number, w: number, h: number): void {
  const sheet = tileSheet(theme);
  if (sheet === null) return;
  for (let y = Math.floor(y0 / TILE_SIZE) * TILE_SIZE; y < y0 + h; y += TILE_SIZE) {
    for (let x = Math.floor(x0 / TILE_SIZE) * TILE_SIZE; x < x0 + w; x += TILE_SIZE) {
      const tile = tileAt(theme, material, x, y, 0);
      if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
    }
  }
}

/**
 * Un rettangolo del mondo dipinto dall'alto da `paint` (contesto in coordinate di mondo, gia' ritagliato al rettangolo
 * solo per misura: `paint` deve restare dentro) e disposto a rombo: canvas e angolo alto a sinistra nella vista.
 */
export function permutedRect(paint: (ctx: CanvasRenderingContext2D) => void, x0: number, y0: number, w: number, h: number): { readonly canvas: HTMLCanvasElement; readonly left: number; readonly top: number } {
  const world = canvas(w, h);
  const painter = world.getContext('2d')!;
  painter.translate(-x0, -y0);
  paint(painter);
  const left = x0 - (y0 + h - 1);
  const width = w + h - 1;
  const top = Math.ceil((x0 + y0) / 2);
  const height = Math.ceil((x0 + w - 1 + y0 + h - 1) / 2) - top + 1;
  const rows = canvas(width, h);
  shearRows(canvasBlitter(rows.getContext('2d')!), world, x0, y0, w, h, left, width);
  const out = canvas(width, height);
  shearColumns(canvasBlitter(out.getContext('2d')!), rows, y0, h, left, width, top);
  return { canvas: out, left, top };
}

// --- Muri di fondo ---------------------------------------------------------------------------------------------------

const wallPieces = new Map<string, { readonly canvas: HTMLCanvasElement; readonly top: number }>();

/**
 * Un disegno frontale (gia' composto in `source`) appoggiato al muro dalla colonna `x0` della vista, `lift` pixel sopra la
 * base, in cache per forma (la forma dipende solo dalla parita' della colonna).
 */
function wallPiece(key: string, source: () => CanvasImageSource, sw: number, sh: number, wall: BackWall, line: number, x0: number, lift: number): { readonly canvas: HTMLCanvasElement; readonly x: number; readonly y: number } {
  const parity = x0 & 1;
  const id = `${key}|${wall}|${parity}|${sw}x${sh}`;
  let piece = wallPieces.get(id);
  if (piece === undefined) {
    const shape = wallPieceBounds(wall, 0, parity, sw, sh, 0);
    const out = canvas(sw, shape.height);
    shearOntoWall(canvasBlitter(out.getContext('2d')!), source(), 0, 0, sw, sh, wall, 0, parity, 0, parity, shape.top);
    piece = { canvas: out, top: shape.top };
    wallPieces.set(id, piece);
  }
  const bounds = wallPieceBounds(wall, line, x0, sw, sh, lift);
  return { canvas: piece.canvas, x: x0, y: bounds.top };
}

/** Un pezzo del foglio ritagliato in un canvas suo (per comporlo o appoggiarlo al muro). */
function cut(sheet: HTMLImageElement, piece: SceneryPiece, width = piece.w): HTMLCanvasElement {
  const c = canvas(width, piece.h);
  c.getContext('2d')!.drawImage(sheet, piece.x, piece.y, width, piece.h, 0, 0, width, piece.h);
  return c;
}

/** Modulo di facciata con la pietra che sale sopra e si spegne nel buio: un solo disegno frontale alto. */
function facadeColumn(theme: ArenaThemeId, sheet: HTMLImageElement, module: SceneryPiece, width: number): HTMLCanvasElement {
  const fill = ISO_SCENERY.wallFill;
  const c = canvas(width, fill + module.h);
  const ctx = c.getContext('2d')!;
  paintSurface(ctx, theme, 'wall', 0, 0, width, fill);
  for (const [offset, alpha] of [[72, '50'], [48, '90'], [24, 'c8'], [0, 'f0']] as const) {
    ctx.fillStyle = `#050408${alpha}`;
    ctx.fillRect(0, offset, width, 24);
  }
  ctx.drawImage(sheet, module.x, module.y, width, module.h, 0, fill, width, module.h);
  return c;
}

/** Il tratto di muro di fondo `wall` fra le colonne `from` e `to` della vista (escluso `to`), con moduli dal foglio. */
function drawBackWall(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId, wall: BackWall, from: number, to: number, salt: number): void {
  const sheet = scenerySheet(theme);
  const modules = sceneryPieces(theme, 'facade');
  if (sheet === null || tileSheet(theme) === null || modules.length === 0) return;
  const line = frame.arena.wallThickness;
  const width = modules[0]!.w;
  const view = frame.camera;
  const viewLeft = view.position.x - 200, viewRight = view.position.x + view.width + 200;
  // Moduli dal bordo sinistro del tratto, di larghezza fissa; l'ultimo si taglia.
  for (let k = 0; from + k * width < to; k++) {
    const x0 = from + k * width;
    const w = Math.min(width, to - x0);
    if (x0 + w < viewLeft || x0 > viewRight) continue;
    const index = Math.floor(sceneryNoise(k, 3 + salt, frame.arena.width) * modules.length);
    const module = modules[Math.min(modules.length - 1, index)]!;
    const piece = wallPiece(`${theme}|facade|${index}`, () => facadeColumn(theme, sheet, module, w), w, ISO_SCENERY.wallFill + module.h, wall, line, x0, 0);
    ctx.drawImage(piece.canvas, piece.x, piece.y);
  }
  const pilasters = sceneryPieces(theme, 'pilaster');
  const hangs = sceneryPieces(theme, 'hang');
  for (let k = 0; from + k * width <= to; k++) {
    const joint = from + k * width;
    if (joint < viewLeft || joint > viewRight) continue;
    const h = sceneryNoise(k, 11 + salt, frame.arena.width);
    if (h < 0.42 && hangs.length > 0 && joint + width <= to) {
      const hang = sceneryPick(hangs, h / 0.42)!;
      const x0 = Math.round(joint + width * (0.3 + sceneryNoise(k, 13 + salt) * 0.4) - hang.w / 2);
      const piece = wallPiece(`${theme}|hang|${hang.x},${hang.y}`, () => cut(sheet, hang), hang.w, hang.h, wall, line, x0, 4);
      ctx.drawImage(piece.canvas, piece.x, piece.y);
    }
    const pilaster = sceneryPick(pilasters, sceneryNoise(k, 7 + salt));
    if (pilaster !== undefined) {
      const x0 = Math.round(joint - pilaster.w / 2);
      const piece = wallPiece(`${theme}|pilaster|${pilaster.x},${pilaster.y}`, () => cut(sheet, pilaster), pilaster.w, pilaster.h, wall, line, x0, 0);
      ctx.drawImage(piece.canvas, piece.x, piece.y);
    }
  }
}

/**
 * I due muri di fondo: in alto a destra quello sulla linea y = muro del mondo (con le porte), in alto a sinistra quello
 * sulla linea x = muro. Si incontrano nell'angolo in alto, coperto da una lesena.
 */
export function drawIsoBackWalls(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId): void {
  const { arena } = frame;
  const t = arena.wallThickness;
  // Colonne della vista: 'ne' da 0 (angolo) a W - t; 'nw' da t - H (angolo a sinistra) fino a -1.
  drawBackWall(ctx, frame, theme, 'ne', 0, arena.width - t, 0);
  drawBackWall(ctx, frame, theme, 'nw', t - arena.height, 0, 17);
}

/** Dove sta un'applique sul muro: il punto della vista in cui disegnare (x, y) della torcia dall'alto. */
export function sconceAnchor(wall: BackWall, line: number, along: number): { readonly x: number; readonly y: number } {
  const x = wall === 'ne' ? along - line : line - along;
  return { x, y: wallFloorRow(wall, line, x) - 1 - ISO_SCENERY.sconce };
}

// --- Bordi davanti ---------------------------------------------------------------------------------------------------

const frontPieces = new Map<string, { readonly canvas: HTMLCanvasElement; readonly left: number; readonly top: number }>();

/** Il parapetto e il dirupo di un tratto del bordo davanti, in cache per mappa, tratto e buio dell'ambiente. */
function frontSegment(arena: ArenaDefinition, theme: ArenaThemeId, edge: 'sw' | 'se', from: number, length: number, ambient: string): { readonly canvas: HTMLCanvasElement; readonly left: number; readonly top: number } {
  const key = `${arena.id}|${arena.width}x${arena.height}|${theme}|${edge}|${from}|${length}|${ambient}`;
  let segment = frontPieces.get(key);
  if (segment !== undefined) return segment;
  const t = arena.wallThickness;
  const { parapet, cliff } = ISO_SCENERY;
  // La cima: la fascia del muro (spessore t) dipinta dall'alto con la sua pietra, scurita come fuori dalla luce.
  const rect = edge === 'sw' ? { x: from, y: arena.height - t, w: length, h: t } : { x: arena.width - t, y: from, w: t, h: length };
  const capTop = permutedRect((ctx) => {
    paintSurface(ctx, theme, 'cap', rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ambient;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    // Filo chiaro verso la stanza, scuro verso il vuoto.
    ctx.fillStyle = '#5c6272';
    if (edge === 'sw') ctx.fillRect(rect.x, rect.y, rect.w, 1); else ctx.fillRect(rect.x, rect.y, 1, rect.h);
    ctx.fillStyle = '#23262e';
    if (edge === 'sw') ctx.fillRect(rect.x, rect.y + rect.h - 1, rect.w, 1); else ctx.fillRect(rect.x + rect.w - 1, rect.y, 1, rect.h);
  }, rect.x, rect.y, rect.w, rect.h);
  // La faccia esterna: pietra del muro che scende dal filo esterno e sparisce nel buio.
  const faceWidth = edge === 'sw' ? length : length;
  const face = canvas(faceWidth, parapet + cliff);
  const paint = face.getContext('2d')!;
  paintSurface(paint, theme, 'wall', 0, 0, faceWidth, parapet + cliff);
  paint.globalCompositeOperation = 'multiply';
  paint.fillStyle = ambient;
  paint.fillRect(0, 0, faceWidth, parapet + cliff);
  paint.globalCompositeOperation = 'source-over';
  for (const [offset, alpha] of [[parapet + 4, '50'], [parapet + 14, '90'], [parapet + 24, 'c8'], [parapet + 34, 'f0']] as const) {
    paint.fillStyle = `#050408${alpha}`;
    paint.fillRect(0, offset, faceWidth, parapet + cliff - offset);
  }
  // 'sw' sta sulla linea y = H come un muro 'ne'; 'se' sulla linea x = W come un muro 'nw' (colonne da destra a sinistra).
  const wall: BackWall = edge === 'sw' ? 'ne' : 'nw';
  const line = edge === 'sw' ? arena.height : arena.width;
  // Colonna della vista piu' a sinistra del tratto: 'sw' X = a - H; 'se' X = W - b, che decresce con b.
  const x0 = edge === 'sw' ? from - arena.height : arena.width - (from + length - 1);
  const bounds = wallPieceBounds(wall, line, x0, faceWidth, parapet + cliff, -cliff);
  // Il canvas finale contiene cima e faccia.
  const left = Math.min(capTop.left, x0);
  const top = Math.min(capTop.top - parapet, bounds.top);
  const right = Math.max(capTop.left + capTop.canvas.width, x0 + faceWidth);
  const bottom = Math.max(capTop.top - parapet + capTop.canvas.height, bounds.top + bounds.height);
  const out = canvas(right - left, bottom - top);
  const ctx = out.getContext('2d')!;
  shearOntoWall(canvasBlitter(ctx), face, 0, 0, faceWidth, parapet + cliff, wall, line, x0, -cliff, left, top);
  ctx.drawImage(capTop.canvas, capTop.left - left, capTop.top - parapet - top);
  segment = { canvas: out, left, top };
  frontPieces.set(key, segment);
  return segment;
}

/** Lunghezza dei tratti in cache dei bordi davanti. */
const FRONT_STEP = 256;

/**
 * I due bordi davanti (in basso a sinistra la linea y = H, in basso a destra la linea x = W): un parapetto basso con il
 * filo chiaro verso la stanza e, fuori, il dirupo che scende nel buio. Davanti a tutte le figure. `gap` lascia un vuoto
 * nel bordo in basso a sinistra (l'ingresso), da `gap.from` a `gap.to` in x del mondo.
 */
export function drawIsoFrontEdges(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId, gap?: { readonly from: number; readonly to: number }): void {
  if (tileSheet(theme) === null) return;
  const { arena, camera, ambient } = frame;
  const viewLeft = camera.position.x - 300, viewRight = camera.position.x + camera.width + 300;
  const viewTop = camera.position.y - 300, viewBottom = camera.position.y + camera.height + 300;
  const visible = (s: { canvas: HTMLCanvasElement; left: number; top: number }): boolean =>
    s.left < viewRight && s.left + s.canvas.width > viewLeft && s.top < viewBottom && s.top + s.canvas.height > viewTop;
  for (let from = 0; from < arena.width; from += FRONT_STEP) {
    const parts = gap === undefined ? [[from, Math.min(arena.width, from + FRONT_STEP)]] : splitAround(from, Math.min(arena.width, from + FRONT_STEP), gap);
    for (const [a, b] of parts) {
      if (b! <= a!) continue;
      const segment = frontSegment(arena, theme, 'sw', a!, b! - a!, ambient);
      if (visible(segment)) ctx.drawImage(segment.canvas, segment.left, segment.top);
    }
  }
  for (let from = 0; from < arena.height; from += FRONT_STEP) {
    const segment = frontSegment(arena, theme, 'se', from, Math.min(arena.height, from + FRONT_STEP) - from, ambient);
    if (visible(segment)) ctx.drawImage(segment.canvas, segment.left, segment.top);
  }
}

function splitAround(a: number, b: number, gap: { readonly from: number; readonly to: number }): number[][] {
  if (gap.to <= a || gap.from >= b) return [[a, b]];
  return [[a, Math.max(a, gap.from)], [Math.min(b, gap.to), b]];
}

// --- Arredi bassi ----------------------------------------------------------------------------------------------------

/**
 * Gli arredi del foglio che sono lastre piatte viste dall'alto (posizione nel foglio "x,y"): in piedi sembrerebbero
 * cartelli, quindi in isometria si saltano.
 */
export const FLAT_SCATTER: Readonly<Partial<Record<ArenaThemeId, readonly string[]>>> = { crypt: ['146,235', '195,235'] };

/** Gli arredi bassi in piedi (macerie, ossa, candele): dritti, con la base nel loro punto della vista, sotto le figure. */
export function drawIsoScatter(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId): void {
  const sheet = scenerySheet(theme);
  if (sheet === null) return;
  const { view, camera, clock, arena } = frame;
  const flat = FLAT_SCATTER[theme] ?? [];
  forScatter(arena, camera, theme, 160, (piece, x, y, h) => {
    if (flat.includes(`${piece.x},${piece.y}`)) return;
    // Niente arredi nei pozzi, sui massicci o sotto i basamenti delle colonne.
    const base = new Vec2(x, y);
    if (blockerAt(arena, base, 12) !== undefined || pillarAt(arena, base, 16) !== undefined) return;
    const at = view.point(x, y);
    const left = Math.round(at.x - piece.w / 2), top = Math.round(at.y) - piece.h;
    if (left > camera.position.x + camera.width || left + piece.w < camera.position.x || top > camera.position.y + camera.height || top + piece.h < camera.position.y) return;
    ctx.drawImage(sheet, piece.x, piece.y, piece.w, piece.h, left, top, piece.w, piece.h);
    const light = piece.light;
    if (light !== undefined) {
      const pulse = Math.sin(clock * (1.6 + h * 3) + x * 0.02);
      drawLight(ctx, left + light.x, top + light.y, light.color, light.radius + pulse * 4, light.intensity * (0.85 + pulse * 0.15));
    }
  });
}

// --- Colonne sui basamenti -------------------------------------------------------------------------------------------

/** Una colonna pronta: basamento e pezzo in un canvas, con l'angolo nella vista e la luce del pezzo. */
interface IsoPillarArt {
  readonly canvas: HTMLCanvasElement;
  readonly left: number;
  readonly top: number;
  readonly light?: { readonly x: number; readonly y: number; readonly color: string; readonly radius: number; readonly intensity: number };
}

const pillarArts = new WeakMap<Pillar, { readonly key: string; readonly art: IsoPillarArt }>();

/** Il pezzo del foglio per una colonna di raggio `r` sul basamento largo `width` pixel. */
export function pillarPieceFor(pieces: readonly SceneryPiece[], width: number, h: number): SceneryPiece | undefined {
  if (pieces.length === 0) return undefined;
  const fits = pieces.filter((piece) => piece.w <= width * ISO_SCENERY.pieceMax && piece.w >= width * ISO_SCENERY.pieceMin);
  if (fits.length > 0) return sceneryPick(fits, h);
  const under = pieces.filter((piece) => piece.w <= width * ISO_SCENERY.pieceMax).sort((a, b) => b.w - a.w);
  return under[0] ?? [...pieces].sort((a, b) => a.w - b.w)[0];
}

/**
 * Il basamento di una colonna: il suo cerchio di collisione dipinto dall'alto con la pietra della cima dei muri, un filo
 * scuro sul bordo, disposto a rombo (ellisse larga 2 sqrt2 r e alta sqrt2 r: esattamente l'ingombro di gioco) e alzato
 * con un fianco piu' scuro. Restituisce il canvas e l'angolo nella vista (la base del fianco sta sul pavimento).
 */
function plinth(theme: ArenaThemeId, pillar: Pillar): { readonly canvas: HTMLCanvasElement; readonly left: number; readonly top: number } {
  const r = pillar.radius;
  const cx = Math.round(pillar.position.x), cy = Math.round(pillar.position.y);
  const x0 = cx - Math.ceil(r), y0 = cy - Math.ceil(r), size = Math.ceil(r) * 2 + 1;
  const inDisc = (x: number, y: number): boolean => Math.hypot(x + 0.5 - pillar.position.x, y + 0.5 - pillar.position.y) <= r;
  const paintDisc = (ctx: CanvasRenderingContext2D, dark: boolean): void => {
    paintSurface(ctx, theme, 'cap', x0, y0, size, size);
    if (dark) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#5a5866';
      ctx.fillRect(x0, y0, size, size);
    }
    // Ritaglio a pixel interi: fuori dal cerchio si cancella riga per riga.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (let y = y0; y < y0 + size; y++) {
      let first = -1, last = -1;
      for (let x = x0; x < x0 + size; x++) if (inDisc(x, y)) { if (first < 0) first = x; last = x; }
      if (first < 0) ctx.fillRect(x0, y, size, 1);
      else {
        ctx.fillRect(x0, y, first - x0, 1);
        ctx.fillRect(last + 1, y, x0 + size - last - 1, 1);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!dark) {
      // Filo scuro sul bordo del cerchio.
      ctx.fillStyle = '#23262e';
      for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) {
        if (inDisc(x, y) && (!inDisc(x - 1, y) || !inDisc(x + 1, y) || !inDisc(x, y - 1) || !inDisc(x, y + 1))) ctx.fillRect(x, y, 1, 1);
      }
    }
  };
  const top = permutedRect((ctx) => paintDisc(ctx, false), x0, y0, size, size);
  const side = permutedRect((ctx) => paintDisc(ctx, true), x0, y0, size, size);
  const lift = ISO_SCENERY.plinth;
  const out = canvas(top.canvas.width, top.canvas.height + lift);
  const ctx = out.getContext('2d')!;
  // Il fianco: la sagoma scura ripetuta dal pavimento fino sotto la cima.
  for (let k = 0; k < lift; k++) ctx.drawImage(side.canvas, 0, lift - k);
  ctx.drawImage(top.canvas, 0, 0);
  return { canvas: out, left: top.left, top: top.top - lift };
}

/** Basamento e pezzo di una colonna, composti una volta (e di nuovo se arrivano i fogli). */
function pillarArt(theme: ArenaThemeId, pillar: Pillar): IsoPillarArt | null {
  const sheet = scenerySheet(theme);
  if (sheet === null || tileSheet(theme) === null) return null;
  const key = `${theme}|ready`;
  const known = pillarArts.get(pillar);
  if (known !== undefined && known.key === key) return known.art;
  const base = plinth(theme, pillar);
  const pieces = ['pillarS', 'pillarM', 'pillarL'].flatMap((role) => sceneryPieces(theme, role));
  const width = 2 * Math.SQRT2 * pillar.radius;
  const piece = pillarPieceFor(pieces, width, sceneryNoise(pillar.position.x, pillar.position.y, 5));
  // Il pezzo sta in piedi al centro del basamento, appena davanti al centro della cima.
  const center = { x: Math.round(pillar.position.x - pillar.position.y), y: Math.round((pillar.position.x + pillar.position.y) / 2) - ISO_SCENERY.plinth };
  const foot = center.y + Math.round((pillar.radius * Math.SQRT1_2) * 0.3);
  const pieceLeft = piece === undefined ? center.x : Math.round(center.x - piece.w / 2);
  const pieceTop = piece === undefined ? foot : foot - piece.h;
  const left = Math.min(base.left, pieceLeft), top = Math.min(base.top, pieceTop);
  const right = Math.max(base.left + base.canvas.width, pieceLeft + (piece?.w ?? 0));
  const bottom = Math.max(base.top + base.canvas.height, foot);
  const out = canvas(right - left, bottom - top);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(base.canvas, base.left - left, base.top - top);
  if (piece !== undefined) ctx.drawImage(sheet, piece.x, piece.y, piece.w, piece.h, pieceLeft - left, pieceTop - top, piece.w, piece.h);
  const art: IsoPillarArt = {
    canvas: out,
    left,
    top,
    ...(piece?.light === undefined ? {} : { light: { ...piece.light, x: pieceLeft + piece.light.x, y: pieceTop + piece.light.y } }),
  };
  pillarArts.set(pillar, { key, art });
  return art;
}

/**
 * Le colonne della mappa sui loro basamenti, disegnate nella scena illuminata con le loro luci. Restituisce le sagome:
 * chi passa dietro una colonna (piu' lontano del suo centro sulla diagonale della vista) le finisce dietro.
 */
export function drawIsoPillars(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, theme: ArenaThemeId): IsoOccluder[] {
  const occluders: IsoOccluder[] = [];
  const { camera, clock } = frame;
  for (const pillar of frame.arena.pillars) {
    const art = pillarArt(theme, pillar);
    if (art === null) continue;
    const box = { x: art.left, y: art.top, width: art.canvas.width, height: art.canvas.height };
    if (box.x > camera.position.x + camera.width || box.x + box.width < camera.position.x || box.y > camera.position.y + camera.height || box.y + box.height < camera.position.y) continue;
    ctx.drawImage(art.canvas, art.left, art.top);
    if (art.light !== undefined) {
      const pulse = Math.sin(clock * 2 + art.left);
      drawLight(ctx, art.light.x, art.light.y, art.light.color, art.light.radius + pulse * 5, art.light.intensity * (0.85 + pulse * 0.15));
    }
    occluders.push({
      box,
      isBehind: behindCircle(pillar.position.x, pillar.position.y),
      stamp: () => stampFromScene(ctx, art.canvas, art.left, art.top, art.canvas.width, art.canvas.height),
    });
  }
  return occluders;
}

// --- Strumenti per i temi ----------------------------------------------------------------------------------------------

/**
 * Una camera dall'alto sul rettangolo del mondo che contiene la vista: per riusare in isometria le funzioni dei temi che
 * limitano il disegno alla parte visibile leggendo `position`, `width` e `height` come rettangolo del mondo.
 */
export function worldCamera(camera: Camera): Camera {
  const bounds = camera.worldBounds();
  const view = new Camera();
  view.setViewSize(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
  view.position = new Vec2(bounds.x0, bounds.y0);
  return view;
}

/** Ombra corta ai piedi dei due muri di fondo, dipinta dall'alto nel pavimento (in alto: y = muro; a sinistra: x = muro). */
export function paintWallFootShadows(ctx: CanvasRenderingContext2D, arena: ArenaDefinition): void {
  const wall = arena.wallThickness;
  for (const [offset, alpha] of [[0, '60'], [5, '38'], [10, '1c']] as const) {
    ctx.fillStyle = `#000000${alpha}`;
    ctx.fillRect(wall + offset, wall + offset, arena.width - wall * 2 - offset, 5);
    ctx.fillRect(wall + offset, wall + offset + 5, 5, arena.height - wall * 2 - offset - 5);
  }
}

/**
 * Luci appese ai due muri di fondo, ogni `spacing` lungo il muro (lontano dai portali sul muro in alto a destra):
 * `light(along)` dice colore, raggio e intensita' della luce in quel punto. Le luci dei temi che dall'alto stavano sulla
 * faccia del muro in alto (funghi, bocche di forno, cristalli).
 */
export function drawIsoWallLights(ctx: CanvasRenderingContext2D, frame: IsoArtFrame, spacing: number, light: (along: number) => { readonly color: string; readonly radius: number; readonly intensity: number }): void {
  const { arena, camera } = frame;
  const t = arena.wallThickness;
  const put = (wall: BackWall, along: number): void => {
    const at = sconceAnchor(wall, t, along);
    if (at.x < camera.position.x - 220 || at.x > camera.position.x + camera.width + 220 || at.y < camera.position.y - 220 || at.y > camera.position.y + camera.height + 260) return;
    const { color, radius, intensity } = light(along);
    ctx.save();
    ctx.translate(at.x - along, at.y);
    drawLight(ctx, along, 0, color, radius, intensity);
    ctx.restore();
  };
  for (const spot of faceSpots(arena, 0, spacing)) put('ne', spot.x);
  for (let b = t + spacing / 2; b < arena.height - t - spacing / 3; b += spacing) put('nw', b);
}
