import { ITEM_LOOKS } from './looks/items';
import { describe, expect, it } from 'vitest';
import { Camera } from '../../core/camera';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { Boss } from '../boss/boss';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import { DUNGEONS } from '../dungeons/dungeons';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { createBossHarness, createQuietMatch, intent, STEP } from '../../testing';
import { BOSS_ART } from './boss-art';
import { damageTier, DAMAGE_TIERS, Effects, FEEDBACK } from './effects';
import { BOSS_FX } from './boss-fx';
import { MINION_ART } from './minion-art';
import { MINIONS } from '../minions/minion-catalog';
import { ActorPoses } from './poses';
import { MAGE_CASTING, MAGE_PALETTE, MAGE_WALK, type SpriteFrame } from './sprites';
import { ARENA_THEMES } from './themes';
import { DECOR_CLEARANCE, faceSpots, wallSpots } from './themes/decor';
import { wallFaceHeight } from './themes/wall';
import { PROJECTILE_LOOKS, ZONE_LOOKS, zoneLook } from './visuals';
import { ITEM_FAMILIES } from '../items/item-families';
import { roomArena, roomDoors, ROOM_TEMPLATES } from '../run/room-templates';

const dimensions = (frame: SpriteFrame): string => `${frame[0]!.length}x${frame.length}`;
const symbolsOf = (frames: readonly SpriteFrame[]) => new Set(frames.flatMap((frame) => frame.flatMap((row) => [...row])));

describe('sprite', () => {
  it('i fotogrammi del mago sono matrici rettangolari della stessa misura e usano solo colori della tavolozza', () => {
    const frames = [...MAGE_WALK, MAGE_CASTING];
    for (const frame of frames) {
      expect(new Set(frame.map((row) => row.length)).size).toBe(1);
      expect(dimensions(frame)).toBe(dimensions(frames[0]!));
    }
    for (const symbol of symbolsOf(frames)) {
      if (symbol !== '.') expect(MAGE_PALETTE[symbol], `mago: ${symbol}`).toBeDefined();
    }
  });

  it('la grafica di ogni boss ha 4 fotogrammi di camminata e una posa di lancio coerenti, con la tavolozza completa', () => {
    for (const [id, art] of Object.entries(BOSS_ART)) {
      expect(art.walk, id).toHaveLength(4);
      const frames = [...art.walk, art.casting];
      for (const frame of frames) {
        expect(new Set(frame.map((row) => row.length)).size, `${id}: righe di lunghezza diversa`).toBe(1);
        expect(dimensions(frame), `${id}: misure diverse`).toBe(dimensions(frames[0]!));
      }
      for (const [slowed, enraged] of [[false, false], [true, false], [false, true], [true, true]] as const) {
        const palette = art.palette(slowed, enraged);
        for (const symbol of symbolsOf(frames)) {
          if (symbol !== '.') expect(palette[symbol], `${id}: simbolo ${symbol}`).toBeDefined();
        }
      }
      expect(art.scale).toBeGreaterThan(0);
    }
  });

  it('il guardiano cambia colore con il gelo (corpo) e con la furia (rune)', () => {
    const art = BOSS_ART.guardian!;
    expect(art.palette(true, false).b).not.toBe(art.palette(false, false).b);
    expect(art.palette(false, true).c).not.toBe(art.palette(false, false).c);
  });

  it('i fotogrammi di camminata sono quattro e si alternano', () => {
    expect(MAGE_WALK).toHaveLength(4);
    expect(MAGE_WALK[0]).toBe(MAGE_WALK[2]);
    expect(BOSS_ART.guardian!.walk[1]).not.toEqual(BOSS_ART.guardian!.walk[3]);
  });
});

