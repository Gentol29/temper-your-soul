export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  /** Velocità di inseguimento in secondi inversi. */
  smoothSpeed: number;
  /** Scostamento massimo dal giocatore, in unità del mondo. */
  maxOffset: number;
}

export interface Entity {
  readonly x: number;
  readonly y: number;
}

export interface Mouse {
  readonly worldX: number;
  readonly worldY: number;
}

/** Prima taratura provvisoria, regolabile dopo la prova giocata. */
export const CAMERA_TRACKING = { smoothSpeed: 8, maxOffset: 100 } as const;

/** Aggiorna il centro della telecamera; dt è espresso in secondi. */
export function updateCamera(camera: Camera, player: Entity, mouse: Mouse, dt: number): void {
  // Vettore dal giocatore al cursore e sua lunghezza nello spazio del mondo.
  const dirX = mouse.worldX - player.x;
  const dirY = mouse.worldY - player.y;
  const distance = Math.sqrt(dirX * dirX + dirY * dirY);
  const maxOffset = Math.max(0, camera.maxOffset);
  let offsetX = 0;
  let offsetY = 0;

  if (distance > 0) {
    if (distance > maxOffset) {
      // Il vettore unitario conserva la direzione; la lunghezza viene limitata.
      offsetX = (dirX / distance) * maxOffset;
      offsetY = (dirY / distance) * maxOffset;
    } else {
      offsetX = dirX;
      offsetY = dirY;
    }
  }

  camera.targetX = player.x + offsetX;
  camera.targetY = player.y + offsetY;

  // Lerp esponenziale: stesso smorzamento a parità di tempo con target costante,
  // indipendentemente dai fotogrammi, senza superare il bersaglio dopo un dt lungo.
  const weight = 1 - Math.exp(-Math.max(0, camera.smoothSpeed) * Math.max(0, dt));
  camera.x += (camera.targetX - camera.x) * weight;
  camera.y += (camera.targetY - camera.y) * weight;
}
