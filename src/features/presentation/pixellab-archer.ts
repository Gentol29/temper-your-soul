import type { CharacterAppearance } from '../character/appearance';
import type { CharacterMotion } from './adventurer-body';
import type { CharacterPixels } from './character-art';
import { heroPixels, rampOf, type HeroSpec } from './hero-sprite';
import { PIXELLAB_ARCHER_BOW_ANGLES, PIXELLAB_ARCHER_BOW_MIRRORS, PIXELLAB_ARCHER_FRAMES, PIXELLAB_ARCHER_RAMPS, PIXELLAB_ARCHER_SYMBOLS } from './pixellab-archer-data';
import { SHADOW_ANIMATION } from './shadow-motion';
import type { NativeSpriteView } from './sprite-view';
import manifest from '../../assets/characters/archer-male-pixellab/manifest.json';

/** Il gioco campiona i clip PixelLab sui suoi dodici passi di sola presentazione. */
export const PIXELLAB_ARCHER_CLIPS = { idle: manifest.clips.idle.frames, walk: manifest.clips.walk.frames, attack: manifest.clips.attack.frames } as const;
export const PIXELLAB_ARCHER_DIRECTIONS: readonly NativeSpriteView[] = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
const ANGLES: Readonly<Record<NativeSpriteView, number>> = { E: 0, SE: Math.PI / 4, S: Math.PI / 2,
  SW: 3 * Math.PI / 4, W: Math.PI, NW: -3 * Math.PI / 4, N: -Math.PI / 2, NE: -Math.PI / 4 };

const fittedRamp = (base: readonly string[], target: readonly string[]): readonly string[] =>
  base.map((_color, index) => target[Math.round(index / Math.max(1, base.length - 1) * (target.length - 1))]!);

const SPEC: HeroSpec<string> = {
  kind: 'archer', frames: {}, symbols: PIXELLAB_ARCHER_SYMBOLS, ramps: PIXELLAB_ARCHER_RAMPS,
  outline: '!', outlineColor: '#0c0b0e', voidSymbol: '?', headRows: 19, clampHeld: false, secondaryOnBack: true,
  primaryGrip: [manifest.equipment.primaryGrip[0],manifest.equipment.primaryGrip[1]],
  quiverAngle: manifest.equipment.quiverAngle, quiverScale: manifest.equipment.quiverScale,
  primaryMirror: (motion) => PIXELLAB_ARCHER_BOW_MIRRORS[pixellabArcherFrameKey(motion)]!,
  gripInFront: (motion) => (motion.direction ?? motion.view ?? 'SE') === 'E',
  weaponAngle: (motion) => PIXELLAB_ARCHER_BOW_ANGLES[pixellabArcherFrameKey(motion)]!,
  shotHeading: (motion) => ANGLES[motion.direction ?? motion.view ?? 'SE'],
  worn: ({ armor, boots }) => ({
    ...(armor ? { cuoio: fittedRamp(PIXELLAB_ARCHER_RAMPS.cuoio, rampOf(armor)) } : {}),
    ...(boots ? { stivale: fittedRamp(PIXELLAB_ARCHER_RAMPS.stivale, rampOf(boots)) } : {}),
  }),
};

export function pixellabArcherFrameKey(animation: CharacterMotion): string {
  // I buff e lo scatto mantengono il riposo del nuovo corpo; l'effetto resta guidato dagli eventi esistenti.
  const state = animation.state === 'cast'
    ? ((animation.attackSlot ?? 'primary_hand') === 'primary_hand' ? 'attack' : 'idle') : animation.state;
  const index = Math.min(PIXELLAB_ARCHER_CLIPS[state] - 1,
    Math.floor(animation.frame / SHADOW_ANIMATION.frames * PIXELLAB_ARCHER_CLIPS[state]));
  return `${state}_${animation.direction ?? animation.view ?? 'SE'}_${index}`;
}

/** Corpo PixelLab senza oggetti incorporati; i quattro slot usano gli strati dell'equipaggiamento esistente. */
export function pixellabArcherPixels(appearance: CharacterAppearance, animation: CharacterMotion): CharacterPixels {
  const frame = PIXELLAB_ARCHER_FRAMES[pixellabArcherFrameKey(animation)]!;
  return heroPixels(SPEC, appearance, animation, frame);
}
