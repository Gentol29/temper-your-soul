import { describe, expect, it } from 'vitest';
import { accessStage, loginView, offlineAllowed, parseOnlineConfig } from './access-model';

const password = { passwordLogin: true, loginUrl: '' };

describe('ordine dell\'accesso: account, personaggio, mondo', () => {
  it('senza sessione si resta all\'accesso, qualunque cosa dica la connessione', () => {
    expect(accessStage({ authenticated: false, characterRequired: false, inWorld: false })).toBe('login');
    expect(accessStage({ authenticated: false, characterRequired: true, inWorld: false })).toBe('login');
    expect(accessStage({ authenticated: false, characterRequired: true, inWorld: true })).toBe('login');
  });

  it('la creazione si apre solo dopo che il server ha verificato l\'account e non ha trovato un personaggio', () => {
    expect(accessStage({ authenticated: true, characterRequired: false, inWorld: false })).toBe('login');
    expect(accessStage({ authenticated: true, characterRequired: true, inWorld: false })).toBe('creation');
  });

  it('nel mondo si entra con account e personaggio', () => {
    expect(accessStage({ authenticated: true, characterRequired: false, inWorld: true })).toBe('world');
  });

  it('la prova offline entra senza account, ma solo su localhost o da file', () => {
    expect(accessStage({ authenticated: false, characterRequired: false, inWorld: false, offline: true })).toBe('world');
    for (const host of ['', 'localhost', '127.0.0.1', '[::1]', 'gioco.localhost']) expect(offlineAllowed(host)).toBe(true);
    for (const host of ['temper.example', '192.168.1.5', 'localhost.example.com']) expect(offlineAllowed(host)).toBe(false);
  });
});

describe('schermata di accesso', () => {
  const anonymous = { authenticated: false, connecting: false };

  it('chiede subito email e password quando il server le prevede', () => {
    expect(loginView(password, anonymous)).toBe('password');
  });

  it('con un provider esterno propone la sua pagina; senza configurazione lo dice', () => {
    expect(loginView({ passwordLogin: false, loginUrl: 'https://identity.example/login' }, anonymous)).toBe('provider');
    expect(loginView({ passwordLogin: false, loginUrl: '' }, anonymous)).toBe('unconfigured');
  });

  it('prima della risposta del server attende, e segnala il server non raggiungibile', () => {
    expect(loginView('loading', anonymous)).toBe('loading');
    expect(loginView('unreachable', anonymous)).toBe('unreachable');
  });

  it('con una sessione non richiede le credenziali: ingresso in corso oppure da ritentare', () => {
    expect(loginView(password, { authenticated: true, connecting: true })).toBe('entering');
    expect(loginView(password, { authenticated: true, connecting: false })).toBe('reconnect');
    expect(loginView('unreachable', { authenticated: true, connecting: false })).toBe('reconnect');
  });
});

describe('configurazione dichiarata dal server', () => {
  it('legge solo i campi previsti', () => {
    expect(parseOnlineConfig({ passwordLogin: true, loginUrl: '', protocol: 22 })).toEqual(password);
    expect(parseOnlineConfig({ passwordLogin: 'true', loginUrl: 7 })).toEqual({ passwordLogin: false, loginUrl: '' });
  });

  it('rifiuta una risposta che non e\' un oggetto', () => {
    expect(() => parseOnlineConfig(null)).toThrow('non valida');
    expect(() => parseOnlineConfig([])).toThrow('non valida');
    expect(() => parseOnlineConfig('ok')).toThrow('non valida');
  });
});
