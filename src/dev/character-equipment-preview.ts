import type {CharacterClass} from '../features/character/character-class';
import type {CharacterAppearance} from '../features/character/appearance';
import type {Rarity} from '../features/items/rarity';
import type {EquipmentSlot} from '../features/items/equipment-slot';
import type {CharacterMotion} from '../features/presentation/adventurer-body';
import {characterPixels,type CharacterPixels} from '../features/presentation/character-art';
import {SHADOW_ANIMATION} from '../features/presentation/shadow-motion';
import {ITEM_FAMILIES} from '../features/items/item-families';
import {ITEM_SPRITES} from '../features/presentation/item-sprites';
import {renderPixelIcon} from '../features/ui/pixel-icon';
import {drawTownGround} from '../features/presentation/hub-art';

const get=(id:string)=>document.getElementById(id) as HTMLSelectElement;
const slots=['primary_hand','secondary_hand','armor','boots'] as const;
const defaults:Record<CharacterClass,Record<EquipmentSlot,string>>={
 warrior:{primary_hand:'guardian_blade',secondary_hand:'spirit_talisman',armor:'ember_aegis',boots:'grave_boots'},
 archer:{primary_hand:'hunter_bow',secondary_hand:'spore_fan',armor:'reed_mantle',boots:'wind_boots'},
 mage:{primary_hand:'arcane_staff',secondary_hand:'frost_grimoire',armor:'meteor_mantle',boots:'astral_boots'},
};
const names={primary_hand:'Primaria',secondary_hand:'Secondaria',armor:'Armatura',boots:'Stivali'};
for(const slot of slots){const label=document.createElement('label'),select=document.createElement('select');label.textContent=names[slot];select.id=slot;label.append(select);document.getElementById('equipment')!.append(label);}
const params=new URLSearchParams(location.search);
for(const id of ['character-class','motion','attack-slot','direction','walk-direction','rarity'])if(params.has(id))get(id).value=params.get(id)!;
function populate():void{
 const kind=get('character-class').value as CharacterClass;
 for(const slot of slots){const select=get(slot);select.replaceChildren(new Option('Nessuno',''));for(const family of ITEM_FAMILIES.filter(f=>f.slot===slot&&f.characterClass===kind))select.add(new Option(family.name,family.id));select.value=defaults[kind][slot];}
 const catalog=document.getElementById('catalog')!;catalog.replaceChildren();
 for(const family of ITEM_FAMILIES.filter(f=>f.characterClass===kind)){const cell=document.createElement('div');cell.className='item';cell.dataset.family=family.id;cell.append(renderPixelIcon(ITEM_SPRITES[family.id]),document.createTextNode(family.name));catalog.append(cell);}
}
populate();get('character-class').onchange=()=>{populate();age=0;};
for(const slot of slots)if(params.has(slot))get(slot).value=params.get(slot)!;
const floor=document.createElement('canvas');floor.width=960;floor.height=640;drawTownGround(floor.getContext('2d')!);
const views=(['male','female']as const).map(body=>{const article=document.createElement('article'),title=document.createElement('h2'),large=document.createElement('canvas'),native=document.createElement('canvas');title.textContent=body==='male'?'Maschile':'Femminile';large.className='stage';large.width=128;large.height=96;native.className='native';native.width=native.height=64;article.append(title,large,native);document.getElementById('bodies')!.append(article);return {body,large,native};});
const rasters=new WeakMap<CharacterPixels,HTMLCanvasElement>();
const freeze=document.getElementById('freeze') as HTMLButtonElement,scrub=document.getElementById('animation-frame') as HTMLInputElement,frameLabel=document.getElementById('frame-label') as HTMLOutputElement;
let frozen=params.has('frame'),age=params.has('frame')?Number(params.get('frame'))/SHADOW_ANIMATION.fps.walk:0,previous=0,groundAge=0;
const setFrozen=(value:boolean)=>{frozen=value;freeze.textContent=value?'Riprendi animazione':'Ferma animazione';freeze.setAttribute('aria-pressed',String(value));};setFrozen(frozen);
freeze.onclick=()=>setFrozen(!frozen);scrub.oninput=()=>{setFrozen(true);age=Number(scrub.value)/rate();};get('motion').onchange=()=>{age=0;};
const rate=():number=>SHADOW_ANIMATION.fps[get('motion').value==='cast'?'attack':get('motion').value as 'idle'|'walk'];
function animate(time:number):void{
 const dt=previous?Math.min(.1,(time-previous)/1000):0;previous=time;if(!frozen){age+=dt;groundAge+=dt;}
 const frame=Math.floor(age*rate()+1e-6)%12;frameLabel.value=`${frame+1} / 12`;scrub.value=String(frame);
 const kind=get('character-class').value as CharacterClass,state=get('motion').value as CharacterMotion['state'],facing=Number(get('direction').value),walkDirection=Number(get('walk-direction').value) as 1|-1;
 const equipment=Object.fromEntries(slots.filter(slot=>get(slot).value).map(slot=>[slot,{uid:'preview-'+slot,familyId:get(slot).value,rarity:get('rarity').value as Rarity}]));
 for(const view of views){
  const appearance:CharacterAppearance={body:view.body,characterClass:kind,equipment},art=characterPixels(appearance,'game',0,false,{state,frame,attackSlot:get('attack-slot').value as EquipmentSlot,walkDirection});
  let raster=rasters.get(art);if(!raster){raster=document.createElement('canvas');raster.width=raster.height=64;const c=raster.getContext('2d')!;art.pixels.forEach((row,y)=>row.forEach((color,x)=>{if(color){c.fillStyle=color;c.fillRect(x,y,1,1);}}));rasters.set(art,raster);}
  const c=view.large.getContext('2d')!;c.imageSmoothingEnabled=false;
  const offset=state==='walk'?((groundAge*42*facing*walkDirection)%96+96)%96:0;
  c.drawImage(floor,380+offset,320,128,96,0,0,128,96);c.fillStyle='#08080c99';c.fillRect(52,75,24,4);
  c.save();c.translate(64,24);c.scale(facing,1);c.drawImage(raster,-32,0);c.restore();
  const n=view.native.getContext('2d')!;n.clearRect(0,0,64,64);n.imageSmoothingEnabled=false;n.save();n.translate(facing===1?0:64,0);n.scale(facing,1);n.drawImage(raster,0,0);n.restore();
 }
 requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
