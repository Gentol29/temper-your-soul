import { describe, expect, it } from 'vitest';
import { ITEM_FAMILIES } from '../items/item-families';
import { PORTRAIT_LAYERS } from './portrait-atlas';
import { PORTRAIT_ATLASES, PORTRAIT_CROPS } from './portrait-layout';
import { CLASS_POSES } from './portrait-rig';
import { characterPixels } from './character-art';
import { hasRearGrip, drawWearable } from './wearable-draw';
import { WEARABLES } from './character-art';
import { bodyAnchors } from './adventurer-body';
import { PixelPainter } from './pixel-painter';
import { dungeonItemPortrait } from './dungeon-item-portraits';

describe('ritratti illustrati e profondita', () => {
  it('ogni oggetto ha un ritaglio illustrato e una registrazione dello slot corretta', () => {
    expect(Object.keys(PORTRAIT_LAYERS)).toHaveLength(17);
    for(const family of ITEM_FAMILIES) {
      const modular=dungeonItemPortrait({uid:'test',familyId:family.id,rarity:'common'},'male');
      if(modular){expect(modular.texture.url).toContain('data:image/svg+xml');expect(modular.pixels.pixels.flat().some(Boolean)).toBe(true);continue;}
      const layer=PORTRAIT_LAYERS[family.id]!;
      expect(layer.slot,family.id).toBe(family.slot);
      const atlas=PORTRAIT_ATLASES[layer.atlas];
      for(const crop of PORTRAIT_CROPS[family.id]!) {
        if(!crop)continue;
        expect(crop[0]).toBeGreaterThanOrEqual(0);expect(crop[1]).toBeGreaterThanOrEqual(0);
        expect(crop[0]+crop[2]).toBeLessThanOrEqual(atlas.width);
        expect(crop[1]+crop[3]).toBeLessThanOrEqual(atlas.height);
      }
      if(family.slot==='armor')expect(PORTRAIT_CROPS[family.id]![1],family.id+' femminile').toBeDefined();
    }
    expect(CLASS_POSES.warrior.male.crop).not.toEqual(CLASS_POSES.warrior.female.crop);
  });
  it('la figura femminile e piu esile anche sotto il collo, senza contare capelli o viso', () => {
    const male=characterPixels({body:'male',equipment:{}},'game');
    const female=characterPixels({body:'female',equipment:{}},'game');
    // Corpo nativo 48 con margine di 8: busto/vita nelle righe 28–39, sotto la testa.
    const area=(pixels:typeof male.pixels)=>pixels.slice(28,40).flat().filter(Boolean).length;
    expect(area(female.pixels)).toBeLessThan(area(male.pixels));
  });
  it('arma lunga separata in parti dietro e davanti, mentre spada e futuro scudo restano davanti', () => {
    expect(hasRearGrip('hammer')).toBe(true);expect(hasRearGrip('bow')).toBe(true);
    expect(hasRearGrip('sword')).toBe(false);expect(hasRearGrip('shield')).toBe(false);
    const appearance={body:'male' as const,equipment:{primary_hand:{uid:'t',familyId:'forge_hammer',rarity:'common' as const}}};
    const a=bodyAnchors({state:'idle',frame:0});
    for(const depth of ['back','front'] as const) {
      const layer=new PixelPainter(64,64,1,12,4);
      drawWearable(layer,appearance,'primary_hand',WEARABLES.forge_hammer!,a,depth);
      expect(layer.pixels.flat().some(Boolean),depth).toBe(true);
    }
  });
  it('la testa del martello non copre il viso in alcun fotogramma, su entrambi i corpi', () => {
    for(const body of ['male','female'] as const)for(let frame=0;frame<8;frame++){
      const layer=new PixelPainter(64,64,1,12,4);
      const appearance={body,equipment:{primary_hand:{uid:'t',familyId:'forge_hammer',rarity:'common' as const}}};
      const a=bodyAnchors({state:'cast',frame},body);
      drawWearable(layer,appearance,'primary_hand',WEARABLES.forge_hammer!,a,'front');
      for(let y=7;y<20;y++)for(let x=16;x<27;x++)expect(layer.pixels[y+4]![x+12],`${body} fotogramma ${frame}`).toBe('');
    }
  });
});
