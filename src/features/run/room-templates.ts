import { Vec2 } from '../../core/vec2';
import { chasmAt, solidAt, type ArenaDefinition, type ArenaThemeId, type Bridge, type Pillar, type Solid } from '../arena/arena';

/*
 * Stanze modello della discesa, fatte a mano: forma, ripari e uso. Il seme della discesa sceglie quali usare; il
 * regista le riempie di servitori. Coordinate in unita' del mondo, origine in alto a sinistra; l'ingresso e' in basso
 * al centro, le porte d'uscita sul muro in alto. Valori provvisori.
 */

/** A che cosa serve una stanza: combattimento (ripari sparsi) o calma (luogotenente, santuario, anticamera, forziere). */
export type RoomUse = 'combat' | 'calm';

export interface RoomTemplate {
  /** Id stabile (rete, test). */
  readonly id: string;
  readonly dungeonId: string;
  /** Nome della stanza (in italiano). */
  readonly name: string;
  readonly use: RoomUse;
  readonly width: number;
  readonly height: number;
  readonly pillars: readonly Pillar[];
  /**
   * Massicci rettangolari (stanze a gomito, a crocevia, a strettoia, con nicchie). Solo nelle stanze di combattimento:
   * in quelle di calma combattono i luogotenenti, che volano sopra i pilastri ma non attraverso i massicci.
   */
  readonly solids?: readonly Solid[];
  /**
   * Pozzi, ponti e ripari distruttibili (fase 5 dello studio grafico, proposta per Jabbaz): solo nelle stanze di
   * combattimento, lontano dall'ingresso e dalle porte.
   */
  readonly chasms?: readonly Solid[];
  readonly bridges?: readonly Bridge[];
  readonly covers?: readonly Solid[];
}

/** Una porta d'uscita sul muro in alto: il gruppo ci si ferma sopra per attraversarla. */
export interface RoomDoor {
  readonly index: number;
  /** Centro della soglia, appena dentro il muro. */
  readonly position: Vec2;
  readonly halfWidth: number;
  readonly depth: number;
}

/** Misure comuni delle stanze. Provvisorie. */
export const ROOM_LAYOUT = {
  wallThickness: 24,
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  /** Distanza dell'ingresso dal muro in basso. */
  entranceInset: 120,
  doorHalfWidth: 58,
  doorDepth: 86,
  /** Griglia dei punti di comparsa e distanze da rispettare. */
  spawnStep: 150,
  spawnInset: 110,
  spawnFromEntrance: 260,
  spawnFromPillar: 40,
  spawnFromDoors: 190,
} as const;

const pillar = (x: number, y: number, radius: number): Pillar => ({ position: new Vec2(x, y), radius });

/** Pozzi, ponti e ripari di una stanza della fase 5. */
interface Hazards {
  readonly chasms?: readonly Solid[];
  readonly bridges?: readonly Bridge[];
  readonly covers?: readonly Solid[];
}

const template = (
  dungeonId: string,
  id: string,
  name: string,
  use: RoomUse,
  width: number,
  height: number,
  pillars: readonly Pillar[],
  solids?: readonly Solid[],
  hazards: Hazards = {},
): RoomTemplate => ({ id: `${dungeonId}_${id}`, dungeonId, name, use, width, height, pillars, ...(solids === undefined ? {} : { solids }), ...hazards });

const solid = (x: number, y: number, width: number, height: number): Solid => ({ x, y, width, height });

/** Il bordo interno dei muri: i massicci addossati a un muro partono da qui. */
const WALL = 24;

/** Un massiccio nell'angolo in basso a destra: la stanza diventa a gomito. */
const elbow = (width: number, height: number, fromX: number, fromY: number): Solid[] => [solid(fromX, fromY, width - WALL - fromX, height - WALL - fromY)];

/** Quattro massicci negli angoli: resta una croce. */
const crossing = (width: number, height: number, sizeX: number, sizeY: number): Solid[] => [
  solid(WALL, WALL, sizeX, sizeY),
  solid(width - WALL - sizeX, WALL, sizeX, sizeY),
  solid(WALL, height - WALL - sizeY, sizeX, sizeY),
  solid(width - WALL - sizeX, height - WALL - sizeY, sizeX, sizeY),
];

