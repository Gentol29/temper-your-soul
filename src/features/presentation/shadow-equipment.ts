import type { Item } from '../items/item';
import type { EquipmentSlot } from '../items/equipment-slot';
import { PixelPainter } from './pixel-painter';

export interface ShadowMaterial {
  readonly slot: EquipmentSlot; readonly shape: string;
  readonly base: string; readonly edge: string; readonly shade: string; readonly accent: string;
}
const material = (slot: EquipmentSlot, shape: string, base: string, edge: string, shade: string, accent: string): ShadowMaterial => ({slot,shape,base,edge,shade,accent});
/** Metallo annerito, cuoio e tessuti: l'elemento resta un accento, mai un filtro sul corpo. */
export const SHADOW_EQUIPMENT: Readonly<Record<string, ShadowMaterial>> = {
  guardian_blade: material('primary_hand','sword','#59535a','#a49690','#29262e','#86505b'),
  forge_hammer: material('primary_hand','hammer','#474046','#887b77','#272128','#b35942'),
  frost_lance: material('primary_hand','lance','#46515a','#8fa6ac','#242b34','#637e8a'),
  hunter_bow: material('primary_hand','bow','#58423d','#92766a','#2d2229','#81505a'),
  thorn_bow: material('primary_hand','thorn-bow','#454738','#7d8063','#242a22','#767653'),
  arcane_staff: material('primary_hand','staff','#4e3b43','#8b6c73','#291f2c','#a45160'),
  storm_scepter: material('primary_hand','scepter','#3c424c','#8d939e','#23232f','#776f9b'),
  spirit_talisman: material('secondary_hand','shield','#39373d','#81756f','#211e27','#8b4857'),
  spore_fan: material('secondary_hand','quiver','#403630','#7c675c','#211f26','#74674e'),
  frost_grimoire: material('secondary_hand','book','#383c52','#8d929d','#222333','#657f9c'),
  ossuary_lantern: material('secondary_hand','lantern','#464341','#8e8876','#24232a','#a79d7a'),
  cinder_orb: material('secondary_hand','cinder','#482f32','#9c6151','#261d28','#c36d4c'),
  glacier_mirror: material('secondary_hand','mirror','#3b4652','#9caeb3','#212731','#658692'),
  ember_aegis: material('armor','aegis','#44333b','#786067','#241d27','#a24d46'),
  forge_plate: material('armor','plate','#3e3b43','#736c73','#24222c','#a55b4b'),
  reed_mantle: material('armor','reed','#353b30','#686e55','#202620','#77724f'),
  meteor_mantle: material('armor','mantle','#432b3a','#79505e','#271b29','#a65a51'),
  tomb_shroud: material('armor','shroud','#34303e','#655c70','#201c29','#918075'),
  blizzard_veil: material('armor','veil','#34404c','#6e808a','#202634','#87959e'),
  bog_boots: material('boots','bog','#353831','#66664c','#20251f','#79714f'),
  grave_boots: material('boots','grave','#3d3939','#8b8174','#242127','#9c8d79'),
  ember_treads: material('boots','ember','#3d3035','#7b5d55','#251e29','#b65c44'),
  wind_boots: material('boots','wind','#303b3c','#677773','#1e272b','#8c9180'),
  astral_boots: material('boots','astral','#393042','#716176','#221d2c','#947280'),
  rime_boots: material('boots','rime','#34414b','#7c919a','#212832','#a3aeb1'),
};
export const SHADOW_INK = '#111014';
export const SHADOW_GRIP = { x:24, y:26 } as const;
const TRIMS = {common:'#77625d',uncommon:'#6b7356',rare:'#657b90',epic:'#88667f',legendary:'#a85150'} as const;
export const shadowTrim = (item: Item): string => TRIMS[item.rarity];

