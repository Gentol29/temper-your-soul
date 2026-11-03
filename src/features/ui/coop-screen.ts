import { el, requireElement } from './dom';
import { HUB_NETWORK } from '../network/hub-protocol';
import { NETWORK } from '../network/protocol';
import { inviteTarget } from './menu-model';

/**
 * Schermata della cooperativa: il riquadro del party (stesso codice di quello nel rifugio) piu' l'ingresso con un
 * invito e il promemoria di come si gioca insieme. Le regole del gruppo restano sul server.
 */
export class CoopScreen {
  /** Dove si appoggia il riquadro del party finche' questa schermata e' aperta. */
  readonly slot = requireElement('coop-party-slot');
  private readonly input = requireElement<HTMLInputElement>('coop-invite');
  private readonly message = requireElement('coop-invite-message');
  private readonly join = requireElement<HTMLButtonElement>('coop-join');
  private problem = '';

  constructor(handlers: { readonly onJoin: (code: string) => void; readonly onBack: () => void }) {
    requireElement('coop-title').textContent = `Scendete insieme, fino a ${NETWORK.capacity}`;
    requireElement('coop-back').addEventListener('click', handlers.onBack);
    requireElement('coop-join-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const target = inviteTarget(this.input.value, location.origin);
      if (target === null) {
        this.problem = this.message.textContent = 'Incolla il link ricevuto dal tuo gruppo.';
        this.input.focus();
        return;
      }
      this.problem = '';
      // Un link di un altro indirizzo porta a un altro server: si apre, come quando lo si clicca.
      if (target.kind === 'open') location.assign(target.url);
      else handlers.onJoin(target.code);
    });
    this.input.addEventListener('input', () => { this.problem = ''; });
    requireElement('coop-steps').replaceChildren(...[
      ['Crea o entra', 'Crea un party e copia il link. Con il link di un amico entri nel suo rifugio come ospite.'],
      ['Formate il gruppo', `Fino a ${HUB_NETWORK.capacity} nel rifugio, ${NETWORK.capacity} nel party. Chi è nel party si avvicina a un ospite, preme E e lo invita.`],
      ['Partite dal portale', 'Gli altri segnano Pronto, poi il leader sceglie il dungeon.'],
      ['Scambi con doppia conferma', 'Ognuno offre i suoi oggetti e conferma due volte. Ogni modifica annulla le conferme.'],
    ].map(([title, text]) => {
      const step = el('li');
      step.append(el('b', '', title), el('span', '', text));
      return step;
    }));
  }

  /** Allinea l'ingresso con invito allo stato della connessione: con un gruppo gia' attivo non serve un altro link. */
  sync(state: { readonly connecting: boolean; readonly online: boolean; readonly failed: boolean }): void {
    const open = !state.connecting && !state.online;
    if (state.online) this.problem = '';
    this.input.disabled = !open;
    this.join.disabled = !open;
    this.join.title = state.online ? 'Sei già collegato: torna in singolo per usare un altro invito.' : '';
    const text = state.connecting ? 'Connessione al rifugio del gruppo…' : this.problem || (state.failed ? 'Collegamento interrotto: controlla il link o riprova.' : '');
    if (this.message.textContent !== text) this.message.textContent = text;
  }
}
