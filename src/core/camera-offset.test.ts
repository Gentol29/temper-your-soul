import { describe, expect, it } from 'vitest';
import { Camera } from './camera';
import { updateCamera, type Camera as CameraState } from './camera-offset';
import { Vec2 } from './vec2';
import { ISOMETRIC } from './view-projection';

function trackingCamera(): CameraState {
  return { x: 20, y: 30, targetX: 20, targetY: 30, smoothSpeed: 8, maxOffset: 100 };
}

describe('updateCamera', () => {
  it('conserva la distanza effettiva sotto il limite e gestisce il cursore sul giocatore', () => {
    const camera = trackingCamera();
    updateCamera(camera, { x: 20, y: 30 }, { worldX: 50, worldY: -10 }, 1 / 60);
    expect([camera.targetX, camera.targetY]).toEqual([50, -10]);

    updateCamera(camera, { x: 20, y: 30 }, { worldX: 20, worldY: 30 }, 1 / 60);
    expect([camera.targetX, camera.targetY]).toEqual([20, 30]);
    expect(Number.isFinite(camera.x) && Number.isFinite(camera.y)).toBe(true);
  });

  it('limita la lunghezza del vettore diagonale senza cambiarne la direzione', () => {
    const camera = trackingCamera();
    updateCamera(camera, { x: 20, y: 30 }, { worldX: -280, worldY: 430 }, 1 / 60);
    expect([camera.targetX, camera.targetY]).toEqual([-40, 110]);
    expect(Math.hypot(camera.targetX - 20, camera.targetY - 30)).toBe(100);
  });

  it('include esattamente il bordo del limite e consente di azzerare l’offset', () => {
    const camera = trackingCamera();
    updateCamera(camera, { x: 20, y: 30 }, { worldX: 80, worldY: 110 }, 1 / 60);
    expect([camera.targetX, camera.targetY]).toEqual([80, 110]);
    camera.maxOffset = 0;
    updateCamera(camera, { x: 20, y: 30 }, { worldX: 80, worldY: 110 }, 1 / 60);
    expect([camera.targetX, camera.targetY]).toEqual([20, 30]);
  });

  it('produce lo stesso smorzamento a 30, 60 e 144 Hz per un target costante', () => {
    const cameras = [30, 60, 144].map((fps) => {
      const camera = trackingCamera();
      for (let i = 0; i < fps; i++) {
        updateCamera(camera, { x: 20, y: 30 }, { worldX: 320, worldY: 430 }, 1 / fps);
      }
      return camera;
    });
    const expectedX = 20 + 60 * (1 - Math.exp(-8));
    const expectedY = 30 + 80 * (1 - Math.exp(-8));
    for (const camera of cameras) {
      expect(camera.x).toBeCloseTo(expectedX, 10);
      expect(camera.y).toBeCloseTo(expectedY, 10);
    }
  });

  it('si avvicina senza scatti e non supera il target dopo un intervallo lungo', () => {
    const camera = trackingCamera();
    updateCamera(camera, { x: 20, y: 30 }, { worldX: 320, worldY: 430 }, 1 / 60);
    expect(camera.x).toBeGreaterThan(20);
    expect(camera.x).toBeLessThan(80);
    expect(camera.y).toBeGreaterThan(30);
    expect(camera.y).toBeLessThan(110);
    updateCamera(camera, { x: 20, y: 30 }, { worldX: 320, worldY: 430 }, 10);
    expect(camera.x).toBeCloseTo(80);
    expect(camera.y).toBeCloseTo(110);
  });

  it('con dt nullo o negativo aggiorna il target senza muovere la vista; velocità zero ferma il Lerp', () => {
    const camera = trackingCamera();
    for (const dt of [0, -1]) {
      updateCamera(camera, { x: 20, y: 30 }, { worldX: 320, worldY: 430 }, dt);
      expect([camera.x, camera.y, camera.targetX, camera.targetY]).toEqual([20, 30, 80, 110]);
    }
    camera.smoothSpeed = 0;
    updateCamera(camera, { x: 20, y: 30 }, { worldX: 320, worldY: 430 }, 1);
    expect([camera.x, camera.y]).toEqual([20, 30]);
  });
});

