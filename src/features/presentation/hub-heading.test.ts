import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { HubState } from '../character/hub-state';
import { PEER_HEADING_MIN_STEP, peerHeading } from './hub-heading';
import { spriteFacing, spriteViewFromAim } from './sprite-view';

describe('otto direzioni nel rifugio', () => {
  it('il giocatore tiene la direzione del movimento, anche in diagonale e da fermo', () => {
    const state = new HubState();
    expect(spriteViewFromAim(state.heading.x, state.heading.y)).toBe('SE');
    const cases: Array<[Vec2, string, number]> = [
      [new Vec2(0, 1), 'S', 1], [new Vec2(1, 1), 'SE', 1], [new Vec2(1, 0), 'E', 1], [new Vec2(1, -1), 'NE', 1],
      [new Vec2(0, -1), 'N', 1], [new Vec2(-1, -1), 'NE', -1], [new Vec2(-1, 0), 'E', -1], [new Vec2(-1, 1), 'SE', -1],
    ];
    for (const [move, view, facing] of cases) {
      state.step(1 / 60, move);
      expect(spriteViewFromAim(state.heading.x, state.heading.y), `${move.x},${move.y}`).toBe(view);
      expect(spriteFacing(state.heading, facing), `${move.x},${move.y}`).toBe(facing);
    }
    state.step(1 / 60, Vec2.ZERO);
    expect(spriteViewFromAim(state.heading.x, state.heading.y)).toBe('SE');
  });

  it('un compagno prende la direzione dal suo spostamento e la conserva da fermo', () => {
    let track = peerHeading(undefined, { x: 100, y: 100, facing: -1 });
    expect(track.heading.x).toBeLessThan(0);
    track = peerHeading(track, { x: 100, y: 96, facing: -1 });
    expect(spriteViewFromAim(track.heading.x, track.heading.y)).toBe('N');
    track = peerHeading(track, { x: 100 + PEER_HEADING_MIN_STEP / 2, y: 96, facing: 1 });
    expect(spriteViewFromAim(track.heading.x, track.heading.y)).toBe('N');
    track = peerHeading(track, { x: 104, y: 100, facing: 1 });
    expect(spriteViewFromAim(track.heading.x, track.heading.y)).toBe('SE');
  });
});
