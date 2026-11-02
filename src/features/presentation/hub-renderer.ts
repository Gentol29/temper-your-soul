import type {HubPlayer} from '../network/hub-protocol';
import {canvasFont} from './fonts';
import { HUB_MAP, HUB_STATIONS, HUB_TORCHES, type HubState } from '../character/hub-state';
import type { CharacterAppearance } from '../character/appearance';
import { drawTownGround, drawHubStation, drawTownLights, drawTorch, HUB_STRUCTURES } from './hub-art';
import { drawGameCharacter } from './game-character-preview';
/** Mappa a schermo intero, raster a pixel interi; nessuna regola di movimento qui. */
export class HubRenderer {
 private readonly ground=document.createElement('canvas');
 private readonly ctx:CanvasRenderingContext2D;
 /** Ogni edificio rasterizzato una volta nel proprio riquadro, poi ordinato con chi si muove. */
 private readonly structures:readonly {readonly base:number;readonly x:number;readonly y:number;readonly image:HTMLCanvasElement}[];
 scale=2;camera={x:0,y:0};
 constructor(private readonly canvas:HTMLCanvasElement){
  this.ctx=canvas.getContext('2d')!;this.ground.width=HUB_MAP.width;this.ground.height=HUB_MAP.height;drawTownGround(this.ground.getContext('2d')!);
  this.structures=HUB_STRUCTURES.map(s=>{
   const image=document.createElement('canvas');image.width=s.bounds.width;image.height=s.bounds.height;
   const g=image.getContext('2d')!;g.translate(-s.bounds.x,-s.bounds.y);s.draw(g);
   return {base:s.base,x:s.bounds.x,y:s.bounds.y,image};
  });
 }
 draw(state:HubState,appearance:CharacterAppearance,time:number,peers:readonly HubPlayer[]=[]):void {
  const width=window.innerWidth,height=window.innerHeight;
  this.scale=Math.max(1,width/HUB_MAP.width,height/HUB_MAP.height);
  const w=Math.ceil(width/this.scale),h=Math.ceil(height/this.scale);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  this.camera={x:Math.round(Math.max(0,Math.min(HUB_MAP.width-w,state.position.x-w/2))),y:Math.round(Math.max(0,Math.min(HUB_MAP.height-h,state.position.y-h/2)))};
  const c=this.ctx;c.imageSmoothingEnabled=false;c.save();c.clearRect(0,0,w,h);c.translate(-this.camera.x,-this.camera.y);c.drawImage(this.ground,0,0);
  const actors=[
   ...this.structures.map(s=>({y:s.base,draw:()=>c.drawImage(s.image,s.x,s.y)})),
   ...HUB_TORCHES.map(t=>({y:t.y,draw:()=>drawTorch(c,t,time)})),
   ...HUB_STATIONS.map(station=>({y:station.y,draw:()=>drawHubStation(c,station,time)})),
   {y:state.position.y,draw:()=>{c.fillStyle='#11161a99';c.fillRect(Math.round(state.position.x-12),Math.round(state.position.y+10),24,5);drawGameCharacter(c,appearance,state.position.x,state.position.y,time,state.moving,state.facing);}},
  ];
  for(const peer of peers)actors.push({y:peer.y,draw:()=>{c.fillStyle='#11161a99';c.fillRect(Math.round(peer.x-12),Math.round(peer.y+10),24,5);drawGameCharacter(c,peer.appearance,peer.x,peer.y,time,peer.moving,peer.facing);c.font=canvasFont(8,'pixel');c.textAlign='center';c.fillStyle='#e6d2ad';c.fillText(peer.name,Math.round(peer.x),Math.round(peer.y-38));}});
  actors.sort((a,b)=>a.y-b.y);for(const actor of actors)actor.draw();drawTownLights(c,time);c.restore();
 }
 screenPoint(x:number,y:number):{x:number;y:number}{return {x:(x-this.camera.x)*this.scale,y:(y-this.camera.y)*this.scale};}
}
