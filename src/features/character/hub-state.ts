import { Vec2 } from '../../core/vec2';
import { HUB_ISO_MAP, HUB_ISO_SPAWN, HUB_ISO_STATIONS, hubIsoBlocked } from './hub-iso-map';
import { hubInteractionDistance } from './hub-interaction';

/*
 * L'HUB giocabile: la piazza isometrica di `hub-iso-map.ts`, condivisa da client e server. Il menu tiene la sua
 * illustrazione frontale con la geometria di `hub-map.ts`.
 */
export const HUB_MAP = HUB_ISO_MAP;
export const HUB_SPAWN = HUB_ISO_SPAWN;
export const HUB_STATIONS = HUB_ISO_STATIONS;
export type HubStation = typeof HUB_STATIONS[number];

export function hubBlocked(position: Vec2): boolean {
  return hubIsoBlocked(position);
}

/** Accessi sul selciato, davanti al fronte di ogni edificio. */
export function hubApproachPoint(id: HubStation['id']): Vec2 {
  const station = HUB_STATIONS.find(s => s.id === id)!;
  return new Vec2(...station.approach);
}

/** Le visite non possono far nascere un giocatore nel bordo della mappa o dentro un edificio. */
export function hubSpawnPoint(index: number): Vec2 {
  const candidates = [0, 1, 2, -1].flatMap(row => [0, 1, -1, 2, -2, 3].map(column => HUB_SPAWN.add(new Vec2(column * 30, row * 30)))).filter(p => !hubBlocked(p));
  return candidates[Math.max(0, index) % candidates.length] ?? HUB_SPAWN;
}

/** Stato puro, movimento a passo fisso e scorrimento lungo le superfici solide. */
export class HubState {
 position=HUB_SPAWN;
 moving=false;
 facing=1;
 step(dt:number,move:Vec2):void {
  const before=this.position,delta=move.normalized().mul(Math.min(1,move.length())*Math.max(0,dt)*HUB_MAP.speed);
  const steps=Math.max(1,Math.ceil(delta.length()/HUB_MAP.playerRadius)),d=delta.mul(1/steps);
  for(let i=0;i<steps;i++) {
   const x=this.position.add(new Vec2(d.x,0));if(!hubBlocked(x))this.position=x;
   const y=this.position.add(new Vec2(0,d.y));if(!hubBlocked(y))this.position=y;
  }
  this.moving=this.position.distanceTo(before)>0.001;
  // Il verso segue lo schermo isometrico: a destra se il passo va a destra nella vista (x - y del mondo).
  const screen=move.x-move.y;if(Math.abs(screen)>1e-6)this.facing=screen<0?-1:1;
 }
 nearest():HubStation|undefined {
  return [...HUB_STATIONS].sort((a,b)=>hubInteractionDistance(a,this.position)-hubInteractionDistance(b,this.position)).find(s=>hubInteractionDistance(s,this.position)<HUB_MAP.interactionRadius);
 }
}
