import { AUDIO_LICENSES } from '../audio/audio-credits';
/*
 * Crediti della grafica di terzi usata dal gioco. Regole (docs/risorse-libere.md): licenze CC0, pubblico dominio o CC BY,
 * eccezione autorizzata il 2026-11-01: VFX e icone oggetto generati con PixelLab; la licenza si legge sulla pagina della fonte e, se c'e', nel file dentro il pacchetto.
 * Le licenze CC BY chiedono di citare autore e licenza e di dire che l'opera e' stata modificata: il pannello dei
 * crediti mostra autore e licenza, qui sotto ci sono le modifiche.
 */

/** Licenze ammesse per la grafica (stessi nomi di quelle dell'audio, per mostrarle allo stesso modo). */
export type ArtLicense = 'CC0-1.0' | 'CC-BY-3.0' | 'CC-BY-4.0' | 'PixelLab-output' | 'Generato-locale';
export const VFX_CREDIT_IDS = ['pixellab-vfx-items', 'menu-rifugio-ia'] as const;
export const ART_LICENSES = { ...AUDIO_LICENSES, 'PixelLab-output': { name: 'Output PixelLab · termini del servizio', url: 'https://www.pixellab.ai/termsofservice', requiresAttribution: false }, 'Generato-locale': { name: 'Generato con IA in locale · da approvare', url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', requiresAttribution: false } };

export interface ArtCredit {
  /** Titolo come sulla pagina della fonte. */
  readonly title: string;
  readonly author: string;
  /** Pagina della fonte (non il link diretto al file). */
  readonly source: string;
  readonly license: ArtLicense;
  /** Data di consultazione della pagina e di scaricamento (AAAA-MM-GG). */
  readonly retrieved: string;
  /** Per che cosa si usa nel gioco. */
  readonly use: string;
  /** Modifiche fatte (ritaglio, colori, contorno): le licenze CC BY chiedono di indicarle. */
  readonly changes: string;
}

/** Modifica comune ai fogli dei boss (`tools/arte/prepara_boss.py`). */
const BOSS_EDIT = 'animazioni scelte ritagliate in un unico foglio e ricolorate con la tavolozza del gioco, in calma e in furia';

/** Modifica comune ai tile dei dungeon (`tools/arte/prepara_tile.py`). */
const TILE_EDIT = 'tile scelti ritagliati in un foglio per dungeon e ricolorati con le rampe di colori del tema';

/** Crediti per id (`<fonte>-<opera>`), consultati e scaricati il 1 novembre 2026. */
export const ART_CREDITS: Readonly<Record<string, ArtCredit>> = {
  'pixellab-vfx-items': {
    title: 'VFX delle classi e icone equipaggiamento', author: 'Temper your soul · generato con PixelLab',
    source: 'https://www.pixellab.ai/termsofservice', license: 'PixelLab-output', retrieved: '2026-11-01',
    use: 'atlanti storici delle skill come ripiego; icone archiviate dopo la revisione Hi-bit C',
    changes: 'prompt originali, selezione degli atlanti e ottimizzazione PNG; rendering corrente Hi-bit e icone oggetto ridisegnati nel codice il 3 novembre 2026',
  },
  'menu-rifugio-ia': {
    title: 'Rifugio del menu principale', author: 'Temper your soul · generato in locale con SDXL e Pixel Art XL',
    source: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', license: 'Generato-locale', retrieved: '2026-11-03',
    use: 'cortile e strutture dello sfondo del menu; soglia della pagina Personaggi',
    changes: 'ricreato da una tavola dell\'utente, strutture scontornate, palette comune e schiarita; vedi src/assets/art/menu/LEGGIMI.md',
  },
  'local-sdxl-boss': {
    title: 'Boss, luogotenenti e servitori',
    author: 'Temper your soul · generato in locale con SDXL 1.0 e Pixel Art XL (nerijs)',
    source: 'https://huggingface.co/nerijs/pixel-art-xl',
    license: 'Generato-locale',
    retrieved: '2026-11-03',
    use: 'boss, luogotenenti e i servitori del generatore locale',
    changes: 'un disegno per figura, ridotto a pixel veri da tools/arte/prepara_boss_ia.py; animazioni, furia, passaggio di fase e morte ricavati da quel disegno',
  },
  'local-sdxl-tile': {
    title: 'Tile dei dungeon',
    author: 'Temper your soul · generato in locale con SDXL 1.0 e Pixel Art XL (nerijs)',
    source: 'https://huggingface.co/nerijs/pixel-art-xl',
    license: 'Generato-locale',
    retrieved: '2026-11-04',
    use: 'superfici, facciate, colonne, portali, ponti, ripari e arredi dei quattro dungeon',
    changes: 'ridotti a un pixel per unità di mondo da tools/arte/prepara_scenari.py; superfici sulle rampe del tema; orli e ringhiere composti dallo script',
  },
  'oga-animated-statue': {
    title: 'Animated Statue',
    author: 'Calciumtrice',
    source: 'https://opengameart.org/content/animated-statue',
    license: 'CC-BY-3.0',
    retrieved: '2026-11-01',
    use: 'guardiano della cripta',
    changes: `variante grigia senza muschio; ${BOSS_EDIT}; contorno scuro aggiunto`,
  },
  'oga-demon-flower': {
    title: 'Demon Flower Monster Sprite Sheet',
    author: 'Rosswet Mobile',
    source: 'https://opengameart.org/content/demon-flower-monster-sprite-sheet',
    license: 'CC-BY-3.0',
    retrieved: '2026-11-01',
    use: 'madre delle spore',
    changes: BOSS_EDIT,
  },
  'oga-enemy-galore': {
    title: 'Enemy Galore I (golem)',
    author: 'Admurin',
    source: 'https://opengameart.org/content/enemy-galore-i',
    license: 'CC-BY-4.0',
    retrieved: '2026-11-01',
    use: 'colosso della fornace',
    changes: `golem corazzato in calma, senza armatura in furia; ${BOSS_EDIT}`,
  },
  'itch-0x72-dungeontileset-ii': {
    title: 'DungeonTileset II',
    author: '0x72',
    source: 'https://0x72.itch.io/dungeontileset-ii',
    license: 'CC0-1.0',
    retrieved: '2026-11-01',
    use: 'pavimenti, faccia del muro e cima dei massicci dei dungeon; casse della fucina',
    changes: TILE_EDIT,
  },
  'oga-eman-quest-tiles': {
    title: 'Forest and Dungeon Tilesets from Eman Quest',
    author: 'Night Blade',
    source: 'https://opengameart.org/content/forest-and-dungeon-tilesets-from-eman-quest',
    license: 'CC0-1.0',
    retrieved: '2026-11-01',
    use: 'pozzi, lava, ponti, radici e terra della palude',
    changes: `riportati a 16 pixel (erano ingranditi x4); ${TILE_EDIT}`,
  },
  'itch-kmh-dungeon': {
    title: 'dungeon_',
    author: "Kevin's Mom's House",
    source: 'https://kevins-moms-house.itch.io/dungeon',
    license: 'CC0-1.0',
    retrieved: '2026-11-01',
    use: 'panche della navata della cripta',
    changes: TILE_EDIT,
  },
  'itch-kmh-tundra': {
    title: 'tundra_',
    author: "Kevin's Mom's House",
    source: 'https://kevins-moms-house.itch.io/tundra',
    license: 'CC0-1.0',
    retrieved: '2026-11-01',
    use: 'blocchi di ghiaccio del ghiacciaio',
    changes: TILE_EDIT,
  },
  'itch-evil-wizard-2': {
    title: 'EVil Wizard 2',
    author: 'LuizMelo',
    source: 'https://luizmelo.itch.io/evil-wizard-2',
    license: 'CC0-1.0',
    retrieved: '2026-11-01',
    use: 'custode del ghiaccio',
    changes: `${BOSS_EDIT}; contorno scuro aggiunto`,
  },
};
