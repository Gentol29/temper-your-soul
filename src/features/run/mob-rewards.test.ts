import {describe,it,expect,vi} from 'vitest';
import {DescentRun} from './descent';
import {MINIONS} from '../minions/minion-catalog';
import {Vec2} from '../../core/vec2';
import {mobReward,MOB_REWARDS} from './mob-rewards';
import {snapshotOf,applySnapshot,replicaMatch} from '../network/protocol';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotFrame} from '../network/snapshot-codec';
import { Effects, XP_FEEDBACK } from '../presentation/effects';
import { Camera } from '../../core/camera';
import type { GameEvent } from '../combat/events';
import { cuesForEvent } from '../audio/audio-director';
import { drawFloatingTexts } from '../presentation/draw-effects';
function run(dungeonId='crypt'){return new DescentRun({mode:'descent',dungeonId,seed:1,members:[{id:'a',characterClass:'mage',loadout:[],totalXp:96},{id:'b',characterClass:'warrior',loadout:[]}]});}
function kill(r:DescentRun,roll:number){vi.spyOn(r.match.rng,'next').mockReturnValue(roll);const m=r.match.spawnMinion(Object.values(MINIONS)[0]!,new Vec2(100,100));r.encounter.onMinionKilled(r.match,m,false);return m;}
describe('ricompense dei mob',()=>{
 it('XP in Silkscreen: etichette vicine separate, numero limitato e danni conservati',()=>{
  const fx=new Effects(),position=new Vec2(200,200);
  fx.handle({type:'damage_dealt',target:'minion',amount:13,position});
  for(let i=0;i<4;i++)fx.handle({type:'reward_taken',reward:'xp',amount:4,position,playerId:'local'});
  expect(new Set(fx.texts.filter(t=>t.pixel).map(t=>t.y)).size).toBe(4);
  const ctx={save:vi.fn(),restore:vi.fn(),strokeText:vi.fn(),fillText:vi.fn(),font:''};
  drawFloatingTexts(ctx as unknown as CanvasRenderingContext2D,fx);
  expect(ctx.font).toContain("'Silkscreen'");expect(ctx.fillText).toHaveBeenCalledWith('+4 XP',expect.any(Number),expect.any(Number));
  for(let i=0;i<80;i++)fx.handle({type:'reward_taken',reward:'xp',amount:4,position,playerId:'local'});
  expect(fx.texts.filter(t=>t.pixel)).toHaveLength(XP_FEEDBACK.maxTexts);
  expect(fx.texts.some(t=>t.text==='13')).toBe(true);
 });
 it('il premio oro tardivo occupa una riga distante dagli XP già saliti',()=>{
  const fx=new Effects(),r=run(),position=r.match.player.position;
  fx.handle({type:'reward_taken',reward:'xp',amount:4,position,playerId:'a'},'a');fx.update(.9,r.match,new Camera());
  fx.handle({type:'reward_taken',reward:'gold',amount:3,position,playerId:'a'},'a');
  expect(Math.abs(fx.texts[0].y-fx.texts[1].y)).toBeGreaterThanOrEqual(XP_FEEDBACK.stackGap);
 });
 it('il testo XP corrisponde al premio effettivo a ogni pericolo e passa nel codec per il solo destinatario',()=>{
  for(const dungeon of ['crypt','swamp','forge','glacier']){
   const r=run(dungeon),events:GameEvent[]=[];r.match.events.connect(e=>events.push(e));
   const enemy=kill(r,1);r.syncProgress();
   const xp=events.filter(e=>e.type==='reward_taken'&&e.reward==='xp');
   expect(xp).toHaveLength(2);
   const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
   const wire=JSON.parse(JSON.stringify(encoder.encode(snapshotOf(r.match,'xp',events,{})))) as SnapshotFrame;
   const decoded=decoder.decode(wire),fx=new Effects();
   for(const event of decoded.events)fx.handle(event,'a');
   const texts=fx.texts.filter(t=>t.pixel);
   expect(texts).toHaveLength(1);
   expect(texts[0]).toMatchObject({text:`+${r.players.get('a')!.xp} XP`,x:r.match.player.position.x,y:r.match.player.position.y-XP_FEEDBACK.offsetY,size:16,outline:true});
   const moved=r.match.player.position.add(new Vec2(160,80));r.match.player.position=moved;
   fx.update(.1,r.match,new Camera());
   expect(texts[0].x).toBe(moved.x);expect(texts[0].y).toBeCloseTo(moved.y-XP_FEEDBACK.offsetY-2.5);
   for(const event of xp)expect(cuesForEvent(event,'a')).toEqual([]);
   const camera=new Camera();fx.update(XP_FEEDBACK.life+.1,r.match,camera);
   expect(fx.texts.filter(t=>t.pixel)).toHaveLength(0);
   events.length=0;r.encounter.onMinionKilled(r.match,enemy,true);
   expect(events.filter(e=>e.type==='reward_taken'&&e.reward==='xp')).toHaveLength(0);
  }
 });
 it('soglia esatta del 70%: 0,6999 genera oro, 0,7 non lo genera; XP in entrambi i casi',()=>{
  const r=run();kill(r,.6999);expect(r.encounter.pickups).toHaveLength(1);kill(r,.7);expect(r.encounter.pickups).toHaveLength(1);
  r.syncProgress();expect(r.players.get('a')!.xp).toBe(8);expect(r.players.get('b')!.xp).toBe(8);expect(r.players.get('a')!.gold).toBe(0);
 });
 it('oro assorbito: testo grande nello stesso font, una volta sola e solo per il destinatario',()=>{
  const r=run(),events:GameEvent[]=[];r.match.events.connect(e=>events.push(e));kill(r,0);events.length=0;
  r.encounter.step(.5,r.match);expect(events.filter(e=>e.type==='reward_taken'&&e.reward==='gold')).toHaveLength(0);
  r.encounter.step(.4,r.match);r.encounter.step(1,r.match);
  const gold=events.filter(e=>e.type==='reward_taken'&&e.reward==='gold');expect(gold).toHaveLength(2);
  const fx=new Effects();for(const event of gold)fx.handle(event,'a');
  expect(fx.texts).toHaveLength(1);expect(fx.texts[0]).toMatchObject({text:'+3 oro',size:16,pixel:true,outline:true,attachment:{owner:'a'}});
  expect(fx.particles).toHaveLength(0);expect(fx.waves).toHaveLength(0);
  for(const event of gold)expect(cuesForEvent(event,'a')).toEqual([]);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const decoded=decoder.decode(JSON.parse(JSON.stringify(encoder.encode(snapshotOf(r.match,'gold-text',gold,{})))) as SnapshotFrame);
  const remote=new Effects();for(const event of decoded.events)remote.handle(event,'b');expect(remote.texts[0].text).toBe('+3 oro');
  r.match.players.get('a')!.position=new Vec2(700,600);fx.update(.1,r.match,new Camera());expect(fx.texts[0].x).toBe(700);
 });
 it('oro emesso per mezzo secondo e assorbito dopo il volo anche da lontano, senza doppioni',()=>{
  const r=run();kill(r,0);r.match.player.position=new Vec2(900,700);r.match.players.get('b')!.position=new Vec2(700,900);
  r.encounter.step(.499,r.match);r.syncProgress();expect(r.players.get('a')!.gold).toBe(0);
  r.encounter.step(.001,r.match);r.syncProgress();expect(r.players.get('a')!.gold).toBe(0);
  r.encounter.step(MOB_REWARDS.flightSeconds-.001,r.match);r.syncProgress();expect(r.players.get('a')!.gold).toBe(0);
  r.encounter.step(.001,r.match);r.syncProgress();expect(r.players.get('a')!.gold).toBe(3);expect(r.players.get('b')!.gold).toBe(3);
  r.encounter.step(10,r.match);r.view();r.view();r.match.end(false);r.advance();
  expect(r.players.get('a')!.gold).toBe(3);expect(r.players.get('b')!.gold).toBe(3);expect(r.players.get('a')!.xp).toBe(4);
 });
 it('il cambio stanza conserva una consegna ancora in volo, ma un KO non incassa',()=>{
  const r=run();kill(r,0);r.match.players.get('b')!.health.current=0;r.match.end(true);r.advance();
  expect(r.players.get('a')!.gold).toBe(3);expect(r.players.get('b')!.gold).toBe(0);
 });
 it('il codec conserva l’età del volo e la quota raccolta di ogni giocatore',()=>{
  const r=run(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();kill(r,0);
  r.encounter.step(.6,r.match);
  const first=decoder.decode(JSON.parse(JSON.stringify(encoder.encode(snapshotOf(r.match,'gold',[],{}, {run:r.view(),room:r.roomView()})))) as SnapshotFrame);
  expect(first.room!.pickups[0].age).toBeCloseTo(.6);expect(first.room!.pickups[0].takenBy).toEqual([]);
  r.encounter.step(.3,r.match);
  const second=decoder.decode(JSON.parse(JSON.stringify(encoder.encode(snapshotOf(r.match,'gold',[],{}, {run:r.view(),room:r.roomView()})))) as SnapshotFrame);
  expect(second.room!.pickups[0].takenBy).toEqual(['a','b']);
 });
 it('nessuna raccolta da morto, né premi per despawn o autoesplosione',()=>{
  const r=run(),m=kill(r,0);r.match.player.position=m.position;r.match.player.health.current=0;r.encounter.step(1,r.match);
  r.encounter.onMinionKilled(r.match,m,true);r.syncProgress();expect(r.players.get('a')!.gold).toBe(0);expect(r.players.get('a')!.xp).toBe(4);
 });
 it('XP e quantità oro crescono con il pericolo; il livello aumenta subito senza curare il personaggio',()=>{
  let xp=0,gold=0;for(const dungeon of ['crypt','swamp','forge','glacier']){const reward=mobReward(dungeon);expect(reward.xp).toBeGreaterThan(xp);expect(reward.gold).toBeGreaterThan(gold);xp=reward.xp;gold=reward.gold;}
  const r=run(),p=r.match.player,hp=p.health.max,mp=p.maxMana;p.health.current=50;kill(r,1);expect(p.health.max).toBe(hp+3);expect(p.maxMana).toBe(mp+2);expect(p.health.current).toBe(50);
 });
 it('il codec trasporta un level-up nella stessa stanza, con HP/MP e statistiche della replica coerenti',()=>{
  const r=run(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.decode(encoder.encode(snapshotOf(r.match,'battle',[],{}, {run:r.view(),room:r.roomView()})));
  const replica=replicaMatch(r.dungeon,first.setup,[{id:'a',loadout:[]},{id:'b',loadout:[]}]);applySnapshot(replica,first);
  kill(r,0);const second=decoder.decode(encoder.encode(snapshotOf(r.match,'battle',[],{}, {run:r.view(),room:r.roomView()})));applySnapshot(replica,second);
  expect(replica.player.totalXp).toBe(100);expect(replica.player.health.max).toBe(r.match.player.health.max);expect(replica.player.maxMana).toBe(r.match.player.maxMana);expect(replica.player.stats).toEqual(r.match.player.stats);
 });
});
