/** Cosa il server dichiara sull'accesso (`/online-config`). */
export interface OnlineConfig {
  /** Email e password si inseriscono nel gioco. */
  readonly passwordLogin: boolean;
  /** Pagina di accesso di un provider esterno; vuota se non configurata. */
  readonly loginUrl: string;
}

export type ConfigState = OnlineConfig | 'loading' | 'unreachable';

export function parseOnlineConfig(raw: unknown): OnlineConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Configurazione di accesso non valida.');
  const data = raw as Record<string, unknown>;
  return { passwordLogin: data.passwordLogin === true, loginUrl: typeof data.loginUrl === 'string' ? data.loginUrl : '' };
}

/** Le tappe prima del gioco, sempre in quest'ordine: account, personaggio, mondo. */
export type AccessStage = 'login' | 'creation' | 'world';

export interface AccessState {
  /** C'e' una sessione dell'account. */
  readonly authenticated: boolean;
  /** Il server ha verificato l'account e attende la scelta o la creazione del personaggio. */
  readonly characterRequired: boolean;
  /** Il personaggio e' nel mondo condiviso. */
  readonly inWorld: boolean;
  /** Prova locale senza server: personaggi del browser, nessun mondo condiviso. */
  readonly offline?: boolean;
}

/** Senza sessione non si arriva mai alla creazione: l'autenticazione precede il personaggio. */
export function accessStage(state: AccessState): AccessStage {
  if (state.offline) return 'world';
  if (!state.authenticated) return 'login';
  if (state.inWorld) return 'world';
  return state.characterRequired ? 'creation' : 'login';
}

/** La modalita' offline serve solo alle prove in locale (Vite su localhost o `dist/index.html` aperto da file). */
export function offlineAllowed(hostname: string): boolean {
  return ['', 'localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost');
}

/** Cosa mostra la schermata di accesso. */
export type LoginView = 'loading' | 'unreachable' | 'unconfigured' | 'password' | 'provider' | 'entering' | 'reconnect';

export function loginView(config: ConfigState, link: { readonly authenticated: boolean; readonly connecting: boolean }): LoginView {
  // Con una sessione le credenziali non si chiedono di nuovo: si sta entrando, oppure l'ingresso non e' riuscito.
  if (link.authenticated) return link.connecting ? 'entering' : 'reconnect';
  if (config === 'loading' || config === 'unreachable') return config;
  if (config.passwordLogin) return 'password';
  return config.loginUrl ? 'provider' : 'unconfigured';
}