describe('aspetto dei contenuti', () => {
  it('ogni dungeon usa una grafica del boss e un tema di mappa che esistono', () => {
    for (const dungeon of DUNGEONS) {
      expect(BOSS_ART[dungeon.boss.art], `${dungeon.id}: grafica ${dungeon.boss.art}`).toBeDefined();
      expect(ARENA_THEMES[dungeon.arena.theme], `${dungeon.id}: tema ${dungeon.arena.theme}`).toBeDefined();
    }
  });

  it('ogni proiettile e ogni zona che i dati possono creare ha un aspetto', () => {
    const projectiles: ProjectileSpec[] = [];
    const zoneVisuals = new Set<string | undefined>();
    for (const skill of MAGE_SKILLS) {
      if (skill.effect.kind === 'projectile') projectiles.push(skill.effect.projectile);
      if (skill.effect.kind === 'ground_blast') zoneVisuals.add(skill.effect.zone.visual);
    }
    for (const dungeon of DUNGEONS) {
      for (let index = 0; index < dungeon.boss.patterns.length; index++) {
        for (const enraged of [false, true]) {
          const boss = new Boss(dungeon.boss, dungeon.arena);
          boss.phase = enraged ? 2 : 1;
          boss.attackCount = index;
          boss.attackTimer = 0;
          const harness = createBossHarness(dungeon.arena.playerSpawn);
          for (let i = 0; i < 400; i++) boss.step(STEP, harness.ctx);
          projectiles.push(...harness.projectiles.map((shot) => shot.spec));
          for (const zone of harness.zones) zoneVisuals.add(zone.spec.visual);
        }
      }
    }
    expect(projectiles.length).toBeGreaterThan(50);
    for (const spec of projectiles) expect(PROJECTILE_LOOKS[spec.visual], spec.visual).toBeDefined();
    for (const visual of zoneVisuals) {
      if (visual !== undefined) expect(ZONE_LOOKS[visual], `zona ${visual}`).toBeDefined();
    }
  });

  it('una zona senza aspetto proprio usa quello della squadra; una sconosciuta non rompe il disegno', () => {
    expect(zoneLook('enemy')).toBe(ZONE_LOOKS.enemy);
    expect(zoneLook('player', 'non_esiste')).toBe(ZONE_LOOKS.player);
  });
});

