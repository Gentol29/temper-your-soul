import './style.css';
import { Game } from './game';
import { requireElement } from './features/ui/dom';
import './features/ui/pixel-type.css';
import './features/ui/dungeon-cards.css';

const game = new Game(requireElement<HTMLCanvasElement>('game'));
game.start();

// Solo con il server di sviluppo: espone il gioco in console (`__game`) per provare i flussi che richiedono tempo,
// come la vittoria. Nella build di produzione il valore e' falso e questo ramo sparisce.
if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true) {
  (window as unknown as { __game: Game }).__game = game;
}
