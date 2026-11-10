import {expect,it} from 'vitest';
import {Character} from '../character/character';
import {PublicWorld} from './public-world';
import {SOCIAL_PARTY} from './social-party';

function world(){const world=new PublicWorld();for(const id of ['a','b','c','d','e']){const c=Character.createStarter();c.completeCreation('Eroe '+id,'male','mage');world.enter(id,c);}return world;}
it('l’invito richiede il consenso del destinatario e lascia tutti nel medesimo HUB',()=>{
 const w=world();w.parties.invite('a','b',0);const invitation=w.parties.view('b',0).invitations[0]!;
 expect(w.parties.view('a',0).members).toHaveLength(0);
 expect(()=>w.parties.answer('c',invitation.id,true,0)).toThrow();
 w.parties.answer('b',invitation.id,true,0);
 expect(w.parties.view('a',0).members.map(m=>m.id)).toEqual(['a','b']);
 expect(w.parties.view('b',0).members.map(m=>m.id)).toEqual(['a','b']);
 expect(w.hub.positions.size).toBe(5);expect(w.instances.size).toBe(0);
});
it('rifiuto, inviti duplicati e scadenza non creano gruppi',()=>{
 const w=world();w.parties.invite('a','b',0);expect(()=>w.parties.invite('a','b',1)).toThrow('già inviato');
 let invite=w.parties.view('b',1).invitations[0]!;w.parties.answer('b',invite.id,false,2);expect(w.parties.view('a',2).outgoing).toEqual([]);
 w.parties.invite('a','b',3);invite=w.parties.view('b',3).invitations[0]!;
 expect(()=>w.parties.answer('b',invite.id,true,3+SOCIAL_PARTY.invitationMs)).toThrow('scaduto');
 expect(w.parties.view('a',3+SOCIAL_PARTY.invitationMs).members).toEqual([]);
});
it('il limite viene ricontrollato alla conferma di inviti concorrenti',()=>{
 const w=world();for(const id of ['b','c','d','e'])w.parties.invite('a',id,0);
 for(const id of ['b','c','d'])w.parties.answer(id,w.parties.view(id,0).invitations[0]!.id,true,0);
 expect(()=>w.parties.answer('e',w.parties.view('e',0).invitations[0]!.id,true,0)).toThrow('pieno');
 expect(w.parties.view('a',0).members).toHaveLength(4);
});
it('lasciare il party mantiene la connessione; una disconnessione ripulisce membri e inviti',()=>{
 const w=world();w.parties.invite('a','b',0);w.parties.answer('b',w.parties.view('b',0).invitations[0]!.id,true,0);
 w.parties.leave('b');expect(w.characters.has('b')).toBe(true);expect(w.parties.view('a',0).members).toEqual([]);
 w.parties.invite('a','b',0);w.parties.answer('b',w.parties.view('b',0).invitations[0]!.id,true,0);w.parties.invite('b','c',0);
 w.leave('b');expect(w.parties.view('a',0).members).toEqual([]);expect(w.parties.view('c',0).invitations).toEqual([]);expect(w.hub.positions.has('a')).toBe(true);
});
it('i gruppi persistono passando a un dungeon pubblico e tornando nell’HUB',()=>{
 const w=world();w.parties.invite('a','b',0);w.parties.answer('b',w.parties.view('b',0).invitations[0]!.id,true,0);
 w.start('a','crypt','descent','battle',42);w.returnToHub('a');expect(w.parties.view('a',0).members).toHaveLength(2);expect(w.characters.size).toBe(5);
});
