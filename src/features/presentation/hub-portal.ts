import { PixelPainter } from './pixel-painter';
import { HUB_COLORS as C } from './hub-palette';

/** Misure solo grafiche: impronta e interazione del portale restano quelle di HUB_STATIONS. */
export const HUB_PORTAL = { width: 128, height: 156, anchorX: 64, anchorY: 132, frames: 32, fps: 16 } as const;
export interface PortalPixels { readonly width: number; readonly height: number; readonly pixels: readonly (readonly string[])[] }
const TAU = Math.PI * 2;
const hash = (x: number, y: number): number => {
  let n = Math.imul(x + 137, 374761393) ^ Math.imul(y + 79, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177); return (n ^ n >>> 16) >>> 0;
};
function painter(): PixelPainter { return new PixelPainter(HUB_PORTAL.width, HUB_PORTAL.height, 1, HUB_PORTAL.anchorX, HUB_PORTAL.anchorY); }

function arch(p: PixelPainter, color: string, top: number, half: number, cap: number, bottom: number): void {
  for (let y = top; y <= bottom; y++) {
    const w = y < top + cap ? Math.max(1, Math.round(half * Math.pow((y - top + 1) / cap, 0.62))) : half;
    p.rect(-w, y, w * 2 + 1, 1, color);
  }
}

export function portalMouthHalfWidth(y: number): number {
  if (y < -102 || y > 0) return -1;
  return y < -66 ? Math.max(1, Math.round(29 * Math.pow((y + 103) / 36, 0.62))) : 29;
}

let stone: PortalPixels | undefined;
/** Arco gotico con conci, strombatura nera, pilastri, pinnacoli e tre gradini. */
export function portalStonePixels(): PortalPixels {
  if (stone) return stone;
  const p = painter();
  // Basamento in prospettiva: i profili più chiari staccano ogni gradino dal selciato.
  for (const [x, y, width, height, color] of [
    [-46, 12, 93, 6, C.black], [-43, 10, 87, 4, C.stoneDark], [-39, 6, 79, 5, C.stone], [-35, 2, 71, 5, C.stoneLight],
  ] as const) { p.rect(x, y, width, height, color); p.line(x, y, x + width - 1, y, C.edge); }
  arch(p, C.black, -117, 42, 44, 1);
  arch(p, C.stoneDark, -114, 40, 43, 0);
  arch(p, C.stoneLight, -111, 37, 40, 0);
  arch(p, C.iron, -106, 33, 38, 0);
  arch(p, '#1e0d17', -103, 31, 37, 0);
  arch(p, '#09070c', -102, 29, 36, 0);
  // Giunti radiali fra i conci dell'arco; al centro resta la cavità nera.
  for (let i = 0; i < 15; i++) {
    const a = Math.PI + i * Math.PI / 14;
    const x = Math.round(Math.cos(a) * 38), y = Math.round(-65 + Math.sin(a) * 46);
    if (y < -100 && Math.abs(x) > 20) continue;
    p.line(x, y, x + Math.round(Math.cos(a) * 4), y + Math.round(Math.sin(a) * 4), C.black);
  }
  for (const side of [-1, 1]) {
    const x = side * 40;
    p.rect(x - 6, -82, 13, 85, C.black); p.rect(x - 4, -81, 9, 81, C.stone);
    p.rect(x - 4, -81, 2, 80, C.edge); p.rect(x + 3, -81, 2, 80, C.iron);
    for (let y = -79; y < -2; y += 11) {
      p.rect(x - 4, y, 9, 1, C.black); p.rect(x - 2, y + 1, 5, 1, C.stoneLight);
    }
    p.rect(x - 8, -84, 17, 4, C.edge); p.rect(x - 7, 0, 15, 5, C.stoneDark); p.line(x - 7, 0, x + 7, 0, C.edge);
    // Pinnacolo a due falde e ferri appuntiti.
    p.poly([[x, -124], [x - 7, -86], [x + 7, -86]], C.black);
    p.poly([[x, -118], [x - 4, -88], [x, -88]], C.stoneLight);
    p.poly([[x, -118], [x, -88], [x + 4, -88]], C.stoneDark);
    p.line(x, -128, x, -118, C.edge);
    p.rect(x - 3, -125, 7, 1, C.stoneLight);
    // Sconces ferrati ai lati della soglia.
    p.rect(side * 48 - 3, -22, 7, 15, C.black); p.rect(side * 48 - 4, -26, 9, 5, C.ironLight);
  }
  p.poly([[-7, -116], [0, -126], [7, -116], [4, -107], [-4, -107]], C.black);
  p.poly([[-4, -115], [0, -121], [4, -115], [2, -110], [-2, -110]], C.redDark);
  p.line(0, -120, 0, -111, C.scarlet);
  stone = { width: p.width, height: p.height, pixels: p.pixels }; return stone;
}

