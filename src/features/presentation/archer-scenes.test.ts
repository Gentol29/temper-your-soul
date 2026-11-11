import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { createMatch } from '../../testing';
import type { CharacterAppearance } from '../character/appearance';
import { drawPlayer } from './draw-actors';
import { drawGameCharacter } from './game-character-preview';
import { ActorPoses } from './poses';
import { SHADOW_ANIMATION } from './shadow-motion';

type Fill = readonly [number,number,number,number,string];
class Raster {
  width=0; height=0;
  readonly fills: Fill[]=[];
  getContext(): object {
    const fills=this.fills;
    const context={fillStyle:'',fillRect(x:number,y:number,w:number,h:number) {fills.push([x,y,w,h,context.fillStyle]);}};
    return context;
  }
}
function target() {
  const draws: Array<{fills:readonly Fill[]; x:number; y:number}> = [];
  const scales: number[][]=[];
  const context = {
    save() {}, restore() {}, translate() {}, fillRect() {},
    scale(x:number,y:number) {scales.push([x,y]);},
    drawImage(raster:Raster,x:number,y:number) {draws.push({fills:raster.fills,x,y});},
  } as unknown as CanvasRenderingContext2D;
  return {context,draws,scales};
}

afterEach(()=>vi.unstubAllGlobals());
describe('Arciere coerente fra HUB, anteprima e partita',()=>{
  it('usa gli stessi pixel, appoggio e verso per ogni vista e fotogramma di riposo e cammino',()=>{
    vi.stubGlobal('document',{createElement:()=>new Raster()});
    const appearance: CharacterAppearance={body:'male',characterClass:'archer',equipment:{
      primary_hand:{uid:'arco',familyId:'hunter_bow',rarity:'common'},
      secondary_hand:{uid:'faretra',familyId:'spore_fan',rarity:'common'},
      armor:{uid:'mantello',familyId:'reed_mantle',rarity:'common'},
      boots:{uid:'stivali',familyId:'wind_boots',rarity:'common'},
    }};
    const {player}=createMatch();
    const poses=new ActorPoses();
    const headings=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    for(const [x,y] of headings) for(const moving of [false,true]) for(let frame=0;frame<12;frame++) {
      player.aim=player.position.add(new Vec2(x,y)); player.moving=moving;
      poses.walkPhase=frame+.01;
      const time=(frame+.01)/(moving?SHADOW_ANIMATION.fps.walk:SHADOW_ANIMATION.fps.idle);
      const game=target(),hub=target();
      drawPlayer(game.context,player,poses,time,true,appearance);
      // L'HUB e l'anteprima dell'altare chiamano entrambi drawGameCharacter.
      drawGameCharacter(hub.context,appearance,player.position.x,player.position.y,time,moving,{x,y});
      expect(game.draws,`${x},${y}/${moving}/${frame}`).toEqual(hub.draws);
      expect(game.scales).toEqual([[1,1]]);
      expect(hub.scales).toEqual([[1,1]]);
      expect(game.draws).toHaveLength(1);
    }
  });
});
