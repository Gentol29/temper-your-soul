import { Camera } from '../../core/camera';
import { ISOMETRIC } from '../../core/view-projection';
import { Vec2 } from '../../core/vec2';
import type { ArenaDefinition } from '../arena/arena';
import type { CharacterAppearance } from '../character/appearance';
import { HUB_ISO_BUILDINGS, HUB_ISO_MAP, type HubIsoBuilding } from '../character/hub-iso-map';
import type { HubState } from '../character/hub-state';
import type { HubPlayer } from '../network/hub-protocol';
import { sheetImage, preloadSheets } from './boss-art/sheet-images';
import { drawGameCharacter } from './game-character-preview';
import { drawHubArrival, hubArrivalFrame } from './hub-arrival';
import { hubCanvasDisplay, HUB_ACTOR_FEET_OFFSET } from './hub-projection';
import { HUB_ISO_SPRITES } from './hub-iso-atlas';
import { IsoFloorCache } from './iso/iso-floor-cache';
import { drawIsoBackWalls, drawIsoFrontEdges, paintWallFootShadows, sconceAnchor } from './iso/iso-scenery';
import type { IsoArtFrame } from './iso/iso-theme';
import { behindRect, orderWithOccluders, rememberIsoScene, stampFromScene, type IsoFigure, type IsoOccluder } from './iso/occluders';
import { ISO_VIEW } from './iso/scene-view';
import { drawLight, LightMap } from './lights';
import { CRYPT_ISO_GROUND, CRYPT_TORCHES, drawCryptTorch } from './themes/crypt';
import { drawTile, tileAt, tileSheet } from './themes/tiles';
import { floorVersion } from './themes/scenery';

/*
 * L'HUB in isometria, come i dungeon: la piazza di `hub-iso-map.ts` con le lastre e le facciate della Cripta, gli edifici
 * generati in locale (`tools/arte/genera_hub_iso.py`) appoggiati sui loro ingombri di gioco, i personaggi con i piedi sul
 * loro punto e la profondita' fra figure ed edifici. Solo aspetto: collisioni e stazioni sono quelle della mappa.
 */

/** Valori provvisori: buio dell'ambiente, colore del vuoto, larghezza del tappeto verso il portale. */
export const HUB_ISO_LOOK = { ambient: '#2c3048', void: '#06070b', carpet: 48 } as const;

/**
 * Scala intera degli edifici: il generatore li da' larghi 45-76 pixel, troppo piccoli accanto ai personaggi; a 2 i pixel
 * restano interi e nitidi, piu' grossi di quelli delle figure (provvisorio, da confermare).
 */
export const HUB_ISO_BUILDING_SCALE = 2;

const scaledSprites = new Map<string, HTMLCanvasElement>();

/** Lo sprite ingrandito di un intero, in cache: si disegna e fa da sagoma per la profondita'. */
function scaledSprite(url: string, image: HTMLImageElement): HTMLCanvasElement {
  let canvas = scaledSprites.get(url);
  if (canvas === undefined) {
    const scale = HUB_ISO_BUILDING_SCALE;
    canvas = document.createElement('canvas');
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    const paint = canvas.getContext('2d')!;
    paint.imageSmoothingEnabled = false;
    paint.drawImage(image, 0, 0, canvas.width, canvas.height);
    scaledSprites.set(url, canvas);
  }
  return canvas;
}

/** La piazza come mappa: muri e misure per la grafica isometrica comune (nessun ostacolo di gioco qui). */
const HUB_ARENA: ArenaDefinition = {
  id: 'hub_iso', name: 'Rifugio', theme: 'crypt', width: HUB_ISO_MAP.width, height: HUB_ISO_MAP.height,
  wallThickness: HUB_ISO_MAP.wall, playerSpawn: Vec2.ZERO, bossSpawn: Vec2.ZERO,
  playerMargin: HUB_ISO_MAP.margin, bossMargin: HUB_ISO_MAP.margin, projectileMargin: HUB_ISO_MAP.wall, pillars: [],
};

const portal = HUB_ISO_BUILDINGS.find((b) => b.id === 'portal')!;

