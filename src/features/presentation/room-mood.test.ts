import { describe, expect, it } from 'vitest';
import { litColor, mixColor } from './lights';
import { entranceDrop, moodAmbient, moodAmbientBlend, ROOM_MOOD, RoomMood } from './room-mood';

const brightness = (hex: string): number => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);

describe('atmosfera della stanza', () => {
  it('la grata dell\'ingresso resta su, poi cade accelerando, rimbalza e resta giu\'', () => {
    const { entranceDelay, entranceFall, bounceTime } = ROOM_MOOD;
    expect(entranceDrop(0)).toBe(0);
    expect(entranceDrop(entranceDelay)).toBe(0);
    const early = entranceDrop(entranceDelay + entranceFall * 0.25);
    const late = entranceDrop(entranceDelay + entranceFall * 0.75);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early * 3);
    expect(entranceDrop(entranceDelay + entranceFall + bounceTime / 2)).toBeLessThan(1);
    expect(entranceDrop(entranceDelay + entranceFall + bounceTime / 2)).toBeGreaterThan(0.8);
    expect(entranceDrop(10)).toBe(1);
  });

  it('le uscite salgono e la luce si scalda solo dopo che la stanza e\' libera', () => {
    const mood = new RoomMood();
    expect(mood.frame(0, 'a', false, 0)).toMatchObject({ exits: 0, warmth: 0, entrance: 0, sinceImpact: null });
    const closed = mood.frame(5, 'a', false, 0);
    expect(closed.exits).toBe(0);
    expect(closed.entrance).toBe(1);
    expect(closed.sinceImpact).toBeGreaterThan(4);
    mood.frame(6, 'a', true, 0);
    const half = mood.frame(6 + ROOM_MOOD.exitRise / 2, 'a', true, 0);
    expect(half.exits).toBeGreaterThan(0.3);
    expect(half.exits).toBeLessThan(0.7);
    const done = mood.frame(6 + ROOM_MOOD.warmTime + 1, 'a', true, 0);
    expect(done.exits).toBe(1);
    expect(done.warmth).toBe(1);
  });

  it('una stanza nuova ricomincia; una gia\' aperta all\'arrivo (calma) e\' aperta e calda da subito', () => {
    const mood = new RoomMood();
    mood.frame(0, 'a', true, 0);
    const calm = mood.frame(10, 'b', true, 0.5);
    expect(calm).toMatchObject({ exits: 1, warmth: 1, entrance: 0, depth: 0.5 });
    const next = mood.frame(20, 'c', false, 0.6);
    expect(next.exits).toBe(0);
    expect(next.entrance).toBe(0);
  });

  it('le tappe profonde sono piu\' scure, la stanza libera piu\' calda', () => {
    const base = '#262c44';
    expect(moodAmbient(base, { depth: 0, warmth: 0 })).toBe(base);
    expect(brightness(moodAmbient(base, { depth: 1, warmth: 0 }))).toBeLessThan(brightness(base));
    const warm = moodAmbient(base, { depth: 0, warmth: 1 });
    expect(parseInt(warm.slice(1, 3), 16) - parseInt(base.slice(1, 3), 16)).toBeGreaterThan(parseInt(warm.slice(5, 7), 16) - parseInt(base.slice(5, 7), 16));
  });

  it('litColor scurisce come la luce: grigio medio neutro, ambiente scuro piu\' scuro', () => {
    expect(litColor('#424652', '#808080')).toBe('#424652');
    expect(brightness(litColor('#424652', '#262c44'))).toBeLessThan(brightness('#424652'));
    expect(brightness(litColor('#424652', '#c0c0c0'))).toBeGreaterThan(brightness('#424652'));
  });

  it('se il tempo torna indietro le grate restano dove sono', () => {
    const mood = new RoomMood();
    mood.frame(10, 'a', false, 0);
    mood.frame(12, 'a', true, 0);
    const before = mood.frame(14, 'a', true, 0);
    const after = mood.frame(13, 'a', true, 0);
    expect(after.exits).toBe(before.exits);
    expect(after.entrance).toBe(before.entrance);
  });

  it('mixColor mescola e resta nei limiti', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#102030', '#ffffff', -1)).toBe('#102030');
    expect(mixColor('#102030', '#000000', 2)).toBe('#000000');
  });
});

describe('passaggio di luce della stanza liberata', () => {
  const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  it("fuori dal passaggio non c'e' nulla da sfumare", () => {
    expect(moodAmbientBlend('#30323a', { depth: 0.5, warmth: 0 })).toBeNull();
    expect(moodAmbientBlend('#30323a', { depth: 0.5, warmth: 1 })).toBeNull();
  });

  it("durante il passaggio bastano due colori fermi: la loro sfumatura e' l'ambiente di ogni istante", () => {
    for (const base of ['#30323a', '#1d2a24', '#3a2a22', '#2a3442']) {
      for (const depth of [0, 0.4, 1]) {
        const first = moodAmbientBlend(base, { depth, warmth: 0.1 })!;
        for (let warmth = 0.05; warmth < 1; warmth += 0.05) {
          const blend = moodAmbientBlend(base, { depth, warmth })!;
          // Gli estremi non cambiano con il calore: in cache restano due sole versioni per tratto.
          expect([blend.from, blend.to]).toEqual([first.from, first.to]);
          const expected = channels(moodAmbient(base, { depth, warmth }));
          const mixed = channels(blend.from).map((value, i) => value + (channels(blend.to)[i]! - value) * blend.t);
          mixed.forEach((value, i) => expect(Math.abs(value - expected[i]!), `${base} d${depth} w${warmth.toFixed(2)}`).toBeLessThanOrEqual(1));
        }
      }
    }
  });
});
