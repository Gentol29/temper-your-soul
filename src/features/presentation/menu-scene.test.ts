import { describe, expect, it } from 'vitest';
import { HUB_MAP, HUB_STATIONS, hubApproachPoint, hubBlocked } from '../character/hub-map';
import { Vec2 } from '../../core/vec2';
import { MENU_ICONS } from './menu-icons';
import { MENU_FLOOR_URL, MENU_MODULES, menuLayoutFor } from './menu-layout';
import { MENU_SCENE, menuSceneView } from './menu-scene';

/** Il minimo di `node:fs` che serve ai test. */
interface FileSystem {
  existsSync(path: URL): boolean;
  readFileSync(path: URL): Uint8Array;
}
const NODE_FS = 'node:fs';
const fileSystem = async (): Promise<FileSystem> => (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const word = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
  return { width: word(16), height: word(20) };
}

const WINDOWS = [[1280, 720], [1920, 1080], [2560, 1440], [1366, 768], [1600, 900], [1024, 768], [800, 600], [390, 844], [320, 240]] as const;

describe('scena del menu', () => {
  it('la vista copre la finestra e non esce dal dipinto', () => {
    for (const [width, height] of WINDOWS) {
      const view = menuSceneView(width, height);
      expect(view.width, `${width}x${height}`).toBeLessThanOrEqual(MENU_SCENE.width);
      expect(view.height, `${width}x${height}`).toBeLessThanOrEqual(MENU_SCENE.height);
      expect(view.x, `${width}x${height}`).toBeGreaterThanOrEqual(0);
      expect(view.y, `${width}x${height}`).toBeGreaterThanOrEqual(0);
      expect(view.width * view.scale, `${width}x${height}`).toBeGreaterThanOrEqual(width - 0.01);
      expect(view.height * view.scale, `${width}x${height}`).toBeGreaterThanOrEqual(height - 0.01);
    }
  });

  it('i pezzi esistono e misurano quanto dichiara la tabella; il totale resta leggero', async () => {
    const fs = await fileSystem();
    let total = 0;
    const floor = fs.readFileSync(new URL(MENU_FLOOR_URL));
    total += floor.length;
    expect(pngSize(floor)).toEqual({ width: MENU_SCENE.width, height: MENU_SCENE.height });
    for (const module of MENU_MODULES) {
      const file = new URL(module.url);
      expect(fs.existsSync(file), module.id).toBe(true);
      const bytes = fs.readFileSync(file);
      total += bytes.length;
      expect(pngSize(bytes), module.id).toEqual({ width: module.width, height: module.height });
    }
    expect(total).toBeLessThan(800 * 1024);
  });

  it('in ogni impaginazione tutti i pezzi hanno una posizione e le fiamme stanno dentro il loro sprite', () => {
    for (const [width, height] of WINDOWS) {
      const view = menuSceneView(width, height);
      const layout = menuLayoutFor(view.width, view.height);
      for (const module of MENU_MODULES) {
        expect(layout[module.id], `${width}x${height} ${module.id}`).toBeDefined();
        expect(layout[module.id].x + module.width / 2, `${width}x${height} ${module.id}`).toBeGreaterThanOrEqual(0);
        expect(layout[module.id].x + module.width / 2, `${width}x${height} ${module.id}`).toBeLessThanOrEqual(MENU_SCENE.width);
      }
    }
    for (const [width, height] of WINDOWS) {
      const view = menuSceneView(width, height);
      const { hero } = menuLayoutFor(view.width, view.height);
      expect(hero.x, `${width}x${height}`).toBeGreaterThanOrEqual(view.x);
      expect(hero.x, `${width}x${height}`).toBeLessThanOrEqual(view.x + view.width);
    }
    for (const module of MENU_MODULES) for (const light of module.flames) {
      expect(light.x, module.id).toBeLessThan(module.width);
      expect(light.y, module.id).toBeLessThan(module.height);
    }
  });

  it('a 16:9 il portale della cattedrale resta sopra gli angoli dei comandi', () => {
    const cathedral = MENU_MODULES.find((module) => module.id === 'cathedral')!;
    for (const [width, height] of [[1280, 720], [1366, 768], [1600, 900], [1920, 1080], [2560, 1440]] as const) {
      const view = menuSceneView(width, height);
      const at = menuLayoutFor(view.width, view.height).cathedral;
      // La bocca finisce 134 pixel sotto la cima dello sprite; gli angoli scuri in basso sono alti 270 pixel.
      expect((at.y + 134 - view.y) * view.scale, `${width}x${height}`).toBeLessThanOrEqual(height - 270);
      expect(cathedral.height).toBeGreaterThan(134);
    }
  });
});

describe('icone del menu', () => {
  it('ogni disegno ha le misure dichiarate e tutti i suoi colori', () => {
    for (const [id, sprite] of Object.entries(MENU_ICONS)) {
      const size = sprite.size ?? 16;
      expect(sprite.pixels.length, id).toBeLessThanOrEqual(size);
      for (const row of sprite.pixels) {
        expect(row.length, `${id}: ${row}`).toBeLessThanOrEqual(size);
        for (const pixel of row) if (pixel !== '.') expect(sprite.palette[pixel], `${id}: ${pixel}`).toBeDefined();
      }
    }
  });
});

describe('accessi dal menu ai luoghi del rifugio', () => {
  it('portano su un punto libero, abbastanza vicino da poter interagire', () => {
    for (const station of HUB_STATIONS) {
      const point = hubApproachPoint(station.id);
      expect(hubBlocked(point), station.id).toBe(false);
      expect(point.distanceTo(new Vec2(station.x, station.y)), station.id).toBeLessThan(HUB_MAP.interactionRadius);
    }
  });
});
