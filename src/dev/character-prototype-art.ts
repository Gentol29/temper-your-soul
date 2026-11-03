import type { BodyType } from '../features/character/appearance';
import type { CharacterClass } from '../features/character/character-class';
import { PixelPainter } from '../features/presentation/pixel-painter';
import type { CharacterPixels } from '../features/presentation/character-art';
import { PROTOTYPE_ANIMATION, prototypeMotion, torsoPoint, type PrototypePose } from './character-prototype-motion';

/** Il gioco non importa questi prototipi; gli asset approvati restano in uso. */
export const CHARACTER_PROTOTYPES = [
  { id: 'iron', label: 'A · Ferro e cenere', detail: 'Piastre scure, mantello corto cremisi, sagoma solida.' },
  { id: 'pilgrim', label: 'B · Pellegrino cremisi', detail: 'Cappuccio profondo, sopravveste rossa e orli consumati.' },
  { id: 'hunter', label: 'C · Cacciatore d’ombre', detail: 'Cuoio carbone, sciarpa, spallaccio asimmetrico e profilo agile.' },
] as const;
export type CharacterPrototypeId = typeof CHARACTER_PROTOTYPES[number]['id'];
export const PROTOTYPE_GRID = PROTOTYPE_ANIMATION.frameSize;
const O = '#111014', SKIN = '#ae7d69', SKIN_SHADOW = '#63483f', SKIN_LIGHT = '#c69b81';
const PALETTES = {
  iron: { armor: '#444246', light: '#6d6668', shade: '#29282e', cloth: '#572431', clothLight: '#803a43', clothDark: '#301921', trim: '#8d736b', hair: '#382c29' },
  pilgrim: { armor: '#343035', light: '#5b5156', shade: '#211e25', cloth: '#682b38', clothLight: '#8f4149', clothDark: '#381b28', trim: '#9b6b61', hair: '#272125' },
  hunter: { armor: '#302d30', light: '#51484b', shade: '#201c24', cloth: '#3d2932', clothLight: '#69414a', clothDark: '#241a24', trim: '#7a625e', hair: '#4c3430' },
} as const;
const cache = new Map<string, CharacterPixels>();