describe('effetti', () => {
  const camera = new Camera();
  camera.setViewSize(960, 540);
  camera.follow(new Vec2(1600, 1350));
  const seeded = () => new Effects(new SeededRng(5));

  it('il danno al boss mostra il numero del colpo e qualche particella; quello al giocatore il numero rosso e la scossa', () => {
    const effects = seeded();
    effects.handle({ type: 'damage_dealt', target: 'boss', amount: 19, position: new Vec2(100, 100) });
    expect(effects.texts.map((t) => t.text)).toEqual(['19']);
    expect(effects.particles.length).toBe(6);
    // Il boss colpito lampeggia di bianco e sobbalza.
    expect(effects.bossFlash).toBe(FEEDBACK.hitFlash);
    expect(effects.bossJolt).toBe(FEEDBACK.jolt);
    effects.handle({ type: 'damage_dealt', target: 'player', amount: 18, position: new Vec2(100, 100) });
    expect(effects.texts.map((t) => t.text)).toEqual(['19', '−18']);
    expect(effects.shake).toBe(6);
    expect(effects.hurtFlash).toBe(FEEDBACK.hurtFlash);
  });

  it('lo scoppio di una zona crea onde, particelle, un bagliore residuo e una scossa', () => {
    const effects = seeded();
    effects.handle({ type: 'zone_detonated', position: new Vec2(50, 50), radius: 42, team: 'enemy' });
    expect(effects.waves).toHaveLength(2);
    expect(effects.particles.length).toBe(65 + 16);
    expect(effects.flashes).toHaveLength(1);
    expect(effects.shake).toBe(3);
  });

  it('il nome dell\'attacco compare sopra il boss con il suo scostamento', () => {
    const effects = seeded();
    effects.handle({ type: 'boss_phase_changed', position: new Vec2(5, 100), phase: 2, text: 'LA MADRE SI DESTA' });
    expect(effects.texts.map((t) => t.text)).toContain('LA MADRE SI DESTA');
    effects.clear();
    effects.handle({ type: 'boss_attack', patternId: 'ember_burst', position: new Vec2(100, 200), name: 'RAFFICA', color: '#fff', labelOffsetY: -42 });
    expect(effects.texts[0]).toMatchObject({ text: 'RAFFICA', x: 100, y: 158 });
  });

  it('tutto svanisce col tempo: particelle, onde, testi, bagliori e scossa', () => {
    const effects = seeded();
    const match = createQuietMatch();
    // Senza boss vivo: le sue particelle d'ambiente non nascerebbero mai finite.
    match.boss!.health.current = 0;
    effects.handle({ type: 'zone_detonated', position: new Vec2(50, 50), radius: 42, team: 'player' });
    effects.handle({ type: 'damage_dealt', target: 'boss', amount: 5, position: new Vec2(0, 0) });
    for (let i = 0; i < 60 * 3; i++) effects.update(STEP, match, camera);
    expect(effects.particles).toHaveLength(0);
    expect(effects.waves).toHaveLength(0);
    expect(effects.texts).toHaveLength(0);
    expect(effects.flashes).toHaveLength(0);
    expect(effects.shake).toBe(0);
    expect(effects.shakeOffset()).toEqual(Vec2.ZERO);
    expect([effects.bossFlash, effects.bossJolt, effects.hurtFlash, effects.rageFlash, effects.screenFlash]).toEqual([0, 0, 0, 0, 0]);
  });

  it('il numero di particelle e di onde ha un tetto', () => {
    const effects = seeded();
    for (let i = 0; i < 40; i++) effects.handle({ type: 'boss_defeated', position: new Vec2(0, 0) });
    expect(effects.particles.length).toBeLessThanOrEqual(1400);
    for (let i = 0; i < 200; i++) effects.handle({ type: 'skill_cast', skillId: 'astral_step', visual: 'astral_step', kind: 'dash', origin: new Vec2(0, 0), destination: new Vec2(10, 0), angle: 0 });
    expect(effects.waves.length).toBeLessThanOrEqual(80);
  });

  it('le scie seguono i proiettili e vengono dimenticate quando spariscono', () => {
    const effects = seeded();
    const match = createQuietMatch();
    const spec: ProjectileSpec = { team: 'enemy', speed: 50, damage: 1, radius: 4, lifetime: 5, visual: 'ember_nova' };
    const projectile = new Projectile(1, spec, match.player.position.add(new Vec2(300, 0)), 0);
    match.projectiles.push(projectile);
    for (let i = 0; i < 60; i++) {
      projectile.advance(STEP);
      effects.update(STEP, match, camera);
    }
    expect(effects.trailOf(projectile).length).toBeGreaterThan(0);
    expect(effects.trailOf(projectile).length).toBeLessThanOrEqual(9);
    expect(effects.particles.length).toBeGreaterThan(0);
    match.projectiles = [];
    effects.update(STEP, match, camera);
    expect(effects.trailOf(projectile)).toHaveLength(0);
  });

  it('fuori dalla vista le scie non producono particelle', () => {
    const effects = seeded();
    const match = createQuietMatch();
    match.boss!.health.current = 0;
    const spec: ProjectileSpec = { team: 'enemy', speed: 0, damage: 1, radius: 4, lifetime: 5, visual: 'ember_nova' };
    match.projectiles.push(new Projectile(1, spec, new Vec2(100, 100), 0));
    for (let i = 0; i < 30; i++) effects.update(STEP, match, camera);
    expect(effects.particles).toHaveLength(0);
  });

  it('clear() svuota tutto', () => {
    const effects = seeded();
    effects.handle({ type: 'boss_defeated', position: new Vec2(0, 0) });
    effects.handle({ type: 'boss_phase_changed', position: new Vec2(0, 0), phase: 2, text: 'IL BOSS SI INFURIA' });
    effects.clear();
    expect([effects.particles.length, effects.texts.length, effects.shake]).toEqual([0, 0, 0]);
  });

  it('gli effetti non toccano la simulazione (stessa partita con e senza effetti)', () => {
    const withEffects = createQuietMatch(3);
    const without = createQuietMatch(3);
    const effects = seeded();
    withEffects.events.connect((event) => effects.handle(event));
    const command = (match: typeof withEffects) =>
      intent(match, { move: new Vec2(1, 0), aim: match.boss!.position, skills: [true, true, true, true] });
    for (let i = 0; i < 600; i++) {
      withEffects.step(STEP, command(withEffects));
      effects.update(STEP, withEffects, camera);
      without.step(STEP, command(without));
    }
    expect(withEffects.player.position).toEqual(without.player.position);
    expect(withEffects.boss!.health.current).toBe(without.boss!.health.current);
    expect(withEffects.projectiles.length).toBe(without.projectiles.length);
  });
});

