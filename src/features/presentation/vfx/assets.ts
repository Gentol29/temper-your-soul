import manifest from '../../../assets/vfx/pixellab/manifest.json';
import { drawHiBitVfx, hiBitAvailable, prewarmHiBitVfx } from './hi-bit-atlas';

export const VFX_IDS = ['warrior-cleave', 'warrior-guard', 'warrior-fortify', 'warrior-rush',
  'mage-fireball', 'mage-water-orb', 'mage-earth-wisp', 'mage-wind-orb', 'mage-fire-explosion',
  'mage-water-explosion', 'mage-earth-aura', 'mage-blink', 'archer-arrow', 'archer-predator', 'archer-summon', 'archer-dash', 'archer-release'] as const;
export type VfxId = typeof VFX_IDS[number];
/** Nuovi effetti interamente nel codice, senza un atlante PixelLab storico. */
export const NATIVE_ONLY_VFX:readonly VfxId[]=['archer-release'];
export interface VfxAsset {
  readonly file: string;
  readonly frames: readonly (readonly [number, number, number, number])[];
  readonly fps: number;
  readonly loop: boolean;
  readonly pivot: readonly [number, number];
  readonly source: string;
  readonly effectId: string;
  readonly generations: number;
}
interface Manifest {
  readonly effects: Readonly<Partial<Record<VfxId, VfxAsset>>>;
  readonly icons: Readonly<Record<string, { readonly file: string; readonly generations: number }>>;
}
export const PIXELLAB_MANIFEST = manifest as unknown as Manifest;
const urls = import.meta.glob('../../../assets/vfx/pixellab/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const assetUrl = (file: string): string | undefined => urls[`../../../assets/vfx/pixellab/${file}`];
export const GENERATED_ITEM_ICONS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(PIXELLAB_MANIFEST.icons).flatMap(([id, asset]) => { const url = assetUrl(asset.file); return url ? [[id, url]] : []; }),
);

const images = new Map<VfxId, HTMLImageElement>();
function loadedImage(id: VfxId, asset: VfxAsset): HTMLImageElement | undefined {
  if (typeof Image === 'undefined') return undefined;
  let image = images.get(id);
  if (!image) {
    const url = assetUrl(asset.file); if (!url) return undefined;
    image = new Image(); image.decoding = 'async'; image.src = url; images.set(id, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : undefined;
}

/** Il primo e l'ultimo fotogramma sono inclusi; a fine animazione non si riparte accidentalmente. */
export function frameIndex(count: number, time: number, fps: number, loop: boolean): number {
  if (count <= 1) return 0;
  const index = Math.max(0, Math.floor(time * fps));
  return loop ? index % count : Math.min(count - 1, index);
}

export function drawVfx(ctx: CanvasRenderingContext2D, id: VfxId, x: number, y: number,
  width: number, time: number, angle = 0, alpha = 1, duration?: number): boolean {
  if (drawHiBitVfx(ctx, id, x, y, width, time, angle, alpha, duration)) return true;
  const asset = PIXELLAB_MANIFEST.effects[id]; if (!asset) return false;
  const image = loadedImage(id, asset); if (!image) return false;
  const fps = duration ? asset.frames.length / duration : asset.fps;
  const index = frameIndex(asset.frames.length, time, fps, duration === undefined && asset.loop);
  const [sx, sy, sw, sh] = asset.frames[index];
  const scale = width / sw;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, -asset.pivot[0] * scale, -asset.pivot[1] * scale, width, sh * scale);
  ctx.restore(); return true;
}

/** Prepara i nuovi raster durante le pause del browser; i vecchi PNG restano un ripiego su richiesta. */
prewarmHiBitVfx(VFX_IDS);

export function isVfxReady(id: VfxId): boolean {
  if (hiBitAvailable()) return true;
  const asset = PIXELLAB_MANIFEST.effects[id]; return !!asset && !!loadedImage(id, asset);
}
