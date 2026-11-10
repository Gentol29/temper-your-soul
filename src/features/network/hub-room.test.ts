import {describe,it,expect} from 'vitest';
import {Character} from '../character/character';
import {serializeCharacter,deserializeCharacter} from '../character/save-format';
import {PublicWorld} from './public-world';
import {HUB_NETWORK} from './hub-protocol';
import {HubState, hubApproachPoint, hubBlocked} from '../character/hub-state';
import {Vec2} from '../../core/vec2';
import {applyTradeDelta} from '../character/trade-transfer';
function hero(name:string){const c=Character.createStarter();c.completeCreation(name,'male','mage');c.addRolls([{familyId:'arcane_staff',rarity:'rare'}]);return c;}
function setup(){const room=new PublicWorld();room.enter('a',hero('Alfa'));room.enter('b',hero('Beta'));return room;}
function openTrade(r:PublicWorld,a:string,b:string){r.hub.request(a,b);r.hub.acceptTrade(b,r.hub.tradeFor(a)!.id,true);}
describe('hub cooperativo',()=>{
 it('tutte le presenze entrano direttamente nel rifugio globale fino alla capacità configurata',()=>{
  const r=setup();for(let i=2;i<HUB_NETWORK.capacity;i++)r.enter('visitor-'+i,hero('Visita'+i));
  expect(r.hub.view('').players).toHaveLength(HUB_NETWORK.capacity);expect(()=>r.enter('full',hero('Pieno'))).toThrow('pieno');
 });
 it('movimento autorevole, collisioni e scadenza dell’input',()=>{
  const r=setup(),p=r.hub.positions.get('a')!;p.position=hubApproachPoint('merchant').add(new Vec2(0,5));r.hub.inputs.set('a',{move:new Vec2(-1,0),at:0});
  for(let i=0;i<120;i++)r.tick(0);expect(hubBlocked(p.position)).toBe(false);expect(p.position.x).toBeGreaterThan(370);expect(p.nearest()?.id).toBe('merchant');const before=p.position;r.tick(1000);expect(p.position).toEqual(before);
 });
 it('tutti i visitatori nascono sul selciato e client e server si fermano sugli stessi bordi',()=>{
  const r=setup();for(let i=2;i<HUB_NETWORK.capacity;i++)r.enter('visitor-'+i,hero('Visita'+i));
  for(const p of r.hub.positions.values())expect(hubBlocked(p.position)).toBe(false);
  const local=new HubState(),remote=r.hub.positions.get('a')!;
  for(const move of [new Vec2(0,-1),new Vec2(-1,0),new Vec2(-1,1),new Vec2(1,1),new Vec2(1,-1)]){
   r.hub.inputs.set('a',{move,at:0});
   for(let i=0;i<180;i++){local.step(1/60,move);r.tick(0);expect(remote.position).toEqual(local.position);expect(hubBlocked(remote.position)).toBe(false);}
  }
 });
 it('il deposito non compare nelle viste pubbliche o nei profili degli altri utenti',()=>{
  const r=setup(),c=r.characters.get('a')!,item=c.inventory.at(-1)!;c.discard(item.uid);c.storage.push(item);c.storagePositions[item.uid]=12;
  const view=r.hub.view('');expect(deserializeCharacter(view.players[0]!.character)!.storage).toEqual([]);expect(JSON.parse(view.players[0]!.character).storedUids).toEqual([]);
  expect(c.storage).toHaveLength(1);expect(r.characters.get('b')!.storage).toHaveLength(0);
 });
 it('l’HUB e gli scambi continuano mentre altri sono in dungeon',()=>{
  const r=setup();r.enter('c',hero('Gamma'));r.hub.positions.get('c')!.position=r.hub.positions.get('b')!.position;
  openTrade(r,'b','c');const room=r.start('a','crypt','descent','battle',1);expect(room.playing).toBe(true);r.hub.offer('b',[r.characters.get('b')!.inventory.at(-1)!.uid]);expect(r.hub.views()).toHaveLength(1);expect(()=>r.hub.request('a','b')).toThrow();
 });
 it('il portale muove soltanto chi lo attraversa e gli altri restano nel rifugio',()=>{
  const r=setup(),room=r.start('a','crypt','descent','battle',10);expect([...room.match!.players.keys()]).toEqual(['a']);expect(r.hub.view('').players.filter(p=>p.present).map(p=>p.id)).toEqual(['b']);
 });
});

