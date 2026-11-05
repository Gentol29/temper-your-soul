import manifest from '../../../assets/vfx/frames/manifest.json';
import type { VfxId } from './assets';

/**
 * Animazioni delle skill a fotogrammi: un PNG per effetto in `src/assets/vfx/frames/`, 12 fotogrammi quadrati affiancati.
 * Gli sprite sono rifiniti con Z-Image Turbo in locale a partire dalle pose che il gioco disegnava nel codice e ridotti a
 * pixel Hi-bit da `vfx/riduci_vfx.py` (script fuori dal repository, vedi README · Strumenti esterni), che scrive anche il
 * manifest. Qui solo caricamento e scelta del fotogramma.
 */
export interface FrameSheet {
  readonly file: string;
  /** Lato di un fotogramma in pixel d'arte. */
  readonly size: number;
  readonly seed: number;
  readonly denoise: number;
  readonly steps: number;
}
interface FrameManifest {
  readonly fps: number;
  readonly frames: number;
  readonly model: string;
  readonly effects: Readonly<Partial<Record<VfxId, FrameSheet>>>;
}
export const FRAME_SHEETS = manifest as unknown as FrameManifest;

const urls = import.meta.glob('../../../assets/vfx/frames/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const frameSheetUrl = (file: string): string | undefined => urls[`../../../assets/vfx/frames/${file}`];

const images = new Map<VfxId, HTMLImageElement>();
function sheetImage(id: VfxId): HTMLImageElement | undefined {
  if (typeof Image === 'undefined') return undefined;
  const entry = FRAME_SHEETS.effects[id]; if (!entry) return undefined;
  let image = images.get(id);
  if (!image) {
    const url = frameSheetUrl(entry.file); if (!url) return undefined;
    image = new Image(); image.decoding = 'async'; image.src = url; images.set(id, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : undefined;
}

/** Comincia a caricare i fogli: sono piccoli e locali, pronti prima del primo lancio. */
export function preloadFrameSheets(ids: readonly VfxId[]): void {
  for (const id of ids) sheetImage(id);
}

export function frameSheetReady(id: VfxId): boolean {
  return sheetImage(id) !== undefined;
}

/** Fotogramma da mostrare: in ciclo a `fps`, oppure tutti i fotogrammi distribuiti su `duration` e fermi sull'ultimo. */
export function sheetFrame(time: number, duration?: number): number {
  const count = FRAME_SHEETS.frames;
  const index = Math.max(0, Math.floor(time * (duration ? count / duration : FRAME_SHEETS.fps)));
  return duration ? Math.min(count - 1, index) : index % count;
}

/** Disegna l'effetto centrato in (`x`, `y`), largo `width`, ruotato di `angle`. Falso se il foglio non e' ancora pronto. */
export function drawFrameVfx(ctx: CanvasRenderingContext2D, id: VfxId, x: number, y: number, width: number,
  time: number, angle: number, alpha: number, duration?: number): boolean {
  const entry = FRAME_SHEETS.effects[id]; if (!entry) return false;
  const image = sheetImage(id); if (!image) return false;
  const frame = sheetFrame(time, duration), size = entry.size;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, frame * size, 0, size, size, -width / 2, -width / 2, width, width);
  ctx.restore(); return true;
}
