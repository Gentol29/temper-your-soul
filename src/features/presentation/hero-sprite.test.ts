import { describe, expect, it } from 'vitest';
import type { CharacterAppearance } from '../character/appearance';
import { ITEM_FAMILIES } from '../items/item-families';
import { ARCHER_FRAMES, ARCHER_OUTLINE, ARCHER_SYMBOLS, ARCHER_VOID } from './archer-sprite-data';
import { CHARACTER_ART, characterPixels } from './character-art';
import { ARCHER_SPEC, WARRIOR_SPEC } from './hero-specs';
import { HERO_HEAD_ROWS } from './hero-sprite';
import { SPRITE_VIEWS } from './sprite-view';
import { WARRIOR_FRAMES, WARRIOR_OUTLINE, WARRIOR_SYMBOLS, WARRIOR_VOID } from './warrior-sprite-data';

type Kind = 'warrior' | 'archer';
const KINDS: readonly Kind[] = ['warrior', 'archer'];
const BODIES = ['male', 'female'] as const;
const DATA = {
  warrior: { frames: WARRIOR_FRAMES, symbols: WARRIOR_SYMBOLS, outline: WARRIOR_OUTLINE, voidSymbol: WARRIOR_VOID, spec: WARRIOR_SPEC },
  archer: { frames: ARCHER_FRAMES, symbols: ARCHER_SYMBOLS, outline: ARCHER_OUTLINE, voidSymbol: ARCHER_VOID, spec: ARCHER_SPEC },
} as const;
const CLIPS = { idle: 4, walk: 6, primary_hand: 6, secondary_hand: 6, armor: 6, boots: 6 } as const;
const hero = (characterClass: Kind, body: 'male' | 'female', equipment: CharacterAppearance['equipment'] = {}): CharacterAppearance => ({ body, characterClass, equipment });
const item = (familyId: string) => ({ uid: familyId, familyId, rarity: 'legendary' as const });
const familiesOf = (kind: Kind, slot: string) => ITEM_FAMILIES.filter((f) => f.characterClass === kind && f.slot === slot);
const free = (pixels: readonly (readonly string[])[]): boolean => pixels[0]!.every((c) => !c) && pixels[63]!.every((c) => !c) && pixels.every((row) => !row[0] && !row[63]);