/** Il selciato della piazza: lastre della Cripta con le fughe grandi e un tappeto cremisi dal centro al portale. */
function paintHubGround(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const sheet = tileSheet('crypt');
  const bounds = camera.worldBounds();
  const carpetX0 = portal.x + portal.width / 2 - HUB_ISO_LOOK.carpet / 2, carpetX1 = carpetX0 + HUB_ISO_LOOK.carpet;
  const x0 = Math.max(0, Math.floor(bounds.x0 / 32) * 32), y0 = Math.max(0, Math.floor(bounds.y0 / 32) * 32);
  for (let y = y0; y < Math.min(arena.height, bounds.y1 + 32); y += 32) {
    for (let x = x0; x < Math.min(arena.width, bounds.x1 + 32); x += 32) {
      const carpet = x >= carpetX0 && x < carpetX1 && y >= portal.y + portal.height;
      if (sheet === null) {
        ctx.fillStyle = carpet ? '#241312' : (x + y) % 64 === 0 ? '#252b34' : '#222831';
        ctx.fillRect(x, y, 32, 32);
        continue;
      }
      const zone = Math.sin(Math.floor(x / 160) * 12.9898 + Math.floor(y / 160) * 78.233) * 43758.5453;
      const worn = zone - Math.floor(zone) > 0.7;
      const tile = tileAt('crypt', carpet ? 'carpet' : worn ? 'floorWorn' : 'floor', x, y, 0);
      if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
      const { slab, joint, bevel } = CRYPT_ISO_GROUND;
      if (!carpet && x % slab === 0) { ctx.fillStyle = joint; ctx.fillRect(x, y, 1, 32); ctx.fillStyle = bevel; ctx.fillRect(x + 1, y, 1, 32); }
      if (!carpet && y % slab === 0) { ctx.fillStyle = joint; ctx.fillRect(x, y, 32, 1); ctx.fillStyle = bevel; ctx.fillRect(x, y + 1, 32, 1); }
    }
  }
  // Orli del tappeto: un filo scuro e uno d'oro spento ai due lati.
  ctx.fillStyle = '#1c1014';
  ctx.fillRect(carpetX0, portal.y + portal.height, 2, arena.height);
  ctx.fillRect(carpetX1 - 2, portal.y + portal.height, 2, arena.height);
  ctx.fillStyle = '#5a4428';
  ctx.fillRect(carpetX0 + 3, portal.y + portal.height, 1, arena.height);
  ctx.fillRect(carpetX1 - 4, portal.y + portal.height, 1, arena.height);
  paintWallFootShadows(ctx, arena);
}

/** Dove sta lo sprite di un edificio: centrato sul suo ingombro proiettato, con il fondo sull'angolo davanti. */
export function buildingPlacement(building: HubIsoBuilding, width: number, height: number): { readonly left: number; readonly top: number } {
  const x1 = building.x + building.width, y1 = building.y + building.height;
  const leftCorner = ISOMETRIC.toView(building.x, y1), rightCorner = ISOMETRIC.toView(x1, building.y), front = ISOMETRIC.toView(x1, y1);
  return { left: Math.round((leftCorner.x + rightCorner.x) / 2 - width / 2), top: Math.round(front.y) - height };
}

