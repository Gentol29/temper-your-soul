import { PixelPainter } from '../pixel-painter';

export const BASIC_ATTACK_IDS = ['warrior-cleave','archer-arrow','archer-release','mage-fireball','mage-water-orb','mage-earth-wisp','mage-wind-orb'] as const;
export type BasicAttackId = typeof BASIC_ATTACK_IDS[number];
export const isBasicAttackArt = (id:string): id is BasicAttackId => (BASIC_ATTACK_IDS as readonly string[]).includes(id);
const INK='#18141d',STEEL='#77717a',EDGE='#c4b8b0',LIGHT='#eee0c5',CRIMSON='#9d4350',DARK_RED='#492632';
const TAU=Math.PI*2;
type Point=readonly [number,number];
const point=(cx:number,cy:number,r:number,a:number,ellipse=1):Point=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r*ellipse];
function band(p:PixelPainter,cx:number,cy:number,outer:number,inner:number,start:number,end:number,color:string,ellipse=1):void {
  const steps=Math.max(2,Math.ceil(Math.abs(end-start)*outer/2)),points:Point[]=[];
  for(let i=0;i<=steps;i++)points.push(point(cx,cy,outer,start+(end-start)*i/steps,ellipse));
  for(let i=steps;i>=0;i--)points.push(point(cx,cy,inner,start+(end-start)*i/steps,ellipse));
  p.poly(points,color);
}

