import './forge-window.css';
import type { Character } from '../character/character';
import type { CharacterRoster } from '../character/character-roster';
import { STARTER_SETS } from '../character/creation';
import { acquireBasic, upgradeItem, HUB_PRICES } from '../character/hub-services';
import { el } from './dom';
import { hubOffer } from './hub-offer';
import { hideItemTooltip } from './item-slot';
import { characterAction } from './character-actions';

const TABS = [{ id: 'forge', label: 'Forgia' }, { id: 'smith', label: 'Fabbro' }] as const;

/** Un solo ingresso dalla mappa; creazione e migliorie riusano le regole e i prezzi del dominio. */
export function forgeWindow(character: Character, roster: CharacterRoster, onChanged: () => void): HTMLElement {
  const root = el('section', 'hub-forge-window'), tablist = el('div', 'hub-forge-tabs');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Servizi della forgia');
  const tabs: HTMLButtonElement[] = [], panes: HTMLElement[] = [];
  let selected = 0;

  const refresh = (): void => {
    const pane = panes[selected]!, list = el('div', 'hub-offer-list');
    const changed = (run: () => boolean): void => {
      if (!run()) return;
      hideItemTooltip(); onChanged(); refresh(); tabs[selected]!.focus();
    };
    pane.replaceChildren(el('p', 'hub-service-wallet', `Oro disponibile · ${roster.gold}`));
    if (TABS[selected]!.id === 'smith') {
      pane.append(el('p', 'hub-service-note', 'Ogni miglioria: +5% alle statistiche passive dell’oggetto e +2% attacco. Massimo +5.'));
      for (const item of character.inventory) {
        const next = (item.upgrade ?? 0) + 1, cost = HUB_PRICES.upgrade * next, max = next > HUB_PRICES.maxUpgrade;
        list.append(hubOffer(item, {
          characterClass: character.characterClass,
          note: max ? 'Miglioria massima raggiunta.' : `Miglioria +${item.upgrade ?? 0} → +${next}`,
          label: max ? 'Massimo +5' : `Migliora · ${cost} oro`,
          disabled: max || roster.gold < cost,
          action: () => changed(() => characterAction({kind:'upgrade',uid:item.uid},()=>upgradeItem(roster, character, item.uid))),
        }));
      }
      if (character.inventory.length === 0) list.append(el('p', '', 'Nessun oggetto da migliorare nello zaino.'));
    } else {
      pane.append(el('p', 'hub-service-note', 'Crea equipaggiamento Non comune di classe. Costo in oro.'));
      STARTER_SETS[character.characterClass ?? 'mage'].forEach((familyId, slot) => list.append(hubOffer(
        { uid: `preview-${slot}`, familyId, rarity: 'uncommon' }, {
          characterClass: character.characterClass, note: 'Non comune · Livello oggetto 1',
          label: `Crea · ${HUB_PRICES.craft} oro`, disabled: roster.gold < HUB_PRICES.craft,
          action: () => changed(() => characterAction({kind:'craft',slot},()=>acquireBasic(roster, character, slot, true))),
        },
      )));
    }
    pane.append(list);
  };
  const select = (index: number): void => {
    hideItemTooltip(); selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1;
      panes[i]!.hidden = i !== index;
    });
    refresh();
  };

  TABS.forEach(({ id, label }, index) => {
    const tab = el('button', 'relic-button secondary hub-forge-tab', label), pane = el('section', 'hub-forge-pane');
    tab.type = 'button'; tab.id = `hub-forge-tab-${id}`;
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `hub-forge-pane-${id}`);
    pane.id = `hub-forge-pane-${id}`; pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code)) return;
      event.preventDefault(); event.stopPropagation();
      const next = event.code === 'Home' ? 0 : event.code === 'End' ? TABS.length - 1 : (index + 1) % TABS.length;
      select(next); tabs[next]!.focus();
    });
    tabs.push(tab); panes.push(pane); tablist.append(tab);
  });
  root.append(tablist, ...panes); select(0);
  return root;
}
