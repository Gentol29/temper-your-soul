import { Character } from '../../character/character';
import { Match } from '../../match/match';
import { CRYPT } from '../../dungeons/crypt';
import { SeededRng } from '../../../core/rng';
import * as assets from './assets';
import { Effects } from '../effects';
import { createQuietMatch } from '../../../testing';
import { describe, expect, it, vi } from 'vitest';
import { Vec2 } from '../../../core/vec2';
import { frameIndex, PIXELLAB_MANIFEST, VFX_IDS } from './assets';
import { SpriteEffects, PROJECTILE_VFX, burstPosition, buffVfx, replacesLegacy, drawPersistentVfx, CLEAVE_ART } from './sprite-effects';
import { particleVertices, PARTICLE_STRIDE, drawWebGLParticles } from './particle-webgl';
import type { Particle } from '../effects';
import { ITEM_SPRITES } from '../item-sprites';
import { ART_CREDITS } from '../art-credits';
import { ITEM_FAMILIES } from '../../items/item-families';
const NODE_FS = 'node:fs';
interface FileSystem { readFileSync(path: URL): Uint8Array }
const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const particle: Particle = { x: 10, y: 20, vx: 0, vy: 0, remaining: 0.5, total: 1, color: '#ff8040', size: 2, gravity: 0 };
describe('atlanti delle skill', () => {
  it('scorre tutti i frame, ripete solo i loop e ferma i one-shot sull’ultimo', () => {
    expect(frameIndex(12, 0, 24, false)).toBe(0);
    expect(frameIndex(12, 11 / 24, 24, false)).toBe(11);
    expect(frameIndex(12, 2, 24, false)).toBe(11);
    expect(frameIndex(12, 0.5, 24, true)).toBe(0);
    expect(frameIndex(12, -1, 24, true)).toBe(0);
  });
  it('ogni asset ha frame dentro il PNG locale RGBA e un’origine documentata', async () => {
    const fs = await import(/* @vite-ignore */ NODE_FS) as FileSystem;
    expect(Object.keys(PIXELLAB_MANIFEST.effects).sort()).toEqual([...VFX_IDS].sort());
    for (const asset of Object.values(PIXELLAB_MANIFEST.effects)) {
      const bytes = fs.readFileSync(new URL('../../../assets/vfx/pixellab/' + asset.file, import.meta.url));
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect([...bytes.slice(1, 4)]).toEqual([80, 78, 71]);
      expect(bytes[25]).toBe(6);
      const w = view.getUint32(16), h = view.getUint32(20);
      expect(asset.frames.length).toBeGreaterThan(1);
      expect(asset.fps).toBeGreaterThan(0);
      expect(asset.source).toMatch(/^https:\/\//);
      for (const [x, y, fw, fh] of asset.frames) {
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
        expect(x + fw).toBeLessThanOrEqual(w); expect(y + fh).toBeLessThanOrEqual(h);
        expect(asset.pivot[0]).toBeLessThanOrEqual(fw); expect(asset.pivot[1]).toBeLessThanOrEqual(fh);
      }
    }
    for (const [id, icon] of Object.entries(PIXELLAB_MANIFEST.icons)) {
      expect(ITEM_FAMILIES.some(family => family.id === id), id).toBe(true);
      // Le vecchie icone restano archiviate; gli oggetti attivi usano il nuovo disegno Hi-bit.
      expect(ITEM_SPRITES[id].size, id).toBe(32);
      expect(ITEM_SPRITES[id].image, id).toBeUndefined();
      expect(fs.readFileSync(new URL('../../../assets/vfx/pixellab/' + icon.file, import.meta.url)).length).toBeGreaterThan(100);
    }
    expect(Object.keys(PIXELLAB_MANIFEST.effects).length + Object.keys(PIXELLAB_MANIFEST.icons).length).toBeLessThanOrEqual(39);
    expect([...Object.values(PIXELLAB_MANIFEST.effects), ...Object.values(PIXELLAB_MANIFEST.icons)].reduce((sum, asset) => sum + asset.generations, 0)).toBeLessThanOrEqual(39);
    expect(ART_CREDITS['pixellab-vfx-items'].license).toBe('PixelLab-output');
  });
  it('distingue le esplosioni e non aggiunge aree o falsi sanguinamenti alle frecce', () => {
    const fx = new SpriteEffects(), position = new Vec2(20, 40);
    for (const [visual, id] of [['meteor','mage-fire-explosion'], ['veil_blast','mage-water-explosion'], ['mage_blink_burst','mage-blink']]) {
      fx.clear();fx.handle({type:'zone_detonated',team:'player',position,radius:80,visual});
      expect(fx.bursts[0].id).toBe(id);
    }
    fx.clear(); fx.handle({type:'projectile_hit',team:'player',position,radius:3,visual:'hunter_arrow',struck:'minion'});
    expect(fx.bursts).toHaveLength(0);
  });
  it('copre tutte le famiglie correnti con animazioni, incluse le esplosioni dei blink', () => {
    const origin = new Vec2(0, 0);
    for (const family of ITEM_FAMILIES) {
      const skill = family.skill, effect = skill.effect;
      if (effect.kind === 'buff') {
        expect(PIXELLAB_MANIFEST.effects[buffVfx(skill.visual)], family.id).toBeDefined();
        continue;
      }
      if (effect.kind === 'projectile') {
        expect(PROJECTILE_VFX[effect.projectile.visual], family.id).toBeDefined();
        continue;
      }
      const fx = new SpriteEffects();
      if (effect.kind === 'ground_blast') fx.handle({type:'zone_detonated',team:'player',position:origin,radius:effect.zone.radius,visual:effect.zone.visual});
      else fx.handle({type:'skill_cast',skillId:skill.id,visual:skill.visual,kind:effect.kind,origin,destination:new Vec2(40,0),angle:0,
        ...(effect.kind === 'dash' ? {travelSeconds:effect.travelSeconds} : {})});
      expect(fx.bursts.length, family.id).toBeGreaterThan(0);
      for (const burst of fx.bursts) expect(PIXELLAB_MANIFEST.effects[burst.id], family.id).toBeDefined();
      if (effect.kind === 'dash' && !effect.travelSeconds) expect(fx.bursts).toHaveLength(2);
    }
  });
  it('instrada gli elementi distintamente e limita/scade gli effetti simultanei', () => {
    expect(new Set(Object.values(PROJECTILE_VFX)).size).toBe(5);
    const fx = new SpriteEffects(), origin = new Vec2(10, 20);
    fx.handle({type:'skill_cast', skillId:'guardian_blade', visual:'warrior_sweep',kind:'melee_arc',origin,destination:origin,angle:1,range:100});
    expect(fx.bursts[0]).toMatchObject({id:'warrior-cleave',x:10,y:20,angle:1});
    fx.handle({type:'skill_cast', skillId:'reed_mantle', visual:'archer_wolf',kind:'summon',origin,destination:origin,angle:0});
    expect(fx.bursts[1].id).toBe('archer-summon');
    for (let i=0;i<200;i++) fx.add('mage-blink',0,0,80,0.5);
    expect(fx.bursts).toHaveLength(96); fx.update(0.6); expect(fx.bursts).toHaveLength(0);
    fx.add('warrior-guard',0,0,80,1);fx.clear();expect(fx.bursts).toHaveLength(0);
    fx.handle({type:'zone_detonated',team:'enemy',position:origin,radius:80});expect(fx.bursts).toHaveLength(0);
  });
});
describe('particelle GPU', () => {
  it('trasforma nella vista finale e conserva colori, alpha e input', () => {
    const out = new Float32Array(PARTICLE_STRIDE);
    expect(particleVertices(out,[particle],{a:2,b:0,c:0,d:2,e:-5,f:3})).toBe(1);
    expect([...out.slice(0,2)]).toEqual([15,43]); expect(out[3]).toBe(1);expect(out[4]).toBeCloseTo(128/255);
    expect(out[6]).toBe(0.5);expect(particle.x).toBe(10);
  });
  it('rispetta la capacità del buffer e scarta particelle terminate', () => {
    const out = new Float32Array(PARTICLE_STRIDE);
    expect(particleVertices(out,[{...particle,remaining:0},particle,particle],identity)).toBe(1);
    expect(particleVertices(new Float32Array(0),[particle],identity)).toBe(0);
    expect(drawWebGLParticles({} as CanvasRenderingContext2D,[particle])).toBe(false);
  });
});

describe('effetti personali senza duplicati', () => {
  it('il fendente segue il proprietario anche remoto, ma conserva direzione e settore del lancio', () => {
    const match = createQuietMatch(), ally = createQuietMatch().player;
    match.players.set('ally', ally);
    const fx = new SpriteEffects(), origin = new Vec2(10,20);
    fx.handle({type:'skill_cast',kind:'melee_arc',skillId:'guardian_blade',visual:'warrior_sweep',origin,destination:origin,angle:0.8,range:135,arc:Math.PI,playerId:'ally'});
    ally.position = new Vec2(240,320);
    expect(burstPosition(fx.bursts[0],match)).toEqual({x:240,y:320});
    expect(fx.bursts[0]).toMatchObject({angle:0.8,attachment:{owner:'ally',range:135,arc:Math.PI}});
    expect(fx.bursts[0].width * CLEAVE_ART.bladeRadius / CLEAVE_ART.canvasSize).toBe(135);
    match.players.delete('ally');expect(burstPosition(fx.bursts[0],match)).toBeUndefined();
  });
  it('il buff dell’Arciere legge la nuova posizione ogni fotogramma, senza duplicare gli anelli', () => {
    const match = new Match({rng:new SeededRng(1),dungeon:CRYPT,loadout:Character.createStarter('archer').loadout(),characterClass:'archer'});
    match.classCombat.remote = {players:[{id:'local',guard:false,buff:true,channel:0,rushing:false,charges:[]}],pets:[],statuses:[],marks:[],taunts:[],heavy:null};
    const draw = vi.spyOn(assets,'drawVfx').mockReturnValue(true);
    try {
      match.player.position = new Vec2(120,220);drawPersistentVfx({} as CanvasRenderingContext2D,match,0);
      expect(draw).toHaveBeenLastCalledWith(expect.anything(),'archer-predator',120,220,78,0,0,0.6);
      match.player.position = new Vec2(300,340);drawPersistentVfx({} as CanvasRenderingContext2D,match,1);
      expect(draw).toHaveBeenLastCalledWith(expect.anything(),'archer-predator',300,340,78,1,0,0.6);
      expect(draw).toHaveBeenCalledTimes(2);
    } finally {draw.mockRestore();}
  });
  it('i buff usano soltanto lo stato persistente, senza un secondo cerchio fermo a terra', () => {
    const fx = new SpriteEffects(), origin = Vec2.ZERO;
    for (const visual of ['warrior_guard','warrior_fortify','archer_predator','mage_earth_buff']) {
      fx.handle({type:'skill_cast',kind:'buff',skillId:'buff',visual,origin,destination:origin,angle:0});
      expect(fx.bursts).toHaveLength(0);
    }
    fx.handle({type:'guard_blocked',position:origin});
    const match=createQuietMatch();match.player.position=new Vec2(90,180);
    expect(burstPosition(fx.bursts[0],match)).toEqual({x:90,y:168});
  });
  it('gli asset pronti escludono vecchi archi, onde e flash; in assenza di asset il ripiego funziona', () => {
    const ready=vi.spyOn(assets,'isVfxReady').mockReturnValue(true);
    try {
      const fx=new Effects(), origin=Vec2.ZERO;
      const cast={type:'skill_cast',kind:'melee_arc',skillId:'guardian_blade',visual:'warrior_sweep',origin,destination:origin,angle:0,range:100,arc:Math.PI} as const;
      expect(replacesLegacy(cast,()=>true)).toBe(true);expect(replacesLegacy(cast,()=>false)).toBe(false);
      fx.handle(cast);fx.handle({type:'skill_cast',kind:'buff',skillId:'spore_fan',visual:'archer_predator',origin,destination:origin,angle:0});
      fx.handle({type:'guard_blocked',position:origin});fx.handle({type:'status_applied',position:origin,status:'taunted',seconds:3});
      fx.handle({type:'zone_detonated',position:origin,radius:80,team:'player',visual:'meteor'});
      expect(fx.slashes).toHaveLength(0);expect(fx.waves).toHaveLength(0);expect(fx.flashes).toHaveLength(0);
      ready.mockReturnValue(false);fx.handle(cast);expect(fx.slashes).toHaveLength(1);
    } finally {ready.mockRestore();}
  });
});
