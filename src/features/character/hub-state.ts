import { Vec2 } from '../../core/vec2';
import { HUB_MAP, HUB_SPAWN, HUB_STATIONS, hubBlocked, type HubStation } from './hub-map';
import { hubInteractionDistance } from './hub-interaction';
export * from './hub-map';
/** Stato puro, movimento a passo fisso e scorrimento lungo le superfici solide. */
export class HubState {
 position=HUB_SPAWN;
 moving=false;
 facing=1;
 /** L'ultima direzione chiesta col movimento, anche in diagonale: sceglie la vista del personaggio fra le otto. */
 heading=new Vec2(1,1);
 step(dt:number,move:Vec2):void {
  const before=this.position,delta=move.normalized().mul(Math.min(1,move.length())*Math.max(0,dt)*HUB_MAP.speed);
  const steps=Math.max(1,Math.ceil(delta.length()/HUB_MAP.playerRadius)),d=delta.mul(1/steps);
  for(let i=0;i<steps;i++) {
   const x=this.position.add(new Vec2(d.x,0));if(!hubBlocked(x))this.position=x;
   const y=this.position.add(new Vec2(0,d.y));if(!hubBlocked(y))this.position=y;
  }
  this.moving=this.position.distanceTo(before)>0.001;if(move.x)this.facing=move.x<0?-1:1;
  if(move.length()>0.001)this.heading=move.normalized();
 }
 nearest():HubStation|undefined {
  return [...HUB_STATIONS].sort((a,b)=>hubInteractionDistance(a,this.position)-hubInteractionDistance(b,this.position)).find(s=>hubInteractionDistance(s,this.position)<HUB_MAP.interactionRadius);
 }
}
