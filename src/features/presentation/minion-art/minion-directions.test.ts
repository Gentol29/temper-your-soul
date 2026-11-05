import { describe, expect, it } from 'vitest';
import { SPRITE_DIRECTIONS, directionSeries } from './minion-directions';

const deg = (d: number): number => (d * Math.PI) / 180;
const name = (series: number): string => SPRITE_DIRECTIONS[series]!;

describe('direzione degli sprite a 8 direzioni', () => {
  it('l\'angolo sullo schermo sceglie la serie giusta (0 = destra, 90 = giu\' sullo schermo)', () => {
    expect(name(directionSeries(deg(90)))).toBe('S');
    expect(name(directionSeries(deg(45)))).toBe('SE');
    expect(name(directionSeries(deg(0)))).toBe('E');
    expect(name(directionSeries(deg(-45)))).toBe('NE');
    expect(name(directionSeries(deg(-90)))).toBe('N');
    expect(name(directionSeries(deg(-135)))).toBe('NW');
    expect(name(directionSeries(deg(180)))).toBe('W');
    expect(name(directionSeries(deg(135)))).toBe('SW');
  });

  it('gli angoli equivalenti danno la stessa serie e tutte le 8 serie sono raggiungibili', () => {
    expect(directionSeries(deg(270))).toBe(directionSeries(deg(-90)));
    expect(directionSeries(deg(360 + 45))).toBe(directionSeries(deg(45)));
    const seen = new Set<number>();
    for (let a = -180; a < 180; a += 5) seen.add(directionSeries(deg(a)));
    expect(seen.size).toBe(8);
  });

  it('senza serie precedente il confine passa a meta\' fra due direzioni', () => {
    expect(name(directionSeries(deg(21)))).toBe('E');
    expect(name(directionSeries(deg(24)))).toBe('SE');
  });

  it('con la serie precedente non si volta per un piccolo scarto oltre il confine (niente tremolio)', () => {
    const east = directionSeries(deg(0));
    // 24 gradi sarebbe gia' SE, ma da est si resta finche' non si supera il margine.
    expect(directionSeries(deg(24), east)).toBe(east);
    expect(directionSeries(deg(30), east)).toBe(east);
    expect(name(directionSeries(deg(40), east))).toBe('SE');
    // Anche attorno al confine +-180 (ovest) non salta.
    const west = directionSeries(deg(180));
    expect(directionSeries(deg(-170), west)).toBe(west);
    expect(directionSeries(deg(200), west)).toBe(west);
  });
});
