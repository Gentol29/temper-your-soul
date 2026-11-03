import { describe, expect, it } from 'vitest';
import { characterPixels, WEARABLES } from './character-art';
import { ITEM_FAMILIES } from '../items/item-families';
import { Character } from '../character/character';
import { deserializeCharacter, serializeCharacter } from '../character/save-format';
import type { CharacterAppearance } from '../character/appearance';

describe('corpi e strati equipaggiamento', () => {
  it('due basi generiche distinte, in entrambe le risoluzioni', () => {
    for(const resolution of ['game','portrait'] as const) {
      const male=characterPixels({body:'male',equipment:{}},resolution);
      const female=characterPixels({body:'female',equipment:{}},resolution);
      expect(male.pixels).not.toEqual(female.pixels);
      expect(male.width).toBe(resolution==='game'?64:128);
      expect(male.height).toBe(resolution==='game'?64:128);
    }
  });
  it('la base femminile ha una sagoma propria: coda alta, vita stretta e fianchi', () => {
    const rowWidth=(row:readonly string[])=>{const filled=row.flatMap((color,x)=>color?[x]:[]);return filled.length?filled[filled.length-1]!-filled[0]!+1:0;};
    const female=characterPixels({body:'female',equipment:{}},'portrait').pixels;
    const male=characterPixels({body:'male',equipment:{}},'portrait').pixels;
    const hairColors=new Set(['#a8492c','#d87a3f','#6e2f22']);
    expect(female.flat().filter(color=>hairColors.has(color)).length).toBeGreaterThan(60);
    expect(male.flat().some(color=>hairColors.has(color))).toBe(false);
    // Coda a sinistra del viso, oltre la sagoma della testa maschile.
    const left=(rows:readonly (readonly string[])[])=>Math.min(...rows.slice(10,50).map(row=>{const x=row.findIndex(Boolean);return x<0?Infinity:x;}));
    expect(left(female)).toBeLessThan(left(male));
    // Differenze misurate sulle righe delle gambe, senza braccia.
    const legRows=female.slice(100,112),maleLegRows=male.slice(100,112);
    const avg=(rows:readonly (readonly string[])[])=>rows.reduce((sum,row)=>sum+rowWidth(row),0)/rows.length;
    expect(avg(legRows)).toBeLessThan(avg(maleLegRows));
  });
  it('tutte le famiglie hanno uno strato proprio, visibile per entrambi i corpi e nelle due versioni', () => {
    expect(Object.keys(WEARABLES)).toHaveLength(ITEM_FAMILIES.length);
    for(const body of ['male','female'] as const) for(const resolution of ['game','portrait'] as const) {
      const signatures=new Set<string>();
      const base=characterPixels({body,equipment:{}},resolution);
      for(const family of ITEM_FAMILIES) {
        expect(WEARABLES[family.id]?.slot).toBe(family.slot);
        const appearance: CharacterAppearance={body,equipment:{[family.slot]:{uid:'test',familyId:family.id,rarity:'common'}}};
        const art=characterPixels(appearance,resolution);
        expect(art.pixels, family.id).not.toEqual(base.pixels);
        expect(art.pixels).toHaveLength(art.height);
        for(const row of art.pixels) expect(row).toHaveLength(art.width);
        signatures.add(JSON.stringify(art.pixels));
      }
      expect(signatures.size).toBe(ITEM_FAMILIES.length);
    }
  });
  it('la scelta viene salvata e i vecchi dati mantengono inventario e XP', () => {
    const c=Character.createStarter();c.bodyType='female';c.totalXp=270;
    expect(deserializeCharacter(serializeCharacter(c))?.bodyType).toBe('female');
    const old=JSON.parse(serializeCharacter(c));old.version=2;delete old.bodyType;
    const restored=deserializeCharacter(JSON.stringify(old))!;
    expect(restored.bodyType).toBeNull();
    expect(restored.totalXp).toBe(270);expect(restored.inventory).toEqual(c.inventory);
    old.bodyType='invalido';expect(deserializeCharacter(JSON.stringify(old))?.bodyType).toBeNull();
  });
  it('cambio e rimozione oggetto cambiano lo sprite senza modificare gli asset o la base', () => {
    const c=Character.createStarter();
    const before=characterPixels(c.appearance(),'game');
    c.unequip('primary_hand');
    expect(characterPixels(c.appearance(),'game').pixels).not.toEqual(before.pixels);
    c.equip('i1');
    expect(characterPixels(c.appearance(),'game').pixels).toEqual(before.pixels);
    expect(characterPixels(c.appearance(),'game',1,true).pixels).not.toEqual(before.pixels);
  });
  it('riposo, camminata e lancio producono fotogrammi distinti per entrambi i corpi e mantengono le dimensioni', () => {
    for(const body of ['male','female'] as const) {
      const c=Character.createStarter();c.bodyType=body;
      for(const state of ['idle','walk','cast'] as const) {
        const frames=Array.from({length:12},(_,frame)=>characterPixels(c.appearance(),'game',0,false,{state,frame}));
        expect(new Set(frames.map(art=>JSON.stringify(art.pixels))).size,state).toBeGreaterThanOrEqual(state==='idle'?2:4);
        for(const art of frames){expect(art.width).toBe(64);expect(art.height).toBe(64);}
      }
    }
  });
  it('un UID diverso non cambia gli asset e la composizione non modifica gli oggetti equipaggiati', () => {
    const c=Character.createStarter();
    const snapshot=JSON.stringify(c.appearance());
    const first=characterPixels(c.appearance(),'portrait');
    c.inventory=c.inventory.map(item=>({...item,uid:'nuovo-'+item.uid}));
    for(const slot of Object.keys(c.equipped) as Array<keyof typeof c.equipped>) c.equipped[slot]='nuovo-'+c.equipped[slot];
    expect(characterPixels(c.appearance(),'portrait')).toBe(first);
    expect(snapshot).not.toBe(JSON.stringify(c.appearance()));
    const before=JSON.stringify(c.appearance());characterPixels(c.appearance(),'portrait',3,true);
    expect(JSON.stringify(c.appearance())).toBe(before);
  });
});
