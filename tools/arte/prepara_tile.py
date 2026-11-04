"""Prepara i tile dei quattro dungeon dalla pixel art scaricata (fase 6 dello studio grafico, 1 novembre 2026).

Uso: python -I prepara_tile.py <cartella_scaricati> <radice_progetto>

Per ogni tema ritaglia i tile scelti (pavimento, faccia del muro, cima dei massicci, pozzi, ponti, ripari), li porta a
16 pixel (i tile di Eman Quest sono ingranditi x4) e li ricolora con le rampe del tema: i colori del sorgente,
ordinati per luminosita', vanno ai gradini della rampa dal piu' scuro al piu' chiaro. Nel gioco restano solo i colori
delle rampe, gli stessi che i test confrontano con i colpi nemici. Scrive un PNG per tema in `src/assets/art/tiles/`
e la geometria in `src/features/presentation/themes/tile-atlas.ts`, che non va modificato a mano.

I file scaricati restano in una cartella temporanea fuori dal progetto: lo script li cerca per nome (vedi LEGGIMI.md).
Requisiti: Python 3 e Pillow.
"""
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
SRC = Path(sys.argv[1])
ROOT = Path(sys.argv[2])
OUT_PNG = ROOT / 'src' / 'assets' / 'art' / 'tiles'
OUT_TS = ROOT / 'src' / 'features' / 'presentation' / 'themes' / 'tile-atlas.ts'

# --- Sorgenti (nomi originali dei file nei pacchetti) ----------------------------------------------------------------

SOURCE_FILES = {
    # 0x72, DungeonTileset II v1.7 (CC0): foglio intero; coordinate da tile_list_v1.7.
    '0x72': '0x72_DungeonTilesetII_v1.7.png',
    # Night Blade, Forest and Dungeon Tilesets from Eman Quest (CC0): ingranditi x4.
    'eman-cave': 'cave-lava-tiles.png',
    'eman-death': 'death-forest-tiles.png',
    # Kevin's Mom's House, dungeon_ e tundra_ (CC0).
    'kmh-dungeon-deco': 'dungeonDecoration_0.png',
    'kmh-tundra-res': 'tundra_ [resources].png',
}


def find_source(name):
    # Niente glob con il nome: le parentesi quadre dei file di Kevin's Mom's House sarebbero classi di caratteri.
    matches = [p for p in SRC.rglob('*') if p.name == name and '__MACOSX' not in p.parts]
    if not matches:
        raise SystemExit(f'manca {name} sotto {SRC}')
    return matches[0]


SHEETS = {key: Image.open(find_source(name)).convert('RGBA') for key, name in SOURCE_FILES.items()}