/** Oggetti canonici: la presa è sempre (24,26), anche cambiando famiglia o corpo. */
export function drawShadowHeld(p: PixelPainter, art: ShadowMaterial, trim = '#77625d', pulled = false): void {
  const {base:c,edge:l,shade:d,accent:a,shape}=art, o=SHADOW_INK, x=SHADOW_GRIP.x,y=SHADOW_GRIP.y;
  if(shape==='sword') {
    p.poly([[x,y],[x+6,12],[x+8,9],[x+9,13],[x+3,y+1]],o);
    p.poly([[x+1,y-2],[x+6,13],[x+7,12],[x+7,15],[x+3,y-2]],c);
    p.line(x+2,y-3,x+6,14,l);p.line(x-1,y-2,x+5,y+1,trim);p.line(x,y,x-1,y+6,d);p.rect(x-2,y+5,3,2,a);
  } else if(shape==='hammer') {
    p.rect(x-1,12,3,29,o);p.line(x,14,x,39,'#674b45');p.rect(x-1,y-2,3,5,trim);
    p.poly([[x-3,9],[x+10,9],[x+12,12],[x+10,20],[x-3,20],[x-5,17]],o);
    p.rect(x-2,11,12,7,c);p.rect(x-3,12,2,5,d);p.line(x-2,11,x+9,11,l);p.rect(x+8,12,2,5,trim);
    p.line(x+2,12,x+4,14,a);p.line(x+4,14,x+2,17,a);p.rect(x+5,13,1,3,a);
  } else if(shape==='lance'||shape==='staff'||shape==='scepter') {
    p.rect(x-1,11,3,32,o);p.line(x,12,x,41,c);p.rect(x-1,y-1,3,4,trim);p.line(x,30,x,40,'#6b514b');
    if(shape==='lance') {
      p.poly([[x,3],[x+4,12],[x+1,20],[x-3,14]],o);
      p.poly([[x,5],[x+2,12],[x,18],[x-1,13]],c);p.line(x,7,x,16,l);p.line(x-3,17,x+3,17,trim);
    } else if(shape==='scepter') {
      p.poly([[x-5,8],[x-2,11],[x,5],[x+2,11],[x+5,8],[x+3,17],[x-3,17]],o);
      p.line(x-4,10,x-2,15,l);p.line(x+4,10,x+2,15,l);p.rect(x-1,10,3,4,a);p.rect(x,11,1,2,l);p.line(x-2,18,x+2,18,trim);
    } else {
      p.poly([[x,4],[x+5,9],[x+3,15],[x,18],[x-4,13],[x-4,8]],o);
      p.poly([[x,6],[x+3,10],[x,15],[x-2,11]],a);p.line(x,7,x,11,l);p.line(x-3,14,x+2,16,trim);
    }
  } else if(shape==='bow'||shape==='thorn-bow') {
    const curve=[[x-1,13],[x+3,16],[x+5,21],[x+1,25],[x+1,28],[x+5,33],[x+3,37],[x-1,40]] as const;
    for(let i=1;i<curve.length;i++){const from=curve[i-1],to=curve[i];p.line(from[0],from[1],to[0],to[1],o);p.line(from[0]+1,from[1],to[0]+1,to[1],c);}
    p.line(x+3,17,x+5,21,l);p.line(x+5,33,x+3,37,l);
    if(!pulled)p.line(x-1,13,x-1,40,'#8f7f77');p.rect(x,y-1,3,3,trim);
    if(shape==='thorn-bow')for(const iy of [17,21,33,37])p.poly([[x+4,iy],[x+8,iy-2],[x+6,iy+2]],a);
  } else if(shape==='shield') {
    p.poly([[x-7,y-9],[x,y-11],[x+5,y-7],[x+4,y+3],[x-2,y+10],[x-8,y+4]],o);
    p.poly([[x-6,y-8],[x,y-9],[x+3,y-6],[x+2,y+3],[x-2,y+7],[x-6,y+3]],c);
    p.line(x-5,y-6,x-3,y+3,l);p.line(x-2,y-7,x-2,y+4,trim);p.poly([[x-2,y-4],[x+1,y-1],[x-2,y+3],[x-4,y-1]],a);
  } else if(shape==='quiver') {
    p.poly([[x-5,y-9],[x+3,y-11],[x+6,y+9],[x-1,y+12]],o);
    p.poly([[x-3,y-8],[x+2,y-9],[x+4,y+7],[x,y+9]],c);p.line(x-2,y-7,x+1,y+7,l);p.line(x-3,y-4,x+3,y-5,trim);
    for(let i=0;i<3;i++){p.line(x-6+i*3,y-18,x-1+i,y-5,'#776257');p.rect(x-7+i*3,y-19,2,4,a);}
  } else if(shape==='book') {
    p.poly([[x-7,y-7],[x-1,y-5],[x+5,y-7],[x+5,y+5],[x-1,y+7],[x-7,y+5]],o);
    p.poly([[x-6,y-5],[x-1,y-3],[x+4,y-5],[x+4,y+4],[x-1,y+5],[x-6,y+3]],c);
    p.line(x-1,y-3,x-1,y+5,trim);p.line(x-5,y-3,x-3,y-2,l);p.line(x+1,y-2,x+3,y-3,l);p.rect(x+1,y,2,2,a);
  } else if(shape==='lantern') {
    p.line(x-3,y-2,x-3,y-5,trim);p.line(x-3,y-5,x+3,y-5,trim);p.line(x+3,y-5,x+3,y-2,trim);
    p.rect(x-5,y-1,11,15,o);p.rect(x-4,y,9,12,c);p.rect(x-2,y+2,5,7,a);p.rect(x,y+3,1,4,l);
    for(const dx of [-3,3])p.rect(x+dx,y,1,12,d);p.line(x-4,y+12,x+4,y+12,trim);
  } else if(shape==='cinder') {
    p.poly([[x,y-8],[x+6,y-4],[x+5,y+4],[x,y+7],[x-6,y+3],[x-6,y-4]],o);
    p.poly([[x,y-6],[x+4,y-3],[x+3,y+3],[x,y+5],[x-4,y+2],[x-4,y-3]],c);
    p.line(x-2,y-4,x+2,y+3,a);p.line(x+2,y-4,x-2,y+2,l);p.rect(x-1,y-2,2,2,a);
  } else if(shape==='mirror') {
    p.poly([[x,y-10],[x+5,y-7],[x+5,y+2],[x,y+6],[x-5,y+1],[x-5,y-6]],o);
    p.poly([[x,y-8],[x+3,y-5],[x+3,y+1],[x,y+4],[x-3,y],[x-3,y-4]],c);
    p.line(x-2,y-4,x+1,y-6,l);p.line(x-1,y-1,x+2,y-3,a);p.rect(x-1,y+5,2,5,trim);
  }
}

