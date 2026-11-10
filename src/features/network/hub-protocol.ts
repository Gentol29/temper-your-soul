import type {CharacterAppearance} from '../character/appearance';
import type {Item} from '../items/item';
export interface HubPlayer {present?:boolean;id:string;name:string;character:string;appearance:CharacterAppearance;x:number;y:number;moving:boolean;facing:number}
export interface TradeView {id:string;players:readonly string[];offers:Readonly<Record<string,readonly Item[]>>;revision:number;confirmed:readonly string[];committing:boolean}
export interface TradeRequest {id:string;from:string;to:string}
export interface HubView {requests?:readonly TradeRequest[];players:readonly HubPlayer[];trades:readonly TradeView[]}
export interface TradeDelta {id:string;remove:readonly string[];receive:readonly Item[]}
export type HubCommand=
 |{type:'hub_presence';present:boolean}
 |{type:'hub_input';move:{x:number;y:number}}
 |{type:'trade_accept';id:string;accept:boolean}|{type:'trade_request';target:string}|{type:'trade_offer';items:readonly string[]}
 |{type:'trade_confirm';revision:number}|{type:'trade_cancel'}
 |{type:'portal_start';dungeonId:string;mode:'descent'|'duel'|'pilgrimage'};

export const HUB_NETWORK={capacity:64,offerCapacity:40} as const;
