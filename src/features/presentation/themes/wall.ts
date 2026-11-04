import type { Camera } from '../../../core/camera';
import { Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, ArenaThemeId, Solid } from '../../arena/arena';
import { litColor } from '../lights';
import { drawFacade, fillSurface } from './scenery';
import { drawTile, tileAt, tileGrid, tileSheet, tileVariants, TILE_SIZE } from './tiles';

/*
 * Muri in vista a tre quarti. Il muro in alto mostra la sua faccia: una fascia sotto la cima, alta fin dove arrivano
 * i piedi del giocatore quando ci si avvicina, con un'ombra corta sul pavimento. Il muro in basso ha la cima davanti
 * alle figure (chi ci passa vicino ci finisce dietro). Solo aspetto: il confine di gioco resta dato dai margini.
 */

/** Distanza tra il centro del giocatore e i suoi piedi, nel disegno (vedi `drawPlayer`). */
const FEET = 14;

/** Altezza della faccia del muro in alto: arriva ai piedi del giocatore al suo punto piu' vicino. */
export function wallFaceHeight(arena: ArenaDefinition): number {
  return Math.max(18, Math.min(40, arena.playerMargin + FEET - arena.wallThickness));
}

/** Come si disegna una faccia: colori e motivo. */
export interface WallFaceStyle {
  readonly face: string;
  /** Giunti, base e motivo scuro. */
  readonly dark: string;
  /** Bordo alto illuminato e motivo chiaro. */
  readonly light: string;
  /** Mattoni (cripta), lastre ribattute (fucina), colate di ghiaccio (ghiacciaio), terra e radici (palude). */
  readonly pattern: 'bricks' | 'plates' | 'ice' | 'earth';
  /** Il tema dei cui tile `wall` e' fatta la faccia, quando il foglio e' caricato (al posto del motivo). */
  readonly tiles?: ArenaThemeId;
}

