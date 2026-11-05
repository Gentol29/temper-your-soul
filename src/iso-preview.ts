/*
 * Anteprima di sviluppo della vista isometrica (non e' un ingresso della build di produzione): una partita vera sulla
 * mappa scelta, disegnata con il vero `renderScene`. Parametri:
 *   map=crypt (arena del boss) o l'id di una stanza (crypt_nave, crypt_elbow, crypt_pews, crypt_collapse...)
 *   view=top per la vista dall'alto; fx, fy punto del mondo inquadrato; px, py posizione del giocatore
 *   minions=n servitori attorno al giocatore; zones=1 una zona di pericolo; collisioni=1 i contorni di gioco
 * I fotogrammi renderizzati non sono prove giocate.
 */
import { Camera, ZOOM } from './core/camera';
import { SeededRng } from './core/rng';
import { Vec2 } from './core/vec2';
import { TOP_DOWN } from './core/view-projection';
import { Character } from './features/character/character';
import { CRYPT } from './features/dungeons/crypt';
import { FORGE } from './features/dungeons/forge/forge';
import { GLACIER } from './features/dungeons/glacier/glacier';
import { SWAMP } from './features/dungeons/swamp/swamp';
import { Match } from './features/match/match';
import { preloadSheets } from './features/presentation/boss-art/sheet-images';
import { BOSS_SHEETS } from './features/presentation/boss-art/boss-sheets';
import { Effects } from './features/presentation/effects';
import { preloadFonts } from './features/presentation/fonts';
import { projectionFor } from './features/presentation/iso/view-mode';
import { ActorPoses } from './features/presentation/poses';
import { renderScene } from './features/presentation/scene-renderer';
import { preloadScenery } from './features/presentation/themes/scenery';
import { preloadTiles } from './features/presentation/themes/tiles';
import { roomArena, roomDoors, roomTemplateById } from './features/run/room-templates';
import { drawRoomFloor, drawRoomFront, drawRoomLabels, drawRoomPickups, type RoomLook } from './features/presentation/draw-room';
import type { RoomLayer } from './features/presentation/scene-renderer';
import type { RoomView } from './features/run/encounter';
import { sceneViewFor } from './features/presentation/iso/scene-view';
import { HubState } from './features/character/hub-state';
import { HubIsoRenderer } from './features/presentation/hub-iso-renderer';

const params = new URLSearchParams(location.search);
const number = (name: string): number | null => (params.has(name) ? Number(params.get(name)) : null);
const mapId = params.get('map') ?? 'crypt';
const roomId = mapId === 'hub' ? 'crypt' : mapId;
const dungeons = { crypt: CRYPT, swamp: SWAMP, forge: FORGE, glacier: GLACIER } as const;
const bossMap = roomId in dungeons ? roomId as keyof typeof dungeons : null;
const template = bossMap !== null ? undefined : roomTemplateById(roomId);
const dungeon = dungeons[bossMap ?? (template?.dungeonId as keyof typeof dungeons | undefined) ?? 'crypt'];
const arena = template === undefined ? undefined : roomArena(template, dungeon.arena.theme);
const character = Character.createStarter('mage');
const match = new Match({
  rng: new SeededRng(7),
  dungeon,
  loadout: character.loadout(),
  characterClass: 'mage',
  ...(arena === undefined ? {} : { arena, boss: null }),
});
if (match.boss !== null) match.boss.attackTimer = Number.POSITIVE_INFINITY;
const px = number('px'), py = number('py');
if (px !== null && py !== null) match.player.position = new Vec2(px, py);

const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const ctx = canvas.getContext('2d')!;
const camera = new Camera();
const effects = new Effects(new SeededRng(3));
const poses = new ActorPoses();
camera.setProjection(params.get('view') === 'top' ? TOP_DOWN : projectionFor(match.arena.theme));

function resize(): void {
  camera.setViewSize(window.innerWidth / ZOOM, window.innerHeight / ZOOM);
  canvas.width = camera.width;
  canvas.height = camera.height;
  ctx.imageSmoothingEnabled = false;
  const fx = number('fx'), fy = number('fy');
  camera.follow(fx !== null && fy !== null ? new Vec2(fx, fy) : match.player.position);
}
resize();
window.addEventListener('resize', resize);

preloadSheets(Object.values(BOSS_SHEETS).map((sheet) => sheet.layout.url));
preloadTiles();
preloadScenery();
preloadFonts();

document.querySelector('#info')!.textContent = `${match.arena.name} · ${camera.projection.kind} · ${match.arena.width}x${match.arena.height}`;
const clock = number('t') ?? 0;
// L'HUB isometrico (map=hub): la vera piazza con il suo renderer, il personaggio in px, py.
if (mapId === 'hub') {
  const hub = new HubState();
  if (px !== null && py !== null) hub.position = new Vec2(px, py);
  const renderer = new HubIsoRenderer(canvas);
  const loop = (time: number): void => { renderer.draw(hub, character.appearance(), clock + time / 1000); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  throw new Error('anteprima HUB');
}
// Una stanza finta con due uscite aperte e un premio, per vedere porte, soglie, cartelli e ingresso.
const room: RoomView | null = arena === undefined ? null : {
  kind: 'combat', reward: 'none', cleared: true, wave: 1, waves: 1, countdown: null, trialFailed: false,
  doors: roomDoors(arena, Number(params.get('doors') ?? 2)).map((door) => ({ x: door.position.x, y: door.position.y, progress: door.index === 0 ? 0.6 : 0 })),
  doorsOpen: params.get('open') !== '0',
  pickups: [{ id: 1, kind: 'heal', x: arena.width / 2 + 120, y: arena.height / 2, takenBy: [] }],
  offers: {}, pacts: [], preyId: null,
} as unknown as RoomView;
function frame(time: number): void {
  const look: RoomLook | null = room === null ? null : { view: room, arena: match.arena, nextOptions: [{ kind: 'combat', reward: 'none' }, { kind: 'trial', reward: 'none', hard: true }] as unknown as RoomLook['nextOptions'], localId: 'local', scene: sceneViewFor(camera.projection) };
  const drawRoom = look === null ? undefined : (c: CanvasRenderingContext2D, layer: RoomLayer): void => {
    if (layer === 'floor') drawRoomFloor(c, look, clock + time / 1000);
    else if (layer === 'objects') drawRoomPickups(c, look, clock + time / 1000);
    else if (layer === 'front') drawRoomFront(c, look, clock + time / 1000);
    else drawRoomLabels(c, look);
  };
  renderScene(ctx, { match, effects, poses, camera, clock: clock + time / 1000, ...(drawRoom === undefined ? {} : { drawRoom }) });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
