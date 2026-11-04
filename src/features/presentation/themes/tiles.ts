import type { ArenaThemeId } from '../../arena/arena';
import { preloadSheets, sheetImage } from '../boss-art/sheet-images';
import { TILE_ATLASES, type TileAtlasLayout, type TileGrid, type TileMaterial, type TileRect } from './tile-atlas';
import { TILE_ATLASES_IA } from './tile-atlas-ia';

/*
 * Un foglio di tile per tema, preparato da `tools/arte/prepara_scenari.py` con il generatore locale, a un pixel per unita'
 * di mondo come le figure; `?tile=classici` rimette quelli di terzi ricolorati (fase 6 dello studio grafico,
 * `tools/arte/prepara_tile.py`), a due unita' per pixel. Stesse rampe. Crediti in `art-credits.ts`. Solo aspetto. Finche'
 * il foglio non e' caricato (o senza DOM, nei test) i temi disegnano come prima, nel codice: nessuna regola dipende dai tile.
 */

export const classicTilesRequested = typeof location !== 'undefined' && new URLSearchParams(location.search).get('tile') === 'classici';

/** I fogli in uso. */
export const ACTIVE_TILE_ATLASES: Readonly<Record<ArenaThemeId, TileAtlasLayout>> = classicTilesRequested ? TILE_ATLASES : TILE_ATLASES_IA;

/** Crediti (`art-credits.ts`) dei tile di ogni tema: quelli in uso e, finche' restano nel gioco, i classici. */
export const TILE_CREDITS: Readonly<Record<ArenaThemeId, readonly string[]>> = {
  crypt: ['local-sdxl-tile', 'itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles', 'itch-kmh-dungeon'],
  swamp: ['local-sdxl-tile', 'itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles'],
  forge: ['local-sdxl-tile', 'itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles'],
  glacier: ['local-sdxl-tile', 'itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles', 'itch-kmh-tundra'],
};

/** Unita' del mondo per pixel d'arte dei fogli in uso. */
export const TILE_SCALE = classicTilesRequested ? 2 : 1;
/** Un tile copre 32 unita', come le lastre della cripta. */
export const TILE_SIZE = 32;

/** Comincia a caricare i fogli dei tile (all'avvio, cosi' la prima stanza ha gia' i suoi). */
export function preloadTiles(): void {
  preloadSheets(Object.values(ACTIVE_TILE_ATLASES).map((atlas) => atlas.url));
}

/** Il foglio dei tile del tema se e' pronto, altrimenti null. */
export function tileSheet(theme: ArenaThemeId): HTMLImageElement | null {
  return sheetImage(ACTIVE_TILE_ATLASES[theme].url);
}

const gridCells = new Map<TileGrid, readonly TileRect[]>();

function cellsOf(grid: TileGrid): readonly TileRect[] {
  let cells = gridCells.get(grid);
  if (cells === undefined) {
    cells = Array.from({ length: grid.cells * grid.cells }, (_, i) => ({ x: grid.x + (i % grid.cells) * grid.size, y: grid.y + Math.floor(i / grid.cells) * grid.size, w: grid.size, h: grid.size }));
    gridCells.set(grid, cells);
  }
  return cells;
}

/** Le varianti di un materiale del tema (vuoto se il tema non lo ha). */
export function tileVariants(theme: ArenaThemeId, material: TileMaterial): readonly TileRect[] {
  const atlas = ACTIVE_TILE_ATLASES[theme];
  const grid = atlas.grids?.[material];
  return grid !== undefined ? cellsOf(grid) : atlas.tiles[material] ?? [];
}

/** La superficie che ripete di un materiale, se il foglio ne ha una. */
export function tileGrid(theme: ArenaThemeId, material: TileMaterial): TileGrid | undefined {
  return ACTIVE_TILE_ATLASES[theme].grids?.[material];
}

/**
 * Il tile di un materiale per il punto (`x`, `y`) del mondo: la cella giusta di una superficie che ripete, oppure una
 * variante scelta dal valore stabile `h` (vedi `pickVariant`).
 */
export function tileAt(theme: ArenaThemeId, material: TileMaterial, x: number, y: number, h: number): TileRect | undefined {
  const grid = tileGrid(theme, material);
  if (grid === undefined) return pickVariant(tileVariants(theme, material), h);
  const wrap = (value: number): number => ((Math.floor(value / grid.size) % grid.cells) + grid.cells) % grid.cells;
  return cellsOf(grid)[wrap(y) * grid.cells + wrap(x)];
}

/** I colori con cui sono stati ricolorati i tile di un materiale (per il confronto con i colpi nemici). */
export function tileColors(theme: ArenaThemeId, material: TileMaterial): readonly string[] {
  return ACTIVE_TILE_ATLASES[theme].colors[material] ?? [];
}

/** Quota delle prime due varianti (le lastre lisce) fra quelle scelte. Provvisoria, solo aspetto. */
const PLAIN_SHARE = 0.82;

/**
 * Una variante scelta da un valore stabile `h` in [0, 1): le prime varianti (le lastre lisce) escono piu' spesso, cosi'
 * crepe e macchie restano punti di riferimento e non rumore.
 */
export function pickVariant<T>(variants: readonly T[], h: number): T | undefined {
  if (variants.length === 0) return undefined;
  const plain = Math.min(2, variants.length);
  if (h < PLAIN_SHARE || plain === variants.length) return variants[Math.min(plain - 1, Math.floor((h / PLAIN_SHARE) * plain))];
  return variants[Math.min(variants.length - 1, plain + Math.floor(((h - PLAIN_SHARE) / (1 - PLAIN_SHARE)) * (variants.length - plain)))];
}

/** Disegna un tile del foglio con l'angolo alto a sinistra in (`x`, `y`), alla scala dei tile, senza sfumare i pixel. */
export function drawTile(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, tile: TileRect, x: number, y: number, scale = TILE_SCALE): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, tile.x, tile.y, tile.w, tile.h, x, y, tile.w * scale, tile.h * scale);
}
