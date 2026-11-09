import { describe, expect, it } from 'vitest';
import { Camera } from './camera';
import { updateCamera, type Camera as CameraState } from './camera-offset';
import { Vec2 } from './vec2';

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
      expect(aim.x - camera.pixelOrigin.x).toBeCloseTo(pointer.x * camera.width);
      expect(aim.y - camera.pixelOrigin.y).toBeCloseTo(pointer.y * camera.height);
      expect(aim.x).toBeGreaterThan(player.x + camera.pointerOffset(pointer).x);
    }
  });
});
