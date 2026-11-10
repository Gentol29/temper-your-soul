/**
 * Fixture sintetiche, nessun salvataggio modificato. Duello: 40 secondi, quattro giocatori invulnerabili e boss in furia.
 * Discesa: 40 secondi in una stanza di scontro del ghiacciaio a meta' discesa, quattro giocatori fermi e invulnerabili,
 * ondate piene di servitori ed eventi veri nello snapshot (come li invia il server).
 */
import { performance } from 'node:perf_hooks';
import { SeededRng } from '../src/core/rng';
import { Match } from '../src/features/match/match';
import type { GameEvent } from '../src/features/combat/events';
import { GLACIER } from '../src/features/dungeons/glacier/glacier';
import { MAGE_SKILLS } from '../src/features/skills/mage-skills';
import { RoomEncounter } from '../src/features/run/encounter';
import { roomArena, ROOM_TEMPLATES } from '../src/features/run/room-templates';
import { snapshotOf, parseWire, applySnapshot, type BattleSnapshot } from '../src/features/network/protocol';
import { SnapshotEncoder, SnapshotDecoder } from '../src/features/network/snapshot-codec';
import { PublicWorld } from '../src/features/network/public-world';
import { HubEncoder, HubDecoder } from '../src/features/network/hub-codec';
import { Character } from '../src/features/character/character';
import { Vec2 } from '../src/core/vec2';
const options={rng:new SeededRng(10),dungeon:GLACIER,loadout:MAGE_SKILLS,members:['a','b','c','d'].map(id=>({id,loadout:MAGE_SKILLS}))};
const match=new Match(options),replica=new Match(options);match.boss!.health.current=match.boss!.health.max*.49;
for(const p of match.players.values())p.invulnerableFor=10000;
const snapshots:BattleSnapshot[]=[];for(let i=0;i<2400;i++){match.stepParty(1/60,new Map());if(i%2===1)snapshots.push(snapshotOf(match,'stress',[],{}));}
const full=snapshots.map(s=>JSON.stringify({type:'snapshot',snapshot:s}));
const encoder=new SnapshotEncoder();const compact=snapshots.map(s=>JSON.stringify(encoder.encode(s)));
let start=performance.now();for(const text of full){const m=parseWire(text) as {snapshot:BattleSnapshot};applySnapshot(replica,m.snapshot);}const legacyMs=performance.now()-start;
const decoder=new SnapshotDecoder();start=performance.now();for(const text of compact)applySnapshot(replica,decoder.decode(JSON.parse(text)));const compactMs=performance.now()-start;
const bytes=(texts:string[])=>texts.reduce((n,s)=>n+Buffer.byteLength(s),0);
const duel={snapshots:snapshots.length,maxProjectiles:Math.max(...snapshots.map(s=>s.projectiles.length)),fullBytes:bytes(full),compactBytes:bytes(compact),reductionPercent:(1-bytes(compact)/bytes(full))*100,legacyDecodeApplyMs:legacyMs,compactDecodeApplyMs:compactMs};

const ids=['a','b','c','d'],template=ROOM_TEMPLATES.glacier!.find(t=>t.use==='combat')!,arena=roomArena(template,GLACIER.arena.theme);
const encounter=new RoomEncounter({dungeonId:'glacier',option:{kind:'combat',reward:'temper'},stage:5,template,exits:2,grade:0,seen:new Set(),
  members:new Map(ids.map(id=>[id,{loadout:MAGE_SKILLS,tempers:[],offers:3,secondLife:false}]))});
const roomOptions={rng:new SeededRng(10),dungeon:GLACIER,loadout:MAGE_SKILLS,arena,boss:null,members:ids.map(id=>({id,loadout:MAGE_SKILLS}))};
const room=new Match({...roomOptions,encounter}),roomReplica=new Match({...roomOptions,rng:new SeededRng(10)});
let events:GameEvent[]=[];room.events.connect(event=>events.push(event));
const roomSnapshots:BattleSnapshot[]=[];
for(let i=0;i<2400;i++){for(const p of room.players.values())p.invulnerableFor=1;room.stepParty(1/60,new Map());if(i%2===1){roomSnapshots.push(snapshotOf(room,'descent',events,{},{room:encounter.view()}));events=[];}}
const roomEncoder=new SnapshotEncoder(),roomCompact=roomSnapshots.map(s=>JSON.stringify(roomEncoder.encode(s)));
const roomDecoder=new SnapshotDecoder();start=performance.now();for(const text of roomCompact)applySnapshot(roomReplica,roomDecoder.decode(JSON.parse(text)));const roomMs=performance.now()-start;
const descent={snapshots:roomSnapshots.length,maxMinions:Math.max(...roomSnapshots.map(s=>s.minions.length)),maxProjectiles:Math.max(...roomSnapshots.map(s=>s.projectiles.length)),
  compactBytes:bytes(roomCompact),bytesPerSecond:bytes(roomCompact)/40,decodeApplyMs:roomMs};
const hubs = [32,64].map(players => {
  const world = new PublicWorld(), encoder = new HubEncoder(), decoder = new HubDecoder();
  for (let i=0;i<players;i++) {
    const character = Character.createStarter(); character.completeCreation(`Eroe ${i}`, 'male', 'mage');
    world.enter(String(i),character);
  }
  let fullBytes=0, compactBytes=0;
  const started=performance.now();
  for(let step=0;step<600;step++) {
    const now=step*1000/60;
    for(const id of world.characters.keys())world.hub.inputs.set(id,{move:Vec2.fromAngle(step/120+Number(id)),at:now});
    world.tick(now);
    if(step%2===0){const view=world.hub.view(),frame=encoder.encode(view);fullBytes+=Buffer.byteLength(JSON.stringify(view));const text=JSON.stringify(frame);compactBytes+=Buffer.byteLength(text);decoder.decode(JSON.parse(text));}
  }
  return {players,frames:300,fullBytes,compactBytes,reductionPercent:100*(1-compactBytes/fullBytes),perClientBytesPerSecond:compactBytes/10,encodeDecodeAndSimulationMs:performance.now()-started};
});
console.log(JSON.stringify({duel,descent,hubs}, null, 2));