/** Due massicci dai muri laterali alla stessa altezza: una strettoia larga `gap` al centro. */
const narrows = (width: number, top: number, thickness: number, gap: number): Solid[] => {
  const side = (width - gap) / 2 - WALL;
  return [solid(WALL, top, side, thickness), solid(width - WALL - side, top, side, thickness)];
};

/** Nicchie: blocchi addossati ai muri laterali alle altezze date. */
const niches = (width: number, depth: number, rows: readonly (readonly [number, number])[]): Solid[] =>
  rows.flatMap(([top, height]) => [solid(WALL, top, depth, height), solid(width - WALL - depth, top, depth, height)]);

/**
 * Un fiume (pozzo da muro a muro) all'altezza `top`, spesso `depth`, interrotto da ponti larghi `span` centrati nelle
 * ascisse `crossings`: i pozzi sono i tratti fra un ponte e l'altro.
 */
const river = (width: number, top: number, depth: number, span: number, crossings: readonly number[]): Hazards => {
  const bridges: Bridge[] = crossings.map((x) => ({ x: x - span / 2, y: top, width: span, height: depth, along: 'ns' }));
  const edges = [WALL, ...bridges.flatMap((bridge) => [bridge.x, bridge.x + bridge.width]), width - WALL];
  const chasms: Solid[] = [];
  for (let i = 0; i < edges.length; i += 2) {
    if (edges[i + 1]! > edges[i]!) chasms.push(solid(edges[i]!, top, edges[i + 1]! - edges[i]!, depth));
  }
  return { chasms, bridges };
};

/** Ripari tutti della stessa misura, agli angoli in alto a sinistra dati. */
const covers = (width: number, height: number, spots: readonly (readonly [number, number])[]): Solid[] => spots.map(([x, y]) => solid(x, y, width, height));

const ring = (cx: number, cy: number, radius: number, count: number, size: number): Pillar[] =>
  Array.from({ length: count }, (_, i) => pillar(Math.round(cx + Math.cos((i * Math.PI * 2) / count) * radius), Math.round(cy + Math.sin((i * Math.PI * 2) / count) * radius), size));

