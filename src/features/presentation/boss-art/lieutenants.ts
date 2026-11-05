import type { Palette, SpriteFrame } from '../sprites';
import type { BossArt } from './boss-art';

/*
 * Grafica dei luogotenenti: pixel art nel codice, come i boss prima dei fogli di sprite. Ognuno riprende i colori del
 * suo dungeon; in furia gli occhi (o la gemma) cambiano colore.
 */

/** Una copia del fotogramma con alcune righe cambiate. */
const variant = (frame: SpriteFrame, rows: Readonly<Record<number, string>>): SpriteFrame => frame.map((row, index) => rows[index] ?? row);

// --- Doccione del campanile -------------------------------------------------------------------------------------

const GARGOYLE_IDLE: SpriteFrame = [
  '.a............a.',
  'aba..aaaaaa..aba',
  'abba.abbbba.abba',
  'abbbabbbbbbabbba',
  '.abbbbcbbcbbbba.',
  '..abbbbbbbbbba..',
  '...abbbddbbba...',
  '..abbbbbbbbbba..',
  '.abbabbbbbbabba.',
  'abba.abbbba.abba',
  'aba..abbbba..aba',
  '.a...ab..ba...a.',
  '....aab..baa....',
  '....aa....aa....',
];

const GARGOYLE_FLAP = variant(GARGOYLE_IDLE, {
  0: '................',
  1: 'a....aaaaaa....a',
  2: 'aba..abbbba..aba',
  3: 'abbbabbbbbbabbba',
  8: 'abbbbbbbbbbbbbba',
  9: '.a...abbbba...a.',
  10: '.....abbbba.....',
  11: '.....ab..ba.....',
});

const GARGOYLE_CAST = variant(GARGOYLE_IDLE, { 6: '...abbdddbba....', 0: 'a..............a', 1: 'ba...aaaaaa...ab' });

const gargoylePalette = (slowed: boolean, enraged: boolean): Palette => ({
  a: '#16161e',
  b: slowed ? '#6a8a9a' : '#7a7884',
  c: enraged ? '#ff5a3c' : '#ffb36b',
  d: '#2a2430',
});

export const BELFRY_GARGOYLE_ART: BossArt = {
  walk: [GARGOYLE_IDLE, GARGOYLE_FLAP, GARGOYLE_IDLE, GARGOYLE_FLAP],
  casting: GARGOYLE_CAST,
  scale: 3,
  shadow: { radiusX: 24, radiusY: 8, offsetY: 24 },
  bob: { casting: -3, even: 0, odd: -3 },
  palette: gargoylePalette,
};

// --- Rospo re --------------------------------------------------------------------------------------------------

const TOAD_IDLE: SpriteFrame = [
  '......a.a.a.....',
  '.....aeaeaea....',
  '.....aeeeeea....',
  '..aaa.aaaaa.aaa.',
  '.abcba.....abcba',
  '.abbbbaaaaabbbba',
  'abbbbbbbbbbbbbba',
  'abddddddddddddba',
  'abddddddddddddba',
  'abbbbbbbbbbbbbba',
  '.abbbaa..aabbba.',
  'aabba......abbaa',
  'aaaa........aaaa',
];

const TOAD_CROUCH = variant(TOAD_IDLE, { 10: 'abbbbaa..aabbbba', 11: 'aabba......abbaa', 12: '.aaa........aaa.' });

const TOAD_CAST = variant(TOAD_IDLE, { 7: 'abddddffffddddba', 8: 'abddddffffddddba' });

const toadPalette = (slowed: boolean, enraged: boolean): Palette => ({
  a: '#14200e',
  b: slowed ? '#5a8a8a' : '#4a7a32',
  c: enraged ? '#ff5a3c' : '#ffe060',
  d: '#b8c870',
  e: '#e8c040',
  f: '#c070b0',
});

export const TOAD_KING_ART: BossArt = {
  walk: [TOAD_IDLE, TOAD_CROUCH, TOAD_IDLE, TOAD_CROUCH],
  casting: TOAD_CAST,
  scale: 4,
  shadow: { radiusX: 32, radiusY: 10, offsetY: 26 },
  bob: { casting: -4, even: 0, odd: 2 },
  palette: toadPalette,
};

