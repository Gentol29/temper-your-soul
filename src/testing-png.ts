/*
 * Solo per i test: legge un PNG RGBA a 8 bit non interlacciato (come i fogli in src/assets/vfx/frames) con
 * `node:fs` e `node:zlib`, senza dipendenze. Il progetto non include i tipi di Node: bastano le due firme qui sotto.
 */
interface FileSystem { readFileSync(path: URL): Uint8Array }
interface Zlib { inflateSync(data: Uint8Array): Uint8Array }
const NODE_FS = 'node:fs';
const NODE_ZLIB = 'node:zlib';

export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  /** RGBA, riga per riga. */
  readonly pixels: Uint8ClampedArray;
}

export async function readPng(path: URL): Promise<DecodedPng> {
  const fs = (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
  const zlib = (await import(/* @vite-ignore */ NODE_ZLIB)) as Zlib;
  const bytes = fs.readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8, width = 0, height = 0;
  const data: Uint8Array[] = [];
  while (offset < bytes.length) {
    const length = view.getUint32(offset), type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const body = bytes.slice(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8); height = view.getUint32(offset + 12);
      if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) throw new Error(`${path.pathname}: serve un PNG RGBA a 8 bit non interlacciato`);
    } else if (type === 'IDAT') data.push(body);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const joined = new Uint8Array(data.reduce((sum, chunk) => sum + chunk.length, 0));
  data.reduce((at, chunk) => { joined.set(chunk, at); return at + chunk.length; }, 0);
  const raw = zlib.inflateSync(joined), stride = width * 4, pixels = new Uint8ClampedArray(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!, row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x]!;
      const left = x >= 4 ? pixels[row + x - 4]! : 0, up = y > 0 ? pixels[row - stride + x]! : 0;
      const corner = x >= 4 && y > 0 ? pixels[row - stride + x - 4]! : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - corner, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - corner);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      }
      pixels[row + x] = (value + predicted) & 0xff;
    }
  }
  return { width, height, pixels };
}

/** Un fotogramma quadrato `size` x `size` di un foglio con i fotogrammi affiancati. */
export function sheetFrame(png: DecodedPng, size: number, frame: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) out.set(png.pixels.subarray((y * png.width + frame * size) * 4, (y * png.width + frame * size + size) * 4), y * size * 4);
  return out;
}
