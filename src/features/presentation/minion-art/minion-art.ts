import type { Palette, SpriteFrame } from '../sprites';

/**
 * Grafica di un servitore: pixel art come matrici di caratteri (vedi `sprites.ts`), due fotogrammi per quelli disegnati
 * nel codice, quattro per quelli del generatore locale. Solo aspetto: il raggio di colpo sta in `MinionDefinition`.
 */
export interface MinionArt {
  readonly frames: readonly SpriteFrame[];
  readonly scale: number;
  readonly palette: Palette;
  /** Colore delle particelle (comparsa, colpo, morte) e dei segnali a terra. */
  readonly color: string;
  /** Alone luminoso sotto lo sprite (vuoto = nessuno). */
  readonly glow: string;
  /** Fotogrammi al secondo (predefinito 6). */
  readonly fps?: number;
  /** Ondeggia su e giu' (predefinito si'): le torrette e i nidi stanno fermi. */
  readonly bob?: boolean;
  /** I fotogrammi sono un passo: da fermo resta sul primo, invece di camminare sul posto. */
  readonly walks?: boolean;
  /** Disegnato di profilo, verso destra: si specchia quando va a sinistra. */
  readonly faces?: boolean;
}

/** Una copia del fotogramma con alcune righe cambiate (per il secondo fotogramma). */
export function variant(frame: SpriteFrame, rows: Readonly<Record<number, string>>): SpriteFrame {
  return frame.map((row, index) => rows[index] ?? row);
}