export class HubIsoRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly floor = new IsoFloorCache(paintHubGround);
  private readonly lights = new LightMap();
  readonly camera = new Camera();
  scale = 2;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.camera.projection = ISOMETRIC;
    preloadSheets(Object.values(HUB_ISO_SPRITES).map((sprite) => sprite.url));
  }

  draw(state: HubState, appearance: CharacterAppearance, time: number, peers: readonly HubPlayer[] = [], arrivalElapsed = Infinity, calm = false): void {
    const arrival = hubArrivalFrame(arrivalElapsed, calm);
    // Scala intera come il resto dell'HUB: pixel nitidi, circa 560 x 315 unita' di vista visibili.
    this.scale = Math.max(1, Math.min(4, Math.floor(Math.min(window.innerWidth / 560, window.innerHeight / 315))));
    const width = Math.ceil(window.innerWidth / this.scale), height = Math.ceil(window.innerHeight / this.scale);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const display = hubCanvasDisplay(width, height, this.scale);
    this.canvas.style.width = `${display.width}px`; this.canvas.style.height = `${display.height}px`;
    this.camera.setViewSize(width, height);
    this.camera.follow(state.position);
    const c = this.ctx, clock = calm ? 2.5 : time, view = ISO_VIEW;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = HUB_ISO_LOOK.void;
    c.fillRect(0, 0, width, height);
    c.save();
    const left = Math.round(this.camera.position.x), top = Math.round(this.camera.position.y);
    c.translate(-left, -top);
    const frame: IsoArtFrame = { arena: HUB_ARENA, view, camera: this.camera, clock, covers: [], coverFlashes: new Map(), ambient: HUB_ISO_LOOK.ambient };

    this.lights.begin(true);
    this.floor.draw(c, HUB_ARENA, this.camera, `${floorVersion('crypt')}|hub`);
    drawIsoBackWalls(c, frame, 'crypt');
    this.drawSconces(c, frame);
    const occluders = this.drawBuildings(c);
    // La luce rossa del portale e quella dei viandanti.
    const door = ISOMETRIC.toView(portal.x + portal.width / 2, portal.y + portal.height);
    drawLight(c, door.x, door.y - 30, '#ff3b3b', 210, 0.7 + 0.15 * Math.sin(clock * 2.4));
    for (const actor of [{ x: state.position.x, y: state.position.y }, ...peers]) view.at(c, actor.x, actor.y, 0, () => drawLight(c, actor.x, actor.y - 22, '#e8dcc8', 240, 0.75));
    this.lights.composite(c, this.camera, left, top, HUB_ISO_LOOK.ambient);

    const figures: IsoFigure[] = [];
    const figure = (x: number, y: number, draw: () => void): void => {
      const at = ISOMETRIC.toView(x, y);
      figures.push({ x, y, box: { x: Math.floor(at.x - 26), y: Math.floor(at.y - 62), width: 52, height: 66 }, draw: () => view.at(c, x, y, 0, draw) });
    };
    const hero = (): void => {
      c.fillStyle = '#08070a99'; c.fillRect(Math.round(state.position.x - 12), Math.round(state.position.y - 3), 24, 5);
      drawGameCharacter(c, appearance, state.position.x, state.position.y - HUB_ACTOR_FEET_OFFSET, time, state.moving, state.facing);
    };
    figure(state.position.x, state.position.y, () => drawHubArrival(c, state.position.x, state.position.y - HUB_ACTOR_FEET_OFFSET, arrival.reveal, arrivalElapsed, hero));
    for (const peer of peers) {
      figure(peer.x, peer.y, () => {
        c.fillStyle = '#08070a99'; c.fillRect(Math.round(peer.x - 12), Math.round(peer.y - 3), 24, 5);
        drawGameCharacter(c, peer.appearance, peer.x, peer.y - HUB_ACTOR_FEET_OFFSET, time, peer.moving, peer.facing);
      });
    }
    if (occluders.length > 0) rememberIsoScene(c);
    for (const step of orderWithOccluders(figures, occluders)) step();
    drawIsoFrontEdges(c, frame, 'crypt');
    c.restore();
  }

  /** Gli edifici sui loro ingombri, nella scena illuminata; tornano davanti a chi passa loro dietro. */
  private drawBuildings(c: CanvasRenderingContext2D): IsoOccluder[] {
    const occluders: IsoOccluder[] = [];
    for (const building of HUB_ISO_BUILDINGS) {
      const sprite = HUB_ISO_SPRITES[building.id];
      const image = sheetImage(sprite.url);
      if (image === null) continue;
      const art = scaledSprite(sprite.url, image);
      const { left, top } = buildingPlacement(building, art.width, art.height);
      c.drawImage(art, left, top);
      occluders.push({
        box: { x: left, y: top, width: art.width, height: art.height },
        isBehind: behindRect(building.x + building.width, building.y + building.height),
        stamp: () => stampFromScene(c, art, left, top, art.width, art.height),
      });
    }
    return occluders;
  }

  /** Torce appese ai due muri di fondo, come nella Cripta, lontano dagli edifici. */
  private drawSconces(c: CanvasRenderingContext2D, frame: IsoArtFrame): void {
    const t = HUB_ISO_MAP.wall, spacing = CRYPT_TORCHES.sconceSpacing;
    const free = (wall: 'ne' | 'nw', along: number): boolean => HUB_ISO_BUILDINGS.every((b) => wall === 'ne'
      ? b.y > t || along < b.x - 30 || along > b.x + b.width + 30
      : b.x > t || along < b.y - 30 || along > b.y + b.height + 30);
    for (const wall of ['ne', 'nw'] as const) {
      const length = wall === 'ne' ? HUB_ISO_MAP.width : HUB_ISO_MAP.height;
      for (let along = t + spacing / 2; along < length - t - 60; along += spacing) {
        if (!free(wall, along)) continue;
        const at = sconceAnchor(wall, t, along);
        c.save();
        c.translate(at.x - along, at.y);
        drawCryptTorch(c, along, 0, frame.clock, true);
        c.restore();
      }
    }
  }

  /** Un punto del mondo sullo schermo (pixel CSS), alzato di `lift` unita' della vista (le etichette sopra le teste). */
  screenPoint(x: number, y: number, lift = 0): { x: number; y: number } {
    const view = ISOMETRIC.toView(x, y);
    return { x: (view.x - Math.round(this.camera.position.x)) * this.scale, y: (view.y - lift - Math.round(this.camera.position.y)) * this.scale };
  }
}
