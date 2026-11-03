import type { ItemSprite } from './item-sprites';
import { PixelPainter } from './pixel-painter';
import { SHADOW_EQUIPMENT, drawShadowHeld, drawShadowArmor, drawShadowBoot, drawShadowCape } from './shadow-equipment';

/** Le icone campionano gli stessi disegni indossati: scudo, faretra e materiali restano riconoscibili. */
export function shadowItemIcon(id:string):ItemSprite {
  const art=SHADOW_EQUIPMENT[id],source=new PixelPainter(48,48);
  if(art.slot==='armor'){drawShadowCape(source,art,0);drawShadowArmor(source,art,false,'#77625d');}
  else if(art.slot==='boots'){for(const x of [18,30])drawShadowBoot(source,{x,y:31},art,'#77625d');}
  else drawShadowHeld(source,art);
  const occupied=source.pixels.flatMap((row,y)=>row.flatMap((color,x)=>color?[{x,y}]:[]));
  const minX=Math.min(...occupied.map(p=>p.x)),maxX=Math.max(...occupied.map(p=>p.x));
  const minY=Math.min(...occupied.map(p=>p.y)),maxY=Math.max(...occupied.map(p=>p.y));
  const target=new PixelPainter(32,32),scale=28/Math.max(maxX-minX+1,maxY-minY+1);
  target.stamp(source,(minX+maxX+1)/2,(minY+maxY+1)/2,16,16,0,{scale});
  const colors=[...new Set(target.pixels.flat().filter(Boolean))],symbols='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const palette=Object.fromEntries(colors.map((color,i)=>[symbols[i],color]));
  return {size:32,pixels:target.pixels.map(row=>row.map(color=>color?symbols[colors.indexOf(color)]:'.').join('')),palette};
}
