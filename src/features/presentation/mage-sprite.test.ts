import { describe, expect, it } from 'vitest';
import type { CharacterAppearance } from '../character/appearance';
import { CHARACTER_ART, characterPixels } from './character-art';
import { MAGE_VIEWS, mageViewFromAim } from './mage-sprite';
import { MAGE_FRAMES, MAGE_OUTLINE, MAGE_SYMBOLS, MAGE_VOID } from './mage-sprite-data';

const mage = (body: 'male' | 'female', equipment: CharacterAppearance['equipment'] = {}): CharacterAppearance => ({ body, characterClass: 'mage', equipment });
const CLIPS = { idle: 4, walk: 6, primary_hand: 6, secondary_hand: 6, armor: 6, boots: 6 } as const;

describe('Mago reso in 3D', () => {
  it('ogni corpo ha tutti i fotogrammi di ogni animazione in ogni vista, con le mani dentro il riquadro', () => {
    for (const body of ['male', 'female']) for (const view of MAGE_VIEWS) for (const [clip, count] of Object.entries(CLIPS)) for (let i = 0; i < count; i++) {
      const frame = MAGE_FRAMES[`${body}_${clip}_${view}_${i}`];
      expect(frame, `${body}/${clip}/${view}/${i}`).toBeDefined();
      for (const [x, y] of [frame!.hand, frame!.far]) expect(x > 0 && x < 64 && y > 0 && y < 64, `${body}/${clip}/${view}/${i}`).toBe(true);
    }
    expect(Object.keys(MAGE_FRAMES)).toHaveLength(2 * MAGE_VIEWS.length * 34);
  });

  it('i simboli sono tutti noti', () => {
    for (const [key, frame] of Object.entries(MAGE_FRAMES)) {
      const symbols = new Set(frame.rows.replace(/[\d,.]/g, ''));
      for (const symbol of symbols) expect(symbol === MAGE_OUTLINE || symbol === MAGE_VOID || Object.hasOwn(MAGE_SYMBOLS, symbol), `${key}: ${symbol}`).toBe(true);
    }
  });

  it('le viste sono diverse e la mira sceglie quella giusta', () => {
    const signatures = MAGE_VIEWS.map((view) => JSON.stringify(characterPixels(mage('male'), 'game', 0, false, { state: 'idle', frame: 0, view }).pixels));
    expect(new Set(signatures).size).toBe(MAGE_VIEWS.length);
    expect(mageViewFromAim(0, 10)).toBe('S');
    expect(mageViewFromAim(10, 10)).toBe('SE');
    expect(mageViewFromAim(-10, 10)).toBe('SE');
    expect(mageViewFromAim(10, 0)).toBe('E');
    expect(mageViewFromAim(10, -10)).toBe('NE');
    expect(mageViewFromAim(0, -10)).toBe('N');
  });

  it('i piedi poggiano sulla riga di gioco in ogni vista: nessuno sprite sospeso', () => {
    for (const body of ['male', 'female'] as const) for (const view of MAGE_VIEWS) {
      const { pixels } = characterPixels(mage(body), 'game', 0, false, { state: 'idle', frame: 0, view });
      const lowest = pixels.reduce((last, row, y) => (row.some(Boolean) ? y : last), 0);
      expect(lowest, `${body}/${view}`).toBeGreaterThanOrEqual(CHARACTER_ART.feetY);
    }
  });

  it('armatura e stivali ricolorano il corpo senza cambiarne la sagoma; togliendoli torna la base', () => {
    const mask = (equipment: CharacterAppearance['equipment']): string => characterPixels(mage('female', equipment), 'game').pixels.map((row) => row.map((color) => (color ? 1 : 0)).join('')).join('|');
    const armor = { armor: { uid: 'a', familyId: 'tomb_shroud', rarity: 'rare' as const } };
    const boots = { boots: { uid: 'b', familyId: 'rime_boots', rarity: 'rare' as const } };
    expect(mask(armor)).toBe(mask({}));
    expect(mask(boots)).toBe(mask({}));
    expect(characterPixels(mage('female', armor), 'game').pixels).not.toEqual(characterPixels(mage('female'), 'game').pixels);
    expect(characterPixels(mage('female', boots), 'game').pixels).not.toEqual(characterPixels(mage('female'), 'game').pixels);
  });

  it('nessun fotogramma di nessuna vista viene tagliato, con le armi in mano', () => {
    const equipment = { primary_hand: { uid: 'p', familyId: 'arcane_staff', rarity: 'legendary' as const }, secondary_hand: { uid: 's', familyId: 'ossuary_lantern', rarity: 'legendary' as const } };
    for (const body of ['male', 'female'] as const) for (const view of MAGE_VIEWS) for (const state of ['idle', 'walk', 'cast'] as const) for (let frame = 0; frame < 12; frame++) {
      const { pixels } = characterPixels(mage(body, equipment), 'game', 0, false, { state, frame, view });
      expect(pixels[0]!.every((c) => !c) && pixels[63]!.every((c) => !c) && pixels.every((row) => !row[0] && !row[63]), `${body}/${view}/${state}/${frame}`).toBe(true);
    }
  });

  it('nel caricamento del colpo il bastone non passa sopra il viso', () => {
    const skin = new Set(['#ae7d69', '#63483f', '#c69b81']);
    const equipment = { primary_hand: { uid: 'p', familyId: 'arcane_staff', rarity: 'rare' as const } };
    for (const body of ['male', 'female'] as const) for (const view of MAGE_VIEWS) for (let frame = 0; frame < 6; frame++) {
      const plain = characterPixels(mage(body), 'game', 0, false, { state: 'cast', frame, view });
      const held = characterPixels(mage(body, equipment), 'game', 0, false, { state: 'cast', frame, view });
      const hand = MAGE_FRAMES[`${body}_primary_hand_${view}_${Math.floor(frame / 2)}`]!.hand;
      for (let y = 0; y < 26; y++) for (let x = 0; x < 64; x++) {
        // La mano alzata e' pelle anche lei, e l'impugnatura la copre di proposito: si controlla solo il viso.
        if (Math.hypot(x - hand[0], y - hand[1]) < 6) continue;
        if (skin.has(plain.pixels[y]![x]!)) expect(held.pixels[y]![x], `${body}/${view}/${frame}/${x},${y}`).toBe(plain.pixels[y]![x]);
      }
    }
  });

  it('le altre classi non cambiano con la vista', () => {
    const warrior: CharacterAppearance = { body: 'male', characterClass: 'warrior', equipment: {} };
    expect(characterPixels(warrior, 'game', 0, false, { state: 'idle', frame: 0, view: 'N' })).toBe(characterPixels(warrior, 'game', 0, false, { state: 'idle', frame: 0 }));
  });
});