describe('risposta ai colpi e momenti chiave', () => {
  const camera = new Camera();
  camera.setViewSize(960, 540);
  camera.follow(new Vec2(1600, 1350));
  const seeded = () => new Effects(new SeededRng(9));
  const at = new Vec2(200, 200);

  it('i numeri del danno crescono e cambiano colore con il danno del colpo', () => {
    expect(damageTier(19).size).toBeLessThan(damageTier(60).size);
    expect(damageTier(60).size).toBeLessThan(damageTier(150).size);
    expect(damageTier(150).size).toBeLessThan(damageTier(360).size);
    expect(new Set(DAMAGE_TIERS.map((tier) => tier.color)).size).toBe(DAMAGE_TIERS.length);
    const effects = seeded();
    effects.handle({ type: 'damage_dealt', target: 'boss', amount: 360, position: at });
    expect(effects.texts[0]).toMatchObject({ text: '360', size: damageTier(360).size, outline: true });
  });

  it('colpo a segno: scintilla; contro un pilastro: polvere senza scintilla; mancato: sbuffo spento', () => {
    const hit = seeded();
    hit.handle({ type: 'projectile_hit', position: at, radius: 4, visual: 'arcane_bolt', team: 'player', struck: 'boss' });
    expect(hit.sparks).toHaveLength(1);
    const wall = seeded();
    wall.handle({ type: 'projectile_hit', position: at, radius: 4, visual: 'arcane_bolt', team: 'player', struck: 'obstacle' });
    expect(wall.sparks).toHaveLength(0);
    expect(wall.particles.length).toBeLessThan(hit.particles.length);
    const miss = seeded();
    miss.handle({ type: 'projectile_faded', position: at, visual: 'arcane_bolt' });
    expect(miss.sparks).toHaveLength(0);
    expect(miss.waves).toHaveLength(0);
    expect(miss.particles.length).toBeGreaterThan(0);
    expect(miss.particles.length).toBeLessThan(wall.particles.length);
  });

  it('in cooperativa solo i colpi subiti dal giocatore di questo client accendono la vignetta e scuotono', () => {
    const effects = seeded();
    effects.handle({ type: 'damage_dealt', target: 'player', amount: 10, position: at, playerId: 'p2' }, 'p1');
    expect([effects.hurtFlash, effects.shake]).toEqual([0, 0]);
    effects.handle({ type: 'damage_dealt', target: 'player', amount: 10, position: at, playerId: 'p1' }, 'p1');
    expect(effects.hurtFlash).toBe(FEEDBACK.hurtFlash);
  });

  it('la fase II scuote forte, accende il lampo rosso e lancia tre onde d\'urto', () => {
    const effects = seeded();
    effects.handle({ type: 'boss_phase_changed', position: at, phase: 2, text: 'IL BOSS SI INFURIA' });
    expect(effects.rageFlash).toBe(FEEDBACK.rageFlash);
    expect(effects.shake).toBe(10);
    expect(effects.waves.length).toBeGreaterThanOrEqual(3);
  });

  it('la morte del boss dura un attimo (il boss resta visibile), poi si frantuma con un lampo bianco', () => {
    const effects = seeded();
    const match = createQuietMatch();
    match.boss!.health.current = 0;
    effects.handle({ type: 'boss_defeated', position: at });
    expect(effects.bossDeath).not.toBeNull();
    for (let t = 0; t < FEEDBACK.bossDeath - 0.1; t += STEP) effects.update(STEP, match, camera);
    expect(effects.bossDeath).not.toBeNull();
    expect(effects.screenFlash).toBe(0);
    for (let i = 0; i < 12; i++) effects.update(STEP, match, camera);
    expect(effects.bossDeath).toBeNull();
    expect(effects.screenFlash).toBeGreaterThan(0);
  });

  it('il boss vivo emette le sue particelle d\'ambiente, molte di piu\' in furia', () => {
    const calm = seeded();
    const match = createQuietMatch();
    camera.follow(match.boss!.position);
    for (let i = 0; i < 60; i++) calm.update(STEP, match, camera);
    const calmCount = calm.particles.length;
    expect(calmCount).toBeGreaterThan(0);
    const angry = seeded();
    match.boss!.phase = 2;
    for (let i = 0; i < 60; i++) angry.update(STEP, match, camera);
    expect(angry.particles.length).toBeGreaterThan(calmCount * 2);
    camera.follow(new Vec2(1600, 1350));
  });

  it('i servitori colpiti lampeggiano; comparsa e morte hanno il loro scoppio', () => {
    const effects = seeded();
    effects.handle({ type: 'minion_spawned', position: at, minionId: 4, visual: 'swamp_sporeling' });
    expect(effects.particles.length).toBeGreaterThan(0);
    effects.handle({ type: 'damage_dealt', target: 'minion', amount: 25, position: at, minionId: 4 });
    expect(effects.minionFlashes.get(4)).toBe(FEEDBACK.hitFlash);
    effects.handle({ type: 'minion_defeated', position: at, minionId: 4, visual: 'swamp_sporeling' });
    expect(effects.minionFlashes.has(4)).toBe(false);
  });

  it('ogni boss ha i suoi effetti e ogni servitore la sua grafica, con tavolozze complete', () => {
    for (const dungeon of DUNGEONS) expect(Object.hasOwn(BOSS_FX, dungeon.boss.art), dungeon.id).toBe(true);
    for (const minion of Object.values(MINIONS)) {
      const art = MINION_ART[minion.visual];
      expect(art, minion.id).toBeDefined();
      for (const frame of art!.frames) {
        expect(new Set(frame.map((row) => row.length)).size, minion.id).toBe(1);
        for (const symbol of new Set(frame.flatMap((row) => [...row]))) {
          if (symbol !== '.') expect(Object.hasOwn(art!.palette, symbol), `${minion.id}: ${symbol}`).toBe(true);
        }
      }
    }
  });
});

