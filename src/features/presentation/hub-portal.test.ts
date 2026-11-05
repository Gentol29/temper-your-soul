import {describe,it,expect} from 'vitest';
import {characterPixels} from './character-art';
import {Character} from '../character/character';
import {HUB_PORTAL,portalStonePixels,portalVortexPixels,portalMouthHalfWidth} from './hub-portal';
import {hubColor} from './hub-palette';
describe('portale e palette del rifugio',()=>{
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
 it('il compositore del gioco conserva classe, equipaggiamento e fotogrammi di camminata',()=>{
  const c=Character.createStarter();c.completeCreation('Viandante','male','warrior');
  const idle=characterPixels(c.appearance(),'game',0,false,{state:'idle',frame:0});
  const walk=characterPixels(c.appearance(),'game',0,false,{state:'walk',frame:1});expect(walk.width).toBe(64);expect(walk.pixels).not.toEqual(idle.pixels);
 });
});
