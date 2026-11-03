import { describe, expect, it } from 'vitest';
import { connectionLabel, inviteTarget, moveSelection, parseInviteCode, partyReadiness, primaryEntries, secondaryEntries } from './menu-model';

const withCharacter = { characterName: 'Vesna', inviteWaiting: false };
const empty = { characterName: null, inviteWaiting: false };

describe('comandi del menu principale', () => {
  it('sono quelli del progetto, in italiano e nell\'ordine previsto', () => {
    expect(primaryEntries(withCharacter).map((entry) => entry.label)).toEqual(['Continua', 'Nuovo personaggio', 'Impostazioni']);
    expect(secondaryEntries(withCharacter).map((entry) => entry.label)).toEqual(['Scegli dungeon', 'Personaggi', 'Inventario', 'Deposito', 'Forgia', 'Mercante', 'Cooperativa']);
  });

  it('con un personaggio sono tutti disponibili e ognuno ha un tooltip', () => {
    for (const entry of [...primaryEntries(withCharacter), ...secondaryEntries(withCharacter)]) {
      expect(entry.unavailable, entry.id).toBeNull();
      expect(entry.hint.length, entry.id).toBeGreaterThan(0);
    }
    expect(primaryEntries(withCharacter)[0]!.hint).toContain('Vesna');
  });

  it('senza personaggi restano solo creazione, elenco e impostazioni, e chi e\' bloccato dice perche\'', () => {
    const entries = [...primaryEntries(empty), ...secondaryEntries(empty)];
    const open = entries.filter((entry) => entry.unavailable === null).map((entry) => entry.id);
    expect(open).toEqual(['new_character', 'settings', 'characters']);
    for (const entry of entries) if (entry.unavailable !== null) expect(entry.unavailable.length, entry.id).toBeGreaterThan(0);
  });

  it('un profilo da completare si completa, senza spingere a crearne un altro', () => {
    const context = { characterName: null, inviteWaiting: false, incomplete: true };
    const prima = primaryEntries(context)[0]!;
    expect(prima.label).toBe('Completa personaggio');
    expect(prima.unavailable).toBeNull();
    expect(secondaryEntries(context).find((entry) => entry.id === 'forge')!.unavailable).toContain('Completa');
  });

  it('un invito in attesa spiega che serve un personaggio per accettarlo', () => {
    const coop = secondaryEntries({ characterName: null, inviteWaiting: true }).find((entry) => entry.id === 'coop')!;
    expect(coop.unavailable).toContain('invito');
  });
});

describe('selezione da tastiera', () => {
  const rows = [['continue'], ['new'], ['settings'], ['a', 'b', 'c', 'd']];

  it('su e giu\' cambiano riga e ai bordi riparte dall\'altro capo', () => {
    expect(moveSelection(rows, 'continue', 'ArrowDown')).toBe('new');
    expect(moveSelection(rows, 'new', 'ArrowUp')).toBe('continue');
    expect(moveSelection(rows, 'continue', 'ArrowUp')).toBe('a');
    expect(moveSelection(rows, 'a', 'ArrowDown')).toBe('continue');
  });

  it('sinistra e destra scorrono la riga e la riga lunga torna a quella stretta', () => {
    expect(moveSelection(rows, 'a', 'ArrowRight')).toBe('b');
    expect(moveSelection(rows, 'a', 'ArrowLeft')).toBe('d');
    expect(moveSelection(rows, 'settings', 'ArrowRight')).toBe('settings');
    expect(moveSelection(rows, 'd', 'ArrowUp')).toBe('settings');
  });

  it('sulla griglia degli accessi le frecce restano nella colonna', () => {
    const griglia = [['continua'], ['dungeon', 'personaggi'], ['zaino', 'deposito'], ['coop']];
    expect(moveSelection(griglia, 'dungeon', 'ArrowDown')).toBe('zaino');
    expect(moveSelection(griglia, 'deposito', 'ArrowUp')).toBe('personaggi');
    expect(moveSelection(griglia, 'deposito', 'ArrowDown')).toBe('coop');
    expect(moveSelection(griglia, 'coop', 'ArrowUp')).toBe('zaino');
    expect(moveSelection(griglia, 'continua', 'ArrowDown')).toBe('dungeon');
    expect(moveSelection(griglia, 'personaggi', 'ArrowRight')).toBe('dungeon');
  });

  it('un comando sconosciuto riporta al primo', () => {
    expect(moveSelection(rows, 'perso', 'ArrowDown')).toBe('continue');
  });
});

describe('invito alla cooperativa', () => {
  it('legge il codice da un link o scritto da solo', () => {
    expect(parseInviteCode('https://esempio.trycloudflare.com/?party=a1b2c3d4e5f6a7b8c9')).toBe('a1b2c3d4e5f6a7b8c9');
    expect(parseInviteCode('  a1b2c3d4e5f6a7b8c9  ')).toBe('a1b2c3d4e5f6a7b8c9');
  });

  it('un link di un altro indirizzo si apre, uno dello stesso entra da qui', () => {
    const here = 'http://localhost:5173';
    expect(inviteTarget('a1b2c3d4e5f6', here)).toEqual({ kind: 'join', code: 'a1b2c3d4e5f6' });
    expect(inviteTarget('http://localhost:5173/?party=a1b2c3d4e5f6', here)).toEqual({ kind: 'join', code: 'a1b2c3d4e5f6' });
    expect(inviteTarget('https://amici.trycloudflare.com/?party=a1b2c3d4e5f6', here)).toEqual({ kind: 'open', url: 'https://amici.trycloudflare.com/?party=a1b2c3d4e5f6' });
    expect(inviteTarget('javascript:alert(1)//?party=a1b2c3d4e5f6', here)).toEqual({ kind: 'join', code: 'a1b2c3d4e5f6' });
    expect(inviteTarget('ciao', here)).toBeNull();
  });

  it('rifiuta testi che non sono un invito', () => {
    expect(parseInviteCode('')).toBeNull();
    expect(parseInviteCode('ciao')).toBeNull();
    expect(parseInviteCode('https://esempio.it/?altro=1')).toBeNull();
    expect(parseInviteCode('https://esempio.it/?party=<script>')).toBeNull();
  });
});

describe('stati di sistema', () => {
  it('la connessione ha un\'etichetta per ogni stato', () => {
    const base = { connecting: false, online: false, latency: null, failed: false };
    expect(connectionLabel(base)).toEqual({ text: 'Gioco in singolo', tone: 'idle' });
    expect(connectionLabel({ ...base, connecting: true }).tone).toBe('busy');
    expect(connectionLabel({ ...base, online: true, latency: 41 })).toEqual({ text: 'Online · 41 ms', tone: 'ok' });
    expect(connectionLabel({ ...base, failed: true })).toEqual({ text: 'Connessione persa', tone: 'bad' });
  });

  it('come sul server, il leader non deve dichiararsi pronto e il gruppo incompleto puo\' partire', () => {
    const leader = { id: 'a', name: 'Vesna', ready: false }, other = { id: 'b', name: 'Oren', ready: false };
    expect(partyReadiness([], '', 4)).toContain('Nessun gruppo');
    expect(partyReadiness([leader, other], 'a', 4)).toBe('Gruppo 2/4 · non ancora pronti: Oren.');
    expect(partyReadiness([leader, { ...other, ready: true }], 'a', 4)).toContain('incompleto 2/4');
    const full = [leader, { ...other, ready: true }, { id: 'c', name: 'Ina', ready: true }, { id: 'd', name: 'Teo', ready: true }];
    expect(partyReadiness(full, 'a', 4)).toContain('completo 4/4');
  });
});