export const ROOM_TEMPLATES: Readonly<Record<string, readonly RoomTemplate[]>> = {
  crypt: [
    template('crypt', 'nave', 'Navata', 'combat', 2000, 1300, [520, 840, 1160, 1480].flatMap((x) => [pillar(x, 440, 24), pillar(x, 860, 24)])),
    template('crypt', 'chapel', 'Cappella laterale', 'combat', 1700, 1150, [pillar(560, 420, 32), pillar(1140, 420, 32), pillar(560, 760, 32), pillar(1140, 760, 32)]),
    template('crypt', 'ossuary', 'Ossario', 'combat', 2200, 1400, [
      pillar(400, 350, 22), pillar(900, 500, 22), pillar(1500, 380, 22), pillar(1850, 620, 22), pillar(700, 950, 22), pillar(1500, 900, 22),
    ]),
    template('crypt', 'cloister', 'Chiostro', 'combat', 1900, 1300, ring(950, 620, 300, 8, 22)),
    template('crypt', 'undercroft', 'Cripta bassa', 'combat', 2300, 1100, [pillar(650, 520, 42), pillar(1150, 520, 42), pillar(1650, 520, 42)]),
    template('crypt', 'elbow', 'Sala a gomito', 'combat', 2000, 1300, [pillar(520, 420, 28), pillar(1480, 420, 28), pillar(560, 900, 28)], elbow(2000, 1300, 1240, 760)),
    template('crypt', 'crossing', 'Crocevia', 'combat', 2100, 1400, [pillar(700, 700, 28), pillar(1400, 700, 28)], crossing(2100, 1400, 336, 356)),
    // Fase 5: un crollo da muro a muro con due passerelle di assi; una navata di panche che si rompono.
    template('crypt', 'collapse', 'Crollo', 'combat', 2048, 1344, [pillar(320, 960, 24), pillar(1728, 960, 24), pillar(1024, 330, 28), pillar(640, 300, 22), pillar(1408, 300, 22)], undefined,
      river(2048, 576, 128, 160, [536, 1512])),
    template('crypt', 'pews', 'Navata dei banchi', 'combat', 2048, 1344, [pillar(400, 220, 22), pillar(1648, 220, 22)], undefined, {
      covers: covers(176, 40, [[280, 360], [1592, 360], [280, 520], [1592, 520], [280, 680], [1592, 680], [280, 840], [1592, 840], [640, 440], [1232, 440], [640, 760], [1232, 760]]),
    }),
    template('crypt', 'altar', 'Altare', 'calm', 1700, 1300, [pillar(350, 350, 28), pillar(1350, 350, 28), pillar(350, 950, 28), pillar(1350, 950, 28)]),
  ],
  swamp: [
    template('swamp', 'mire', 'Acquitrino', 'combat', 2000, 1400, [pillar(500, 450, 60), pillar(1450, 420, 52), pillar(980, 700, 70), pillar(560, 1000, 48), pillar(1500, 1000, 58)]),
    template('swamp', 'roots', 'Radici', 'combat', 2200, 1300, [pillar(420, 620, 56), pillar(900, 380, 64), pillar(1300, 760, 72), pillar(1800, 460, 50), pillar(1750, 1000, 46)]),
    template('swamp', 'pool', 'Pozza nera', 'combat', 1800, 1200, [pillar(900, 560, 90), pillar(380, 330, 40), pillar(1420, 330, 40)]),
    template('swamp', 'hollow', 'Conca', 'combat', 2300, 1450, [
      pillar(380, 380, 44), pillar(820, 620, 52), pillar(1250, 380, 60), pillar(1700, 700, 48), pillar(2000, 360, 40), pillar(560, 1050, 54), pillar(1700, 1120, 46),
    ]),
    template('swamp', 'bank', 'Argine', 'combat', 1700, 1300, [pillar(450, 500, 50), pillar(1250, 500, 50)]),
    template('swamp', 'narrows', 'Strettoia', 'combat', 2200, 1400, [pillar(480, 330, 46), pillar(1720, 330, 46), pillar(560, 1060, 46), pillar(1640, 1060, 46)], narrows(2200, 560, 260, 680)),
    template('swamp', 'banks', 'Argini', 'combat', 2000, 1300, [pillar(700, 640, 50), pillar(1300, 640, 50)], niches(2000, 236, [[380, 140], [760, 140]])),
    // Fase 5: una pozza nera tagliata da una passerella e due pozze contro i muri; un groviglio di radici.
    template('swamp', 'deep', 'Acque profonde', 'combat', 2208, 1376, [pillar(480, 300, 50), pillar(1728, 300, 50), pillar(560, 1020, 46), pillar(1650, 1020, 46)], undefined, {
      chasms: [solid(744, 480, 296, 384), solid(1168, 480, 296, 384), solid(WALL, 560, 320, 224), solid(2208 - WALL - 320, 560, 320, 224)],
      bridges: [{ x: 1040, y: 480, width: 128, height: 384, along: 'ns' }],
    }),
    template('swamp', 'tangle', 'Groviglio', 'combat', 2000, 1300, [pillar(1000, 540, 56)], undefined, {
      chasms: [solid(WALL, 860, 256, 192), solid(2000 - WALL - 256, 860, 256, 192)],
      covers: covers(128, 64, [[360, 380], [820, 300], [1180, 300], [1512, 380], [520, 700], [1352, 700], [936, 820]]),
    }),
    template('swamp', 'glade', 'Radura', 'calm', 1800, 1300, [pillar(420, 420, 40), pillar(1380, 420, 40), pillar(900, 300, 40)]),
  ],
  forge: [
    template('forge', 'foundry', 'Fonderia', 'combat', 2200, 1300, [
      pillar(550, 450, 44), pillar(1100, 450, 44), pillar(1650, 450, 44), pillar(820, 850, 44), pillar(1380, 850, 44),
    ]),
    template('forge', 'anvils', 'Sala delle incudini', 'combat', 1900, 1200, [pillar(620, 600, 52), pillar(1280, 600, 52)]),
    template('forge', 'channels', 'Canali di colata', 'combat', 2300, 1200, [
      pillar(460, 380, 36), pillar(460, 820, 36), pillar(1150, 600, 48), pillar(1840, 380, 36), pillar(1840, 820, 36),
    ]),
    template('forge', 'bellows', 'Mantici', 'combat', 2000, 1400, [pillar(500, 500, 40), pillar(1500, 500, 40), pillar(1000, 800, 56)]),
    template('forge', 'cinders', 'Cenere', 'combat', 1700, 1100, [pillar(450, 450, 40), pillar(1250, 450, 40)]),
    template('forge', 'crossroads', 'Crocevia delle colate', 'combat', 2200, 1300, [pillar(700, 650, 44), pillar(1500, 650, 44)], crossing(2200, 1300, 356, 336)),
    template('forge', 'storehouse', 'Magazzino', 'combat', 2000, 1300, [pillar(700, 420, 44), pillar(1300, 420, 44), pillar(1500, 900, 44)], [solid(WALL, 760, 736, 1300 - WALL - 760)]),
    // Fase 5: un fiume di lava con due ponti di ferro; un deposito di casse attorno a una pozza di lava.
    template('forge', 'lavariver', 'Fiume di lava', 'combat', 2240, 1344, [pillar(300, 300, 40), pillar(1120, 320, 48), pillar(1940, 300, 40), pillar(420, 960, 44), pillar(1820, 960, 44)], undefined,
      river(2240, 544, 128, 160, [560, 1680])),
    template('forge', 'depot', 'Deposito', 'combat', 2000, 1300, [pillar(700, 300, 44), pillar(1300, 300, 44)], undefined, {
      chasms: [solid(880, 640, 240, 160)],
      covers: covers(96, 48, [[296, 340], [1608, 340], [520, 620], [1384, 620], [296, 880], [1608, 880], [952, 420]]),
    }),
    template('forge', 'crucible', 'Sala del crogiolo', 'calm', 1800, 1300, [pillar(380, 360, 40), pillar(1420, 360, 40), pillar(380, 950, 40), pillar(1420, 950, 40)]),
  ],
  glacier: [
    template('glacier', 'hall', 'Sala di cristallo', 'combat', 2000, 1300, [
      pillar(500, 420, 40), pillar(1000, 380, 46), pillar(1500, 420, 40), pillar(700, 860, 36), pillar(1300, 860, 36),
    ]),
    template('glacier', 'crevasse', 'Crepaccio', 'combat', 2300, 1200, [pillar(700, 600, 50), pillar(1150, 420, 40), pillar(1600, 600, 50)]),
    template('glacier', 'circle', 'Cerchio di colonne', 'combat', 1900, 1400, ring(950, 650, 320, 6, 32)),
    template('glacier', 'drift', 'Cumuli', 'combat', 2200, 1400, [pillar(400, 400, 34), pillar(850, 700, 42), pillar(1350, 400, 34), pillar(1800, 750, 42), pillar(1500, 1050, 34)]),
    template('glacier', 'cave', 'Grotta azzurra', 'combat', 1700, 1150, [pillar(480, 400, 42), pillar(1220, 400, 42)]),
    template('glacier', 'gorge', 'Gola', 'combat', 2200, 1400, [pillar(500, 360, 40), pillar(1700, 360, 40), pillar(600, 1080, 36), pillar(1600, 1080, 36)], narrows(2200, 600, 240, 640)),
    template('glacier', 'seracs', 'Seracchi', 'combat', 2000, 1300, [pillar(650, 560, 40), pillar(1350, 560, 40), pillar(1000, 860, 46)], niches(2000, 216, [[300, 160], [700, 160]])),
    // Fase 5: due crepacci con i ponti di neve alle estremita' opposte; blocchi di ghiaccio attorno a una spaccatura.
    template('glacier', 'crevasses', 'Crepacci', 'combat', 2240, 1408, [pillar(700, 660, 36), pillar(1540, 660, 36), pillar(600, 1100, 36), pillar(1640, 1100, 36)], undefined, {
      chasms: [...river(2240, 800, 96, 160, [384]).chasms!, ...river(2240, 320, 96, 160, [1856]).chasms!],
      bridges: [...river(2240, 800, 96, 160, [384]).bridges!, ...river(2240, 320, 96, 160, [1856]).bridges!],
    }),
    template('glacier', 'blocks', 'Blocchi di ghiaccio', 'combat', 2000, 1300, [], undefined, {
      chasms: [solid(704, 672, 592, 96)],
      covers: covers(88, 52, [[330, 360], [1582, 360], [620, 520], [1292, 520], [956, 380], [330, 800], [1582, 800]]),
    }),
    template('glacier', 'throne', 'Aula del maestro', 'calm', 1800, 1300, [pillar(420, 380, 36), pillar(1380, 380, 36), pillar(420, 920, 36), pillar(1380, 920, 36)]),
  ],
};