/** Lembi posteriori, sempre sotto gambe, busto e braccia. */
export function drawShadowCape(p: PixelPainter, art: ShadowMaterial | undefined, swing: number): void {
  const o=SHADOW_INK;
  if(!art||art.shape==='aegis'||art.shape==='plate') {
    p.poly([[14,18],[22,16],[20,26],[18+swing*.7,39],[11+swing,37]],o);
    p.poly([[15,19],[20,18],[18,27],[16+swing*.7,37],[13+swing,35]],'#241a24');return;
  }
  const length=art.shape==='shroud'?43:art.shape==='veil'?41:39;
  p.poly([[15,17],[31,17],[34+swing*.4,length-4],[29+swing*.5,length],[24+swing*.6,length-3],[18+swing*.7,length+1],[10+swing,length-2]],o);
  p.poly([[16,18],[30,18],[32+swing*.4,length-5],[28+swing*.5,length-2],[24+swing*.6,length-5],[18+swing*.7,length-1],[13+swing,length-4]],art.shade);
  p.line(17,22,16+swing*.7,length-5,art.base);p.line(29,23,29+swing*.5,length-5,art.base);
  if(art.shape==='reed')for(let i=0;i<5;i++)p.line(14+i*4,29,12+i*4+swing*.6,length-i%2,art.accent);
  if(art.shape==='veil')p.line(13+swing,length-4,18+swing*.7,length-1,art.edge);
}