describe('scambi a doppia conferma',()=>{
 it('conferma di entrambi richiesta e trasferimento con nuovi uid senza perdere rarità/livello/migliorie',()=>{
  const r=setup(),a=r.characters.get('a')!,b=r.characters.get('b')!,ai=a.inventory.at(-1)!,bi=b.inventory.at(-1)!;a.inventory[a.inventory.indexOf(ai)]={...ai,upgrade:3,level:7};
  openTrade(r,'a','b');r.hub.offer('a',[ai.uid]);r.hub.offer('b',[bi.uid]);const rev=r.hub.views()[0]!.revision;
  expect(r.hub.confirm('a',rev)).toBeNull();expect(a.itemByUid(ai.uid)).toBeDefined();const settlement=r.hub.confirm('b',rev)!;
  for(const side of settlement.sides)applyTradeDelta(r.characters.get(side.playerId)!,side.delta);
  expect(b.inventory.at(-1)).toMatchObject({rarity:'rare',upgrade:3,level:7});expect(a.inventory.filter(i=>i.uid===ai.uid)).toHaveLength(0);expect(b.inventory.at(-1)!.uid).not.toBe(ai.uid);
  const loaded=deserializeCharacter(serializeCharacter(b))!;const count=loaded.inventory.length;expect(applyTradeDelta(loaded,settlement.sides[1]!.delta)).toBe(false);expect(loaded.inventory).toHaveLength(count);
 });
 it('cambiare offerta azzera tutte le conferme e rifiuta revisioni vecchie',()=>{
  const r=setup(),uid=r.characters.get('a')!.inventory.at(-1)!.uid;openTrade(r,'a','b');r.hub.offer('a',[uid]);const rev=r.hub.views()[0]!.revision;r.hub.confirm('a',rev);r.hub.offer('b',[]);
  expect(r.hub.views()[0]!.confirmed).toEqual([]);expect(()=>r.hub.confirm('b',rev)).toThrow('cambiata');
 });
 it('rifiuta oggetti inesistenti, duplicati, equipaggiati e modifiche concorrenti del personaggio',()=>{
  const r=setup();openTrade(r,'a','b');const c=r.characters.get('a')!,uid=c.inventory.at(-1)!.uid;
  for(const items of [['missing'],[uid,uid],[c.equipped.primary_hand!]])expect(()=>r.hub.offer('a',items)).toThrow();expect(()=>r.hub.requireFree('a')).toThrow();expect(()=>r.start('a','crypt','descent','battle',1)).toThrow('scambi');
 });
 it('annullamento o disconnessione prima del completamento non trasferiscono nulla',()=>{
  const r=setup(),before=serializeCharacter(r.characters.get('a')!);openTrade(r,'a','b');r.hub.offer('a',[r.characters.get('a')!.inventory.at(-1)!.uid]);r.hub.cancel('b');expect(r.hub.views()).toEqual([]);expect(serializeCharacter(r.characters.get('a')!)).toBe(before);
  openTrade(r,'a','b');r.leave('b');expect(r.hub.views()).toEqual([]);expect(serializeCharacter(r.characters.get('a')!)).toBe(before);
 });
 it('richiede prossimità e impedisce lo scambio con se stessi o due scambi simultanei',()=>{
  const r=setup();expect(()=>r.hub.request('a','a')).toThrow();r.hub.positions.get('b')!.position=new Vec2(750,400);expect(()=>r.hub.request('a','b')).toThrow('Avvicinati');r.hub.positions.get('b')!.position=r.hub.positions.get('a')!.position;openTrade(r,'a','b');expect(()=>r.hub.request('b','a')).toThrow();
 });
 it('un inventario svuotato da uno scambio rimane vuoto dopo il riavvio, senza ricreare oggetti iniziali',()=>{
  const c=hero('Vuoto');for(const slot of ['primary_hand','secondary_hand','armor','boots'] as const)c.unequip(slot);applyTradeDelta(c,{id:'empty',remove:c.inventory.map(i=>i.uid),receive:[]});const loaded=deserializeCharacter(serializeCharacter(c))!;expect(loaded.inventory).toEqual([]);expect(loaded.tradeReceipts).toEqual(['empty']);
 });
});

it('lo scambio richiede il consenso del destinatario prima di aprire offerte o conferme',()=>{
 const r=setup();r.hub.request('a','b');const request=r.hub.view('a').requests![0]!;
 expect(r.hub.views()).toEqual([]);expect(request).toMatchObject({from:'a',to:'b'});
 expect(()=>r.hub.offer('a',[])).toThrow();expect(()=>r.hub.confirm('a',0)).toThrow();
 expect(()=>r.hub.acceptTrade('a',request.id,true)).toThrow();
 r.hub.acceptTrade('b',request.id,false);expect(r.hub.tradeFor('a')).toBeUndefined();
 r.hub.request('a','b');r.hub.acceptTrade('b',r.hub.view('b').requests![0]!.id,true);expect(r.hub.views()).toHaveLength(1);expect(r.hub.view('a').requests).toEqual([]);
});


describe('sessione HUB indipendente dai dungeon',()=>{
 it('il ritorno conserva personaggio e posizione senza chiudere la sessione',()=>{
  const r=setup(),character=r.characters.get('a'),position=r.hub.positions.get('a');r.start('a','crypt','descent','raid',1);r.returnToHub('a');
  expect(r.characters.get('a')).toBe(character);expect(r.hub.positions.get('a')).toBe(position);expect(r.hub.present.get('a')).toBe(true);
 });
 it('il menu nasconde la presenza e vieta le interazioni fino al ritorno',()=>{
  const r=setup();r.hub.setPresence('a',false);expect(r.characters.size).toBe(2);expect(r.hub.view('').players.find(p=>p.id==='a')!.present).toBe(false);
  expect(()=>r.hub.request('b','a')).toThrow('Avvicinati');r.hub.setPresence('a',true);expect(r.hub.view('').players.find(p=>p.id==='a')!.present).toBe(true);
 });
 it('ogni accesso al portale è immediato e unisce i giocatori nell’istanza pubblica',()=>{
  const r=setup(),room=r.start('a','crypt','descent','raid',1);r.start('b','crypt','descent','other',2);expect([...room.match!.players.keys()]).toEqual(['a','b']);expect(room.playing).toBe(true);
 });
 it('uscire dal raid non espelle dal mondo e non interrompe gli altri',()=>{
  const r=setup(),room=r.start('a','crypt','descent','raid',1);r.start('b','crypt','descent','other',2);r.returnToHub('b');expect(r.characters.has('b')).toBe(true);expect(r.hub.positions.has('b')).toBe(true);expect(room.match!.players.has('b')).toBe(false);expect(room.playing).toBe(true);
 });
 it('la disconnessione del primo arrivato non cambia la presenza degli altri',()=>{
  const r=setup();r.leave('a');expect(r.characters.has('b')).toBe(true);expect(r.hub.present.get('b')).toBe(true);expect(r.id).toBe('HUB');
 });
});
