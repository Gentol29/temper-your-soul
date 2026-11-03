import { describe, expect, it } from 'vitest';
import { canvasFont, CANVAS_FONTS } from '../presentation/fonts';
import { FONT_CREDITS } from './font-credits';

/** Il minimo di `node:fs` che serve ai test (il progetto non include i tipi di Node e non li aggiunge per questo). */
interface FileSystem {
  existsSync(path: URL): boolean;
  readFileSync(path: URL): Uint8Array;
  readdirSync(path: URL): string[];
}

const NODE_FS = 'node:fs';

async function fileSystem(): Promise<FileSystem> {
  return (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
}

const FONTS = new URL('../../assets/fonts/', import.meta.url);
const STYLE = new URL('../../style.css', import.meta.url);
const MENU_STYLE = new URL('./forge-menu.css', import.meta.url);
const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

describe('caratteri dell\'interfaccia (stile unico)', () => {
  it('ogni carattere accreditato c\'e\', e\' un WOFF2, ha accanto la sua licenza OFL 1.1; il totale resta leggero', async () => {
    const fs = await fileSystem();
    let total = 0;
    for (const [id, credit] of Object.entries(FONT_CREDITS)) {
      expect(credit.license, id).toBe('OFL-1.1');
      expect(credit.source, id).toMatch(/^https:\/\//);
      for (const file of credit.files) {
        const url = new URL(file, FONTS);
        expect(fs.existsSync(url), file).toBe(true);
        const bytes = fs.readFileSync(url);
        total += bytes.length;
        expect(text(bytes.slice(0, 4)), file).toBe('wOF2');
      }
      const license = new URL(credit.licenseFile, FONTS);
      expect(fs.existsSync(license), credit.licenseFile).toBe(true);
      expect(text(fs.readFileSync(license)), credit.licenseFile).toContain('SIL Open Font License, Version 1.1');
    }
    expect(total).toBeLessThan(64 * 1024);
  });

  it('nella cartella non ci sono caratteri senza credito ne\' licenze senza carattere', async () => {
    const fs = await fileSystem();
    const credited = new Set(Object.values(FONT_CREDITS).flatMap((credit) => [...credit.files, credit.licenseFile]));
    for (const file of fs.readdirSync(FONTS)) {
      if (file === 'LEGGIMI.md') continue;
      expect(credited.has(file), file).toBe(true);
    }
  });

  it('nel CSS Silkscreen si usa solo a 8 o 16 pixel, le misure a cui resta nitido', async () => {
    const fs = await fileSystem();
    const css = `${text(fs.readFileSync(STYLE))}\n${text(fs.readFileSync(MENU_STYLE))}`;
    const uses = css.split('\n').filter((line) => /font:[^;]*var\(--relic-pixel\)/.test(line));
    expect(uses.length).toBeGreaterThan(5);
    for (const line of uses) expect(line, line.trim()).toMatch(/font:\s*(?:bold\s+|700\s+)?(8|16)px[\s/]/);
    // Anche le regole che piu' avanti cambiano solo la misura di quegli elementi (classi e id, anche negli schermi piccoli).
    const rules = css.split('}').map((rule) => rule.split('{')).filter((parts) => parts.length >= 2).map((parts) => ({ selector: parts[parts.length - 2]!.trim(), body: parts[parts.length - 1]! }));
    const lastToken = (selector: string): string | undefined => selector.split(',').map((part) => part.trim().split(/\s+/).pop()!).map((compound) => compound.match(/[.#][\w-]+$/)?.[0]).find((token) => token !== undefined);
    const pixel = new Set(rules.filter((rule) => rule.body.includes('var(--relic-pixel)') && /font:/.test(rule.body)).map((rule) => lastToken(rule.selector)).filter((token): token is string => token !== undefined));
    expect(pixel.has('.hint')).toBe(true);
    for (const rule of rules) {
      const size = rule.body.match(/font-size:\s*(\d+)px/)?.[1];
      const token = lastToken(rule.selector);
      if (size === undefined || token === undefined || !pixel.has(token)) continue;
      expect(['8', '16'], `${rule.selector}: ${size}px`).toContain(size);
    }
  });

  it('il CSS dichiara ogni file con @font-face e usa le tre variabili del tema invece di Georgia e monospace', async () => {
    const fs = await fileSystem();
    const css = text(fs.readFileSync(STYLE));
    for (const credit of Object.values(FONT_CREDITS)) {
      expect(css, credit.title).toContain(`font-family: '${credit.title}'`);
      for (const file of credit.files) expect(css, file).toContain(`url('./assets/fonts/${file}')`);
    }
    expect(css).toMatch(/--relic-title: 'Grenze Gotisch'/);
    expect(css).toMatch(/--relic-pixel: 'Silkscreen'/);
    // Georgia resta solo come riserva del titolo; monospace solo come riserva e nel pannello FPS (strumento di sviluppo).
    expect(css.match(/Georgia/g)?.length).toBe(1);
    const monospace = css.split('\n').filter((line) => /\bmonospace\b/.test(line) && !line.includes('--relic-pixel:') && !line.includes('performance-'));
    expect(monospace).toEqual([]);
  });

  it('nel menu i testi hanno contrasto sufficiente sui loro fondi (almeno 4,5:1)', async () => {
    const fs = await fileSystem();
    const css = text(fs.readFileSync(MENU_STYLE));
    const token = (name: string): string => css.match(new RegExp(`--forge-${name}:\\s*(#[0-9a-f]{6})`))![1]!;
    const luminance = (hex: string): number => {
      const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string): number => {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
      return (high + 0.05) / (low + 0.05);
    };
    for (const [foreground, background] of [['text', 'panel'], ['muted', 'panel'], ['disabled', 'panel'], ['text', 'crimson'], ['copper-light', 'panel'], ['amber', 'panel'], ['disabled', 'surface']] as const) {
      expect(contrast(token(foreground), token(background)), `${foreground} su ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    // La parte centrale delle placche, normale e selezionata.
    expect(contrast(token('text'), '#2c282b')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('text'), '#3f393d')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('disabled'), '#231f23')).toBeGreaterThanOrEqual(4.5);
  });

  it('il canvas usa le stesse famiglie del CSS', () => {
    expect(CANVAS_FONTS.title).toContain('Grenze Gotisch');
    expect(CANVAS_FONTS.pixel).toContain('Silkscreen');
    expect(canvasFont(8, 'pixel', 'bold')).toBe("bold 8px 'Silkscreen', monospace");
    expect(canvasFont(9, 'text')).toBe('9px system-ui, sans-serif');
    // Silkscreen solo ai multipli di 8.
    expect(canvasFont(11, 'pixel')).toBe("8px 'Silkscreen', monospace");
    expect(canvasFont(13, 'pixel', 'bold')).toBe("bold 16px 'Silkscreen', monospace");
    expect(canvasFont(3, 'pixel')).toBe("8px 'Silkscreen', monospace");
  });
});
