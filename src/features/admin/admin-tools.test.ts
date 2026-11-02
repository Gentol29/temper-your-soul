import { describe, it, expect } from 'vitest';
import { Character } from '../character/character';
import { CHARACTER_CLASSES } from '../character/character-class';
import { deserializeCharacter, serializeCharacter } from '../character/save-format';
import { GEAR_SCORE } from '../items/gear-score';
import { ITEM_FAMILIES } from '../items/item-families';
import { bestiaryIds, classFamilyIds, grantClassItems, unlockBestiary } from './admin-tools';

describe('strumenti admin di sviluppo', () => {
  it('ogni famiglia del catalogo appartiene a una sola classe e ogni classe ne ha', () => {
    const all = CHARACTER_CLASSES.flatMap(classFamilyIds);
    expect(all.sort()).toEqual(ITEM_FAMILIES.map((f) => f.id).sort());
    for (const kind of CHARACTER_CLASSES) expect(classFamilyIds(kind).length).toBeGreaterThan(0);
  });

  it('dà tutti gli oggetti della classe, equipaggiabili, senza duplicarli a ogni clic', () => {
    for (const kind of CHARACTER_CLASSES) {
      const c = Character.createStarter(kind);
      c.completeCreation('Prova', 'female', kind);
      const added = grantClassItems(c, 'legendary');
      expect(added.map((i) => i.familyId).sort()).toEqual(classFamilyIds(kind).sort());
      for (const item of added) {
        expect(item.level).toBe(GEAR_SCORE.maxItemLevel);
        expect(c.canEquip(item.uid)).toBe(true);
        expect(c.equip(item.uid)).toBe(true);
      }
      expect(grantClassItems(c, 'legendary')).toHaveLength(0);
      expect(grantClassItems(c, 'rare')).toHaveLength(added.length);
    }
  });

  it('senza classe scelta non aggiunge nulla', () => {
    const c = new Character();
    expect(grantClassItems(c, 'epic')).toHaveLength(0);
  });

  it('apre tutto il bestiario conservando le uccisioni vere, e sopravvive al salvataggio', () => {
    const c = Character.createStarter('warrior');
    c.completeCreation('Prova', 'male', 'warrior');
    const ids = bestiaryIds();
    expect(ids.length).toBeGreaterThan(10);
    c.addKills({ [ids[0]!]: 7 });
    expect(unlockBestiary(c)).toBe(ids.length - 1);
    for (const id of ids) expect(c.bestiary[id]).toBeGreaterThan(0);
    expect(c.bestiary[ids[0]!]).toBe(7);
    expect(unlockBestiary(c)).toBe(0);
    expect(deserializeCharacter(serializeCharacter(c))!.bestiary).toEqual(c.bestiary);
  });
});
