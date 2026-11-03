import { CHARACTER_PROTOTYPES, PROTOTYPE_GRID, prototypeCharacter } from './character-prototype-art';
import { PROTOTYPE_ANIMATION, type PrototypePose } from './character-prototype-motion';
import type { CharacterClass } from '../features/character/character-class';
import { drawTownGround } from '../features/presentation/hub-art';
const root=document.querySelector('#prototypes')!;
const select=document.querySelector<HTMLSelectElement>('#character-class')!;
const floor=document.createElement('canvas');floor.width=960;floor.height=640;drawTownGround(floor.getContext('2d')!);
const cache=new WeakMap<ReturnType<typeof prototypeCharacter>,HTMLCanvasElement>();
const freeze=document.querySelector<HTMLButtonElement>('#freeze')!;
const scrub=document.querySelector<HTMLInputElement>('#animation-frame')!;
const frameLabel=document.querySelector<HTMLOutputElement>('#frame-label')!;
let pose:PrototypePose='walk',frozen=false,age=0,previous=0;
const setFrozen=(value:boolean):void=>{frozen=value;freeze.setAttribute('aria-pressed',String(value));freeze.textContent=value?'Riprendi animazione':'Ferma animazione';};
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>button.onclick=()=>{
 pose=button.dataset.pose as PrototypePose;age=0;document.querySelectorAll('[data-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
});
freeze.onclick=()=>setFrozen(!frozen);
scrub.max=String(PROTOTYPE_ANIMATION.frames-1);
scrub.oninput=()=>{setFrozen(true);age=Number(scrub.value)/PROTOTYPE_ANIMATION.fps[pose];};
select.onchange=()=>{age=0;};
const views=CHARACTER_PROTOTYPES.flatMap(prototype=>{
 const card=document.createElement('article'),title=document.createElement('h2'),description=document.createElement('p'),pair=document.createElement('div');
 title.textContent=prototype.label;description.textContent=prototype.detail;pair.className='pair';card.dataset.prototype=prototype.id;card.append(title,description,pair);root.append(card);
 return (['male','female'] as const).map(body=>{
  const box=document.createElement('div'),label=document.createElement('h3'),large=document.createElement('canvas'),native=document.createElement('canvas'),caption=document.createElement('p');
  label.textContent=body==='male'?'Maschile':'Femminile';box.className='body';large.className='large';large.width=large.height=PROTOTYPE_GRID*3;native.width=native.height=PROTOTYPE_GRID;native.className='native';caption.className='caption';caption.textContent='Scala nativa · 1×';
  box.append(label,large,native,caption);pair.append(box);return{prototype:prototype.id,body,large,native};
 });
});
function frame(time:number):void{
 const dt=previous?Math.min(.1,(time-previous)/1000):0;previous=time;if(!frozen)age+=dt;
 const index=Math.floor(age*PROTOTYPE_ANIMATION.fps[pose]+1e-6)%PROTOTYPE_ANIMATION.frames;
 scrub.value=String(index);frameLabel.value=`${index+1} / ${PROTOTYPE_ANIMATION.frames}`;
 for(const view of views){
  const art=prototypeCharacter(view.prototype,view.body,select.value as CharacterClass,index,pose);
  let raster=cache.get(art);if(!raster){raster=document.createElement('canvas');raster.width=art.width;raster.height=art.height;const ctx=raster.getContext('2d')!;
   art.pixels.forEach((row,y)=>row.forEach((color,x)=>{if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}}));cache.set(art,raster);
  }
  for(const [canvas,scale]of [[view.large,3],[view.native,1]]as const){const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(floor,420,340,PROTOTYPE_GRID,PROTOTYPE_GRID,0,0,canvas.width,canvas.height);ctx.save();ctx.scale(scale,scale);ctx.fillStyle='#0d0c0f88';ctx.fillRect(PROTOTYPE_ANIMATION.padding+14,PROTOTYPE_ANIMATION.padding+43,24,3);ctx.drawImage(raster,0,0);ctx.restore();}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
