import { describe, expect, it } from 'vitest';
import { connectionLabel, moveSelection, primaryEntries } from './menu-model';

const withCharacter = { characterName: 'Vesna', inviteWaiting: false };
const empty = { characterName: null, inviteWaiting: false };

describe('comandi del menu principale', () => {
  it('il logout compare soltanto nel menu di un account autenticato',()=>{
    expect(primaryEntries(withCharacter).some(e=>e.id==='logout')).toBe(false);
    expect(primaryEntries({...withCharacter,authenticated:true}).find(e=>e.id==='logout')).toMatchObject({label:'Logout',unavailable:null});
  });
  it('sono quelli del progetto, in italiano e nell\'ordine previsto', () => {
    expect(primaryEntries(withCharacter).map((entry) => entry.label)).toEqual(['Entra', 'Nuovo personaggio', 'Impostazioni']);
  });

  it('con un personaggio sono tutti disponibili e ognuno ha un tooltip', () => {
    for (const entry of primaryEntries(withCharacter)) {
      expect(entry.unavailable, entry.id).toBeNull();
      expect(entry.hint.length, entry.id).toBeGreaterThan(0);
    }
    expect(primaryEntries(withCharacter)[0]!.hint).toContain('Vesna');
  });

  it('senza personaggi restano solo creazione, elenco e impostazioni, e chi e\' bloccato dice perche\'', () => {
    const entries = primaryEntries(empty);
    const open = entries.filter((entry) => entry.unavailable === null).map((entry) => entry.id);
    expect(open).toEqual(['new_character', 'settings']);
    for (const entry of entries) if (entry.unavailable !== null) expect(entry.unavailable.length, entry.id).toBeGreaterThan(0);
  });

  it('un profilo da completare si completa, senza spingere a crearne un altro', () => {
    const context = { characterName: null, inviteWaiting: false, incomplete: true };
    const prima = primaryEntries(context)[0]!;
    expect(prima.label).toBe('Completa personaggio');
    expect(prima.unavailable).toBeNull();
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

describe('accesso al mondo pubblico', () => {
 it('i comandi principali non richiedono un codice di invito',()=>{expect(primaryEntries(withCharacter).map(e=>e.id)).toEqual(['continue','new_character','settings']);});
 it('il comando Entra descrive il rifugio condiviso',()=>{expect(primaryEntries(withCharacter)[0]!.hint).toContain('rifugio');});
 it('la connessione espone accesso in corso e stato online',()=>{expect(connectionLabel({connecting:true,online:false,latency:null,failed:false}).tone).toBe('busy');expect(connectionLabel({connecting:false,online:true,latency:null,failed:false}).text).toBe('Online');});
});

describe('stati di sistema', () => {
  it('la connessione ha un\'etichetta per ogni stato', () => {
    const base = { connecting: false, online: false, latency: null, failed: false };
    expect(connectionLabel(base)).toEqual({ text: 'Account non connesso', tone: 'idle' });
    expect(connectionLabel({ ...base, connecting: true }).tone).toBe('busy');
    expect(connectionLabel({ ...base, online: true, latency: 41 })).toEqual({ text: 'Online · 41 ms', tone: 'ok' });
    expect(connectionLabel({ ...base, failed: true })).toEqual({ text: 'Connessione persa', tone: 'bad' });
  });

  it('il menu senza account indica esplicitamente che occorre accedere',()=>{
    expect(connectionLabel({connecting:false,online:false,latency:null,failed:false})).toEqual({text:'Account non connesso',tone:'idle'});
  });
});
