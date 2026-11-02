import {describe,it,expect} from 'vitest';
import {Character} from '../character/character';
import {serializeCharacter,deserializeCharacter} from '../character/save-format';
import {PartyRoom} from './party-room';
import {Vec2} from '../../core/vec2';
import {applyTradeDelta} from '../character/trade-transfer';
function hero(name:string){const c=Character.createStarter();c.completeCreation(name,'male','mage');c.addRolls([{familyId:'arcane_staff',rarity:'rare'}]);return c;}
function setup(){const room=new PartyRoom('hub-test');room.enter('a',serializeCharacter(hero('Alfa')));room.enter('b',serializeCharacter(hero('Beta')),true);return room;}
function openTrade(r:PartyRoom,a:string,b:string){r.hub.request(a,b);r.hub.acceptTrade(b,r.hub.tradeFor(a)!.id,true);}
describe('hub cooperativo',()=>{
 it('visitatori distinti dal party, invito accettato e capienza del gruppo',()=>{
  const r=setup();expect(r.state().members.map(m=>m.id)).toEqual(['a']);expect(r.state().visitors!.map(m=>m.id)).toEqual(['b']);
  r.hub.invite('a','b');r.hub.accept('b',true);expect(r.state().members.map(m=>m.id)).toEqual(['a','b']);
  r.enter('c',serializeCharacter(hero('Gamma')));r.enter('d',serializeCharacter(hero('Delta')));r.enter('e',serializeCharacter(hero('Epsilon')),true);
  r.hub.positions.get('e')!.position=r.hub.positions.get('a')!.position;r.hub.invite('a','e');expect(()=>r.hub.accept('e',true)).toThrow('completo');
 });
 it('movimento autorevole, collisioni e scadenza dell’input',()=>{
  const r=setup(),p=r.hub.positions.get('a')!;p.position=new Vec2(270,540);r.hub.inputs.set('a',{move:new Vec2(0,-1),at:0});
  for(let i=0;i<120;i++)r.tick(0);expect(p.position.y).toBeGreaterThanOrEqual(486);const before=p.position;r.tick(1000);expect(p.position).toEqual(before);
 });
 it('il deposito non compare nelle viste pubbliche o nei profili degli altri utenti',()=>{
  const r=setup(),c=r.characters.get('a')!,item=c.inventory.at(-1)!;c.discard(item.uid);c.storage.push(item);c.storagePositions[item.uid]=12;
  const state=r.state(),view=r.hub.view(r.leaderId);expect(deserializeCharacter(state.members[0]!.character)!.storage).toEqual([]);expect(JSON.parse(view.players[0]!.character).storedUids).toEqual([]);
  expect(c.storage).toHaveLength(1);expect(r.characters.get('b')!.storage).toHaveLength(0);
 });
 it('i visitatori continuano a usare l’hub e a scambiare mentre il party è in dungeon',()=>{
  const r=setup();r.enter('c',serializeCharacter(hero('Gamma')),true);r.hub.positions.get('c')!.position=r.hub.positions.get('b')!.position;
  openTrade(r,'b','c');r.ready.add('a');r.start('a','battle',1);expect(r.playing).toBe(true);r.hub.offer('b',[r.characters.get('b')!.inventory.at(-1)!.uid]);expect(r.hub.views()).toHaveLength(1);expect(()=>r.hub.request('a','b')).toThrow('rifugio');
 });
 it('solo gli invitati nel gruppo partono, mentre i visitatori restano nell’hub',()=>{
  const r=setup();r.ready.add('a');r.start('a','battle',10);expect([...r.match!.players.keys()]).toEqual(['a']);expect(r.hub.view('a').players.map(p=>p.id)).toEqual(['b']);expect(()=>r.start('b','other',1)).toThrow('leader');
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
  for(const items of [['missing'],[uid,uid],[c.equipped.primary_hand!]])expect(()=>r.hub.offer('a',items)).toThrow();expect(()=>r.hub.requireFree('a')).toThrow();r.ready.add('a');expect(()=>r.start('a','battle',1)).toThrow('scambi');
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


describe('sessione HUB indipendente dal party',()=>{
 it('lasciare il party conserva stanza, proprietario, posizione e personaggio',()=>{
  const r=setup();r.hub.invite('a','b');r.hub.accept('b',true);const character=r.characters.get('a'),position=r.hub.positions.get('a');
  r.leaveParty('a');expect(r.ownerId).toBe('a');expect(r.leaderId).toBe('b');expect(r.characters.get('a')).toBe(character);expect(r.hub.positions.get('a')).toBe(position);expect(r.state().visitors!.map(p=>p.id)).toContain('a');
  r.leaveParty('b');expect(r.state().members).toEqual([]);expect(r.leaderId).toBe('');r.createParty('b');expect(r.leaderId).toBe('b');expect(r.ownerId).toBe('a');
 });
 it('menu e run in singolo rendono assenti dal mondo ma conservano istanza e gruppo',()=>{
  const r=setup();r.ready.add('a');r.setPresence('a',false);expect(r.characters.size).toBe(2);expect(r.ownerId).toBe('a');expect(r.hub.members.has('a')).toBe(true);expect(r.ready.has('a')).toBe(false);expect(r.hub.view(r.ownerId).players.find(p=>p.id==='a')!.present).toBe(false);
  expect(()=>r.hub.request('b','a')).toThrow('Avvicinati');r.setPresence('a',true);expect(r.hub.view(r.ownerId).players.find(p=>p.id==='a')!.present).toBe(true);r.enter('c',serializeCharacter(hero('Gamma')),true);expect(r.code).toBe('hub-test');
 });
 it('il portale attende gli altri pronti e porta solo il party nella destinazione scelta',()=>{
  const r=setup();r.hub.invite('a','b');r.hub.accept('b',true);expect(()=>r.startFromPortal('a','crypt','descent','raid',1)).toThrow('pronti');
  r.ready.add('b');r.setPresence('b',false);expect(()=>r.startFromPortal('a','crypt','descent','raid',1)).toThrow('presenti');r.setPresence('b',true);r.ready.add('b');r.startFromPortal('a','crypt','descent','raid',1);expect([...r.match!.players.keys()]).toEqual(['a','b']);expect(r.playing).toBe(true);
 });
 it('uscire dal gruppo durante il raid non espelle dall’HUB e non chiude il raid degli altri',()=>{
  const r=setup();r.hub.invite('a','b');r.hub.accept('b',true);r.ready.add('b');r.startFromPortal('a','crypt','descent','raid',1);r.leaveParty('b');expect(r.characters.has('b')).toBe(true);expect(r.hub.positions.has('b')).toBe(true);expect(r.hub.members.has('b')).toBe(false);expect(r.playing).toBe(true);expect(r.run!.view().status).toBe('playing');
 });
 it('un visitatore che disconnette il proprietario non viene aggiunto al party automaticamente',()=>{
  const r=setup();r.leave('a');expect(r.ownerId).toBe('b');expect(r.leaderId).toBe('');expect(r.hub.members.size).toBe(0);expect(r.characters.has('b')).toBe(true);
 });
});
