import {describe,it,expect} from 'vitest';
import {NPC_FRAMES,smithPixels,SMITH_ART,HUB_STRUCTURES} from './hub-art';
import {HUB_HOUSES,HUB_CATHEDRAL,HUB_WALLS,HUB_CRATES,houseFootprint} from '../character/hub-state';
import {characterPixels} from './character-art';
import {Character} from '../character/character';
describe('sprite provvisori del rifugio',()=>{
 it('NPC animati con fotogrammi pixel della stessa griglia e pose distinte',()=>{
  expect(NPC_FRAMES).toHaveLength(4);for(const frame of NPC_FRAMES){expect(frame).toHaveLength(15);for(const row of frame)expect(row.length).toBe(16);}
  expect(new Set(NPC_FRAMES.map(frame=>frame.join(''))).size).toBeGreaterThan(1);
 });
 it('il fabbro usa la griglia dei personaggi, con contorno scuro e quattro tempi della martellata',()=>{
  const frames=[0,1,2,3].map(smithPixels);
  for(const art of frames){expect(art.height).toBe(48);expect(art.width).toBe(SMITH_ART.width);expect(art.pixels).toHaveLength(48);for(const row of art.pixels)expect(row).toHaveLength(SMITH_ART.width);}
  expect(new Set(frames.map(art=>JSON.stringify(art.pixels))).size).toBe(3);
  expect(frames[1]).toEqual(frames[3]);
  expect(frames[0]!.pixels.flat()).toContain('#241d27');
  // Nel colpo il ferro del martello scende verso l'incudine, a destra del corpo.
  const iron=(art:typeof frames[number])=>art.pixels.flatMap((row,y)=>row.flatMap((color,x)=>color==='#8e9699'?[{x,y}]:[]));
  const lowest=(art:typeof frames[number])=>Math.max(...iron(art).map(p=>p.y));
  expect(lowest(frames[2]!)).toBeGreaterThan(lowest(frames[0]!));
  expect(Math.min(...iron(frames[2]!).map(p=>p.x))).toBeGreaterThan(SMITH_ART.width/2);
 });
 it('ogni edificio si ordina con i personaggi secondo la base della propria impronta, senza uscirne in basso',()=>{
  const solids=[...HUB_HOUSES.map(houseFootprint),HUB_CATHEDRAL,...HUB_WALLS,...HUB_CRATES];
  expect(HUB_STRUCTURES).toHaveLength(solids.length);
  HUB_STRUCTURES.forEach((s,i)=>{const o=solids[i]!;expect(s.base).toBe(o.y+o.height);expect(s.bounds.y+s.bounds.height).toBeLessThanOrEqual(o.y+o.height+3);});
  // La cattedrale non sale sopra la propria impronta: il tetto non copre più la casa sopra.
  const cathedral=HUB_STRUCTURES[HUB_HOUSES.length]!;expect(cathedral.bounds.y).toBeGreaterThanOrEqual(HUB_CATHEDRAL.y-4);
 });
 it('il compositore del gioco conserva classe, equipaggiamento e fotogrammi di camminata',()=>{
  const c=Character.createStarter();c.completeCreation('Viandante','male','warrior');
  const idle=characterPixels(c.appearance(),'game',0,false,{state:'idle',frame:0});
  const walk=characterPixels(c.appearance(),'game',0,false,{state:'walk',frame:1});expect(walk.width).toBe(48);expect(walk.pixels).not.toEqual(idle.pixels);
 });
});
