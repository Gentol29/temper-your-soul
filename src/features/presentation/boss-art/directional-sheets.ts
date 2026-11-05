import type { BossSheet, SheetClip } from './boss-sheet';

/*
 * Fogli direzionali: figure modellate in 3D e rese con Blender (strumenti esterni, vedi `src/assets/art/boss-3d/LEGGIMI.md`).
 * Una riga per direzione (S, SE, E, NE, N, NW, W, SW), sei fotogrammi d'animazione per riga. Valori provvisori.
 */

const FRAMES = 6;
/** Tutte le animazioni puntano alla stessa riga: la riga 0 (S) e' anche la miniatura del bestiario. */
const LOOP: SheetClip = { row: 0, frames: FRAMES };

/** Ogni cella e' 128 x 128 px; i piedi (il perno del modello 3D) sono nel punto (64, 104). */
export const DIRECTIONAL_BOSS_SHEETS: Readonly<Record<string, BossSheet>> = {
  serpent_queen: {
    layout: {
      url: new URL('../../../assets/art/boss-3d/serpent_queen.png', import.meta.url).href,
      cell: { width: 128, height: 128 },
      feet: { x: 64, y: 104 },
      clips: { walk: LOOP, attack: LOOP, rageWalk: LOOP, rageAttack: LOOP, transform: LOOP, death: LOOP },
    },
    scale: 1,
    facesLeft: false,
    feetY: 30,
    walkFps: 6,
    portraitScale: 1,
    credits: ['meshy-serpent-queen'],
    directional: { frames: FRAMES },
  },
};
