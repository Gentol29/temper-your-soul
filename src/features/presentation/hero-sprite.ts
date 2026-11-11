import type { CharacterAppearance } from '../character/appearance';
import type { CharacterMotion } from './adventurer-body';
import type { CharacterPixels } from './character-art';
import type { HeroFrame } from './hero-frame';
import { PixelPainter } from './pixel-painter';
import { SHADOW_EQUIPMENT, SHADOW_GRIP, drawShadowHeld, shadowTrim, type ShadowMaterial } from './shadow-equipment';
import { SHADOW_ANIMATION, shadowMotionForSlot } from './shadow-motion';
import type { SpriteView } from './sprite-view';

/*
 * Compositore dei corpi raster modulari (incluso l'Arciere PixelLab; il Mago ha il suo, `mage-sprite.ts`).
 * Ogni pixel ricorda materiale e tono: armatura e stivali sono rampe di colore e non cambiano la sagoma; armi e
 * oggetti in mano sono i disegni canonici di `shadow-equipment.ts` agganciati alle mani del modello. Solo aspetto.
 */

/** Una tinta scurita o schiarita, per i toni di una rampa presa da un oggetto. */
export function tinted(color: string, amount: number): string {
  const channel = (i: number): string => Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * amount)).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Il punto fra due tinte. */
