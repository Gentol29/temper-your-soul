import type {Character} from '../character/character';
import {storageSlots,STORAGE_CAPACITY,depositItem,withdrawItem,moveStorageItem} from '../character/character-storage';
import type {Item} from '../items/item';
import {itemName} from '../items/item';
import {el} from './dom';
import {storageDrag} from './storage-drag';
import {playerProfile} from './player-profile';
import {hideItemTooltip,renderItemSlot} from './item-slot';
import {characterAction} from './character-actions';
type Selection={uid:string;source:'storage'|'bag'};
/** Due pannelli simultanei. Ogni trasferimento viene validato dal dominio prima del salvataggio. */
export function storageWindow(character:Character,gold:number,onChange:()=>void):HTMLElement {
 const root=el('div','storage-window');let selected:Selection|null=null;
 const changed=()=>{hideItemTooltip();selected=null;onChange();render();};
 const transfer=(selection:Selection,target:'storage'|'bag',index?:number)=>{
  let moved=false;
  if(target==='bag'&&selection.source==='storage')moved=characterAction({kind:'withdraw',uid:selection.uid},()=>withdrawItem(character,selection.uid));
  else if(target==='storage')moved=selection.source==='bag'?characterAction({kind:'deposit',uid:selection.uid,target:index},()=>depositItem(character,selection.uid,index)):index!==undefined&&characterAction({kind:'move_storage',uid:selection.uid,target:index},()=>moveStorageItem(character,selection.uid,index));
  if(moved)changed();return moved;
 };
 const render=()=>{
  root.replaceChildren();
  const left=el('section','storage-panel');left.setAttribute('aria-label','Deposito personale');
  const slots=storageSlots(character),grid=el('div','storage-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','20 slot del deposito');
  left.append(el('h3','','Deposito'),el('p','storage-count',`${character.storage.length} / ${STORAGE_CAPACITY} oggetti`));
  const bindItem=(button:HTMLButtonElement,item:Item,source:Selection['source'])=>{
   button.dataset.transferUid=item.uid;button.dataset.transferSource=source;
   storageDrag(button,root,target=>{
    const area=target.dataset.dropArea;if(area!=='bag'&&area!=='storage')return;
    const index=target.dataset.dropIndex===undefined?undefined:Number(target.dataset.dropIndex);transfer({uid:item.uid,source},area,index);
   });
   button.addEventListener('click',()=>{selected={uid:item.uid,source};root.querySelectorAll('.is-transfer-selected').forEach(node=>node.classList.remove('is-transfer-selected'));button.classList.add('is-transfer-selected');status.textContent=`${itemName(item)}: trascina verso una casella libera oppure usa Sposta.`;move.disabled=source==='bag'&&character.storage.length>=STORAGE_CAPACITY;});
   button.addEventListener('dblclick',()=>transfer({uid:item.uid,source},source==='bag'?'storage':'bag'));
  };
  const bindEmpty=(cell:HTMLElement,target:'storage'|'bag',index?:number)=>{
   cell.dataset.dropArea=target;if(index!==undefined)cell.dataset.dropIndex=String(index);
   cell.addEventListener('click',()=>{if(selected)transfer(selected,target,index);});
  };
  slots.forEach((item,index)=>{const cell=el('div','storage-cell');cell.setAttribute('aria-label',`Deposito · slot ${index+1}${item?' occupato':' libero'}`);cell.append(el('span','storage-slot-number',String(index+1)));
   if(item){const button=renderItemSlot(item,{characterClass:character.characterClass});if(button){bindItem(button,item,'storage');cell.append(button);}}
   else bindEmpty(cell,'storage',index);grid.append(cell);
  });
  const status=el('p','storage-help','Trascina gli oggetti nelle caselle libere. Doppio clic o selezione e Sposta sono disponibili anche senza trascinamento.');status.setAttribute('role','status');
  const move=el('button','relic-button storage-move','Sposta nell’altro pannello');move.disabled=true;move.onclick=()=>{if(selected)transfer(selected,selected.source==='bag'?'storage':'bag');};
  left.append(grid,status,move);
  // Salvataggi antecedenti al limite: nessun pezzo eccedente viene cancellato.
  const visible=new Set(slots.flatMap(item=>item?[item.uid]:[]));
  for(const item of character.storage.filter(item=>!visible.has(item.uid))){const reclaim=el('button','relic-button',`Recupera oggetto precedente · ${itemName(item)}`);reclaim.onclick=()=>transfer({uid:item.uid,source:'storage'},'bag');left.append(reclaim);}
  const right=el('section','storage-backpack');right.setAttribute('aria-label','Personaggio e zaino');
  right.append(playerProfile(character,gold,{
   includeEmptyPage:true,
   onItem:(button,item)=>bindItem(button,item,'bag'),
   onCell:(cell,_index,item)=>{if(!item)bindEmpty(cell,'bag');},
   onEquipmentChange:changed,
  }));root.append(left,right);
 };
 render();return root;
}
