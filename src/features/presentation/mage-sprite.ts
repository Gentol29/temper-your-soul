import type { CharacterAppearance } from '../character/appearance';
import type { CharacterMotion } from './adventurer-body';
import type { CharacterPixels } from './character-art';
import { MAGE_FRAMES, MAGE_OUTLINE, MAGE_SYMBOLS, MAGE_VOID, type MageMaterial } from './mage-sprite-data';
import { PixelPainter } from './pixel-painter';
import { SHADOW_EQUIPMENT, SHADOW_GRIP, drawShadowHeld, shadowTrim, type ShadowMaterial } from './shadow-equipment';
import { SHADOW_ANIMATION, shadowMotionForSlot } from './shadow-motion';

/*
 * Il Mago reso in 3D (`mage-sprite-data.ts`). Ogni pixel ricorda materiale e tono: armatura e stivali sono rampe di colore, le
 * armi sono i disegni canonici di `shadow-equipment.ts` agganciati alle mani del modello. Solo aspetto.
 */

/** Le viste rese; le altre tre sono le stesse specchiate, come il resto della figura quando si mira a sinistra. */
export const MAGE_VIEWS = ['S', 'SE', 'E', 'NE', 'N'] as const;
export type MageView = (typeof MAGE_VIEWS)[number];
const DEFAULT_VIEW: MageView = 'SE';

/** La vista da mostrare per una mira sullo schermo (dx, dy): la figura si specchia gia' per il segno di dx. */
export function mageViewFromAim(dx: number, dy: number): MageView {
  const degrees = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
  if (degrees > 67.5) return 'S';
  if (degrees > 22.5) return 'SE';
  if (degrees > -22.5) return 'E';
  return degrees > -67.5 ? 'NE' : 'N';
}

/** Quanti fotogrammi ha ogni animazione: i 12 del gioco si distribuiscono su questi. */
const MAGE_CLIP_FRAMES = { idle: 4, walk: 6, attack: 6 } as const;

/** Rampe predefinite a sei toni (ombra -> luce), senza oggetto nello slot. */
const MAGE_RAMPS: Readonly<Record<MageMaterial, readonly string[]>> = {
  veste: ['#131318', '#1d1d24', '#2c2c36', '#40404c', '#585864', '#74747f'],
  mantello: ['#100f15', '#1a1820', '#29262f', '#3b3742', '#514c58', '#6b6572'],
  rifinitura: ['#33261a', '#4f3b24', '#715832', '#927643', '#ae9255', '#c4a868'],
  cintura: ['#1c1410', '#2c2018', '#402e22', '#58402e', '#70543c', '#8c6c4e'],
  pelle: ['#3f2d28', '#63483f', '#8a6452', '#ae7d69', '#c69b81', '#dcbb9f'],
  capelli: ['#2f2f36', '#45454d', '#5f5f67', '#7c7c84', '#9a9aa2', '#b4b4b4'],
  stivale: ['#121014', '#1e1a20', '#2e282e', '#423a40', '#584e54', '#70666a'],
  gamba: ['#0f0e12', '#17151a', '#211f26', '#2d2a32', '#3a373f', '#48454e'],
  fodera: ['#2c060c', '#480a10', '#6c1016', '#8e1a1c', '#ae2a24', '#cc4430'],
  gemma: ['#a01c10', '#d03414', '#ee5a1c', '#ff8a30', '#ffb450', '#ffdc90'],
};
const MAGE_OUTLINE_COLOR = '#0b0a0e';
const MAGE_VOID_COLOR = '#08060a';
/** La riga piu' alta della presa di un oggetto in mano: sopra, l'oggetto uscirebbe dal fotogramma. Provvisorio. */
const MAGE_HELD_MIN_Y = 28;
/** Le colonne della presa, per lo stesso motivo. Provvisorie. */
const MAGE_HELD_X = [18, 46] as const;
/** Il fotogramma (su 12) in cui il caricamento diventa colpo, come in `shadow-motion.ts`. */
const MAGE_STRIKE_FRAME = 6;
/** Quanto dell'asta, sopra la presa, passa davanti al corpo. Provvisorio. */
const MAGE_SHAFT_ABOVE_GRIP = 4;
const SKIN = '#ae7d69', SKIN_SHADOW = '#63483f';

/** Una tinta scurita o schiarita, per i toni di una rampa presa da un oggetto. */
function tinted(color: string, amount: number): string {
  const channel = (i: number): string => Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * amount)).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Il punto fra due tinte. */