export function drawShadowArmor(p: PixelPainter, art: ShadowMaterial, female: boolean, trim: string): void {
  const {base:c,edge:l,shade:d,accent:a,shape}=art,o=SHADOW_INK,left=female?18:16,right=female?31:33;
  if(shape==='plate'||shape==='aegis') {
    p.poly([[left,18],[23,17],[28,17],[right,20],[30,31],[20,32],[left,24]],o);
    p.poly([[left+1,20],[24,19],[right-1,21],[29,29],[21,30]],c);
    p.poly([[20,21],[24,20],[26,22],[24,27],[21,26]],l);p.line(27,21,29,26,d);
    for(const x of [left-2,right-4]) {p.poly([[x,19],[x+4,16],[x+8,20],[x+7,24],[x,23]],o);p.poly([[x+1,19],[x+4,18],[x+6,20],[x+5,22],[x+1,21]],c);p.line(x+1,19,x+4,18,l);}
    if(shape==='plate') {for(const y of [27,30,33])p.line(20,y,29,y,trim);p.poly([[23,23],[25,25],[23,27],[24,25]],a);}
    else {p.poly([[24,22],[27,25],[24,29],[22,25]],a);p.line(20,29,29,29,trim);}
  } else {
    p.poly([[left,18],[21,18],[24,24],[21,36],[17,39],[16,28]],o);
    p.poly([[28,18],[right,20],[33,36],[29,40],[26,34],[26,24]],o);
    p.poly([[left+1,20],[20,20],[22,24],[19,36],[18,36],[18,27]],c);
    p.poly([[29,20],[right-1,21],[31,35],[29,37],[28,33],[28,24]],c);
    p.line(19,23,18,34,l);p.line(29,25,30,35,l);p.line(20,20,29,21,trim);
    if(shape==='shroud'){p.rect(23,21,4,3,a);p.rect(24,22,1,1,o);p.rect(26,22,1,1,o);}
    else if(shape==='reed')for(const x of [19,29]){p.poly([[x,23],[x+2,26],[x,30],[x-1,26]],a);}
    else if(shape==='veil'){for(const x of [left,right-2])p.poly([[x-2,21],[x-2,17],[x+3,20],[x+3,23]],a);p.rect(24,23,2,3,l);}
    else {p.rect(23,22,4,2,a);p.line(19,35,20,29,trim);}
  }
}

export interface ShadowFoot {readonly x:number;readonly y:number}
export function drawShadowBoot(p:PixelPainter,foot:ShadowFoot,art:ShadowMaterial,trim:string):void {
  const {x,y}=foot,{base:c,edge:l,shade:d,accent:a,shape}=art,o=SHADOW_INK;
  p.poly([[x-3,y-6],[x+3,y-6],[x+3,y],[x+5,y+2],[x+5,y+4],[x-3,y+4]],o);
  p.rect(x-2,y-5,4,6,c);p.rect(x-1,y+1,5,2,c);p.line(x-2,y-5,x+2,y-5,trim);p.line(x-1,y-3,x-1,y,l);p.rect(x+1,y-3,1,3,d);
  if(shape==='grave'){p.rect(x-2,y-4,4,2,a);p.rect(x,y-1,2,2,a);}
  else if(shape==='ember'){p.line(x,y-3,x+1,y-1,a);p.line(x+1,y-1,x,y+1,a);p.line(x-1,y+2,x+3,y+2,a);}
  else if(shape==='bog'){p.rect(x-3,y-5,6,2,d);p.rect(x-2,y+2,7,1,a);p.rect(x+2,y,2,1,a);}
  else if(shape==='rime'){p.poly([[x-2,y-2],[x-4,y-7],[x,y-5]],a);p.line(x,y+1,x+3,y+1,l);}
  else if(shape==='wind'){p.poly([[x-2,y-1],[x-6,y-5],[x-5,y-1],[x-2,y+1]],a);p.line(x-4,y-2,x-2,y,l);}
  else {p.rect(x,y-3,2,2,a);p.rect(x+1,y,1,1,a);p.line(x-1,y+2,x+3,y+2,trim);}
}
