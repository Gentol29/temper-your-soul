import type { KeyValueStore } from '../character/save-store';

export const CURSOR_COLOR_KEY = 'temper-your-soul:cursor-color:v1';

export interface CursorColor {
  readonly id: string;
  readonly name: string;
  /** Luce, tono pieno e ombra: sostituiscono i tre toni dei PNG; il contorno scuro resta. */
  readonly ramp: readonly [string, string, string];
}

/** Il primo e' il colore dei PNG e il predefinito. Tavolozza provvisoria: per aggiungerne uno basta una riga. */
export const CURSOR_COLORS: readonly CursorColor[] = [
  { id: 'copper', name: 'Rame', ramp: ['#ffe7c6', '#c18b70', '#8a5a4a'] },
  { id: 'gold', name: 'Oro', ramp: ['#fff2b8', '#e0b040', '#a07820'] },
  { id: 'ivory', name: 'Avorio', ramp: ['#ffffff', '#e6ddce', '#a89f92'] },
  { id: 'ruby', name: 'Rubino', ramp: ['#ffb8a8', '#d8403a', '#8e2028'] },
  { id: 'ice', name: 'Ghiaccio', ramp: ['#e4f8ff', '#70c4e8', '#3a7ca8'] },
  { id: 'emerald', name: 'Smeraldo', ramp: ['#d0ffc8', '#58c070', '#2e7e4a'] },
  { id: 'amethyst', name: 'Ametista', ramp: ['#f0d8ff', '#a878e0', '#6a4a9e'] },
];

export const DEFAULT_CURSOR_COLOR = CURSOR_COLORS[0]!;

export interface CursorShape {
  /** Nome della variabile CSS `--cursor-<name>`. */
  readonly name: string;
  readonly url: string;
  /** Punto attivo in pixel: lo stesso dichiarato in style.css. */
  readonly hotspot: readonly [number, number];
  readonly fallback: string;
}

export const CURSOR_SHAPES: readonly CursorShape[] = [
  { name: 'default', url: new URL('../../assets/art/cursors/arrow.png', import.meta.url).href, hotspot: [0, 0], fallback: 'default' },
  { name: 'pointer', url: new URL('../../assets/art/cursors/pointer.png', import.meta.url).href, hotspot: [11, 1], fallback: 'pointer' },
  { name: 'grab', url: new URL('../../assets/art/cursors/grab.png', import.meta.url).href, hotspot: [15, 10], fallback: 'grab' },
  { name: 'grabbing', url: new URL('../../assets/art/cursors/grabbing.png', import.meta.url).href, hotspot: [15, 12], fallback: 'grabbing' },
  { name: 'aim', url: new URL('../../assets/art/cursors/aim.png', import.meta.url).href, hotspot: [15, 15], fallback: 'crosshair' },
];

function rgb(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 0xff, value & 0xff];
}

/** Sostituisce i toni del rame in pixel RGBA. Trasparenza e contorno restano come sono. */
export function recolorPixels(pixels: Uint8ClampedArray, color: CursorColor): void {
  const from = DEFAULT_CURSOR_COLOR.ramp.map(rgb), to = color.ramp.map(rgb);
  for (let at = 0; at < pixels.length; at += 4) {
    const tone = from.findIndex(([r, g, b]) => pixels[at] === r && pixels[at + 1] === g && pixels[at + 2] === b);
    if (tone < 0) continue;
    [pixels[at], pixels[at + 1], pixels[at + 2]] = to[tone]!;
  }
}

/** Quanto il colore scelto si schiarisce verso il bianco per la luce e si scurisce verso il nero per l'ombra. Provvisori. */
const CUSTOM_LIGHT = 0.55, CUSTOM_SHADOW = 0.4;
/** Sotto questa luminosita' (0-255) il colore si perde sui fondi scuri, come il contorno. Provvisorio. */
const DARK_LUMINANCE = 60;

function toHex(channels: readonly number[]): string {
  return `#${channels.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** Un colore scelto in RGB: il suo id e' l'esadecimale, cosi' si salva come gli altri. */
export function customCursorColor(red: number, green: number, blue: number): CursorColor {
  const base = [red, green, blue].map(clampChannel);
  return {
    id: toHex(base),
    name: 'Personalizzato',
    ramp: [
      toHex(base.map((value) => value + (255 - value) * CUSTOM_LIGHT)),
      toHex(base),
      toHex(base.map((value) => value * (1 - CUSTOM_SHADOW))),
    ],
  };
}

export function isCustomCursorColor(color: CursorColor): boolean {
  return !CURSOR_COLORS.includes(color);
}

/** I canali R, G e B del tono pieno. */
export function cursorColorChannels(color: CursorColor): readonly [number, number, number] {
  return rgb(color.ramp[1]);
}

export function isDarkCursorColor(color: CursorColor): boolean {
  const [red, green, blue] = cursorColorChannels(color);
  return 0.299 * red + 0.587 * green + 0.114 * blue < DARK_LUMINANCE;
}

export function loadCursorColor(storage: KeyValueStore | null): CursorColor {
  try {
    const id = storage?.getItem(CURSOR_COLOR_KEY);
    if (id && /^#[0-9a-f]{6}$/.test(id)) {
      const value = Number.parseInt(id.slice(1), 16);
      return customCursorColor(value >> 16, (value >> 8) & 0xff, value & 0xff);
    }
    return CURSOR_COLORS.find((color) => color.id === id) ?? DEFAULT_CURSOR_COLOR;
  } catch {
    return DEFAULT_CURSOR_COLOR;
  }
}

export function saveCursorColor(color: CursorColor, storage: KeyValueStore | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(CURSOR_COLOR_KEY, color.id);
    return true;
  } catch {
    return false;
  }
}
