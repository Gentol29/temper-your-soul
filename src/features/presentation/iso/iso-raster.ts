import { isoPixel } from '../../../core/view-projection';

/*
 * Raster del pavimento in isometria, pixel per pixel: una immagine dipinta dall'alto (un tassello di pavimento, una macchia di
 * sangue, una runa) diventa la sua versione a rombo con `isoPixel`, senza perdere, duplicare o sfumare nessun pixel. Solo
 * rappresentazione. La funzione pura lavora su `Uint32Array` (un pixel RGBA per elemento) cosi' si prova senza DOM: e' il
 * riferimento dei test. Nel gioco la stessa disposizione si fa solo con copie di rettangoli (`iso-shear.ts`), senza leggere
 * i pixel di un canvas (vietato da file:// quando il canvas ha disegnato un foglio PNG).
 */

/** Una raster gia' disposta a rombo, con la posizione del suo angolo alto a sinistra nella vista. */
export interface IsoRaster {
  readonly data: Uint32Array;
  readonly width: number;
  readonly height: number;
  /** Angolo alto a sinistra nella vista: si disegna con `drawImage(raster, left, top)` sotto la sola traslazione della camera. */
  readonly left: number;
  readonly top: number;
}

/** Misure e posizione nella vista della raster `width` x `height` che dall'alto ha l'angolo alto a sinistra nel punto intero (`x`, `y`). */
export function isoRasterBounds(width: number, height: number, x: number, y: number): { width: number; height: number; left: number; top: number } {
  const first = isoPixel(x, y);
  const last = isoPixel(x + width - 1, y + height - 1);
  return { width: width + height - 1, height: last.y - first.y + 1, left: x - y - (height - 1), top: first.y };
}

/**
 * Dispone a rombo la raster `source` (`width` x `height`, righe dall'alto) che nel mondo ha l'angolo alto a sinistra nel punto
 * intero (`x`, `y`). I pixel fuori dal rombo restano trasparenti (0). La parita' di `x + y` conta: lo stesso disegno in due
 * punti vicini puo' uscire con gli scalini sfasati di un pixel, come richiede la griglia della vista.
 */
export function permuteToIso(source: Uint32Array, width: number, height: number, x: number, y: number): IsoRaster {
  const bounds = isoRasterBounds(width, height, x, y);
  const data = new Uint32Array(bounds.width * bounds.height);
  // Per la riga j e la colonna i: vista = (x - y + i - j, ceil((x + y + i + j) / 2)); dentro la raster si toglie l'angolo.
  const odd = ((x + y) & 1) !== 0;
  const shift = height - 1;
  for (let j = 0; j < height; j++) {
    const row = j * width;
    for (let i = 0; i < width; i++) {
      const sum = i + j;
      // ceil((p + s) / 2) - ceil(p / 2) vale ceil(s / 2) con p pari e floor(s / 2) con p dispari.
      const localY = odd ? sum >> 1 : (sum + 1) >> 1;
      data[localY * bounds.width + (i - j + shift)] = source[row + i]!;
    }
  }
  return { data, ...bounds };
}
