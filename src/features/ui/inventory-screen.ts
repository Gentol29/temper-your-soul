import { characterAction } from './character-actions';
import { InputBindings } from '../../core/input-bindings';
import { renderAppearancePicker } from './appearance-picker';
import { renderCharacterPortrait } from './character-portrait';
import { equipInSlot } from './equipment-actions';
import type { Character } from '../character/character';
import { EQUIPMENT_SLOTS, SLOT_LABELS, slotIndex } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import type { Item } from '../items/item';
import { visibleInventory } from './inventory-view';
import { el, requireElement } from './dom';
import { hideItemTooltip, renderItemSlot } from './item-slot';
import { itemName } from '../items/item';
import { CLASS_LABELS } from '../character/character-class';

/**
 * Schermata dell'equipaggiamento: i 4 slot (uno per skill) e l'inventario. Cambiare un oggetto cambia la skill dello
 * slot. Non salva e non conosce le regole: ogni modifica passa da `Character` e avvisa con `onChange`.
 */
export class InventoryScreen {
  reset():void {this.pendingDiscard=null;this.selectedUid=null;this.draggedUid=null;this.character=null;hideItemTooltip();}
  private sorted = false;
  private draggedUid: string | null = null;
  private selectedUid: string | null = null;
  /** Oggetto di cui si e' chiesto di scartare e che attende la conferma (secondo clic). */
  private pendingDiscard: string | null = null;
  private character: Character | null = null;

  constructor(private readonly handlers: { readonly onChange: () => void; readonly onBack: () => void }, private readonly bindings = new InputBindings()) {
    bindings.changed.connect(()=>{if(this.character)this.renderSlots(this.character);});
    requireElement('inventory-back').addEventListener('click', () => {
      this.pendingDiscard = null;
      this.clearDrag();
      handlers.onBack();
    });
    requireElement('inventory-sort').addEventListener('click', () => {
      this.sorted = true;
      if (this.character) this.render(this.character);
    });
  }

  render(character: Character): void {
    hideItemTooltip();
    this.character = character;
    requireElement('inventory-appearance').replaceChildren(renderAppearancePicker(character));
    this.renderSlots(character);

    this.renderList(character);
    this.renderSelection(character);
  }

  private changed(): void {
    this.pendingDiscard = null;
    this.handlers.onChange();
    if (this.character !== null) this.render(this.character);
  }

