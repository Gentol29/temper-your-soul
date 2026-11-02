import type {Character} from '../character/character';
import type {TradeView} from '../network/hub-protocol';
import type {ClientMessage} from '../network/protocol';
import {renderItemSlot} from './item-slot';
import {el} from './dom';
/** Lascia sempre una pagina di nove caselle leggibili, anche con offerte vuote. */
function fillTradeSlots(grid:HTMLElement,label:string):void {
 const cells=Math.max(9,Math.ceil(grid.childElementCount/9)*9);
 while(grid.childElementCount<cells){const empty=el('div','trade-cell trade-cell-empty');empty.setAttribute('aria-label',`${label} · Casella ${grid.childElementCount+1} vuota`);grid.append(empty);}
}
function addTradeSlot(grid:HTMLElement,button:HTMLButtonElement):void {const cell=el('div','trade-cell');cell.append(button);grid.append(cell);}

export function tradeWindow(character:Character,trade:TradeView,me:string,peerName:string,send:(m:ClientMessage)=>void):HTMLElement {
 const root=el('div','trade-window'),mine=el('section','trade-side'),other=el('section','trade-side');
 mine.append(el('h3','','Il tuo inventario'),el('p','','Seleziona gli oggetti da offrire. I pezzi indossati non sono scambiabili.'));
 const grid=el('div','trade-items'),selected=new Set((trade.offers[me]??[]).map(item=>item.uid));
 for(const item of character.inventory.filter(item=>!Object.values(character.equipped).includes(item.uid))){const button=renderItemSlot(item,{characterClass:character.characterClass});if(!button)continue;button.classList.toggle('is-transfer-selected',selected.has(item.uid));button.setAttribute('aria-pressed',String(selected.has(item.uid)));button.disabled=trade.committing;button.onclick=()=>{if(selected.has(item.uid))selected.delete(item.uid);else selected.add(item.uid);send({type:'trade_offer',items:[...selected]});};addTradeSlot(grid,button);}
 fillTradeSlots(grid,'Il tuo inventario');
 mine.append(grid,el('p','','Gli oggetti evidenziati sono la tua offerta.'));
 other.append(el('h3','',`Offerta di ${peerName}`));const theirs=el('div','trade-items');const peer=trade.players.find(id=>id!==me)!;
 for(const item of trade.offers[peer]??[]){const button=renderItemSlot(item,{characterClass:character.characterClass});if(button)addTradeSlot(theirs,button);}fillTradeSlots(theirs,`Offerta di ${peerName}`);other.append(theirs);
 other.append(el('p','',trade.confirmed.includes(peer)?'L’altro giocatore ha confermato.':'In attesa della sua conferma.'));
 const confirm=el('button','relic-button',trade.committing?'Salvataggio dello scambio…':trade.confirmed.includes(me)?'Conferma inviata':'Conferma lo scambio');confirm.disabled=trade.committing||trade.confirmed.includes(me)||Object.values(trade.offers).every(items=>items.length===0);
 confirm.onclick=()=>{const dialog=el('dialog','trade-confirm menu-card');dialog.setAttribute('aria-label','Conferma finale dello scambio');dialog.append(el('h2','','Confermi questa offerta?'),el('p','','Gli oggetti passeranno all’altro giocatore solo quando entrambi avrete confermato. Ogni modifica annulla le conferme.'));
  const yes=el('button','relic-button','Sì, confermo'),no=el('button','relic-button secondary','Annulla');yes.onclick=()=>{send({type:'trade_confirm',revision:trade.revision});dialog.close();};no.onclick=()=>dialog.close();dialog.append(yes,no);dialog.addEventListener('keydown',e=>{if(e.code==='Escape')e.stopPropagation();});const observer=new MutationObserver(()=>{if(!root.isConnected)dialog.close();});observer.observe(document.body,{childList:true,subtree:true});dialog.addEventListener('close',()=>{observer.disconnect();dialog.remove();});document.body.append(dialog);dialog.showModal();};
 root.append(mine,other,confirm);return root;
}
