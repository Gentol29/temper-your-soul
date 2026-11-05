import type {HubView,HubPlayer} from '../network/hub-protocol';
import type {ClientMessage} from '../network/protocol';
import {deserializeCharacter} from '../character/save-format';
import {tradeWindow} from './trade-window';
import { HubState, HUB_MAP, HUB_SPAWN } from '../character/hub-state';
import { hubInteractionDistance, hubInteractionPoint } from '../character/hub-interaction';
import { hubArrivalFrame } from '../presentation/hub-arrival';
import { Vec2 } from '../../core/vec2';
import { el } from './dom';
import type { Character } from '../character/character';
import type { CharacterRoster } from '../character/character-roster';
import { acquireBasic, HUB_PRICES } from '../character/hub-services';
import { hubOffer } from './hub-offer';
import { forgeWindow } from './forge-window';
import { storageWindow } from './storage-window';
import { STARTER_SETS } from '../character/creation';
import { HubIsoRenderer } from '../presentation/hub-iso-renderer';
import { hideItemTooltip } from './item-slot';
import { playerProfile } from './player-profile';
import { HubLabels } from './hub-labels';
import { snapHubLabel } from '../presentation/hub-projection';
export class HubScreen {
  readonly root=el('section','hub-screen hidden');
  private readonly canvas=el('canvas','hub-world');
  private readonly renderer:HubIsoRenderer;
  private readonly labels=new HubLabels();
  private time=0;
  private arrivalElapsed=Infinity;
  private readonly reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  get inputLocked():boolean{return this.dialogOpen||hubArrivalFrame(this.arrivalElapsed,this.reducedMotion.matches).active;}
  private online:{id:string;view:HubView;busy:boolean;send:(m:ClientMessage)=>void}|null=null;
  private onlineId='';
  private socialKey='';
  private socialTrade='';
  private readonly prompt=el('p','hub-prompt');
  private readonly state=new HubState();
  private panel:HTMLElement|null=null;
  private character!:Character;
  private roster!:CharacterRoster;
  get dialogOpen():boolean{return this.panel!==null;}
  constructor(private readonly handlers:{portal:()=>void;save:()=>void;inventory:()=>void;menu:()=>void}) {
    this.canvas.setAttribute('aria-label','Piazza del rifugio: WASD per muoverti, E vicino a NPC e strutture');
    this.canvas.tabIndex=0;this.renderer=new HubIsoRenderer(this.canvas);
    this.prompt.className='hub-interaction-tooltip hidden';this.prompt.setAttribute('role','status');
    const button=(label:string,action:()=>void)=>{const b=el('button','relic-button secondary',label);b.type='button';b.onclick=action;return b;};
    const menu=button('Menu principale',handlers.menu);menu.classList.add('hub-menu-button');
    this.root.append(this.canvas,this.labels.root,this.prompt,menu);document.body.append(this.root);
  }
  show(character:Character,roster:CharacterRoster,arrive=false,time=this.time):void {
    this.closeDialog();this.character=character;this.roster=roster;this.time=time;
    if(arrive){this.arrivalElapsed=0;if(!this.online)this.state.position=HUB_SPAWN;}else this.arrivalElapsed=Infinity;
    document.body.classList.add('in-hub');
    this.root.classList.remove('hidden');this.refresh();this.render(0);this.canvas.focus();
  }
  hide():void{this.closeDialog();this.root.classList.add('hidden');document.body.classList.remove('in-hub');}
  private refresh():void{}
  step(dt:number,move:Vec2):void {
    this.state.step(this.inputLocked?0:dt,this.inputLocked?Vec2.ZERO:move);
  }
  /** Disegno a ogni fotogramma; il movimento resta a passo fisso. */
  render(dt:number):void {
    this.arrivalElapsed+=dt;
    const peers=this.online?.view.players.filter(p=>p.id!==this.online!.id&&p.present!==false)??[];
    this.time+=dt;this.renderer.draw(this.state,this.character.appearance(),this.time,peers,this.arrivalElapsed,this.reducedMotion.matches);
    this.labels.draw(this.renderer,peers,!this.inputLocked);
    const target=this.interactionTarget();this.prompt.classList.toggle('hidden',!target||this.inputLocked);
    if(target){
      const anchor='width' in target?hubInteractionPoint(target,this.state.position):new Vec2(target.x,target.y);
      const point=this.renderer.screenPoint(anchor.x,anchor.y,28);
      this.prompt.textContent=`E · ${target.name}`;
      this.prompt.style.left=snapHubLabel(Math.max(8,Math.min(window.innerWidth-210,point.x+12)),window.devicePixelRatio)+'px';
      this.prompt.style.top=snapHubLabel(Math.max(12,Math.min(window.innerHeight-80,point.y)),window.devicePixelRatio)+'px';
    }
  }
  setOnline(online:{id:string;view:HubView;busy:boolean;send:(m:ClientMessage)=>void}|null):void {
    this.online=online;
    if(!online){const hadTrade=Boolean(this.socialTrade);this.onlineId='';this.socialKey='';this.socialTrade='';if(hadTrade)this.closeDialog();return;}
    const me=online.view.players.find(p=>p.id===online.id);
    if(me&&(this.onlineId!==online.id||this.state.position.distanceTo(new Vec2(me.x,me.y))>40))this.state.position=new Vec2(me.x,me.y);
    this.onlineId=online.id;
    const trade=online.view.trades.find(t=>t.players.includes(online.id)),invite=online.view.invites[online.id];
    const request=online.view.requests?.find(r=>r.from===online.id||r.to===online.id);
    const key=JSON.stringify([trade,invite,request]);if(key===this.socialKey)return;this.socialKey=key;
    const wasSocial=Boolean(this.socialTrade);this.socialTrade='';
    if(trade){const peer=online.view.players.find(p=>trade.players.includes(p.id)&&p.id!==online.id);const card=this.dialog('Scambio con '+(peer?.name??'giocatore'));this.socialTrade=trade.id;card.append(tradeWindow(this.character,trade,online.id,peer?.name??'Giocatore',online.send));}
    else if(request){const incoming=request.to===online.id,peer=online.view.players.find(p=>p.id===(incoming?request.from:request.to));const card=this.dialog(incoming?'Richiesta di scambio':'Scambio in attesa',true);this.socialTrade=request.id;card.append(el('p','',incoming?`Accetti lo scambio da ${peer?.name??'giocatore'}?`:`In attesa della risposta di ${peer?.name??'giocatore'}…`));if(incoming){for(const [label,accept]of [['Sì',true],['No',false]] as const){const b=el('button','relic-button',label);b.onclick=()=>{online.send({type:'trade_accept',id:request.id,accept});this.socialTrade='';this.closeDialog();};card.append(b);}}}
    else if(wasSocial)this.closeDialog();
    else if(invite){const from=online.view.players.find(p=>p.id===invite);const card=this.dialog('Invito al party',true);card.append(el('p','',`${from?.name??'Un giocatore'} ti invita nel party.`));for(const [label,accept]of [['Accetta',true],['Rifiuta',false]] as const){const b=el('button','relic-button',label);b.onclick=()=>{online.send({type:'party_accept',accept});this.closeDialog();};card.append(b);}}
  }
  private nearPlayer():HubPlayer|undefined{return this.online?.view.players.filter(p=>p.id!==this.online!.id&&p.present!==false).sort((a,b)=>this.state.position.distanceTo(new Vec2(a.x,a.y))-this.state.position.distanceTo(new Vec2(b.x,b.y))).find(p=>this.state.position.distanceTo(new Vec2(p.x,p.y))<HUB_MAP.interactionRadius);}
  private interactPlayer(peer:HubPlayer):void {
    const online=this.online;if(!online)return;const card=this.dialog(peer.name,true);
    const action=(label:string,run:()=>void)=>{const b=el('button','relic-button hub-social-action',label);b.onclick=run;card.append(b);};
    action('Mostra profilo',()=>{const character=deserializeCharacter(peer.character);if(character)this.dialog('Profilo di '+peer.name).append(playerProfile(character,null,{showInventory:false}));});
    action('Scambia',()=>{online.send({type:'trade_request',target:peer.id});this.closeDialog();});
    if(!peer.member&&online.view.players.find(p=>p.id===online.id)?.member)action('Invita al party',()=>{online.send({type:'party_invite',target:peer.id});this.closeDialog();});
  }
  private interactionTarget(){const peer=this.nearPlayer(),station=this.nearest();if(peer&&station&&hubInteractionDistance(station,this.state.position)<this.state.position.distanceTo(new Vec2(peer.x,peer.y)))return station;return peer??station;}
  private nearest(){return this.state.nearest();}
  interact():void{if(this.inputLocked)return;const target=this.interactionTarget();if(!target)return;if('member' in target){this.interactPlayer(target);return;}if(target.id==='portal'){this.handlers.portal();return;}this.openService(target.id,target.name);}
  closeDialog():boolean{if(!this.panel)return false;if(this.socialTrade){const trade=this.online?.view.trades.find(t=>t.id===this.socialTrade);if(trade?.committing)return false;this.online?.send({type:'trade_cancel'});this.socialTrade='';}hideItemTooltip();this.panel.remove();this.panel=null;return true;}
  private dialog(title:string,compact=false):HTMLElement {
    this.closeDialog();const veil=el('div','hub-dialog'),card=el('div','hub-dialog-card menu-card');if(compact)card.classList.add('hub-dialog-compact');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);const close=el('button','relic-button secondary',compact?'×':'Chiudi · ESC');close.setAttribute('aria-label','Chiudi · ESC');close.onclick=()=>this.closeDialog();const header=el('header','hub-dialog-head');header.append(el('h2','',title),close);card.append(header);veil.append(card);this.root.append(veil);this.panel=veil;close.focus();return card;
  }
  openProfile():void{if(this.inputLocked)return;if((this.online?.busy||this.online?.view.requests?.some(r=>r.from===this.online!.id||r.to===this.online!.id)||this.online?.view.trades.some(t=>t.players.includes(this.online!.id))))return;this.dialog('Personaggio e zaino').append(playerProfile(this.character,this.roster.gold,{onEquipmentChange:()=>{this.handlers.save();this.openProfile();}}));}
 private openService(id:string,name:string):void {
    if((this.online?.busy||this.online?.view.requests?.some(r=>r.from===this.online!.id||r.to===this.online!.id)||this.online?.view.trades.some(t=>t.players.includes(this.online!.id))))return;
    const card=this.dialog(name),character=this.character;
    if(id==='storage'){
      card.classList.add('hub-storage-dialog');card.append(storageWindow(character,this.roster.gold,()=>{this.handlers.save();this.refresh();}));return;
    }
    if(id==='forge'){
      card.append(forgeWindow(character,this.roster,()=>{this.handlers.save();this.refresh();}));return;
    }
    card.append(el('p','hub-service-wallet',`Oro disponibile · ${this.roster.gold}`));
    const list=el('div','hub-offer-list');
    const changed=(run:()=>boolean)=>{if(run()){hideItemTooltip();this.handlers.save();this.refresh();this.openService(id,name);}};
    const cost=HUB_PRICES.buy;
    card.append(el('p','hub-service-note','Equipaggiamento Comune di base della tua classe.'));
    STARTER_SETS[character.characterClass??'mage'].forEach((familyId,slot)=>list.append(hubOffer({uid:`preview-${slot}`,familyId,rarity:'common'},
      {characterClass:character.characterClass,note:'Comune · Livello oggetto 1',label:`Acquista · ${cost} oro`,disabled:this.roster.gold<cost,action:()=>changed(()=>acquireBasic(this.roster,character,slot,false))})));
    card.append(list);
  }
}
