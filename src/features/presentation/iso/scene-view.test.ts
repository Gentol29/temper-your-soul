import { describe, expect, it } from 'vitest';
import { Camera } from '../../../core/camera';
import { Vec2 } from '../../../core/vec2';
import { ISOMETRIC } from '../../../core/view-projection';
import { createMatch, intent, recordEvents, run } from '../../../testing';
import { drawBossIndicator } from '../draw-effects';
import { Effects } from '../effects';
import { drawLight, LightMap } from '../lights';
import { ISO_BODY_LIFT, ISO_VIEW, TOP_DOWN_VIEW } from './scene-view';
import { SCENERY_ATLASES } from '../themes/scenery-atlas';
import { CRYPT_ARENA } from '../../dungeons/crypt';
import { ROOM_TEMPLATES } from '../../run/room-templates';
import { hasPlinth, ISO_SCENERY, pillarPieceFor, sconceAnchor } from './iso-scenery';
import { wallFloorRow } from './iso-shear';

/** Un contesto finto che registra i nomi delle chiamate e tiene una traslazione (per getTransform). */
function recordingContext(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  let e = 0, f = 0;
  const stack: [number, number][] = [];
  const target: Record<string, unknown> = {
    save: () => { calls.push('save'); stack.push([e, f]); },
    restore: () => { calls.push('restore'); [e, f] = stack.pop() ?? [0, 0]; },
    translate: (x: number, y: number) => { calls.push(`translate ${x},${y}`); e += x; f += y; },
    transform: () => calls.push('transform'),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e, f }),
  };
  const ctx = new Proxy(target, {
    get: (object, key: string) => object[key] ?? ((..._args: unknown[]) => calls.push(key)),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('vista della scena', () => {
  it('dall alto non tocca il contesto: at e ground chiamano solo il disegno', () => {
    const { ctx, calls } = recordingContext();
    let drawn = 0;
    TOP_DOWN_VIEW.at(ctx, 123.4, 56.7, 14, () => drawn++);
    TOP_DOWN_VIEW.ground(ctx, () => drawn++);
    expect(drawn).toBe(2);
    expect(calls).toEqual([]);
    expect(TOP_DOWN_VIEW.shift(10, 20, 14)).toEqual(Vec2.ZERO);
    expect(TOP_DOWN_VIEW.angle(0, 1)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('in isometria sposta di interi fino al punto proiettato, alzato dei piedi', () => {
    for (const [x, y] of [[100.4, 37.6], [1600, 1350], [-12.5, 7.25]]) {
      const shift = ISO_VIEW.shift(x!, y!, 14);
      expect(Number.isInteger(shift.x) && Number.isInteger(shift.y)).toBe(true);
      const view = ISOMETRIC.toView(x!, y!);
      // Il punto arrotondato del disegno finisce a meno di un pixel dal punto proiettato, 14 pixel piu' in alto.
      expect(Math.abs(Math.round(x!) + shift.x - view.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.round(y!) + shift.y - (view.y - 14))).toBeLessThanOrEqual(1);
    }
    const { ctx, calls } = recordingContext();
    ISO_VIEW.at(ctx, 100, 50, 0, () => calls.push('draw'));
    expect(calls).toEqual(['save', 'translate -50,25', 'draw', 'restore']);
  });

  it('le direzioni del mondo diventano quelle dello schermo: verso nord nel mondo e in alto a destra', () => {
    const north = ISO_VIEW.delta(0, -10);
    expect(north.x).toBeGreaterThan(0);
    expect(north.y).toBeLessThan(0);
    // Un cursore in alto a destra sullo schermo (nel mondo x calato) fa guardare la figura a destra.
    const aim = ISOMETRIC.toWorld(30, -30);
    expect(aim.x).toBeLessThan(0);
    expect(ISO_VIEW.delta(aim.x, aim.y).x).toBeGreaterThan(0);
  });
});

describe('luci in isometria', () => {
  it('ogni luce si registra nel punto del canvas in cui e disegnata, con lo spostamento di chi la porta', () => {
    const map = new LightMap();
    const { ctx } = recordingContext();
    map.begin(true);
    ctx.translate(-200, -100);
    ISO_VIEW.at(ctx, 300, 100, ISO_BODY_LIFT, () => drawLight(ctx, 300, 92, '#ffffff', 50, 1));
    const light = map.collected[0]!;
    const view = ISOMETRIC.toView(300, 100);
    expect(light.x).toBe(300);
    expect(light.y).toBe(92);
    expect(light.canvasX).toBe(view.x - 200);
    expect(light.canvasY).toBe(view.y - 14 - 8 - 100);
    map.begin();
    drawLight(ctx, 5, 6, '#ffffff', 50, 1);
    expect(map.collected[0]).toEqual({ x: 5, y: 6, color: '#ffffff', radius: 50, intensity: 1 });
  });
});

describe('scenografia isometrica', () => {
  it('il pezzo di una colonna sta sul basamento senza superarlo', () => {
    const pieces = [{ x: 0, y: 0, w: 53, h: 139 }, { x: 0, y: 0, w: 98, h: 113 }, { x: 0, y: 0, w: 123, h: 126 }];
    for (const radius of [30, 34, 40, 44, 60, 64]) {
      const width = 2 * Math.SQRT2 * radius;
      const piece = pillarPieceFor(pieces, width, 0.5)!;
      expect(piece.w).toBeLessThanOrEqual(width * 0.95);
    }
    // Basamento piu' stretto di ogni pezzo: il piu' piccolo.
    expect(pillarPieceFor(pieces, 40, 0.5)!.w).toBe(53);
  });

  it('nella Cripta gli oggetti poggiano senza basamento, con il piede dentro lo sprite', () => {
    expect(hasPlinth('crypt')).toBe(false);
    for (const theme of ['swamp', 'forge', 'glacier'] as const) expect(hasPlinth(theme), theme).toBe(true);
    const pieces = ['pillarS', 'pillarM', 'pillarL'].flatMap((role) => SCENERY_ATLASES.crypt.pieces[role] ?? []);
    expect(pieces.length).toBeGreaterThan(0);
    for (const piece of pieces) {
      expect(piece.foot, JSON.stringify(piece)).toBeDefined();
      expect(piece.foot!.x >= 0 && piece.foot!.x < piece.w && piece.foot!.y >= 0 && piece.foot!.y < piece.h, JSON.stringify(piece)).toBe(true);
    }
  });

  it('nella Cripta ogni ostacolo ha oggetti larghi quanto il suo ingombro di gioco', () => {
    const pieces = ['pillarS', 'pillarM', 'pillarL'].flatMap((role) => SCENERY_ATLASES.crypt.pieces[role] ?? []);
    const arenas = [CRYPT_ARENA, ...(ROOM_TEMPLATES.crypt ?? [])];
    const radii = new Set(arenas.flatMap((arena) => arena.pillars.map((pillar) => pillar.radius)));
    expect(radii.size).toBeGreaterThan(0);
    for (const radius of radii) {
      const width = 2 * Math.SQRT2 * radius;
      const fitting = pieces.filter((piece) => piece.w <= width * ISO_SCENERY.footprintMax && piece.w >= width * ISO_SCENERY.footprintMin);
      expect(fitting.length, `raggio ${radius}`).toBeGreaterThan(0);
      for (const h of [0, 0.5, 0.99]) expect(fitting).toContain(pillarPieceFor(pieces, width, h, ISO_SCENERY.footprintMax, ISO_SCENERY.footprintMin));
    }
  });

  it('le applique stanno sul muro di fondo, sopra la base', () => {
    const at = sconceAnchor('ne', 24, 400);
    expect(at.x).toBe(376);
    expect(at.y).toBeLessThan(wallFloorRow('ne', 24, 376));
    const left = sconceAnchor('nw', 24, 400);
    expect(left.x).toBe(-376);
  });
});

describe('effetti con il punto d appoggio', () => {
  it('i numeri del danno e le particelle ricordano il punto del mondo da cui partono', () => {
    const match = createMatch(3);
    const effects = new Effects();
    const events = recordEvents(match);
    run(match, 1.5, (m) => intent(m, { skills: [true, false, false, false], aim: m.boss!.position }));
    for (const event of events) effects.handle(event);
    const damage = effects.texts.find((text) => text.anchorX !== undefined);
    expect(damage).toBeDefined();
    expect(Math.abs(damage!.anchorY! - damage!.y)).toBeGreaterThan(0);
    expect(effects.particles.every((particle) => particle.ax !== undefined && particle.ay !== undefined)).toBe(true);
  });

  it('la freccia verso il boss in isometria usa la vista: nessuna freccia se il boss e inquadrato', () => {
    const camera = new Camera();
    camera.setViewSize(800, 450);
    camera.projection = ISOMETRIC;
    const player = new Vec2(1000, 1000);
    camera.follow(player);
    const { ctx, calls } = recordingContext();
    // In vista: 150 a destra sullo schermo (nel mondo verso nord-est).
    drawBossIndicator(ctx, camera, player, player.add(ISOMETRIC.toWorld(150, 0)));
    expect(calls).toEqual([]);
    drawBossIndicator(ctx, camera, player, player.add(ISOMETRIC.toWorld(900, 0)));
    expect(calls.length).toBeGreaterThan(0);
  });
});
