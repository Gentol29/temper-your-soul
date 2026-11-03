import { Vec2 } from './vec2';
import { CAMERA_TRACKING, updateCamera, type Camera as CameraState } from './camera-offset';

/** Ingrandimento della vista: il canvas ha risoluzione interna pari alla finestra divisa per questo valore. */
export const ZOOM = 1.5;

/**
 * Camera con inseguimento smorzato e offset verso il mouse, senza limiti ai bordi. La vista è misurata in unità di mondo, cioè in pixel
 * interni del canvas (che il CSS poi ingrandisce con `image-rendering: pixelated`).
 */
export class Camera implements CameraState {
  width = 960;
  height = 540;
  /** Angolo alto a sinistra della vista nel mondo. */
  position: Vec2 = Vec2.ZERO;
  targetX = this.width / 2;
  targetY = this.height / 2;
  smoothSpeed: number = CAMERA_TRACKING.smoothSpeed;
  maxOffset: number = CAMERA_TRACKING.maxOffset;
  /** Scostamento di disegno per la scossa dello schermo (non influisce sulla mira). */
  shakeOffset: Vec2 = Vec2.ZERO;

  /** Centro della vista: la rappresentazione continua a usare l'angolo `position`. */
  get x(): number { return this.position.x + this.width / 2; }
  set x(value: number) { this.position = new Vec2(value - this.width / 2, this.position.y); }
  get y(): number { return this.position.y + this.height / 2; }
  set y(value: number) { this.position = new Vec2(this.position.x, value - this.height / 2); }

  setViewSize(width: number, height: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
  }

  /** Centratura immediata all'ingresso in una stanza o al ridimensionamento. */
  follow(target: Vec2): void {
    this.position = new Vec2(target.x - this.width / 2, target.y - this.height / 2);
    this.targetX = target.x;
    this.targetY = target.y;
  }

  /** Inseguimento visuale a ogni fotogramma, separato dal passo fisso della simulazione. */
  update(player: Vec2, pointer: Vec2, dt: number): void {
    // Per l'offset visivo convertiamo rispetto a una vista centrata sul giocatore.
    // Usare la camera già traslata farebbe accumulare il suo stesso spostamento:
    // il centro non seguirebbe il giocatore e un cursore fermo provocherebbe deriva.
    // La mira dei colpi usa invece pointerToWorld sulla vista effettiva.
    const mouse = player.add(this.pointerOffset(pointer));
    updateCamera(this, player, { worldX: mouse.x, worldY: mouse.y }, dt);
  }

  /** Da posizione normalizzata sul canvas (0..1) a coordinate del mondo. */
  pointerToWorld(pointer: Vec2): Vec2 {
    return new Vec2(this.position.x + pointer.x * this.width, this.position.y + pointer.y * this.height);
  }

  /** Scostamento dal giocatore (o, senza origine esplicita, dal centro della vista), in unità di mondo. */
  pointerOffset(pointer: Vec2, origin = new Vec2(this.x, this.y)): Vec2 {
    return this.pointerToWorld(pointer).sub(origin);
  }

  /** Vero se un cerchio con centro `point` e raggio `margin` tocca la vista. */
  isVisible(point: Vec2, margin = 0): boolean {
    return (
      point.x > this.position.x - margin &&
      point.x < this.position.x + this.width + margin &&
      point.y > this.position.y - margin &&
      point.y < this.position.y + this.height + margin
    );
  }
}
