import { describe, expect, it, vi } from 'vitest';
import { Camera } from '../../../core/camera';
import { SeededRng } from '../../../core/rng';
import { Vec2 } from '../../../core/vec2';
import { createQuietMatch } from '../../../testing';
import { Effects } from '../effects';
import * as assets from './assets';
import { COMBAT_VFX, CombatVfx } from './combat-vfx';
import { HI_BIT, rasterVfx } from './hi-bit-atlas';

const at = new Vec2(200, 200);
function fixture() {
  const fx = new CombatVfx(new SeededRng(32)), match = createQuietMatch(), camera = new Camera();
  camera.follow(at); match.player.position = at;
  match.boss!.health.current = 0;
  return { fx, match, camera };
}

describe('VFX Hi-bit di combattimento', () => {
  it('gli sprite pronti escludono particelle della primaria e conservano secondarie, impatto e buff', () => {
    const ready = vi.spyOn(assets, 'isVfxReady').mockReturnValue(true);
    try {
      const fx = new Effects(new SeededRng(1));
      fx.handle({ type: 'skill_cast', kind: 'buff', skillId: 'buff', visual: 'archer_predator', origin: at, destination: at, angle: 0 });
      expect(fx.combatVfx.particles.length).toBeGreaterThan(30);
      expect(fx.waves).toHaveLength(0);
      fx.clear();
      fx.handle({ type: 'skill_cast', kind: 'projectile', skillId: 'bolt', visual: 'mage_fire_bolt', origin: at, destination: at, angle: 0 });
      expect(fx.combatVfx.particles).toHaveLength(0);
      fx.handle({ type: 'skill_cast', kind: 'projectile', skillId: 'cinder_orb', visual: 'mage_fire_cinder', origin: at, destination: at, angle: 0 });
      expect(fx.combatVfx.particles.length).toBeGreaterThan(15);
      fx.clear();
      fx.handle({ type: 'projectile_hit', team: 'player', visual: 'mage_fire_bolt', position: at, radius: 4, struck: 'minion' });
      expect(fx.combatVfx.particles.length).toBeGreaterThan(20);
    } finally { ready.mockRestore(); }
  });

  it('ogni danno effettivo produce sangue balistico e macchie; impatto senza danno non sanguina', () => {
    const { fx, match, camera } = fixture();
    fx.handle({ type: 'projectile_hit', team: 'player', visual: 'hunter_arrow', position: at, radius: 3, struck: 'minion' });
    expect(fx.particles.some(p => p.kind === 'blood')).toBe(false);
    fx.handle({ type: 'damage_dealt', target: 'minion', minionId: 1, amount: 12, position: at });
    const blood = fx.particles.filter(p => p.kind === 'blood');
    expect(blood.length).toBeGreaterThanOrEqual(20);
    expect(blood.every(p => p.z > 0 && p.vz > 0)).toBe(true);
    for (let i = 0; i < 60; i++) fx.update(1 / 60, match, camera);
    expect(fx.stains.length).toBeGreaterThan(0);
    expect(fx.stains.some(s => s.x !== at.x || s.y !== at.y)).toBe(true);
    expect(fx.particles.some(p => p.kind === 'blood')).toBe(false);
    fx.clear(); fx.handle({ type: 'damage_dealt', target: 'minion', minionId: 1, amount: 0, position: at });
    expect(fx.particles).toHaveLength(0);
  });

  it('ossa e costrutti perdono schegge, spiriti energia; le creature e il giocatore sangue', () => {
    const { fx } = fixture();
    for (const visual of ['crypt_skeleton', 'crypt_gargoyle', 'forge_anvil', 'glacier_ice_block', 'crypt_wisp']) {
      fx.clear(); fx.handle({ type: 'minion_spawned', minionId: 4, visual, position: at });
      fx.handle({ type: 'damage_dealt', target: 'minion', minionId: 4, amount: 8, position: at });
      expect(fx.particles.some(p => p.kind === 'blood'), visual).toBe(false);
      expect(fx.particles.length).toBeGreaterThan(20);
    }
    fx.clear(); fx.handle({ type: 'damage_dealt', target: 'player', amount: 8, position: at, playerId: 'remote' });
    expect(fx.particles.some(p => p.kind === 'blood')).toBe(true);
  });

  it('la morte anima la sagoma; gli scheletri in attesa di rialzarsi non hanno un doppio corpo', () => {
    const { fx, match, camera } = fixture();
    fx.handle({ type: 'minion_defeated', minionId: 7, visual: 'crypt_bat', position: at });
    expect(fx.deaths).toHaveLength(1); expect(fx.particles.length).toBeGreaterThan(70);
    fx.update(0.25, match, camera); expect(fx.deaths[0].remaining).toBeLessThan(COMBAT_VFX.deathLife);
    fx.update(0.3, match, camera); expect(fx.deaths).toHaveLength(0);
    fx.clear(); fx.handle({ type: 'minion_defeated', minionId: 7, visual: 'crypt_skeleton', position: at, revives: true });
    expect(fx.deaths).toHaveLength(0); expect(fx.particles.some(p => p.kind === 'blood')).toBe(false);
  });

  it('il buff segue anche un alleato e si interrompe appena lo stato scompare', () => {
    const { fx, match, camera } = fixture(), ally = createQuietMatch().player;
    match.players.set('ally', ally); ally.position = at;
    match.classCombat.remote = { players: [{ id: 'ally', buff: true, guard: false, channel: 0, rushing: false, charges: [] }], pets: [], statuses: [], marks: [], taunts: [], heavy: null };
    fx.update(0.1, match, camera); expect(fx.particles.length).toBeGreaterThan(0);
    const count = fx.particles.length;
    ally.position = at.add(new Vec2(170, 0)); fx.update(0.1, match, camera);
    expect(fx.particles.slice(count).every(p => Math.abs(p.x - ally.position.x) < 30)).toBe(true);
    match.classCombat.remote.players[0].buff = false;
    for (let i = 0; i < 120; i++) fx.update(1 / 60, match, camera);
    expect(fx.particles).toHaveLength(0);
  });

  it('emissione continua equivalente a 30 e 144 FPS; nessuna emissione fuori vista', () => {
    function emitted(fps: number, visible = true): number {
      const { fx, match, camera } = fixture();
      if (!visible) camera.follow(new Vec2(9000, 9000));
      match.classCombat.remote = { players: [{ id: 'local', buff: true, guard: false, channel: 0, rushing: false, charges: [] }], pets: [], statuses: [], marks: [], taunts: [], heavy: null };
      let count = 0;
      for (let i = 0; i < fps; i++) { fx.particles = []; fx.update(1 / fps, match, camera); count += fx.particles.length; }
      return count;
    }
    expect(emitted(30)).toBe(COMBAT_VFX.buffRate);
    expect(emitted(144)).toBe(emitted(30));
    expect(emitted(60, false)).toBe(0);
  });

  it('gli stati seguono il bersaglio autorevole e il sangue a terra svanisce', () => {
    const { fx, match, camera } = fixture();
    match.boss!.health.current = match.boss!.health.max;
    match.boss!.position = at;
    match.classCombat.remote = { players: [], pets: [], statuses: [{ target: 'boss', status: 'bleeding', remaining: 3 }], marks: [], taunts: [], heavy: null };
    fx.update(0.1, match, camera);
    expect(fx.particles.some(p => p.kind === 'blood')).toBe(true);
    match.boss!.position = at.add(new Vec2(130, 0));
    const before = fx.particles.length; fx.update(0.1, match, camera);
    expect(fx.particles.slice(before).every(p => p.x === match.boss!.position.x)).toBe(true);
    match.classCombat.remote.statuses = [];
    for (let i = 0; i < 1000; i++) fx.update(1 / 60, match, camera);
    expect(fx.particles).toHaveLength(0); expect(fx.stains).toHaveLength(0);
  });

  it('morti in massa rispettano i budget; clear elimina anche sangue, sagome e debiti', () => {
    const { fx, match, camera } = fixture();
    for (let i = 0; i < 100; i++) fx.handle({ type: 'minion_defeated', minionId: i, visual: 'crypt_bat', position: at });
    expect(fx.particles.length).toBeLessThanOrEqual(COMBAT_VFX.particles);
    expect(fx.deaths.length).toBeLessThanOrEqual(COMBAT_VFX.deaths);
    for (let i = 0; i < 60; i++) fx.update(1 / 60, match, camera);
    expect(fx.stains.length).toBeGreaterThan(0);
    expect(fx.stains.length).toBeLessThanOrEqual(COMBAT_VFX.stains);
    fx.clear(); expect([fx.particles.length, fx.stains.length, fx.deaths.length]).toEqual([0, 0, 0]);
  });
});

describe('atlanti raster Hi-bit', () => {
  it('ogni skill ha sagoma trasparente, più toni e animazione distinta senza uscire dal foglio', () => {
    for (const id of assets.VFX_IDS) {
      const a = rasterVfx(id, 2), b = rasterVfx(id, 8), size = id === 'warrior-cleave' ? 128 : HI_BIT.size;
      const tones = new Set<string>(); let filled = 0;
      for (let i = 0; i < a.length; i += 4) if (a[i + 3] > 0) { filled++; tones.add(`${a[i]},${a[i + 1]},${a[i + 2]}`); }
      expect(filled, id).toBeGreaterThan(80); expect(filled, id).toBeLessThan(size * size * 0.6);
      expect(tones.size, id).toBeGreaterThanOrEqual(3);
      for (let x = 0; x < size; x++) {
        expect(a[x * 4 + 3], id).toBe(0); expect(a[((size - 1) * size + x) * 4 + 3], id).toBe(0);
      }
      if (!['archer-arrow', 'warrior-guard', 'archer-summon'].includes(id)) expect(a, id).not.toEqual(b);
    }
  });
});
