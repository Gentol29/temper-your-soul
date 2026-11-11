/** Un fotogramma raster: righe di simboli compresse (12a = dodici volte a) e agganci nel 64 x 64. */
export interface HeroFrame {
  readonly y: number;
  readonly rows: string;
  /** Mano principale: x, y e se sta davanti al petto. */
  readonly hand: readonly [number, number, boolean];
  /** Mano secondaria, come sopra. */
  readonly far: readonly [number, number, boolean];
  /** Punto sulla schiena (faretra), e se sta davanti al petto: la schiena e' rivolta a chi guarda. */
  readonly back: readonly [number, number, boolean];
}
