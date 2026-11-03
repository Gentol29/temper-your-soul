import type { CharacterClass } from '../character/character-class';
import type { EquipmentSlot } from '../items/equipment-slot';

/** Taratura estetica del corpo C scelto: corpo 48 px, margine per slanci e armi in movimento. */
export const SHADOW_ANIMATION = {
  frames: 12, bodySize: 48, frameSize: 64, padding: 8,
  fps: { idle: 8, walk: 14, attack: 16 },
  stride: 6, footLift: 5, kneeBend: 3, walkBounce: 1.5, capeSwing: 6,
} as const;
export type ShadowPose = keyof typeof SHADOW_ANIMATION.fps;
export interface ShadowPoint { readonly x: number; readonly y: number }
export interface ShadowMotion {
  readonly rootX: number; readonly rootY: number; readonly tilt: number;
  readonly stride: number; readonly leftLift: number; readonly rightLift: number;
  readonly hand: ShadowPoint; readonly farHand: ShadowPoint;
  readonly weaponAngle: number; readonly cape: number; readonly charge: number;
  readonly weaponBehind: boolean;
  readonly secondaryAngle?: number;
}
interface AttackBeat {
  readonly frame: number; readonly x: number; readonly y: number; readonly tilt: number;
  readonly hand: readonly [number, number]; readonly far: readonly [number, number];
  readonly weapon: number; readonly stance: number;
}
const ATTACK_BEATS: Readonly<Record<CharacterClass, readonly AttackBeat[]>> = {
  warrior: [
    {frame:0,x:0,y:0,tilt:0,hand:[34,27],far:[15,27],weapon:0,stance:0},
    {frame:3,x:-2,y:2,tilt:-.22,hand:[32,11],far:[17,24],weapon:-1.2,stance:-2},
    {frame:4,x:-2,y:2,tilt:-.2,hand:[30,10],far:[16,24],weapon:-1.35,stance:-3},
    {frame:5,x:2,y:-1,tilt:.23,hand:[34,24],far:[14,27],weapon:.75,stance:4},
    {frame:6,x:2,y:1,tilt:.26,hand:[30,28],far:[14,29],weapon:1.9,stance:5},
    {frame:8,x:1,y:2,tilt:.12,hand:[27,31],far:[15,28],weapon:2.1,stance:3},
    {frame:11,x:0,y:0,tilt:0,hand:[34,27],far:[15,27],weapon:0,stance:0},
  ],
  archer: [
    {frame:0,x:0,y:0,tilt:0,hand:[34,27],far:[15,27],weapon:0,stance:0},
    {frame:2,x:-1,y:1,tilt:-.1,hand:[35,23],far:[26,23],weapon:-.05,stance:2},
    {frame:5,x:-2,y:1,tilt:-.18,hand:[35,22],far:[16,22],weapon:-.08,stance:4},
    {frame:6,x:2,y:0,tilt:.12,hand:[35,22],far:[27,22],weapon:.12,stance:4},
    {frame:7,x:0,y:1,tilt:-.08,hand:[33,24],far:[22,25],weapon:-.12,stance:3},
    {frame:11,x:0,y:0,tilt:0,hand:[34,27],far:[15,27],weapon:0,stance:0},
  ],
  mage: [
    {frame:0,x:0,y:0,tilt:0,hand:[34,27],far:[15,27],weapon:0,stance:0},
    {frame:3,x:-1,y:2,tilt:-.16,hand:[30,21],far:[18,14],weapon:-.45,stance:-2},
    {frame:5,x:-2,y:1,tilt:-.18,hand:[30,19],far:[19,11],weapon:-.6,stance:-3},
    {frame:6,x:2,y:-1,tilt:.22,hand:[34,24],far:[29,19],weapon:.65,stance:4},
    {frame:8,x:1,y:1,tilt:.12,hand:[33,26],far:[26,23],weapon:.45,stance:3},
    {frame:11,x:0,y:0,tilt:0,hand:[34,27],far:[15,27],weapon:0,stance:0},
  ],
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function shadowMotion(kind: CharacterClass, frame: number, pose: ShadowPose): ShadowMotion {
  const f = ((Math.floor(frame) % SHADOW_ANIMATION.frames) + SHADOW_ANIMATION.frames) % SHADOW_ANIMATION.frames;
  const phase = f / SHADOW_ANIMATION.frames * Math.PI * 2;
  if (pose === 'walk') {
    const stride = Math.sin(phase) * SHADOW_ANIMATION.stride;
    // Il piede avanza nell'aria e torna indietro a terra: inverte il vecchio effetto pattinaggio.
    return { rootX: Math.sin(phase) * .6, rootY: -Math.abs(Math.cos(phase)) * SHADOW_ANIMATION.walkBounce,
      tilt: .08 + Math.cos(phase) * .06, stride,
      leftLift: Math.max(0, -Math.cos(phase)) * SHADOW_ANIMATION.footLift,
      rightLift: Math.max(0, Math.cos(phase)) * SHADOW_ANIMATION.footLift,
      hand: { x: 35 + Math.sin(phase + Math.PI) * 4, y: 26 + Math.cos(phase) * 2 },
      farHand: { x: 16 + Math.sin(phase) * 4, y: 26 - Math.cos(phase) * 2 },
      weaponAngle: .16 + Math.sin(phase + .4) * .2, cape: Math.sin(phase - 1.2) * SHADOW_ANIMATION.capeSwing,
      charge: 0, weaponBehind: false };
  }
  if (pose === 'idle') return {
    rootX: 0, rootY: Math.sin(phase) * .9, tilt: Math.sin(phase) * .025, stride: 0, leftLift: 0, rightLift: 0,
    hand: { x:34, y:27 + Math.sin(phase) }, farHand: { x:15, y:27 - Math.sin(phase) * .6 },
    weaponAngle: .12 + Math.sin(phase - .5) * .04, cape: Math.sin(phase - .8) * 1.5, charge: 0, weaponBehind: false,
  };
  const beats = ATTACK_BEATS[kind];
  const to = beats.find(beat => beat.frame >= f) ?? beats[beats.length - 1]!;
  const from = [...beats].reverse().find(beat => beat.frame <= f) ?? beats[0]!;
  const t = to.frame === from.frame ? 0 : (f - from.frame) / (to.frame - from.frame);
  return { rootX: lerp(from.x,to.x,t), rootY: lerp(from.y,to.y,t), tilt: lerp(from.tilt,to.tilt,t),
    stride: lerp(from.stance,to.stance,t), leftLift: 0, rightLift: f === 5 ? 2 : 0,
    hand:{x:lerp(from.hand[0],to.hand[0],t),y:lerp(from.hand[1],to.hand[1],t)},
    farHand:{x:lerp(from.far[0],to.far[0],t),y:lerp(from.far[1],to.far[1],t)},
    weaponAngle:lerp(from.weapon,to.weapon,t), cape: Math.sin((f - 2) / 12 * Math.PI * 2) * 7,
    charge: kind === 'mage' && f >= 2 && f <= 5 ? (f - 1) / 4 : 0,
    weaponBehind: kind === 'warrior' && f >= 1 && f <= 4 };
}

/** Oggetti diversi nello stesso slot conservano la stessa articolazione e la stessa impugnatura. */
export function shadowMotionForSlot(kind:CharacterClass,frame:number,pose:ShadowPose,slot:EquipmentSlot='primary_hand'):ShadowMotion {
  if(pose!=='attack'||slot==='primary_hand')return shadowMotion(kind,frame,pose);
  const rest=shadowMotion(kind,0,'idle'),t=frame/(SHADOW_ANIMATION.frames-1),pulse=Math.sin(t*Math.PI);
  if(slot==='secondary_hand')return {...rest,rootX:pulse,rootY:-pulse,tilt:pulse*.1,
    farHand:{x:15+pulse*9,y:27-pulse*9},secondaryAngle:-pulse*.4,cape:-pulse*4,charge:kind==='mage'?pulse:0};
  if(slot==='armor')return {...rest,rootY:-pulse*2,tilt:-pulse*.08,
    farHand:{x:15+pulse*3,y:27-pulse*10},hand:{x:34-pulse*2,y:27-pulse*7},cape:pulse*7,charge:kind==='mage'?pulse:0};
  return {...rest,rootX:pulse*3,rootY:pulse,tilt:pulse*.24,stride:pulse*5,leftLift:pulse*3,cape:-pulse*7};
}

export function torsoPoint(x: number, y: number, angle: number): ShadowPoint {
  const dx = x - 24, dy = y - 30;
  return { x: 24 + dx * Math.cos(angle) - dy * Math.sin(angle), y: 30 + dx * Math.sin(angle) + dy * Math.cos(angle) };
}
