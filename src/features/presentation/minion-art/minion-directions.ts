/** Nomi delle direzioni nell'ordine delle serie di fotogrammi di uno sprite. */
export const SPRITE_DIRECTIONS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'] as const;
export type SpriteDirection = (typeof SPRITE_DIRECTIONS)[number];

/** Indice della serie per settore dello schermo (0 = est, 1 = sud-est, 2 = sud... in senso orario dall'est). */
const SERIES_OF_SECTOR = [2, 1, 0, 7, 6, 5, 4, 3] as const;
/** Settore dello schermo per indice di serie (l'inverso di `SERIES_OF_SECTOR`). */
const SECTOR_OF_SERIES = SERIES_OF_SECTOR.map((_, series) => SERIES_OF_SECTOR.indexOf(series as never)) as readonly number[];

const SECTOR = Math.PI / 4;
/** Quanto oltre il bordo del settore deve andare la rotta per voltarsi: evita il tremolio ai confini fra due direzioni. */
const HYSTERESIS = (10 * Math.PI) / 180;

/** La differenza piu' corta fra due angoli, in valore assoluto (0..pi). */
function angleGap(a: number, b: number): number {
  const turn = (((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  return Math.abs(turn);
}

/**
 * La serie di fotogrammi da mostrare per un angolo sullo schermo. Con `previous` (la serie di prima) resta su quella finche'
 * l'angolo non esce dal suo settore di almeno `HYSTERESIS`.
 */
export function directionSeries(angle: number, previous?: number): number {
  if (previous !== undefined) {
    const center = (SECTOR_OF_SERIES[previous] ?? 0) * SECTOR;
    if (angleGap(angle, center) <= SECTOR / 2 + HYSTERESIS) return previous;
  }
  const sector = ((Math.round(angle / SECTOR) % 8) + 8) % 8;
  return SERIES_OF_SECTOR[sector]!;
}
