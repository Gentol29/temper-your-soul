import type {Character} from '../character/character';
import {deserializeCharacter} from '../character/save-format';
import type {DungeonDefinition} from '../dungeons/dungeon-definition';
import {PartyClient} from '../network/party-client';
import {publicInviteBase} from '../network/public-invite';
import {NETWORK,type BattleSnapshot} from '../network/protocol';
import {characterPixels} from '../presentation/character-art';
import {PARTY_SPRITE} from '../presentation/party-sprite';
import {pixelSvg} from './character-portrait';
import {renderPixelIcon} from './pixel-icon';
import {el,requireElement} from './dom';
import {partyReadiness} from './menu-model';
export const PARTY_CAPACITY=NETWORK.capacity;
type PartyPhase='idle'|'playing'|'paused'|'ended';
/** Comandi della sessione e del party nello stesso riquadro; il portale sceglie il raid. */
export class PartyPanel {
 readonly client:PartyClient;
 private readonly root=requireElement('party-panel');
 private readonly toggle=el('button','relic-button secondary party-toggle');
 private character:Character|null=null;
 private profileId:string|null=null;
 private phase:PartyPhase='idle';
 private note='';
 private pendingInvite=new URLSearchParams(location.search).get('party');
 /** Dove sta il riquadro fuori dal rifugio: la schermata della cooperativa lo ospita nella propria pagina. */
 private host:HTMLElement|null=null;
 /** Lo stato aperto o chiuso del riquadro prima di agganciarsi alla pagina. */
 private openBeforeDock=false;
 private onlineBeforeDock=false;
 /** Porta nel rifugio: il pulsante Pronto si usa solo li'. */
 onEnterRefuge:()=>void=()=>undefined;
 /** Chi gestisce gli avvisi, per quando questo riquadro non e' visibile. */
 onProblem:(message:string)=>void=()=>undefined;
 constructor(private readonly onOpen:()=>void,snapshot:(s:BattleSnapshot)=>void,disconnected:()=>void){
  this.toggle.id='party-toggle';this.toggle.type='button';this.toggle.title='Party';this.toggle.setAttribute('aria-label','Apri il party');this.toggle.setAttribute('aria-controls','party-panel');this.toggle.setAttribute('aria-expanded','false');this.toggle.append(renderPixelIcon(PARTY_SPRITE));this.toggle.onclick=()=>this.root.classList.contains('hidden')?this.openDialog():this.close();document.body.append(this.toggle);this.root.classList.add('hidden');
  this.client=new PartyClient(pingOnly=>pingOnly?this.updatePing():this.renderWidget(),snapshot,message=>{this.note=message;this.openDialog();this.onProblem(message);},disconnected);
 }
 get inviteWaiting():boolean{return this.pendingInvite!==null;}
 get failed():boolean{return this.client.lost;}
 /** Entra nel rifugio di un invito incollato, come ospite; senza personaggio resta in attesa. */
 joinInvite(code:string):void {
  this.note='';this.pendingInvite=code;
  if(this.character&&!this.client.connecting&&!this.client.state){this.pendingInvite=null;this.client.connect(this.character,code,this.profileId??'default');}
  this.renderWidget();
 }
 /** Sposta il riquadro nella pagina indicata, o lo riporta al suo posto; se il gruppo e' attivo resta aperto. */
 dock(host:HTMLElement|null):void {
  if(this.host===host)return;
  this.host=host;this.root.classList.toggle('is-docked',host!==null);
  if(host){this.openBeforeDock=!this.root.classList.contains('hidden');this.onlineBeforeDock=Boolean(this.client.state);host.append(this.root);this.root.classList.remove('hidden');this.renderWidget();return;}
  document.body.append(this.root);
  // Chi si e' appena collegato trova il riquadro aperto; altrimenti torna com'era.
  const open=this.openBeforeDock||(!this.onlineBeforeDock&&Boolean(this.client.state));
  this.root.classList.toggle('hidden',!open);this.toggle.setAttribute('aria-expanded',String(open));this.renderWidget();
 }
 update(character:Character,profileId:string|null,_dungeon:DungeonDefinition,phase:PartyPhase):void {
  const id=character.created?profileId:null;if(this.profileId&&id!==this.profileId)this.client.leave();
  this.profileId=id;this.character=id?character:null;this.phase=phase;
  if(this.pendingInvite&&this.character&&!this.client.connecting&&!this.client.state){const code=this.pendingInvite;this.pendingInvite=null;this.client.connect(this.character,code,this.profileId??'default');}
  if(this.character)this.client.sync(this.character);this.renderWidget();
 }
 private status():string {
  if(this.client.connecting)return 'Connessione…';
  if(!this.character)return this.pendingInvite?'Crea un personaggio per visitare il rifugio':'Scegli un personaggio';
  if(this.client.state){if(!this.client.isMember)return 'Nel rifugio condiviso · Fuori dal party';if(this.client.state.playing)return 'Party in dungeon';return this.client.state.leaderId===this.client.playerId?'Sei il leader · Partenza dal portale':'Partenza dal portale del leader';}
  return this.phase==='playing'?'In dungeon · Singolo':'Singolo';
 }
 private slot(index:number):HTMLElement {
  const member=this.client.state?.members[index],local=!this.client.state&&index===0?this.character:null,character=member?deserializeCharacter(member.character):local;
  const slot=el('article','party-slot');slot.classList.toggle('party-slot-empty',!character);slot.dataset.partySlot=String(index+1);
  const art=el('span','party-member-art');if(character)art.append(pixelSvg(characterPixels(character.appearance(),'game')));else art.append(el('b','party-slot-plus','+'));
  slot.append(art,el('span','party-member-name',character?.name??'Libero'));slot.setAttribute('aria-label',character?.name??`Posto ${index+1} libero`);
  if(member){const label=el('span','party-member-status',member.ready?'Pronto':'In attesa');label.classList.toggle('is-ready',member.ready);slot.append(label);if(member.id===this.client.state?.leaderId)slot.append(el('small','party-leader','Leader'));}return slot;
 }
 private action(label:string,run:()=>void,kind='secondary'):HTMLButtonElement {const b=el('button',`relic-button ${kind}`,label);b.type='button';b.onclick=run;return b;}
 private renderWidget():void {
  const state=this.client.state;this.root.replaceChildren();
  const head=el('div','party-heading');head.append(el('strong','party-open',`Party · ${state?.members.length??(this.character?1:0)}/${PARTY_CAPACITY}`));
  const ping=el('span','party-local-badge',state?(this.client.latency===null?'Online':`${this.client.latency} ms`):'Singolo');const close=this.action('×',()=>this.close());close.setAttribute('aria-label','Chiudi party');head.append(ping,close);this.root.append(head);
  const slots=el('div','party-slots');for(let i=0;i<PARTY_CAPACITY;i++)slots.append(this.slot(i));this.root.append(slots,el('p','party-widget-status',this.status()));
  if(state&&this.client.isMember&&!state.playing)this.root.append(el('p','party-inline-note party-readiness',partyReadiness(state.members,state.leaderId,PARTY_CAPACITY)));
  if(state){const owner=[...state.members,...(state.visitors??[])].find(m=>m.id===state.ownerId);if(owner)this.root.append(el('small','party-session-owner',`Rifugio di ${owner.name}`));}
  const actions=el('div','party-inline-actions'),busy=this.client.tradeSaving||Boolean(this.client.hub?.trades.some(t=>t.players.includes(this.client.playerId))||this.client.hub?.requests?.some(r=>r.from===this.client.playerId||r.to===this.client.playerId));
  if(!state){const create=this.action(this.client.connecting?'Connessione…':'Crea party',()=>{this.note='';if(this.character)this.client.connect(this.character,undefined,this.profileId??'default');});create.disabled=!this.character||this.client.connecting||this.phase==='playing'||this.phase==='paused';actions.append(create);}
  else {
   const me=state.members.find(m=>m.id===this.client.playerId);
   if(this.host)actions.append(this.action('Entra nel rifugio',this.onEnterRefuge,'party-ready'));
   else if(me){const ready=this.action('Pronto',()=>this.client.send({type:'ready',ready:!me.ready}),'party-ready');ready.setAttribute('aria-pressed',String(me.ready));ready.disabled=state.playing||busy||!document.body.classList.contains('in-hub');actions.append(ready);}
   if(me){
    const leave=this.action('Lascia il party',()=>this.client.leaveParty(),'party-danger');leave.disabled=busy;actions.append(leave);
   }else if(!state.members.length){const create=this.action('Crea party',()=>this.client.send({type:'party_create'}));create.disabled=busy||this.phase==='playing'||this.phase==='paused';actions.append(create);}
   const invite=this.action('Copia invito',()=>{void navigator.clipboard.writeText(this.inviteUrl()).then(()=>{this.note='Link del rifugio copiato.';this.renderWidget();}).catch(()=>{this.note='Seleziona e copia il link qui sotto.';this.renderWidget();});});invite.disabled=!this.inviteUrl();actions.append(invite);
   const single=this.action('Torna in singolo',()=>{this.note='';this.client.leave();});single.disabled=busy;actions.append(single);
  }
  this.root.append(actions);
  if(state){const link=el('input','party-link');link.readOnly=true;link.value=this.inviteUrl();link.placeholder='Avvia il tunnel Cloudflare';link.setAttribute('aria-label','Link di invito al rifugio');link.onclick=()=>link.select();this.root.append(link);if(state.visitors?.length)this.root.append(el('p','party-inline-note','Ospiti: '+state.visitors.map(v=>v.name).join(', ')));}
  if(this.note)this.root.append(el('p','party-inline-note',this.note));
 }
 private updatePing():void{const badge=this.root.querySelector('.party-local-badge');if(badge&&this.client.state&&this.client.latency!==null)badge.textContent=`${this.client.latency} ms`;}
 openDialog():void{this.renderWidget();this.root.classList.remove('hidden');this.toggle.setAttribute('aria-expanded','true');this.onOpen();}
 close():void{if(this.host)return;this.root.classList.add('hidden');this.toggle.setAttribute('aria-expanded','false');}
 private inviteUrl():string{const base=publicInviteBase(this.client.inviteBase)||publicInviteBase(location.href);if(!base||!this.client.state)return '';const url=new URL(base);url.searchParams.set('party',this.client.state.code);return url.href;}
}
