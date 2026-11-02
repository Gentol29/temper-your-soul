import {describe,it,expect} from 'vitest';
import {NPC_FRAMES,SMITH_FRAMES} from './hub-art';
import {characterPixels} from './character-art';
import {Character} from '../character/character';
describe('sprite provvisori del rifugio',()=>{
 it('NPC animati con fotogrammi pixel della stessa griglia e pose distinte',()=>{
  expect(NPC_FRAMES).toHaveLength(4);for(const frame of NPC_FRAMES){expect(frame).toHaveLength(15);for(const row of frame)expect(row.length).toBe(16);}
  expect(new Set(NPC_FRAMES.map(frame=>frame.join(''))).size).toBeGreaterThan(1);
 });
 it('il fabbro ha quattro fotogrammi 18x16 con pose distinte e solo colori della tavolozza',()=>{
  expect(SMITH_FRAMES).toHaveLength(4);for(const frame of SMITH_FRAMES){expect(frame).toHaveLength(16);for(const row of frame)expect(row).toMatch(/^[.a-k]{18}$/);}
  expect(new Set(SMITH_FRAMES.map(frame=>frame.join(''))).size).toBe(4);
 });
 it('il compositore del gioco conserva classe, equipaggiamento e fotogrammi di camminata',()=>{
  const c=Character.createStarter();c.completeCreation('Viandante','male','warrior');
  const idle=characterPixels(c.appearance(),'game',0,false,{state:'idle',frame:0});
  const walk=characterPixels(c.appearance(),'game',0,false,{state:'walk',frame:1});expect(walk.width).toBe(48);expect(walk.pixels).not.toEqual(idle.pixels);
 });
});
