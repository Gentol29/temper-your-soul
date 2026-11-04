import { describe, it, expect } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { HubState, HUB_STATIONS, HUB_OBSTACLES, HUB_MAP, HUB_SPAWN, HUB_COURTYARD, hubApproachPoint, hubBlocked } from './hub-state';

describe('cortile del rifugio e collisioni', () => {
  it('parte al centro del cortile dipinto, su un punto libero e fuori dalle interazioni', () => {
    const state = new HubState();
    expect(state.position).toEqual(HUB_SPAWN);
    expect(state.position.x).toBe(HUB_MAP.width / 2);
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.nearest()).toBeUndefined();
  });
  it('blocca edifici, banconi e bordi del selciato, senza rendere solide le guglie', () => {
    for (const o of HUB_OBSTACLES) for (const p of o.outline) expect(hubBlocked(p), o.id).toBe(true);
    for (const p of HUB_COURTYARD) expect(hubBlocked(p)).toBe(true);
    expect(hubBlocked(new Vec2(-1, 200))).toBe(true);
    expect(hubBlocked(new Vec2(900, 320))).toBe(true);
    expect(hubBlocked(new Vec2(512, 400))).toBe(false);
  });
  it.each([
    ['gradini della cattedrale', 512, 260], ['base del deposito', 308, 260],
    ['angolo della forgia', 652, 303], ['banco della forgia', 735, 320],
    ['tenda del mercante', 380, 345], ['muro ovest sopra il mercato', 230, 310],
    ['muro ovest davanti al mercato', 295, 445], ['muro est alla forgia', 798, 335],
    ['muro est della piazza', 775, 395], ['facciata esterna est', 630, 438],
    ['coronamento del muro est', 744, 369],
    ['colonna ovest del varco', 450, 485], ['colonna est del varco', 570, 480],
    ['bordo laterale del ponte', 544, 530],
  ])('esclude dal cammino: %s', (_name, x, y) => {
    expect(hubBlocked(new Vec2(x, y))).toBe(true);
  });
  it('non attraversa edifici o cinta con passi lunghi e diagonali da tutti gli accessi', () => {
    const directions = [-1, 0, 1].flatMap(x => [-1, 0, 1].filter(y => x !== 0 || y !== 0).map(y => new Vec2(x, y)));
    for (const start of [HUB_SPAWN, ...HUB_STATIONS.map(s => hubApproachPoint(s.id)), new Vec2(512, 530)]) {
      for (const direction of directions) {
        const state = new HubState(); state.position = start;
        state.step(4, direction);
        expect(hubBlocked(state.position), `${start.x},${start.y}: ${direction.x},${direction.y}`).toBe(false);
      }
    }
  });
  it('ferma davanti al mercante anche con un passo lungo, mantenendo la possibilità di interagire', () => {
    const state = new HubState();
    state.position = hubApproachPoint('merchant').add(new Vec2(0, 5));
    expect(hubBlocked(state.position)).toBe(false);
    state.step(2, new Vec2(-1, 0));
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.position.x).toBeGreaterThan(370);
    expect(state.nearest()!.id).toBe('merchant');
  });
  it('dal centro si raggiunge a piedi il punto libero davanti a ogni servizio e al portale', () => {
    const visited = new Set<string>(), points: Vec2[] = [], queue = [HUB_SPAWN];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]!, key = p.x + ',' + p.y;
      if (visited.has(key) || hubBlocked(p)) continue;
      visited.add(key); points.push(p);
      for (const d of [new Vec2(8, 0), new Vec2(-8, 0), new Vec2(0, 8), new Vec2(0, -8)]) {
        const q = p.add(d); if (!visited.has(q.x + ',' + q.y)) queue.push(q);
      }
    }
    for (const station of HUB_STATIONS) {
      const approach = hubApproachPoint(station.id);
      expect(hubBlocked(approach), station.id).toBe(false);
      expect(points.some(p => p.distanceTo(approach) <= 8), station.id).toBe(true);
      const state = new HubState(); state.position = approach;
      expect(state.nearest()?.id, station.id).toBe(station.id);
    }
  });
  it('il vecchio banco del fabbro lascia spazio al passaggio verso la forgia', () => {
    const state = new HubState(); state.position = new Vec2(666, 352);
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.nearest()?.id).toBe('forge');
    state.step(0.2, new Vec2(1, 0));
    expect(state.position.x).toBeGreaterThan(690);
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.nearest()?.id).toBe('forge');
  });
  it.each([[630, 315], [660, 330], [695, 350], [742, 354], [720, 370]])('permette di usare la forgia lungo tutto il fronte a %s, %s', (x, y) => {
    const state = new HubState(); state.position = new Vec2(x, y);
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.nearest()?.id).toBe('forge');
  });
  it('non anticipa il tooltip della forgia al centro della piazza o davanti agli altri servizi', () => {
    const state = new HubState(); state.position = new Vec2(570, 332);
    expect(state.nearest()).toBeUndefined();
    for (const id of ['portal', 'storage', 'merchant'] as const) {
      state.position = hubApproachPoint(id);
      expect(state.nearest()?.id).toBe(id);
    }
  });
  it('il varco a sud ha un passaggio libero fra le due colonne', () => {
    for (let y = 400; y <= 540; y += 5) expect(hubBlocked(new Vec2(512, y)), String(y)).toBe(false);
    expect(hubBlocked(new Vec2(512, 550))).toBe(true);
    const state = new HubState(); state.step(3, new Vec2(0, 1));
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.position.y).toBeLessThanOrEqual(543);
  });
  it('il moto a 60 Hz scorre lungo le superfici senza penetrare e aggiorna la direzione', () => {
    const state = new HubState();
    for (let i = 0; i < 180; i++) { state.step(1 / 60, new Vec2(-1, -0.5)); expect(hubBlocked(state.position)).toBe(false); }
    expect(state.facing).toBe(-1); expect(state.position.x).toBeLessThan(HUB_SPAWN.x);
    state.step(1 / 60, Vec2.ZERO); expect(state.moving).toBe(false);
  });
});
