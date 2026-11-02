import {it,expect,vi,afterEach} from 'vitest';
import {PartyClient} from './party-client';
import {Character} from '../character/character';
import {serializeCharacter} from '../character/save-format';
import {PartyRoom} from './party-room';
import {MemoryStore} from '../character/save-store';
class FakeSocket {
 static OPEN=1;static instances:FakeSocket[]=[];readyState=1;
 listeners=new Map<string,((event:{data?:unknown})=>void)[]>();
 constructor(_url:URL){FakeSocket.instances.push(this);}
 addEventListener(type:string,listener:(event:{data?:unknown})=>void){this.listeners.set(type,[...(this.listeners.get(type)??[]),listener]);}
 send(_text:string){}close(){this.emit('close');}
 emit(type:string,data?:unknown){for(const listener of this.listeners.get(type)??[])listener({data});}
}
afterEach(()=>vi.unstubAllGlobals());
it('messaggi da un vecchio socket non applicano scambi al profilo selezionato dopo l’uscita',()=>{
 vi.stubGlobal('WebSocket',FakeSocket);vi.stubGlobal('location',{href:'http://localhost/',protocol:'http:'});vi.stubGlobal('window',{localStorage:new MemoryStore(),setInterval:()=>1,clearInterval:()=>{}});
 const client=new PartyClient(()=>{},()=>{},()=>{},()=>{}),commit=vi.fn(()=>null);client.tradeCommit=commit;
 client.connect(Character.createStarter(),undefined,'c1');const socket=FakeSocket.instances.at(-1)!;socket.emit('open');client.leave();
 socket.emit('message',JSON.stringify({type:'trade_committed',delta:{id:'old',remove:[],receive:[]}}));expect(commit).not.toHaveBeenCalled();expect(client.tradeSaving).toBe(false);
});

it('il widget riceve entrambi i membri dopo l’accettazione e si riallinea anche dalla presenza periodica',()=>{
 vi.stubGlobal('WebSocket',FakeSocket);vi.stubGlobal('location',{href:'http://localhost/',protocol:'http:'});vi.stubGlobal('window',{localStorage:new MemoryStore(),setInterval:()=>1,clearInterval:()=>{}});
 const c=Character.createStarter();c.completeCreation('Alfa','male','mage');const room=new PartyRoom('test');room.enter('a',serializeCharacter(c));room.enter('b',serializeCharacter(c),true);
 const changed=vi.fn(),client=new PartyClient(changed,()=>{},()=>{},()=>{});client.connect(c);const socket=FakeSocket.instances.at(-1)!;
 const initial=room.state();socket.emit('message',JSON.stringify({type:'party',playerId:'a',state:initial}));
 room.hub.invite('a','b');room.hub.accept('b',true);socket.emit('message',JSON.stringify({type:'party',playerId:'a',state:room.state()}));expect(client.state!.members.map(m=>m.id)).toEqual(['a','b']);
 client.state=initial;changed.mockClear();socket.emit('message',JSON.stringify({type:'hub',state:room.hub.view('a')}));expect(client.state.members.map(m=>m.id)).toEqual(['a','b']);expect(changed).toHaveBeenCalled();client.leave();
});
