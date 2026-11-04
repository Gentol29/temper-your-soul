import { describe, expect, it } from 'vitest';
import { Vec2 } from './vec2';
import { circleInsidePolygon, circleTouchesPolygon, pointInPolygon } from './polygon';

// Pavimento a L: il rientro (4, 4) deve respingere anche un cerchio il cui centro è sul pavimento.
const floor = [[0, 0], [12, 0], [12, 4], [4, 4], [4, 12], [0, 12]].map(([x, y]) => new Vec2(x!, y!));
describe('appoggio circolare sui poligoni', () => {
  it('riconosce il rientro concavo senza usare il solo rettangolo esterno', () => {
    expect(pointInPolygon(new Vec2(8, 8), floor)).toBe(false);
    expect(circleInsidePolygon(new Vec2(2, 8), 1, floor)).toBe(true);
    expect(circleInsidePolygon(new Vec2(3, 3), 2, floor)).toBe(false);
  });
  it('tiene libero il raggio intero sui lati e sugli spigoli, anche diagonali', () => {
    const triangle = [new Vec2(0, 0), new Vec2(12, 0), new Vec2(0, 12)];
    expect(circleInsidePolygon(new Vec2(4, 4), 2, triangle)).toBe(true);
    expect(circleInsidePolygon(new Vec2(5, 5), 2, triangle)).toBe(false);
    expect(circleTouchesPolygon(new Vec2(7, 7), 2, triangle)).toBe(true);
    expect(circleTouchesPolygon(new Vec2(9, 9), 2, triangle)).toBe(false);
    expect(circleTouchesPolygon(new Vec2(-1, -1), 2, triangle)).toBe(true);
  });
  it('consente la tangenza senza penetrazione e gestisce vertici ripetuti', () => {
    const square = [new Vec2(0, 0), new Vec2(10, 0), new Vec2(10, 10), new Vec2(0, 10), new Vec2(0, 10)];
    expect(circleInsidePolygon(new Vec2(2, 5), 2, square)).toBe(true);
    expect(circleInsidePolygon(new Vec2(1.99, 5), 2, square)).toBe(false);
    expect(circleTouchesPolygon(new Vec2(-2, 5), 2, square)).toBe(false);
    expect(circleTouchesPolygon(new Vec2(-1.99, 5), 2, square)).toBe(true);
  });
});
