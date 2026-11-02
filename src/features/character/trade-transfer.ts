import type {Character} from './character';
import type {TradeDelta} from '../network/hub-protocol';
/** Ricevuta e trasferimento sono salvati nello stesso snapshot del personaggio. */
export function applyTradeDelta(character:Character,delta:TradeDelta):boolean {
 if(character.tradeReceipts.includes(delta.id))return false;
 for(const uid of delta.remove){
  for(const slot of ['primary_hand','secondary_hand','armor','boots'] as const)if(character.equipped[slot]===uid)character.unequip(slot);
  character.inventory=character.inventory.filter(item=>item.uid!==uid);character.storage=character.storage.filter(item=>item.uid!==uid);delete character.storagePositions[uid];
 }
 for(const item of delta.receive){const added=character.addRolls([item])[0];if(added&&item.upgrade)character.inventory[character.inventory.indexOf(added)]={...added,upgrade:item.upgrade};}
 character.tradeReceipts=[...character.tradeReceipts,delta.id].slice(-256);return true;
}
