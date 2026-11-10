import { BACKPACK_SPRITE, type ItemSprite } from './item-sprites';

/** Icone del menu, 16 x 16 pixel, con pochi colori della palette del rifugio: ferro, rame, ambra, cremisi. */
const INK = '#120f13';

const PORTAL_SPRITE: ItemSprite = {
  pixels: [
    '.......oo.......', '......osso......', '.....osrrso.....', '....osrccrso....',
    '...osrcddcrso...', '...osrcddcrso...', '..osrcddddcrso..', '..osrcddddcrso..',
    '..osrcddddcrso..', '..osrcdccdcrso..', '..osrcdccdcrso..', '..osrcddddcrso..',
    '..osrrccccrrso..', '.oossssssssssoo.', '.ollllllllllllo.', 'oooooooooooooooo',
  ],
  palette: { o: INK, s: '#6d6a70', l: '#8a8284', r: '#7a1a26', c: '#d9423a', d: '#2a0a12' },
};

const CHARACTER_SPRITE: ItemSprite = {
  pixels: [
    '................', '.....oooooo.....', '....ohhhhhho....', '...ohhllllhho...',
    '...ohlloollho...', '...ohooooooho...', '...ohoddddoho...', '....oooddooo....',
    '...ooccccccoo...', '..occcaaaaccco..', '.occccaaaacccco.', '.occoccaaccocco.',
    '.ooooccccccoooo.', '....occcccco....', '....occoocco....', '....ooo..ooo....',
  ],
  palette: { o: INK, h: '#6d6a70', l: '#a8a1a0', d: '#2a0a12', c: '#7a1a26', a: '#b67a50' },
};

const NEW_CHARACTER_SPRITE: ItemSprite = {
  pixels: [
    '.............p..', '.....oooooo.ppp.', '....ohhhhhho.p..', '...ohhllllhho...',
    '...ohlloollho...', '...ohooooooho...', '...ohoddddoho...', '....oooddooo....',
    '...ooccccccoo...', '..occcaaaaccco..', '.occccaaaacccco.', '.occoccaaccocco.',
    '.ooooccccccoooo.', '....occcccco....', '....occoocco....', '....ooo..ooo....',
  ],
  palette: { ...CHARACTER_SPRITE.palette, p: '#ffd77a' },
};

const BRAZIER_SPRITE: ItemSprite = {
  pixels: [
    '.......oo.......', '......orro......', '.....orrro......', '.....orrrro.....',
    '....orrrrrro....', '....orraarro....', '...orraaaarro...', '...orraAAarro...',
    '...orraAAarro...', '....orraarro....', '.....oiiiio.....', '....oiiiiiio....',
    '.....oiiiio.....', '......oiio......', '.....oiiiio.....', '....oooooooo....',
  ],
  palette: { o: INK, r: '#a82a30', a: '#f0a93f', A: '#ffd77a', i: '#7a7475' },
};

const PARTY_ICON: ItemSprite = {
  pixels: [
    '................', '.......oo.......', '......oaao......', '......oaao......',
    '..oo...oo...oo..', '.obbo.occo.oddo.', '.obbo.occo.oddo.', '..oo.occcco.oo..',
    '.oooo.occo.oooo.', 'oeeeeo.oo.offffo', 'oeeeeo....offffo', 'oeeeeo....offffo',
    '.oooo......oooo.', '................', '................', '................',
  ],
  palette: { o: INK, a: '#dba777', c: '#a82a30', b: '#b8b0ae', e: '#5f5a5e', d: '#b67a50', f: '#8a4426' },
};

const CHEST_SPRITE: ItemSprite = {
  pixels: [
    '................', '................', '...oooooooooo...', '..owwwwwwwwwwo..',
    '.owllwiwwiwllwo.', '.owwwwiwwiwwwwo.', '.oiiiiiiiiiiiio.', '.oooooaaaaooooo.',
    '.owwwwaAAawwwwo.', '.owllwaaaawllwo.', '.owwwwiwwiwwwwo.', '.owwwwiwwiwwwwo.',
    '.oddddiddiddddo.', '.oooooooooooooo.', '................', '................',
  ],
  palette: { o: INK, w: '#6a4a2e', l: '#8a6540', d: '#47301f', i: '#8a8284', a: '#c8802e', A: '#ffd77a' },
};

const ANVIL_SPRITE: ItemSprite = {
  pixels: [
    '................', '........ee......', '.......eAAe.....', '........ee......',
    '.oooooooooooooo.', 'ollllllllllllllo', '.oiiiiiiiiiiiio.', '...ooiiiiiioo...',
    '.....oiiiio.....', '.....oiiiio.....', '.....oiiiio.....', '....oiiiiiio....',
    '...oiiiiiiiio...', '..oddddddddddo..', '..oooooooooooo..', '................',
  ],
  palette: { o: INK, l: '#b8b0ae', i: '#7a7475', d: '#4a484f', e: '#d9423a', A: '#ffd77a' },
};

const FLASK_SPRITE: ItemSprite = {
  pixels: [
    '................', '.....oooooo.....', '.....ocwwco.....', '......owwo......',
    '......owwo......', '......owwo......', '.....owwwwo.....', '....owwwwwwo....',
    '...owlrrrrrwo...', '..owlrrrrArrwo..', '..owlrrArrrrwo..', '..owrrrrrrArwo..',
    '..owrrArrrrrwo..', '...owrrrrrrwo...', '....oooooooo....', '................',
  ],
  palette: { o: INK, c: '#b67a50', w: '#7a7475', l: '#e8dcc8', r: '#a82a30', A: '#ef6a58' },
};

const GEAR_SPRITE: ItemSprite = {
  pixels: [
    '................', '.......oo.......', '...oo.oiio.oo...', '..oiioiiiioiio..',
    '..oiiiiiiiiiio..', '...oiiooooiio...', '.oooiiddddiiooo.', 'oiiiiiddddiiiiio',
    'oiiiiiddddiiiiio', '.oooiiddddiiooo.', '...oiiooooiio...', '..oiiiiiiiiiio..',
    '..oiioiiiioiio..', '...oo.oiio.oo...', '.......oo.......', '................',
  ],
  palette: { o: INK, i: '#b67a50', d: '#2a282d' },
};

export const MENU_ICONS = {
  continue: BRAZIER_SPRITE,
  new_character: NEW_CHARACTER_SPRITE,
  settings: GEAR_SPRITE,
  dungeons: PORTAL_SPRITE,
  characters: CHARACTER_SPRITE,
  inventory: BACKPACK_SPRITE,
  storage: CHEST_SPRITE,
  forge: ANVIL_SPRITE,
  merchant: FLASK_SPRITE,
  coop: PARTY_ICON,
  logout: PORTAL_SPRITE,
} as const;

/** Emblema del titolo: incudine e brace. */
export const FORGE_EMBLEM: ItemSprite = ANVIL_SPRITE;
