import {describe,it,expect} from 'vitest';
import {characterPixels} from './character-art';
import {shadowMotion,shadowMotionForSlot,SHADOW_ANIMATION} from './shadow-motion';
import {SHADOW_EQUIPMENT,SHADOW_GRIP,drawShadowHeld} from './shadow-equipment';
import {PixelPainter} from './pixel-painter';
import {playerCastFrame,PLAYER_CAST_POSE} from './poses';
import {ITEM_FAMILIES} from '../items/item-families';
import type {CharacterAppearance} from '../character/appearance';

describe('C · Cacciatore d’ombre modulare',()=>{
  it('il gesto raggiunge colpo e recupero anche prima di una nuova primaria rapida',()=>{
    for(const cadence of [.09,.12,.2,.45]){
      const frames=Array.from({length:Math.ceil(Math.min(cadence,PLAYER_CAST_POSE)*60)},(_,step)=>playerCastFrame(PLAYER_CAST_POSE-step/60,cadence)).filter((f):f is number=>f!==null);
      expect(Math.max(...frames),String(cadence)).toBeGreaterThanOrEqual(9);
      expect(playerCastFrame(PLAYER_CAST_POSE-Math.min(cadence,PLAYER_CAST_POSE),cadence)).toBeNull();
    }
  });
  it('il piede sollevato avanza e quello in appoggio arretra durante la camminata',()=>{
    for(let f=0;f<SHADOW_ANIMATION.frames;f++){
      const before=shadowMotion('archer',f,'walk'),after=shadowMotion('archer',f+1,'walk');
      const leftTravel=before.stride-after.stride,rightTravel=after.stride-before.stride;
      if(before.leftLift>.01&&after.leftLift>.01)expect(leftTravel,`sinistro ${f}`).toBeGreaterThan(0);
      if(before.rightLift>.01&&after.rightLift>.01)expect(rightTravel,`destro ${f}`).toBeGreaterThan(0);
      if(before.leftLift<.01&&after.leftLift<.01)expect(leftTravel,`appoggio sinistro ${f}`).toBeLessThan(0);
      if(before.rightLift<.01&&after.rightLift<.01)expect(rightTravel,`appoggio destro ${f}`).toBeLessThan(0);
    }
  });
  it('indietreggiare rispetto alla mira inverte il ciclo, preservando lo sprite equipaggiato',()=>{
    const appearance:CharacterAppearance={body:'female',characterClass:'archer',equipment:{primary_hand:{uid:'b',familyId:'thorn_bow',rarity:'rare'}}};
    expect(characterPixels(appearance,'game',0,false,{state:'walk',frame:2,walkDirection:-1})).toBe(characterPixels(appearance,'game',0,false,{state:'walk',frame:10}));
    expect(characterPixels(appearance,'game',0,false,{state:'walk',frame:2}).pixels).not.toEqual(characterPixels(appearance,'game',0,false,{state:'walk',frame:2,walkDirection:-1}).pixels);
  });
  it('tutte le 25 famiglie restano distinte, scure e visibili su entrambi i corpi',()=>{
    expect(Object.keys(SHADOW_EQUIPMENT).sort()).toEqual(ITEM_FAMILIES.map(f=>f.id).sort());
    for(const body of ['male','female']as const){
      const signatures=new Set<string>();
      for(const family of ITEM_FAMILIES){
        const base:CharacterAppearance={body,characterClass:family.characterClass,equipment:{}};
        const appearance={...base,equipment:{[family.slot]:{uid:family.id,familyId:family.id,rarity:'common' as const}}};
        const art=characterPixels(appearance,'game');
        expect(art.pixels,family.id).not.toEqual(characterPixels(base,'game').pixels);
        signatures.add(JSON.stringify(art.pixels));
        const colors=art.pixels.flat().filter(Boolean);
        expect(colors.filter(c=>Math.max(...[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)))>180).length/colors.length).toBeLessThan(.08);
      }
      expect(signatures.size).toBe(25);
    }
  });
  it('ogni arma ha materiale sotto la stessa presa canonica e non ridisegna la pelle',()=>{
    for(const art of Object.values(SHADOW_EQUIPMENT).filter(a=>a.slot==='primary_hand'||a.slot==='secondary_hand')){
      const p=new PixelPainter(48,48);drawShadowHeld(p,art);
      expect(p.pixels.slice(SHADOW_GRIP.y-1,SHADOW_GRIP.y+2).some(row=>row.slice(SHADOW_GRIP.x-1,SHADOW_GRIP.x+2).some(Boolean)),art.shape).toBe(true);
      expect(p.pixels.flat().some(c=>['#ae7d69','#63483f','#c69b81'].includes(c))).toBe(false);
    }
  });
  it('le primarie non coprono il viso durante riposo e cammino',()=>{
    const skin=new Set(['#ae7d69','#63483f','#c69b81']);
    for(const body of ['male','female']as const)for(const family of ITEM_FAMILIES.filter(f=>f.slot==='primary_hand'))for(const state of ['idle','walk']as const)for(let frame=0;frame<12;frame++){
      const base:CharacterAppearance={body,characterClass:family.characterClass,equipment:{}};
      const plain=characterPixels(base,'game',0,false,{state,frame});
      const equipped=characterPixels({...base,equipment:{primary_hand:{uid:'w',familyId:family.id,rarity:'common'}}},'game',0,false,{state,frame});
      for(let y=0;y<27;y++)for(let x=0;x<64;x++)if(skin.has(plain.pixels[y][x]))expect(equipped.pixels[y][x],`${body}/${family.id}/${state}/${frame}/${x},${y}`).toBe(plain.pixels[y][x]);
    }
  });
  it('tutte le 68 combinazioni di classe restano modulari sui due corpi, senza tagliare le pose estreme',()=>{
    let combinations=0;
    const slots=['primary_hand','secondary_hand','armor','boots']as const;
    for(const kind of ['warrior','archer','mage']as const){
      const pool=slots.map(slot=>ITEM_FAMILIES.filter(f=>f.characterClass===kind&&f.slot===slot));
      for(const primary of pool[0])for(const secondary of pool[1])for(const armor of pool[2])for(const boots of pool[3]){
        combinations++;
        for(const body of ['male','female']as const){
          const equipment=Object.fromEntries([primary,secondary,armor,boots].map(f=>[f.slot,{uid:f.id,familyId:f.id,rarity:'epic' as const}]));
          const appearance:CharacterAppearance={body,characterClass:kind,equipment};
          const complete=characterPixels(appearance,'game');
          for(const slot of slots){
            const removed={...equipment};delete removed[slot];
            expect(characterPixels({...appearance,equipment:removed},'game').pixels,`${kind}/${body}/${slot}`).not.toEqual(complete.pixels);
            for(const frame of [3,6]){
              const art=characterPixels(appearance,'game',0,false,{state:'cast',frame,attackSlot:slot});
              expect(art.pixels[0]!.every(c=>!c)&&art.pixels[63]!.every(c=>!c)&&art.pixels.every(row=>!row[0]&&!row[63]),`${kind}/${body}/${primary.id}/${slot}/${frame}`).toBe(true);
            }
          }
        }
      }
    }
    expect(combinations).toBe(68);
  },20000);
  it('gli attacchi dei quattro slot sono diversi e le impugnature non dipendono dalla famiglia',()=>{
    for(const kind of ['warrior','archer','mage']as const){
      const motions=['primary_hand','secondary_hand','armor','boots'].map(slot=>shadowMotionForSlot(kind,5,'attack',slot as 'primary_hand'|'secondary_hand'|'armor'|'boots'));
      expect(new Set(motions.map(m=>JSON.stringify(m))).size).toBe(4);
    }
  });
  it('tutti i frame e tutti gli slot conservano un bordo trasparente per ogni oggetto e corpo',()=>{
    for(const body of ['male','female']as const)for(const family of ITEM_FAMILIES){
      const appearance:CharacterAppearance={body,characterClass:family.characterClass,equipment:{[family.slot]:{uid:family.id,familyId:family.id,rarity:'legendary'}}};
      for(const state of ['walk','cast']as const)for(let frame=0;frame<12;frame++){
        const art=characterPixels(appearance,'game',0,false,{state,frame,attackSlot:family.slot}),label=`${body}/${family.id}/${state}/${frame}`;
        expect(art.pixels[0]!.every(c=>!c)&&art.pixels[63]!.every(c=>!c)&&art.pixels.every(row=>!row[0]&&!row[63]),label).toBe(true);
      }
    }
  });
});
