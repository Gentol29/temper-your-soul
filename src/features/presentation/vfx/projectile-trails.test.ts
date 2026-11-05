import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../../core/vec2';
import { Projectile, type ProjectileSpec } from '../../combat/projectile';
import { moteLook, ProjectileTrails, TRAILS, trailHash, trailStyleOf } from './projectile-trails';

const spec = (visual: string, team: 'player' | 'enemy' = 'player'): ProjectileSpec => ({ team, speed: 600, damage: 1, radius: 4, lifetime: 3, visual });

/** Fa volare i colpi in linea retta per `seconds` a passi di `dt`, aggiornando le scie come `Effects.update`. */
function fly(trails: ProjectileTrails, shots: readonly Projectile[], seconds: number, dt: number): void {
  trails.update(0, shots);
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    for (const shot of shots) shot.position = shot.position.add(shot.velocity.mul(dt));
    trails.update(dt, shots);
  }
}

describe('scie dei colpi a distanza', () => {
  it('solo i colpi dei giocatori con un aspetto a distanza; nessuna scia per i nemici', () => {
    expect(trailStyleOf(new Projectile(1, spec('mage_fire_bolt'), Vec2.ZERO, 0))).toBe('mage-fireball');
    expect(trailStyleOf(new Projectile(2, spec('hunter_arrow'), Vec2.ZERO, 0))).toBe('archer-arrow');
    expect(trailStyleOf(new Projectile(3, spec('frost_orb'), Vec2.ZERO, 0))).toBe('mage-water-orb');
    expect(trailStyleOf(new Projectile(4, spec('mage_fire_bolt', 'enemy'), Vec2.ZERO, 0))).toBeNull();
    expect(trailStyleOf(new Projectile(5, spec('qualcosa_di_nemico'), Vec2.ZERO, 0))).toBeNull();
  });

  it('nascono a passo fisso lungo il tragitto: stessa scia a 30 e a 144 FPS', () => {
    const a = new ProjectileTrails(), b = new ProjectileTrails();
    fly(a, [new Projectile(9, spec('mage_fire_bolt'), Vec2.ZERO, 0)], 0.2, 1 / 30);
    fly(b, [new Projectile(9, spec('mage_fire_bolt'), Vec2.ZERO, 0)], 0.2, 1 / 144);
    const style = TRAILS.styles['mage-fireball'];
    const born = Math.floor(600 * 0.2 / style.spacing) * style.burst;
    expect(a.motes.length).toBe(born);
    expect(b.motes.length).toBe(born);
    a.motes.forEach((mote, i) => { expect(mote.x).toBeCloseTo(b.motes[i]!.x, 6); expect(mote.vx).toBeCloseTo(b.motes[i]!.vx, 6); });
  });

  it('ogni elemento ha il suo moto: il fuoco sale, acqua e terra cadono, il vento si allarga', () => {
    const average = (visual: string): { up: number; side: number } => {
      const trails = new ProjectileTrails();
      fly(trails, [new Projectile(3, spec(visual), Vec2.ZERO, 0)], 0.25, 1 / 60);
      const vy = trails.motes.reduce((sum, mote) => sum + mote.vy, 0) / trails.motes.length;
      const spread = trails.motes.reduce((sum, mote) => sum + Math.abs(mote.vy - TRAILS.styles[mote.style].rise), 0) / trails.motes.length;
      return { up: vy, side: spread };
    };
    expect(average('mage_fire_bolt').up).toBeLessThan(0);
    expect(average('mage_water_orb').up).toBeGreaterThan(0);
    expect(average('mage_earth_light').up).toBeGreaterThan(0);
    expect(average('mage_wind_bolt').side).toBeGreaterThan(average('hunter_arrow').side);
  });

  it('si spengono a gradini entro la loro vita e non superano il tetto', () => {
    const trails = new ProjectileTrails();
    fly(trails, [new Projectile(1, spec('mage_fire_bolt'), Vec2.ZERO, 0)], 0.1, 1 / 60);
    const mote = trails.motes[0]!;
    const looks = [0, 0.3, 0.6, 0.9].map((share) => { mote.age = share * TRAILS.styles[mote.style].life; return moteLook(mote); });
    expect(looks.map((look) => look.tone)).toEqual([0, 1, 2, 3]);
    expect(looks.map((look) => look.alpha)).toEqual([1, 1, 0.7, 0.4]);
    trails.update(1, []);
    expect(trails.motes).toHaveLength(0);

    const crowd = Array.from({ length: 60 }, (_, i) => new Projectile(100 + i, spec('mage_wind_bolt'), new Vec2(0, i * 20), 0));
    fly(trails, crowd, 0.3, 1 / 60);
    expect(trails.motes.length).toBe(TRAILS.max);
  });

  it('e\' deterministica e usa palette a gradini della classe o dell\'elemento', () => {
    expect(trailHash(4, 7)).toBe(trailHash(4, 7));
    expect(new Set(Array.from({ length: 40 }, (_, i) => trailHash(4, i))).size).toBe(40);
    for (const style of Object.values(TRAILS.styles)) {
      expect(style.ramp).toHaveLength(4);
      for (const color of style.ramp) expect(color).toMatch(/^#[0-9a-f]{6}$/);
      for (const size of style.sizes) expect(Number.isInteger(size)).toBe(true);
    }
  });
});
