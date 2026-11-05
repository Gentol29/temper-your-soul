import { describe, it, expect } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { HUB_ISO_BUILDINGS } from './hub-iso-map';
import { HubState, HUB_STATIONS, HUB_MAP, HUB_SPAWN, hubApproachPoint, hubBlocked, hubSpawnPoint } from './hub-state';

describe('piazza isometrica del rifugio e collisioni', () => {
  it('parte al centro della piazza, su un punto libero e fuori dalle interazioni', () => {
    const state = new HubState();
    expect(state.position).toEqual(HUB_SPAWN);
    expect(hubBlocked(state.position)).toBe(false);
    expect(state.nearest()).toBeUndefined();
  });

  it('blocca gli edifici (con il corpo) e i bordi della piazza, non il selciato', () => {
    for (const b of HUB_ISO_BUILDINGS) {
      expect(hubBlocked(new Vec2(b.x + b.width / 2, b.y + b.height / 2)), b.id).toBe(true);
      expect(hubBlocked(new Vec2(b.x + b.width + HUB_MAP.playerRadius - 1, b.y + b.height / 2)), b.id).toBe(true);
    }
    expect(hubBlocked(new Vec2(HUB_MAP.margin - 1, 500))).toBe(true);
    expect(hubBlocked(new Vec2(500, HUB_MAP.height - HUB_MAP.margin + 1))).toBe(true);
    expect(hubBlocked(new Vec2(320, 420))).toBe(false);
  });

  it('non attraversa edifici o bordi con passi lunghi e diagonali da tutti gli accessi', () => {
    const directions = [-1, 0, 1].flatMap(x => [-1, 0, 1].filter(y => x !== 0 || y !== 0).map(y => new Vec2(x, y)));
    for (const start of [HUB_SPAWN, ...HUB_STATIONS.map(s => hubApproachPoint(s.id))]) {
      for (const direction of directions) {
        const state = new HubState(); state.position = start;
        state.step(4, direction);
        expect(hubBlocked(state.position), `${start.x},${start.y}: ${direction.x},${direction.y}`).toBe(false);
      }
    }
  });

  it('dal centro si raggiunge a piedi l accesso di ogni servizio e del portale, e da li si interagisce', () => {
    const visited = new Set<string>(), queue = [HUB_SPAWN];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]!, key = p.x + ',' + p.y;
      if (visited.has(key) || hubBlocked(p)) continue;
      visited.add(key);
      for (const d of [new Vec2(8, 0), new Vec2(-8, 0), new Vec2(0, 8), new Vec2(0, -8)]) {
        const q = p.add(d); if (!visited.has(q.x + ',' + q.y)) queue.push(q);
      }
    }
    for (const station of HUB_STATIONS) {
      const approach = hubApproachPoint(station.id);
      expect(hubBlocked(approach), station.id).toBe(false);
      const reachable = [...visited].some(key => { const [x, y] = key.split(',').map(Number); return new Vec2(x!, y!).distanceTo(approach) < 12; });
      expect(reachable, station.id).toBe(true);
      const state = new HubState(); state.position = approach;
      expect(state.nearest()?.id, station.id).toBe(station.id);
    }
  });

  it('i visitatori nascono su punti liberi diversi', () => {
    const points = [0, 1, 2, 3].map(hubSpawnPoint);
    for (const p of points) expect(hubBlocked(p)).toBe(false);
    expect(new Set(points.map(p => `${p.x},${p.y}`)).size).toBe(4);
  });

  it('il verso segue lo schermo isometrico: a destra se il passo va a destra nella vista', () => {
    const state = new HubState();
    state.step(1 / 60, new Vec2(0.7, -0.7));
    expect(state.facing).toBe(1);
    state.step(1 / 60, new Vec2(-0.7, 0.7));
    expect(state.facing).toBe(-1);
    // Dritto in alto sullo schermo (nord-ovest nel mondo): il verso non cambia.
    state.step(1 / 60, new Vec2(-0.7, -0.7));
    expect(state.facing).toBe(-1);
  });
});