  private renderSlots(character: Character): void {
    const root = requireElement('equipment-slots');
    root.replaceChildren(renderCharacterPortrait(character));
    for (const slot of EQUIPMENT_SLOTS) {
      const panel = el('div', 'slot-panel equipment-' + slot);
      panel.dataset.equipmentSlot = slot;
      panel.addEventListener('dragover', (event) => {
        const item = this.draggedUid ? character.itemByUid(this.draggedUid) : undefined;
        if (!item || !character.canEquip(item.uid) || familyById(item.familyId)?.slot !== slot) return;
        event.preventDefault();
        if(event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        panel.classList.add('drag-over');
      });
      panel.addEventListener('dragleave', (event) => {
        if (!(event.relatedTarget instanceof Node) || !panel.contains(event.relatedTarget)) panel.classList.remove('drag-over');
      });
      panel.addEventListener('drop', (event) => {
        event.preventDefault();
        const uid = this.draggedUid;
        this.clearDrag();
        if (uid && characterAction({kind:'equip',uid},()=>equipInSlot(character, uid, slot))) this.changed();
      });
      panel.append(el('div', 'slot-title', `${SLOT_LABELS[slot]} · ${this.bindings.labelForSlot(slotIndex(slot))}`));
      const equipped = character.equippedItem(slot);
      const card = equipped === null ? null : renderItemSlot(equipped, { badge: 'Equipaggiato',characterClass:character.characterClass });
      if (card === null) {
        panel.append(el('div', 'slot-empty', 'Vuoto: nessuna skill'));
      } else {
        card.addEventListener('click', () => {
          this.selectedUid = equipped?.uid ?? null;
          this.render(character);
        });
        panel.append(card);
        const remove = el('button', 'small-button', 'Rimuovi');
        remove.type = 'button';
        remove.addEventListener('click', () => {
          if(characterAction({kind:'unequip',slot},()=>character.unequip(slot)))this.changed();
        });
        panel.append(remove);
      }
      root.append(panel);
    }
  }

  private clearDrag(): void {
    this.draggedUid = null;
    hideItemTooltip();
    for(const panel of Array.from(requireElement('equipment-slots').children)) panel.classList.remove('drag-compatible', 'drag-over');
  }

  private renderList(character: Character): void {
    const root = requireElement('inventory-list');
    root.replaceChildren();
    const items = this.sorted ? visibleInventory(character.inventory, 'all') : character.inventory.filter(item => familyById(item.familyId) !== undefined);
    if (items.length === 0) {
      root.append(el('p', 'inventory-empty', 'Nessun oggetto qui. Sconfiggi i boss per ottenerne di nuovi.'));
      return;
    }
    for (const item of items) {
      const entry = this.renderEntry(character, item);
      if (entry !== null) root.append(entry);
    }
  }

  private renderEntry(character: Character, item: Item): HTMLElement | null {
    const family = familyById(item.familyId);
    if (family === undefined) return null;
    const equippedHere = character.equipped[family.slot] === item.uid;
    const slot = renderItemSlot(item, {
      characterClass:character.characterClass,
      ...(equippedHere ? { badge: 'Equipaggiato' } : {}),
      extraClass: this.selectedUid === item.uid ? 'is-selected' : '',
    });
    if (slot === null) return null;
    slot.draggable = character.canEquip(item.uid);
    slot.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.selectedUid = item.uid;
      if (characterAction({kind:'equip',uid:item.uid},()=>character.equip(item.uid))) this.changed();else this.render(character);
    });
    slot.addEventListener('dragstart', (event) => {
      if(!character.canEquip(item.uid)){event.preventDefault();return;}
      if(!event.dataTransfer) return;
      this.draggedUid = item.uid;
      hideItemTooltip();
      event.dataTransfer.setData('text/plain', item.uid);
      event.dataTransfer.effectAllowed = 'move';
      for(const panel of Array.from(requireElement('equipment-slots').querySelectorAll<HTMLElement>('[data-equipment-slot]'))) {
        panel.classList.toggle('drag-compatible', character.canEquip(item.uid)&&panel.dataset.equipmentSlot === family.slot);
      }
    });
    slot.addEventListener('dragend', () => this.clearDrag());
    slot.setAttribute('aria-pressed', String(this.selectedUid === item.uid));
    slot.addEventListener('click', () => {
      this.selectedUid = item.uid;
      this.pendingDiscard = null;
      // Non ricreare il bottone attivo: conserva focus, tooltip e navigazione da tastiera.
      for (const button of Array.from(requireElement('inventory-list').querySelectorAll('button'))) {
        const selected = button === slot;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      }
      this.renderSelection(character);
    });
    return slot;
  }

  private renderSelection(character: Character): void {
    const root = requireElement('inventory-selection');
    root.replaceChildren();
    const item = character.inventory.find((entry) => entry.uid === this.selectedUid);
    const family = item === undefined ? undefined : familyById(item.familyId);
    if (item === undefined || family === undefined) {
      root.append(el('small', '', 'Passa sopra un oggetto per i dettagli. Selezionalo per equipaggiarlo o scartarlo.'));
      return;
    }
    const equippedHere = character.equipped[family.slot] === item.uid;
    root.append(el('b', '', itemName(item)));
    if(!character.canEquip(item.uid))root.append(el('small','item-requirement',`Richiede la classe ${CLASS_LABELS[family.characterClass]}. Puoi conservarlo o scartarlo.`));
    const actions = el('div', 'item-actions');
    const equip = el('button', 'small-button primary', equippedHere ? 'Equipaggiato' : 'Equipaggia');
    equip.type = 'button';
    equip.disabled = equippedHere || !character.canEquip(item.uid);
    equip.addEventListener('click', () => {
      if (characterAction({kind:'equip',uid:item.uid},()=>character.equip(item.uid))) this.changed();
    });
    actions.append(equip);
    if (!equippedHere) {
      const confirming = this.pendingDiscard === item.uid;
      const discard = el('button', confirming ? 'small-button danger' : 'small-button', confirming ? 'Conferma: scarta' : 'Scarta');
      discard.type = 'button';
      discard.addEventListener('click', () => {
        if (!confirming) {
          this.pendingDiscard = item.uid;
          this.renderSelection(character);
          return;
        }
        if (characterAction({kind:'discard',uid:item.uid},()=>character.discard(item.uid))) this.changed();
      });
      actions.append(discard);
    }
    root.append(actions);
  }
}