describe('Guerriero e Arciere resi in 3D', () => {
  it('ogni corpo ha tutti i fotogrammi di ogni animazione in ogni vista, con gli agganci dentro il riquadro', () => {
    for (const kind of KINDS) {
      const { frames } = DATA[kind];
      for (const body of BODIES) for (const view of SPRITE_VIEWS) for (const [clip, count] of Object.entries(CLIPS)) for (let i = 0; i < count; i++) {
        const frame = frames[`${body}_${clip}_${view}_${i}`];
        expect(frame, `${kind}/${body}/${clip}/${view}/${i}`).toBeDefined();
        for (const [x, y] of [frame!.hand, frame!.far, frame!.back]) expect(x > 0 && x < 64 && y > 0 && y < 64, `${kind}/${body}/${clip}/${view}/${i}`).toBe(true);
      }
      expect(Object.keys(frames), kind).toHaveLength(2 * SPRITE_VIEWS.length * 34);
    }
  });

  it('i simboli sono tutti noti e i materiali hanno tutti una rampa a sei toni', () => {
    for (const kind of KINDS) {
      const { frames, symbols, outline, voidSymbol, spec } = DATA[kind];
      for (const [key, frame] of Object.entries(frames)) {
        for (const symbol of new Set(frame.rows.replace(/[\d,.]/g, ''))) expect(symbol === outline || symbol === voidSymbol || Object.hasOwn(symbols, symbol), `${kind}/${key}: ${symbol}`).toBe(true);
      }
      for (const [material, tone] of Object.values(symbols)) expect((spec.ramps as Record<string, readonly string[]>)[material]?.[tone], `${kind}/${material}`).toBeDefined();
    }
  });

  it('le cinque viste sono diverse e i piedi poggiano sulla riga di gioco in ognuna', () => {
    for (const kind of KINDS) for (const body of BODIES) {
      const signatures = SPRITE_VIEWS.map((view) => JSON.stringify(characterPixels(hero(kind, body), 'game', 0, false, { state: 'idle', frame: 0, view }).pixels));
      expect(new Set(signatures).size, `${kind}/${body}`).toBe(SPRITE_VIEWS.length);
      for (const view of SPRITE_VIEWS) {
        const { pixels } = characterPixels(hero(kind, body), 'game', 0, false, { state: 'idle', frame: 0, view });
        const lowest = pixels.reduce((last, row, y) => (row.some(Boolean) ? y : last), 0);
        expect(lowest, `${kind}/${body}/${view}`).toBeGreaterThanOrEqual(CHARACTER_ART.feetY);
      }
    }
  });

  it('alla stessa scala del Mago: stessa altezza e piedi sulla stessa riga, a un pixel', () => {
    const rows = (characterClass: 'mage' | Kind, view: (typeof SPRITE_VIEWS)[number]): readonly [number, number] => {
      const { pixels } = characterPixels({ body: 'male', characterClass, equipment: {} }, 'game', 0, false, { state: 'idle', frame: 0, view });
      const filled = pixels.map((row, y) => (row.some(Boolean) ? y : -1)).filter((y) => y >= 0);
      return [filled[0]!, filled[filled.length - 1]!];
    };
    for (const view of SPRITE_VIEWS) {
      const [mageTop, mageBottom] = rows('mage', view);
      for (const kind of KINDS.filter((kind) => kind !== 'archer')) {
        const [top, bottom] = rows(kind, view);
        expect(Math.abs(bottom - mageBottom), `${kind}/${view} piedi`).toBeLessThanOrEqual(1);
        expect(Math.abs(bottom - top - (mageBottom - mageTop)), `${kind}/${view} altezza`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('armatura e stivali ricolorano il corpo senza cambiarne la sagoma; togliendoli torna la base', () => {
    const mask = (kind: Kind, equipment: CharacterAppearance['equipment']): string =>
      characterPixels(hero(kind, 'female', equipment), 'game').pixels.map((row) => row.map((c) => (c ? 1 : 0)).join('')).join('|');
    for (const kind of KINDS) for (const slot of ['armor', 'boots'] as const) for (const family of familiesOf(kind, slot)) {
      const equipment = { [slot]: item(family.id) };
      expect(mask(kind, equipment), family.id).toBe(mask(kind, {}));
      expect(characterPixels(hero(kind, 'female', equipment), 'game').pixels, family.id).not.toEqual(characterPixels(hero(kind, 'female'), 'game').pixels);
    }
  });

  it('nessun fotogramma di nessuna vista tocca il bordo, con ogni arma e oggetto della classe in mano', () => {
    for (const kind of KINDS) {
      const pairs = familiesOf(kind, 'primary_hand').flatMap((p) => familiesOf(kind, 'secondary_hand').map((s) => ({ primary_hand: item(p.id), secondary_hand: item(s.id) })));
      for (const equipment of pairs) for (const body of BODIES) for (const view of SPRITE_VIEWS) {
        for (const state of ['idle', 'walk'] as const) for (let frame = 0; frame < 12; frame += 2) {
          expect(free(characterPixels(hero(kind, body, equipment), 'game', 0, false, { state, frame, view }).pixels), `${kind}/${body}/${view}/${state}/${frame}`).toBe(true);
        }
        for (const attackSlot of ['primary_hand', 'secondary_hand', 'armor', 'boots'] as const) for (let frame = 0; frame < 12; frame++) {
          const { pixels } = characterPixels(hero(kind, body, equipment), 'game', 0, false, { state: 'cast', frame, view, attackSlot });
          expect(free(pixels), `${kind}/${body}/${view}/${attackSlot}/${frame}`).toBe(true);
        }
      }
    }
  }, 30000);

  it('a riposo e in marcia le armi non coprono viso e capelli in nessuna vista', () => {
    const head = new Set(Object.values(DATA).flatMap(({ spec }) => [...spec.ramps.pelle, ...spec.ramps.capelli]));
    for (const kind of KINDS) for (const family of familiesOf(kind, 'primary_hand')) for (const body of BODIES) for (const view of SPRITE_VIEWS) for (const state of ['idle', 'walk'] as const) for (let frame = 0; frame < 12; frame += 3) {
      if (kind === 'archer' && body === 'male') continue; // Il nuovo corpo ha verifiche dedicate su tutte le otto viste.
      const plain = characterPixels(hero(kind, body), 'game', 0, false, { state, frame, view });
      const held = characterPixels(hero(kind, body, { primary_hand: item(family.id) }), 'game', 0, false, { state, frame, view });
      for (let y = 0; y < HERO_HEAD_ROWS; y++) for (let x = 0; x < 64; x++) {
        if (head.has(plain.pixels[y]![x]!)) expect(held.pixels[y]![x], `${kind}/${family.id}/${body}/${view}/${state}/${frame}/${x},${y}`).toBe(plain.pixels[y]![x]);
      }
    }
  });

  it("l'arco si tende fra le due mani durante il tiro e la faretra sta sulla schiena", () => {
    const bow = { primary_hand: item('hunter_bow') };
    for (const body of BODIES) for (const view of SPRITE_VIEWS) {
      const rest = characterPixels(hero('archer', body, bow), 'game', 0, false, { state: 'cast', frame: 0, view, attackSlot: 'primary_hand' }).pixels.flat();
      const drawn = characterPixels(hero('archer', body, bow), 'game', 0, false, { state: 'cast', frame: 4, view, attackSlot: 'primary_hand' }).pixels.flat();
      // Corda tesa e freccia: colori che a riposo, con l'arco in mano, non ci sono.
      // Nel nuovo corpo PixelLab il mantello occlude la freccia quando il tiro punta a nord.
      expect(drawn.includes('#8f7a68'), `${body}/${view}`).toBe(!(body==='male' && view==='N'));
      expect(rest.includes('#8f7a68'), `${body}/${view}`).toBe(false);
      const quiver = characterPixels(hero('archer', body, { secondary_hand: item('spore_fan') }), 'game', 0, false, { state: 'idle', frame: 0, view });
      expect(quiver.pixels, `${body}/${view}`).not.toEqual(characterPixels(hero('archer', body), 'game', 0, false, { state: 'idle', frame: 0, view }).pixels);
    }
  });

  it('i corpi delle due classi sono diversi e il femminile e piu esile sotto il collo', () => {
    for (const view of SPRITE_VIEWS) {
      expect(characterPixels(hero('warrior', 'male'), 'game', 0, false, { state: 'idle', frame: 0, view }).pixels).not.toEqual(characterPixels(hero('archer', 'male'), 'game', 0, false, { state: 'idle', frame: 0, view }).pixels);
    }
    const area = (kind: Kind, body: 'male' | 'female'): number => characterPixels(hero(kind, body), 'game', 0, false, { state: 'idle', frame: 0, view: 'S' }).pixels.slice(28, 40).flat().filter(Boolean).length;
    for (const kind of KINDS) expect(area(kind, 'female'), kind).toBeLessThan(area(kind, 'male'));
  });
});
