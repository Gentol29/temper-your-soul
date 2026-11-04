import { describe, expect, it } from 'vitest';
import { CHARACTER_CLASSES } from '../character/character-class';
import { MENU_MODULES } from './menu-layout';
import { ALTAR, altarCrop, CLASS_ACCENTS } from './character-altar';

describe('soglia della pagina Personaggi', () => {
  it('ogni classe ha il suo colore, diverso dagli altri', () => {
    const colors = CHARACTER_CLASSES.map((kind) => CLASS_ACCENTS[kind]);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(colors).size).toBe(CHARACTER_CLASSES.length);
  });

  it('l\'inquadratura sta dentro lo sprite della cattedrale', () => {
    const cathedral = MENU_MODULES.find((module) => module.id === 'cathedral')!;
    expect(altarCrop.x).toBeGreaterThanOrEqual(0);
    expect(altarCrop.x + ALTAR.width).toBeLessThanOrEqual(cathedral.width);
    expect(altarCrop.y).toBeGreaterThanOrEqual(0);
    expect(altarCrop.y + ALTAR.height).toBeLessThanOrEqual(cathedral.height);
  });
});
