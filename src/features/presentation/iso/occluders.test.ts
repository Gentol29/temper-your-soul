import { describe, expect, it } from 'vitest';
import { behindCircle, behindRect, boxesOverlap, orderWithOccluders, type IsoFigure, type IsoOccluder, type ViewBox } from './occluders';

/** Esegue l'ordine e restituisce i nomi nell'ordine di disegno. */
function drawn(figures: readonly (Omit<IsoFigure, 'draw'> & { name: string })[], occluders: readonly (Omit<IsoOccluder, 'stamp'> & { name: string })[]): string[] {
  const log: string[] = [];
  const steps = orderWithOccluders(
    figures.map((f) => ({ ...f, draw: () => log.push(f.name) })),
    occluders.map((o) => ({ ...o, stamp: () => log.push(o.name) })),
  );
  for (const step of steps) step();
  return log;
}

const box = (x: number, y: number, width: number, height: number): ViewBox => ({ x, y, width, height });

describe('profondita isometrica con gli ostacoli', () => {
  it('le figure si disegnano da lontano a vicino, per x + y del punto a terra', () => {
    const names = drawn([
      { name: 'vicino', x: 500, y: 500, box: box(0, 0, 10, 10) },
      { name: 'lontano', x: 100, y: 100, box: box(0, 0, 10, 10) },
      { name: 'medio', x: 400, y: 200, box: box(0, 0, 10, 10) },
    ], []);
    expect(names).toEqual(['lontano', 'medio', 'vicino']);
  });

  it('un blocco torna sopra chi gli sta dietro e sotto chi gli sta davanti', () => {
    // Blocco del mondo [1000, 1400] x [600, 800]: dietro chi ha x < 1400 e y < 800.
    const behind = behindRect(1400, 800);
    expect(behind(1200, 500)).toBe(true);
    expect(behind(1450, 500)).toBe(false);
    expect(behind(1200, 850)).toBe(false);
    const names = drawn(
      [
        { name: 'dietro', x: 1200, y: 560, box: box(0, 0, 50, 50) },
        { name: 'davanti', x: 1300, y: 900, box: box(20, 20, 50, 50) },
        { name: 'lontano', x: 100, y: 100, box: box(900, 900, 10, 10) },
      ],
      [{ name: 'blocco', box: box(10, 10, 200, 100), isBehind: behind }],
    );
    expect(names).toEqual(['lontano', 'dietro', 'blocco', 'davanti']);
  });

  it('un ostacolo lungo ridisegna chi gli sta davanti ma era gia stato disegnato prima della ristampa', () => {
    // Panca lunga in x: [1000, 1176] x [600, 640]. Chi e' a sud dell'estremo ovest sta davanti ma e' meno profondo di
    // chi e' a nord dell'estremo est.
    const names = drawn(
      [
        { name: 'nordEst', x: 1166, y: 588, box: box(100, 0, 40, 60) },
        { name: 'sudOvest', x: 1020, y: 652, box: box(0, 40, 40, 60) },
      ],
      [{ name: 'panca', box: box(0, 20, 220, 80), isBehind: behindRect(1176, 640) }],
    );
    expect(names).toEqual(['sudOvest', 'nordEst', 'panca', 'sudOvest']);
  });

  it('senza nessuno dietro (o senza sovrapposizione nella vista) un ostacolo non si ristampa', () => {
    const names = drawn(
      [{ name: 'davanti', x: 900, y: 900, box: box(0, 0, 10, 10) }, { name: 'lontanoMaFuori', x: 10, y: 10, box: box(500, 500, 10, 10) }],
      [{ name: 'colonna', box: box(0, 0, 100, 100), isBehind: behindCircle(400, 400) }],
    );
    expect(names).toEqual(['lontanoMaFuori', 'davanti']);
    expect(boxesOverlap(box(0, 0, 10, 10), box(10, 0, 5, 5))).toBe(false);
    expect(boxesOverlap(box(0, 0, 10, 10), box(9, 9, 5, 5))).toBe(true);
  });

  it('dietro un cilindro sta chi ha il punto a terra piu lontano del centro', () => {
    const behind = behindCircle(1000, 1000);
    expect(behind(950, 1000)).toBe(true);
    expect(behind(1050, 990)).toBe(false);
  });
});
