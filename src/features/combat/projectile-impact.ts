import type { Vec2 } from '../../core/vec2';

/** Primo ingresso nel cerchio lungo il tratto percorso nel passo. Null se non entra; il bordo da solo non colpisce. */
export function projectileImpactFraction(from: Vec2, to: Vec2, center: Vec2, radius: number): number | null {
  const offset = from.sub(center), delta = to.sub(from);
  const c = offset.lengthSquared() - radius * radius;
  if (c < 0) return 0;
  const a = delta.lengthSquared();
  if (a === 0) return null;
  const b = offset.x * delta.x + offset.y * delta.y;
  const discriminant = b * b - a * c;
  if (discriminant <= 0) return null;
  const entry = (-b - Math.sqrt(discriminant)) / a;
  const exit = (-b + Math.sqrt(discriminant)) / a;
  return entry < 1 && exit > 0 ? Math.max(0, entry) : null;
}
