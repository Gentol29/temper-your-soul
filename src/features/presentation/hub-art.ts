import { HUB_HOUSES, HUB_CRATES, HUB_CATHEDRAL, HUB_WALLS, HUB_STATIONS, type HubObstacle, type HubStation } from '../character/hub-state';
import { drawLight } from './lights';
import { TORCH_LIGHT } from './themes/crypt';
import { drawSprite, type Palette, type SpriteFrame } from './sprites';
const hash=(x:number,y:number)=>{let n=Math.imul(x+11,374761393)^Math.imul(y+17,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
function rect(c:CanvasRenderingContext2D,color:string,x:number,y:number,w:number,h:number):void {c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
/** Selciato e facciate rasterizzati una sola volta, senza immagini esterne. */
export function drawTown(c:CanvasRenderingContext2D):void {
 rect(c,'#242529',0,0,960,640);
 for(let y=0;y<640;y+=12)for(let x=-16;x<960;x+=24){const offset=(y/12%2)*12,n=hash(x,y),px=x+offset;
  rect(c,['#3d3c3b','#42403d','#37383b','#48443f','#343538'][n%5]!,px+1,y+1,22,10);
  rect(c,'#54504a',px+2,y+1,18-n%4,1);rect(c,'#24272a',px+22,y+3,1,8);
  rect(c,'#25272a',px+1,y+1,1,1);rect(c,'#25272a',px+21,y+10,2,1);
  if(n%3===0){rect(c,'#292c2d',px+7,y+5,1,5);rect(c,'#292c2d',px+8,y+5,4,1);}
  if(n%4===0)rect(c,'#282b2b',px+5+n%12,y+4,5,1);
  if(n%7===0)rect(c,'#4b4a42',px+4,y+6,2,2);
 }
 // Bordure di pietra dell'antica via mercantile.
 for(let x=128;x<832;x+=18){rect(c,'#666054',x,152,16,5);rect(c,'#1e2225',x,157,16,2);rect(c,'#625b4e',x,548,16,5);}
 for(let y=164;y<548;y+=18){rect(c,'#666054',135,y,5,16);rect(c,'#625b4e',820,y,5,16);}
 for(let i=0;i<170;i++){const x=145+hash(i,3)%670,y=160+hash(i,5)%380;if(hash(i,4)%3===0)rect(c,'#202728',x,y,3,2);}
 // Dallage ancien sous le portail, mosaïque octogonale en pixels.
 for(let y=-48;y<=48;y+=4)for(let x=-72;x<=72;x+=4){const d=Math.abs(x)/1.5+Math.abs(y);if(d>76)continue;
  rect(c,d>65?'#766b54':d>60?'#282b30':((x+y)%12===0?'#54504a':'#454440'),480+x,265+y,4,4);
 }
 for(const house of HUB_HOUSES)drawHouse(c,house);
 drawCathedral(c,HUB_CATHEDRAL);
 for(const wall of HUB_WALLS)drawWall(c,wall);
 for(const crate of HUB_CRATES)drawCrate(c,crate);
 // Detriti, muschio e griglie di scolo.
 for(const x of [154,790])for(const y of [350,530]){rect(c,'#171d20',x,y,20,12);for(let i=0;i<5;i++)rect(c,'#4b4d49',x+i*4,y,1,12);}
 for(const [x,y] of [[183,268],[786,386],[337,533],[612,185]]){rect(c,'#1b2422',x!,y!,18,5);rect(c,'#3f4937',x!+3,y!-2,6,3);}
}
function drawHouse(c:CanvasRenderingContext2D,o:HubObstacle):void {
 const {x,y,width:w,height:h}=o,faceY=y+h-48;
 rect(c,'#12171cd9',x+8,y+12,w+7,h+8);
 rect(c,'#363335',x,y,w,h);rect(c,'#686051',x,faceY,w,4);
 for(let by=faceY+5;by<y+h;by+=9)for(let bx=x;bx<x+w;bx+=18){const shift=(Math.floor(by/9)%2)*9;
  rect(c,['#4f4942','#585046','#494541'][hash(bx,by)%3]!,bx+shift+1,by,16,7);rect(c,'#696052',bx+shift+2,by,13,1);
 }
 // Ardesia e travi scure del tetto.
 rect(c,'#1b222b',x-3,y-18,w+6,h-30);
 for(let ty=y-18;ty<faceY;ty+=8)for(let tx=x-3;tx<x+w+3;tx+=16){const n=hash(tx,ty),offset=(Math.floor(ty/8)%2)*8;
  rect(c,['#303642','#383b46','#282f39','#3e4048'][n%4]!,tx+offset,ty,15,6);rect(c,'#4a4a50',tx+offset,ty,13,1);
 }
 rect(c,'#786755',x-5,faceY-3,w+10,4);rect(c,'#191c23',x-5,faceY+1,w+10,3);
 for(const wx of [x+22,x+w-34]){rect(c,'#24262a',wx-3,faceY+11,20,23);rect(c,'#9e7141',wx,faceY+13,14,17);rect(c,'#d29b50',wx+2,faceY+15,10,12);rect(c,'#40332d',wx+6,faceY+13,2,17);rect(c,'#40332d',wx,faceY+21,14,2);rect(c,'#8e7960',wx-3,faceY+32,20,3);}
 const doorX=x+Math.floor(w/2)-11;rect(c,'#222124',doorX-4,faceY+12,30,38);rect(c,'#594334',doorX,faceY+14,22,34);
 for(let i=0;i<4;i++)rect(c,'#332c29',doorX+i*6,faceY+15,1,32);rect(c,'#b68b50',doorX+17,faceY+31,2,2);rect(c,'#776b5b',doorX-4,y+h-2,30,4);
 // Comignolo in mattoni sopra le tegole.
 rect(c,'#302e31',x+w-42,y-23,19,31);for(let i=0;i<4;i++){rect(c,'#66584b',x+w-41,y-22+i*7,17,5);rect(c,'#87705b',x+w-40,y-22+i*7,14,1);}rect(c,'#24272c',x+w-45,y-26,25,5);
}
/** Mattoni sfalsati di pietra scura, tagliati al bordo del rettangolo. */
function bricks(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number):void {
 for(let by=y;by<y+h;by+=9)for(let bx=x;bx<x+w;bx+=18){const px=bx+(Math.floor(by/9)%2)*9+1,bw=Math.min(16,x+w-px);if(bw<=0)continue;
  rect(c,['#4f4942','#585046','#494541'][hash(bx,by)%3]!,px,by,bw,Math.min(7,y+h-by));rect(c,'#696052',px+1,by,Math.max(1,bw-3),1);
 }
}
/** Arco a sesto acuto: la punta sale in archH righe, poi i piedritti scendono dritti fino a h. */
function pointedArch(c:CanvasRenderingContext2D,color:string,cx:number,top:number,w:number,archH:number,h:number):void {
 for(let r=0;r<h;r++){const hw=r<archH?Math.max(1,Math.round(w/2*Math.pow((r+1)/archH,.6))):Math.round(w/2);rect(c,color,cx-hw,top+r,hw*2,1);}
}
/** Guglia di ardesia con due falde e una croce di pietra sulla punta. */
function spire(c:CanvasRenderingContext2D,cx:number,baseY:number,w:number,h:number,cross:boolean):void {
 for(let r=0;r<h;r+=2){const hw=Math.max(1,Math.round(w/2*(r/h))),y=baseY-h+r;
  rect(c,'#262c37',cx-hw,y,hw,2);rect(c,'#3a404e',cx,y,hw,2);if(r%10===8)rect(c,'#14181f',cx-hw,y,hw*2,1);
 }
 rect(c,'#8a8070',cx-1,baseY-h-(cross?9:4),2,cross?10:5);if(cross)rect(c,'#8a8070',cx-4,baseY-h-6,8,2);
}
/** Cattedrale: navata di ardesia, due torri con guglie, rosone e portale a sesto acuto. */
function drawCathedral(c:CanvasRenderingContext2D,o:HubObstacle):void {
 const {x,y,width:w,height:h}=o,b=y+h,ridge=x+Math.floor(w/2),cornice=b-132,roofTop=y-40;
 rect(c,'#12171cd9',x+w-4,y+30,14,h-14);
 for(let ty=roofTop;ty<cornice;ty+=8)for(let tx=x+14;tx<x+w-14;tx+=14){const n=hash(tx,ty),off=(Math.floor(ty/8)%2)*7;
  rect(c,(tx<ridge?['#33405a','#3a4864','#2d3850']:['#4a5775','#536281','#40506c'])[n%3]!,tx+off,ty,13,6);rect(c,'#4a4a50',tx+off,ty,11,1);
 }
 rect(c,'#1b1e26',ridge-4,roofTop,8,cornice-roofTop);rect(c,'#8a8070',ridge-3,roofTop,2,cornice-roofTop);rect(c,'#5b5a5e',ridge+1,roofTop,2,cornice-roofTop);
 for(let yy=roofTop+10;yy<cornice-10;yy+=36){rect(c,'#8a8070',ridge-5,yy,10,4);rect(c,'#8a8070',ridge-2,yy-8,4,8);}
 // Abbaini a timpano sulla navata, con la finestra illuminata.
 for(const [dx,dy] of [[-26,roofTop+60],[26,roofTop+60],[-26,roofTop+150],[26,roofTop+150]]){const dxp=ridge+dx!,dyp=dy!;
  rect(c,'#4a4640',dxp-8,dyp,16,18);for(let r=0;r<9;r++)rect(c,'#3b3f4c',dxp-1-r,dyp-9+r,2*r+2,1);rect(c,'#8a8070',dxp-9,dyp-1,18,2);
  pointedArch(c,'#1e2430',dxp,dyp+1,8,4,16);pointedArch(c,'#e0b45f',dxp,dyp+3,4,3,12);}
 // Navate laterali: muro di pietra con finestre lanceolate vetrate e contrafforti.
 for(const sx of [x,x+w-14]){rect(c,'#4a4640',sx,roofTop+10,14,cornice-roofTop-10);rect(c,'#8a8070',sx,roofTop+10,14,3);
  for(let i=0,yy=roofTop+26;yy<cornice-36;i++,yy+=46){pointedArch(c,'#1e2430',sx+7,yy,8,5,24);pointedArch(c,['#3f5f99','#a0553f','#c58f4c'][i%3]!,sx+7,yy+3,4,3,19);rect(c,'#6f685b',sx,yy+30,14,5);rect(c,'#8a8070',sx,yy+30,14,1);}
 }
 // Torri con cella campanaria e guglia.
 for(const tx of [x,x+w-38]){const cx=tx+19;
  bricks(c,tx,262,38,b-262);rect(c,'#8a8070',tx-2,258,42,5);rect(c,'#191c23',tx-2,263,42,3);
  pointedArch(c,'#14161b',cx,276,16,9,40);for(let yy=290;yy<316;yy+=5)rect(c,'#3a3e47',cx-7,yy,14,1);
  spire(c,cx,258,44,92,true);
  pointedArch(c,'#1e2430',cx,392,10,6,36);pointedArch(c,tx<w?'#3f5f99':'#a0553f',cx,395,6,4,30);
 }
 // Facciata, frontone e cornice.
 bricks(c,x+38,cornice,w-76,b-cornice);
 for(let r=0;r<42;r++){const hw=Math.round(26*(r/42));rect(c,r%9<7?'#4f4942':'#585046',ridge-hw,cornice-42+r,hw*2,1);rect(c,'#8a8070',ridge-hw,cornice-42+r,2,1);rect(c,'#8a8070',ridge+hw-2,cornice-42+r,2,1);}
 rect(c,'#8a8070',ridge-1,cornice-58,2,16);rect(c,'#8a8070',ridge-4,cornice-54,8,2);
 pointedArch(c,'#24262a',ridge,cornice-30,10,6,24);pointedArch(c,'#c58f4c',ridge,cornice-27,6,4,19);
 rect(c,'#8a8070',x,cornice-3,w,5);rect(c,'#191c23',x,cornice+2,w,3);
 rect(c,'#6f685b',x+36,cornice+5,4,b-cornice-5);rect(c,'#6f685b',x+w-40,cornice+5,4,b-cornice-5);
 // Rosone: vetri a quattro spicchi, raggi di pietra e anello.
 const rx=ridge,ry=cornice+38;
 for(let yy=-17;yy<=17;yy++)for(let xx=-17;xx<=17;xx++){const d=xx*xx+yy*yy;if(d>289)continue;
  const spoke=Math.abs(xx)<2||Math.abs(yy)<2||Math.abs(Math.abs(xx)-Math.abs(yy))<2;
  rect(c,d>196?'#8a8070':spoke?'#1b1c22':d<16?'#e0b45f':((xx>0)!==(yy>0)?'#3f5f99':'#a0553f'),rx+xx,ry+yy,1,1);
 }
 // Portale a sesto acuto con archivolto, battenti ferrati e gradini.
 pointedArch(c,'#8a8070',ridge,b-70,46,20,70);pointedArch(c,'#2a1f1a',ridge,b-66,38,18,64);pointedArch(c,'#4a3427',ridge,b-62,30,16,60);
 rect(c,'#241b17',ridge-15,b-38,30,2);rect(c,'#241b17',ridge-15,b-22,30,2);rect(c,'#1b1411',ridge,b-60,1,58);rect(c,'#b68b50',ridge-4,b-30,2,2);rect(c,'#b68b50',ridge+3,b-30,2,2);
 rect(c,'#776b5b',x,b-2,w,4);rect(c,'#8a8070',ridge-26,b+1,52,3);rect(c,'#5f5649',ridge-30,b+4,60,3);
}
/** Muro di cinta gotico: merli, arcatura cieca a sesto acuto e contrafforti con pinnacoli. */
function drawWall(c:CanvasRenderingContext2D,o:HubObstacle):void {
 const {x,y,width:w,height:h}=o,b=y+h,faceY=y+18,gate=x<480?4:0,pier=(i:number)=>x+Math.round(i*(w-16)/4);
 rect(c,'#3f3b38',x,faceY,w,b-faceY);bricks(c,x,faceY+3,w,b-faceY-3);
 for(let mx=x+4;mx<x+w-10;mx+=20){rect(c,'#5b554b',mx,y,12,faceY-y);rect(c,'#8a8070',mx,y,12,2);rect(c,'#2a2927',mx+11,y+2,1,faceY-y-2);}
 rect(c,'#8a8070',x,faceY-3,w,4);rect(c,'#191c23',x,faceY+1,w,3);
 for(let i=0;i<4;i++){const cx=Math.round((pier(i)+pier(i+1)+16)/2);pointedArch(c,'#8a8070',cx,faceY+7,24,12,b-faceY-7);pointedArch(c,'#16181d',cx,faceY+9,18,10,b-faceY-9);}
 for(let i=0;i<5;i++){const px=pier(i),top=i===gate?y-28:y-12;
  rect(c,'#6f685b',px,top,16,b-top);rect(c,'#8a8070',px,top,16,2);rect(c,'#3f3b38',px+13,top+2,3,b-top-2);rect(c,'#8a8070',px-1,faceY-3,18,4);
  spire(c,px+8,top,14,i===gate?30:22,false);
 }
}
/** Fiamma delle torce della cripta: corpo arancio, cuore chiaro che oscilla; `base` è il punto d'appoggio. */
function drawFlame(c:CanvasRenderingContext2D,x:number,base:number,time:number,phase:number):void {
 rect(c,'#e7a76c',x-4,base-17,8,10);rect(c,'#ffe4a0',x-2,base-19+Math.sin(time*8+phase)*2,4,7);
}
function drawCrate(c:CanvasRenderingContext2D,o:HubObstacle):void {
 const {x,y,width:w,height:h}=o;rect(c,'#12191b99',x+3,y+5,w+4,h+2);rect(c,'#30271f',x,y-10,w,h+10);rect(c,'#755a3d',x+2,y-8,w-4,h+6);
 for(let i=5;i<w-3;i+=6)rect(c,'#4d3b2c',x+i,y-8,1,h+6);rect(c,'#ad8852',x+1,y-10,w-2,3);rect(c,'#ad8852',x+1,y+h-3,w-2,3);
 for(let i=0;i<Math.min(w,h);i+=3)rect(c,'#957247',x+2+i,y-5+i,3,3);rect(c,'#302d28',x+1,y-7,2,h+4);rect(c,'#302d28',x+w-3,y-7,2,h+4);
}
export const NPC_FRAMES:readonly SpriteFrame[]=[0,1,2,3].map(frame=>[
 '......aaaa......','.....abbbba.....','.....acccca.....','......cddc......','......ceec......','.....ffffff.....',
 '....fgfffggf....','...cfghhhgfc....',frame%2?'...c.ghhhg.c....':'...c.ghhhgc.....','.....ghhhg......','.....ghhhg......',
 '.....giiig......','.....i..ii......',frame===1?'....ii...i......':'.....i..ii......','....aa..aaa.....',
]);
/** Fabbro dalla stazza possente, calvo con barba grigia: ispirato al fabbro di Berserk, nello stile a pixel del gioco. */
const SMITH_BASE:SpriteFrame=[
 '.....aaaaaaaa.....','....abbbbbbbba....','....affffffffa....','...adbbbbbbbbda...','...adebabbabeda...','...addbbbbbbdda...',
 '....adddddddda....','...addeddddedda...','.abbaiddddddiabba.','.abbaiiddddiiabba.','.abbaggggggggabba.','.acbaghhhhhhgabca.',
 '..abagjjjjjjgaba..','....agggggggga....','....akkakkakka....','...akkka.akkka....',
];
const withRows=(rows:Readonly<Record<number,string>>):SpriteFrame=>SMITH_BASE.map((row,i)=>rows[i]??row);
export const SMITH_FRAMES:readonly SpriteFrame[]=[
 SMITH_BASE,
 withRows({10:'.abbaggggggggabba.',11:'.abbaghhhhhhgabba.',12:'..aaagjjjjjjgaaa..'}),
 withRows({15:'..akkka...akkka...'}),
 withRows({10:'.abbaggggggggabba.',11:'.abbaghhhhhhgabba.',12:'..aaagjjjjjjgaaa..',15:'...akkka..akkka...'}),
];
const SMITH_NEW_PALETTE:Palette={a:'#1d1a1e',b:'#b98a66',c:'#8c6046',d:'#a8a39a',e:'#6a6764',f:'#8a3a2e',g:'#4b3226',h:'#6e4c37',i:'#3a3f4a',j:'#2a1f1a',k:'#2d2625'};
const SMITH_PALETTE:Palette={a:'#22242a',b:'#433329',c:'#b58b67',d:'#27202a',e:'#614333',f:'#706b62',g:'#3b3130',h:'#76503b',i:'#3b4149'};
const MERCHANT_PALETTE:Palette={...SMITH_PALETTE,b:'#4a3938',f:'#675c4b',g:'#313a37',h:'#4b6258',i:'#303b3d'};
export function drawHubStation(c:CanvasRenderingContext2D,s:HubStation,time:number):void {
 const x=s.x,y=s.y,frame=Math.floor(time*4)%4;
 rect(c,'#10161b99',x-s.width/2-4,y+5,s.width+8,10);
 if(s.id==='portal'){
  // Anello spezzato di pietra, rune e vortice in quattro fasi.
  for(let yy=-70;yy<8;yy+=3)for(let xx=-34;xx<=34;xx+=3){const d=(xx*xx)/(31*31)+((yy+32)*(yy+32))/(41*41);
   if(d<1.15&&d>.75)rect(c,(hash(xx,yy)%3===0?'#9f947a':'#625f60'),x+xx,y+yy,3,3);
   else if(d<=.75)rect(c,['#232333','#383244','#51465a','#716270'][(Math.floor((xx+yy)/9)+frame+100)%4]!,x+xx,y+yy,3,3);
  }
  for(let i=0;i<12;i++){const a=i*Math.PI/6+time*.65;rect(c,i%3?'#d3b783':'#f1e1b6',x+Math.cos(a)*25,y-32+Math.sin(a)*33,2,3);}
  rect(c,'#93836a',x-40,y+7,80,5);rect(c,'#4e4b48',x-45,y+12,90,5);
 }else if(s.id==='storage'){
  drawCrate(c,{x:x-21,y:y-6,width:42,height:22});rect(c,'#49342a',x-23,y-22,46,17);rect(c,'#a47e43',x-23,y-23,46,3);rect(c,'#b38f4f',x-20,y-23,4,37);rect(c,'#b38f4f',x+16,y-23,4,37);rect(c,'#d2af62',x-4,y-8,8,9);if(frame===0)rect(c,'#fff1b2',x-2,y-8,2,2);
 }else if(s.id==='forge'){
  rect(c,'#454044',x-25,y-63,50,72);for(let by=-61;by<8;by+=9)for(let bx=-23;bx<24;bx+=13){rect(c,'#6b5e51',x+bx,y+by,11,7);rect(c,'#89725b',x+bx,y+by,11,1);}
  rect(c,'#151b21',x-17,y-34,34,39);rect(c,'#4a2e2b',x-15,y-32,30,35);
  rect(c,'#b04d2d',x-13,y-1,26,4);rect(c,'#dc7939',x-9,y-2,18,2);
  for(const fx of [-8,0,8])drawFlame(c,x+fx,y-2,time,x+fx);
  rect(c,'#95806b',x-29,y+5,58,5);rect(c,'#252b31',x-13,y-77,26,17);rect(c,'#716356',x-17,y-80,34,5);
  for(let i=0;i<3;i++)rect(c,'#8f827966',x-7+i*5+frame*2,y-85-i*8-frame*2,7,5);
 }else if(s.id==='smith'){
  drawSprite(c,SMITH_FRAMES[frame]!,x-30,y-17,2,SMITH_NEW_PALETTE);
  rect(c,'#8e9699',x+10,y-15,34,7);rect(c,'#4c5661',x+14,y-8,26,6);rect(c,'#535660',x+23,y-2,9,12);rect(c,'#85837c',x+16,y+9,24,4);
  // Il martello parte dal pugno destro e cala sull'incudine.
  const lift=frame===1?10:frame===2?0:5,top=y-14-lift;rect(c,'#8f6a45',x-1,top,3,y+8-top);rect(c,'#b3b6b0',x-4,top-3,11,6);rect(c,'#6f7478',x-4,top+1,11,2);
  if(frame===2){rect(c,'#ffc16b',x+17,y-19,2,2);rect(c,'#e59b4c',x+24,y-24,2,2);}
 }else{
  // Bottega: tenda di tela, bancone e mercante animato.
  rect(c,'#6b513a',x-33,y-53,3,65);rect(c,'#6b513a',x+30,y-53,3,65);
  for(let i=0;i<8;i++){rect(c,i%2?'#5b3d39':'#9f8661',x-36+i*9,y-58+(i%2),9,15);rect(c,i%2?'#392c2d':'#6e5e48',x-36+i*9,y-43,9,4);}
  drawSprite(c,NPC_FRAMES[frame]!,x,y-14,2,MERCHANT_PALETTE);
  rect(c,'#342c29',x-30,y-5,60,20);rect(c,'#93704a',x-33,y-8,66,5);for(let i=0;i<6;i++)rect(c,'#634b36',x-28+i*10,y-2,8,15);
  rect(c,'#a36d4a',x-20,y-13,8,5);rect(c,'#a5ac9b',x+12,y-14,9,6);
 }
}
/** Torce agli angoli: stessa luce, stesso sfarfallio e stessa fiamma delle torce della cripta. */
export function drawTownLights(c:CanvasRenderingContext2D,time:number):void {
 for(const [x,y] of [[155,160],[805,160]]){
  const base=y!-14,flicker=Math.sin(time*8+x!)*.5+Math.sin(time*13+base)*.5;
  drawLight(c,x!,base-12,TORCH_LIGHT.color,TORCH_LIGHT.radius+flicker*4,.85+flicker*.1);
  rect(c,'#252328',x!-3,y!-21,6,23);rect(c,'#b48a51',x!-5,y!-26,10,8);
  drawFlame(c,x!,base,time,x!);
 }
 // La fucina proietta la stessa luce delle torce.
 const forge=HUB_STATIONS.find(s=>s.id==='forge')!,fl=Math.sin(time*8+forge.x)*.5+Math.sin(time*13+forge.y)*.5;
 drawLight(c,forge.x,forge.y-14,TORCH_LIGHT.color,TORCH_LIGHT.radius+fl*4,.85+fl*.1);
}