describe('pose', () => {
  it('il lancio dura 0,3 s e la posa del boss la durata dell\'evento', () => {
    const poses = new ActorPoses();
    poses.handle({ type: 'skill_cast', skillId: 'arcane_bolt', visual: 'arcane_bolt', kind: 'projectile', origin: Vec2.ZERO, destination: Vec2.ZERO, angle: 0 });
    poses.handle({ type: 'boss_pose', seconds: 0.5 });
    expect(poses.playerCast).toBeCloseTo(0.3, 10);
    expect(poses.bossCast).toBe(0.5);
    poses.update(0.31, false);
    expect(poses.playerCast).toBe(0);
    expect(poses.bossCast).toBeCloseTo(0.19, 10);
  });

  it('la camminata avanza solo mentre ci si muove e si azzera da fermi', () => {
    const poses = new ActorPoses();
    poses.update(1, true);
    expect(poses.walkPhase).toBeCloseTo(14, 10);
    poses.update(0.1, false);
    expect(poses.walkPhase).toBe(0);
  });

  it('reset azzera tutto', () => {
    const poses = new ActorPoses();
    poses.handle({ type: 'boss_pose', seconds: 1 });
    poses.update(0.1, true);
    poses.reset();
    expect([poses.walkPhase, poses.playerCast, poses.bossCast]).toEqual([0, 0, 0]);
  });
});

