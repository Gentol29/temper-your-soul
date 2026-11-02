import { requireElement } from './dom';

/** Pulsante e comando per lo schermo intero; se il browser lo rifiuta suggerisce F11. */
export class FullscreenToggle {
  private readonly button = requireElement('fullscreen-button');

  constructor(private readonly onChange: () => void) {
    this.button.addEventListener('click', () => void this.toggle());
    document.addEventListener('fullscreenchange', () => {
      const label=document.fullscreenElement ? 'Esci da schermo intero' : 'Schermo intero';
      this.button.setAttribute('aria-label',label);this.button.title=label+' · F';
      this.button.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));
      this.onChange();
    });
  }

  async toggle(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      this.button.title = 'Usa F11 nel browser';
    }
  }
}
