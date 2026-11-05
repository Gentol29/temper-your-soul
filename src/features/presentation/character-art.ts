import { PixelPainter } from './pixel-painter';
import { bodyAnchors, bodyWidth, drawAdventurer, drawArms, drawHands, drawHeroine, type CharacterMotion } from './adventurer-body';
import { drawWearable, drawWearableBack } from './wearable-draw';
import type { CharacterAppearance, BodyType } from '../character/appearance';
import type { EquipmentSlot } from '../items/equipment-slot';
import { shadowCharacterPixels } from './shadow-character';
import { SHADOW_ANIMATION } from './shadow-motion';

export interface WearableArt { readonly slot: EquipmentSlot; readonly shape: string; readonly color: string; readonly light: string }
/** Registro storico dei ritratti; il corpo C e le icone condividono SHADOW_EQUIPMENT. */
export const WEARABLES: Readonly<Record<string, WearableArt>> = {
  ossuary_lantern:{slot:'secondary_hand',shape:'lantern',color:'#778d76',light:'#d5edba'},
  grave_boots:{slot:'boots',shape:'grave',color:'#706e64',light:'#ded7b8'},
  thorn_bow:{slot:'primary_hand',shape:'thorn-bow',color:'#5b7c3d',light:'#cadb83'},
  reed_mantle:{slot:'armor',shape:'reed',color:'#536e42',light:'#c2ce86'},
  cinder_orb:{slot:'secondary_hand',shape:'cinder',color:'#8a4934',light:'#ffb45d'},
  ember_treads:{slot:'boots',shape:'ember',color:'#62483f',light:'#ff9b48'},
  glacier_mirror:{slot:'secondary_hand',shape:'mirror',color:'#6aafc7',light:'#e5faff'},
  rime_boots:{slot:'boots',shape:'rime',color:'#447f9c',light:'#aeeaff'},
  arcane_staff: {slot:'primary_hand',shape:'staff',color:'#9366ce',light:'#e0c6ff'},
  hunter_bow: {slot:'primary_hand',shape:'bow',color:'#8a643b',light:'#aee081'},
  storm_scepter: {slot:'primary_hand',shape:'scepter',color:'#586fb2',light:'#ffe98d'},
  guardian_blade: {slot:'primary_hand',shape:'sword',color:'#8895a5',light:'#f5dba0'},
  forge_hammer: {slot:'primary_hand',shape:'hammer',color:'#69433e',light:'#ffad57'},
  frost_lance: {slot:'primary_hand',shape:'lance',color:'#4ca4c8',light:'#c6faff'},
  frost_grimoire: {slot:'secondary_hand',shape:'book',color:'#395da4',light:'#9ae4ff'},
  spirit_talisman: {slot:'secondary_hand',shape:'talisman',color:'#437f7a',light:'#afffe0'},
  spore_fan: {slot:'secondary_hand',shape:'fan',color:'#647d42',light:'#dfb0f2'},
  meteor_mantle: {slot:'armor',shape:'mantle',color:'#66334c',light:'#ee9d60'},
  ember_aegis: {slot:'armor',shape:'aegis',color:'#874c3a',light:'#ffcf6b'},
  tomb_shroud: {slot:'armor',shape:'shroud',color:'#494359',light:'#b5a9d4'},
  forge_plate: {slot:'armor',shape:'plate',color:'#666777',light:'#ff9351'},
  blizzard_veil: {slot:'armor',shape:'veil',color:'#639fbd',light:'#c0efff'},
  astral_boots: {slot:'boots',shape:'astral',color:'#65488f',light:'#d6b4ff'},
  wind_boots: {slot:'boots',shape:'wind',color:'#4d7a72',light:'#c7f9d8'},
  bog_boots: {slot:'boots',shape:'bog',color:'#646343',light:'#c0d475'},
};
export interface CharacterPixels { readonly width: number; readonly height: number; readonly pixels: readonly (readonly string[])[] }
type Resolution = 'game' | 'portrait';
const cache = new Map<string, CharacterPixels>();
// Quattro equipaggiamenti × dodici frame × (idle, cammino e quattro attacchi), più le anteprime.
export const CHARACTER_ART = { gameWidth: 64, gameHeight: 64, feetX:32, feetY:53, portraitWidth: 128, portraitHeight: 128, cacheLimit: 512 } as const;

