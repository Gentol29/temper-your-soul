/*
 * Dissolvenza a rumore dei servitori abbattuti (strato WebGL, `minion-dissolve.ts`). Qui la parte pura: valori, rumore,
 * soglia nel tempo e il riferimento CPU della regola dello shader, cosi' i test la controllano senza browser.
 * Lo shader scarta un pixel d'arte quando il suo valore e' sotto la soglia; appena sopra lo colora con l'orlo (brace,
 * cenere o energia secondo la materia). Il valore mescola il rumore con l'altezza: la testa si sfalda per prima e la
 * figura crolla verso i piedi, in modo asimmetrico. Solo aspetto: nessun numero casuale, nessuna regola. Valori provvisori.
 */

export const DISSOLVE = {
  /** Lato della trama di rumore, in pixel (si ripete sullo sprite, un pixel di rumore per pixel d'arte). */
  noiseSize: 64,
  /** Quota della vita della morte (0,8 s, `COMBAT_VFX.deathLife`) in cui la figura lampeggia intera prima di sfaldarsi. */
  flash: 0.15,
  /** Peso dell'altezza nel valore: 0 rumore puro, 1 solo dall'alto in basso. */
  heightWeight: 0.35,
  /** Spessore dell'orlo colorato sopra la soglia. */
  edge: 0.05,
  /** Curva della soglia: oltre 1 la figura regge di piu' all'inizio e si sfalda in fretta alla fine. */
  ease: 1.5,
  /** Quanto la figura si schiaccia mentre si sfalda (prima, senza shader, arrivava all'80%). */
  squash: 0.25,
  /** Colore dell'orlo per materia (`impactKind`): creature in brace, ossa e costrutti in cenere, spiriti in energia. */
  edgeColors: { blood: '#f05b3c', chip: '#a8a1a3', glow: '#d6c7e8' },
} as const;

export type DissolveMatter = keyof typeof DISSOLVE.edgeColors;

const hash = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x + seed * 7919, 374761393) ^ Math.imul(y + seed * 104729, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Rumore a valori su griglia, liscio e periodico sul lato `size` (si ripete senza cuciture). */
function valueNoise(x: number, y: number, cell: number, size: number, seed: number): number {
  const cells = size / cell;
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const at = (ix: number, iy: number): number => hash(((ix % cells) + cells) % cells, ((iy % cells) + cells) % cells, seed);
  const top = at(gx, gy) + (at(gx + 1, gy) - at(gx, gy)) * sx;
  const bottom = at(gx, gy + 1) + (at(gx + 1, gy + 1) - at(gx, gy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/**
 * La trama di rumore in scala di grigi (un byte per pixel, `size` x `size`): due ottave di rumore liscio per le chiazze
 * di cenere e un poco di rumore fine per le schegge. Stesso risultato a ogni chiamata.
 */
export function dissolveNoise(size: number = DISSOLVE.noiseSize): Uint8Array {
  const out = new Uint8Array(size * size);
  let min = Infinity, max = -Infinity;
  const raw = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = valueNoise(x, y, 16, size, 1) * 0.55 + valueNoise(x, y, 4, size, 2) * 0.3 + hash(x, y, 3) * 0.15;
    raw[y * size + x] = v; min = Math.min(min, v); max = Math.max(max, v);
  }
  // Stirato su tutta la scala: la soglia che sale da 0 a 1 attraversa davvero ogni pixel.
  for (let i = 0; i < raw.length; i++) out[i] = Math.round((raw[i]! - min) / (max - min) * 255);
  return out;
}

/** Soglia all'avanzamento `u` (0 appena abbattuto, 1 fine): ferma sotto zero durante il lampo, poi oltre 1 alla fine. */
export function dissolveThreshold(u: number): number {
  const t = Math.max(0, Math.min(1, (u - DISSOLVE.flash) / (1 - DISSOLVE.flash)));
  return u < DISSOLVE.flash ? -1 : Math.pow(t, DISSOLVE.ease) * (1 + DISSOLVE.edge) + 0.001;
}

/**
 * Valore di un pixel d'arte (`x`, `y`) di uno sprite alto `height`: rumore (0..1) mescolato con l'altezza, la testa piu'
 * bassa. Stessa formula dello shader (`DISSOLVE_FRAGMENT`).
 */
export function dissolveValue(noise: Uint8Array, x: number, y: number, height: number, size: number = DISSOLVE.noiseSize): number {
  const n = noise[(((y % size) + size) % size) * size + (((x % size) + size) % size)]! / 255;
  const down = (y + 0.5) / height;
  return n * (1 - DISSOLVE.heightWeight) + down * DISSOLVE.heightWeight;
}

/** Cosa diventa un pixel opaco alla soglia data: scartato, orlo colorato o colore proprio. */
export function dissolvePixel(value: number, threshold: number): 'gone' | 'edge' | 'kept' {
  if (value < threshold) return 'gone';
  return value < threshold + DISSOLVE.edge ? 'edge' : 'kept';
}

/** Vertici del quadrato dello sprite: posizione in pixel attorno al centro e coordinate della trama. */
export const DISSOLVE_VERTEX = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;

/** Scarta i pixel sotto la soglia, colora l'orlo, lascia il resto: tutto per pixel d'arte interi (niente sfumature). */
export const DISSOLVE_FRAGMENT = `#version 300 es
precision mediump float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uNoise;
uniform float uThreshold;
uniform float uEdge;
uniform float uHeightWeight;
uniform float uNoiseSize;
uniform vec2 uSize;
uniform vec4 uEdgeColor;
void main() {
  vec2 pixel = floor(vUV * uSize);
  vec4 color = texture(uTexture, (pixel + 0.5) / uSize);
  if (color.a < 0.5) discard;
  float n = texture(uNoise, (pixel + 0.5) / uNoiseSize).r;
  float value = n * (1.0 - uHeightWeight) + ((pixel.y + 0.5) / uSize.y) * uHeightWeight;
  if (value < uThreshold) discard;
  finalColor = value < uThreshold + uEdge ? vec4(uEdgeColor.rgb, 1.0) : color;
}`;