def crop(sheet, x, y, w, h, shrink=1, rotate=0):
    """Un pezzo del foglio, rimpicciolito di `shrink` (solo per i tile ingranditi) e ruotato di `rotate` gradi."""
    piece = SHEETS[sheet].crop((x, y, x + w, y + h))
    if shrink > 1:
        piece = piece.resize((w // shrink, h // shrink), Image.NEAREST)
    if rotate:
        piece = piece.rotate(rotate, expand=True)
    return piece


def t72(x, y, w=16, h=16, rotate=0):
    return crop('0x72', x, y, w, h, 1, rotate)


def eman(sheet, col, row, cols=1, rows=1, rotate=0):
    """Un tile di Eman Quest per cella da 64 (16 pixel d'arte ingranditi x4)."""
    return crop(sheet, col * 64, row * 64, cols * 64, rows * 64, 4, rotate)


def kmh(sheet, x, y, w, h):
    return crop(sheet, x, y, w, h)


# Prima le due lastre lisce (floor_1, floor_5), poi le crepe piccole, le grandi e le macchie: il gioco sceglie le prime
# molto piu' spesso (`pickVariant` in themes/tiles.ts), cosi' crepe e macchie restano punti di riferimento.
FLOORS_0X72 = [t72(16, 64), t72(32, 80), t72(48, 64), t72(48, 80), t72(32, 64), t72(16, 80), t72(16, 96), t72(32, 96)]
WALLS_0X72 = [t72(32, 16), t72(48, 32), t72(48, 48)]
CAPS_0X72 = [t72(16, 64), t72(32, 80), t72(48, 64), t72(16, 80)]
# Pozzo con il bordo di roccia (3 x 3: angoli, lati e centro, per righe) e lava con il bordo di basalto.
PIT = [eman('eman-cave', c, r) for r in (0, 1, 2) for c in (1, 2, 3)]
LAVA = [eman('eman-cave', c, r) for r in (7, 8, 9) for c in (0, 1, 2)]
# Assi del ponte: il tile centrale con le assi verticali (si cammina da sinistra a destra) e lo stesso ruotato.
PLANKS_EW = [eman('eman-cave', 2, 4)]
PLANKS_NS = [eman('eman-cave', 2, 4, rotate=90)]

# --- Rampe e materiali per tema --------------------------------------------------------------------------------------
# Ogni rampa va dal colore piu' scuro al piu' chiaro. Le rampe del pavimento ripetono i toni gia' usati dal tema (lastre
# normali, consumate e in ombra), cosi' il contrasto con i colpi nemici resta quello controllato dai test.

THEMES = {
    'crypt': {
        'floor': (['#1d232c', '#222831', '#252b34', '#292f39', '#30353f'], FLOORS_0X72),
        'floorWorn': (['#22272e', '#272c33', '#2b3038', '#30353e', '#363b44'], FLOORS_0X72),
        'floorDark': (['#191d24', '#1d222a', '#20252d', '#242932', '#2a2f38'], FLOORS_0X72),
        'wall': (['#1b1d24', '#23262e', '#353946', '#4a4f5c', '#5c6272'], WALLS_0X72),
        'cap': (['#23262e', '#2f323b', '#3a3e4a', '#424652', '#4f5462'], CAPS_0X72),
        'chasm': (['#020305', '#05070a', '#0c0f14', '#2c313a', '#4a4f5c', '#6b7080'], PIT),
        'bridgeEW': (['#150f0a', '#251a11', '#3a2a1c', '#4e3a26', '#664c32'], PLANKS_EW),
        'bridgeNS': (['#150f0a', '#251a11', '#3a2a1c', '#4e3a26', '#664c32'], PLANKS_NS),
        # Panca della navata (Kevin's Mom's House, dungeon_): legno scuro.
        'cover': (['#100b08', '#21170f', '#352517', '#4b3521', '#62462c', '#7a5a3a'], [kmh('kmh-dungeon-deco', 18, 150, 44, 18)]),
    },
    'swamp': {
        # Fango: le lastre di 0x72 nei toni del fango della palude, solo come grana delle chiazze.
        'floor': (['#222316', '#25261a', '#2a2b1b', '#30301e', '#353522'], FLOORS_0X72),
        'cap': (['#141a0f', '#1b2216', '#232c1a', '#2d3a20', '#3a4a26'], [eman('eman-death', 0, 0), eman('eman-death', 1, 0)]),
        'chasm': (['#010403', '#030a08', '#06120e', '#2d3a20', '#3f5428', '#566a2e'], PIT),
        'bridgeEW': (['#110c08', '#1f170e', '#2f2418', '#433422', '#58462e'], PLANKS_EW),
        'bridgeNS': (['#110c08', '#1f170e', '#2f2418', '#433422', '#58462e'], PLANKS_NS),
        # Groviglio di radici morte (Eman Quest, foresta morta).
        'cover': (['#0d0a06', '#1c140c', '#2b2117', '#3a2d1f', '#4b3b28', '#5b6a34'], [eman('eman-death', 2, 0, 2, 2)]),
    },
    'forge': {
        'floor': (['#161210', '#1b1614', '#211b18', '#27201c', '#2f2824'], FLOORS_0X72),
        'floorDark': (['#120f0d', '#171311', '#1c1715', '#221c19', '#2a2420'], FLOORS_0X72),
        'cap': (['#1d1916', '#2c2622', '#3a332e', '#4a3f38', '#5e544c'], CAPS_0X72),
        'chasm': (['#1b1614', '#3a1a0c', '#7a2a0c', '#c8461a', '#ff6a1f', '#ffc15a'], LAVA),
        'bridgeEW': (['#120e0c', '#2a2420', '#3a332e', '#4a3f38', '#5e544c'], PLANKS_EW),
        'bridgeNS': (['#120e0c', '#2a2420', '#3a332e', '#4a3f38', '#5e544c'], PLANKS_NS),
        # Cassa di legno cerchiata (0x72).
        'cover': (['#120c08', '#2a1c12', '#45301e', '#5e432a', '#7a5a38', '#9a7a52'], [t72(288, 408, 16, 24)]),
    },
    'glacier': {
        'floor': (['#132c45', '#17344f', '#1b3c5a', '#214566', '#2a5274'], FLOORS_0X72),
        'floorDark': (['#10263d', '#132d47', '#173452', '#1c3d5e', '#244a6c'], FLOORS_0X72),
        'cap': (['#3f6f96', '#5f8fb8', '#7fb0d3', '#a8d0e8', '#d6eef8'], CAPS_0X72),
        'chasm': (['#01040a', '#030a16', '#071426', '#244a6c', '#33618a', '#4a7ca6'], PIT),
        'bridgeEW': (['#1c3450', '#28466a', '#355a82', '#43709a', '#5283ad'], PLANKS_EW),
        'bridgeNS': (['#1c3450', '#28466a', '#355a82', '#43709a', '#5283ad'], PLANKS_NS),
        # Blocco di ghiaccio (Kevin's Mom's House, tundra_).
        'cover': (['#0f2a44', '#1e4a70', '#3f7fae', '#6fb2dc', '#b4e2f6', '#e8fbff'], [kmh('kmh-tundra-res', 133, 82, 22, 26)]),
    },
}

ATLAS_WIDTH = 256


def hexrgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def pixels(image):
    """I pixel dell'immagine in fila (Pillow 12 ha rinominato `getdata`)."""
    return list(getattr(image, 'get_flattened_data', image.getdata)())


def recolor(pieces, ramp):
    """I colori dei pezzi, ordinati per luminosita', si stendono sui gradini della rampa (estremi compresi)."""
    colors = sorted({px[:3] for piece in pieces for px in pixels(piece) if px[3] >= 128}, key=luminance)
    levels = sorted({round(luminance(c)) for c in colors})
    stops = [hexrgb(c) for c in ramp]
    step = {}
    for i, level in enumerate(levels):
        step[level] = 0 if len(levels) == 1 else round(i * (len(stops) - 1) / (len(levels) - 1))
    out = []
    for piece in pieces:
        image = Image.new('RGBA', piece.size, (0, 0, 0, 0))
        image.putdata([(*stops[step[round(luminance(px))]], 255) if px[3] >= 128 else (0, 0, 0, 0) for px in pixels(piece)])
        out.append(image)
    return out


def pack(entries):
    """Mette i tile in file (scaffali) larghe ATLAS_WIDTH: restituisce l'immagine e le posizioni per materiale."""
    x = y = shelf = 0
    placed = []
    for name, image in entries:
        if x + image.width > ATLAS_WIDTH:
            x, y, shelf = 0, y + shelf, 0
        placed.append((name, image, x, y))
        x += image.width
        shelf = max(shelf, image.height)
    atlas = Image.new('RGBA', (ATLAS_WIDTH, y + shelf), (0, 0, 0, 0))
    rects = {}
    for name, image, px, py in placed:
        atlas.paste(image, (px, py))
        rects.setdefault(name, []).append((px, py, image.width, image.height))
    return atlas, rects


def ts_rects(rects):
    return '[' + ', '.join(f'{{ x: {x}, y: {y}, w: {w}, h: {h} }}' for x, y, w, h in rects) + ']'


def main():
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    blocks = []
    for theme, materials in THEMES.items():
        entries = []
        for name, (ramp, pieces) in materials.items():
            for image in recolor(pieces, ramp):
                entries.append((name, image))
        atlas, rects = pack(entries)
        atlas.save(OUT_PNG / f'{theme}.png', optimize=True)
        print(f'{theme}.png {atlas.width}x{atlas.height}', {name: len(r) for name, r in rects.items()})
        lines = [f'  {theme}: {{',
                 f"    url: new URL('../../../assets/art/tiles/{theme}.png', import.meta.url).href,",
                 f'    width: {atlas.width},',
                 f'    height: {atlas.height},',
                 '    tiles: {']
        for name, list_ in rects.items():
            lines.append(f'      {name}: {ts_rects(list_)},')
        lines.append('    },')
        lines.append('    colors: {')
        for name, (ramp, _) in materials.items():
            lines.append(f"      {name}: [{', '.join(repr(c) for c in ramp)}],")
        lines.append('    },')
        lines.append('  },')
        blocks.append('\n'.join(lines))
    header = """// File generato da tools/arte/prepara_tile.py: non modificarlo a mano, rilancia lo script.

import type { ArenaThemeId } from '../../arena/arena';

/** Un tile nel foglio del tema, in pixel. */
export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Materiali dei tile: pavimento (tre toni), faccia del muro, cima dei massicci, pozzi, ponti, ripari e, nei fogli nuovi, acqua, tappeti, fondo dei pozzi e ringhiere. */
export type TileMaterial = 'floor' | 'floorWorn' | 'floorDark' | 'wall' | 'cap' | 'chasm' | 'bridgeEW' | 'bridgeNS' | 'cover' | 'water' | 'carpet' | 'chasmBed' | 'railEW' | 'railNS' | 'post';

/** Una superficie che ripete: un quadrato di `cells` x `cells` celle da `size` pixel, che si posa in base alla posizione nel mondo. */
export interface TileGrid {
  readonly x: number;
  readonly y: number;
  readonly cells: number;
  readonly size: number;
}

/** Il foglio dei tile di un tema: immagine, varianti per materiale e rampe di colori usate per ricolorarle. */
export interface TileAtlasLayout {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Unita' di mondo per pixel d'arte (predefinito 2, i tile classici da 16 pixel). */
  readonly scale?: number;
  readonly grids?: Partial<Readonly<Record<TileMaterial, TileGrid>>>;
  readonly tiles: Partial<Readonly<Record<TileMaterial, readonly TileRect[]>>>;
  readonly colors: Partial<Readonly<Record<TileMaterial, readonly string[]>>>;
}

export const TILE_ATLASES: Readonly<Record<ArenaThemeId, TileAtlasLayout>> = {
"""
    OUT_TS.write_text(header + '\n'.join(blocks) + '\n};\n', encoding='utf-8', newline='\n')
    print('scritto', OUT_TS)


main()
