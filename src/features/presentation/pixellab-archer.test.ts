import { describe, expect, it } from 'vitest';
import type { CharacterAppearance } from '../character/appearance';
import { characterPixels } from './character-art';
import { characterFeetY, characterRenderFacing, usesNativeCharacterDirections } from './native-character';
import { PIXELLAB_ARCHER_BOW_ANGLES, PIXELLAB_ARCHER_BOW_MIRRORS, PIXELLAB_ARCHER_FRAMES } from './pixellab-archer-data';
import { PIXELLAB_ARCHER_CLIPS, PIXELLAB_ARCHER_DIRECTIONS, pixellabArcherFrameKey } from './pixellab-archer';
import { nativeSpriteViewFromAim } from './sprite-view';
import { PixelPainter } from './pixel-painter';
import { SHADOW_EQUIPMENT, drawShadowHeld, shadowTrim } from './shadow-equipment';

const archer: CharacterAppearance = { body: 'male', characterClass: 'archer', equipment: {} };
const item = (familyId: string) => ({ uid: familyId, familyId, rarity: 'common' as const });

describe('Arciere maschio PixelLab: otto direzioni autonome', () => {
  it('la mira distingue tutti gli otto settori, senza specchiare le mani', () => {
    const samples = [[1,0,'E'],[1,1,'SE'],[0,1,'S'],[-1,1,'SW'],[-1,0,'W'],[-1,-1,'NW'],[0,-1,'N'],[1,-1,'NE']] as const;
    for (const [x,y,direction] of samples) expect(nativeSpriteViewFromAim(x,y)).toBe(direction);
    expect(characterRenderFacing(archer,-1)).toBe(1);
    expect(characterRenderFacing({...archer,body:'female'},-1)).toBe(-1);
    expect(usesNativeCharacterDirections({...archer,characterClass:'mage'})).toBe(false);
    expect(usesNativeCharacterDirections({body:'male',equipment:{primary_hand:item('hunter_bow')}})).toBe(true);
    expect(characterFeetY(archer)).toBe(61);
  });

  it('contiene tutti i frame di riposo, camminata e attacco nelle otto direzioni', () => {
    expect(Object.keys(PIXELLAB_ARCHER_FRAMES)).toHaveLength(8*(4+6+4));
    for (const direction of PIXELLAB_ARCHER_DIRECTIONS) for (const [clip,count] of Object.entries(PIXELLAB_ARCHER_CLIPS)) {
      const signatures = new Set<string>();
      for (let index=0;index<count;index++) {
        const source = PIXELLAB_ARCHER_FRAMES[`${clip}_${direction}_${index}`];
        expect(source, `${clip}/${direction}/${index}`).toBeDefined();
        signatures.add(source.rows);
        const state = clip==='attack' ? 'cast' : clip as 'idle'|'walk';
        const art = characterPixels(archer,'game',0,false,{state,frame:index*12/count,direction});
        expect(art.width).toBe(64); expect(art.height).toBe(64);
        expect(art.pixels[0].every(c=>!c) && art.pixels[63].every(c=>!c) && art.pixels.every(row=>!row[0]&&!row[63])).toBe(true);
        expect(art.pixels.flat().filter(Boolean).length).toBeGreaterThan(200);
      }
      expect(signatures.size, `${clip}/${direction}`).toBeGreaterThanOrEqual(clip==='idle'?2:3);
    }
  });

  it('la cache distingue est e ovest; ovest non è una copia specchiata di est', () => {
    const east = characterPixels(archer,'game',0,false,{state:'idle',frame:0,direction:'E'});
    const west = characterPixels(archer,'game',0,false,{state:'idle',frame:0,direction:'W'});
    expect(west).not.toBe(east);
    expect(west.pixels).not.toEqual(east.pixels.map(row=>[...row].reverse()));
    expect(characterPixels(archer,'game',0,false,{state:'idle',frame:0,direction:'W'})).toBe(west);
  });

  it('primaria destra e secondaria sinistra restano anatomiche di fronte e di spalle', () => {
    const south = PIXELLAB_ARCHER_FRAMES.idle_S_0, north = PIXELLAB_ARCHER_FRAMES.idle_N_0;
    expect(south.hand[0]).toBeLessThan(south.far[0]);
    expect(north.hand[0]).toBeGreaterThan(north.far[0]);
    for (const source of Object.values(PIXELLAB_ARCHER_FRAMES)) for (const anchor of [source.hand,source.far]) {
      expect(anchor[0]).toBeGreaterThan(0); expect(anchor[0]).toBeLessThan(64);
      expect(anchor[1]).toBeGreaterThan(0); expect(anchor[1]).toBeLessThan(64);
    }
  });

  it('ogni oggetto compatibile cambia un layer e la rimozione ripristina il corpo in tutte le viste', () => {
    const pieces = [['primary_hand','hunter_bow'],['primary_hand','thorn_bow'],['secondary_hand','spore_fan'],['armor','reed_mantle'],['boots','wind_boots']] as const;
    for (const direction of PIXELLAB_ARCHER_DIRECTIONS) for (const state of ['idle','walk','cast'] as const) {
      const motion = { state, frame:4, direction };
      const base = characterPixels(archer,'game',0,false,motion);
      const signatures = new Set<string>();
      for (const [slot,id] of pieces) {
        const appearance = {...archer,equipment:{[slot]:item(id)}};
        const before = JSON.stringify(appearance);
        const art = characterPixels(appearance,'game',0,false,motion);
        // Nel tiro verso nord l'arco è interamente davanti al torace, coperto dal mantello.
        if (direction==='N' && state==='cast' && id==='hunter_bow') expect(art.pixels).toEqual(base.pixels);
        else expect(art.pixels, `${direction}/${state}/${id}`).not.toEqual(base.pixels);
        expect(JSON.stringify(appearance)).toBe(before);
        signatures.add(JSON.stringify(art.pixels));
        expect(characterPixels({...appearance,equipment:{}},'game',0,false,motion)).toBe(base);
      }
      expect(signatures.size).toBe(pieces.length);
    }
  });

  it('il colpo completo viene campionato anche a cadenza rapida, senza cambiare le regole', () => {
    expect(pixellabArcherFrameKey({state:'cast',frame:0,direction:'NW'})).toBe('attack_NW_0');
    expect(pixellabArcherFrameKey({state:'cast',frame:11,direction:'NW'})).toBe('attack_NW_3');
    expect(pixellabArcherFrameKey({state:'cast',frame:11,direction:'NW',attackSlot:'armor'})).toBe('idle_NW_3');
  });

  it('arco abbassato a riposo, sinistra sulla corda e trazione verso il viso', () => {
    for (const direction of PIXELLAB_ARCHER_DIRECTIONS) {
      const rest = PIXELLAB_ARCHER_FRAMES[`idle_${direction}_0`];
      const angle = PIXELLAB_ARCHER_BOW_ANGLES[`idle_${direction}_0`];
      expect(Math.abs(angle)).toBeGreaterThan(.7);
      const localX = PIXELLAB_ARCHER_BOW_MIRRORS[`idle_${direction}_0`] ? 2 : -2;
      const localY = -13+27*.35;
      const x = rest.hand[0]+localX*Math.cos(angle)-localY*Math.sin(angle);
      const y = rest.hand[1]+localX*Math.sin(angle)+localY*Math.cos(angle);
      expect(Math.hypot(rest.far[0]-x,rest.far[1]-y)).toBeLessThan(1);
      expect(rest.back[1]).toBeLessThan(rest.hand[1]);
      const drawn = PIXELLAB_ARCHER_FRAMES[`attack_${direction}_1`];
      expect(Math.hypot(drawn.hand[0]-drawn.far[0],drawn.hand[1]-drawn.far[1])).toBeGreaterThan(9);
    }
  });

  it('nessun equipaggiamento viene tagliato o spostato fuori dal frame in alcuna posa', () => {
    const equipped = {...archer,equipment:{primary_hand:item('thorn_bow'),secondary_hand:item('spore_fan'),armor:item('reed_mantle'),boots:item('wind_boots')}};
    for (const direction of PIXELLAB_ARCHER_DIRECTIONS) for (const state of ['idle','walk','cast'] as const) for(let frame=0;frame<12;frame++) {
      const art = characterPixels(equipped,'game',0,false,{state,frame,direction});
      expect(art.pixels[0].every(c=>!c) && art.pixels[63].every(c=>!c) && art.pixels.every(row=>!row[0]&&!row[63]),`${direction}/${state}/${frame}`).toBe(true);
    }
  });

  it('il cappuccio resta alzato e identico fra riposo, camminata e tiro', () => {
    for (const direction of PIXELLAB_ARCHER_DIRECTIONS) {
      const rest=characterPixels(archer,'game',0,false,{state:'idle',frame:0,direction});
      for (const state of ['idle','walk','cast'] as const) for(let frame=0;frame<12;frame++) {
        const art=characterPixels(archer,'game',0,false,{state,frame,direction});
        expect(art.pixels.slice(0,13),`${direction}/${state}/${frame}`).toEqual(rest.pixels.slice(0,13));
      }
    }
    // Falda esterna del cappuccio SE: nel primo lotto qui c'era lo sfondo e la testa era scoperta.
    const southeast=characterPixels(archer,'game',0,false,{state:'idle',frame:0,direction:'SE'});
    expect(southeast.pixels[10][27]).toBeTruthy();
  });

  it('busto, cintura e cosce non hanno interruzioni nelle otto viste o nei frame intermedi', () => {
    for (const direction of PIXELLAB_ARCHER_DIRECTIONS) for (const state of ['idle','walk','cast'] as const) for(let frame=0;frame<12;frame++) {
      const art=characterPixels(archer,'game',0,false,{state,frame,direction});
      for(let y=20;y<=50;y++) expect(art.pixels[y].slice(20,44).filter(Boolean).length,`${direction}/${state}/${frame}, riga ${y}`).toBeGreaterThanOrEqual(8);
    }
  });

  it('mantello e corpo coprono arti, corda e freccia nel tiro visto da dietro', () => {
    for (const direction of ['NW','N','NE'] as const) for(let frame=0;frame<12;frame++) {
      const motion={state:'cast' as const,frame,direction};
      const source=PIXELLAB_ARCHER_FRAMES[pixellabArcherFrameKey(motion)];
      expect(source.hand[2] || source.far[2]).toBe(false);
      const body=characterPixels(archer,'game',0,false,motion);
      const held=characterPixels({...archer,equipment:{primary_hand:item('hunter_bow')}},'game',0,false,motion);
      for(let y=0;y<64;y++) for(let x=0;x<64;x++) if(body.pixels[y][x]) expect(held.pixels[y][x],`${direction}/${frame}/${x},${y}`).toBe(body.pixels[y][x]);
    }
  });

  it('il profilo W conserva il mantello sul retro dal dorso fino all’orlo', () => {
    for(const state of ['idle','walk','cast'] as const) for(let frame=0;frame<12;frame++) {
      const art=characterPixels(archer,'game',0,false,{state,frame,direction:'W'});
      for(let y=28;y<50;y++) expect(art.pixels[y].slice(35,44).filter(Boolean).length,`${state}/${frame}, retro alla riga ${y}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('a riposo la corda resta sopra il legno, ribaltando solo l’arco', () => {
    for(const direction of PIXELLAB_ARCHER_DIRECTIONS) for(const clip of ['idle','walk'] as const) for(let frame=0;frame<PIXELLAB_ARCHER_CLIPS[clip];frame++) {
      const key=`${clip}_${direction}_${frame}`;
      const angle=PIXELLAB_ARCHER_BOW_ANGLES[key];
      const side=PIXELLAB_ARCHER_BOW_MIRRORS[key] ? -1 : 1;
      expect(-2*side*Math.sin(angle),`${key}: corda sopra la presa`).toBeLessThan(0);
      expect(4*side*Math.sin(angle),`${key}: legno sotto la presa`).toBeGreaterThan(0);
    }
    // Verifica anche i pixel composti: la vista E prima mostrava il legno sopra la corda.
    const art=characterPixels({...archer,equipment:{primary_hand:item('hunter_bow')}},'game',0,false,{state:'idle',frame:0,direction:'E'});
    const meanY=(color:string):number=>{
      const ys=art.pixels.flatMap((row,y)=>row.filter(c=>c===color).map(()=>y));
      expect(ys.length).toBeGreaterThan(3);
      return ys.reduce((sum,y)=>sum+y,0)/ys.length;
    };
    expect(meanY('#8f7f77')).toBeLessThan(meanY('#58423d'));
    // Il tiro conserva il verso dell'arco rivolto al bersaglio.
    for(const direction of PIXELLAB_ARCHER_DIRECTIONS) expect(PIXELLAB_ARCHER_BOW_MIRRORS[`attack_${direction}_1`]).toBe(['W','SW','NW'].includes(direction));
  });

  it('in S il braccio nella sinistra dell’immagine parte sotto la spalla esterna', () => {
    for(const state of ['idle','walk'] as const) for(let frame=0;frame<12;frame++) {
      const art=characterPixels(archer,'game',0,false,{state,frame,direction:'S'});
      // Fascia dell’omero sotto la spalla: il precedente innesto troppo interno lasciava qui lo sfondo.
      for(let y=23;y<=28;y++) expect(art.pixels[y][17],`${state}/${frame}, spalla/omero alla riga ${y}`).toBeTruthy();
    }
  });

  it('l’impugnatura E resta in primo piano sopra vestiario e polsino per entrambi gli archi', () => {
    for(const id of ['hunter_bow','thorn_bow']) for(const state of ['idle','walk','cast'] as const) for(let frame=0;frame<12;frame++) {
      const motion={state,frame,direction:'E' as const};
      const key=pixellabArcherFrameKey(motion),source=PIXELLAB_ARCHER_FRAMES[key];
      const weapon=new PixelPainter(48,48);
      drawShadowHeld(weapon,SHADOW_EQUIPMENT[id],shadowTrim(item(id)),state==='cast' && frame>=3 && frame<=5);
      if(PIXELLAB_ARCHER_BOW_MIRRORS[key]) for(const row of weapon.pixels) {
        const original=[...row];
        for(let x=0;x<row.length;x++) row[x]=original[50-x]??'';
      }
      const grip=new PixelPainter(64,64);
      grip.stamp(weapon,25,26,source.hand[0],source.hand[1],PIXELLAB_ARCHER_BOW_ANGLES[key],{minY:25,maxY:28});
      const appearance={...archer,equipment:{primary_hand:item(id),armor:item('reed_mantle'),boots:item('wind_boots')}};
      const art=characterPixels(appearance,'game',0,false,motion);
      let checked=0,mismatches=0;
      for(let y=0;y<64;y++) for(let x=0;x<64;x++) if(grip.pixels[y][x]) {
        checked++;
        if(art.pixels[y][x]!==grip.pixels[y][x]) mismatches++;
      }
      expect(checked).toBeGreaterThan(3);
      expect(mismatches,`${id}/${state}/${frame}: impugnatura coperta`).toBe(0);
    }
  });
});
