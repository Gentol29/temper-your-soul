import { requireElement } from './dom';
import { GAME_VERSION_LABEL } from '../../release-notes';
import { renderChangelog } from './changelog';

/** Menu iniziale: titolo e le scelte. Non conosce le regole: espone solo i comandi. */
export class MainMenu {
  constructor(handlers: {
    readonly onDungeons: () => void;
  }) {
    requireElement('menu-dungeons').addEventListener('click', handlers.onDungeons);
    requireElement('menu-version').textContent = GAME_VERSION_LABEL;
    const notes = requireElement('menu-changelog-content');
    notes.replaceChildren(renderChangelog());
    requireElement('menu-changelog').addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        requireElement<HTMLDetailsElement>('menu-changelog').open = false;
        requireElement<HTMLElement>('menu-changelog-toggle').focus();
      }
    });
  }

  /** Mostra una nota sotto i pulsanti (es. stato del salvataggio). */
  setNote(text: string): void {
    requireElement('menu-note').textContent = text;
  }
}
