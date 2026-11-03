import './forge-menu.css';
import { requireElement, el } from './dom';
import { GAME_VERSION_LABEL } from '../../release-notes';
import { renderChangelog } from './changelog';
import { renderPixelIcon } from './pixel-icon';
import { FORGE_EMBLEM, MENU_ICONS } from '../presentation/menu-icons';
import { GOLD_COIN_SPRITE } from '../presentation/currency-sprites';
import type { MenuSceneFocus } from '../presentation/menu-scene';
import { isNavigationKey, moveSelection, primaryEntries, secondaryEntries, type MenuActionId, type MenuContext, type MenuEntry } from './menu-model';

/** I dati del personaggio mostrati nel riquadro del menu. */
export interface MenuCharacter {
  readonly name: string;
  readonly className: string;
  readonly level: number;
  readonly gold: number;
  readonly gearScore: number;
  /** Quanto manca al prossimo livello, da 0 a 1. */
  readonly levelProgress: number;
  /** Lo sprite del personaggio, disegnato da chi conosce il suo aspetto. */
  readonly figure: SVGSVGElement;
}

export type SaveIndicator = { readonly text: string; readonly detail: string; readonly tone: 'idle' | 'ok' | 'bad' };
export type ConnectionIndicator = { readonly text: string; readonly tone: 'idle' | 'busy' | 'ok' | 'bad' };

/** Un comando a forma di placca: normale, selezionato o non disponibile (resta raggiungibile per leggerne il motivo). */
function renderPlate(entry: MenuEntry, onAction: (id: MenuActionId) => void, onBlocked: (reason: string) => void, onFocus: (entry: MenuEntry | null) => void, primary: boolean): HTMLButtonElement {
  const button = el('button', `forge-plate${primary ? ' is-primary' : ''}`);
  button.type = 'button';
  button.dataset.menuAction = entry.id;
  button.append(renderPixelIcon(MENU_ICONS[entry.id]), el('span', 'forge-plate-label', entry.label));
  button.setAttribute('aria-description', entry.unavailable ?? entry.hint);
  if (entry.unavailable !== null) button.setAttribute('aria-disabled', 'true');
  button.addEventListener('click', () => {
    if (entry.unavailable !== null) onBlocked(entry.unavailable);
    else onAction(entry.id);
  });
  for (const type of ['mouseenter', 'focus'] as const) button.addEventListener(type, () => onFocus(entry));
  for (const type of ['mouseleave', 'blur'] as const) button.addEventListener(type, () => onFocus(null));
  return button;
}

/** Menu iniziale: logo, azioni e accessi al rifugio. Non conosce le regole: mostra lo stato che riceve ed espone i comandi. */
export class MainMenu {
  private readonly hero = requireElement('menu-hero');
  private readonly primary = requireElement('menu-primary');
  private readonly secondary = requireElement('menu-secondary');
  private readonly saveBox = requireElement('menu-save');
  private readonly connectionBox = requireElement('menu-connection');
  private readonly hint = requireElement('menu-hint');
  private rows: readonly (readonly string[])[] = [];
  private entries: readonly MenuEntry[] = [];