describe('Camera con offset del mouse', () => {
  it('segue un giocatore in movimento anche con il cursore fermo al centro', () => {
    const camera = new Camera();
    camera.follow(new Vec2(500, 300));
    const player = new Vec2(540, 320);
    for (let i = 0; i < 120; i++) camera.update(player, new Vec2(0.5, 0.5), 1 / 60);
    expect([camera.targetX, camera.targetY]).toEqual([540, 320]);
    expect(camera.x).toBeCloseTo(540, 4);
    expect(camera.y).toBeCloseTo(320, 4);
  });

  it('un cursore fermo vicino al centro non accumula offset dalla traslazione precedente', () => {
    const camera = new Camera();
    camera.setViewSize(800, 400);
    const player = new Vec2(500, 300);
    camera.follow(player);
    for (let i = 0; i < 120; i++) camera.update(player, new Vec2(0.55, 0.55), 1 / 60);
    expect(camera.targetX).toBeCloseTo(540);
    expect(camera.targetY).toBeCloseTo(320);
    expect(camera.x).toBeCloseTo(540, 4);
    expect(camera.y).toBeCloseTo(320, 4);
  });

  it('torna al giocatore quando il cursore rientra al centro e si riallinea entrando in una stanza', () => {
    const camera = new Camera();
    const player = new Vec2(500, 300);
    camera.follow(player);
    camera.update(player, new Vec2(1, 0), 1);
    expect(camera.x).toBeGreaterThan(player.x);
    expect(camera.y).toBeLessThan(player.y);
    for (let i = 0; i < 120; i++) camera.update(player, new Vec2(0.5, 0.5), 1 / 60);
    expect(camera.x).toBeCloseTo(player.x, 4);
    expect(camera.y).toBeCloseTo(player.y, 4);
    camera.follow(new Vec2(2000, 1500));
    expect([camera.x, camera.y, camera.targetX, camera.targetY]).toEqual([2000, 1500, 2000, 1500]);
  });

  it('in isometria centra il giocatore proiettato e mira al punto del pavimento sotto il cursore', () => {
    const camera = new Camera();
    camera.projection = ISOMETRIC;
    camera.setViewSize(800, 400);
    const player = new Vec2(500, 300);
    camera.follow(player);
    expect([camera.x, camera.y]).toEqual([200, 400]);
    // Il centro del canvas e' il giocatore; un punto a destra sullo schermo e' a nord-est nel mondo.
    const center = camera.pointerToWorld(new Vec2(0.5, 0.5));
    expect(center.x).toBeCloseTo(500, 9);
    expect(center.y).toBeCloseTo(300, 9);
    const right = camera.pointerToWorld(new Vec2(0.75, 0.5)).sub(player);
    expect(right.x).toBeCloseTo(100, 9);
    expect(right.y).toBeCloseTo(-100, 9);
    // Inseguimento con il cursore fermo al centro: la vista resta sul giocatore proiettato, senza deriva.
    const moved = new Vec2(540, 320);
    for (let i = 0; i < 240; i++) camera.update(moved, new Vec2(0.5, 0.5), 1 / 60);
    const view = ISOMETRIC.toView(moved.x, moved.y);
    expect(camera.x).toBeCloseTo(view.x, 4);
    expect(camera.y).toBeCloseTo(view.y, 4);
    expect(camera.isVisible(moved)).toBe(true);
    expect(camera.isVisible(new Vec2(moved.x + 600, moved.y - 600))).toBe(false);
    // Il rettangolo del mondo della vista contiene i punti agli angoli del canvas.
    const bounds = camera.worldBounds();
    for (const corner of [new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1), new Vec2(1, 1)]) {
      const world = camera.pointerToWorld(corner);
      expect(world.x).toBeGreaterThanOrEqual(bounds.x0 - 1e-9);
      expect(world.x).toBeLessThanOrEqual(bounds.x1 + 1e-9);
      expect(world.y).toBeGreaterThanOrEqual(bounds.y0 - 1e-9);
      expect(world.y).toBeLessThanOrEqual(bounds.y1 + 1e-9);
    }
  });

  it('cambiando proiezione resta fermo il punto del mondo al centro e quello inseguito', () => {
    const camera = new Camera();
    camera.setViewSize(640, 360);
    const player = new Vec2(900, 700);
    camera.follow(player);
    camera.update(player, new Vec2(0.8, 0.3), 1 / 60);
    const before = camera.projection.toWorld(camera.x, camera.y);
    const target = camera.projection.toWorld(camera.targetX, camera.targetY);
    camera.setProjection(ISOMETRIC);
    const after = ISOMETRIC.toWorld(camera.x, camera.y);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    const followed = ISOMETRIC.toWorld(camera.targetX, camera.targetY);
    expect(followed.x).toBeCloseTo(target.x, 9);
    expect(followed.y).toBeCloseTo(target.y, 9);
    // Stessa proiezione: nessun cambiamento.
    const x = camera.x;
    camera.setProjection(ISOMETRIC);
    expect(camera.x).toBe(x);
  });

  it('dall alto il rettangolo del mondo coincide con la vista', () => {
    const camera = new Camera();
    camera.setViewSize(320, 180);
    camera.follow(new Vec2(1000, 500));
    expect(camera.worldBounds()).toEqual({ x0: 840, y0: 410, x1: 1160, y1: 590 });
    expect(camera.worldBounds(16)).toEqual({ x0: 824, y0: 394, x1: 1176, y1: 606 });
  });

  it('ricava la mira dalla vista decentrata, anche dopo un resize, senza includere la scossa', () => {
    const camera = new Camera();
    const player = new Vec2(500, 300);
    const pointer = new Vec2(0.75, 0.25);
    for (const [width, height] of [[800, 400], [300, 200]]) {
      camera.setViewSize(width, height);
      camera.follow(player);
      camera.update(player, pointer, 1);
      camera.shakeOffset = new Vec2(12, -9);
      const aim = player.add(camera.pointerOffset(pointer, player));
      expect(aim).toEqual(camera.pointerToWorld(pointer));
      expect(aim.x - camera.position.x).toBeCloseTo(pointer.x * camera.width);
      expect(aim.y - camera.position.y).toBeCloseTo(pointer.y * camera.height);
      expect(aim.x).toBeGreaterThan(player.x + camera.pointerOffset(pointer).x);
    }
  });
});
