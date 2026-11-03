import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../character/save-store';
import { CURSOR_COLOR_KEY, CURSOR_COLORS, CURSOR_SHAPES, cursorColorChannels, customCursorColor, DEFAULT_CURSOR_COLOR, isCustomCursorColor, isDarkCursorColor, loadCursorColor, recolorPixels, saveCursorColor } from './cursor-colors';

/** Il minimo di `node:fs` e `node:zlib` che serve ai test (il progetto non include i tipi di Node nel client). */
interface FileSystem { readFileSync(path: URL): Uint8Array }
interface Zlib { inflateSync(data: Uint8Array): Uint8Array }
const NODE_FS = 'node:fs', NODE_ZLIB = 'node:zlib';

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const color = (id: string) => CURSOR_COLORS.find((entry) => entry.id === id)!;
const STYLE = new URL('../../style.css', import.meta.url);
const hex = (r: number, g: number, b: number): string => `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;

describe('colore dei cursori', () => {
  it('sostituisce i tre toni del rame e lascia contorno e trasparenza', () => {
    const pixels = new Uint8ClampedArray([
      0xc1, 0x8b, 0x70, 255,
      0xff, 0xe7, 0xc6, 255,
      0x8a, 0x5a, 0x4a, 255,
      0x21, 0x19, 0x23, 255,
      0, 0, 0, 0,
    ]);
    recolorPixels(pixels, color('ice'));
    expect([...pixels]).toEqual([
      0x70, 0xc4, 0xe8, 255,
      0xe4, 0xf8, 0xff, 255,
      0x3a, 0x7c, 0xa8, 255,
      0x21, 0x19, 0x23, 255,
      0, 0, 0, 0,
    ]);
  });

  it('il rame non cambia i pixel: i PNG restano identici', () => {
    const pixels = new Uint8ClampedArray([0xc1, 0x8b, 0x70, 255, 0x21, 0x19, 0x23, 255]);
    recolorPixels(pixels, DEFAULT_CURSOR_COLOR);
    expect([...pixels]).toEqual([0xc1, 0x8b, 0x70, 255, 0x21, 0x19, 0x23, 255]);
  });

  it('i colori hanno id unici e tre toni distinti in esadecimale', () => {
    expect(new Set(CURSOR_COLORS.map((entry) => entry.id)).size).toBe(CURSOR_COLORS.length);
    for (const entry of CURSOR_COLORS) {
      expect(new Set(entry.ramp).size, entry.id).toBe(3);
      for (const tone of entry.ramp) expect(tone, entry.id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('i PNG usano proprio i toni della tavolozza: altrimenti ricolorarli non farebbe nulla', async () => {
    const fs = (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
    const zlib = (await import(/* @vite-ignore */ NODE_ZLIB)) as Zlib;
    for (const shape of CURSOR_SHAPES) {
      const bytes = fs.readFileSync(new URL(shape.url));
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16), length = view.getUint32(33);
      expect(new TextDecoder().decode(bytes.slice(37, 41)), shape.name).toBe('IDAT');
      const raw = zlib.inflateSync(bytes.slice(41, 41 + length)), stride = width * 4 + 1, tones = new Set<string>();
      for (let row = 0; row < raw.length; row += stride) {
        for (let at = row + 1; at < row + stride; at += 4) if (raw[at + 3]) tones.add(hex(raw[at]!, raw[at + 1]!, raw[at + 2]!));
      }
      expect([...tones].sort(), shape.name).toEqual(['#211923', ...DEFAULT_CURSOR_COLOR.ramp].filter((tone) => tones.has(tone)).sort());
      expect(tones.has(DEFAULT_CURSOR_COLOR.ramp[1]) || tones.has(DEFAULT_CURSOR_COLOR.ramp[0]), shape.name).toBe(true);
    }
  });

  it('i punti attivi coincidono con quelli dichiarati nel CSS', async () => {
    const fs = (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
    const css = new TextDecoder().decode(fs.readFileSync(STYLE));
    for (const shape of CURSOR_SHAPES) {
      expect(css, shape.name).toMatch(new RegExp(`--cursor-${shape.name}: url\\('[^']+'\\) ${shape.hotspot[0]} ${shape.hotspot[1]}, ${shape.fallback};`));
    }
  });

  it('un colore RGB ricava luce e ombra dal tono scelto e ricolora come gli altri', () => {
    const custom = customCursorColor(40, 120, 200);
    expect(custom.id).toBe('#2878c8');
    expect(custom.ramp).toEqual(['#9ec2e6', '#2878c8', '#184878']);
    expect(cursorColorChannels(custom)).toEqual([40, 120, 200]);
    expect(isCustomCursorColor(custom)).toBe(true);
    expect(isCustomCursorColor(DEFAULT_CURSOR_COLOR)).toBe(false);
    const pixels = new Uint8ClampedArray([0xc1, 0x8b, 0x70, 255, 0x21, 0x19, 0x23, 255]);
    recolorPixels(pixels, custom);
    expect([...pixels]).toEqual([40, 120, 200, 255, 0x21, 0x19, 0x23, 255]);
  });

  it('i valori fuori scala e decimali restano canali validi', () => {
    expect(customCursorColor(-5, 300, 12.6).id).toBe('#00ff0d');
    expect(customCursorColor(0, 0, 0).ramp[1]).toBe('#000000');
    expect(customCursorColor(255, 255, 255).ramp).toEqual(['#ffffff', '#ffffff', '#999999']);
  });

  it('segnala solo i colori troppo scuri per vedersi sulle mappe', () => {
    expect(isDarkCursorColor(customCursorColor(10, 10, 30))).toBe(true);
    expect(isDarkCursorColor(customCursorColor(40, 120, 200))).toBe(false);
    for (const preset of CURSOR_COLORS) expect(isDarkCursorColor(preset), preset.id).toBe(false);
  });

  it('un colore RGB si ricorda come gli altri; un esadecimale non valido torna al rame', () => {
    const store = new MemoryStore();
    expect(saveCursorColor(customCursorColor(40, 120, 200), store)).toBe(true);
    expect(store.getItem(CURSOR_COLOR_KEY)).toBe('#2878c8');
    const loaded = loadCursorColor(store);
    expect(loaded.ramp[1]).toBe('#2878c8');
    expect(isCustomCursorColor(loaded)).toBe(true);
    for (const bad of ['#12345', '#GGGGGG', '#1234567', 'url(x)']) {
      store.setItem(CURSOR_COLOR_KEY, bad);
      expect(loadCursorColor(store), bad).toBe(DEFAULT_CURSOR_COLOR);
    }
  });

  it('la scelta si ricorda; un valore sconosciuto o un archivio assente tornano al rame', () => {
    const store = new MemoryStore();
    expect(loadCursorColor(store)).toBe(DEFAULT_CURSOR_COLOR);
    expect(saveCursorColor(color('ruby'), store)).toBe(true);
    expect(loadCursorColor(store).id).toBe('ruby');
    store.setItem(CURSOR_COLOR_KEY, 'inesistente');
    expect(loadCursorColor(store)).toBe(DEFAULT_CURSOR_COLOR);
    expect(loadCursorColor(null)).toBe(DEFAULT_CURSOR_COLOR);
    expect(saveCursorColor(color('ruby'), null)).toBe(false);
  });
});
