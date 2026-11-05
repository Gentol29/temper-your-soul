import { Vec2 } from './vec2';
import { CAMERA_TRACKING, updateCamera, type Camera as CameraState } from './camera-offset';
import { TOP_DOWN, worldBoundsOfView, type AxisRect, type ViewProjection } from './view-projection';

/** Ingrandimento della vista: il canvas ha risoluzione interna pari alla finestra divisa per questo valore. */
export const ZOOM = 1.5;

/**
 * Camera con inseguimento smorzato e offset verso il mouse, senza limiti ai bordi. La vista è misurata in pixel interni del
 * canvas (che il CSS poi ingrandisce con `image-rendering: pixelated`). Con la vista dall'alto (`projection` = `TOP_DOWN`, il
 * solito) i pixel della vista sono unità di mondo e `position`, `width`, `height`, `x`, `y` sono anche coordinate del mondo;
 * con un'altra proiezione (l'isometria) sono coordinate della vista e il mondo si raggiunge con `pointerToWorld`,
 * `worldBounds` e `projection`.
 */
export class Camera implements CameraState {
  width = 960;
  height = 540;
  /** Angolo alto a sinistra, nella vista. */
  position: Vec2 = Vec2.ZERO;
  targetX = this.width / 2;
  targetY = this.height / 2;
  smoothSpeed: number = CAMERA_TRACKING.smoothSpeed;
  maxOffset: number = CAMERA_TRACKING.maxOffset;
  /** Scostamento di disegno per la scossa dello schermo (non influisce sulla mira). */
  shakeOffset: Vec2 = Vec2.ZERO;
  /** Come il mondo diventa la vista. Solo rappresentazione: la simulazione resta dall'alto. */
  projection: ViewProjection = TOP_DOWN;

  /** Centro della vista: la rappresentazione continua a usare l'angolo `position`. */
  get x(): number { return this.position.x + this.width / 2; }
  set x(value: number) { this.position = new Vec2(value - this.width / 2, this.position.y); }
  get y(): number { return this.position.y + this.height / 2; }
  set y(value: number) { this.position = new Vec2(this.position.x, value - this.height / 2); }

  /**
   * Cambia la proiezione tenendo fermo il punto del mondo al centro della vista (e quello inseguito): il passaggio fra una
   * stanza dall'alto e una isometrica non fa saltare la camera di un fotogramma. Nessun effetto se la proiezione e' la stessa.
   */
  setProjection(projection: ViewProjection): void {
    if (projection === this.projection) return;
    const center = this.projection.toWorld(this.x, this.y);
    const target = this.projection.toWorld(this.targetX, this.targetY);
    this.projection = projection;
    const view = projection.toView(center.x, center.y);
    this.x = view.x;
    this.y = view.y;
    const aim = projection.toView(target.x, target.y);
    this.targetX = aim.x;
    this.targetY = aim.y;
  }

  setViewSize(width: number, height: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
  }

  /** Centratura immediata all'ingresso in una stanza o al ridimensionamento. `target` e' un punto del mondo. */
  follow(target: Vec2): void {
    const view = this.projection.toView(target.x, target.y);
    this.position = new Vec2(view.x - this.width / 2, view.y - this.height / 2);
    this.targetX = view.x;
    this.targetY = view.y;
  }

  /** Inseguimento visuale a ogni fotogramma, separato dal passo fisso della simulazione. `player` e' un punto del mondo. */
  update(player: Vec2, pointer: Vec2, dt: number): void {
    // Per l'offset visivo convertiamo rispetto a una vista centrata sul giocatore.
    // Usare la camera già traslata farebbe accumulare il suo stesso spostamento:
    // il centro non seguirebbe il giocatore e un cursore fermo provocherebbe deriva.
    // La mira dei colpi usa invece pointerToWorld sulla vista effettiva. Tutto nella vista: dall'alto coincide col mondo.
    const center = this.projection.toView(player.x, player.y);
    const mouse = center.add(this.pointerToView(pointer).sub(new Vec2(this.x, this.y)));
    updateCamera(this, center, { worldX: mouse.x, worldY: mouse.y }, dt);
  }

  /** Da posizione normalizzata sul canvas (0..1) a coordinate della vista. */
  pointerToView(pointer: Vec2): Vec2 {
    return new Vec2(this.position.x + pointer.x * this.width, this.position.y + pointer.y * this.height);
  }

  /** Da posizione normalizzata sul canvas (0..1) al punto del pavimento del mondo sotto il cursore. */
  pointerToWorld(pointer: Vec2): Vec2 {
    const view = this.pointerToView(pointer);
    return this.projection.toWorld(view.x, view.y);
  }

  /** Scostamento dal giocatore (o, senza origine esplicita, dal centro della vista), in unità di mondo. */
  pointerOffset(pointer: Vec2, origin = this.projection.toWorld(this.x, this.y)): Vec2 {
    return this.pointerToWorld(pointer).sub(origin);
  }

  /** Vero se un cerchio con centro `point` (nel mondo) e raggio `margin` tocca la vista. */
  isVisible(point: Vec2, margin = 0): boolean {
    const view = this.projection.toView(point.x, point.y);
    // Un cerchio del mondo si allarga al massimo di `spread` nella vista (1 dall'alto).
    const pad = margin * this.projection.spread;
    return (
      view.x > this.position.x - pad &&
      view.x < this.position.x + this.width + pad &&
      view.y > this.position.y - pad &&
      view.y < this.position.y + this.height + pad
    );
  }

  /** Il rettangolo del mondo che contiene la vista, allargato di `pad` unità: per limitare il disegno alla parte visibile. */
  worldBounds(pad = 0): AxisRect {
    const bounds = worldBoundsOfView(this.projection, this.position.x, this.position.y, this.width, this.height);
    return { x0: bounds.x0 - pad, y0: bounds.y0 - pad, x1: bounds.x1 + pad, y1: bounds.y1 + pad };
  }
}
