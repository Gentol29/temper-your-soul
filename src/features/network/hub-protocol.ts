import type {CharacterAppearance} from '../character/appearance';
import type {Item} from '../items/item';
export interface HubPlayer {id:string;name:string;character:string;appearance:CharacterAppearance;x:number;y:number;moving:boolean;facing:number;member:boolean}
export interface TradeView {id:string;players:readonly string[];offers:Readonly<Record<string,readonly Item[]>>;revision:number;confirmed:readonly string[];committing:boolean}
export interface TradeRequest {id:string;from:string;to:string}
export interface HubView {requests?:readonly TradeRequest[];ownerId:string;players:readonly HubPlayer[];trades:readonly TradeView[];invites:Readonly<Record<string,string>>}
export interface TradeDelta {id:string;remove:readonly string[];receive:readonly Item[]}
export type HubCommand=
 |{type:'hub_input';move:{x:number;y:number}}
 |{type:'party_invite';target:string}|{type:'party_accept';accept:boolean}
 |{type:'trade_accept';id:string;accept:boolean}|{type:'trade_request';target:string}|{type:'trade_offer';items:readonly string[]}
 |{type:'trade_confirm';revision:number}|{type:'trade_cancel'}
 |{type:'trade_ack';id:string;character:string}
 |{type:'portal_start';dungeonId:string;mode:'descent'|'duel'|'pilgrimage'};

export const HUB_NETWORK={capacity:8,offerCapacity:40} as const;
