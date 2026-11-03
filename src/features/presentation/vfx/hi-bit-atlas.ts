import type { VfxId } from './assets';

/** Atlanti raster locali: palette a sei toni, pixel interi, nessun filtro o risorsa remota. */
export const HI_BIT = { size: 96, frames: 12, fps: 24 } as const;
const TAU = Math.PI * 2;
const PALETTES = {
  copper: ['#392635', '#74433d', '#bd7650', '#eebc73', '#ffe4aa', '#fff8df'],
  fire: ['#41233f', '#963447', '#e85d36', '#ff9c43', '#ffdb83', '#fff7d6'],
  water: ['#253454', '#38668a', '#4ba6c4', '#8ad9df', '#c3f2e9', '#f2ffed'],
  earth: ['#30363c', '#596950', '#8b9b65', '#b8ce87', '#e2e5b3', '#fff5d5'],
  wind: ['#30384f', '#557780', '#87b5af', '#b5dacb', '#deefe0', '#fff9df'],
  astral: ['#362642', '#68456c', '#a576a0', '#d6acd0', '#ead9e5', '#fff8e5'],
  sage: ['#293b39', '#486757', '#7a9e77', '#b2c998', '#e1e4b3', '#fff4d4'],
} as const;

function palette(id: VfxId): readonly string[] {
  if (id.includes('fire')) return PALETTES.fire;
  if (id.includes('water')) return PALETTES.water;
  if (id.includes('earth')) return PALETTES.earth;
  if (id.includes('wind')) return PALETTES.wind;
  if (id.includes('blink')) return PALETTES.astral;
  return id.startsWith('warrior') ? PALETTES.copper : PALETTES.sage;
}
const noise = (x: number, y: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Campo della sagoma, in pixel: >0 pieno, <0 trasparente; il valore sceglie la rampa di luce. */
function field(id: VfxId, x: number, y: number, t: number): number {
  const r = Math.hypot(x, y), a = Math.atan2(y, x), phase = t * TAU;
  switch (id) {
    case 'mage-fireball': {
      const core = 14 - Math.hypot(x - 5, y * 1.1);
      let tail = -10;
      for (let i = -1; i <= 1; i++) {
        const center = Math.sin(x * 0.19 - phase + i * 1.9) * (4 - x * 0.12) + i * 5;
        if (x < 5 && x > -39 + i * 3) tail = Math.max(tail, (x + 40) * 0.14 + 2 - Math.abs(y - center));
      }
      return Math.max(core, tail);
    }
    case 'mage-water-orb': {
      const orb = 14 - r;
      const crescent = 2.5 - Math.abs(r - 20 - Math.sin(a * 3 - phase) * 2);
      return Math.max(orb, crescent > 0 && Math.sin(a * 2 - phase) > -0.25 ? crescent + 1 : -5);
    }
    case 'mage-earth-wisp': {
      const gem = 14 - Math.abs(x) * 0.85 - Math.abs(y) * 1.25;
      let orbit = -5;
      for (let i = 0; i < 3; i++) {
        const rotation = phase + i * TAU / 3;
        orbit = Math.max(orbit, 4 - Math.abs(x - Math.cos(rotation) * 25) - Math.abs(y - Math.sin(rotation) * 18));
      }
      return Math.max(gem, orbit, Math.sin(a * 3 - phase) > 0.3 ? (1.2 - Math.abs(Math.hypot(x, y * 1.4) - 27)) * 2 : -5);
    }
    case 'mage-wind-orb': {
      const spiral = Math.sin(a * 3 + r * 0.22 - phase);
      return r < 30 && r > 6 ? (spiral - 0.45) * 7 * (1 - r / 34) : 7 - r;
    }
    case 'archer-arrow': {
      const shaft = x > -26 && x < 16 ? 1.3 - Math.abs(y) : -5;
      const tip = x > 9 && x < 27 ? (27 - x) * 0.5 - Math.abs(y) : -5;
      const feather = x > -29 && x < -15 ? 5 - Math.abs(y) - Math.abs(x + 22) * 0.4 : -5;
      return Math.max(shaft * 3, tip, feather);
    }
    case 'warrior-cleave': {
      const sweep = -1.7 + t * 3.4;
      if (a > sweep + 0.16 || a < sweep - 1.15) return -5;
      const blade = Math.min(48 - r, r - (30 + (a - sweep + 1.15) * 6));
      return blade * (0.8 + (a - sweep + 1.15) * 0.5);
    }
    case 'warrior-guard': {
      const shield = Math.max(Math.abs(x) / 24, (Math.abs(y + 8) + Math.abs(x) * 0.28) / 33);
      const rim = (1 - shield) * 20;
      if (rim < 0) return rim;
      const cross = Math.min(Math.abs(x), Math.abs(y + 9));
      if (rim < 2.5) return 10;
      if (rim < 4.5) return 1.2;
      const rivet = Math.abs(Math.abs(x) - 17) < 1.5 && Math.abs(y + 20) < 1.5;
      return rivet ? 13 : cross < 1.5 ? 10 : 1.2 + Math.max(0, -x - y) * 0.06;
    }
    case 'warrior-fortify':
    case 'mage-earth-aura': {
      const helix = Math.abs(x - Math.sin(y * 0.16 + phase) * (17 + y * 0.1));
      const second = Math.abs(x + Math.sin(y * 0.16 + phase) * (17 + y * 0.1));
      const vine = y > -34 && y < 22 ? Math.max(3.5 - helix, 1.5 - second) : -5;
      const floor = 1.5 - Math.abs(Math.hypot(x, (y - 22) * 2.8) - 28);
      const runeY = ((y + 34 + t * 64) % 16) - 8;
      const runes = Math.abs(x) > 27 && Math.abs(x) < 33 && Math.abs(y) < 30
        ? 2 - Math.min(Math.abs(runeY), Math.abs(Math.abs(x) - 30)) : -5;
      return Math.max(vine * 2, floor * 3, runes * 3);
    }
    case 'archer-predator': {
      const claw = Math.abs(x + y * 0.45 + Math.sin(phase) * 2);
      const cuts = y > -30 && y < 26 ? Math.max(3.2 - claw, 2.5 - Math.abs(claw - 14)) * 2 : -5;
      const crescent = r > 27 && r < 31 && Math.sin(a + phase) > 0.2 ? 5 : -5;
      return Math.max(cuts, crescent);
    }
    case 'archer-summon': {
      const face = 18 - Math.abs(x) * 0.95 - Math.abs(y + 4) * 0.62;
      const ears = y > -35 && y < -10 ? (y + 35) * 0.34 - Math.abs(Math.abs(x) - (17 - (y + 35) * 0.25)) : -5;
      const eyes = Math.abs(y + 10 + Math.abs(x) * 0.15) < 1.2 && Math.abs(Math.abs(x) - 8) < 4;
      if (eyes) return 14;
      if (Math.abs(x) < 2 && y > 4 && y < 10) return 1;
      return Math.max(face * 0.6, ears);
    }
    case 'warrior-rush':
    case 'archer-dash': {
      const ribbon = Math.sin(y * 0.38 + phase + x * 0.07);
      return x > -43 && x < 32 && Math.abs(y) < 25 ? (ribbon - 0.65) * 10 * (0.6 + (x + 43) / 75) : -5;
    }
    case 'mage-fire-explosion':
    case 'mage-water-explosion':
    case 'mage-blink': {
      const radius = 8 + Math.sqrt(t) * 31;
      const wave = 2.2 - Math.abs(r - radius * 0.94);
      let lobes = -10;
      const count = id === 'mage-blink' ? 8 : 11;
      for (let i = 0; i < count; i++) {
        const direction = i * TAU / count + Math.sin(i * 7) * 0.26;
        const reach = radius * (0.48 + 0.25 * Math.sin(i * 17 + 2));
        const dx = x - Math.cos(direction) * reach, dy = y - Math.sin(direction) * reach;
        if (id.includes('water') || id === 'mage-blink') {
          const along = dx * Math.cos(direction) + dy * Math.sin(direction);
          const across = -dx * Math.sin(direction) + dy * Math.cos(direction);
          lobes = Math.max(lobes, 8 * (1 - t * 0.65) - Math.abs(along) * 0.45 - Math.abs(across) * 1.5);
        } else {
          const size = (10 - t * 6) * (0.8 + Math.sin(i * 11) * 0.2);
          const blob = size - Math.hypot(dx, dy);
          lobes = Math.max(lobes, blob);
        }
      }
      const core = (1 - t) * 21 - r;
      return Math.max(core, lobes, wave > 0 && Math.sin(a * 5 + t) > 0.15 ? wave * 1.8 : -5);
    }
  }
}

export function rasterVfx(id: VfxId, frame: number): Uint8ClampedArray {
  const size = id === 'warrior-cleave' ? 128 : HI_BIT.size;
  const pixels = new Uint8ClampedArray(size * size * 4);
  const colors = palette(id).map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  const t = Math.min(HI_BIT.frames - 1, Math.max(0, frame)) / HI_BIT.frames;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = px - size / 2, y = py - size / 2;
    const value = field(id, x, y, t);
    if (value <= 0) continue;
    // Aree di texture stabili: niente rumore che lampeggia da un pixel all'altro.
    const grain = noise(Math.floor(x / 2), Math.floor(y / 2));
    const facet = (x - y) * 0.025 + grain * 0.5;
    const tone = Math.max(0, Math.min(5, Math.floor(value * 0.34 + facet + 1.3)));
    const offset = (py * size + px) * 4, rgb = colors[tone];
    pixels[offset] = rgb[0]; pixels[offset + 1] = rgb[1]; pixels[offset + 2] = rgb[2];
    pixels[offset + 3] = value < 1 ? 160 : 255;
  }
  return pixels;
}