/** Fendente con taglio continuo, dorso scuro e filo luminoso; nessuna particella slegata dalla lama. */
function cleave(p:PixelPainter,f:number):void{
  const t=f/11,tip=-1.72+t*3.44,start=Math.max(-1.84,tip-(.65+Math.sin(t*Math.PI)*.55));
  band(p,64,64,47,30,start,tip,INK);
  band(p,64,64,45,32,start+.015,tip-.01,DARK_RED);
  band(p,64,64,44,37,start+.04,tip-.025,CRIMSON);
  band(p,64,64,46,42,start+.08,tip-.035,STEEL);
  band(p,64,64,46,44,start+.13,tip-.04,EDGE);
  band(p,64,64,46,45,Math.max(start+.14,tip-.5),tip-.04,LIGHT);
  const outer=point(64,64,46,tip-.04),inner=point(64,64,33,tip-.04);
  p.line(outer[0],outer[1],inner[0],inner[1],EDGE);
  if(f>1&&f<10){const [x,y]=point(64,64,44,tip-.13);p.line(x-2,y,x+2,y,LIGHT);p.line(x,y-2,x,y+2,LIGHT);}
}
function arrow(p:PixelPainter,f:number):void{
  const flutter=Math.round(Math.sin(f/12*TAU)*2),y=48;
  p.poly([[17,y-2],[68,y-2],[68,y-8],[83,y],[68,y+8],[68,y+2],[17,y+2]],INK);
  p.rect(20,y-1,50,2,'#8d766a');p.line(22,y-1,67,y-1,'#bcaa93');p.rect(25+f*3,y-1,4,1,LIGHT);
  p.poly([[69,y-6],[81,y],[69,y+5],[72,y]],STEEL);p.line(70,y-5,79,y,EDGE);p.line(72,y,80,y,LIGHT);
  p.poly([[18,y-1],[11,y-7-flutter],[24,y-5],[31,y-1]],INK);
  p.poly([[18,y+1],[11,y+7+flutter],[24,y+5],[31,y+1]],INK);
  p.poly([[19,y-1],[14,y-5-flutter],[24,y-3],[28,y-1]],CRIMSON);
  p.poly([[19,y+1],[14,y+5+flutter],[24,y+3],[28,y+1]],'#6d535d');
  p.line(16,y-4-flutter,25,y-2,EDGE);
}
function release(p:PixelPainter,f:number):void{
  const t=f/11,r=10+Math.sqrt(t)*30,width=4-t*2;
  band(p,48,52,r+1,r-width-1,0,TAU,INK,.46);
  band(p,48,52,r,r-width,0,TAU,DARK_RED,.46);
  band(p,48,52,r,r-1,-.3,Math.PI+.5,STEEL,.46);
  band(p,48,52,r-1,r-2,-.45,1.1,EDGE,.46);
  band(p,48,52,r-2,r-3,Math.PI,Math.PI*1.8,CRIMSON,.46);
  const x=48+r-3;p.poly([[x-5,48],[x+3,52],[x-5,56],[x-2,52]],LIGHT);
}
function fire(p:PixelPainter,f:number):void{
  const phase=f/12*TAU,a=Math.sin(phase)*3,b=Math.sin(phase+2)*4;
  p.poly([[13,47+a],[29,36+b],[25,43],[42,33+a],[48,38],[63,35],[73,43],[78,48],[70,57],[59,61],[45,57],[31,61+b],[36,54],[19,57-a],[25,50]],INK);
  p.poly([[18,47+a],[36,39+b],[32,45],[46,37+a],[61,38],[71,44],[74,49],[68,55],[58,58],[44,53],[33,57],[39,50],[25,53]],'#792d3b');
  p.poly([[29,47+a],[45,40],[58,40],[68,44],[72,49],[65,55],[55,55],[45,50],[35,52]],'#cb4939');
  p.poly([[41,47],[54,41],[65,44],[69,49],[62,53],[52,51],[47,48]],'#e77c40');
  p.poly([[53,44],[62,44],[66,48],[61,51],[55,49]],'#f0bd72');p.line(58,45,63,47,LIGHT);
}
function water(p:PixelPainter,f:number):void{
  const phase=f/12*TAU,shift=Math.sin(phase)*2;
  p.poly([[18,49],[35,38+shift],[47,32],[60,33],[70,40],[76,49],[69,60],[58,65],[45,61],[34,55]],INK);
  p.poly([[24,49],[42,40+shift],[50,35],[60,36],[68,42],[72,49],[66,57],[57,61],[46,57],[36,52]],'#35495c');
  p.poly([[39,47],[50,37],[60,39],[68,46],[68,52],[60,58],[51,55]],'#537b8c');
  p.poly([[50,39],[59,40],[65,46],[60,48],[54,45]],'#91c7cc');p.line(55,40,61,43,'#cce4df');
  band(p,54,48,23,21,phase,phase+2.2,'#73a6b4',.8);
  band(p,54,48,22,21,phase+.2,phase+1.6,'#cce4df',.8);
}
function earth(p:PixelPainter,f:number):void{
  const phase=f/12*TAU,shift=Math.round(Math.sin(phase)*2);
  p.poly([[25,45],[36,35],[49,30],[64,35],[72,46],[68,60],[54,66],[40,62],[32,54]],INK);
  p.poly([[29,45],[39,37],[50,33],[62,38],[68,47],[64,57],[53,62],[42,58],[35,52]],'#41463e');
  p.poly([[39,39],[50,34],[51,48],[43,55],[34,49]],'#70765c');
  p.poly([[53,36],[63,41],[67,48],[56,52],[52,47]],'#8a8c6c');
  p.poly([[43,57],[53,51],[63,56],[53,61]],'#5d6251');
  p.line(50,35,50+shift,47,'#b5a87f');p.line(50+shift,47,44,53,'#a5916c');
  band(p,50,48,24,22,phase+.2,phase+2.5,'#a99468',.48);
  band(p,50,48,24,23,phase+.6,phase+1.9,'#d0be91',.48);
}
function wind(p:PixelPainter,f:number):void{
  const phase=f/12*TAU;
  for(let i=0;i<3;i++){
    const start=phase+i*TAU/3,r=21+i*3;
    band(p,51,48,r+2,r-6,start,start+1.8,INK,.8);
    band(p,51,48,r,r-4,start+.03,start+1.75,'#426064',.8);
    band(p,51,48,r,r-2,start+.12,start+1.5,'#7daba8',.8);
    band(p,51,48,r,r-1,start+.25,start+1.35,'#c4d9cd',.8);
  }
  p.poly([[37,47],[51,44],[65,48],[51,51]],'#5c8182');p.line(44,47,61,48,'#d6e1d1');
}

/** Sprite raster scritti nel progetto, a dodici pose e palette esplicite. */
export function rasterBasicAttack(id:BasicAttackId,frame:number):Uint8ClampedArray{
  const size=id==='warrior-cleave'?128:96,p=new PixelPainter(size,size),f=Math.max(0,Math.min(11,Math.floor(frame)));
  switch(id){case 'warrior-cleave':cleave(p,f);break;case 'archer-arrow':arrow(p,f);break;case 'archer-release':release(p,f);break;
    case 'mage-fireball':fire(p,f);break;case 'mage-water-orb':water(p,f);break;case 'mage-earth-wisp':earth(p,f);break;case 'mage-wind-orb':wind(p,f);break;}
  const result=new Uint8ClampedArray(size*size*4);
  p.pixels.forEach((row,y)=>row.forEach((color,x)=>{if(!color)return;const offset=(y*size+x)*4;
    result[offset]=parseInt(color.slice(1,3),16);result[offset+1]=parseInt(color.slice(3,5),16);result[offset+2]=parseInt(color.slice(5,7),16);result[offset+3]=255;}));
  return result;
}