const vortexes = new Map<number, PortalPixels>();
/** Correnti cremisi convergenti verso un fondo nero; moto in profondità, senza riflesso da specchio. */
export function portalVortexPixels(frame: number): PortalPixels {
  const f = ((Math.floor(frame) % HUB_PORTAL.frames) + HUB_PORTAL.frames) % HUB_PORTAL.frames;
  const cached = vortexes.get(f); if (cached) return cached;
  const p = painter(), phase = f / HUB_PORTAL.frames * TAU;
  for (let y = -102; y <= 0; y++) {
    const half = portalMouthHalfWidth(y);
    for (let x = -half + 1; x < half; x++) {
      const nx = x / 29, ny = (y + 48) / 51, r = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
      const flow = Math.sin(a * 3 + r * 17 - phase * 2 + Math.sin(y * 0.11 + phase) * 0.7);
      const grain = hash(Math.floor(x / 2), Math.floor(y / 2)) % 7;
      const edge = Math.min(half - Math.abs(x), y + 103, 1 - y);
      let color = '#130911';
      if (flow > 0.88 && r > 0.16) color = grain < 2 ? '#f27954' : '#c83a39';
      else if (flow > 0.58 && r > 0.12) color = '#922333';
      else if (flow > 0.05) color = '#4d1325';
      else if (flow > -0.65) color = '#2b0d1c';
      if (r < 0.16) color = '#09070c';
      if (edge <= 2) color = (Math.sin(y * 0.26 - phase * 2) > 0.1) ? '#b32d3a' : '#56172a';
      p.rect(x, y, 1, 1, color);
    }
  }
  // Una costellazione di braci si avvita verso l'alto, dentro e fuori la soglia.
  for (let i = 0; i < 28; i++) {
    const u = (f / HUB_PORTAL.frames + i * 0.137) % 1;
    const y = -9 - u * 114, x = Math.sin(u * 8 + i * 2.4) * (15 + i % 14);
    const size = i % 5 === 0 ? 2 : 1;
    p.rect(x, y, size, size, u > 0.8 ? C.red : i % 4 === 0 ? C.ember : C.fire);
  }
  // Rune incise sui piedritti, separate dalla cavità.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = side * 37, y = -76 + i * 19, color = Math.sin(phase + i * 1.1) > 0 ? C.scarlet : C.red;
    p.line(x, y, x, y + 6, color); p.line(x - 2, y + 1, x + 2, y + 4, color);
    if (i % 2 === 0) p.line(x - 2, y + 5, x + 1, y + 3, color);
  }
  for (const side of [-1, 1]) {
    const x = side * 48, dy = Math.sin(phase * 3 + side) * 2;
    p.poly([[x, -44 + dy], [x - 4, -29], [x - 2, -25], [x + 3, -25], [x + 4, -32]], C.scarlet);
    p.poly([[x, -37 + dy], [x - 2, -28], [x + 2, -27]], C.ember);
  }
  const result = { width: p.width, height: p.height, pixels: p.pixels }; vortexes.set(f, result); return result;
}

const rasters = new WeakMap<PortalPixels, HTMLCanvasElement>();
function raster(art: PortalPixels): HTMLCanvasElement {
  let canvas = rasters.get(art); if (canvas) return canvas;
  canvas = document.createElement('canvas'); canvas.width = art.width; canvas.height = art.height;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < art.height; y++) for (let x = 0; x < art.width; x++) {
    const color = art.pixels[y]![x]; if (!color) continue;
    ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
  }
  rasters.set(art, canvas); return canvas;
}

/** Solo il vortice, per chi disegna il portale con un proprio arco di pietra. */
export function drawPortalVortex(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.drawImage(raster(portalVortexPixels(time * HUB_PORTAL.fps)), Math.round(x - HUB_PORTAL.anchorX), Math.round(y - HUB_PORTAL.anchorY));
}
