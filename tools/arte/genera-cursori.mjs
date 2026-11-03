// Disegna i cursori del tema Reliquiario in src/assets/art/cursors/. Nessuna dipendenza, nessuna generazione esterna.
// Uso: node tools/arte/genera-cursori.mjs [anteprima.png]
// Per ritoccarli si cambiano le griglie e si rilancia; i punti attivi stanno in style.css (--cursor-*).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUTPUT = fileURLToPath(new URL('../../src/assets/art/cursors/', import.meta.url));
/** Ogni pixel della griglia diventa SCALE × SCALE: 16 × 2 = 32, la misura massima sicura per un cursore del browser. */
const SCALE = 2;

/** Colori di --relic-panel, --relic-ivory e --relic-copper, piu' un rame scuro per l'ombra. */
const PALETTE = {
  o: [0x21, 0x19, 0x23, 255],
  h: [0xff, 0xe7, 0xc6, 255],
  c: [0xc1, 0x8b, 0x70, 255],
  s: [0x8a, 0x5a, 0x4a, 255],
  '.': [0, 0, 0, 0],
};

const CURSORS = {
  arrow: [
    'o...............',
    'oo..............',
    'oho.............',
    'ohco............',
    'ohcco...........',
    'ohccco..........',
    'ohcccco.........',
    'ohccccco........',
    'ohcccccco.......',
    'ohcccoooo.......',
    'ohcoocso........',
    'ohoo.ocso.......',
    'oo...ocso.......',
    '......ocso......',
    '......ooo.......',
  ],
  pointer: [
    '.....oo.........',
    '....ohco........',
    '....ohco........',
    '....ohco........',
    '....ohcooo......',
    '....ohcohcoo....',
    '.oo.ohcohcohoo..',
    'ohcoohcohcohcoo.',
    'ohccohccccccccso',
    '.ohcchcccccccso.',
    '..ohccccccccso..',
    '..ohcccccccso...',
    '...ohcccccso....',
    '....oooooooo....',
  ],
  grab: [
    '....oo.oo.oo....',
    '...ohcohcohco...',
    '...ohcohcohcoo..',
    '.oo.ohcohcohcco.',
    'ohcoohccccccco..',
    '.ohcohcccccccso.',
    '..ohchcccccccso.',
    '..ohccccccccso..',
    '...ohccccccso...',
    '....ohcccsso....',
    '.....oooooo.....',
  ],
  grabbing: [
    '................',
    '....oo.oo.oo....',
    '...ohcohcohcoo..',
    '..oohcohcohchco.',
    '.ohcchcccccccco.',
    '.ohccccccccccso.',
    '..ohcccccccccso.',
    '..ohccccccccso..',
    '...ohccccccso...',
    '....ohcccsso....',
    '.....oooooo.....',
  ],
  aim: [
    '......ooo......',
    '......oho......',
    '...oo.oco.oo...',
    '..ohc.oco.cho..',
    '..oc..ooo..co..',
    '...............',
    'ooooo..o..ooooo',
    'ohcco.oho.occho',
    'ooooo..o..ooooo',
    '...............',
    '..oc..ooo..co..',
    '..ohc.oco.cho..',
    '...oo.oco.oo...',
    '......oho......',
    '......ooo......',
  ],
};

function crcTable() {
  return Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
}
const CRC = crcTable();

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  let crc = 0xffffffff;
  for (const byte of body) crc = CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, body.length + 4);
  return out;
}

/** PNG RGBA a 8 bit da una griglia, con `pixelAt(x, y)` che restituisce [r, g, b, a]. */
function encodePng(width, height, pixelAt) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let at = 0;
  for (let y = 0; y < height; y++) {
    raw[at++] = 0;
    for (let x = 0; x < width; x++) for (const value of pixelAt(x, y)) raw[at++] = value;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function validate(name, rows) {
  const width = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${name}, riga ${y}: ${row.length} invece di ${width}`);
    for (const key of row) if (!(key in PALETTE)) throw new Error(`${name}, riga ${y}: colore ${key}`);
  });
}

mkdirSync(OUTPUT, { recursive: true });
for (const [name, rows] of Object.entries(CURSORS)) {
  validate(name, rows);
  const png = encodePng(rows[0].length * SCALE, rows.length * SCALE, (x, y) => PALETTE[rows[Math.floor(y / SCALE)][Math.floor(x / SCALE)]]);
  writeFileSync(`${OUTPUT}${name}.png`, png);
  console.log(`${name}.png: ${rows[0].length * SCALE}x${rows.length * SCALE}, ${png.length} byte`);
}

// Foglio ingrandito per giudicarli, su fondo scuro a sinistra e chiaro a destra: non finisce nel gioco.
const preview = process.argv[2];
if (preview) {
  const names = Object.keys(CURSORS), zoom = 6, cell = 18 * zoom;
  const sheet = encodePng(cell * names.length, cell * 2, (x, y) => {
    const rows = CURSORS[names[Math.floor(x / cell)]];
    const key = rows[Math.floor((y % cell) / zoom) - 1]?.[Math.floor((x % cell) / zoom) - 1] ?? '.';
    return key === '.' ? (y < cell ? [0x14, 0x12, 0x18, 255] : [0xa8, 0xa2, 0x96, 255]) : PALETTE[key];
  });
  mkdirSync(dirname(preview), { recursive: true });
  writeFileSync(preview, sheet);
}
