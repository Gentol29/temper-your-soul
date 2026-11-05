import { describe, expect, it } from 'vitest';
import { HUB_COLORS } from '../hub-palette';
import { DISSOLVE, DISSOLVE_FRAGMENT, dissolveNoise, dissolvePixel, dissolveThreshold, dissolveValue } from './dissolve';

/** Quota di pixel scomparsi in una fascia di righe di uno sprite 24x32, alla soglia data. */
function goneShare(noise: Uint8Array, threshold: number, rows: readonly [number, number], height = 32, width = 24): number {
  let gone = 0, total = 0;
  for (let y = rows[0]; y < rows[1]; y++) for (let x = 0; x < width; x++) {
    total++;
    if (dissolvePixel(dissolveValue(noise, x, y, height), threshold) === 'gone') gone++;
  }
  return gone / total;
}

describe('dissolvenza a rumore dei servitori', () => {
  const noise = dissolveNoise();

  it('il rumore e\' deterministico, copre tutta la scala di grigi ed e\' bilanciato', () => {
    expect(noise).toHaveLength(DISSOLVE.noiseSize * DISSOLVE.noiseSize);
    expect(dissolveNoise()).toEqual(noise);
    expect(Math.min(...noise)).toBe(0);
    expect(Math.max(...noise)).toBe(255);
    const mean = noise.reduce((sum, value) => sum + value, 0) / noise.length;
    expect(mean).toBeGreaterThan(90); expect(mean).toBeLessThan(165);
  });

  it('la figura resta intera durante il lampo, poi si sfalda del tutto entro la fine', () => {
    for (const u of [0, 0.05, DISSOLVE.flash - 0.01]) expect(goneShare(noise, dissolveThreshold(u), [0, 32])).toBe(0);
    let previous = -Infinity;
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const threshold = dissolveThreshold(u);
      expect(threshold).toBeGreaterThanOrEqual(previous);
      previous = threshold;
    }
    expect(goneShare(noise, dissolveThreshold(DISSOLVE.flash + 0.02), [0, 32])).toBeLessThan(0.1);
    expect(goneShare(noise, dissolveThreshold(1), [0, 32])).toBe(1);
  });

  it('e\' asimmetrica: la testa si sfalda prima dei piedi', () => {
    for (const u of [0.4, 0.55, 0.7]) {
      const threshold = dissolveThreshold(u);
      // Su tutto il periodo del rumore (64x64), cosi' conta l'altezza e non la chiazza in cui cade la fascia.
      expect(goneShare(noise, threshold, [0, 16], 64, 64), `u=${u}`).toBeGreaterThan(goneShare(noise, threshold, [48, 64], 64, 64));
    }
  });

  it('appena sopra la soglia c\'e\' l\'orlo colorato, piu\' su il colore proprio', () => {
    expect(dissolvePixel(0.3, 0.4)).toBe('gone');
    expect(dissolvePixel(0.4 + DISSOLVE.edge / 2, 0.4)).toBe('edge');
    expect(dissolvePixel(0.4 + DISSOLVE.edge * 1.5, 0.4)).toBe('kept');
  });

  it('lo shader usa la stessa regola: soglia, orlo, peso dell\'altezza e pixel interi', () => {
    for (const name of ['uThreshold', 'uEdge', 'uHeightWeight', 'uNoiseSize', 'uSize', 'uEdgeColor', 'uNoise', 'uTexture']) {
      expect(DISSOLVE_FRAGMENT, name).toContain(name);
    }
    expect(DISSOLVE_FRAGMENT).toContain('floor(vUV * uSize)');
    expect(DISSOLVE_FRAGMENT.match(/discard/g)).toHaveLength(2);
  });

  it('gli orli sono nella palette del gioco: brace del rifugio, cenere e energia', () => {
    expect(DISSOLVE.edgeColors.blood).toBe(HUB_COLORS.fire);
    for (const color of Object.values(DISSOLVE.edgeColors)) expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
