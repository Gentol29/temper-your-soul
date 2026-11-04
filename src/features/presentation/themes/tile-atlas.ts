// File generato da tools/arte/prepara_tile.py: non modificarlo a mano, rilancia lo script.

import type { ArenaThemeId } from '../../arena/arena';

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
  /** Unita' di mondo per pixel d'arte (predefinito 2, i tile classici da 16 pixel). */
  readonly scale?: number;
  readonly grids?: Partial<Readonly<Record<TileMaterial, TileGrid>>>;
  readonly tiles: Partial<Readonly<Record<TileMaterial, readonly TileRect[]>>>;
  readonly colors: Partial<Readonly<Record<TileMaterial, readonly string[]>>>;
}

export const TILE_ATLASES: Readonly<Record<ArenaThemeId, TileAtlasLayout>> = {
  crypt: {
    url: new URL('../../../assets/art/tiles/crypt.png', import.meta.url).href,
    width: 256,
    height: 50,
    tiles: {
      floor: [{ x: 0, y: 0, w: 16, h: 16 }, { x: 16, y: 0, w: 16, h: 16 }, { x: 32, y: 0, w: 16, h: 16 }, { x: 48, y: 0, w: 16, h: 16 }, { x: 64, y: 0, w: 16, h: 16 }, { x: 80, y: 0, w: 16, h: 16 }, { x: 96, y: 0, w: 16, h: 16 }, { x: 112, y: 0, w: 16, h: 16 }],
      floorWorn: [{ x: 128, y: 0, w: 16, h: 16 }, { x: 144, y: 0, w: 16, h: 16 }, { x: 160, y: 0, w: 16, h: 16 }, { x: 176, y: 0, w: 16, h: 16 }, { x: 192, y: 0, w: 16, h: 16 }, { x: 208, y: 0, w: 16, h: 16 }, { x: 224, y: 0, w: 16, h: 16 }, { x: 240, y: 0, w: 16, h: 16 }],
      floorDark: [{ x: 0, y: 16, w: 16, h: 16 }, { x: 16, y: 16, w: 16, h: 16 }, { x: 32, y: 16, w: 16, h: 16 }, { x: 48, y: 16, w: 16, h: 16 }, { x: 64, y: 16, w: 16, h: 16 }, { x: 80, y: 16, w: 16, h: 16 }, { x: 96, y: 16, w: 16, h: 16 }, { x: 112, y: 16, w: 16, h: 16 }],
      wall: [{ x: 128, y: 16, w: 16, h: 16 }, { x: 144, y: 16, w: 16, h: 16 }, { x: 160, y: 16, w: 16, h: 16 }],
      cap: [{ x: 176, y: 16, w: 16, h: 16 }, { x: 192, y: 16, w: 16, h: 16 }, { x: 208, y: 16, w: 16, h: 16 }, { x: 224, y: 16, w: 16, h: 16 }],
      chasm: [{ x: 240, y: 16, w: 16, h: 16 }, { x: 0, y: 32, w: 16, h: 16 }, { x: 16, y: 32, w: 16, h: 16 }, { x: 32, y: 32, w: 16, h: 16 }, { x: 48, y: 32, w: 16, h: 16 }, { x: 64, y: 32, w: 16, h: 16 }, { x: 80, y: 32, w: 16, h: 16 }, { x: 96, y: 32, w: 16, h: 16 }, { x: 112, y: 32, w: 16, h: 16 }],
      bridgeEW: [{ x: 128, y: 32, w: 16, h: 16 }],
      bridgeNS: [{ x: 144, y: 32, w: 16, h: 16 }],
      cover: [{ x: 160, y: 32, w: 44, h: 18 }],
    },
    colors: {
      floor: ['#1d232c', '#222831', '#252b34', '#292f39', '#30353f'],
      floorWorn: ['#22272e', '#272c33', '#2b3038', '#30353e', '#363b44'],
      floorDark: ['#191d24', '#1d222a', '#20252d', '#242932', '#2a2f38'],
      wall: ['#1b1d24', '#23262e', '#353946', '#4a4f5c', '#5c6272'],
      cap: ['#23262e', '#2f323b', '#3a3e4a', '#424652', '#4f5462'],
      chasm: ['#020305', '#05070a', '#0c0f14', '#2c313a', '#4a4f5c', '#6b7080'],
      bridgeEW: ['#150f0a', '#251a11', '#3a2a1c', '#4e3a26', '#664c32'],
      bridgeNS: ['#150f0a', '#251a11', '#3a2a1c', '#4e3a26', '#664c32'],
      cover: ['#100b08', '#21170f', '#352517', '#4b3521', '#62462c', '#7a5a3a'],
    },
  },
  swamp: {
    url: new URL('../../../assets/art/tiles/swamp.png', import.meta.url).href,
    width: 256,
    height: 48,
    tiles: {
      floor: [{ x: 0, y: 0, w: 16, h: 16 }, { x: 16, y: 0, w: 16, h: 16 }, { x: 32, y: 0, w: 16, h: 16 }, { x: 48, y: 0, w: 16, h: 16 }, { x: 64, y: 0, w: 16, h: 16 }, { x: 80, y: 0, w: 16, h: 16 }, { x: 96, y: 0, w: 16, h: 16 }, { x: 112, y: 0, w: 16, h: 16 }],
      cap: [{ x: 128, y: 0, w: 16, h: 16 }, { x: 144, y: 0, w: 16, h: 16 }],
      chasm: [{ x: 160, y: 0, w: 16, h: 16 }, { x: 176, y: 0, w: 16, h: 16 }, { x: 192, y: 0, w: 16, h: 16 }, { x: 208, y: 0, w: 16, h: 16 }, { x: 224, y: 0, w: 16, h: 16 }, { x: 240, y: 0, w: 16, h: 16 }, { x: 0, y: 16, w: 16, h: 16 }, { x: 16, y: 16, w: 16, h: 16 }, { x: 32, y: 16, w: 16, h: 16 }],
      bridgeEW: [{ x: 48, y: 16, w: 16, h: 16 }],
      bridgeNS: [{ x: 64, y: 16, w: 16, h: 16 }],
      cover: [{ x: 80, y: 16, w: 32, h: 32 }],
    },
    colors: {
      floor: ['#222316', '#25261a', '#2a2b1b', '#30301e', '#353522'],
      cap: ['#141a0f', '#1b2216', '#232c1a', '#2d3a20', '#3a4a26'],
      chasm: ['#010403', '#030a08', '#06120e', '#2d3a20', '#3f5428', '#566a2e'],
      bridgeEW: ['#110c08', '#1f170e', '#2f2418', '#433422', '#58462e'],
      bridgeNS: ['#110c08', '#1f170e', '#2f2418', '#433422', '#58462e'],
      cover: ['#0d0a06', '#1c140c', '#2b2117', '#3a2d1f', '#4b3b28', '#5b6a34'],
    },
  },
  forge: {
    url: new URL('../../../assets/art/tiles/forge.png', import.meta.url).href,
    width: 256,
    height: 40,
    tiles: {
      floor: [{ x: 0, y: 0, w: 16, h: 16 }, { x: 16, y: 0, w: 16, h: 16 }, { x: 32, y: 0, w: 16, h: 16 }, { x: 48, y: 0, w: 16, h: 16 }, { x: 64, y: 0, w: 16, h: 16 }, { x: 80, y: 0, w: 16, h: 16 }, { x: 96, y: 0, w: 16, h: 16 }, { x: 112, y: 0, w: 16, h: 16 }],
      floorDark: [{ x: 128, y: 0, w: 16, h: 16 }, { x: 144, y: 0, w: 16, h: 16 }, { x: 160, y: 0, w: 16, h: 16 }, { x: 176, y: 0, w: 16, h: 16 }, { x: 192, y: 0, w: 16, h: 16 }, { x: 208, y: 0, w: 16, h: 16 }, { x: 224, y: 0, w: 16, h: 16 }, { x: 240, y: 0, w: 16, h: 16 }],
      cap: [{ x: 0, y: 16, w: 16, h: 16 }, { x: 16, y: 16, w: 16, h: 16 }, { x: 32, y: 16, w: 16, h: 16 }, { x: 48, y: 16, w: 16, h: 16 }],
      chasm: [{ x: 64, y: 16, w: 16, h: 16 }, { x: 80, y: 16, w: 16, h: 16 }, { x: 96, y: 16, w: 16, h: 16 }, { x: 112, y: 16, w: 16, h: 16 }, { x: 128, y: 16, w: 16, h: 16 }, { x: 144, y: 16, w: 16, h: 16 }, { x: 160, y: 16, w: 16, h: 16 }, { x: 176, y: 16, w: 16, h: 16 }, { x: 192, y: 16, w: 16, h: 16 }],
      bridgeEW: [{ x: 208, y: 16, w: 16, h: 16 }],
      bridgeNS: [{ x: 224, y: 16, w: 16, h: 16 }],
      cover: [{ x: 240, y: 16, w: 16, h: 24 }],
    },
    colors: {
      floor: ['#161210', '#1b1614', '#211b18', '#27201c', '#2f2824'],
      floorDark: ['#120f0d', '#171311', '#1c1715', '#221c19', '#2a2420'],
      cap: ['#1d1916', '#2c2622', '#3a332e', '#4a3f38', '#5e544c'],
      chasm: ['#1b1614', '#3a1a0c', '#7a2a0c', '#c8461a', '#ff6a1f', '#ffc15a'],
      bridgeEW: ['#120e0c', '#2a2420', '#3a332e', '#4a3f38', '#5e544c'],
      bridgeNS: ['#120e0c', '#2a2420', '#3a332e', '#4a3f38', '#5e544c'],
      cover: ['#120c08', '#2a1c12', '#45301e', '#5e432a', '#7a5a38', '#9a7a52'],
    },
  },
  glacier: {
    url: new URL('../../../assets/art/tiles/glacier.png', import.meta.url).href,
    width: 256,
    height: 58,
    tiles: {
      floor: [{ x: 0, y: 0, w: 16, h: 16 }, { x: 16, y: 0, w: 16, h: 16 }, { x: 32, y: 0, w: 16, h: 16 }, { x: 48, y: 0, w: 16, h: 16 }, { x: 64, y: 0, w: 16, h: 16 }, { x: 80, y: 0, w: 16, h: 16 }, { x: 96, y: 0, w: 16, h: 16 }, { x: 112, y: 0, w: 16, h: 16 }],
      floorDark: [{ x: 128, y: 0, w: 16, h: 16 }, { x: 144, y: 0, w: 16, h: 16 }, { x: 160, y: 0, w: 16, h: 16 }, { x: 176, y: 0, w: 16, h: 16 }, { x: 192, y: 0, w: 16, h: 16 }, { x: 208, y: 0, w: 16, h: 16 }, { x: 224, y: 0, w: 16, h: 16 }, { x: 240, y: 0, w: 16, h: 16 }],
      cap: [{ x: 0, y: 16, w: 16, h: 16 }, { x: 16, y: 16, w: 16, h: 16 }, { x: 32, y: 16, w: 16, h: 16 }, { x: 48, y: 16, w: 16, h: 16 }],
      chasm: [{ x: 64, y: 16, w: 16, h: 16 }, { x: 80, y: 16, w: 16, h: 16 }, { x: 96, y: 16, w: 16, h: 16 }, { x: 112, y: 16, w: 16, h: 16 }, { x: 128, y: 16, w: 16, h: 16 }, { x: 144, y: 16, w: 16, h: 16 }, { x: 160, y: 16, w: 16, h: 16 }, { x: 176, y: 16, w: 16, h: 16 }, { x: 192, y: 16, w: 16, h: 16 }],
      bridgeEW: [{ x: 208, y: 16, w: 16, h: 16 }],
      bridgeNS: [{ x: 224, y: 16, w: 16, h: 16 }],
      cover: [{ x: 0, y: 32, w: 22, h: 26 }],
    },
    colors: {
      floor: ['#132c45', '#17344f', '#1b3c5a', '#214566', '#2a5274'],
      floorDark: ['#10263d', '#132d47', '#173452', '#1c3d5e', '#244a6c'],
      cap: ['#3f6f96', '#5f8fb8', '#7fb0d3', '#a8d0e8', '#d6eef8'],
      chasm: ['#01040a', '#030a16', '#071426', '#244a6c', '#33618a', '#4a7ca6'],
      bridgeEW: ['#1c3450', '#28466a', '#355a82', '#43709a', '#5283ad'],
      bridgeNS: ['#1c3450', '#28466a', '#355a82', '#43709a', '#5283ad'],
      cover: ['#0f2a44', '#1e4a70', '#3f7fae', '#6fb2dc', '#b4e2f6', '#e8fbff'],
    },
  },
};