interface Atlas { readonly canvas: HTMLCanvasElement; readonly ready: Set<number> }
const atlases = new Map<VfxId, Atlas>();
export const hiBitAvailable = (): boolean => typeof document !== 'undefined';

function preparedFrame(id: VfxId, frame: number): HTMLCanvasElement | undefined {
  const size = id === 'warrior-cleave' ? 128 : HI_BIT.size;
  let atlas = atlases.get(id);
  if (!atlas) {
    const canvas = document.createElement('canvas'); canvas.width = size * HI_BIT.frames; canvas.height = size;
    atlas = { canvas, ready: new Set() }; atlases.set(id, atlas);
  }
  if (!atlas.ready.has(frame)) {
    const raster = atlas.canvas.getContext('2d'); if (!raster) return undefined;
    const data = raster.createImageData(size, size); data.data.set(rasterVfx(id, frame));
    raster.putImageData(data, frame * size, 0); atlas.ready.add(frame);
  }
  return atlas.canvas;
}

/** Un fotogramma per pausa del browser: non si costruiscono dodici raster al primo colpo. */
export function prewarmHiBitVfx(ids: readonly VfxId[]): void {
  if (!hiBitAvailable()) return;
  let cursor = 0;
  const schedule = (work: () => void): void => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(work);
    else window.setTimeout(work, 30);
  };
  const next = (): void => {
    const id = ids[Math.floor(cursor / HI_BIT.frames)]; if (!id) return;
    preparedFrame(id, cursor % HI_BIT.frames); cursor++;
    if (cursor < ids.length * HI_BIT.frames) schedule(next);
  };
  schedule(next);
}

/** Riusa i raster già preparati. Se il giocatore lancia subito, calcola solo il frame necessario. */
export function drawHiBitVfx(ctx: CanvasRenderingContext2D, id: VfxId, x: number, y: number, width: number,
  time: number, angle: number, alpha: number, duration?: number): boolean {
  if (!hiBitAvailable()) return false;
  const size = id === 'warrior-cleave' ? 128 : HI_BIT.size;
  const index = Math.max(0, Math.floor(time * (duration ? HI_BIT.frames / duration : HI_BIT.fps)));
  const frame = duration ? Math.min(HI_BIT.frames - 1, index) : index % HI_BIT.frames;
  const atlas = preparedFrame(id, frame); if (!atlas) return false;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlas, frame * size, 0, size, size, -width / 2, -width / 2, width, width);
  ctx.restore(); return true;
}
