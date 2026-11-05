// File generato da prepara_scenari.py (script fuori dal repository, vedi README · Strumenti esterni): non modificarlo a mano.

import type { ArenaThemeId } from '../../arena/arena';

/** Luce di un pezzo, rispetto al suo angolo alto a sinistra. */
export interface SceneryLight {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly radius: number;
  readonly intensity: number;
}

/** Un pezzo del foglio delle scenografie. */
export interface SceneryPiece {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly light?: SceneryLight;
  /** Il punto dello sprite che poggia sul centro dell'ingombro, rispetto all'angolo alto a sinistra. */
  readonly foot?: { readonly x: number; readonly y: number };
  /** Il vano di un portale, rispetto all'angolo alto a sinistra. */
  readonly hole?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

/** Il foglio delle scenografie di un tema: facciate, lesene, pilastri, arredi a terra e appesi. */
export interface SceneryAtlas {
  readonly url: string;
  readonly pieces: Readonly<Record<string, readonly SceneryPiece[]>>;
}

export const SCENERY_ATLASES: Readonly<Record<ArenaThemeId, SceneryAtlas>> = {
  crypt: {
    url: new URL('../../../assets/art/scenari/crypt.png', import.meta.url).href,
    pieces: {
      gate: [{ x: 0, y: 0, w: 168, h: 145, hole: { x: 58, y: 61, w: 67, h: 84 } }],
      pillarS: [{ x: 0, y: 294, w: 64, h: 154, foot: { x: 32, y: 138 } }, { x: 64, y: 294, w: 62, h: 126, foot: { x: 31, y: 110 } }, { x: 543, y: 294, w: 56, h: 92, foot: { x: 28, y: 78 } }, { x: 903, y: 294, w: 55, h: 60, foot: { x: 30, y: 42 } }],
      pillarL: [{ x: 126, y: 294, w: 124, h: 126, foot: { x: 62, y: 95 }, light: { x: 62, y: 56, color: '#ff5a5a', radius: 130, intensity: 0.5 } }, { x: 350, y: 294, w: 104, h: 101, foot: { x: 52, y: 64 }, light: { x: 52, y: 19, color: '#ffb066', radius: 150, intensity: 0.75 } }, { x: 599, y: 294, w: 125, h: 89, foot: { x: 61, y: 58 } }],
      pillarM: [{ x: 250, y: 294, w: 100, h: 101, foot: { x: 50, y: 76 }, light: { x: 50, y: 12, color: '#ff5a5a', radius: 110, intensity: 0.5 } }, { x: 454, y: 294, w: 89, h: 96, foot: { x: 48, y: 67 } }, { x: 724, y: 294, w: 81, h: 78, foot: { x: 41, y: 49 }, light: { x: 41, y: 9, color: '#ffb066', radius: 120, intensity: 0.7 } }, { x: 805, y: 294, w: 98, h: 74, foot: { x: 49, y: 49 } }],
      pilaster: [{ x: 114, y: 145, w: 35, h: 84 }],
      facade: [{ x: 235, y: 145, w: 152, h: 80 }, { x: 387, y: 145, w: 152, h: 80 }, { x: 539, y: 145, w: 152, h: 80 }, { x: 691, y: 145, w: 152, h: 80 }, { x: 843, y: 145, w: 152, h: 80 }],
      hang: [{ x: 0, y: 235, w: 40, h: 59 }],
      scatter: [{ x: 958, y: 294, w: 44, h: 27 }, { x: 0, y: 448, w: 52, h: 27 }, { x: 52, y: 448, w: 23, h: 25, light: { x: 12, y: 10, color: '#ffb066', radius: 70, intensity: 0.55 } }, { x: 75, y: 448, w: 44, h: 23 }, { x: 119, y: 448, w: 30, h: 21 }, { x: 149, y: 448, w: 29, h: 18 }, { x: 178, y: 448, w: 38, h: 18 }],
      sconce: [{ x: 368, y: 235, w: 22, h: 25 }],
    },
  },
  swamp: {
    url: new URL('../../../assets/art/scenari/swamp.png', import.meta.url).href,
    pieces: {
      pillarM: [{ x: 0, y: 0, w: 96, h: 150, light: { x: 48, y: 63, color: '#2fd0b8', radius: 110, intensity: 0.45 } }, { x: 96, y: 0, w: 92, h: 148 }, { x: 284, y: 0, w: 92, h: 141, light: { x: 46, y: 42, color: '#2fd0b8', radius: 150, intensity: 0.6 } }, { x: 376, y: 0, w: 45, h: 133 }],
      pillarL: [{ x: 188, y: 0, w: 96, h: 146, light: { x: 48, y: 44, color: '#2fd0b8', radius: 170, intensity: 0.6 } }, { x: 607, y: 0, w: 103, h: 112 }, { x: 710, y: 0, w: 99, h: 110 }],
      pillarS: [{ x: 421, y: 0, w: 67, h: 117 }, { x: 809, y: 0, w: 72, h: 107, light: { x: 36, y: 32, color: '#2fd0b8', radius: 130, intensity: 0.6 } }, { x: 926, y: 0, w: 40, h: 91 }, { x: 638, y: 150, w: 58, h: 56 }],
      gate: [{ x: 488, y: 0, w: 119, h: 115, hole: { x: 32, y: 44, w: 56, h: 71 } }],
      pilaster: [{ x: 881, y: 0, w: 45, h: 106 }],
      facade: [{ x: 0, y: 150, w: 152, h: 80 }, { x: 152, y: 150, w: 152, h: 80 }, { x: 304, y: 150, w: 152, h: 80 }, { x: 456, y: 150, w: 152, h: 80 }],
      hang: [{ x: 608, y: 150, w: 30, h: 58 }],
      scatter: [{ x: 696, y: 150, w: 27, h: 51 }, { x: 723, y: 150, w: 40, h: 39 }, { x: 763, y: 150, w: 63, h: 35 }, { x: 826, y: 150, w: 43, h: 23, light: { x: 22, y: 9, color: '#2fd0b8', radius: 80, intensity: 0.5 } }],
    },
  },
  forge: {
    url: new URL('../../../assets/art/scenari/forge.png', import.meta.url).href,
    pieces: {
      pillarL: [{ x: 0, y: 0, w: 96, h: 162, light: { x: 48, y: 97, color: '#ff7a2a', radius: 190, intensity: 0.8 } }, { x: 404, y: 0, w: 118, h: 119 }, { x: 556, y: 0, w: 119, h: 109 }],
      pillarM: [{ x: 96, y: 0, w: 84, h: 151, light: { x: 42, y: 109, color: '#ff7a2a', radius: 160, intensity: 0.7 } }, { x: 237, y: 0, w: 47, h: 133, light: { x: 24, y: 104, color: '#ff7a2a', radius: 150, intensity: 0.7 } }, { x: 701, y: 0, w: 68, h: 108 }, { x: 608, y: 162, w: 98, h: 78 }],
      pillarS: [{ x: 180, y: 0, w: 57, h: 146 }, { x: 522, y: 0, w: 34, h: 112 }, { x: 769, y: 0, w: 31, h: 98, light: { x: 16, y: 10, color: '#ff7a2a', radius: 90, intensity: 0.5 } }, { x: 860, y: 0, w: 58, h: 95, light: { x: 29, y: 19, color: '#ff7a2a', radius: 130, intensity: 0.7 } }],
      gate: [{ x: 284, y: 0, w: 120, h: 119, hole: { x: 32, y: 21, w: 56, h: 98 } }],
      pilaster: [{ x: 675, y: 0, w: 26, h: 108 }],
      anvil: [{ x: 800, y: 0, w: 60, h: 95 }],
      facade: [{ x: 0, y: 162, w: 152, h: 80 }, { x: 152, y: 162, w: 152, h: 80 }, { x: 304, y: 162, w: 152, h: 80 }, { x: 456, y: 162, w: 152, h: 80 }],
      scatter: [{ x: 706, y: 162, w: 56, h: 76, light: { x: 28, y: 38, color: '#ff7a2a', radius: 76, intensity: 0.45 } }, { x: 800, y: 162, w: 50, h: 67, light: { x: 25, y: 34, color: '#ff7a2a', radius: 70, intensity: 0.45 } }, { x: 887, y: 162, w: 46, h: 59 }, { x: 933, y: 162, w: 42, h: 43 }, { x: 975, y: 162, w: 36, h: 36, light: { x: 18, y: 14, color: '#ff7a2a', radius: 70, intensity: 0.5 } }],
      brazier: [{ x: 762, y: 162, w: 38, h: 71 }],
      hang: [{ x: 850, y: 162, w: 37, h: 62 }],
    },
  },
  glacier: {
    url: new URL('../../../assets/art/scenari/glacier.png', import.meta.url).href,
    pieces: {
      pillarL: [{ x: 0, y: 0, w: 113, h: 161, light: { x: 56, y: 80, color: '#7fd8ff', radius: 170, intensity: 0.6 } }, { x: 211, y: 0, w: 92, h: 154 }, { x: 303, y: 0, w: 102, h: 152, light: { x: 51, y: 76, color: '#7fd8ff', radius: 170, intensity: 0.55 } }],
      pillarM: [{ x: 113, y: 0, w: 98, h: 158, light: { x: 49, y: 71, color: '#7fd8ff', radius: 130, intensity: 0.55 } }, { x: 405, y: 0, w: 101, h: 150 }, { x: 506, y: 0, w: 90, h: 147 }, { x: 0, y: 161, w: 54, h: 114 }],
      pillarS: [{ x: 596, y: 0, w: 67, h: 145 }, { x: 780, y: 0, w: 65, h: 128 }, { x: 845, y: 0, w: 51, h: 128 }, { x: 896, y: 0, w: 72, h: 126 }],
      gate: [{ x: 663, y: 0, w: 117, h: 135, hole: { x: 32, y: 60, w: 52, h: 75 } }],
      pilaster: [{ x: 968, y: 0, w: 46, h: 116 }],
      facade: [{ x: 54, y: 161, w: 152, h: 80 }, { x: 206, y: 161, w: 152, h: 80 }, { x: 358, y: 161, w: 152, h: 80 }, { x: 510, y: 161, w: 152, h: 80 }, { x: 662, y: 161, w: 152, h: 80 }],
      scatter: [{ x: 814, y: 161, w: 95, h: 61 }, { x: 909, y: 161, w: 32, h: 57, light: { x: 16, y: 28, color: '#7fd8ff', radius: 70, intensity: 0.4 } }, { x: 941, y: 161, w: 67, h: 43 }, { x: 0, y: 275, w: 23, h: 40 }, { x: 86, y: 275, w: 46, h: 29 }],
      hang: [{ x: 23, y: 275, w: 63, h: 34 }],
    },
  },
};
