import type {Character} from '../character/character';

export const SOCIAL_PARTY = {capacity:4, invitationMs:60_000} as const;
export interface SocialMember {id:string;name:string;character:string}
export interface SocialInvite {id:string;from:string;name:string;expiresAt:number}
export interface SocialPartyView {members:readonly SocialMember[];invitations:readonly SocialInvite[];outgoing:readonly string[]}
export type SocialCommand = {type:'social_invite';target:string}|{type:'social_answer';id:string;accept:boolean}|{type:'social_leave'};
interface Invitation {id:string;from:string;to:string;expiresAt:number}

/** Gruppi volontari nello stesso mondo pubblico; nessuna lobby o autorità sul combattimento. */
export class SocialParties {
  private readonly groups = new Map<string,Set<string>>();
  private readonly invitations = new Map<string,Invitation>();
  private serial=0;
  constructor(private readonly players:ReadonlyMap<string,Character>,private readonly publicCharacter:(id:string)=>string){}
  private members(id:string):Set<string>|undefined{return this.groups.get(id);}
  private expire(now:number):void{for(const [id,invite]of this.invitations)if(invite.expiresAt<=now||!this.players.has(invite.from)||!this.players.has(invite.to))this.invitations.delete(id);}
  invite(from:string,to:string,now:number):void{
    this.expire(now);
    if(from===to||!this.players.has(from)||!this.players.has(to))throw new Error('Giocatore non disponibile.');
    if(this.members(to)?.size)throw new Error('Il giocatore è già in un party.');
    if((this.members(from)?.size??1)>=SOCIAL_PARTY.capacity)throw new Error('Party pieno.');
    if([...this.invitations.values()].some(i=>i.from===from&&i.to===to))throw new Error('Invito già inviato.');
    if([...this.invitations.values()].filter(i=>i.from===from).length>=SOCIAL_PARTY.capacity)throw new Error('Attendi la risposta agli inviti già inviati.');
    const id=String(++this.serial);this.invitations.set(id,{id,from,to,expiresAt:now+SOCIAL_PARTY.invitationMs});
  }
  answer(player:string,id:string,accept:boolean,now:number):void{
    this.expire(now);const invite=this.invitations.get(id);
    if(!invite||invite.to!==player)throw new Error('Invito scaduto o non disponibile.');
    this.invitations.delete(id);if(!accept)return;
    if(this.members(player)?.size)throw new Error('Lascia prima il party attuale.');
    const group=this.members(invite.from)??new Set([invite.from]);
    if(group.size>=SOCIAL_PARTY.capacity)throw new Error('Party pieno.');
    group.add(player);for(const member of group)this.groups.set(member,group);
    for(const [key,i]of this.invitations)if(group.has(i.to))this.invitations.delete(key);
  }
  leave(player:string):void{
    const group=this.members(player);this.groups.delete(player);group?.delete(player);
    if(group&&group.size<2)for(const member of group)this.groups.delete(member);
    for(const [id,i]of this.invitations)if(i.from===player||i.to===player)this.invitations.delete(id);
  }
  view(player:string,now:number):SocialPartyView{
    this.expire(now);
    return{members:[...(this.members(player)??[])].filter(id=>this.players.has(id)).map(id=>({id,name:this.players.get(id)!.name!,character:this.publicCharacter(id)})),
      invitations:[...this.invitations.values()].filter(i=>i.to===player).map(i=>({id:i.id,from:i.from,name:this.players.get(i.from)!.name!,expiresAt:i.expiresAt})),
      outgoing:[...this.invitations.values()].filter(i=>i.from===player).map(i=>i.to)};
  }
}
