import { clamp, Vec2 } from '../../core/vec2';

/*
 * L'HUB giocabile come piazza in isometria: un cortile rettangolare del mondo (visto come rombo), murato sui due lati di
 * fondo, con quattro edifici appoggiati ai muri e il loro fronte sul selciato. Dati di gioco condivisi da client e server:
 * collisioni e stazioni sono rettangoli del mondo; il disegno (hub-iso-renderer.ts) li segue. Il menu tiene l'illustrazione
 * frontale e la sua geometria (hub-map.ts). Misure provvisorie, regolabili.
 */

/** Un edificio: il suo ingombro nel mondo (angolo e misure). */
export interface HubIsoBuilding {
  readonly id: 'portal' | 'storage' | 'forge' | 'merchant';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** La piazza: misure, muro, distanza minima dei piedi dal muro, raggio del corpo, velocita', raggio d'interazione. */
export const HUB_ISO_MAP = { width: 640, height: 560, wall: 24, margin: 40, playerRadius: 9, speed: 148, interactionRadius: 62 } as const;

export const HUB_ISO_BUILDINGS: readonly HubIsoBuilding[] = [
  { id: 'portal', x: 290, y: 24, width: 50, height: 36 },
  { id: 'forge', x: 470, y: 24, width: 56, height: 44 },
  { id: 'storage', x: 24, y: 190, width: 64, height: 80 },
  { id: 'merchant', x: 24, y: 380, width: 44, height: 50 },
];

/** Dove si nasce: al centro della piazza. */
export const HUB_ISO_SPAWN = new Vec2(320, 300);

/** Le stazioni davanti agli edifici: punto d'interazione (centro del fronte) e punto d'accesso sul selciato. */
export const HUB_ISO_STATIONS = [
  station('portal', 'Portale dei raid'),
  station('storage', 'Deposito'),
  station('forge', 'Forgia'),
  station('merchant', 'Mercante'),
] as const;

function station<Id extends HubIsoBuilding['id']>(id: Id, name: string): { readonly id: Id; readonly name: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly approach: readonly [number, number] } {
  const b = HUB_ISO_BUILDINGS.find((building) => building.id === id)!;
  // Gli edifici sui muri in alto si usano dal lato sud (y piu' grande); quelli sul muro a sinistra dal lato est.
  const onTopWall = b.y <= HUB_ISO_MAP.wall;
  const x = onTopWall ? b.x + b.width / 2 : b.x + b.width;
  const y = onTopWall ? b.y + b.height : b.y + b.height / 2;
  const approach: readonly [number, number] = onTopWall ? [x, y + 34] : [x + 34, y];
  return { id, name, x, y, width: onTopWall ? b.width : 16, height: onTopWall ? 16 : b.height, approach };
}

/** Vero se un corpo di raggio `radius` in `position` esce dalla piazza o tocca un edificio. */
export function hubIsoBlocked(position: Vec2, radius: number = HUB_ISO_MAP.playerRadius): boolean {
  const { width, height, margin } = HUB_ISO_MAP;
  if (position.x < margin || position.y < margin || position.x > width - margin || position.y > height - margin) return true;
  return HUB_ISO_BUILDINGS.some((b) => {
    const nearest = new Vec2(clamp(position.x, b.x, b.x + b.width), clamp(position.y, b.y, b.y + b.height));
    return nearest.distanceTo(position) < radius;
  });
}
