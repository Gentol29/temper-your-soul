import { requireElement } from './dom';
import { hideItemTooltip } from './item-slot';
import { hideLootTooltip } from './loot-tooltip';

/** Le schermate a pieno schermo fuori dalla partita. Accesso e party usano pannelli dedicati. */
export type ScreenId = 'menu' | 'characters' | 'dungeons' | 'inventory' | 'bestiary';

const IDS: readonly ScreenId[] = ['menu', 'characters', 'dungeons', 'inventory', 'bestiary'];

/** Mostra una sola schermata alla volta (o nessuna, durante la partita). */
export class Screens {
  private readonly roots = new Map<ScreenId, HTMLElement>(IDS.map((id) => [id, requireElement(`screen-${id}`)]));

  show(id: ScreenId | null): void {
    hideItemTooltip();
    hideLootTooltip();
    for (const [screen, root] of this.roots) root.classList.toggle('hidden', screen !== id);
    // Fuori dalla partita l'interfaccia di gioco (barre, skill) non serve.
    document.body.classList.toggle('in-menu', id !== null);
    requireElement('main-menu-button').classList.toggle('hidden',id==='menu');
  }
}
