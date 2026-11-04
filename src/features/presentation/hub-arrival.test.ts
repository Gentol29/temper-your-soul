import { describe, expect, it } from 'vitest';
import { HUB_MAP, HUB_SPAWN } from '../character/hub-map';
import { HUB_ARRIVAL, HUB_ARRIVAL_SECONDS, hubArrivalFrame, hubView } from './hub-arrival';
import { MENU_SCENE, menuSceneView } from './menu-scene';
import { REFUGE_LAYOUT, menuLayoutFor } from './menu-layout';

describe('ingresso nel rifugio', () => {
  it('prima avvicina la camera, poi rivela il personaggio e infine restituisce il controllo', () => {
    expect(hubArrivalFrame(0)).toEqual({ zoom: 0, reveal: 0, active: true });
    const beforeReveal = hubArrivalFrame(HUB_ARRIVAL.revealAt / 2);
    expect(beforeReveal.zoom).toBeGreaterThan(0); expect(beforeReveal.reveal).toBe(0);
    const appearing = hubArrivalFrame(HUB_ARRIVAL.revealAt + HUB_ARRIVAL.revealSeconds / 2);
    expect(appearing.reveal).toBeCloseTo(0.5); expect(appearing.active).toBe(true);
    expect(hubArrivalFrame(HUB_ARRIVAL_SECONDS)).toEqual({ zoom: 1, reveal: 1, active: false });
    expect(hubArrivalFrame(Infinity)).toEqual({ zoom: 1, reveal: 1, active: false });
    let previous = hubArrivalFrame(0);
    for (let time = 0; time < 2; time += 1 / 144) {
      const next = hubArrivalFrame(time); expect(next.zoom).toBeGreaterThanOrEqual(previous.zoom); expect(next.reveal).toBeGreaterThanOrEqual(previous.reveal); previous = next;
    }
  });
  it('con animazioni ridotte entra subito, visibile e con i controlli disponibili', () => {
    expect(hubArrivalFrame(0, true)).toEqual({ zoom: 1, reveal: 1, active: false });
  });
  it('menu e mappa hanno la stessa geometria a ogni formato, senza salti al primo fotogramma', () => {
    expect(HUB_MAP.width).toBe(MENU_SCENE.width); expect(HUB_MAP.height).toBe(MENU_SCENE.height);
    for (const [w, h] of [[1920, 1080], [1280, 720], [1024, 768], [390, 844]]) {
      expect(menuLayoutFor(w!, h!)).toEqual(REFUGE_LAYOUT);
      expect(hubView(w!, h!, HUB_SPAWN.x, HUB_SPAWN.y, 0)).toEqual(menuSceneView(w!, h!));
      const close = hubView(w!, h!, HUB_SPAWN.x, HUB_SPAWN.y, 1);
      expect(Number.isInteger(close.scale)).toBe(true);
      expect(HUB_SPAWN.x - close.x).toBeCloseTo(close.width / 2, 0);
      expect(HUB_SPAWN.y - close.y).toBeCloseTo(close.height / 2, 0);
      expect(close.width).toBeLessThanOrEqual(MENU_SCENE.width); expect(close.height).toBeLessThanOrEqual(MENU_SCENE.height);
    }
  });
});