/** Valore pseudocasuale stabile in [0, 1) per una colonna del motivo. */
function columnNoise(x: number, salt: number): number {
  const s = Math.sin(x * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Il motivo disegnato nel codice sulla faccia (quando non ci sono i tile del tema). */
function drawFacePattern(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, style: WallFaceStyle): void {
  const right = left + width;
  ctx.fillStyle = style.dark;
  switch (style.pattern) {
    case 'bricks': {
      // File di mattoni alte 10, sfalsate di mezzo mattone.
      for (let row = 0; row * 10 < height; row++) {
        const y = top + row * 10;
        ctx.fillRect(left, y, width, 1);
        for (let x = Math.floor(left / 32) * 32 + (row % 2) * 16; x < right; x += 32) ctx.fillRect(x, y, 1, Math.min(10, top + height - y));
      }
      break;
    }
    case 'plates': {
      // Lastre di ferro larghe 64 con una fila di rivetti in alto e in basso.
      for (let x = Math.floor(left / 64) * 64; x < right; x += 64) {
        ctx.fillRect(x, top, 2, height);
        ctx.fillStyle = style.light;
        for (const y of [top + 4, top + height - 7]) for (const dx of [8, 54]) ctx.fillRect(x + dx, y, 3, 3);
        ctx.fillStyle = style.dark;
      }
      break;
    }
    case 'ice': {
      // Colate verticali di lunghezza diversa, chiare e scure.
      for (let x = Math.floor(left / 9) * 9; x < right; x += 9) {
        const n = columnNoise(x, 1);
        ctx.fillStyle = n > 0.6 ? style.light : style.dark;
        ctx.fillRect(x, top, 2, height * (0.3 + n * 0.7));
      }
      break;
    }
    case 'earth': {
      // Strati di terra e radici che pendono.
      ctx.fillRect(left, top + Math.round(height * 0.45), width, 2);
      for (let x = Math.floor(left / 11) * 11; x < right; x += 11) {
        const n = columnNoise(x, 2);
        if (n >= 0.45) ctx.fillRect(x, top, 2, height * (0.4 + n * 0.6));
      }
      break;
    }
  }
}

/**
 * Tile `material` del tema allineati al mondo su tutto il rettangolo (gia' ritagliato da chi chiama). Falso se il tema
 * non ne ha o il foglio non e' ancora caricato: allora si disegna come prima, nel codice.
 */
function fillWithTiles(
  ctx: CanvasRenderingContext2D,
  theme: ArenaThemeId | undefined,
  material: 'wall' | 'cap',
  left: number,
  top: number,
  width: number,
  height: number,
): boolean {
  const sheet = theme === undefined ? null : tileSheet(theme);
  const variants = theme === undefined ? [] : tileVariants(theme, material);
  if (sheet === null || variants.length === 0) return false;
  // La faccia ha una sola fila di tile (dall'alto); la cima dei massicci e' lastricata come il pavimento.
  const firstRow = material === 'wall' ? top : Math.floor(top / TILE_SIZE) * TILE_SIZE;
  for (let y = firstRow; y < top + height; y += TILE_SIZE) {
    for (let x = Math.floor(left / TILE_SIZE) * TILE_SIZE; x < left + width; x += TILE_SIZE) {
      const tile = tileAt(theme!, material, x, y, columnNoise(x, material === 'wall' ? 5 : y));
      if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
    }
    if (material === 'wall') break;
  }
  return true;
}

/**
 * Una faccia verticale nel rettangolo (`left`, `top`, `width`, `height`): colore, motivo del tema (o i suoi tile), bordo
 * alto chiaro e base scura, poi un'ombra corta a bande sul pavimento sotto. Il motivo e' allineato al mondo.
 */
function drawFaceBand(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, style: WallFaceStyle): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.fillStyle = style.face;
  ctx.fillRect(left, top, width, height);
  if (!fillWithTiles(ctx, style.tiles, 'wall', left, top, width, height)) drawFacePattern(ctx, left, top, width, height, style);
  ctx.fillStyle = style.light;
  ctx.fillRect(left, top, width, 2);
  ctx.fillStyle = style.dark;
  ctx.fillRect(left, top + height - 2, width, 2);
  ctx.restore();
  // Ombra corta della faccia sul pavimento: tre bande sempre piu' chiare, come in pixel art.
  for (const [offset, alpha] of [[0, '55'], [6, '33'], [12, '18']] as const) {
    ctx.fillStyle = `#000000${alpha}`;
    ctx.fillRect(left, top + height + offset, width, 6);
  }
}

/** La faccia del muro in alto e la sua ombra sul pavimento, solo nel tratto visibile. */
export function drawTopWallFace(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, style: WallFaceStyle): void {
  const top = arena.wallThickness;
  const height = wallFaceHeight(arena);
  if (style.tiles !== undefined && drawFacade(ctx, arena, camera, style.tiles, top + height, style)) return;
  if (camera.position.y > top + height + 24) return;
  const left = Math.max(arena.wallThickness, Math.floor(camera.position.x / 32) * 32 - 32);
  const right = Math.min(arena.width - arena.wallThickness, camera.position.x + camera.width + 32);
  if (right <= left) return;
  drawFaceBand(ctx, left, top, right - left, height, style);
}

/** Lato delle lastre sulla cima dei massicci. */
const BLOCK_SLAB = 48;

/** Come si disegna un massiccio di un tema: la cima, il suo bordo e la faccia rivolta verso il basso. */
export interface BlockLook {
  readonly cap: string;
  readonly edge: string;
  readonly face: WallFaceStyle;
  /** Il tema dei cui tile `cap` e' fatta la cima, quando il foglio e' caricato (al posto delle lastre). */
  readonly tiles?: ArenaThemeId;
}

/** Lastre grandi sfalsate sulla cima, allineate al mondo: giunti scuri e toni appena diversi (senza i tile). */
function drawCapSlabs(ctx: CanvasRenderingContext2D, solid: Solid, capHeight: number, look: BlockLook): void {
  const slab = BLOCK_SLAB;
  for (let y = Math.floor(solid.y / slab) * slab; y < solid.y + capHeight; y += slab) {
    const shift = (Math.floor(y / slab) % 2) * (slab / 2);
    for (let x = Math.floor(solid.x / slab) * slab - shift; x < solid.x + solid.width; x += slab) {
      const n = columnNoise(x, y);
      if (n > 0.7 || n < 0.3) {
        ctx.fillStyle = n > 0.7 ? '#ffffff0c' : '#00000018';
        ctx.fillRect(x, y, slab, slab);
      }
      ctx.fillStyle = `${look.face.dark}88`;
      ctx.fillRect(x, y, slab, 1);
      ctx.fillRect(x, y, 1, slab);
    }
  }
}

/**
 * Un massiccio in vista a tre quarti: la cima piatta con il bordo chiaro e una faccia in basso alta al piu' 26
 * unita'. L'ingombro di gioco e' tutto il rettangolo: la faccia sta dentro, non lo allunga.
 */
export function drawSolidBlock(ctx: CanvasRenderingContext2D, solid: Solid, camera: Camera, look: BlockLook): void {
  const center = new Vec2(solid.x + solid.width / 2, solid.y + solid.height / 2);
  if (!camera.isVisible(center, Math.hypot(solid.width, solid.height) / 2 + 30)) return;
  const face = Math.min(26, Math.round(solid.height * 0.3));
  const capHeight = solid.height - face;
  ctx.fillStyle = look.cap;
  ctx.fillRect(solid.x, solid.y, solid.width, capHeight);
  ctx.save();
  ctx.beginPath();
  ctx.rect(solid.x, solid.y, solid.width, capHeight);
  ctx.clip();
  if (!fillWithTiles(ctx, look.tiles, 'cap', solid.x, solid.y, solid.width, capHeight)) drawCapSlabs(ctx, solid, capHeight, look);
  ctx.restore();
  ctx.fillStyle = '#00000033';
  ctx.fillRect(solid.x + 6, solid.y + 6, solid.width - 12, capHeight - 12);
  ctx.fillStyle = look.edge;
  ctx.fillRect(solid.x, solid.y, solid.width, 2);
  ctx.fillRect(solid.x, solid.y, 2, capHeight);
  ctx.fillRect(solid.x + solid.width - 2, solid.y, 2, capHeight);
  drawFaceBand(ctx, solid.x, solid.y + capHeight, solid.width, face, look.face);
}

/**
 * La cima del muro in basso, ridisegnata davanti alle figure: chi passa vicino al muro ci finisce dietro. Si disegna
 * dopo la luce, quindi i colori si scuriscono con il buio della scena (`ambient`) come il muro sotto.
 */
export function drawBottomWallLip(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, cap: string, edge: string, ambient: string, theme?: ArenaThemeId): void {
  const top = arena.height - arena.wallThickness;
  if (camera.position.y + camera.height < top) return;
  const left = Math.max(0, camera.position.x - 4);
  const right = Math.min(arena.width, camera.position.x + camera.width + 4);
  if (right <= left) return;
  if (theme !== undefined && tileSheet(theme) !== null && tileGrid(theme, 'cap') !== undefined) {
    fillSurface(ctx, theme, 'cap', left, top, right - left, arena.wallThickness);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ambient;
    ctx.fillRect(left, top, right - left, arena.wallThickness);
    ctx.restore();
  } else {
    ctx.fillStyle = litColor(cap, ambient);
    ctx.fillRect(left, top, right - left, arena.wallThickness);
  }
  ctx.fillStyle = litColor(edge, ambient);
  ctx.fillRect(left, top, right - left, 2);
}