  constructor(private readonly handlers: {
    readonly onAction: (id: MenuActionId) => void;
    readonly onBlocked: (reason: string) => void;
    readonly onSceneFocus: (scene: MenuSceneFocus | null) => void;
  }) {
    requireElement('menu-version').textContent = GAME_VERSION_LABEL;
    requireElement('menu-emblem').append(renderPixelIcon(FORGE_EMBLEM));
    const notes = requireElement('menu-changelog-content');
    notes.replaceChildren(renderChangelog());
    requireElement('menu-changelog').addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        requireElement<HTMLDetailsElement>('menu-changelog').open = false;
        requireElement<HTMLElement>('menu-changelog-toggle').focus();
      }
    });
    requireElement('screen-menu').addEventListener('keydown', (event) => this.onKey(event));
  }

  private onKey(event: KeyboardEvent): void {
    if (!isNavigationKey(event.code) || !(document.activeElement instanceof HTMLElement)) return;
    const current = document.activeElement.dataset.menuAction;
    if (current === undefined) return;
    event.preventDefault();
    this.select(moveSelection(this.rows, current, event.code));
  }

  private select(id: string): void {
    requireElement('screen-menu').querySelector<HTMLElement>(`[data-menu-action="${id}"]`)?.focus();
  }

  /** Il tooltip di un comando sta in un solo punto libero; lasciato il mouse torna quello del comando selezionato. */
  private showEntry(entry: MenuEntry | null): void {
    const selected = document.activeElement instanceof HTMLElement ? this.entries.find((item) => item.id === (document.activeElement as HTMLElement).dataset.menuAction) : undefined;
    const shown = entry ?? selected ?? null;
    this.hint.textContent = shown === null ? '' : shown.unavailable ?? shown.hint;
    this.hint.classList.toggle('is-blocked', shown?.unavailable != null);
    this.handlers.onSceneFocus(shown?.scene ?? null);
  }

  /** Ridisegna il menu; la prima azione disponibile diventa la principale e riceve la selezione. */
  render(character: MenuCharacter | null, context: MenuContext): void {
    this.renderHero(character, context.incomplete === true);
    const primary = primaryEntries(context), secondary = secondaryEntries(context);
    const main = primary.find((entry) => entry.unavailable === null)?.id;
    this.entries = [...primary, ...secondary];
    const plate = (entry: MenuEntry, isMain: boolean) => renderPlate(entry, this.handlers.onAction, this.handlers.onBlocked, (focused) => this.showEntry(focused), isMain);
    this.primary.replaceChildren(...primary.map((entry) => plate(entry, entry.id === main)));
    this.secondary.replaceChildren(...secondary.map((entry) => plate(entry, false)));
    // Gli accessi stanno su due colonne: le frecce seguono la griglia che si vede.
    const griglia: string[][] = [];
    secondary.forEach((entry, index) => {
      if (index % 2 === 0) griglia.push([entry.id]);
      else griglia[griglia.length - 1]!.push(entry.id);
    });
    this.rows = [...primary.map((entry) => [entry.id]), ...griglia];
    // Con le impostazioni aperte la selezione resta nella loro finestra.
    if (main !== undefined && document.querySelector('#settings-panel:not(.hidden)') === null) this.select(main);
  }

  private renderHero(character: MenuCharacter | null, incomplete: boolean): void {
    if (character === null) {
      const empty = el('div', 'menu-hero-empty');
      empty.append(el('h2', 'menu-hero-name', incomplete ? 'Personaggio da completare' : 'Nessun personaggio'), el('p', 'menu-hero-line', incomplete ? 'Scegli nome, sesso e classe: oggetti e progressi restano.' : 'Forgia il primo: nome, sesso e classe restano per sempre.'));
      this.hero.replaceChildren(empty);
      return;
    }
    const stats = el('p', 'menu-hero-stats');
    const gold = el('span', 'menu-hero-stat');
    gold.append(renderPixelIcon(GOLD_COIN_SPRITE), el('span', 'forge-screen-reader', 'Oro'), el('b', '', character.gold.toLocaleString('it-IT')));
    const gear = el('span', 'menu-hero-stat');
    gear.append(el('small', '', 'GS'), el('b', '', String(character.gearScore)));
    stats.append(gold, gear);
    const figure = el('div', 'menu-hero-figure');
    figure.append(character.figure);
    const xp = el('div', 'menu-hero-xp'), fill = el('i');
    fill.style.width = `calc(${Math.round(character.levelProgress * 100)}% - 2px)`;
    xp.setAttribute('role', 'img');
    xp.setAttribute('aria-label', `Esperienza verso il livello ${character.level + 1}: ${Math.round(character.levelProgress * 100)}%`);
    xp.append(fill);
    const identity = el('div', 'menu-hero-identity');
    const name = el('h2', 'menu-hero-name', character.name);
    name.title = character.name;
    identity.append(name, el('p', 'menu-hero-line', `${character.className} · Livello ${character.level}`), xp);
    this.hero.replaceChildren(figure, identity, stats);
  }

  setSave(indicator: SaveIndicator): void {
    this.saveBox.textContent = indicator.text;
    this.saveBox.title = indicator.detail;
    this.saveBox.dataset.tone = indicator.tone;
  }

  setConnection(indicator: ConnectionIndicator): void {
    if (this.connectionBox.textContent !== indicator.text) this.connectionBox.textContent = indicator.text;
    this.connectionBox.dataset.tone = indicator.tone;
  }
}
