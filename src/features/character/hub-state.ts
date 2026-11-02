import { Vec2 } from '../../core/vec2';
export interface HubObstacle {readonly x:number;readonly y:number;readonly width:number;readonly height:number}
export const HUB_MAP={width:960,height:640,playerRadius:9,speed:148,interactionRadius:62} as const;
export const HUB_STATIONS=[
 {id:'portal',name:'Portale dei raid',x:480,y:264,width:90,height:32},
 {id:'storage',name:'Deposito',x:230,y:318,width:48,height:24},
 {id:'forge',name:'Forgia',x:730,y:294,width:52,height:34},
 {id:'smith',name:'Fabbro',x:722,y:356,width:90,height:26},
 {id:'merchant',name:'Mercante',x:270,y:462,width:58,height:30},
] as const;
export type HubStation=typeof HUB_STATIONS[number];
/** Impronte solide delle case: tetti e facciate sono solo rappresentazione. */
export const HUB_HOUSES:readonly HubObstacle[]=[
 {x:0,y:0,width:190,height:140},{x:200,y:0,width:178,height:114},{x:393,y:0,width:174,height:104},{x:582,y:0,width:178,height:114},{x:775,y:0,width:185,height:140},
 {x:0,y:522,width:220,height:118},
 {x:832,y:140,width:128,height:175},{x:842,y:332,width:118,height:172},{x:740,y:522,width:220,height:118},
];
/** Sporgenza dei tetti sopra la facciata (vedi `drawHouse` in hub-art). */
export const HUB_ROOF_OVERHANG=18;
/** Nella fila in basso il tetto sporge verso chi cammina dietro le case: la sporgenza è solida, così nessuno ci finisce sopra. */
export function houseFootprint(house:HubObstacle):HubObstacle {
 return house.y+house.height>=HUB_MAP.height?{...house,y:house.y-HUB_ROOF_OVERHANG,height:house.height+HUB_ROOF_OVERHANG}:house;
}
/** Cattedrale a sinistra: tetto, guglie e gradini restano dentro questa impronta, che arriva fino al tetto della casa sotto. */
export const HUB_CATHEDRAL:HubObstacle={x:0,y:140,width:128,height:364};
/** Muro di cinta gotico in basso: tra i due tratti resta aperto il varco. */
export const HUB_WALLS:readonly HubObstacle[]=[{x:220,y:580,width:225,height:60},{x:515,y:580,width:225,height:60}];
export const HUB_CRATES:readonly HubObstacle[]=[{x:149,y:184,width:28,height:26},{x:176,y:202,width:24,height:24},{x:773,y:178,width:30,height:28},{x:804,y:211,width:22,height:24},{x:148,y:478,width:28,height:28},{x:786,y:489,width:26,height:26}];
/** Torce degli angoli: `y` è il punto d'appoggio del palo, la cui base è solida. */
export const HUB_TORCHES:readonly {readonly x:number;readonly y:number}[]=[{x:155,y:160},{x:805,y:160}];
export const torchFootprint=(t:{readonly x:number;readonly y:number}):HubObstacle=>({x:t.x-5,y:t.y-4,width:10,height:6});
export const HUB_OBSTACLES:readonly HubObstacle[]=[...HUB_HOUSES.map(houseFootprint),HUB_CATHEDRAL,...HUB_WALLS,...HUB_CRATES,...HUB_TORCHES.map(torchFootprint),...HUB_STATIONS.map(s=>({x:s.x-s.width/2,y:s.y-s.height/2,width:s.width,height:s.height}))];
export function hubBlocked(position:Vec2):boolean {
 const r=HUB_MAP.playerRadius;
 if(position.x<r||position.y<r||position.x>HUB_MAP.width-r||position.y>HUB_MAP.height-r)return true;
 return HUB_OBSTACLES.some(o=>{const x=Math.max(o.x,Math.min(o.x+o.width,position.x)),y=Math.max(o.y,Math.min(o.y+o.height,position.y));return position.distanceTo(new Vec2(x,y))<r;});
}
/** Stato puro, movimento a passo fisso e scorrimento lungo le superfici solide. */
export class HubState {
 position=new Vec2(480,360);
 moving=false;
 facing=1;
 step(dt:number,move:Vec2):void {
  const before=this.position,delta=move.normalized().mul(Math.min(1,move.length())*Math.max(0,dt)*HUB_MAP.speed);
  const steps=Math.max(1,Math.ceil(delta.length()/HUB_MAP.playerRadius)),d=delta.mul(1/steps);
  for(let i=0;i<steps;i++) {
   const x=this.position.add(new Vec2(d.x,0));if(!hubBlocked(x))this.position=x;
   const y=this.position.add(new Vec2(0,d.y));if(!hubBlocked(y))this.position=y;
  }
  this.moving=this.position.distanceTo(before)>0.001;if(move.x)this.facing=move.x<0?-1:1;
 }
 nearest():HubStation|undefined {
  return [...HUB_STATIONS].sort((a,b)=>this.position.distanceTo(new Vec2(a.x,a.y))-this.position.distanceTo(new Vec2(b.x,b.y))).find(s=>this.position.distanceTo(new Vec2(s.x,s.y))<HUB_MAP.interactionRadius);
 }
}
