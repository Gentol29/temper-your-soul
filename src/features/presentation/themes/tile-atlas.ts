/* Tipi della geometria dei fogli dei tile; i dati sono in `tile-atlas-ia.ts`, generato con il generatore locale. */

/** Un tile nel foglio del tema, in pixel. */
export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Materiali dei tile: pavimento (tre toni), faccia del muro, cima dei massicci, pozzi, ponti, ripari e, nei fogli nuovi, acqua, tappeti, fondo dei pozzi e ringhiere. */
export type TileMaterial = 'floor' | 'floorWorn' | 'floorDark' | 'wall' | 'cap' | 'chasm' | 'bridgeEW' | 'bridgeNS' | 'cover' | 'water' | 'carpet' | 'chasmBed' | 'railEW' | 'railNS' | 'post';

/** Una superficie che ripete: un quadrato di `cells` x `cells` celle da `size` pixel, che si posa in base alla posizione nel mondo. */
export interface TileGrid {
  readonly x: number;
  readonly y: number;
  readonly cells: number;
  readonly size: number;
}

/** Il foglio dei tile di un tema: immagine, varianti per materiale e rampe di colori usate per ricolorarle. */
export interface TileAtlasLayout {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Unita' di mondo per pixel d'arte (1 nei fogli in uso). */
  readonly scale?: number;
  readonly grids?: Partial<Readonly<Record<TileMaterial, TileGrid>>>;
  readonly tiles: Partial<Readonly<Record<TileMaterial, readonly TileRect[]>>>;
  readonly colors: Partial<Readonly<Record<TileMaterial, readonly string[]>>>;
}
