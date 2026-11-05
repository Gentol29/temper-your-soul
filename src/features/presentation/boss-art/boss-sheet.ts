/** Un'animazione: una riga del foglio, con i suoi fotogrammi da sinistra. */
export interface SheetClip {
  readonly row: number;
  readonly frames: number;
}

/**
 * Geometria di un foglio di sprite, generata dal generatore locale in `boss-ia-layout.ts`: celle uguali,
 * una riga per animazione. Le animazioni "rage" sono le stesse ricolorate per la furia; `transform` (facoltativa) si
 * vede al passaggio di fase, `death` durante la morte.
 */
export interface SheetLayout {
  readonly url: string;
  readonly cell: { readonly width: number; readonly height: number };
  /** Punto dei piedi nella cella, in pixel del foglio: e' il perno del disegno e dello specchio. */
  readonly feet: { readonly x: number; readonly y: number };
  readonly clips: {
    readonly walk: SheetClip;
    readonly attack: SheetClip;
    readonly rageWalk: SheetClip;
    readonly rageAttack: SheetClip;
    readonly death: SheetClip;
    readonly transform?: SheetClip;
  };
}

/**
 * Grafica di un boss da foglio di sprite (pixel art di terzi, crediti in `art-credits.ts`). Solo aspetto: il raggio
 * di colpo resta quello dei dati, la scala e' scelta perche' la figura copra all'incirca il cerchio di colpo.
 */
export interface BossSheet {
  readonly layout: SheetLayout;
  /** Ingrandimento intero, perche' la pixel art resti nitida. */
  readonly scale: number;
  /** Vero se nel foglio la figura guarda a sinistra (si specchia per guardare il giocatore). */
  readonly facesLeft: boolean;
  /** Distanza dei piedi sotto il centro del boss, in unita' del mondo (di solito dove cade l'ombra). */
  readonly feetY: number;
  /** Fotogrammi al secondo della camminata; da rallentato va a meta'. */
  readonly walkFps: number;
  /** Ingrandimento intero nella vignetta della scelta del dungeon (480 x 280, piedi a 228). */
  readonly portraitScale: number;
  /** Id dei crediti in `art-credits.ts`. */
  readonly credits: readonly string[];
}

/** Che cosa sta facendo il boss in questo fotogramma (dalle pose e dagli effetti). */
export interface SheetState {
  readonly enraged: boolean;
  readonly slowed: boolean;
  /** Tempo della partita: scandisce la camminata. */
  readonly time: number;
  /** Avanzamento 0–1 della posa di attacco, null se non attacca. */
  readonly cast: number | null;
  /** Avanzamento 0–1 della trasformazione della fase II, null se non e' in corso. */
  readonly transform: number | null;
  /** Avanzamento 0–1 della sequenza di morte, null se vivo. */
  readonly death: number | null;
}

export interface SheetFrame {
  readonly row: number;
  readonly column: number;
}

/**
 * Quota della sequenza di morte in cui scorre l'animazione: poi resta sull'ultimo fotogramma (le macerie) finche'
 * il boss si frantuma.
 */
export const DEATH_ANIMATION_SHARE = 0.75;

function once(clip: SheetClip, progress: number): SheetFrame {
  const column = Math.floor(Math.min(1, Math.max(0, progress)) * clip.frames);
  return { row: clip.row, column: Math.min(clip.frames - 1, column) };
}

/** Sceglie il fotogramma: prima la morte, poi la trasformazione, poi l'attacco, altrimenti la camminata in anello. */
export function sheetFrame(sheet: BossSheet, state: SheetState): SheetFrame {
  const { clips } = sheet.layout;
  if (state.death !== null) return once(clips.death, state.death / DEATH_ANIMATION_SHARE);
  if (state.transform !== null && clips.transform !== undefined) return once(clips.transform, state.transform);
  if (state.cast !== null) return once(state.enraged ? clips.rageAttack : clips.attack, state.cast);
  const walk = state.enraged ? clips.rageWalk : clips.walk;
  const fps = sheet.walkFps * (state.slowed ? 0.5 : 1);
  return { row: walk.row, column: Math.floor(Math.max(0, state.time) * fps) % walk.frames };
}