function mixed(a: string, b: string): string {
  const channel = (i: number): string => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** I sei toni di un materiale dalle sue tre tinte: ombra, base, luce. */
const rampOf = (art: ShadowMaterial): readonly string[] => [tinted(art.shade, 0.6), tinted(art.shade, 0.85), mixed(art.shade, art.base), art.base, mixed(art.base, art.edge), art.edge];
const accentRamp = (color: string): readonly string[] => [0.3, 0.45, 0.6, 0.8, 1, 1.15].map((amount) => tinted(color, amount));

const decoded = new Map<string, readonly string[]>();

/** Le righe di simboli di un fotogramma (una sola volta). */
function rowsOf(key: string, encoded: string): readonly string[] {
  let rows = decoded.get(key);
  if (rows === undefined) {
    rows = encoded.split(',').map((row) => row.replace(/(\d+)(.)/g, (_, count: string, symbol: string) => symbol.repeat(Number(count))));
    decoded.set(key, rows);
  }
  return rows;
}

export function magePixels(appearance: CharacterAppearance, animation: CharacterMotion & { readonly view?: MageView }): CharacterPixels {
  const f = animation.frame, pose = animation.state === 'cast' ? 'attack' : animation.state;
  const slot = animation.attackSlot ?? 'primary_hand';
  const clip = pose === 'attack' ? slot : pose;
  const index = Math.floor((f * MAGE_CLIP_FRAMES[pose]) / SHADOW_ANIMATION.frames);
  const key = `${appearance.body === 'female' ? 'female' : 'male'}_${clip}_${animation.view ?? DEFAULT_VIEW}_${index}`;
  const frame = MAGE_FRAMES[key]!;
  const motion = shadowMotionForSlot('mage', f, pose, animation.attackSlot);

  const lookup = (wanted: keyof CharacterAppearance['equipment']): ShadowMaterial | undefined => {
    const item = appearance.equipment[wanted];
    const art = item ? SHADOW_EQUIPMENT[item.familyId] : undefined;
    return art?.slot === wanted ? art : undefined;
  };
  const armor = lookup('armor'), boots = lookup('boots'), primaryArt = lookup('primary_hand'), secondaryArt = lookup('secondary_hand');
  const ramps: Record<MageMaterial, readonly string[]> = {
    ...MAGE_RAMPS,
    ...(armor ? { veste: rampOf(armor), mantello: rampOf({ ...armor, base: armor.shade, edge: armor.base }), fodera: accentRamp(armor.accent), rifinitura: accentRamp(shadowTrim(appearance.equipment.armor!)) } : {}),
    ...(boots ? { stivale: rampOf(boots) } : {}),
  };

  const output = new PixelPainter(SHADOW_ANIMATION.frameSize, SHADOW_ANIMATION.frameSize);
  const held = (art: ShadowMaterial | undefined, hand: readonly [number, number, boolean], itemSlot: 'primary_hand' | 'secondary_hand', angle: number, minY?: number): void => {
    if (art === undefined) return;
    const layer = new PixelPainter(SHADOW_ANIMATION.bodySize, SHADOW_ANIMATION.bodySize);
    drawShadowHeld(layer, art, shadowTrim(appearance.equipment[itemSlot]!));
    // Quando la mano sale molto, la presa scorre lungo l'oggetto: resta dentro il fotogramma, che non si allarga.
    const x = Math.max(MAGE_HELD_X[0], Math.min(MAGE_HELD_X[1], hand[0]));
    output.stamp(layer, SHADOW_GRIP.x, SHADOW_GRIP.y, x, Math.max(hand[1], MAGE_HELD_MIN_Y), angle, minY === undefined ? {} : { minY });
  };
  // A riposo, in marcia e nel caricamento l'arma passa dietro il corpo; nel colpo sta dove sta la mano. Cosi' il viso resta libero.
  const primaryBehind = pose !== 'attack' || f < MAGE_STRIKE_FRAME || !frame.hand[2];
  const secondaryBehind = !frame.far[2];
  if (secondaryBehind) held(secondaryArt, frame.far, 'secondary_hand', motion.secondaryAngle ?? 0);
  if (primaryBehind) held(primaryArt, frame.hand, 'primary_hand', motion.weaponAngle);

  rowsOf(key, frame.rows).forEach((row, dy) => {
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x]!;
      if (symbol === '.') continue;
      const material = MAGE_SYMBOLS[symbol];
      output.pixels[frame.y + dy]![x] = symbol === MAGE_OUTLINE ? MAGE_OUTLINE_COLOR : symbol === MAGE_VOID ? MAGE_VOID_COLOR : ramps[material![0]][material![1]]!;
    }
  });

  if (!secondaryBehind) held(secondaryArt, frame.far, 'secondary_hand', motion.secondaryAngle ?? 0);
  if (!primaryBehind) held(primaryArt, frame.hand, 'primary_hand', motion.weaponAngle);
  // La testa dell'arma resta dietro il capo, ma l'asta passa davanti al corpo quando la mano e' davanti: l'arma si vede sempre.
  else if (frame.hand[2]) held(primaryArt, frame.hand, 'primary_hand', motion.weaponAngle, SHADOW_GRIP.y - MAGE_SHAFT_ABOVE_GRIP);
  if (motion.charge > 0) {
    const x = Math.round(frame.far[0]), y = Math.round(frame.far[1]) - 5, r = Math.round(2 + motion.charge * 3);
    output.poly([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], '#512532');
    output.poly([[x, y - r + 1], [x + r - 1, y], [x, y + r - 1], [x - r + 1, y]], '#a54b51');
    output.rect(x, y - 1, 2, 2, '#d4876f');
  }
  // Le dita sopra l'impugnatura, quando l'oggetto e' davanti.
  const fingers = (hand: readonly [number, number, boolean]): void => {
    const x = Math.round(hand[0]), y = Math.round(hand[1]);
    output.rect(x - 1, y, 3, 3, SKIN_SHADOW);
    output.rect(x, y, 2, 1, SKIN);
  };
  if (primaryArt && frame.hand[2]) fingers(frame.hand);
  if (secondaryArt && !secondaryBehind) fingers(frame.far);
  return { width: output.width, height: output.height, pixels: output.pixels };
}
