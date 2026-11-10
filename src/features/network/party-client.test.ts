import {it,expect,vi,afterEach} from 'vitest';
import {PartyClient} from './party-client';
import {Character} from '../character/character';
import {serializeCharacter} from '../character/save-format';
import {HubEncoder} from './hub-codec';
import {PublicWorld} from './public-world';
class FakeSocket {
 static OPEN=1;static instances:FakeSocket[]=[];readyState=1;
 listeners=new Map<string,((event:{data?:unknown})=>void)[]>();
 constructor(_url:URL){FakeSocket.instances.push(this);}
 addEventListener(type:string,listener:(event:{data?:unknown})=>void){this.listeners.set(type,[...(this.listeners.get(type)??[]),listener]);}
 sent:string[]=[];send(text:string){this.sent.push(text);}close(){this.emit('close');}
 emit(type:string,data?:unknown){for(const listener of this.listeners.get(type)??[])listener({data});}
}
afterEach(()=>vi.unstubAllGlobals());
function setup(){vi.stubGlobal('WebSocket',FakeSocket);vi.stubGlobal('location',{href:'http://localhost/',protocol:'http:'});vi.stubGlobal('window',{setInterval:()=>1,clearInterval:()=>{}});const c=Character.createStarter();c.completeCreation('Eroe','male','mage');const client=new PartyClient(()=>{},()=>{},()=>{},()=>{});client.connect();return{client,c,socket:FakeSocket.instances.at(-1)!};}
it('un socket precedente non può applicare profili dopo la disconnessione',()=>{
 const {client,c,socket}=setup(),changed=vi.fn();client.profileChanged=changed;socket.emit('open');client.leave();socket.emit('message',JSON.stringify({type:'profile',character:serializeCharacter(c),gold:0,revision:1}));expect(changed).not.toHaveBeenCalled();expect(client.profile).toBeNull();
});
it('il login non trasmette inventario, oro o un accountId dichiarato dal browser',()=>{
 const {client,socket}=setup();socket.emit('open');const login=JSON.parse(socket.sent[0]!);expect(login.type).toBe('login');expect(login.character).toBeUndefined();expect(login.identity).toBeUndefined();expect(login.gold).toBeUndefined();client.leave();
});
it('l’accesso parte con il solo token: nome, classe e sesso non precedono l’autenticazione',()=>{
 const {client,socket}=setup();socket.emit('open');const login=JSON.parse(socket.sent[0]!);
 expect(Object.keys(login).sort()).toEqual(['protocol','token','type']);expect(login.creation).toBeUndefined();client.leave();
});
it('senza personaggio il server chiede la creazione: socket chiuso senza errore, poi nuovo accesso con le scelte',()=>{
 vi.stubGlobal('WebSocket',FakeSocket);vi.stubGlobal('location',{href:'http://localhost/',protocol:'http:'});vi.stubGlobal('window',{setInterval:()=>1,clearInterval:()=>{}});
 const error=vi.fn(),disconnected=vi.fn(),client=new PartyClient(()=>{},()=>{},error,disconnected);client.connect();
 const first=FakeSocket.instances.at(-1)!;first.emit('open');first.emit('message',JSON.stringify({type:'character_required'}));
 expect(client.characterRequired).toBe(true);expect(client.lost).toBe(false);expect(client.connecting).toBe(false);expect(client.pendingOperation).toBeNull();
 expect(error).not.toHaveBeenCalled();expect(disconnected).not.toHaveBeenCalled();
 client.connect({name:'Vesna',characterClass:'archer',body:'female'});const second=FakeSocket.instances.at(-1)!;expect(second).not.toBe(first);
 expect(client.pendingOperation).toBe('Creazione del personaggio…');second.emit('open');
 expect(JSON.parse(second.sent[0]!).creation).toEqual({name:'Vesna',characterClass:'archer',body:'female'});
 second.emit('message',JSON.stringify({type:'party',playerId:'a',state:{code:'HUB',dungeonId:'crypt',mode:'descent',grade:0,members:[],playing:false}}));
 expect(client.characterRequired).toBe(false);expect(client.state?.code).toBe('HUB');client.leave();
});
it('una creazione rifiutata lascia sulla creazione; uscire dall’account riparte dall’accesso',()=>{
 const {client,socket}=setup();socket.emit('open');socket.emit('message',JSON.stringify({type:'character_required'}));
 client.connect({name:'Vesna',characterClass:'archer',body:'female'});const retry=FakeSocket.instances.at(-1)!;retry.emit('open');
 retry.emit('message',JSON.stringify({type:'error',message:'Nome o classe non validi.'}));
 expect(client.characterRequired).toBe(true);expect(client.lost).toBe(true);expect(client.state).toBeNull();
 client.leave();expect(client.characterRequired).toBe(false);expect(client.lost).toBe(false);
});
it('Torna al rifugio invia solo il comando, senza inventario e senza chiudere il socket',()=>{
 const {client,socket}=setup();socket.emit('open');const count=socket.sent.length;client.returnToHub();expect(JSON.parse(socket.sent.at(-1)!)).toEqual({type:'return_hub'});client.leave();client.send({type:'return_hub'});expect(socket.sent).toHaveLength(count+1);
});
it('il client decodifica tutte le tuple HUB e applica i profili salvati anche senza RAF',()=>{
 const {client,c,socket}=setup(),world=new PublicWorld(),encoder=new HubEncoder();world.enter('a',c);socket.emit('open');const changed=vi.fn();client.profileChanged=changed;
 socket.emit('message',JSON.stringify(encoder.encode(world.hub.view())));expect(client.hub!.players.map(p=>p.id)).toEqual(['a']);
 socket.emit('message',JSON.stringify({type:'profile',character:serializeCharacter(c),gold:120,revision:2}));expect(changed).toHaveBeenCalledOnce();expect(client.profile!.gold).toBe(120);
 world.leave('a');socket.emit('message',JSON.stringify(encoder.encode(world.hub.view())));expect(client.hub!.players).toEqual([]);client.leave();
});
it('lo stato sociale resta separato dall’istanza e Lascia party non chiude il socket',()=>{
 const {client,socket}=setup();socket.emit('open');
 const state={members:[{id:'a',name:'Eroe',character:''}],invitations:[],outgoing:[]};
 socket.emit('message',JSON.stringify({type:'social_party',state}));expect(client.social).toEqual(state);
 client.send({type:'social_leave'});expect(JSON.parse(socket.sent.at(-1)!)).toEqual({type:'social_leave'});
 expect(client.connecting).toBe(true);expect(client.social.members).toHaveLength(1);client.leave();expect(client.social.members).toHaveLength(0);
});
it('i caricamenti attendono la risposta e terminano anche su errore senza disconnettere il mondo',()=>{
 const {client,c,socket}=setup();socket.emit('open');expect(client.pendingOperation).toBe('Ingresso nel rifugio…');
 socket.emit('message',JSON.stringify({type:'party',playerId:'a',state:{code:'HUB',dungeonId:'crypt',mode:'descent',grade:0,members:[],playing:false}}));
 expect(client.pendingOperation).toBeNull();
 client.send({type:'character_command',command:{kind:'unequip',slot:'primary_hand'}});expect(client.pendingOperation).toBe('Salvataggio…');
 socket.emit('message',JSON.stringify({type:'profile',character:serializeCharacter(c),gold:0,revision:1}));expect(client.pendingOperation).toBeNull();
 client.send({type:'portal_start',dungeonId:'crypt',mode:'descent'});expect(client.pendingOperation).toBe('Ingresso nel dungeon…');
 socket.emit('message',JSON.stringify({type:'error',message:'Portale non disponibile'}));expect(client.pendingOperation).toBeNull();expect(client.state?.code).toBe('HUB');client.leave();
});
