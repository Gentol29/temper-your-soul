import type { CharacterAppearance } from '../character/appearance';
import { ITEM_CLASSES } from '../items/item-classes';
import type { CharacterPixels } from './character-art';
import type { CharacterMotion } from './adventurer-body';
import { magePixels } from './mage-sprite';
import { PixelPainter } from './pixel-painter';
import { SHADOW_ANIMATION, shadowMotionForSlot, torsoPoint } from './shadow-motion';
import { SHADOW_EQUIPMENT, SHADOW_GRIP, drawShadowHeld, drawShadowArmor, drawShadowBoot, drawShadowCape, shadowTrim } from './shadow-equipment';

const O='#111014',SKIN='#ae7d69',SKIN_SHADOW='#63483f',SKIN_LIGHT='#c69b81';
const c={armor:'#302d30',light:'#51484b',shade:'#201c24',cloth:'#3d2932',clothLight:'#69414a',clothDark:'#241a24',trim:'#7a625e',hair:'#4c3430'};
/** Corpo C scelto dall'utente: strati articolati; nessun oggetto fittizio quando uno slot è vuoto. */
export function shadowCharacterPixels(appearance:CharacterAppearance,animation:CharacterMotion):CharacterPixels {
  const kind=appearance.characterClass??ITEM_CLASSES[appearance.equipment.primary_hand?.familyId??'']??ITEM_CLASSES[appearance.equipment.armor?.familyId??'']??'warrior';
  // Il Mago e' reso in 3D: stessi agganci, stessa modularita', un compositore proprio.
  if(kind==='mage')return magePixels(appearance,animation);
  const f=animation.frame,female=appearance.body==='female',pose=animation.state==='cast'?'attack':animation.state;
  const motion=shadowMotionForSlot(kind,f,pose,animation.attackSlot);
  const lookup=(slot:keyof CharacterAppearance['equipment'])=>{const item=appearance.equipment[slot],art=item?SHADOW_EQUIPMENT[item.familyId]:undefined;return art?.slot===slot?art:undefined;};
  const armor=lookup('armor'),boots=lookup('boots'),primaryArt=lookup('primary_hand'),secondaryArt=lookup('secondary_hand');
  const newLayer=():PixelPainter=>new PixelPainter(SHADOW_ANIMATION.bodySize,SHADOW_ANIMATION.bodySize);
  const layers={cape:newLayer(),legs:newLayer(),body:newLayer(),backArm:newLayer(),frontArm:newLayer(),primary:newLayer(),secondary:newLayer(),accents:newLayer(),hands:newLayer(),quiver:newLayer()};
  let p=layers.cape;
  const stride=motion.stride,bob=0,cape=motion.cape;
  const left=female?18:16,right=female?31:33,hipL=female?21:19,hipR=female?29:31;
  const limb=(x:number,y:number,tx:number,ty:number,color:string,width=4):void=>{
    p.poly([[x-width/2,y],[x+width/2,y],[tx+width/2,ty],[tx-width/2,ty]],O);
    p.poly([[x-width/2+1,y+1],[x+width/2-1,y+1],[tx+width/2-1,ty-1],[tx-width/2+1,ty-1]],color);
  };
  drawShadowCape(p,armor,cape);
  // Gambe, ginocchiere e stivali: proporzioni adulte, nessuna pelle esposta sull'armatura.
  p=layers.legs;
  const feet = [{x:hipL-stride,y:41-motion.leftLift,hip:hipL+1,lift:motion.leftLift},
    {x:hipR+stride,y:41-motion.rightLift,hip:hipR-1,lift:motion.rightLift}];
  for(const foot of feet){
    const knee={x:foot.hip+(foot.x-foot.hip)*.4+foot.lift/SHADOW_ANIMATION.footLift*SHADOW_ANIMATION.kneeBend,y:35-foot.lift*.4};
    limb(foot.hip,30+motion.rootY,knee.x,knee.y,c.shade,5);
    limb(knee.x,knee.y,foot.x,foot.y,c.armor,4);
    p.rect(knee.x-1,knee.y-1,3,2,c.light);
  }
  for (const {x, y} of feet) {
    p.rect(x-2,y-3,5,6,O);p.rect(x-1,y-3,3,4,c.armor);p.rect(x-2,y+2,7,2,O);
    p.rect(x-1,y+1,5,2,'#3d3035');p.line(x-1,y-3,x+1,y-3,c.light);
    if(boots)drawShadowBoot(p,{x,y},boots,shadowTrim(appearance.equipment.boots!));
  }
  p=layers.body;
  const farHand = {x:motion.farHand.x+(female?2:0),y:motion.farHand.y}, hand = {x:motion.hand.x-(female?1:0),y:motion.hand.y};
  const arm = (shoulderX:number,shoulderY:number,target:typeof hand,color:string,bend:number):void=>{
    const shoulder=torsoPoint(shoulderX,shoulderY,motion.tilt);
    const elbow={x:(shoulder.x+target.x)/2+bend,y:(shoulder.y+target.y)/2+3};
    limb(shoulder.x,shoulder.y,elbow.x,elbow.y,color,5);limb(elbow.x,elbow.y,target.x,target.y,color,4);
  };
  p=layers.backArm;
  arm(left+2,19,farHand,c.shade,-2);

  p=layers.body;
  // Busto e spalle: rampe di quattro toni, luci sottili invece di grandi aree bianche.
  p.poly([[left,18+bob],[22,16+bob],[28,16+bob],[right,19+bob],[hipR,31+bob],[hipL,31+bob]],O);
  p.poly([[left+1,19+bob],[23,18+bob],[27,18+bob],[right-1,20+bob],[hipR-1,30+bob],[hipL+1,30+bob]],c.armor);
  p.poly([[left-2,18+bob],[left+5,18+bob],[left+6,23+bob],[left-2,22+bob]],O);
  p.poly([[left-1,19+bob],[left+4,19+bob],[left+5,22+bob],[left-1,21+bob]],c.light);
  p.line(19,20+bob,29,28+bob,c.trim);p.line(20,20+bob,30,28+bob,c.shade);
  p.rect(20,25+bob,2,2,c.light);p.line(27,21+bob,28,24+bob,c.light);
  if(armor)drawShadowArmor(p,armor,female,shadowTrim(appearance.equipment.armor!));
  p.rect(hipL,29+bob,hipR-hipL+1,3,O);p.rect(hipL+1,30+bob,hipR-hipL-1,1,'#59463f');p.rect(24,29+bob,3,2,c.trim);p.rect(25,30+bob,1,1,O);
  // Collo, testa e tratti: le due versioni condividono la stessa direzione artistica.
  p.rect(22,15+bob,6,3,O);p.rect(23,15+bob,4,2,SKIN_SHADOW);
  if (kind !== 'warrior') {
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
  {
    p.poly([[20,15+bob],[28,15+bob],[31,17+bob],[27,20+bob],[20,18+bob]],O);
    p.poly([[21,15+bob],[28,16+bob],[29,17+bob],[26,18+bob],[21,17+bob]],c.clothLight);
  }
  p=layers.frontArm;
  arm(right-1,20,hand,c.armor,2);

  const pulling=kind==='archer'&&pose==='attack'&&(animation.attackSlot??'primary_hand')==='primary_hand'&&f>=2&&f<=5;
  if(primaryArt)drawShadowHeld(layers.primary,primaryArt,shadowTrim(appearance.equipment.primary_hand!),pulling);
  if(secondaryArt)drawShadowHeld(secondaryArt.shape==='quiver'?layers.quiver:layers.secondary,secondaryArt,shadowTrim(appearance.equipment.secondary_hand!));
  if(primaryArt&&(primaryArt.shape==='bow'||primaryArt.shape==='thorn-bow')&&pose==='attack'&&f>=2&&f<=6&&(animation.attackSlot??'primary_hand')==='primary_hand'){
    p=layers.accents;
    const rotate=(x:number,y:number)=>({x:hand.x+x*Math.cos(motion.weaponAngle)-y*Math.sin(motion.weaponAngle),y:hand.y+x*Math.sin(motion.weaponAngle)+y*Math.cos(motion.weaponAngle)});
    const top=rotate(-1,-13),bottom=rotate(-1,14),tip=rotate(9,0);
    if(pulling){p.line(top.x,top.y,farHand.x,farHand.y,'#8f7f77');p.line(farHand.x,farHand.y,bottom.x,bottom.y,'#8f7f77');}
    p.line(farHand.x,farHand.y,tip.x,tip.y,'#8f7a68');p.rect(tip.x,tip.y-1,2,3,'#a69a8c');
  }
  if(motion.charge>0){
    p=layers.accents;const x=farHand.x,y=farHand.y-5,r=2+motion.charge*3;
    p.poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],'#512532');
    p.poly([[x,y-r+1],[x+r-1,y],[x,y+r-1],[x-r+1,y]],'#a54b51');p.rect(x,y-1,2,2,'#d4876f');
  }
  for(const grip of [hand,farHand]){layers.hands.rect(grip.x-1,grip.y,3,3,SKIN_SHADOW);layers.hands.rect(grip.x,grip.y,2,1,SKIN);}
  const output=new PixelPainter(SHADOW_ANIMATION.frameSize,SHADOW_ANIMATION.frameSize),pad=SHADOW_ANIMATION.padding;
  const layer=(source:PixelPainter,angle=0,followY=true):void=>output.stamp(source,24,30,pad+24+motion.rootX,pad+30+(followY?motion.rootY:0),angle);
  const primary=():void=>output.stamp(layers.primary,SHADOW_GRIP.x,SHADOW_GRIP.y,pad+hand.x+motion.rootX,pad+hand.y+motion.rootY,motion.weaponAngle);
  // A riposo/in marcia l'arma passa dietro la testa; nel colpo torna davanti al corpo.
  const rearWeapon=motion.weaponBehind||pose!=='attack';
  layer(layers.cape,motion.tilt*.6);
  if(secondaryArt?.shape==='quiver')output.stamp(layers.quiver,SHADOW_GRIP.x,SHADOW_GRIP.y,pad+14+motion.rootX,pad+24+motion.rootY,motion.tilt-.12,{scale:.7});
  layer(layers.legs,0,false);layer(layers.backArm);
  if(rearWeapon)primary();
  layer(layers.body,motion.tilt);
  output.stamp(layers.secondary,SHADOW_GRIP.x,SHADOW_GRIP.y,pad+farHand.x+motion.rootX,pad+farHand.y+motion.rootY,motion.secondaryAngle??0);
  layer(layers.frontArm);if(!rearWeapon)primary();layer(layers.accents);layer(layers.hands);
  return {width:output.width,height:output.height,pixels:output.pixels};
}