/** Corpo nativo 48 px in un frame 64×64: il margine lascia spazio alle armi in movimento. */
export function prototypeCharacter(id: CharacterPrototypeId, body: BodyType, kind: CharacterClass,
  frame = 0, pose: PrototypePose = 'idle'): CharacterPixels {
  const f = ((Math.floor(frame) % PROTOTYPE_ANIMATION.frames) + PROTOTYPE_ANIMATION.frames) % PROTOTYPE_ANIMATION.frames, key = `${id}:${body}:${kind}:${pose}:${f}`;
  const cached = cache.get(key); if (cached) return cached;
  const c = PALETTES[id], female = body === 'female', motion = prototypeMotion(kind,f,pose);
  const newLayer=():PixelPainter=>new PixelPainter(PROTOTYPE_ANIMATION.bodySize,PROTOTYPE_ANIMATION.bodySize);
  const layers = { cape:newLayer(), legs:newLayer(), body:newLayer(), backArm:newLayer(),
    frontArm:newLayer(), primary:newLayer(), secondary:newLayer(), accents:newLayer() };
  let p = layers.cape;
  const stride = motion.stride, bob = 0, cape = motion.cape;
  const left = female ? 18 : 16, right = female ? 31 : 33, hipL = female ? 21 : 19, hipR = female ? 29 : 31;
  const limb = (x: number, y: number, tx: number, ty: number, color: string, width = 4): void => {
    p.poly([[x-width/2,y],[x+width/2,y],[tx+width/2,ty],[tx-width/2,ty]],O);
    p.poly([[x-width/2+1,y+1],[x+width/2-1,y+1],[tx+width/2-1,ty-1],[tx-width/2+1,ty-1]],color);
  };
  // Mantello dietro il corpo: le tre silhouette hanno lunghezze e bordi diversi.
  if (id === 'pilgrim') {
    p.poly([[16,17+bob],[31,16+bob],[36+cape*.45,39],[31+cape*.6,42],[26+cape*.7,40],[20+cape*.7,43],[11+cape,40]],O);
    p.poly([[17,18+bob],[30,18+bob],[33+cape*.45,38],[29+cape*.6,40],[25+cape*.7,38],[19+cape*.7,41],[14+cape,38]],c.clothDark);
    p.poly([[17,21],[20,27],[18+cape*.8,39],[15+cape,38]],c.cloth);
  } else if (id === 'iron') {
    p.poly([[15,17+bob],[32,17+bob],[35+cape*.5,32],[29+cape*.5,35],[24+cape*.4,31],[17+cape*.7,35],[12+cape*.7,31]],O);
    p.poly([[16,18+bob],[31,18+bob],[32+cape*.5,30],[28+cape*.5,32],[24+cape*.4,29],[17+cape*.7,32],[14+cape*.7,30]],c.cloth);
    p.line(16,23,17,30,c.clothLight);
  } else {
    p.poly([[14,18+bob],[22,16+bob],[20,26],[18+cape*.7,39],[11+cape,37]],O);
    p.poly([[15,19+bob],[20,18+bob],[18,27],[16+cape*.7,37],[13+cape,35]],c.clothDark);
  }
  if (kind === 'archer') {
    p.poly([[13,18],[17,17],[22,31],[17,33]],O);p.line(15,20,19,29,'#59423e');
    for (let i=0;i<3;i++) {p.line(12+i*2,15,18+i,27,'#66534a');p.rect(11+i*2,13,2,3,'#8c7b71');}
  }
  // Gambe, ginocchiere e stivali: proporzioni adulte, nessuna pelle esposta sull'armatura.
  p=layers.legs;
  const feet = [{x:hipL-stride,y:41-motion.leftLift,hip:hipL+1,lift:motion.leftLift},
    {x:hipR+stride,y:41-motion.rightLift,hip:hipR-1,lift:motion.rightLift}];
  for(const foot of feet){
    const knee={x:foot.hip+(foot.x-foot.hip)*.4+foot.lift/PROTOTYPE_ANIMATION.footLift*PROTOTYPE_ANIMATION.kneeBend,y:35-foot.lift*.4};
    limb(foot.hip,30+motion.rootY,knee.x,knee.y,c.shade,5);
    limb(knee.x,knee.y,foot.x,foot.y,c.armor,4);
    p.rect(knee.x-1,knee.y-1,3,2,c.light);
  }
  for (const {x, y} of feet) {
    p.rect(x-2,y-3,5,6,O);p.rect(x-1,y-3,3,4,c.armor);p.rect(x-2,y+2,7,2,O);
    p.rect(x-1,y+1,5,2,'#3d3035');p.line(x-1,y-3,x+1,y-3,c.light);
  }
  p=layers.body;
  if (id === 'pilgrim' || kind === 'mage') {
    p.poly([[19,27+bob],[30,27+bob],[32+stride*.3,38],[28,40],[24,38],[18-stride*.3,40],[16,37]],O);
    p.poly([[20,28+bob],[29,28+bob],[30+stride*.3,37],[27,38],[24,36],[19-stride*.3,38],[18,36]],c.cloth);
    p.line(23,30,22,37,c.clothLight);p.line(26,30,28,36,c.clothDark);
  }
  const farHand = {x:motion.farHand.x+(female?2:0),y:motion.farHand.y}, hand = {x:motion.hand.x-(female?1:0),y:motion.hand.y};
  const arm = (shoulderX:number,shoulderY:number,target:typeof hand,color:string,bend:number):void=>{
    const shoulder=torsoPoint(shoulderX,shoulderY,motion.tilt);
    const elbow={x:(shoulder.x+target.x)/2+bend,y:(shoulder.y+target.y)/2+3};
    limb(shoulder.x,shoulder.y,elbow.x,elbow.y,color,5);limb(elbow.x,elbow.y,target.x,target.y,color,4);
  };
  p=layers.backArm;
  arm(left+2,19,farHand,c.shade,-2);
  p.rect(farHand.x-1,farHand.y,3,3,SKIN_SHADOW);
  p=layers.body;
  // Busto e spalle: rampe di quattro toni, luci sottili invece di grandi aree bianche.
  p.poly([[left,18+bob],[22,16+bob],[28,16+bob],[right,19+bob],[hipR,31+bob],[hipL,31+bob]],O);
  p.poly([[left+1,19+bob],[23,18+bob],[27,18+bob],[right-1,20+bob],[hipR-1,30+bob],[hipL+1,30+bob]],c.armor);
  if (id === 'iron') {
    p.poly([[left-2,19+bob],[left+3,17+bob],[left+6,22+bob],[left-2,23+bob]],O);
    p.poly([[left-1,19+bob],[left+3,18+bob],[left+4,21+bob],[left-1,22+bob]],c.light);
    p.rect(right-4,19+bob,7,4,O);p.rect(right-3,19+bob,5,2,c.light);
    p.poly([[20,20+bob],[25,21+bob],[29,20+bob],[28,25+bob],[21,26+bob]],c.light);
    p.line(24,21+bob,24,25+bob,c.armor);p.line(20,27+bob,29,27+bob,c.shade);
    p.rect(21,28+bob,8,2,c.armor);
  } else if (id === 'pilgrim') {
    p.poly([[21,18+bob],[28,18+bob],[29,29+bob],[24,33+bob],[20,29+bob]],c.cloth);
    p.line(23,19+bob,23,28+bob,c.clothLight);p.line(26,19+bob,27,29+bob,c.clothDark);
    p.rect(23,23+bob,4,1,c.trim);p.rect(24,21+bob,1,5,c.trim);
  } else {
    p.poly([[left-2,18+bob],[left+5,18+bob],[left+6,23+bob],[left-2,22+bob]],O);
    p.poly([[left-1,19+bob],[left+4,19+bob],[left+5,22+bob],[left-1,21+bob]],c.light);
    p.line(19,20+bob,29,28+bob,c.trim);p.line(20,20+bob,30,28+bob,c.shade);
    p.rect(20,25+bob,2,2,c.light);p.line(27,21+bob,28,24+bob,c.light);
  }
  p.rect(hipL,29+bob,hipR-hipL+1,3,O);p.rect(hipL+1,30+bob,hipR-hipL-1,1,'#59463f');p.rect(24,29+bob,3,2,c.trim);p.rect(25,30+bob,1,1,O);
  // Collo, testa e tratti: le due versioni condividono la stessa direzione artistica.
  p.rect(22,15+bob,6,3,O);p.rect(23,15+bob,4,2,SKIN_SHADOW);
  if (id === 'pilgrim' || id === 'hunter' && kind !== 'warrior') {
    p.poly([[24,2+bob],[30,6+bob],[32,14+bob],[29,18+bob],[19,17+bob],[17,12+bob],[20,5+bob]],O);
    p.poly([[24,3+bob],[29,7+bob],[30,14+bob],[28,16+bob],[20,15+bob],[19,11+bob],[21,6+bob]],c.clothDark);
    p.line(21,6+bob,24,4+bob,c.clothLight);p.line(20,8+bob,19,12+bob,c.cloth);
    p.poly([[23,8+bob],[28,9+bob],[28,14+bob],[25,16+bob],[22,13+bob]],SKIN_SHADOW);
    p.rect(25,10+bob,3,3,SKIN);p.rect(27,10+bob,1,1,O);p.rect(27,13+bob,2,1,SKIN_LIGHT);
    p.rect(21,7+bob,7,2,c.shade);
  } else {
    p.poly([[21,4+bob],[27,3+bob],[30,6+bob],[30,13+bob],[27,17+bob],[21,15+bob],[19,10+bob]],O);
    p.poly([[22,5+bob],[27,4+bob],[29,7+bob],[29,13+bob],[26,15+bob],[22,14+bob],[21,9+bob]],SKIN_SHADOW);
    p.poly([[24,6+bob],[28,6+bob],[29,10+bob],[28,13+bob],[25,14+bob],[23,11+bob]],SKIN);
    p.rect(27,9+bob,1,1,O);p.rect(28,11+bob,2,1,SKIN_LIGHT);
    p.poly([[20,5+bob],[24,3+bob],[28,4+bob],[29,7+bob],[23,7+bob],[21,10+bob],[20,13+bob],[18,10+bob]],c.hair);
    p.line(21,6+bob,24,4+bob,'#66504a');
    if (!female) {p.rect(23,13+bob,5,2,'#47332f');p.rect(25,15+bob,2,1,'#47332f');}
  }
  if (female) {
    p.poly([[19,9+bob],[21,10+bob],[20+cape*.15,18+bob],[17+cape*.4,22+bob],[16+cape*.4,18+bob],[18,14+bob]],c.hair);
    p.line(18,15+bob,17+cape*.4,19+bob,'#695049');p.rect(19,12+bob,2,2,c.clothLight);
  }
  if (id === 'hunter') {
    p.poly([[20,15+bob],[28,15+bob],[31,17+bob],[27,20+bob],[20,18+bob]],O);
    p.poly([[21,15+bob],[28,16+bob],[29,17+bob],[26,18+bob],[21,17+bob]],c.clothLight);
  }
  p=layers.frontArm;
  arm(right-1,20,hand,c.armor,2);p.rect(hand.x-1,hand.y,3,3,SKIN_SHADOW);p.rect(hand.x,hand.y,2,1,SKIN);
  p=layers.primary;
  // Armi di prova delle tre classi, già alla scala reale di gioco.
  if (kind === 'archer') {
    const x=26,y=26;
    p.line(x-1,y-13,x+4,y-9,O);p.line(x+4,y-9,x+6,y,O);p.line(x+6,y,x+3,y+10,O);p.line(x+3,y+10,x-1,y+14,O);
    p.line(x,y-12,x+3,y-8,'#6f5548');p.line(x+3,y-8,x+5,y,'#6f5548');p.line(x+5,y,x+2,y+9,'#6f5548');p.line(x+2,y+9,x,y+12,'#6f5548');
    if(pose!=='attack'||f<2||f>5)p.line(x,y-12,x,y+12,'#97877b');p.rect(x-1,y-1,4,3,c.clothLight);
    if(pose==='attack'&&f>=2&&f<=6){
      p=layers.accents;
      const rotate=(x:number,y:number)=>({x:hand.x+x*Math.cos(motion.weaponAngle)-y*Math.sin(motion.weaponAngle),y:hand.y+x*Math.sin(motion.weaponAngle)+y*Math.cos(motion.weaponAngle)});
      const top=rotate(2,-12),bottom=rotate(2,12),tip=rotate(9,0);
      if(f<=5){p.line(top.x,top.y,farHand.x,farHand.y,'#97877b');p.line(farHand.x,farHand.y,bottom.x,bottom.y,'#97877b');}
      p.line(farHand.x,farHand.y,tip.x,tip.y,'#8f7a68');p.rect(tip.x,tip.y-1,2,3,'#a69a8c');
    }
  } else if (kind === 'mage') {
    const x=26;
    p.line(x,9,x,43,O);p.line(x+1,9,x+1,42,'#6d4e49');p.line(x+2,10,x+2,40,c.shade);
    p.poly([[x+1,5],[x+5,9],[x+1,14],[x-3,9]],O);p.poly([[x+1,7],[x+3,9],[x+1,12],[x-1,9]],'#933e45');p.rect(x+1,8,1,2,'#d27b62');
    p=layers.secondary;
    p.rect(farHand.x-4,farHand.y-2,6,8,O);p.rect(farHand.x-3,farHand.y-1,4,6,c.cloth);p.line(farHand.x-3,farHand.y,farHand.x,farHand.y,c.trim);
    if(motion.charge>0){
      p=layers.accents;const x=farHand.x,y=farHand.y-5,r=2+motion.charge*3;
      p.poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],'#512532');
      p.poly([[x,y-r+1],[x+r-1,y],[x,y+r-1],[x-r+1,y]],'#a54b51');p.rect(x,y-1,2,2,'#d4876f');
    }
  } else {
    const x=24,y=26;
    p.poly([[x,y],[x+6,12],[x+8,9],[x+9,13],[x+3,y+1]],O);
    p.poly([[x+1,y-2],[x+6,13],[x+7,12],[x+7,15],[x+3,y-2]],'#69656a');
    p.line(x+2,y-3,x+6,14,'#9b8c87');p.line(x-1,y-2,x+5,y+1,c.trim);p.line(x,y,x-1,y+6,'#55403d');
    p=layers.secondary;
    p.poly([[farHand.x-6,farHand.y-7],[farHand.x+1,farHand.y-9],[farHand.x+4,farHand.y-5],[farHand.x+2,farHand.y+4],[farHand.x-3,farHand.y+8],[farHand.x-7,farHand.y+3]],O);
    p.poly([[farHand.x-5,farHand.y-6],[farHand.x,farHand.y-7],[farHand.x+2,farHand.y-4],[farHand.x+1,farHand.y+3],[farHand.x-3,farHand.y+5],[farHand.x-5,farHand.y+2]],c.shade);
    p.line(farHand.x-3,farHand.y-5,farHand.x-3,farHand.y+3,c.clothLight);
  }
  const output=new PixelPainter(PROTOTYPE_GRID,PROTOTYPE_GRID),pad=PROTOTYPE_ANIMATION.padding;
  const layer=(source:PixelPainter,angle=0,followY=true):void=>output.stamp(source,24,30,pad+24+motion.rootX,pad+30+(followY?motion.rootY:0),angle);
  const primary=():void=>output.stamp(layers.primary,24,26,pad+hand.x+motion.rootX,pad+hand.y+motion.rootY,motion.weaponAngle);
  layer(layers.cape,motion.tilt*.6);layer(layers.legs,0,false);layer(layers.backArm);
  if(motion.weaponBehind)primary();
  layer(layers.body,motion.tilt);layer(layers.secondary);layer(layers.frontArm);
  if(!motion.weaponBehind)primary();layer(layers.accents);
  const result={width:output.width,height:output.height,pixels:output.pixels};cache.set(key,result);return result;
}
