import type { MenuSceneFocus } from '../presentation/menu-scene';
import { NETWORK } from '../network/protocol';

/** I comandi del menu principale. */
export type MenuActionId = 'continue' | 'new_character' | 'settings' | 'dungeons' | 'characters' | 'inventory' | 'storage' | 'forge' | 'merchant' | 'coop';

export interface MenuEntry {
  readonly id: MenuActionId;
  readonly label: string;
  /** Tooltip breve: dice cosa fa il comando. */
  readonly hint: string;
  /** Il punto del rifugio che si illumina quando il comando e' selezionato. */
  readonly scene: MenuSceneFocus | null;
  /** Perche' il comando non e' disponibile; `null` se lo e'. */
  readonly unavailable: string | null;
}

export interface MenuContext {
  /** Nome del personaggio attivo; `null` se non ne esiste uno completo. */
  readonly characterName: string | null;
  /** C'e' un invito aperto in attesa di un personaggio. */
  readonly inviteWaiting: boolean;
  /** Il profilo attivo ha progressi ma nome, sesso o classe ancora da scegliere. */
  readonly incomplete?: boolean;
}

const NEEDS_CHARACTER = 'Crea prima un personaggio.';
const NEEDS_COMPLETION = 'Completa prima il tuo personaggio.';

/** Le tre azioni principali. Senza personaggi resta disponibile solo cio' che serve a crearne uno. */
export function primaryEntries(context: MenuContext): readonly MenuEntry[] {
  const name = context.characterName;
  return [
    context.incomplete === true ? { id: 'continue', label: 'Completa personaggio', hint: 'Scegli nome, sesso e classe: oggetti e progressi restano.', scene: 'hero', unavailable: null } :
    { id: 'continue', label: 'Continua', hint: name === null ? 'Entra nel rifugio.' : `Entra nel rifugio con ${name}.`, scene: 'hero', unavailable: name === null ? NEEDS_CHARACTER : null },
    { id: 'new_character', label: 'Nuovo personaggio', hint: 'Scegli nome, sesso e classe.', scene: 'hero', unavailable: null },
    { id: 'settings', label: 'Impostazioni', hint: 'Audio, schermo e comandi.', scene: null, unavailable: null },
  ];
}

/** Gli accessi secondari: portano nei luoghi del rifugio, nello stesso ordine del ciclo di gioco. */
export function secondaryEntries(context: MenuContext): readonly MenuEntry[] {
  const lock = context.characterName !== null ? null : context.incomplete === true ? NEEDS_COMPLETION : NEEDS_CHARACTER;
  return [
    { id: 'dungeons', label: 'Scegli dungeon', hint: 'Apri il portale e scegli dove scendere.', scene: 'portal', unavailable: lock },
    { id: 'characters', label: 'Personaggi', hint: 'Scegli o crea un personaggio.', scene: 'hero', unavailable: null },
    { id: 'inventory', label: 'Inventario', hint: 'Equipaggiamento e zaino del personaggio.', scene: 'hero', unavailable: lock },
    { id: 'storage', label: 'Deposito', hint: 'Conserva gli oggetti fuori dallo zaino.', scene: 'storage', unavailable: lock },
    { id: 'forge', label: 'Forgia', hint: 'Crea equipaggiamento Non comune con l’oro.', scene: 'forge', unavailable: lock },
    { id: 'merchant', label: 'Mercante', hint: 'Compra equipaggiamento Comune di base.', scene: 'merchant', unavailable: lock },
    { id: 'coop', label: 'Cooperativa', hint: `Gioca in gruppo, fino a ${NETWORK.capacity} giocatori.`, scene: 'gate', unavailable: lock === null ? null : context.inviteWaiting ? 'Crea un personaggio per accettare l’invito.' : lock },
  ];
}

export type NavigationKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export function isNavigationKey(code: string): code is NavigationKey {
  return code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight';
}

/**
 * Selezione da tastiera su righe di comandi: su e giu' cambiano riga restando nella stessa colonna, se c'e'; sinistra e
 * destra scorrono la riga. Ai bordi si riparte dall'altro capo. Restituisce l'id da selezionare.
 */
export function moveSelection(rows: readonly (readonly string[])[], current: string, key: NavigationKey): string {
  const rowIndex = rows.findIndex((row) => row.includes(current));
  if (rowIndex < 0) return rows[0]?.[0] ?? current;
  const row = rows[rowIndex]!, column = row.indexOf(current);
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const step = key === 'ArrowLeft' ? -1 : 1;
    return row[(column + step + row.length) % row.length]!;
  }
  const step = key === 'ArrowUp' ? -1 : 1;
  const next = rows[(rowIndex + step + rows.length) % rows.length]!;
  return next[Math.min(column, next.length - 1)]!;
}

/** Il codice di un invito: da un link con `?party=` o scritto da solo. `null` se il testo non ne contiene uno. */
export function parseInviteCode(text: string): string | null {
  const value = text.trim();
  if (value === '') return null;
  const isCode = (code: string | null): code is string => code !== null && /^[a-z0-9-]{6,64}$/i.test(code);
  if (isCode(value)) return value;
  try {
    const code = new URL(value).searchParams.get('party');
    return isCode(code) ? code : null;
  } catch {
    return null;
  }
}

/** Che cosa fare di un invito incollato: entrare da qui, oppure aprirlo se porta a un altro indirizzo. */
export function inviteTarget(text: string, origin: string): { readonly kind: 'join'; readonly code: string } | { readonly kind: 'open'; readonly url: string } | null {
  const code = parseInviteCode(text);
  if (code === null) return null;
  try {
    const url = new URL(text.trim());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin) return { kind: 'open', url: url.href };
  } catch {
    // Solo il codice, senza indirizzo: vale per il server corrente.
  }
  return { kind: 'join', code };
}

/** Stato sintetico della connessione, per il riquadro in fondo al menu. */
export function connectionLabel(state: { readonly connecting: boolean; readonly online: boolean; readonly latency: number | null; readonly failed: boolean }): { readonly text: string; readonly tone: 'idle' | 'busy' | 'ok' | 'bad' } {
  if (state.connecting) return { text: 'Connessione…', tone: 'busy' };
  if (state.online) return { text: state.latency === null ? 'Online' : `Online · ${state.latency} ms`, tone: 'ok' };
  if (state.failed) return { text: 'Connessione persa', tone: 'bad' };
  return { text: 'Gioco in singolo', tone: 'idle' };
}

/**
 * Cosa manca per partire in cooperativa, in una frase. Come sul server (`PartyRoom.startFromPortal`) il leader non deve
 * dichiararsi pronto e un gruppo incompleto puo' partire: basta che gli altri membri siano pronti.
 */
export function partyReadiness(members: readonly { readonly id: string; readonly name: string; readonly ready: boolean }[], leaderId: string, capacity: number): string {
  if (members.length === 0) return 'Nessun gruppo: crea un party per partire insieme.';
  const seats = `${members.length}/${capacity}`;
  const waiting = members.filter((member) => member.id !== leaderId && !member.ready).map((member) => member.name);
  if (waiting.length > 0) return `Gruppo ${seats} · non ancora pronti: ${waiting.join(', ')}.`;
  return members.length < capacity ? `Gruppo incompleto ${seats} · il leader può già partire dal portale.` : `Gruppo completo ${seats} · il leader può partire dal portale.`;
}