/** Una stanza modello per id. */
export function roomTemplateById(id: string): RoomTemplate | undefined {
  for (const list of Object.values(ROOM_TEMPLATES)) {
    const found = list.find((room) => room.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** La mappa giocabile di una stanza: stesse regole delle arene dei boss, con il tema del dungeon. */
export function roomArena(room: RoomTemplate, theme: ArenaThemeId): ArenaDefinition {
  return {
    id: room.id,
    name: room.name,
    theme,
    width: room.width,
    height: room.height,
    wallThickness: ROOM_LAYOUT.wallThickness,
    playerSpawn: new Vec2(Math.round(room.width / 2), room.height - ROOM_LAYOUT.entranceInset),
    bossSpawn: new Vec2(Math.round(room.width / 2), Math.round(room.height * 0.36)),
    playerMargin: ROOM_LAYOUT.playerMargin,
    bossMargin: ROOM_LAYOUT.bossMargin,
    projectileMargin: ROOM_LAYOUT.projectileMargin,
    pillars: room.pillars,
    ...(room.solids === undefined ? {} : { solids: room.solids }),
    ...(room.chasms === undefined ? {} : { chasms: room.chasms }),
    ...(room.bridges === undefined ? {} : { bridges: room.bridges }),
    ...(room.covers === undefined ? {} : { covers: room.covers }),
  };
}

/** Le porte d'uscita: `count` soglie distribuite sul muro in alto. */
export function roomDoors(room: { readonly width: number }, count: number): RoomDoor[] {
  const y = ROOM_LAYOUT.wallThickness + ROOM_LAYOUT.doorDepth / 2;
  return Array.from({ length: count }, (_, index) => ({
    index,
    position: new Vec2(Math.round((room.width * (index + 1)) / (count + 1)), y),
    halfWidth: ROOM_LAYOUT.doorHalfWidth,
    depth: ROOM_LAYOUT.doorDepth,
  }));
}

/** Vero se il punto sta sulla soglia della porta. */
export function onDoor(door: RoomDoor, point: Vec2): boolean {
  return Math.abs(point.x - door.position.x) <= door.halfWidth && Math.abs(point.y - door.position.y) <= door.depth / 2 + ROOM_LAYOUT.playerMargin;
}

/** Vero se il punto e' nel rettangolo o a meno di `extra` da esso. */
function touchesRect(rect: Solid, point: Vec2, extra: number): boolean {
  const nearest = new Vec2(Math.min(Math.max(point.x, rect.x), rect.x + rect.width), Math.min(Math.max(point.y, rect.y), rect.y + rect.height));
  return nearest.distanceTo(point) < extra;
}

/**
 * Punti di comparsa dei servitori: una griglia sulla stanza, lontano dall'ingresso, dai pilastri e dalle porte. Il
 * regista poi sceglie quelli lontani dai giocatori.
 */
export function spawnPoints(room: RoomTemplate): Vec2[] {
  const layout = ROOM_LAYOUT;
  const arena = roomArena(room, 'crypt');
  const doors = roomDoors(room, 3);
  const points: Vec2[] = [];
  for (let y = layout.spawnInset; y <= room.height - layout.spawnInset; y += layout.spawnStep) {
    for (let x = layout.spawnInset; x <= room.width - layout.spawnInset; x += layout.spawnStep) {
      const point = new Vec2(x, y);
      if (point.distanceTo(arena.playerSpawn) < layout.spawnFromEntrance) continue;
      if (room.pillars.some((p) => point.distanceTo(p.position) < p.radius + layout.spawnFromPillar)) continue;
      if (solidAt(arena, point, layout.spawnFromPillar) !== undefined || chasmAt(arena, point, layout.spawnFromPillar) !== undefined) continue;
      if ((room.covers ?? []).some((cover) => touchesRect(cover, point, layout.spawnFromPillar))) continue;
      if (doors.some((door) => point.distanceTo(door.position) < layout.spawnFromDoors)) continue;
      points.push(point);
    }
  }
  return points;
}
