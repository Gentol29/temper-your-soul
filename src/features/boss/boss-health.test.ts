import { bossForParty } from '../combat/party-health';
import { DungeonRoom } from '../network/dungeon-room';
import { Character } from '../character/character';
import { MINIONS } from '../minions/minion-catalog';
import { Vec2 } from '../../core/vec2';
import { setupOf, snapshotOf, replicaMatch, applySnapshot } from '../network/protocol';
import { expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { DUNGEONS } from '../dungeons/dungeons';
import { Match } from '../match/match';
it('triplica gli HP di tutti i boss finali e conserva +50% per membro aggiuntivo',()=>{
  const original:Readonly<Record<string,number>>={crypt:1800,swamp:2400,forge:3000,glacier:3600};
  for(const dungeon of DUNGEONS){
    const solo=original[dungeon.id]*3;expect(dungeon.boss.stats.maxHealth,dungeon.id).toBe(solo);
    for(const size of [1,2,4]){
      const members=Array.from({length:size},(_,i)=>({id:`player-${i}`,loadout:[]}));
      const match=new Match({rng:new SeededRng(1),dungeon,loadout:[],members,boss:bossForParty(dungeon.boss,size)});
      expect(match.boss!.health.max,`${dungeon.id} / ${size}`).toBe(solo*(1+(size-1)*0.5));
    }
  }
});

it('il Duello cooperativo usa realmente gli HP scalati; i servitori e la replica non duplicano il moltiplicatore',()=>{
  const room=new DungeonRoom('health-check');room.mode='duel';
  for(const id of ['one','two']){
    const character=Character.createStarter('mage');character.completeCreation(`Prova ${id}`,'male','mage');
    character.records.crypt={clears:1,bestTimeSeconds:60};
    room.enter(id,character);}
  room.start('health-check',1);const match=room.match!;
  expect(match.boss!.health.max).toBe(8100);
  const definition=Object.values(MINIONS).find(m=>!m.dormant && !m.burrow)!;
  const minion=match.spawnMinion(definition,new Vec2(500,500),{maxHealth:100});expect(minion.health.max).toBe(150);
  const members=[...match.players].map(([id,p])=>({id,loadout:p.baseLoadout,characterClass:p.characterClass}));
  const replica=replicaMatch(match.dungeon,setupOf(match),members);
  applySnapshot(replica,snapshotOf(match,'health-check',[],{}));
  expect(replica.boss!.health.max).toBe(8100);expect(replica.minions[0].health.max).toBe(150);
});
