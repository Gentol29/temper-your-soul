import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../../core/vec2';
import { DangerZone } from '../../combat/danger-zone';
import { fallingMeteorOffset, flashIntensity, isFallingMeteor, METEOR_GLOW, MeteorGlow, sparkLook, sparkPoint } from './meteor-glow';

const at = new Vec2(400, 300);
const meteor = (id: number, visual?: string, team: 'player' | 'enemy' = 'player') =>
  new DangerZone(id, { team, radius: 66, delay: 0.65, damage: 210, ...(visual === undefined ? {} : { visual }) }, at);
const impact = { type: 'zone_detonated' as const, team: 'player' as const, position: at, radius: 66 };

/** Fa cadere le zone a passi di `dt` aggiornando la luce come `Effects.update`. */
function fall(glow: MeteorGlow, zones: DangerZone[], seconds: number, dt: number): void {
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    for (const zone of zones) zone.remaining = Math.max(0, zone.remaining - dt);
    glow.update(dt, zones);
  }
}

describe('luce e scintille della meteora', () => {
  it('la testa cade dall\'alto in diagonale fino al punto d\'impatto', () => {
    expect(fallingMeteorOffset(0)).toEqual({ x: -METEOR_GLOW.fall.height * METEOR_GLOW.fall.lean, y: -METEOR_GLOW.fall.height });
    expect(fallingMeteorOffset(1)).toEqual({ x: -0, y: -0 });
  });

  it('solo la meteora del giocatore in caduta accende la scia', () => {
    expect(isFallingMeteor(meteor(1))).toBe(true);
    expect(isFallingMeteor(meteor(2, 'meteor'))).toBe(true);
    expect(isFallingMeteor(meteor(3, 'veil_blast'))).toBe(false);
    expect(isFallingMeteor(meteor(4, undefined, 'enemy'))).toBe(false);
  });

  it('le scintille della caduta nascono a passi fissi: uguali a 30 e a 144 FPS', () => {
    const a = new MeteorGlow(), b = new MeteorGlow();
    // 0,25 s: meno della vita minima di una scintilla, quindi nessuna si e' ancora spenta.
    fall(a, [meteor(7)], 0.25, 1 / 30);
    fall(b, [meteor(7)], 0.25, 1 / 144);
    expect(a.sparks.length).toBeGreaterThan(10);
    // Stessa serie di scintille; l'ultimo passo puo' cadere su fotogrammi diversi (al piu' una coppia di scarto).
    const born = (glow: MeteorGlow) => glow.sparks.map((s) => `${s.ox.toFixed(3)},${s.oy.toFixed(3)},${s.svx.toFixed(3)}`);
    const n = Math.min(a.sparks.length, b.sparks.length);
    expect(Math.abs(a.sparks.length - b.sparks.length)).toBeLessThanOrEqual(METEOR_GLOW.fall.burst);
    expect(born(a).slice(0, n)).toEqual(born(b).slice(0, n));
    const c = new MeteorGlow();
    fall(c, [meteor(8, 'veil_blast')], 0.3, 1 / 60);
    expect(c.sparks).toHaveLength(0);
  });

  it('all\'impatto: lampo e raffica di scintille, sempre uguali, che si spengono', () => {
    const one = new MeteorGlow(), two = new MeteorGlow();
    one.handle(impact); two.handle(impact);
    expect(one.flashes).toHaveLength(1);
    expect(one.sparks).toHaveLength(METEOR_GLOW.impact.sparks);
    expect(one.sparks).toEqual(two.sparks);
    for (const spark of one.sparks) {
      spark.age = spark.life * 0.5;
      expect(sparkPoint(spark).dy).toBeLessThanOrEqual(0);
      expect(sparkLook(spark).alpha).toBeGreaterThan(0);
    }
    one.update(METEOR_GLOW.flash.life + 0.01, []);
    expect(one.flashes).toHaveLength(0);
    expect(one.sparks).toHaveLength(0);
    const other = new MeteorGlow();
    other.handle({ ...impact, visual: 'veil_blast' });
    expect(other.flashes).toHaveLength(0);
  });

  it('il lampo sale in fretta al picco e poi cala piano fino a zero', () => {
    const { peak, life } = METEOR_GLOW.flash;
    expect(flashIntensity(0)).toBe(0);
    expect(flashIntensity(peak)).toBeCloseTo(1, 6);
    expect(flashIntensity(peak / 2)).toBeCloseTo(0.5, 6);
    let previous = 1;
    for (let t = peak; t < life; t += 0.02) { const k = flashIntensity(t); expect(k).toBeLessThanOrEqual(previous + 1e-9); previous = k; }
    expect(flashIntensity(life)).toBe(0);
    // Slow out: a meta' della discesa resta un quarto della luce, non meta'.
    expect(flashIntensity(peak + (life - peak) / 2)).toBeCloseTo(0.25, 6);
  });

  it('non supera il tetto di scintille', () => {
    const glow = new MeteorGlow();
    for (let i = 0; i < 40; i++) glow.handle({ ...impact, position: new Vec2(i * 50, 0) });
    expect(glow.sparks.length).toBe(METEOR_GLOW.max);
  });
});
