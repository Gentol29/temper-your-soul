import { Vec2 } from '../../core/vec2';
import { circleInsidePolygon, circleTouchesPolygon } from '../../core/polygon';

export interface HubFootprint { readonly id: string; readonly outline: readonly Vec2[] }
const polygon = (points: readonly (readonly [number, number])[]): readonly Vec2[] => points.map(([x, y]) => new Vec2(x, y));

/** La posizione è l'appoggio dei piedi, condiviso da collisioni, ombra e profondità. */
export const HUB_MAP = { width: 1024, height: 576, playerRadius: 9, speed: 148, interactionRadius: 62 } as const;
export const HUB_SPAWN = new Vec2(512, 332);
export const HUB_STATIONS = [
  { id: 'portal', name: 'Portale dei raid', x: 515, y: 247, width: 48, height: 14, approach: [512, 282] },
  { id: 'storage', name: 'Deposito', x: 308, y: 284, width: 56, height: 16, approach: [330, 286] },
  { id: 'forge', name: 'Forgia', x: 735, y: 305, width: 46, height: 18, approach: [722, 356], interactionEdge: [[652, 300], [758, 345]] },
  { id: 'merchant', name: 'Mercante', x: 352, y: 397, width: 60, height: 18, approach: [390, 410] },
] as const;
export type HubStation = typeof HUB_STATIONS[number];

/** Bordo interno del selciato: niente basamenti delle mura, facciate esterne o terreno oltre la piazza. */
export const HUB_COURTYARD = polygon([
  [224, 278], [259, 266], [286, 254], [355, 248], [389, 248], [421, 257], [464, 267], [511, 271],
  [559, 267], [605, 248], [627, 257], [641, 277], [650, 300], [679, 322], [716, 337], [758, 345],
  [775, 340], [769, 350], [743, 369], [716, 388], [680, 402], [642, 414], [604, 422], [579, 431],
  [556, 440], [550, 465], [548, 492], [545, 552], [480, 552], [476, 492], [465, 463], [435, 448],
  [407, 445], [382, 433], [369, 423], [340, 444], [302, 455], [269, 441], [247, 411], [232, 386],
  [218, 352], [219, 313],
]);

/** Sagome visibili dei corpi degli edifici; il giocatore non entra sotto tetti, banchi o portanti. */
export const HUB_BUILDINGS: readonly HubFootprint[] = [
  { id: 'cathedral', outline: polygon([[378, 93], [642, 93], [638, 227], [610, 248], [578, 260], [541, 265], [484, 265], [447, 258], [414, 251], [388, 236]]) },
  { id: 'storage', outline: polygon([[220, 170], [239, 132], [274, 117], [312, 148], [357, 163], [381, 195], [382, 234], [375, 259], [345, 270], [307, 269], [282, 271], [266, 284], [242, 286], [225, 273]]) },
  { id: 'forge', outline: polygon([[634, 210], [657, 178], [701, 161], [749, 178], [802, 190], [828, 218], [831, 271], [815, 297], [794, 323], [767, 333], [724, 321], [687, 305], [652, 287], [635, 267]]) },
  { id: 'merchant', outline: polygon([[229, 317], [250, 297], [272, 301], [292, 307], [325, 304], [351, 307], [375, 323], [387, 344], [377, 363], [374, 396], [355, 424], [324, 434], [281, 435], [251, 422], [234, 402], [228, 371]]) },
  { id: 'gate_west', outline: polygon([[417, 417], [438, 424], [464, 445], [478, 480], [474, 516], [450, 523], [425, 514], [418, 473]]) },
  { id: 'gate_east', outline: polygon([[554, 443], [573, 423], [597, 412], [615, 433], [611, 483], [596, 510], [563, 518], [550, 486]]) },
];
export const HUB_OBSTACLES = HUB_BUILDINGS;

export function hubBlocked(position: Vec2): boolean {
  return !circleInsidePolygon(position, HUB_MAP.playerRadius, HUB_COURTYARD)
    || HUB_OBSTACLES.some(o => circleTouchesPolygon(position, HUB_MAP.playerRadius, o.outline));
}

/** Accessi verificati sul selciato, anche quando il banco si usa dal lato e non dal basso dello sprite. */
export function hubApproachPoint(id: HubStation['id']): Vec2 {
  const station = HUB_STATIONS.find(s => s.id === id)!;
  return new Vec2(...station.approach);
}

/** Le visite non possono far nascere un giocatore nel bordo della mappa o dentro una struttura. */
export function hubSpawnPoint(index: number): Vec2 {
  const candidates = [0, 1, 2, -1].flatMap(row => [0, 1, -1, 2, -2, 3].map(column => HUB_SPAWN.add(new Vec2(column * 30, row * 30)))).filter(p => !hubBlocked(p));
  return candidates[Math.max(0, index) % candidates.length] ?? HUB_SPAWN;
}
