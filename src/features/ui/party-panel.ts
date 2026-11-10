import {Character, type Character as CharacterModel} from '../character/character';
import {deserializeCharacter} from '../character/save-format';
import {PartyClient} from '../network/party-client';
import {accountToken,beginAccountLogin,initializeAccountSession} from '../network/account-session';
import {SOCIAL_PARTY} from '../network/social-party';
import type {BattleSnapshot,ClientMessage} from '../network/protocol';
import {characterPixels} from '../presentation/character-art';
import {PARTY_SPRITE} from '../presentation/party-sprite';
import {pixelSvg} from './character-portrait';
import {renderPixelIcon} from './pixel-icon';
import {el,requireElement} from './dom';
import {applicationLoading} from './loading-indicator';
import {accountLoginForm} from './account-login-form';
import './online-panel.css';

/** Il party raggruppa amici nel mondo pubblico; l'account si gestisce dal menu. */
export class PartyPanel {
 readonly client:PartyClient;
 private readonly root=requireElement('party-panel');
 private readonly toggle=el('button','relic-button secondary party-toggle');
 private character:CharacterModel|null=null;
 private note='';
 private passwordLogin=false;
 private loadingConfig=false;
 private accountOpen=false;
 private pendingLabel:string|null=null;
 private finishLoading:(()=>void)|undefined;
 onProblem:(message:string)=>void=()=>undefined;
 constructor(private readonly onOpen:()=>void,snapshot:(s:BattleSnapshot)=>void,disconnected:()=>void){
  this.toggle.id='party-toggle';this.toggle.type='button';this.toggle.title='Party';
  this.toggle.setAttribute('aria-label','Apri il party');this.toggle.setAttribute('aria-controls','party-panel');this.toggle.setAttribute('aria-expanded','false');
  this.toggle.append(renderPixelIcon(PARTY_SPRITE));this.toggle.onclick=()=>this.isOpen?this.close():this.openDialog();
  document.body.append(this.toggle);this.root.classList.add('hidden','online-panel');this.root.setAttribute('role','dialog');
  this.client=new PartyClient(pingOnly=>pingOnly?this.updatePing():this.changed(),snapshot,message=>{this.note=message;this.openDialog();this.onProblem(message);},disconnected);
  initializeAccountSession();window.addEventListener('temper-your-soul:session-changed',()=>{this.client.leave();if(!accountToken())this.close();this.connect();});
  this.renderWidget();
 }
 get failed():boolean{return this.client.lost;}
 get isOpen():boolean{return !this.root.classList.contains('hidden');}
 login():void{this.accountOpen=true;this.openDialog();}
 update(character:CharacterModel):void{this.character=character;this.connect();if(!this.accountOpen||accountToken())this.renderWidget();}
 private connect():void{if(accountToken()&&!this.client.connecting&&!this.client.state&&!this.client.lost)this.client.connect(this.character??Character.createStarter());}
 private changed():void{
  const label=this.client.pendingOperation;
  if(label!==this.pendingLabel){this.finishLoading?.();this.pendingLabel=label;this.finishLoading=label?applicationLoading().begin(label):undefined;}
  if(this.accountOpen&&this.client.state){this.accountOpen=false;this.close();}
  this.renderWidget();
 }
 private action(label:string,run:()=>void):HTMLButtonElement{const button=el('button','relic-button secondary',label);button.type='button';button.onclick=run;return button;}
 private send(message:ClientMessage):void{this.note='';this.client.send(message);}
 private renderWidget():void{
  this.toggle.classList.toggle('hidden',!this.client.state);
  this.toggle.classList.toggle('has-invitation',this.client.social.invitations.length>0);
  this.toggle.setAttribute('aria-label',this.client.social.invitations.length?'Apri il party: nuovo invito':'Apri il party');
  this.root.setAttribute('aria-label',this.accountOpen?'Accesso al mondo':'Party');
  this.root.replaceChildren();
  const heading=el('div','party-heading');heading.append(el('strong','party-open',this.accountOpen?'Accesso al mondo':'Party'));
  const ping=el('span','party-local-badge');heading.append(ping,this.action('×',()=>this.close()));this.root.append(heading);this.updatePing();
  if(!this.client.state){
   if(this.loadingConfig)this.root.append(el('p','','Caricamento accesso…'));
   else if(this.passwordLogin&&!accountToken())this.root.append(accountLoginForm());
   else {
    const login=this.action(accountToken()?'Riconnetti':'Accedi',()=>{
     if(accountToken()){this.client.leave();this.connect();}
     else void applicationLoading().run('Apertura accesso…',()=>beginAccountLogin()).catch((error:unknown)=>{this.note=error instanceof Error?error.message:'Accesso non riuscito.';this.renderWidget();});
    });login.disabled=this.client.connecting;this.root.append(login);
   }
  }else this.renderParty();
  if(this.note)this.root.append(el('p','party-inline-note',this.note));
 }
 private renderParty():void{
  const social=this.client.social;
  const members=social.members.length?social.members:[{id:this.client.playerId,name:this.character?.name??'Tu',character:this.client.profile?.character??''}];
  const slots=el('div','party-slots');
  for(let index=0;index<SOCIAL_PARTY.capacity;index++){
   const member=members[index],character=member?deserializeCharacter(member.character):null;
   const slot=el('div',`party-slot${member?'':' party-slot-empty'}`),art=el('span','party-member-art');
   if(character)art.append(pixelSvg(characterPixels(character.appearance(),'game')));else art.append(el('b','party-slot-plus','+'));
   slot.append(art,el('span','party-member-name',member?.name??'Libero'));slot.title=member?.name??'Posto libero';slots.append(slot);
  }
  this.root.append(slots,el('p','party-inline-note',`${members.length}/${SOCIAL_PARTY.capacity} · HUB pubblico condiviso`));
  for(const invite of social.invitations){
   const row=el('div','party-invitation');row.append(el('p','',`${invite.name} ti invita nel party.`));
   row.append(this.action('Accetta',()=>this.send({type:'social_answer',id:invite.id,accept:true})),this.action('Rifiuta',()=>this.send({type:'social_answer',id:invite.id,accept:false})));this.root.append(row);
  }
  if(social.members.length)this.root.append(this.action('Lascia il party',()=>this.send({type:'social_leave'})));
  const inviteLabel=el('label','','Invita un giocatore'),select=el('select','party-invite-select');select.id='party-invite-target';inviteLabel.htmlFor=select.id;
  const candidates=this.client.hub?.players.filter(p=>p.id!==this.client.playerId&&!members.some(m=>m.id===p.id))??[];
  for(const player of candidates){const option=el('option','',player.name);option.value=player.id;select.append(option);}
  const invite=this.action('Invita nel party',()=>this.send({type:'social_invite',target:select.value}));
  invite.disabled=!candidates.length||members.length>=SOCIAL_PARTY.capacity;select.disabled=!candidates.length;
  this.root.append(inviteLabel,select,invite);
  if(social.outgoing.length)this.root.append(el('p','party-inline-note','Invito inviato. In attesa della risposta…'));
 }
 private updatePing():void{const badge=this.root.querySelector('.party-local-badge');if(badge)badge.textContent=this.client.state?`${this.client.latency??'…'} ms`:'';}
 openDialog():void{
  this.renderWidget();this.root.classList.remove('hidden');this.toggle.setAttribute('aria-expanded','true');this.onOpen();
  if(!this.loadingConfig&&!this.passwordLogin&&!this.client.state){
   this.loadingConfig=true;this.renderWidget();
   void applicationLoading().run('Caricamento accesso…',async()=>{
    const response=await fetch('/online-config',{signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error('Server non raggiungibile.');
    const raw:unknown=await response.json();this.passwordLogin=Boolean(raw&&typeof raw==='object'&&'passwordLogin'in raw&&raw.passwordLogin===true);
   }).catch(()=>{this.note='Server non raggiungibile. Riprova fra poco.';}).finally(()=>{this.loadingConfig=false;this.renderWidget();});
  }
 }
 close():void{this.root.classList.add('hidden');this.toggle.setAttribute('aria-expanded','false');}
}
