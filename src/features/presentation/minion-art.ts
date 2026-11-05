import { CRYPT_MINION_ART } from './minion-art/crypt';
import { CRYPT_VEIN_ART } from './minion-art/crypt-veins';
import { FORGE_MINION_ART } from './minion-art/forge';
import { FORGE_VEIN_ART } from './minion-art/forge-veins';
import { GLACIER_MINION_ART } from './minion-art/glacier';
import { GLACIER_VEIN_ART } from './minion-art/glacier-veins';
import { BLENDER_SPRITES, type BlenderSprite } from './minion-art/blender-sprites';
import { GENERATED_SPRITES as LOCAL_GENERATOR_SPRITES } from './minion-art/generated-sprites';
import type { MinionArt } from './minion-art/minion-art';
import { SWAMP_MINION_ART } from './minion-art/swamp';
import { SWAMP_VEIN_ART } from './minion-art/swamp-veins';

/*
 * Grafica dei servitori: pixel art come matrici di caratteri (vedi `sprites.ts`), due fotogrammi ciascuno, disegnati
 * nel codice (nessun asset esterno), un file per dungeon in `minion-art/` e uno per le sue vene B e C. Solo aspetto: il raggio di colpo sta in
 * `MinionDefinition`. Chi ha uno sprite del generatore locale (`generated-sprites.ts`) tiene colore, alone e ondeggio del
 * disegno a mano e ne prende figura e ritmo.
 */

export type { MinionArt } from './minion-art/minion-art';

const HAND_ART: Readonly<Record<string, MinionArt>> = {
  ...CRYPT_MINION_ART,
  ...SWAMP_MINION_ART,
  ...FORGE_MINION_ART,
  ...GLACIER_MINION_ART,
  ...CRYPT_VEIN_ART,
  ...SWAMP_VEIN_ART,
  ...FORGE_VEIN_ART,
  ...GLACIER_VEIN_ART,
};

/** Gli sprite resi con Blender (`blender-sprites.ts`) hanno la precedenza su quelli del generatore locale. */
const GENERATED_SPRITES = { ...LOCAL_GENERATOR_SPRITES, ...BLENDER_SPRITES };

export const MINION_ART: Readonly<Record<string, MinionArt>> = Object.fromEntries(Object.entries(HAND_ART).map(([id, art]) => {
      const sprite = GENERATED_SPRITES[id];
      const { directions, footRow } = (sprite ?? {}) as Partial<BlenderSprite>;
      return [id, sprite === undefined ? art : { ...art, frames: sprite.frames, palette: sprite.palette, scale: 1, fps: sprite.fps, walks: sprite.walks, faces: sprite.faces, bob: sprite.bob, ...(directions === undefined ? {} : { directions }), ...(footRow === undefined ? {} : { footRow }) }];
    }));

/** La grafica di un servitore per id d'aspetto; uno sconosciuto usa il fuoco fatuo (un test controlla i dati). */
export function minionArt(visual: string): MinionArt {
  return MINION_ART[visual] ?? MINION_ART.crypt_wisp!;
}
