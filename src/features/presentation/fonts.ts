/*
 * I caratteri del tema Reliquiario per i testi disegnati sul canvas: gli stessi del CSS (`style.css`, variabili
 * `--relic-*`), con le riserve di sistema finche' non sono pronti. Crediti in `ui/font-credits.ts`.
 */

/**
 * Famiglie per il canvas: titoli, testi, numeri ed etichette nello stesso carattere pixel art.
 * Pixelify Sans, provato il 1 novembre 2026, e' stato scartato: la sua B maiuscola si legge come una G.
 */
export const CANVAS_FONTS = {
  title: "'Silkscreen', monospace",
  text: "'Silkscreen', monospace",
  pixel: "'Silkscreen', monospace",
} as const;

/**
 * La stringa `font` del canvas: `canvasFont(8, 'pixel', 'bold')` -> "bold 8px 'Silkscreen', monospace". Silkscreen e'
 * disegnato su una griglia da 8 pixel e solo ai multipli di 8 resta nitido (altrimenti la C si chiude in una O): la sua
 * misura si arrotonda al multiplo di 8 piu' vicino.
 */
export function canvasFont(size: number, family: keyof typeof CANVAS_FONTS, style = ''): string {
  const px = Math.max(8, Math.round(size / 8) * 8);
  return `${style === '' ? '' : `${style} `}${px}px ${CANVAS_FONTS[family]}`;
}

/**
 * Chiede al browser di caricare subito i caratteri: il canvas non li carica da solo, e senza questa richiesta i primi
 * testi uscirebbero con il carattere di riserva. Senza DOM (test) non fa nulla.
 */
export function preloadFonts(): void {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  for (const font of [canvasFont(8, 'pixel'), canvasFont(8, 'pixel', 'bold'), canvasFont(16, 'title')]) {
    // Un carattere che non arriva lascia solo la riserva: niente errori in console.
    document.fonts.load(font).catch(() => undefined);
  }
}
