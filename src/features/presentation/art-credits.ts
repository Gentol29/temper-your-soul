import { AUDIO_LICENSES } from '../audio/audio-credits';
/*
 * Crediti della grafica di terzi usata dal gioco. Regole (docs/risorse-libere.md): licenze CC0, pubblico dominio o CC BY,
 * eccezione autorizzata il 2026-11-01 per effetti e icone generati con l'IA (allora PixelLab; ora il generatore locale, vedi docs/vfx-pixellab.md).
 * Le licenze CC BY chiedono di citare autore e licenza e di dire che l'opera e' stata modificata: il pannello dei
 * crediti mostra autore e licenza, qui sotto ci sono le modifiche.
 */

/** Licenze ammesse per la grafica (stessi nomi di quelle dell'audio, per mostrarle allo stesso modo). */
export type ArtLicense = 'CC0-1.0' | 'CC-BY-3.0' | 'CC-BY-4.0' | 'Generato-locale';
export const VFX_CREDIT_IDS = ['menu-rifugio-ia', 'local-zimage-vfx', 'local-sdxl-meteor'] as const;
export const ART_LICENSES = { ...AUDIO_LICENSES, 'Generato-locale': { name: 'Generato con IA in locale · da approvare', url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', requiresAttribution: false } };

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

/** Crediti per id (`<fonte>-<opera>`), consultati e scaricati il 1 novembre 2026. */
export const ART_CREDITS: Readonly<Record<string, ArtCredit>> = {
  'menu-rifugio-ia': {
    title: 'Rifugio del menu principale', author: 'Temper your soul · generato in locale con SDXL e Pixel Art XL',
    source: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', license: 'Generato-locale', retrieved: '2026-11-03',
    use: 'cortile e strutture dello sfondo del menu; soglia della pagina Personaggi',
    changes: 'ricreato da una tavola dell\'utente, strutture scontornate, palette comune e schiarita; vedi src/assets/art/menu/LEGGIMI.md',
  },
  'local-zimage-vfx': {
    title: 'Animazioni delle skill delle tre classi',
    author: 'Temper your soul · rifinito in locale con Z-Image Turbo (Tongyi-MAI, Apache-2.0)',
    source: 'https://huggingface.co/Comfy-Org/z_image_turbo',
    license: 'Generato-locale',
    retrieved: '2026-11-05',
    use: 'i 17 fogli a fotogrammi delle skill di Guerriero, Mago e Arciere (src/assets/vfx/frames)',
    changes: 'img2img sulle 12 pose che il gioco disegnava nel codice, ridotte a pixel Hi-bit con la palette di ogni posa e contorno scuro',
  },
  'local-sdxl-meteor': {
    title: 'Impatto della meteora',
    author: 'Temper your soul · rifinito in locale con SDXL 1.0 e Pixel Art XL (nerijs)',
    source: 'https://huggingface.co/nerijs/pixel-art-xl',
    license: 'Generato-locale',
    retrieved: '2026-11-05',
    use: 'esplosione isometrica della meteora (src/assets/vfx/frames/meteor-impact.png)',
    changes: 'img2img su 16 pose disegnate con i 12 principi dell’animazione, ridotte a pixel Hi-bit con la palette delle pose; onda d’urto ritagliata all’area di danno',
  },
  'local-sdxl-boss': {
    title: 'Boss, luogotenenti e servitori',
    author: 'Temper your soul · generato in locale con SDXL 1.0 e Pixel Art XL (nerijs)',
    source: 'https://huggingface.co/nerijs/pixel-art-xl',
    license: 'Generato-locale',
    retrieved: '2026-11-03',
    use: 'boss, luogotenenti e i servitori del generatore locale',
    changes: 'un disegno per figura, ridotto a pixel veri; animazioni, furia, passaggio di fase e morte ricavati da quel disegno',
  },
  'local-sdxl-tile': {
    title: 'Tile dei dungeon',
    author: 'Temper your soul · generato in locale con SDXL 1.0 e Pixel Art XL (nerijs)',
    source: 'https://huggingface.co/nerijs/pixel-art-xl',
    license: 'Generato-locale',
    retrieved: '2026-11-04',
    use: 'superfici, facciate, colonne, portali, ponti, ripari e arredi dei quattro dungeon',
    changes: 'ridotti a un pixel per unità di mondo; superfici sulle rampe del tema; orli e ringhiere composti dallo script',
  },
};
