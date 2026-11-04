import { describe, expect, it } from 'vitest';
import { hubView } from './hub-arrival';
import { hubCanvasDisplay, snapHubLabel } from './hub-projection';

describe('nitidezza della proiezione del rifugio', () => {
  it.each([[1365, 767], [1878, 922], [390, 844]])('non stira i pixel del canvas al termine dello zoom a %s×%s', (width, height) => {
    const view = hubView(width, height, 512, 332, 1);
    const display = hubCanvasDisplay(view.width, view.height, view.scale);
    expect(Number.isInteger(view.scale)).toBe(true);
    expect(display.width / view.width).toBe(view.scale);
    expect(display.height / view.height).toBe(view.scale);
    expect(display.width).toBeGreaterThanOrEqual(width);
    expect(display.height).toBeGreaterThanOrEqual(height);
    expect(display.width - width).toBeLessThan(view.scale);
    expect(display.height - height).toBeLessThan(view.scale);
  });
  it.each([1, 1.25, 1.5, 2])('mantiene le etichette sui pixel fisici con rapporto %s', ratio => {
    for (let x = -15.25; x < 200; x += 0.17) {
      const snapped = snapHubLabel(x, ratio);
      expect(snapped * ratio).toBeCloseTo(Math.round(snapped * ratio), 10);
      expect(Math.abs(snapped - x)).toBeLessThanOrEqual(0.5 / ratio + 1e-10);
    }
  });
});
