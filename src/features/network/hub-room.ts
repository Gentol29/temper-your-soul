import {NETWORK} from './protocol';
import {HUB_NETWORK} from './hub-protocol';
import {Vec2} from '../../core/vec2';
import {HubState,HUB_MAP,hubSpawnPoint} from '../character/hub-state';
import type {Character} from '../character/character';
import {serializeCharacter,deserializeCharacter} from '../character/save-format';
import type {HubView,TradeView,TradeDelta} from './hub-protocol';
export interface TradeSettlement {id:string;sides:readonly {playerId:string;delta:TradeDelta}[]}
interface Trade {accepted:boolean;id:string;players:readonly string[];offers:Map<string,string[]>;revision:number;confirmed:Set<string>;committing:boolean}
function publicCharacter(c:Character):string {const copy=deserializeCharacter(serializeCharacter(c))!;copy.storage=[];copy.storagePositions={};copy.tradeReceipts=[];copy.bestiary={};copy.records={};copy.descents={};return serializeCharacter(copy);}
export class HubRoom {
 readonly positions=new Map<string,HubState>();
 readonly members=new Set<string>();
 readonly present=new Map<string,boolean>();
 readonly invites=new Map<string,string>();
 readonly trades=new Map<string,Trade>();
 readonly inputs=new Map<string,{move:Vec2;at:number}>();
 private serial=0;
 constructor(private readonly characters:Map<string,Character>,private readonly playing:()=>boolean,private readonly key='hub'){}
 enter(id:string,visitor:boolean):void {const state=new HubState();state.position=hubSpawnPoint(this.positions.size);this.positions.set(id,state);this.present.set(id,true);if(!visitor)this.members.add(id);}
 leave(id:string):void {this.positions.delete(id);this.present.delete(id);this.members.delete(id);this.inputs.delete(id);this.invites.delete(id);for(const [to,from]of this.invites)if(from===id)this.invites.delete(to);this.cancel(id);}
 setPresence(id:string,present:boolean):void {if(!this.positions.has(id))throw new Error('Giocatore non presente.');if(!present){this.cancel(id);this.requireFree(id);this.inputs.delete(id);this.invites.delete(id);for(const [to,from] of this.invites)if(from===id)this.invites.delete(to);}this.present.set(id,present);}
 tick(now:number):void {for(const [id,state]of this.positions){if(this.present.get(id)===false||(this.playing()&&this.members.has(id)))continue;const input=this.inputs.get(id);state.step(NETWORK.step,input&&now-input.at<NETWORK.staleInputMs?input.move:Vec2.ZERO);}}
 private near(a:string,b:string):void {if(this.present.get(a)===false||this.present.get(b)===false||a===b||!this.characters.has(a)||!this.characters.has(b)||!this.positions.has(a)||!this.positions.has(b)||this.positions.get(a)!.position.distanceTo(this.positions.get(b)!.position)>HUB_MAP.interactionRadius)throw new Error('Avvicinati al giocatore per interagire.');}
 tradeFor(id:string):Trade|undefined{return [...this.trades.values()].find(t=>t.players.includes(id));}
 requireFree(id:string):void {if(this.tradeFor(id))throw new Error('Completa o annulla lo scambio prima di modificare il personaggio.');}
 invite(from:string,to:string):void {if(this.playing())throw new Error('Attendi il ritorno del party.');this.near(from,to);if(!this.members.has(from)||this.members.has(to))throw new Error('Invito al party non valido.');this.invites.set(to,from);}
 accept(id:string,accept:boolean):void {if(!this.invites.has(id))throw new Error('Invito scaduto.');if(accept){if(this.playing())throw new Error('Attendi il ritorno del party.');if(this.members.size>=NETWORK.capacity)throw new Error('Il party è completo.');this.members.add(id);}this.invites.delete(id);}
 request(from:string,to:string):void {if(this.playing()&&(this.members.has(from)||this.members.has(to)))throw new Error('Gli scambi si effettuano nel rifugio.');this.near(from,to);this.requireFree(from);this.requireFree(to);const id=`${this.key}:${++this.serial}`;this.trades.set(id,{accepted:false,id,players:[from,to],offers:new Map([[from,[]],[to,[]]]),revision:0,confirmed:new Set(),committing:false});}
 acceptTrade(playerId:string,id:string,accept:boolean):void {const t=this.trades.get(id);if(!t||t.accepted||t.players[1]!==playerId)throw new Error('Richiesta di scambio scaduta.');if(!accept){this.trades.delete(id);return;}this.near(t.players[0]!,playerId);t.accepted=true;}
 offer(id:string,items:readonly string[]):void {const t=this.tradeFor(id);if(!t||!t.accepted||t.committing)throw new Error('Scambio non modificabile.');if(items.length>HUB_NETWORK.offerCapacity||new Set(items).size!==items.length)throw new Error('Offerta non valida.');const c=this.characters.get(id)!;for(const uid of items)if(!c.itemByUid(uid)||Object.values(c.equipped).includes(uid))throw new Error('Si scambiano solo oggetti non equipaggiati nello zaino.');t.offers.set(id,[...items]);t.revision++;t.confirmed.clear();}
 confirm(id:string,revision:number):TradeSettlement|null {const t=this.tradeFor(id);if(!t||!t.accepted||t.committing||t.revision!==revision)throw new Error('L’offerta è cambiata: controllala e conferma di nuovo.');if([...t.offers.values()].every(items=>items.length===0))throw new Error('Seleziona almeno un oggetto.');for(const p of t.players){const c=this.characters.get(p);if(!c)throw new Error('Il giocatore è uscito.');for(const uid of t.offers.get(p)!)if(!c.itemByUid(uid)||Object.values(c.equipped).includes(uid))throw new Error('Gli oggetti offerti non sono più disponibili.');}
 t.confirmed.add(id);if(t.confirmed.size!==2)return null;t.committing=true;
 return {id:t.id,sides:t.players.map(p=>({playerId:p,delta:{id:t.id,remove:[...t.offers.get(p)!],receive:t.players.filter(other=>other!==p).flatMap(other=>t.offers.get(other)!.map(uid=>({...this.characters.get(other)!.itemByUid(uid)!})))}}))};}
 finish(id:string):void{this.trades.delete(id);}
 cancel(id:string):void {const t=this.tradeFor(id);if(t&&!t.committing)this.trades.delete(t.id);}
 views():readonly TradeView[]{return [...this.trades.values()].filter(t=>t.accepted).map(t=>({id:t.id,players:t.players,revision:t.revision,confirmed:[...t.confirmed],committing:t.committing,offers:Object.fromEntries(t.players.map(p=>[p,(t.offers.get(p)??[]).flatMap(uid=>{const item=this.characters.get(p)?.itemByUid(uid);return item?[{...item}]:[];})]))}));}
 view(ownerId:string):HubView{return {ownerId,requests:[...this.trades.values()].filter(t=>!t.accepted).map(t=>({id:t.id,from:t.players[0]!,to:t.players[1]!})),players:[...this.positions].filter(([id])=>!this.playing()||!this.members.has(id)).flatMap(([id,s])=>{const c=this.characters.get(id);return c?[{id,present:this.present.get(id)!==false,name:c.name!,character:publicCharacter(c),appearance:c.appearance(),x:s.position.x,y:s.position.y,moving:s.moving,facing:s.facing,member:this.members.has(id)}]:[];}),trades:this.views(),invites:Object.fromEntries(this.invites)};}
 publicCharacter(id:string):string{return publicCharacter(this.characters.get(id)!);}
}