/**
 * Regina serpente (luogotenente della Palude al posto del Rospo re): il disegno vero e' il foglio direzionale in
 * `directional-sheets.ts`. Le matrici sono quelle del Rospo re, mostrate solo finche' il PNG non e' caricato; ombra e
 * quota dei piedi sono della Regina (`offsetY` = `feetY` del foglio).
 */
export const SERPENT_QUEEN_ART: BossArt = {
  ...TOAD_KING_ART,
  shadow: { radiusX: 52, radiusY: 16, offsetY: 30 },
};

// --- Mastro d'incudine -------------------------------------------------------------------------------------------

const SMITH_IDLE: SpriteFrame = [
  '.....aaaaaa.....',
  '....abbbbbba....',
  '....abcbbcba....',
  '....abbddbba....',
  '...aabbbbbbaa...',
  '.aabbbbbbbbbbaa.',
  'abbbbbeeeebbbbba',
  'abbaabeeeebaabba',
  'abba.aeeeea.abba',
  'abba.aeeeea.abff',
  'aaa..aeeeea..aff',
  '.....aeeeea...a.',
  '.....abbbba.....',
  '....abba.abba...',
  '...aaba...abaa..',
  '...aaa.....aaa..',
];

const SMITH_STEP = variant(SMITH_IDLE, { 13: '....abba.abba...', 14: '....aba...aba...', 15: '...aaa.....aaa..' });

const SMITH_CAST = variant(SMITH_IDLE, {
  5: '.aabbbbbbbbbbaaf',
  6: 'abbbbbeeeebbbaff',
  7: 'abbaabeeeebaaba.',
  8: 'abba.aeeeea.abba',
  9: 'abba.aeeeea.abba',
  10: 'aaa..aeeeea..aaa',
});

const smithPalette = (slowed: boolean, enraged: boolean): Palette => ({
  a: '#141018',
  b: slowed ? '#5a7a8a' : '#4a4652',
  c: enraged ? '#ff3d12' : '#ffd04a',
  d: enraged ? '#ff6a1a' : '#ff9a3d',
  e: '#6a3a22',
  f: '#9a9aa8',
});

export const ANVIL_MASTER_ART: BossArt = {
  walk: [SMITH_IDLE, SMITH_STEP, SMITH_IDLE, SMITH_STEP],
  casting: SMITH_CAST,
  scale: 4,
  shadow: { radiusX: 34, radiusY: 11, offsetY: 30 },
  bob: { casting: -3, even: 1, odd: -1 },
  palette: smithPalette,
};

// --- Prima allieva -----------------------------------------------------------------------------------------------

const APPRENTICE_IDLE: SpriteFrame = [
  '.....a......',
  '....aba.....',
  '...abbba....',
  '..abbbbba...',
  '.aaaaaaaaa..',
  '...acdca..e.',
  '...abbba..f.',
  '..abbbbba.f.',
  '.abbbgbbbaf.',
  '.abbbbbbbaf.',
  '.abbbbbbba..',
  '..abbbbba...',
  '..abbbbba...',
  '..abbbbba...',
  '...ab.ba....',
  '...aa.aa....',
];

const APPRENTICE_STEP = variant(APPRENTICE_IDLE, { 14: '..ab...ba...', 15: '..aa...aa...' });

const APPRENTICE_CAST = variant(APPRENTICE_IDLE, { 4: '.aaaaaaaaa.e', 5: '...acdca..fe', 6: '...abbba.f..', 7: '..abbbbbaf..' });

const apprenticePalette = (slowed: boolean, enraged: boolean): Palette => ({
  a: '#14203a',
  b: slowed ? '#6a9ad8' : '#3a6ab8',
  c: '#e8d8c8',
  d: '#1a3a7a',
  e: enraged ? '#c9b3ff' : '#aef0ff',
  f: '#8a6a4a',
  g: '#aef0ff',
});

export const FIRST_APPRENTICE_ART: BossArt = {
  walk: [APPRENTICE_IDLE, APPRENTICE_STEP, APPRENTICE_IDLE, APPRENTICE_STEP],
  casting: APPRENTICE_CAST,
  scale: 3,
  shadow: { radiusX: 20, radiusY: 7, offsetY: 24 },
  bob: { casting: -2, even: 0, odd: -1 },
  palette: apprenticePalette,
};
