import {measureProcess} from './performance';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {WebSocketServer,WebSocket} from 'ws';
import {Vec2} from '../src/core/vec2';
import {NETWORK,PARTY_MODES,cleanIntent,type ServerMessage,type PartyState,type PartyMode} from '../src/features/network/protocol';
import {SnapshotEncoder} from '../src/features/network/snapshot-codec';
import {HubEncoder} from '../src/features/network/hub-codec';
import {HUB_NETWORK} from '../src/features/network/hub-protocol';
import {TimingWindow} from '../src/features/network/timing-window';
import type {DungeonRoom} from '../src/features/network/dungeon-room';
import type {ProfileSeed} from './storage/profiles';
import {WorldService} from './world-service';
import type {PasswordAuthHttp} from './auth/password-http';

export interface WorldServerOptions {
 service:WorldService; root?:string; loginUrl?:string; allowedOrigins?:readonly string[]; passwordAuth?:PasswordAuthHttp;
}
export function createWorldServer(options:WorldServerOptions) {
const service=options.service,world=service.world,root=resolve(options.root??'dist');
const stepTimings=new TimingWindow(),networkTimings=new TimingWindow(),processMetrics=measureProcess();
let shuttingDown=false;
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 if(options.passwordAuth&&await options.passwordAuth.handle(req,res))return;
 if(req.url==='/online-config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({passwordLogin:Boolean(options.passwordAuth),loginUrl:options.loginUrl??'',protocol:NETWORK.protocolVersion}));return;}
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:!shuttingDown,world:'HUB',simulationHz:60,snapshotHz:30,performance:{...processMetrics.metrics,players:world.characters.size,rooms:world.instances.size+1,step:stepTimings.summary(),network:networkTimings.summary()}}));return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url??'/','http://localhost').pathname));if(path!==root&&!path.startsWith(root+sep))throw new Error('path');const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Non trovato');}
});
// Percorso conservato per i proxy esistenti: nessun codice o invito party.
const sockets=new WebSocketServer({server,path:'/party',maxPayload:24000,perMessageDeflate:false});
interface Connection{id:string;alive:boolean;window:number;messages:number;loggingIn:boolean;hub:HubEncoder;encoder:SnapshotEncoder;room:DungeonRoom|undefined;social?:string}
const clients=new Map<WebSocket,Connection>();
function send(ws:WebSocket,message:ServerMessage):void{if(ws.readyState!==WebSocket.OPEN)return;if(ws.bufferedAmount>=NETWORK.maxBufferedBytes){ws.close(1013,'Connessione troppo lenta');return;}ws.send(JSON.stringify(message));}
function sendProfile(id:string):void{for(const[ws,c]of clients)if(c.id===id&&service.profiles.has(id))send(ws,service.profileMessage(id));}
function publishSocial():void{for(const[ws,c]of clients)if(world.characters.has(c.id)){const state=world.parties.view(c.id,performance.now()),key=JSON.stringify(state);if(key!==c.social){c.social=key;send(ws,{type:'social_party',state});}}}
function publish():void{for(const[ws,c]of clients){if(!service.profiles.has(c.id))continue;const room=world.locations.get(c.id);const state:PartyState=room?room.state():{code:'HUB',dungeonId:'crypt',mode:'descent',grade:0,playing:false,members:[...world.characters].filter(([id])=>id===c.id).map(([id,character])=>({id,name:character.name!,character:world.hub.publicCharacter(id),appearance:character.appearance(),gearScore:character.gearScore}))};if(room!==c.room){c.room=room;c.encoder=new SnapshotEncoder();}send(ws,{type:'party',playerId:c.id,state});}}
function problem(ws:WebSocket,error:unknown):void{send(ws,{type:'error',message:error instanceof Error&&!('code'in error)?error.message:'Salvataggio sul server non riuscito. Riprova.'});publishSocial();}
// Il seme arriva solo con la creazione del personaggio, dopo un accesso che ha risposto `character_required`.
function seedOf(raw:unknown):ProfileSeed|null{if(raw===undefined)return null;if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Dati iniziali non validi.');const m=raw as Record<string,unknown>;if(typeof m.name!=='string'||!['warrior','archer','mage'].includes(String(m.characterClass))||!['male','female'].includes(String(m.body)))throw new Error('Dati iniziali non validi.');return{name:m.name,characterClass:m.characterClass as ProfileSeed['characterClass'],body:m.body as ProfileSeed['body']};}
async function handle(ws:WebSocket,c:Connection,m:Record<string,unknown>):Promise<void>{
 const now=performance.now();
 if(m.type==='ping'&&typeof m.sent==='number'&&Number.isFinite(m.sent)){send(ws,{type:'pong',sent:m.sent});return;}
 if(m.type==='login'){
  if(m.protocol!==NETWORK.protocolVersion)throw new Error('Client e server diversi: ricarica il gioco.');
  if(c.loggingIn||service.profiles.has(c.id))throw new Error('Accesso già in corso.');c.loggingIn=true;
  try{
   const connected=()=>clients.has(ws)&&ws.readyState===WebSocket.OPEN;
   if(m.creation===undefined&&m.characterId===undefined){const roster=await service.characterChoices(m.token,connected);if(roster!==null)send(ws,{type:'character_required',roster});return;}
   if(m.characterId!==undefined&&(typeof m.characterId!=='string'||!/^c[1-9]\d*$/.test(m.characterId)))throw new Error('Personaggio non valido.');
   const outcome=await service.login(c.id,m.token,seedOf(m.creation),connected,m.characterId as string|undefined);
   if(outcome==='disconnected'||!clients.has(ws))return;
   if(outcome==='character_required'){const roster=await service.characterChoices(m.token,connected);if(roster!==null)send(ws,{type:'character_required',roster});return;}
   sendProfile(c.id);publish();publishSocial();
  }finally{c.loggingIn=false;}return;
 }
 if(!service.profiles.has(c.id))throw new Error('Accedi prima con il tuo account.');
 const room=world.locations.get(c.id);
 switch(m.type){
  case'social_invite':if(typeof m.target!=='string')throw new Error('Invito non valido.');world.parties.invite(c.id,m.target,now);publishSocial();return;
  case'social_answer':if(typeof m.id!=='string'||typeof m.accept!=='boolean')throw new Error('Risposta non valida.');world.parties.answer(c.id,m.id,m.accept,now);publishSocial();return;
  case'social_leave':world.parties.leave(c.id);publishSocial();return;
  case'hub_input':{if(room||world.hub.present.get(c.id)===false)return;const move=m.move as Record<string,unknown>|undefined;if(!move||typeof move.x!=='number'||typeof move.y!=='number'||!Number.isFinite(move.x)||!Number.isFinite(move.y))throw new Error('Movimento non valido.');world.hub.inputs.set(c.id,{move:new Vec2(move.x,move.y).normalized(),at:now});return;}
  case'input':{const intent=cleanIntent(m.intent);if(intent&&room?.playing)room.inputs.set(c.id,{intent,receivedAt:now});return;}
  case'character_command':await service.command(c.id,m.command);sendProfile(c.id);publish();return;
  case'return_hub':{const snapshot=room?.snapshot(false);if(snapshot)await service.saveProgress(c.id,snapshot);await service.serial(async()=>{if(clients.has(ws))world.returnToHub(c.id);});sendProfile(c.id);publish();return;}
  case'hub_presence':if(typeof m.present!=='boolean')throw new Error('Presenza non valida.');if(!room)world.hub.setPresence(c.id,m.present);return;
  case'portal_start':if(typeof m.dungeonId!=='string'||!PARTY_MODES.includes(m.mode as PartyMode))throw new Error('Dungeon non valido.');await service.serial(async()=>{if(clients.has(ws))service.start(c.id,m.dungeonId as string,m.mode as PartyMode,randomUUID(),randomBytes(4).readUInt32LE());});publish();return;
  case'temper':if(!room)throw new Error('Entra prima in dungeon.');room.chooseTemper(c.id,m.index);return;
  case'pact':if(!room)throw new Error('Entra prima in dungeon.');room.answerPact(c.id,m.accept);return;
  case'trade_confirm':if(typeof m.revision!=='number'||!Number.isInteger(m.revision))throw new Error('Conferma non valida.');for(const id of await service.trade(c.id,m.revision))sendProfile(id);publish();return;
  case'trade_request':case'trade_accept':case'trade_offer':case'trade_cancel':await service.serial(async()=>{if(world.locations.has(c.id)||!world.characters.has(c.id))throw new Error('Gli scambi si effettuano nel rifugio.');if(m.type==='trade_request'&&typeof m.target==='string')world.hub.request(c.id,m.target);else if(m.type==='trade_accept'&&typeof m.id==='string'&&typeof m.accept==='boolean')world.hub.acceptTrade(c.id,m.id,m.accept);else if(m.type==='trade_offer'&&Array.isArray(m.items)&&m.items.every(v=>typeof v==='string'))world.hub.offer(c.id,m.items);else if(m.type==='trade_cancel')world.hub.cancel(c.id);else throw new Error('Scambio non valido.');});return;
  default:throw new Error('Comando non valido.');
 }
}
sockets.on('connection',(ws,req)=>{
 const allowed=options.allowedOrigins??[],origin=req.headers.origin,host=req.headers.host;
 // Come /auth: la pagina servita da questo stesso host (es. un tunnel appena creato) è sempre ammessa.
 if(shuttingDown||clients.size>=HUB_NETWORK.capacity+16||(origin&&allowed.length&&!allowed.includes(origin)&&origin!==`http://${host}`&&origin!==`https://${host}`)){ws.close(1008,'Connessione non disponibile');return;}
 const c:Connection={id:randomUUID(),alive:true,window:performance.now(),messages:0,loggingIn:false,hub:new HubEncoder(),encoder:new SnapshotEncoder(),room:undefined};clients.set(ws,c);
 ws.on('pong',()=>{c.alive=true;});
 ws.on('message',bytes=>{const now=performance.now();if(now-c.window>1000){c.window=now;c.messages=0;}if(++c.messages>120){ws.close(1008,'Troppi messaggi');return;}try{const raw:unknown=JSON.parse(bytes.toString());if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Messaggio non valido.');void handle(ws,c,raw as Record<string,unknown>).catch(error=>problem(ws,error));}catch(error){problem(ws,error);}});
 ws.on('error',()=>ws.close());
 ws.on('close',()=>{clients.delete(ws);const snapshot=world.locations.get(c.id)?.snapshot(false);void service.leave(c.id,snapshot??undefined).catch(()=>console.error('Salvataggio in uscita non riuscito.'));publish();publishSocial();});
 setTimeout(()=>{if(!service.profiles.has(c.id)&&ws.readyState===WebSocket.OPEN)ws.close(1008,'Accesso scaduto');},15000).unref();
});
let previous=performance.now(),accumulator=0,steps=0;
const completed=new WeakSet<DungeonRoom>(),saving=new Set<DungeonRoom>(),checkpoints=new Set<string>(),retryAt=new WeakMap<DungeonRoom,number>();
const tickTimer=setInterval(()=>{
 const now=performance.now();accumulator+=Math.min((now-previous)/1000,0.25);previous=now;
 while(accumulator>=NETWORK.step){const started=performance.now();world.tick(now);stepTimings.add(performance.now()-started);accumulator-=NETWORK.step;steps++;if(steps%NETWORK.snapshotSteps!==0)continue;
  const networkStart=performance.now(),view=world.hub.view('');
  for(const[ws,c]of clients)if(service.profiles.has(c.id))send(ws,c.hub.encode({...view,trades:view.trades.filter(t=>t.players.includes(c.id)),requests:view.requests?.filter(r=>r.from===c.id||r.to===c.id)}));
  for(const room of world.instances.values()){
   if(completed.has(room)||saving.has(room)||(retryAt.get(room)??0)>now)continue;const snapshot=room.snapshot();if(!snapshot)continue;
   const broadcast=()=>{for(const[ws,c]of clients)if(world.locations.get(c.id)===room)send(ws,c.encoder.encode(snapshot));};
   if(snapshot.status!=='playing'){saving.add(room);void Promise.all([...room.characters.keys()].map(id=>service.saveProgress(id,snapshot))).then(()=>{for(const id of room.characters.keys())sendProfile(id);broadcast();completed.add(room);}).catch(()=>{retryAt.set(room,performance.now()+2000);for(const[ws,c]of clients)if(world.locations.get(c.id)===room)send(ws,{type:'error',message:'Salvataggio finale in attesa. Il server riprova.'});}).finally(()=>saving.delete(room));}
   else{broadcast();if(steps%60===0)for(const id of room.characters.keys())if(!checkpoints.has(id)){checkpoints.add(id);const revision=service.profiles.get(id)?.revision;void service.saveProgress(id,snapshot).then(()=>{if(service.profiles.get(id)?.revision!==revision)sendProfile(id);}).catch(()=>undefined).finally(()=>checkpoints.delete(id));}}
  }
  networkTimings.add(performance.now()-networkStart);
 }
},8);
const departureTimer=setInterval(()=>{publishSocial();void service.retryDepartures().catch(()=>undefined);},2000);
const heartbeat=setInterval(()=>{for(const[ws,c]of clients){if(!c.alive)ws.terminate();else{c.alive=false;ws.ping();}}},10000);
async function shutdown():Promise<void>{if(shuttingDown)return;shuttingDown=true;processMetrics.stop();clearInterval(tickTimer);clearInterval(heartbeat);clearInterval(departureTimer);try{await service.retryDepartures();for(const room of world.instances.values()){const snapshot=room.snapshot(false);if(snapshot)for(const id of room.characters.keys())await service.saveProgress(id,snapshot);}await service.serial(async()=>undefined);}finally{for(const ws of clients.keys())ws.close(1001,'Riavvio del mondo');sockets.close();for(const ws of clients.keys())ws.terminate();await service.serial(async()=>undefined);await new Promise<void>(done=>server.close(()=>done()));}}
return {server,sockets,service,close:shutdown};
}
