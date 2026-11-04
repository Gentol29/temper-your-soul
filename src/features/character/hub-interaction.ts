import { Vec2, clamp } from '../../core/vec2';
import type { HubStation } from './hub-map';

/** Il fronte di un edificio esteso si raggiunge da più lati, senza cambiare la sua collisione. */
export function hubInteractionPoint(station: HubStation, position: Vec2): Vec2 {
  if (!('interactionEdge' in station)) return new Vec2(station.x, station.y);
  const from = new Vec2(...station.interactionEdge[0]), to = new Vec2(...station.interactionEdge[1]);
  const edge = to.sub(from), offset = position.sub(from), length = edge.lengthSquared();
  const along = length === 0 ? 0 : clamp((offset.x * edge.x + offset.y * edge.y) / length, 0, 1);
  return from.add(edge.mul(along));
}

export function hubInteractionDistance(station: HubStation, position: Vec2): number {
  return position.distanceTo(hubInteractionPoint(station, position));
}
