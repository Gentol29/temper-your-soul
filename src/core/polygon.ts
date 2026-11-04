import { Vec2 } from './vec2';

export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!, b = polygon[i]!;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function touchesEdge(point: Vec2, radius: number, polygon: readonly Vec2[]): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!, b = polygon[i]!, dx = b.x - a.x, dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
    const x = point.x - a.x - dx * t, y = point.y - a.y - dy * t;
    if (x * x + y * y < radius * radius) return true;
  }
  return false;
}

/** Anche l'appoggio attorno al centro deve rimanere sul pavimento. */
export function circleInsidePolygon(point: Vec2, radius: number, polygon: readonly Vec2[]): boolean {
  return pointInPolygon(point, polygon) && !touchesEdge(point, radius, polygon);
}

export function circleTouchesPolygon(point: Vec2, radius: number, polygon: readonly Vec2[]): boolean {
  return pointInPolygon(point, polygon) || touchesEdge(point, radius, polygon);
}
