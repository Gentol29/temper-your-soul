import { describe, expect, it } from 'vitest';

/** Il minimo di `node:fs` che serve ai test (il progetto non include i tipi di Node e non li aggiunge per questo). */
interface FileSystem {
  existsSync(path: URL): boolean;
  readFileSync(path: URL): Uint8Array;
}

const NODE_FS = 'node:fs';

async function fileSystem(): Promise<FileSystem> {
  return (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
}

const STYLE = new URL('../../style.css', import.meta.url);
const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const CURSORS = ['default', 'pointer', 'grab', 'grabbing', 'aim'];
/** Oltre questa misura i browser possono ignorare il cursore vicino ai bordi della finestra. */
const MAX_SIZE = 32;

describe('cursori del tema Reliquiario', () => {
  it('ogni variabile punta a un PNG entro 32 pixel, col punto attivo dentro e un cursore di riserva', async () => {
    const fs = await fileSystem();
    const css = text(fs.readFileSync(STYLE));
    for (const name of CURSORS) {
      const match = css.match(new RegExp(`--cursor-${name}: url\\('(\\./assets/art/cursors/[\\w-]+\\.png)'\\) (\\d+) (\\d+), [a-z]+;`));
      expect(match, name).not.toBeNull();
      const [, file, x, y] = match!;
      const url = new URL(file!, STYLE);
      expect(fs.existsSync(url), file).toBe(true);
      const bytes = fs.readFileSync(url);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint32(0), file).toBe(0x89504e47);
      const width = view.getUint32(16), height = view.getUint32(20);
      expect(Math.max(width, height), file).toBeLessThanOrEqual(MAX_SIZE);
      expect(Number(x), file).toBeLessThan(width);
      expect(Number(y), file).toBeLessThan(height);
    }
  });

  it('nel CSS non restano cursori di sistema al posto di quelli del tema', async () => {
    const fs = await fileSystem();
    const css = text(fs.readFileSync(STYLE));
    expect(css.match(/cursor:\s*(?:default|pointer|grab|grabbing|crosshair)\b/g)).toBeNull();
  });

  it('il mirino vale solo sul canvas di gioco mentre si gioca', async () => {
    const fs = await fileSystem();
    const css = text(fs.readFileSync(STYLE));
    const uses = css.split('\n').filter((line) => line.includes('var(--cursor-aim)'));
    expect(uses).toHaveLength(1);
    expect(css).toMatch(/body\.aiming #game \{\s*cursor: var\(--cursor-aim\);/);
  });
});
