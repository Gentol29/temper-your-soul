import type { Camera } from '../../../core/camera';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import type { BlockLook } from './wall';

/**
 * Il disegno di una mappa: pavimento, muro perimetrale, decorazioni e pilastri. Solo aspetto: le collisioni e le
 * dimensioni sono in `ArenaDefinition`. Le funzioni disegnano in coordinate di mondo (il contesto e' gia' traslato
 * dalla camera) e devono limitarsi alla parte visibile (`camera.isVisible`, `camera.position`, `camera.width/height`).
 */
export interface ArenaTheme {
  /** Sfondo, pavimento, muro perimetrale e decorazioni a terra. `clock` e' il tempo reale (anima fiamme, bolle...). */
  drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void;
  /** Un pilastro (se visibile). Disegnato sopra il pavimento e sotto i personaggi. */
  drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void;
  /**
   * Cio' che sta davanti alle figure (la cima del muro in basso). Disegnato dopo i personaggi, prima dei proiettili,
   * quindi fuori dalla mappa di luce: `ambient` e' il buio della scena, per scurirlo come il resto.
   */
  drawForeground?(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number, ambient: string): void;
  /** Il buio dell'ambiente (#rrggbb) moltiplicato sul pavimento dove non arriva nessuna luce. */
  readonly ambient: string;
  /** Come si disegnano i massicci delle stanze: cima, bordo e faccia come i muri del tema. */
  readonly block: BlockLook;
  /** Bordo chiaro attorno alle sagome dei servitori (#rrggbbaa): le stacca dal pavimento. */
  readonly silhouette: string;
  /** Colore del buio ai bordi dello schermo (vignettatura). */
  readonly vignette: string;
  /** Spessore del contorno scuro dei proiettili nemici, se diverso dal solito (pavimenti chiari). */
  readonly projectileRim?: number;
  /** Colori del pavimento e dei pericoli a terra: i proiettili nemici di questo dungeon devono restarne lontani. */
  readonly groundColors: readonly string[];
}
