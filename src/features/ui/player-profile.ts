import type { Character } from '../character/character';
import { resolveCombatStats } from '../classes/class-stats';
import { levelProgress } from '../character/progression';
import { el } from './dom';
import { renderCharacterPortrait } from './character-portrait';
import type { Item } from '../items/item';
import { EQUIPMENT_SLOTS, SLOT_LABELS } from '../items/equipment-slot';
import { renderItemSlot } from './item-slot';
import { characterAction } from './character-actions';
/** Profilo consultabile in partita: nessuna modifica dell'equipaggiamento durante il combattimento. */
export interface PlayerProfileOptions {
 readonly showInventory?:boolean;
 readonly onItem?:(button:HTMLButtonElement,item:Item)=>void;
 readonly onCell?:(cell:HTMLElement,index:number,item:Item|undefined)=>void;
 readonly onEquipmentChange?:()=>void;
 readonly includeEmptyPage?:boolean;
}
export function playerProfile(character: Character, gold: number|null, options:PlayerProfileOptions={}): HTMLElement {
  const root=el('div','player-profile'), stats=resolveCombatStats(character.characterClass,character.loadout(),character.totalXp);
  const left=el('section','profile-stats');left.append(el('h2','',character.name ?? 'Profilo'));
  for(const [label,value] of [['Livello',levelProgress(character.totalXp).level],['HP',stats.maxHealth],['MP',stats.maxMana],['Difesa',stats.armor],['Attacco',`${Math.round((1+stats.abilityPower)*100)}%`],...(gold===null?[]:[['Oro condiviso',gold]])]) {
    left.append(el('p','',`${label} · ${value}`));
  }
  const center=el('div','profile-portrait');center.append(renderCharacterPortrait(character));
  const equipment=el('div','profile-equipment');
  for(const slot of EQUIPMENT_SLOTS){const cell=el('div','profile-equipment-slot'),item=character.equippedItem(slot);cell.append(el('span','',SLOT_LABELS[slot]));
    if(item){const button=renderItemSlot(item,{characterClass:character.characterClass,badge:'Equipaggiato'});if(button)cell.append(button);
      if(options.onEquipmentChange){const remove=el('button','relic-button small-button','Rimuovi');remove.onclick=()=>{if(characterAction({kind:'unequip',slot},()=>character.unequip(slot)))options.onEquipmentChange!();};cell.append(remove);}
    }else cell.append(el('div','profile-cell','—'));equipment.append(cell);
  }
  const figure=el('section','profile-figure');figure.append(center,equipment);
  if(options.showInventory===false){root.classList.add('player-profile-public');root.append(left,figure);return root;}
  const right=el('section','');right.append(el('h2','','Zaino'));
  const grid=el('div','profile-grid');
  const unequipped=character.inventory.filter(item=>!Object.values(character.equipped).includes(item.uid));
  let page=0;
  const draw=()=>{grid.replaceChildren();
  for(let i=0;i<9;i++) {const cell=el('div','profile-cell'), item=unequipped[page*9+i];if(item){const slot=renderItemSlot(item,{characterClass:character.characterClass});if(slot){cell.append(slot);options.onItem?.(slot,item);
    if(options.onEquipmentChange){const equip=()=>{if(characterAction({kind:'equip',uid:item.uid},()=>character.equip(item.uid)))options.onEquipmentChange!();};slot.addEventListener('dblclick',equip);slot.addEventListener('contextmenu',event=>{event.preventDefault();equip();});}
  }}else cell.setAttribute('aria-label',`Casella ${i+1} vuota`);options.onCell?.(cell,page*9+i,item);grid.append(cell);}
  };draw();
  right.append(grid);
  const totalPages=Math.max(1,Math.ceil((unequipped.length+(options.includeEmptyPage?1:0))/9));
  if(totalPages>1){const pages=el('div','profile-pages');const previous=el('button','relic-button','←'),next=el('button','relic-button','→'),label=el('span','');previous.setAttribute('aria-label','Pagina precedente');next.setAttribute('aria-label','Pagina successiva');const update=()=>{label.textContent=`${page+1} / ${totalPages}`;previous.disabled=page===0;next.disabled=page+1>=totalPages;draw();};previous.onclick=()=>{page--;update();};next.onclick=()=>{page++;update();};pages.append(previous,label,next);right.append(pages);update();}
  root.append(left,figure,right);return root;
}
