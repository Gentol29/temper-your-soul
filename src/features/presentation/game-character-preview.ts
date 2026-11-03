import type { CharacterAppearance } from '../character/appearance';
import { CHARACTER_ART, characterPixels, type CharacterPixels } from './character-art';
import { SHADOW_ANIMATION } from './shadow-motion';
const rasters=new WeakMap<CharacterPixels,HTMLCanvasElement>();
/** Stesse matrici, equipaggiamento e fotogrammi usati da drawPlayer in partita. */
export function drawGameCharacter(ctx:CanvasRenderingContext2D,appearance:CharacterAppearance,x:number,y:number,time:number,moving=false,facing=1):void {
 const art=characterPixels(appearance,'game',0,false,{state:moving?'walk':'idle',frame:Math.floor(time*(moving?SHADOW_ANIMATION.fps.walk:SHADOW_ANIMATION.fps.idle))%SHADOW_ANIMATION.frames});
 let raster=rasters.get(art);
 if(!raster){raster=document.createElement('canvas');raster.width=art.width;raster.height=art.height;const c=raster.getContext('2d')!;
  art.pixels.forEach((row,py)=>row.forEach((color,px)=>{if(color){c.fillStyle=color;c.fillRect(px,py,1,1);}}));rasters.set(art,raster);
 }
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing,1);ctx.drawImage(raster,-CHARACTER_ART.feetX,14-CHARACTER_ART.feetY);ctx.restore();
}
/** Anteprima animata in pixel interi; il ciclo termina quando il pannello viene rimosso. */
export function gameCharacterPreview(appearance:CharacterAppearance):HTMLCanvasElement {
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;canvas.className='game-character-preview';canvas.setAttribute('aria-label','Sprite di gioco con equipaggiamento attivo');
 const ctx=canvas.getContext('2d')!;
 const frame=(time:number)=>{if(!canvas.isConnected)return;ctx.clearRect(0,0,128,128);ctx.save();ctx.scale(2,2);drawGameCharacter(ctx,appearance,32,46,time/1000);ctx.restore();requestAnimationFrame(frame);};requestAnimationFrame(frame);return canvas;
}
