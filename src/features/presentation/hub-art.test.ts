import {describe,it,expect} from 'vitest';
import {NPC_FRAMES,smithPixels,SMITH_ART,HUB_STRUCTURES} from './hub-art';
import {HUB_HOUSES,HUB_CATHEDRAL,HUB_WALLS,HUB_CRATES,houseFootprint} from './village-layout';
import {characterPixels} from './character-art';
import {Character} from '../character/character';
import {HUB_PORTAL,portalStonePixels,portalVortexPixels,portalMouthHalfWidth} from './hub-portal';
import {hubColor} from './hub-palette';
describe('sprite provvisori del rifugio',()=>{
 it('il portale ha contorni opachi in pietra, una cavità nera e un vortice rosso animato su griglia intera',()=>{
  const stone=portalStonePixels(),frames=[0,8,16,24].map(portalVortexPixels);
  for(const art of [stone,...frames]){
   expect(art.width).toBe(HUB_PORTAL.width);expect(art.height).toBe(HUB_PORTAL.height);
   expect(art.pixels).toHaveLength(art.height);
   for(const row of art.pixels){expect(row).toHaveLength(art.width);for(const color of row)expect(color===''||/^#[\da-f]{6}$/i.test(color)).toBe(true);}
  }
  expect(new Set(frames.map(frame=>JSON.stringify(frame.pixels))).size).toBe(4);
  expect(portalVortexPixels(HUB_PORTAL.frames)).toBe(frames[0]);
  expect(portalMouthHalfWidth(-102)).toBeLessThan(portalMouthHalfWidth(-70));
  expect(stone.pixels[HUB_PORTAL.anchorY-48]![HUB_PORTAL.anchorX]).toBe('#09070c');
  const core=frames[0]!.pixels[HUB_PORTAL.anchorY-48]![HUB_PORTAL.anchorX]!;
  expect(core).toBe('#09070c');
  const flow=frames.flatMap(frame=>frame.pixels.flat().filter(color=>color));
  const red=flow.filter(color=>parseInt(color.slice(1,3),16)>parseInt(color.slice(5,7),16)*1.5);
  expect(red.length/flow.length).toBeGreaterThan(.6);
  // Le quattro pareti del foglio sono trasparenti: niente guglie/fiamme tagliate.
  for(const art of [stone,...frames]){
   expect(art.pixels[0]!.every(color=>color==='')).toBe(true);
   expect(art.pixels[art.height-1]!.every(color=>color==='')).toBe(true);
   expect(art.pixels.every(row=>row[0]===''&&row[art.width-1]==='')).toBe(true);
  }
 });
 it('la palette rimappa ardesia, vetrate e tendaggi conservando alpha e pelle',()=>{
  expect(hubColor('#3f5f99')).toBe('#a12f41');
  expect(hubColor('#303642')).toBe('#2b292e');
  expect(hubColor('#9f8661')).toBe('#8d293c');
  expect(hubColor('#12171cd9')).toBe('#101014d9');
  expect(hubColor('#c99a76')).toBe('#c99a76');
 });
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
  const walk=characterPixels(c.appearance(),'game',0,false,{state:'walk',frame:1});expect(walk.width).toBe(64);expect(walk.pixels).not.toEqual(idle.pixels);
 });
});