describe('leggibilità (fase 0 dello studio sulla grafica)', () => {
  const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const distance = (a: string, b: string): number => {
    const [x, y] = [rgb(a), rgb(b)];
    return Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!);
  };
  const playerVisuals = new Set(
    [...Object.keys(ITEM_LOOKS.projectiles), ...[...MAGE_SKILLS, ...ITEM_FAMILIES.map((family) => family.skill)].flatMap((skill) =>
      skill.effect.kind === 'projectile' ? [skill.effect.projectile.visual] : [],
    )],
  );

  it('un colpo dei giocatori non ha mai forma e colore quasi uguali a quelli di un proiettile nemico', () => {
    expect(playerVisuals.size).toBeGreaterThan(5);
    const enemies = Object.entries(PROJECTILE_LOOKS).filter(([id]) => !playerVisuals.has(id));
    for (const id of playerVisuals) {
      const own = PROJECTILE_LOOKS[id]!;
      for (const [enemyId, enemy] of enemies) {
        if (enemy.shape === own.shape) expect(distance(own.color, enemy.color), `${id} contro ${enemyId}`).toBeGreaterThan(60);
      }
    }
  });

  it('i proiettili nemici di un dungeon si staccano dal pavimento e dai pericoli a terra del suo tema', () => {
    for (const [theme, look] of Object.entries(ARENA_THEMES)) {
      expect(look.groundColors.length).toBeGreaterThan(2);
      for (const [id, projectile] of Object.entries(PROJECTILE_LOOKS)) {
        if (!id.startsWith(`${theme}_`)) continue;
        for (const ground of look.groundColors) expect(distance(projectile.color, ground), `${id} su ${ground}`).toBeGreaterThan(70);
      }
    }
  });

  it('torce e bracieri stanno lungo i muri, lontano da ingresso, porte e pilastri, in ogni stanza e arena', () => {
    const arenas = [
      ...DUNGEONS.map((dungeon) => ({ arena: dungeon.arena, doors: [] as Vec2[] })),
      ...DUNGEONS.flatMap((dungeon) => (ROOM_TEMPLATES[dungeon.id] ?? []).map((room) => ({
        arena: roomArena(room, dungeon.arena.theme),
        doors: [1, 2, 3].flatMap((count) => roomDoors(room, count).map((door) => door.position)),
      }))),
    ];
    for (const { arena, doors } of arenas) {
      for (const [inset, spacing, radius] of [[64, 384, 20], [95, 450, 40]] as const) {
        const spots = wallSpots(arena, inset, spacing, radius);
        expect(spots.length, arena.id).toBeGreaterThan(3);
        for (const spot of spots) {
          const nearWall = Math.min(spot.x, spot.y, arena.width - spot.x, arena.height - spot.y);
          expect(nearWall, `${arena.id}: lungo il muro`).toBeCloseTo(inset, 5);
          expect(spot.distanceTo(arena.playerSpawn), `${arena.id}: ingresso`).toBeGreaterThanOrEqual(DECOR_CLEARANCE.entrance);
          for (const door of doors) {
            const blocks = Math.abs(spot.x - door.x) < DECOR_CLEARANCE.doorHalfWidth && spot.y < door.y + DECOR_CLEARANCE.doorDepth;
            expect(blocks, `${arena.id}: porta in ${door.x}`).toBe(false);
          }
          for (const pillar of arena.pillars) expect(spot.distanceTo(pillar.position), `${arena.id}: pilastro`).toBeGreaterThan(pillar.radius + radius);
        }
      }
    }
  });
  it('le applique sulla faccia del muro in alto restano lontane dai cancelli di ogni porta possibile', () => {
    for (const dungeon of DUNGEONS) {
      for (const room of ROOM_TEMPLATES[dungeon.id] ?? []) {
        const arena = roomArena(room, dungeon.arena.theme);
        const y = arena.wallThickness + wallFaceHeight(arena) / 2;
        const spots = faceSpots(arena, y, 192);
        expect(spots.length, room.id).toBeGreaterThan(1);
        for (const spot of spots) {
          expect(spot.y).toBe(y);
          expect(spot.x).toBeGreaterThan(arena.wallThickness);
          expect(spot.x).toBeLessThan(arena.width - arena.wallThickness);
          for (const count of [1, 2, 3]) {
            for (const door of roomDoors(room, count)) expect(Math.abs(spot.x - door.position.x), `${room.id}: cancello`).toBeGreaterThanOrEqual(DECOR_CLEARANCE.gateHalfWidth);
          }
        }
      }
    }
  });

  it('la fascia del muro nord termina al margine di movimento del giocatore', () => {
    for (const dungeon of DUNGEONS) {
      const face = wallFaceHeight(dungeon.arena);
      expect(dungeon.arena.wallThickness + face).toBe(dungeon.arena.playerMargin);
    }
  });
});