/** Sprite di gioco C modulare; il ramo portrait conserva i disegni storici. */
export function characterPixels(appearance: CharacterAppearance, resolution: Resolution, pose = 0, casting = false, motion?: CharacterMotion): CharacterPixels {
  const animation = motion ?? {state: casting ? 'cast' : pose ? 'walk' : 'idle', frame: pose};
  const frames=resolution==='game'?SHADOW_ANIMATION.frames:8;
  const direction=resolution==='game'&&animation.state==='walk'?(animation.walkDirection??1):1;
  const frame = ((Math.floor(animation.frame)*direction % frames) + frames) % frames;
  const slots = ['armor','boots','secondary_hand','primary_hand'] as const;
  // Solo il Mago ha piu' viste: per le altre classi non moltiplicano la cache.
  const view=appearance.characterClass==='mage'?animation.view:undefined;
  const key = JSON.stringify([appearance.body,appearance.characterClass,resolution,animation.state,animation.attackSlot,frame,view,slots.map(slot=> {
    const item=appearance.equipment[slot];return item ? [item.familyId,item.rarity] : null;
  })]);
  const cached = cache.get(key); if(cached) return cached;
  if(resolution==='game'){
    const result=shadowCharacterPixels(appearance,{...animation,frame});
    if(cache.size>=CHARACTER_ART.cacheLimit)cache.delete(cache.keys().next().value!);
    cache.set(key,result);return result;
  }
  const painter = new PixelPainter(64,64,resolution==='portrait'?2:1,12,4);
  const anchors = bodyAnchors({...animation,frame},appearance.body);
  const fitted=(draw:(layer:PixelPainter)=>void):void=>{
    const layer=new PixelPainter(40,56,painter.scale);draw(layer);
    painter.fit(layer,y=>bodyWidth(appearance.body,y-anchors.bob));
  };
  for(const slot of ['secondary_hand','primary_hand'] as const) {
    const item=appearance.equipment[slot],art=item?WEARABLES[item.familyId]:undefined;
    if(art?.slot===slot) drawWearable(painter,appearance,slot,art,anchors,'back');
  }
  fitted(layer=>drawWearableBack(layer,appearance,WEARABLES,anchors));
  drawArms(painter,anchors);
  // La base femminile ha già le sue proporzioni; l'equipaggiamento resta adattato con `fitted`.
  if(appearance.body==='female') drawHeroine(painter,anchors);
  else fitted(layer=>drawAdventurer(layer,anchors));
  for(const slot of ['armor','boots'] as const) {
    const item=appearance.equipment[slot],art=item?WEARABLES[item.familyId]:undefined;
    if(art?.slot===slot) fitted(layer=>drawWearable(layer,appearance,slot,art,anchors));
  }
  for(const slot of ['secondary_hand','primary_hand'] as const) {
    const item=appearance.equipment[slot];const art=item ? WEARABLES[item.familyId] : undefined;
    if(art?.slot===slot) drawWearable(painter,appearance,slot,art,anchors);
  }
  drawHands(painter,anchors);
  const width=resolution==='portrait'?CHARACTER_ART.portraitWidth:CHARACTER_ART.gameWidth;
  const height=resolution==='portrait'?CHARACTER_ART.portraitHeight:CHARACTER_ART.gameHeight;
  const pixels=resolution==='portrait' ? painter.pixels : Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>painter.pixels[Math.floor((y+.5)*64/height)]![Math.floor((x+.5)*64/width)]!));
  const result={width,height,pixels};
  if(cache.size>=CHARACTER_ART.cacheLimit) cache.delete(cache.keys().next().value!);
  cache.set(key,result);return result;
}

export const DEFAULT_APPEARANCE: CharacterAppearance = {body:'male',equipment:{}};
export const BODY_LABELS: Readonly<Record<BodyType,string>> = {male:'Maschio',female:'Femmina'};
