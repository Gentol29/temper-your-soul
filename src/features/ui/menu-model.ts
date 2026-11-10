import type { MenuSceneFocus } from '../presentation/menu-scene';

/** I comandi del menu principale. */
export type MenuActionId = 'continue' | 'settings' | 'characters' | 'logout';

export interface MenuEntry {
  readonly id: MenuActionId;
  readonly label: string;
  /** Descrizione accessibile breve: dice cosa fa il comando. */
  readonly hint: string;
  /** Il punto del rifugio che si illumina quando il comando e' selezionato. */
  readonly scene: MenuSceneFocus | null;
  /** Perche' il comando non e' disponibile; `null` se lo e'. */
  readonly unavailable: string | null;
}

export interface MenuContext {
  /** Nome del personaggio attivo; `null` se non ne esiste uno completo. */
  readonly characterName: string | null;
  /** Il profilo attivo ha progressi ma nome, sesso o classe ancora da scegliere. */
  readonly incomplete?: boolean;
  readonly authenticated?:boolean;
}

const NEEDS_CHARACTER = 'Crea prima un personaggio.';

/** Le azioni principali. Il personaggio si crea una volta, subito dopo l'accesso: dal menu non se ne creano altri. */
export function primaryEntries(context: MenuContext): readonly MenuEntry[] {
  const name = context.characterName;
  return [
    context.incomplete === true ? { id: 'continue', label: 'Completa personaggio', hint: 'Scegli nome, sesso e classe: oggetti e progressi restano.', scene: 'hero', unavailable: null } :
    { id: 'continue', label: 'Entra', hint: name === null ? 'Entra nel rifugio.' : `Entra nel rifugio con ${name}.`, scene: 'hero', unavailable: name === null ? NEEDS_CHARACTER : null },
    { id: 'settings', label: 'Impostazioni', hint: 'Audio, schermo e comandi.', scene: null, unavailable: null },
    ...(context.authenticated ? [{id:'logout' as const,label:'Logout',hint:'Esci dal tuo account e dal mondo condiviso.',scene:null,unavailable:null}] : []),
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

/** Stato sintetico della connessione, per il riquadro in fondo al menu. */
export function connectionLabel(state: { readonly connecting: boolean; readonly online: boolean; readonly latency: number | null; readonly failed: boolean }): { readonly text: string; readonly tone: 'idle' | 'busy' | 'ok' | 'bad' } {
  if (state.connecting) return { text: 'Connessione…', tone: 'busy' };
  if (state.online) return { text: state.latency === null ? 'Online' : `Online · ${state.latency} ms`, tone: 'ok' };
  if (state.failed) return { text: 'Connessione persa', tone: 'bad' };
  return { text: 'Account non connesso', tone: 'idle' };
}
