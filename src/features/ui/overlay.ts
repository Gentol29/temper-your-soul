import { requireElement } from './dom';

/** Contenuto di una schermata sopra il gioco (pausa, fine partita). */
interface OverlayScreen {
  readonly tag: string;
  readonly title: string;
  readonly text: string;
  readonly button: string;
  /** Pulsante secondario (es. "Torna al menu"). */
  readonly secondary: string;
  /** Contenuto aggiuntivo (es. gli oggetti ottenuti). */
  readonly extra?: HTMLElement | null;
}

/** Schermate di testo sopra il canvas durante una partita. Non conosce le regole: riceve cio' che deve mostrare. */
export class Overlay {
  private readonly root = requireElement('overlay');
  private readonly tag = requireElement('overlay-tag');
  private readonly title = requireElement('overlay-title');
  private readonly text = requireElement('overlay-text');
  private readonly extra = requireElement('overlay-extra');
  private readonly button = requireElement('overlay-button');
  private readonly secondary = requireElement('overlay-secondary');

  /** Collega le azioni dei due pulsanti. */
  onButtons(primary: () => void, secondary: () => void): void {
    this.button.addEventListener('click', primary);
    this.secondary.addEventListener('click', secondary);
  }

  showPaused(dungeonName: string): void {
    this.show({
      tag: `PAUSA · ${dungeonName.toUpperCase()}`,
      title: 'Il tempo si ferma.',
      text: 'Riprendi quando sei pronto.',
      button: 'Riprendi →',
      secondary: 'Abbandona e torna al menu',
    });
    // Solo la pausa usa la placca di ferro del rifugio (forge-menu.css); la fine partita conserva il suo stile.
    this.root.classList.add('is-paused');
  }

  /**
   * Fine dell'incontro. Il titolo grande dice l'esito; il resto (statistiche, ricompense, cause della sconfitta) arriva
   * gia' composto in `extra` (vedi `end-screen.ts`). La variante colora la schermata.
   */
  showEnded(options: { readonly won: boolean; readonly dungeonName: string; readonly extra?: HTMLElement | null }): void {
    const { won, dungeonName, extra } = options;
    this.show({
      tag: `${won ? 'DUNGEON COMPLETATO' : 'SCONFITTA'} · ${dungeonName.toUpperCase()}`,
      title: won ? 'Vittoria' : 'Sei caduto',
      text: '',
      button: 'Riprova →',
      secondary: 'Torna al menu',
      extra,
    });
    this.root.classList.toggle('is-victory', won);
    this.root.classList.toggle('is-defeat', !won);
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private show(screen: OverlayScreen): void {
    this.tag.textContent = screen.tag;
    this.title.textContent = screen.title;
    this.text.textContent = screen.text;
    this.button.textContent = screen.button;
    this.secondary.textContent = screen.secondary;
    this.extra.replaceChildren();
    if (screen.extra) this.extra.append(screen.extra);
    this.root.classList.remove('hidden', 'is-victory', 'is-defeat', 'is-paused');
  }
}
