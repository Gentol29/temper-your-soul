import type { Camera } from '../../../core/camera';
import type { ArenaDefinition } from '../../arena/arena';
import type { CoverState } from '../../match/match';
import type { AmbientBlend } from '../room-mood';
import type { IsoOccluder } from './occluders';
import type { SceneView } from './scene-view';

/** Cio' che serve alla grafica isometrica di una mappa in un fotogramma. Il renderer legge e non modifica nulla. */
export interface IsoArtFrame {
  readonly arena: ArenaDefinition;
  readonly view: SceneView;
  readonly camera: Camera;
  /** Tempo reale, sempre in avanzamento (fiamme, rune). */
  readonly clock: number;
  /** La vita dei ripari (`ArenaDefinition.covers`), per crepe e caduta. */
  readonly covers: readonly CoverState[];
  /** Lampo dei ripari appena colpiti, per indice. */
  readonly coverFlashes: ReadonlyMap<number, number>;
  /** Il buio della scena (#rrggbb): scurisce cio' che si disegna fuori dalla mappa di luce. */
  readonly ambient: string;
  /** Durante il passaggio di luce di una stanza liberata: i due estremi di cui `ambient` e' la mescolanza. */
  readonly ambientBlend?: AmbientBlend | null;
}

/**
 * La grafica isometrica di un tema. Solo aspetto: collisioni e misure restano quelle di `ArenaDefinition`, e ogni cosa
 * disegnata deve coincidere con il suo ingombro di gioco proiettato. Tutto si disegna con il contesto traslato dalla
 * camera (coordinate della vista) e con pixel interi, senza ricampionare i fogli (Hi-bit). L'ordine nel fotogramma:
 * pavimento in cache (`paintGround`) -> `drawBackdrop` -> soglie delle porte -> macchie e sangue -> `drawHazards` ->
 * `drawDecor` -> `drawOccluders` -> luci delle figure -> mappa di luce -> figure (con le ristampe) -> `drawForeground`.
 */
export interface IsoThemeArt {
  /** Il colore del vuoto fuori dalla stanza (#rrggbb), dietro tutto. */
  readonly void: string;
  /**
   * Il pavimento piatto visto dall'alto, in coordinate di mondo dentro il rettangolo di `camera` (sempre una camera dall'alto
   * sul pezzo da dipingere): lastre, tappeti, fughe, rune ferme, ombre a terra. Niente di cio' che sta in piedi (muri,
   * arredi, colonne): la cache lo dispone a rombo pixel per pixel. Fuori dal pavimento della stanza resta trasparente.
   */
  paintGround(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void;
  /** Con che cosa e' dipinto il pavimento (per esempio i fogli caricati): se cambia, la cache si ridipinge. */
  groundVersion(): string;
  /** Sopra il pavimento: cio' che a terra si anima e i due muri di fondo (in alto a destra e a sinistra) con torce e luci. */
  drawBackdrop(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void;
  /** Pozzi e ponti, dopo macchie e sangue (come dall'alto). */
  drawHazards(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void;
  /** Gli arredi bassi in piedi (non bloccano): sotto le figure. */
  drawDecor(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void;
  /**
   * Gli ostacoli in piedi (pilastri, massicci, ripari ancora in piedi), disegnati nella scena illuminata. Restituisce le loro
   * sagome: tornano davanti a chi passa loro dietro.
   */
  drawOccluders(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): readonly IsoOccluder[];
  /** Davanti a tutte le figure: i due muri davanti (in basso), bassi, con il bordo che scende nel buio. */
  drawForeground(ctx: CanvasRenderingContext2D, frame: IsoArtFrame): void;
}
