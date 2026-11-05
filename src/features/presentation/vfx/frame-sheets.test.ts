import { describe, expect, it } from 'vitest';
import { readPng, sheetFrame as frameOf, type DecodedPng } from '../../../testing-png';
import { VFX_IDS, type VfxId } from './assets';
import { CLEAVE_ART } from './sprite-effects';
import { FRAME_SHEETS, frameSheetUrl, sheetFrame } from './frame-sheets';

const INK = '18141d';
const sheetUrl = (id: VfxId): URL => new URL(`../../../assets/vfx/frames/${id}.png`, import.meta.url);
const hex = (p: Uint8ClampedArray, i: number): string => [0, 1, 2].map(c => p[i + c]!.toString(16).padStart(2, '0')).join('');

function stats(pixels: Uint8ClampedArray, size: number): { filled: number; cx: number; cy: number; colors: Set<string> } {
  let filled = 0, sx = 0, sy = 0; const colors = new Set<string>();
  for (let i = 0; i < size * size; i++) {
    if (!pixels[i * 4 + 3]) continue;
    filled++; sx += i % size; sy += Math.floor(i / size); colors.add(hex(pixels, i * 4));
  }
  return { filled, cx: sx / filled, cy: sy / filled, colors };
}

/** Effetti fermi per scelta (come nel disegno di prima): scudo della parata ed emblema del lupo, un'immagine sola. */
const STILL: readonly VfxId[] = ['warrior-guard', 'archer-summon'];
/** Il fendente ruota attorno al proprietario: la lama sta lontano dal centro (vedi il test del raggio). */
const OFF_CENTRE: readonly VfxId[] = ['warrior-cleave'];

const sheets = new Map<VfxId, DecodedPng>();
async function load(id: VfxId): Promise<{ sheet: DecodedPng; size: number }> {
  if (!sheets.has(id)) sheets.set(id, await readPng(sheetUrl(id)));
  return { sheet: sheets.get(id)!, size: FRAME_SHEETS.effects[id]!.size };
}

describe('animazioni delle skill a fotogrammi', () => {
  it('ogni effetto delle tre classi ha il suo foglio: 12 fotogrammi quadrati, 24 fps, provenienza registrata', async () => {
    expect(FRAME_SHEETS.frames).toBe(12);
    expect(FRAME_SHEETS.fps).toBe(24);
    expect(Object.keys(FRAME_SHEETS.effects).sort()).toEqual([...VFX_IDS].sort());
    for (const id of VFX_IDS) {
      const entry = FRAME_SHEETS.effects[id]!;
      expect(frameSheetUrl(entry.file), id).toBeDefined();
      const { sheet } = await load(id);
      expect([sheet.width, sheet.height], id).toEqual([entry.size * 12, entry.size]);
      expect(entry.denoise, id).toBeGreaterThan(0);
    }
  });

  it('pixel interi, palette Hi-bit ristretta con il contorno scuro, bordo trasparente, sagoma piena e animata', async () => {
    for (const id of VFX_IDS) {
      const { sheet, size } = await load(id);
      const frames = new Set<string>(), palette = new Set<string>();
      for (let f = 0; f < 12; f++) {
        const pixels = frameOf(sheet, size, f), s = stats(pixels, size);
        const partial = pixels.filter((value, i) => i % 4 === 3 && value !== 0 && value !== 255);
        expect(partial, `${id}/${f}`).toHaveLength(0);
        for (const color of s.colors) palette.add(color);
        expect(s.filled, `${id}/${f}`).toBeGreaterThan(40);
        expect(s.filled, `${id}/${f}`).toBeLessThan(size * size * 0.6);
        expect(s.colors.size, `${id}/${f}`).toBeGreaterThanOrEqual(3);
        for (let e = 0; e < size; e++) for (const [x, y] of [[e, 0], [e, size - 1], [0, e], [size - 1, e]] as const) {
          expect(pixels[(y * size + x) * 4 + 3], `${id}/${f}`).toBe(0);
        }
        frames.add(String(pixels));
      }
      expect(palette.has(INK), id).toBe(true);
      // Palette esplicita della classe/elemento (fino a 8 toni piu' il contorno); un'immagine non ridotta ne avrebbe centinaia.
      expect(palette.size, id).toBeLessThanOrEqual(12);
      expect(frames.size, id).toBeGreaterThanOrEqual(STILL.includes(id) ? 1 : 8);
    }
  });

  it('la sagoma sta attorno al centro del fotogramma, il punto su cui il gioco la ancora e la ruota', async () => {
    for (const id of VFX_IDS) {
      if (OFF_CENTRE.includes(id)) continue;
      const { sheet, size } = await load(id);
      for (const f of [1, 5, 9]) {
        const s = stats(frameOf(sheet, size, f), size);
        expect(Math.hypot(s.cx - size / 2, s.cy - size / 2), `${id}/${f}`).toBeLessThan(size * 0.15);
      }
    }
  });

  it('il fendente resta nel raggio della lama di gioco in ogni fotogramma', async () => {
    const { sheet, size } = await load('warrior-cleave');
    const centre = (size - 1) / 2, radius = CLEAVE_ART.bladeRadius * size / CLEAVE_ART.canvasSize;
    for (let f = 0; f < 12; f++) {
      const pixels = frameOf(sheet, size, f);
      for (let i = 0; i < size * size; i++) if (pixels[i * 4 + 3]) {
        expect(Math.hypot(i % size - centre, Math.floor(i / size) - centre), `fotogramma ${f}`).toBeLessThanOrEqual(radius);
      }
    }
  });

  it('i quattro elementi del Mago hanno sagome diverse, non solo palette diverse', async () => {
    const masks = await Promise.all((['mage-fireball', 'mage-water-orb', 'mage-earth-wisp', 'mage-wind-orb'] as const).map(async id => {
      const { sheet, size } = await load(id);
      return Array.from(frameOf(sheet, size, 3)).filter((_, i) => i % 4 === 3).join(',');
    }));
    expect(new Set(masks).size).toBe(4);
  });

  it('sceglie il fotogramma: in ciclo a 24 fps, oppure distribuito sulla durata e fermo sull\'ultimo', () => {
    expect(sheetFrame(0)).toBe(0);
    expect(sheetFrame(11 / 24)).toBe(11);
    expect(sheetFrame(12 / 24)).toBe(0);
    expect(sheetFrame(-1)).toBe(0);
    expect(sheetFrame(0.12, 0.24)).toBe(6);
    expect(sheetFrame(5, 0.24)).toBe(11);
  });
});
