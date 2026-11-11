import { characterFeetY, characterRenderFacing } from './native-character';
import type { CharacterAppearance } from '../character/appearance';
import { CHARACTER_ART, characterPixels, type CharacterPixels } from './character-art';
import { SHADOW_ANIMATION } from './shadow-motion';
import { DEFAULT_HEADING, nativeSpriteViewFromAim, spriteFacing, spriteViewFromAim, type ScreenHeading } from './sprite-view';
const rasters=new WeakMap<CharacterPixels,HTMLCanvasElement>();
/** Stesse matrici, equipaggiamento e fotogrammi usati da drawPlayer in partita; la direzione sceglie una delle otto viste. */
export function drawGameCharacter(ctx:CanvasRenderingContext2D,appearance:CharacterAppearance,x:number,y:number,time:number,moving=false,heading:ScreenHeading=DEFAULT_HEADING):void {
 const view=spriteViewFromAim(heading.x,heading.y);
 const art=characterPixels(appearance,'game',0,false,{state:moving?'walk':'idle',frame:Math.floor(time*(moving?SHADOW_ANIMATION.fps.walk:SHADOW_ANIMATION.fps.idle))%SHADOW_ANIMATION.frames,view,direction:nativeSpriteViewFromAim(heading.x,heading.y)});
 let raster=rasters.get(art);
 if(!raster){raster=document.createElement('canvas');raster.width=art.width;raster.height=art.height;const c=raster.getContext('2d')!;
  art.pixels.forEach((row,py)=>row.forEach((color,px)=>{if(color){c.fillStyle=color;c.fillRect(px,py,1,1);}}));rasters.set(art,raster);
 }
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(characterRenderFacing(appearance,spriteFacing(heading)),1);ctx.drawImage(raster,-CHARACTER_ART.feetX,14-characterFeetY(appearance));ctx.restore();
}
