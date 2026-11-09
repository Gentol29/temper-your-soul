import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../../core/vec2';
import { readPng, type DecodedPng } from '../../../testing-png';
import { emberPoint, impactEmbers, impactFrame, isMeteorImpact, METEOR_IMPACT, MeteorImpacts } from './meteor-impact';

const at = new Vec2(300, 200);
const detonation = (visual?: string, team: 'player' | 'enemy' = 'player') =>
  ({ type: 'zone_detonated' as const, team, position: at, radius: 66, ...(visual === undefined ? {} : { visual }) });

describe('impatto della meteora sul pavimento', () => {
  it('riconosce solo la meteora del giocatore', () => {
    expect(isMeteorImpact(detonation())).toBe(true);
    expect(isMeteorImpact(detonation('meteor'))).toBe(true);
    expect(isMeteorImpact(detonation('meteor', 'enemy'))).toBe(false);
    expect(isMeteorImpact(detonation('veil_blast'))).toBe(false);
    expect(isMeteorImpact(detonation('mage_blink_burst'))).toBe(false);
  });

  it('16 fotogrammi a 20 fps, poi finisce; le schegge restano un poco di piu\'', () => {
    expect(impactFrame(0)).toBe(0);
    expect(impactFrame(15 / 20)).toBe(15);
    expect(impactFrame(16 / 20)).toBeNull();
    const impacts = new MeteorImpacts();
    impacts.handle(detonation());
    expect(impacts.impacts).toHaveLength(1);
    expect(impacts.embers).toHaveLength(METEOR_IMPACT.embers.count);
    impacts.update(0.81);
    expect(impacts.impacts).toHaveLength(0);
    expect(impacts.embers.length).toBeGreaterThan(0);
    impacts.update(METEOR_IMPACT.embers.life);
    expect(impacts.embers).toHaveLength(0);
    impacts.handle(detonation('veil_blast'));
    expect(impacts.impacts).toHaveLength(0);
  });

  it('le schegge volano ad arco e atterrano dentro l\'area di danno, sempre uguali per lo stesso punto', () => {
    const embers = impactEmbers(at.x, at.y, 66);
    expect(impactEmbers(at.x, at.y, 66)).toEqual(embers);
    for (const ember of embers) {
      const top = emberPoint({ ...ember, age: ember.vz / METEOR_IMPACT.embers.gravity });
      expect(top.z).toBeGreaterThan(METEOR_IMPACT.embers.startHeight);
      const landed = emberPoint({ ...ember, age: ember.flight });
      expect(landed.z).toBeCloseTo(0, 6);
      expect(Math.hypot(landed.x - at.x, landed.y - at.y)).toBeLessThanOrEqual(66 * METEOR_IMPACT.embers.reach[1] + 1e-6);
      // Dopo l'atterraggio resta ferma a terra.
      expect(emberPoint({ ...ember, age: ember.flight + 0.3 })).toEqual(landed);
    }
  });

  describe('foglio dei fotogrammi', () => {
    let sheet: DecodedPng;
    const { frameWidth: w, frameHeight: h, frames, pivotX, pivotY } = METEOR_IMPACT;
    const alphaAt = (f: number, x: number, y: number): number => sheet.pixels[(y * sheet.width + f * w + x) * 4 + 3]!;

    it('ha 16 fotogrammi 192x160, bordo trasparente e palette ristretta con il contorno scuro', async () => {
      sheet = await readPng(new URL('../../../assets/vfx/frames/meteor-impact.png', import.meta.url));
      expect([sheet.width, sheet.height]).toEqual([w * frames, h]);
      const colors = new Set<string>();
      for (let i = 0; i < sheet.pixels.length; i += 4) {
        const a = sheet.pixels[i + 3]!;
        expect(a === 0 || a === 255).toBe(true);
        if (a) colors.add(`${sheet.pixels[i]},${sheet.pixels[i + 1]},${sheet.pixels[i + 2]}`);
      }
      expect(colors.size).toBeLessThanOrEqual(12);
      expect(colors.has('24,20,29')).toBe(true);
      for (let f = 0; f < frames; f++) for (let x = 0; x < w; x++) { expect(alphaAt(f, x, 0)).toBe(0); expect(alphaAt(f, x, h - 1)).toBe(0); }
    });

    it('a terra non va oltre l\'ellisse del danno: non promette un\'area piu\' grande di quella vera', () => {
      // Dal livello del pavimento in giu', ogni pixel sta nell'ellisse 2:1 del raggio di gioco, piu' lo spessore
      // dell'onda d'urto e il contorno scuro (al massimo 5 pixel su 93, circa il 5%).
      const rx = METEOR_IMPACT.groundRadiusX + 5, ry = METEOR_IMPACT.groundRadiusY + 3;
      for (let f = 0; f < frames; f++) for (let y = pivotY; y < h; y++) for (let x = 0; x < w; x++) {
        if (!alphaAt(f, x, y)) continue;
        expect(((x - pivotX) / rx) ** 2 + ((y - pivotY) / ry) ** 2, `fotogramma ${f} (${x}, ${y})`).toBeLessThanOrEqual(1);
      }
    });

    it('l\'onda d\'urto arriva davvero al bordo del danno nei fotogrammi centrali', () => {
      const reach = (f: number): number => {
        let far = 0;
        for (let x = 0; x < w; x++) if (alphaAt(f, x, pivotY)) far = Math.max(far, Math.abs(x - pivotX));
        return far;
      };
      expect(Math.max(...[6, 7, 8].map(reach))).toBeGreaterThanOrEqual(88);
      expect(reach(0)).toBeLessThan(60);
    });
  });
});
