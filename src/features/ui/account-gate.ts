import { accountToken, beginAccountLogin, initializeAccountSession, logoutAccount } from '../network/account-session';
import type { CharacterSeed } from '../network/account-protocol';
import type { PartyClient } from '../network/party-client';
import { accessStage, loginView, offlineAllowed, parseOnlineConfig, type AccessStage, type ConfigState } from './access-model';
import { accountLoginForm } from './account-login-form';
import { applicationLoading } from './loading-indicator';
import { el, requireElement } from './dom';
import { renderPixelIcon } from './pixel-icon';
import { FORGE_EMBLEM } from '../presentation/menu-icons';
import './account-gate.css';

/**
 * La porta del gioco: prima l'account, poi il personaggio, poi il rifugio. Disegna la schermata di accesso, apre la
 * connessione appena c'e' una sessione e dice a `Game` in quale tappa ci si trova.
 */
export class AccountGate {
  private readonly root = requireElement('login-access');
  private config: ConfigState = 'loading';
  private note = '';
  private shown = '';
  private reported: AccessStage | null = null;
  private offline = false;

  constructor(private readonly client: PartyClient, private readonly onStage: (stage: AccessStage) => void) {}

  get stage(): AccessStage {
    return accessStage({ authenticated: Boolean(accountToken()), characterRequired: this.client.characterRequired, inWorld: this.client.state !== null, offline: this.offline });
  }

  /** Prova locale senza server: personaggi salvati nel browser, niente rifugio condiviso ne' cooperativa. */
  get isOffline(): boolean {
    return this.offline;
  }

  playOffline(): void {
    this.note = '';
    this.offline = true;
    this.client.leave();
    this.sync();
  }

  leaveOffline(): void {
    this.offline = false;
    this.shown = '';
    this.sync();
  }

  /** Legge un eventuale ritorno dal provider, chiede la configurazione al server e, se c'e' gia' una sessione, entra. */
  start(): void {
    requireElement('login-emblem').append(renderPixelIcon(FORGE_EMBLEM));
    initializeAccountSession();
    window.addEventListener('temper-your-soul:session-changed', () => this.enter());
    this.loadConfig();
    this.enter();
  }

  /** Sessione nuova o chiusa: si riparte sempre dall'accesso con il solo token, mai con un personaggio scelto prima. */
  private enter(): void {
    this.note = '';
    this.offline = false;
    this.client.leave();
    if (accountToken()) this.client.connect();
    this.sync();
  }

  /** Solo dopo che il server ha chiesto la creazione: l'account e' gia' verificato. */
  createCharacter(seed: CharacterSeed): void {
    this.note = '';
    this.client.connect(seed);
  }

  selectCharacter(id: string): void {
    this.note = '';
    this.client.connect(undefined, id);
  }

  chooseCharacters(): void {
    this.enter();
  }

  /** Il riquadro accanto alla creazione: ricorda che l'accesso e' fatto e a cosa resta legato il personaggio. */
  creationNote(gold: number): HTMLElement {
    const note = el('section', 'account-creation-note');
    note.setAttribute('aria-label', 'Account');
    note.append(el('span', 'eyebrow', 'ACCOUNT'), el('p', '', 'Personaggi e progressi salvati nell’account.'),
      el('p', '', `Oro condiviso: ${gold.toLocaleString('it-IT')}`));
    return note;
  }

  logout(): void {
    void applicationLoading().run('Uscita dall’account…', () => logoutAccount());
  }

  /** Un errore del server: sulla schermata di accesso si legge qui, non in un riquadro a parte. */
  problem(message: string): void {
    this.note = message;
    this.sync();
  }

  /** Da chiamare a ogni cambio di sessione o connessione: avvisa `Game` della tappa e aggiorna la schermata. */
  sync(): void {
    const stage = this.stage;
    if (stage !== this.reported) { this.reported = stage; this.onStage(stage); }
    if (stage === 'login') this.render();
  }

  private loadConfig(): void {
    this.config = 'loading';
    this.sync();
    void applicationLoading().run('Caricamento accesso…', async () => {
      const response = await fetch('/online-config', { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('Server non raggiungibile.');
      this.config = parseOnlineConfig(await response.json());
    }).catch(() => { this.config = 'unreachable'; }).finally(() => this.sync());
  }

  private openProvider(): void {
    void applicationLoading().run('Apertura accesso…', () => beginAccountLogin())
      .catch((error: unknown) => this.problem(error instanceof Error ? error.message : 'Accesso non riuscito.'));
  }

  private button(label: string, run: () => void, secondary = false): HTMLButtonElement {
    const button = el('button', `relic-button${secondary ? ' secondary' : ''}`, label);
    button.type = 'button';
    button.addEventListener('click', run);
    return button;
  }

  private render(): void {
    const view = loginView(this.config, { authenticated: Boolean(accountToken()), connecting: this.client.connecting });
    // Si ridisegna solo quando cambia cosa mostrare: chi sta scrivendo email e password non perde il testo.
    const key = `${view}|${this.note}`;
    if (key === this.shown) return;
    this.shown = key;
    const nodes: HTMLElement[] = [];
    const say = (text: string): void => { nodes.push(el('p', 'login-access-text', text)); };
    switch (view) {
      case 'loading': say('Caricamento accesso…'); break;
      case 'unreachable':
        say('Server non raggiungibile. Riprova fra poco.');
        nodes.push(this.button('Riprova', () => this.loadConfig()));
        break;
      case 'unconfigured':
        say('Accesso account non ancora configurato sul server.');
        nodes.push(this.button('Riprova', () => this.loadConfig()));
        break;
      case 'password': nodes.push(accountLoginForm()); break;
      case 'provider':
        say('Accedi con il tuo account per entrare nel rifugio.');
        nodes.push(this.button('Accedi', () => this.openProvider()));
        break;
      case 'entering': say('Caricamento personaggi…'); break;
      case 'reconnect': {
        say(this.note || 'Connessione al server interrotta.');
        const actions = el('div', 'login-access-actions');
        actions.append(this.button('Riconnetti', () => this.enter()), this.button('Esci dall’account', () => this.logout(), true));
        nodes.push(actions);
        break;
      }
    }
    if (this.note && view !== 'reconnect') {
      const note = el('p', 'login-access-note', this.note);
      note.setAttribute('role', 'alert');
      nodes.push(note);
    }
    if (view !== 'entering' && view !== 'reconnect' && offlineAllowed(location.hostname)) {
      nodes.push(this.button('Gioca offline (prova locale)', () => this.playOffline(), true));
    }
    this.root.replaceChildren(...nodes);
    // La selezione va al primo campo utile solo se la schermata e' visibile.
    if (this.root.offsetParent !== null) this.root.querySelector<HTMLElement>('input, button')?.focus();
  }
}