describe('bordo chiaro dei boss', () => {
  /** Un contesto finto che annota il colore di ogni rettangolo pieno. */
  function recordingContext(): { ctx: CanvasRenderingContext2D; fills: string[] } {
    const fills: string[] = [];
    const state: Record<string | symbol, unknown> = { fillStyle: '#000000', globalAlpha: 1 };
    const ctx = new Proxy(state, {
      get: (target, key) => {
        if (key === 'fillRect') return () => fills.push(String(target.fillStyle));
        if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
        if (key in target) return target[key];
        return () => undefined;
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, fills };
  }

  it('i luogotenenti a matrici hanno la sagoma tinta sotto la figura, solo se richiesta e non morendo', async () => {
    const { LIEUTENANTS } = await import('../run/lieutenants');
    const { drawBoss } = await import('./draw-actors');
    const match = createQuietMatch();
    const definition = Object.values(LIEUTENANTS)[0]!;
    const boss = new Boss(definition, match.arena);
    const look = { flash: 0, offset: Vec2.ZERO, death: null, clock: 0 };
    const plain = recordingContext();
    drawBoss(plain.ctx, boss, match.player, new ActorPoses(), 0, look);
    const rimmed = recordingContext();
    drawBoss(rimmed.ctx, boss, match.player, new ActorPoses(), 0, { ...look, rim: '#d8d2ff73' });
    const rim = rimmed.fills.filter((color) => color === '#d8d2ff').length;
    expect(plain.fills.filter((color) => color === '#d8d2ff').length).toBe(0);
    // Quattro copie della sagoma, una per direzione, tante quanti i pixel della figura.
    expect(rim).toBeGreaterThan(0);
    expect(rim % 4).toBe(0);
    expect(rimmed.fills.length - rim).toBe(plain.fills.length);
    const dying = recordingContext();
    drawBoss(dying.ctx, boss, match.player, new ActorPoses(), 0, { ...look, death: 0.5, rim: '#d8d2ff73' });
    expect(dying.fills.filter((color) => color === '#d8d2ff').length).toBe(0);
  });
});

describe('contorno dei proiettili nemici', () => {
  it('nel ghiacciaio, che ha il pavimento chiaro, e\' piu\' spesso che altrove', async () => {
    const { PROJECTILE_STYLE } = await import('./draw-combat');
    expect(ARENA_THEMES.glacier.projectileRim).toBeGreaterThan(PROJECTILE_STYLE.enemyRimWidth);
    for (const id of ['crypt', 'swamp', 'forge'] as const) expect(ARENA_THEMES[id].projectileRim).toBeUndefined();
  });
});