export function mixed(a: string, b: string): string {
  const channel = (i: number): string => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** I sei toni di un materiale dalle sue tre tinte: ombra, base, luce. */
export const rampOf = (art: Pick<ShadowMaterial, 'shade' | 'base' | 'edge'>): readonly string[] =>
  [tinted(art.shade, 0.6), tinted(art.shade, 0.85), mixed(art.shade, art.base), art.base, mixed(art.base, art.edge), art.edge];
/** Sei toni di un accento, dal piu' scuro al piu' acceso. */
export const accentRamp = (color: string): readonly string[] => [0.3, 0.45, 0.6, 0.8, 1, 1.15].map((amount) => tinted(color, amount));

/** Gli oggetti indossati che cambiano i colori del corpo. */
export interface HeroWorn {
  readonly armor?: ShadowMaterial;
  readonly boots?: ShadowMaterial;
  readonly armorTrim?: string;
}

export interface HeroSpec<M extends string> {
  readonly kind: 'warrior' | 'archer';
  readonly headRows?: number;
  readonly outlineColor?: string;
  readonly clampHeld?: boolean;
  readonly secondaryOnBack?: boolean;
  readonly weaponAngle?: (animation: CharacterMotion) => number;
  readonly shotHeading?: (animation: CharacterMotion) => number;
  readonly primaryGrip?: readonly [number, number];
  readonly primaryMirror?: (animation: CharacterMotion) => boolean;
  /** La fascia della presa rimane davanti al polsino nelle viste che lo richiedono. */
  readonly gripInFront?: (animation: CharacterMotion) => boolean;
  readonly quiverAngle?: number;
  readonly quiverScale?: number;
  readonly frames: Readonly<Record<string, HeroFrame>>;
  readonly symbols: Readonly<Record<string, readonly [M, number]>>;
  readonly outline: string;
  readonly voidSymbol: string;
  readonly ramps: Readonly<Record<M, readonly string[]>>;
  /** Le rampe sostituite da armatura e stivali: solo colori, mai la sagoma. */
  readonly worn: (worn: HeroWorn) => Partial<Record<M, readonly string[]>>;
}

/** Quanti fotogrammi ha ogni animazione: i 12 del gioco si distribuiscono su questi. */
export const HERO_CLIP_FRAMES = { idle: 4, walk: 6, attack: 6 } as const;
const DEFAULT_VIEW: SpriteView = 'SE';
const OUTLINE_COLOR = '#0b0a0e';
const VOID_COLOR = '#08060a';
/** La riga piu' alta e le colonne della presa di un oggetto in mano: oltre, l'oggetto uscirebbe dal fotogramma. Provvisori. */
export const HERO_HELD_MIN_Y = 28;
export const HERO_HELD_X = [18, 46] as const;
/** Quanto dell'impugnatura, sopra la presa, passa davanti al corpo quando l'arma sta dietro. Provvisorio. */
const HERO_SHAFT_ABOVE_GRIP = 4;
/** La faretra sulla schiena: rimpicciolita e inclinata come nel corpo C. Provvisori. */
const QUIVER_SCALE = 0.7, QUIVER_ANGLE = -0.12;
const SKIN = '#ae7d69', SKIN_SHADOW = '#63483f';
const STRING = '#8f7f77', ARROW = '#8f7a68', ARROW_TIP = '#a69a8c';

const decoded = new Map<string, readonly string[]>();
function rowsOf(encoded: string): readonly string[] {
  const key = encoded;
  let rows = decoded.get(key);
  if (rows === undefined) {
    rows = encoded.split(',').map((row) => row.replace(/(\d+)(.)/g, (_, count: string, symbol: string) => symbol.repeat(Number(count))));
    decoded.set(key, rows);
  }
  return rows;
}

/**
 * La presa spostata quanto basta perche' l'oggetto ruotato resti dentro il fotogramma con un bordo libero:
 * armi lunghe (lancia, martello) nei colpi piu' ampi scorrono verso l'interno invece di essere tagliate.
 */
function inFrame(layer: PixelPainter, x: number, y: number, angle: number, minY = -Infinity): readonly [number, number] {
  const cos = Math.cos(angle), sin = Math.sin(angle), last = SHADOW_ANIMATION.frameSize - 1;
  let minX = Infinity, maxX = -Infinity, top = Infinity, bottom = -Infinity;
  layer.pixels.forEach((row, sy) => {
    if (sy < minY) return;
    row.forEach((color, sx) => {
      if (!color) return;
      const dx = sx + 0.5 - SHADOW_GRIP.x, dy = sy + 0.5 - SHADOW_GRIP.y;
      const px = x + dx * cos - dy * sin, py = y + dx * sin + dy * cos;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
    });
  });
  if (minX === Infinity) return [x, y];
  const shift = (low: number, high: number): number => (low < 1.5 ? 1.5 - low : high > last - 0.5 ? last - 0.5 - high : 0);
  return [x + shift(minX, maxX), y + shift(top, bottom)];
}

/** Le righe della testa: viso, capelli e occhi restano sopra gli oggetti in mano, tranne vicino alla mano. Provvisori. */
export const HERO_HEAD_ROWS = 27;
const HERO_HAND_CLEARANCE = 6;

/** La chiave del fotogramma reso per un passo di gioco. */
export function heroFrameKey(appearance: CharacterAppearance, animation: CharacterMotion & { readonly view?: SpriteView }): string {
  const pose = animation.state === 'cast' ? 'attack' : animation.state;
  const clip = pose === 'attack' ? (animation.attackSlot ?? 'primary_hand') : pose;
  const index = Math.floor((animation.frame * HERO_CLIP_FRAMES[pose]) / SHADOW_ANIMATION.frames);
  return `${appearance.body === 'female' ? 'female' : 'male'}_${clip}_${animation.view ?? DEFAULT_VIEW}_${index}`;
}

export function heroPixels<M extends string>(spec: HeroSpec<M>, appearance: CharacterAppearance, animation: CharacterMotion & { readonly view?: SpriteView }, sourceFrame?: HeroFrame): CharacterPixels {
  const f = animation.frame, pose = animation.state === 'cast' ? 'attack' : animation.state;
  const slot = animation.attackSlot ?? 'primary_hand';
  const key = heroFrameKey(appearance, animation);
  const frame = sourceFrame ?? spec.frames[key]!;
  const originalMotion = shadowMotionForSlot(spec.kind, f, pose, animation.attackSlot);
  const motion = spec.weaponAngle ? { ...originalMotion, weaponAngle: spec.weaponAngle(animation) } : originalMotion;

  const lookup = (wanted: keyof CharacterAppearance['equipment']): ShadowMaterial | undefined => {
    const item = appearance.equipment[wanted];
    const art = item ? SHADOW_EQUIPMENT[item.familyId] : undefined;
    return art?.slot === wanted ? art : undefined;
  };
  const armor = lookup('armor'), boots = lookup('boots'), primaryArt = lookup('primary_hand'), secondaryArt = lookup('secondary_hand');
  const ramps: Record<M, readonly string[]> = {
    ...spec.ramps,
    ...spec.worn({ ...(armor ? { armor, armorTrim: shadowTrim(appearance.equipment.armor!) } : {}), ...(boots ? { boots } : {}) }),
  };

  const output = new PixelPainter(SHADOW_ANIMATION.frameSize, SHADOW_ANIMATION.frameSize);
  const bow = primaryArt !== undefined && (primaryArt.shape === 'bow' || primaryArt.shape === 'thorn-bow');
  const shooting = bow && pose === 'attack' && slot === 'primary_hand';
  const pulling = shooting && (spec.primaryGrip ? f >= 3 && f <= 5 : f >= 2 && f <= 5);
  let primaryAt: readonly [number, number] | undefined;
  const grip = (hand: readonly [number, number, boolean]): readonly [number, number] =>
    spec.clampHeld === false ? [hand[0], hand[1]] :
    [Math.max(HERO_HELD_X[0], Math.min(HERO_HELD_X[1], hand[0])), Math.max(hand[1], HERO_HELD_MIN_Y)];
  const held = (art: ShadowMaterial | undefined, hand: readonly [number, number, boolean], itemSlot: 'primary_hand' | 'secondary_hand', angle: number, minY?: number, maxY?: number): void => {
    if (art === undefined) return;
    const layer = new PixelPainter(SHADOW_ANIMATION.bodySize, SHADOW_ANIMATION.bodySize);
    drawShadowHeld(layer, art, shadowTrim(appearance.equipment[itemSlot]!), itemSlot === 'primary_hand' && pulling);
    if (itemSlot === 'primary_hand' && spec.primaryMirror?.(animation)) {
      const pivot = spec.primaryGrip![0];
      for (const row of layer.pixels) {
        const original = [...row];
        for (let x = 0; x < row.length; x++) row[x] = original[2*pivot-x] ?? '';
      }
    }
    // Quando la mano sale molto, la presa scorre lungo l'oggetto: resta dentro il fotogramma, che non si allarga.
    const [x, y] = spec.clampHeld === false ? grip(hand) : inFrame(layer, ...grip(hand), angle, minY);
    const sourceGrip = itemSlot === 'primary_hand' && spec.primaryGrip ? spec.primaryGrip : [SHADOW_GRIP.x, SHADOW_GRIP.y];
    if (itemSlot === 'primary_hand' && minY === undefined) primaryAt = [x, y];
    output.stamp(layer, sourceGrip[0]!, sourceGrip[1]!, x, y, angle, {
      ...(minY === undefined ? {} : { minY }), ...(maxY === undefined ? {} : { maxY }),
    });
  };
  const quiver = secondaryArt?.shape === 'quiver' && spec.secondaryOnBack !== false;
  const onBack = (): void => {
    const layer = new PixelPainter(SHADOW_ANIMATION.bodySize, SHADOW_ANIMATION.bodySize);
    drawShadowHeld(layer, secondaryArt!, shadowTrim(appearance.equipment.secondary_hand!));
    output.stamp(layer, SHADOW_GRIP.x, SHADOW_GRIP.y, Math.round(frame.back[0]), Math.round(frame.back[1]), spec.quiverAngle ?? (motion.tilt + QUIVER_ANGLE), { scale: spec.quiverScale ?? QUIVER_SCALE });
  };

  // L'arma sta davanti quando la mano e' davanti al petto; nel caricamento del fendente passa dietro, come nel corpo C.
  const striking = pose === 'attack' && slot === 'primary_hand';
  const primaryBehind = !frame.hand[2] || (striking && motion.weaponBehind);
  const secondaryBehind = !frame.far[2];
  const shotBehind = spec.primaryGrip !== undefined && !frame.hand[2] && !frame.far[2];
  if (quiver && !frame.back[2]) onBack();
  if (!quiver && secondaryBehind) held(secondaryArt, frame.far, 'secondary_hand', motion.secondaryAngle ?? 0);
  if (primaryBehind) held(primaryArt, frame.hand, 'primary_hand', motion.weaponAngle);
  if (shotBehind) drawShot();

  const head: Array<readonly [number, number, string]> = [];
  rowsOf(frame.rows).forEach((row, dy) => {
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x]!;
      if (symbol === '.') continue;
      const material = spec.symbols[symbol];
      const color = symbol === spec.outline ? (spec.outlineColor ?? OUTLINE_COLOR) : symbol === spec.voidSymbol ? VOID_COLOR : ramps[material![0]][material![1]]!;
      output.pixels[frame.y + dy]![x] = color;
      if (frame.y + dy < (spec.headRows ?? HERO_HEAD_ROWS) && (symbol === spec.voidSymbol || material?.[0] === 'pelle' || material?.[0] === 'capelli')) head.push([x, frame.y + dy, color]);
    }
  });

  if (quiver && frame.back[2]) onBack();
  if (!quiver && !secondaryBehind) held(secondaryArt, frame.far, 'secondary_hand', motion.secondaryAngle ?? 0);
  if (!primaryBehind) held(primaryArt, frame.hand, 'primary_hand', motion.weaponAngle);
  // Dietro la testa resta la lama, ma l'impugnatura passa davanti quando la mano e' davanti: l'arma si vede sempre.
  else if (frame.hand[2]) held(primaryArt, frame.hand, 'primary_hand', motion.weaponAngle, SHADOW_GRIP.y - HERO_SHAFT_ABOVE_GRIP);
  // Corda tesa e freccia fra l'arco e la mano che tira, come nel corpo C.
  function drawShot(): void {
    if (!(shooting && (spec.primaryGrip ? pulling : f >= 2 && f <= 6))) return;
    const [hx, hy] = primaryAt ?? grip(frame.hand);
    // La punta e' un rettangolo 2 x 3: due pixel di margine perche' resti dentro il bordo libero.
    const last = SHADOW_ANIMATION.frameSize - 3;
    const inside = (x: number, y: number): readonly [number, number] => [Math.max(2, Math.min(last, x)), Math.max(2, Math.min(last, y))];
    const rotate = (x: number, y: number): readonly [number, number] =>
      inside(hx + x * Math.cos(motion.weaponAngle) - y * Math.sin(motion.weaponAngle), hy + x * Math.sin(motion.weaponAngle) + y * Math.cos(motion.weaponAngle));
    const stringX = spec.primaryGrip ? (spec.primaryMirror?.(animation) ? 2 : -2) : -1;
    const top = rotate(stringX, -13), bottom = rotate(stringX, 14);
    const heading = spec.shotHeading?.(animation);
    const tip = heading === undefined ? rotate(9, 0) : inside(hx + Math.cos(heading)*9, hy + Math.sin(heading)*9);
    const [fx, fy] = inside(frame.far[0], frame.far[1]);
    if (pulling) { output.line(top[0], top[1], fx, fy, STRING); output.line(fx, fy, bottom[0], bottom[1], STRING); }
    output.line(fx, fy, tip[0], tip[1], ARROW); output.rect(tip[0], tip[1] - 1, 2, 3, ARROW_TIP);
  }
  if (!shotBehind) drawShot();
  // Il viso resta libero: cio' che e' passato sopra la testa torna dietro, salvo accanto alla mano che lo impugna.
  // Solo nei colpi la mano alzata puo' portare l'oggetto davanti alla testa; a riposo e in marcia la testa vince sempre.
  const near = (hand: readonly [number, number, boolean], x: number, y: number): boolean => pose === 'attack' && Math.hypot(x - hand[0], y - hand[1]) < HERO_HAND_CLEARANCE;
  for (const [x, y, color] of head) if (!near(frame.hand, x, y) && !near(frame.far, x, y)) output.pixels[y]![x] = color;
  // Le dita sopra l'impugnatura, quando l'oggetto e' davanti.
  const fingers = (hand: readonly [number, number, boolean]): void => {
    const x = Math.round(hand[0]), y = Math.round(hand[1]);
    output.rect(x - 1, y, 3, 3, SKIN_SHADOW);
    output.rect(x, y, 2, 1, SKIN);
  };
  if (primaryArt && frame.hand[2]) fingers(frame.hand);
  if (bow && spec.primaryGrip && frame.far[2]) fingers(frame.far);
  if (secondaryArt && !quiver && !secondaryBehind) fingers(frame.far);
  if (primaryArt && spec.gripInFront?.(animation)) {
    const gripY=spec.primaryGrip?.[1] ?? SHADOW_GRIP.y;
    // Riporta davanti solo i pixel esistenti dell'impugnatura, senza ridisegnare il resto dell'arma.
    held(primaryArt,frame.hand,'primary_hand',motion.weaponAngle,gripY-1,gripY+2);
  }
  return { width: output.width, height: output.height, pixels: output.pixels };
}
