import type { CharacterAppearance } from '../character/appearance';
import type { Camera } from '../../core/camera';
import type { Match } from '../match/match';
import type { Effects } from './effects';
import type { MoodFrame } from './room-mood';
import type { ActorPoses } from './poses';
import type { Player } from '../player/player';
import { renderIsometricScene } from './iso/iso-scene';
import { isoArtFor } from './iso/view-mode';

/** Tutto cio' che serve per disegnare un fotogramma. Il renderer legge e non modifica nulla. */
export interface Scene {
  readonly allies?: readonly { player: Player; poses: ActorPoses; name: string; appearance: CharacterAppearance }[];
  readonly appearance?: CharacterAppearance;
  readonly match: Match;
  readonly effects: Effects;
  readonly poses: ActorPoses;
  readonly camera: Camera;
  /** Tempo reale trascorso, sempre in avanzamento (anche in pausa): anima le torce e il lampeggio. */
  readonly clock: number;
  /**
   * Stanza della discesa, in coordinate del mondo: `floor` l'ambiente sotto la luce (soglie, cancelli), `objects` i
   * premi a piena luce, `front` cio' che sta davanti alle figure (l'ingresso nel muro in basso), `above` i cartelli
   * sopra tutto. `drawRoomScreen` in coordinate dello schermo (frecce verso i nemici fuori vista).
   */
  readonly drawRoom?: (ctx: CanvasRenderingContext2D, layer: RoomLayer) => void;
  readonly drawRoomScreen?: (ctx: CanvasRenderingContext2D) => void;
  /** La preda della Caccia (in cooperativa i servitori replicati non sanno di esserlo). */
  readonly preyId?: number | null;
  /** L'atmosfera della stanza della discesa: la luce si scalda a stanza libera, le tappe profonde si incupiscono. */
  readonly mood?: MoodFrame;
}

export type RoomLayer = 'floor' | 'objects' | 'front' | 'above';

/** Luce attorno a ogni giocatore vivo: il pavimento vicino resta sempre leggibile. Provvisori. */
export const SCENE_LIGHTS = {
  player: { color: '#e8dcc8', radius: 300, intensity: 0.85 },
  boss: { color: '#c0b0e0', radius: 230, intensity: 0.4 },
  enemyShot: { radius: 38, intensity: 0.35 },
  playerShot: { radius: 46, intensity: 0.45 },
  glowingMinion: { scale: 4, intensity: 0.5 },
} as const;

/** Disegna un fotogramma della partita sul canvas: tutte le mappe si vedono in isometria 2:1 (`iso/iso-scene.ts`). */
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  renderIsometricScene(ctx, scene, isoArtFor(scene.match.arena.theme));
}
