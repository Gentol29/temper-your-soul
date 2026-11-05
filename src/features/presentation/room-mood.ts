import { mixColor } from './lights';

/*
 * L'atmosfera della stanza della discesa, solo nel disegno: la grata dell'ingresso cala alle spalle poco dopo l'arrivo,
 * le grate delle uscite salgono quando la stanza e' libera, la luce si scalda a stanza libera e le tappe sono piu'
 * cupe man mano che si scende. Legge solo la vista della stanza e il tempo reale: in cooperativa si vede uguale.
 */

/** Tempi e intensita'. Provvisori, solo aspetto. */
export const ROOM_MOOD = {
  /** La grata dell'ingresso cala dopo `entranceDelay` secondi dall'arrivo e cade in `entranceFall`. */
  entranceDelay: 0.5,
  entranceFall: 0.24,
  /** Rimbalzo dopo l'impatto: durata e altezza (frazione della grata). */
  bounceTime: 0.18,
  bounceHeight: 0.12,
  /** Secondi in cui le grate delle uscite salgono quando la stanza e' libera. */
  exitRise: 0.9,
  /** Secondi in cui la luce si scalda a stanza libera, quanto e verso che tono. */
  warmTime: 1.6,
  clearWarmth: 0.16,
  warmTone: '#ffcf96',
  /** Quanto si scurisce l'ambiente all'ultima tappa e quanta vignettatura si aggiunge. */
  depthDarken: 0.32,
  depthVignette: 0.15,
  /** Durata della polvere sollevata dalla grata che cade. */
  dustTime: 0.7,
} as const;

/** L'atmosfera di un fotogramma. */
export interface MoodFrame {
  /** Grata dell'ingresso: 0 alzata, 1 calata (oltre 1 mai; durante il rimbalzo scende sotto 1). */
  readonly entrance: number;
  /** Secondi dall'impatto della grata dell'ingresso (per la polvere), null se non e' ancora caduta. */
  readonly sinceImpact: number | null;
  /** Grate delle uscite: 0 giu', 1 alzate del tutto. */
  readonly exits: number;
  /** Quanto e' scaldata la luce (0..1). */
  readonly warmth: number;
  /** Profondita' della tappa (0 la prima, 1 l'ultima). */
  readonly depth: number;
}

const smoothstep = (t: number): number => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** La grata dell'ingresso `t` secondi dopo l'arrivo: ferma, poi cade accelerando, poi un piccolo rimbalzo. */
export function entranceDrop(t: number): number {
  const mood = ROOM_MOOD;
  const fall = (t - mood.entranceDelay) / mood.entranceFall;
  if (fall <= 0) return 0;
  if (fall < 1) return fall * fall;
  const bounce = (t - mood.entranceDelay - mood.entranceFall) / mood.bounceTime;
  return bounce < 1 ? 1 - mood.bounceHeight * Math.sin(bounce * Math.PI) : 1;
}

/** Il colore d'ambiente dell'atmosfera: piu' scuro con la profondita', piu' caldo a stanza libera. */
export function moodAmbient(base: string, frame: Pick<MoodFrame, 'depth' | 'warmth'>): string {
  const mood = ROOM_MOOD;
  return mixColor(mixColor(base, '#000000', mood.depthDarken * frame.depth), mood.warmTone, mood.clearWarmth * frame.warmth);
}

/** Il passaggio di luce in corso: il buio di partenza (stanza chiusa), quello d'arrivo (libera) e quanto si e' scaldato. */
export interface AmbientBlend {
  readonly from: string;
  readonly to: string;
  readonly t: number;
}

/**
 * Mentre la stanza si scalda, `moodAmbient` cambia a ogni fotogramma ma resta la mescolanza lineare di due soli colori.
 * Chi tiene in cache disegni scuriti dall'ambiente usa questi due estremi e li sfuma con `t`, invece di rifarli a ogni
 * colore intermedio (era il calo a ~30 FPS dopo l'ultimo mostro). Null quando la luce e' ferma.
 */
export function moodAmbientBlend(base: string, frame: Pick<MoodFrame, 'depth' | 'warmth'>): AmbientBlend | null {
  if (frame.warmth <= 0 || frame.warmth >= 1) return null;
  return {
    from: moodAmbient(base, { depth: frame.depth, warmth: 0 }),
    to: moodAmbient(base, { depth: frame.depth, warmth: 1 }),
    t: frame.warmth,
  };
}

/**
 * Segue la stanza corrente e i suoi cambi. `key` identifica la stanza (cambia a ogni stanza nuova); `doorsOpen` e'
 * quello della vista. Una stanza gia' aperta all'arrivo (calma) ha le uscite alzate e la luce calda da subito.
 */
export class RoomMood {
  private key: string | null = null;
  private enteredAt = 0;
  private openedAt: number | null = null;
  private lastClock = 0;

  frame(clock: number, key: string, doorsOpen: boolean, depth: number): MoodFrame {
    const mood = ROOM_MOOD;
    // Se il tempo torna indietro (un fotogramma con un istante vecchio), i riferimenti lo seguono: le grate restano dove sono.
    if (clock < this.lastClock) {
      const shift = clock - this.lastClock;
      this.enteredAt += shift;
      if (this.openedAt !== null) this.openedAt += shift;
    }
    this.lastClock = clock;
    if (key !== this.key) {
      this.key = key;
      this.enteredAt = clock;
      this.openedAt = doorsOpen ? -Infinity : null;
    } else if (doorsOpen && this.openedAt === null) this.openedAt = clock;
    else if (!doorsOpen) this.openedAt = null;
    const sinceEntry = clock - this.enteredAt;
    const impact = sinceEntry - mood.entranceDelay - mood.entranceFall;
    const sinceOpen = this.openedAt === null ? null : clock - this.openedAt;
    return {
      entrance: entranceDrop(sinceEntry),
      sinceImpact: impact >= 0 ? impact : null,
      exits: sinceOpen === null ? 0 : smoothstep(sinceOpen / mood.exitRise),
      warmth: sinceOpen === null ? 0 : smoothstep(sinceOpen / mood.warmTime),
      depth: Math.max(0, Math.min(1, depth)),
    };
  }
}
