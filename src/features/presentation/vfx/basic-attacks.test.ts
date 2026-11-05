import {describe,it,expect,vi} from 'vitest';
import {Vec2} from '../../../core/vec2';
import {SeededRng} from '../../../core/rng';
import {Camera} from '../../../core/camera';
import {createQuietMatch,intent} from '../../../testing';
import {ITEM_FAMILIES} from '../../items/item-families';
import {Projectile} from '../../combat/projectile';
import {Effects} from '../effects';
import * as assets from './assets';
import {SpriteEffects,burstPosition} from './sprite-effects';
import {isBasicAttackVisual} from './basic-attack-visuals';
import {Character} from '../../character/character';
import {Match} from '../../match/match';
import {CRYPT} from '../../dungeons/crypt';

const at=new Vec2(200,200);
describe('attacchi base senza particelle di lancio o scia',()=>{
  it('il lancio reale del Guerriero non produce lo sbuffo della provocazione né particelle della primaria',()=>{
    const character=Character.createStarter('warrior'),match=new Match({rng:new SeededRng(1),dungeon:CRYPT,loadout:character.loadout(),characterClass:'warrior'}),fx=new Effects();
    const events:string[]=[];match.events.connect(event=>{events.push(event.type==='status_applied'?event.status:event.type);fx.handle(event);});
    match.step(1/60,intent(match,{skills:[true,false,false,false]}));
    expect(events).toContain('taunted');expect(events).toContain('skill_cast');
    expect(fx.combatVfx.particles).toHaveLength(0);expect(fx.particles).toHaveLength(0);
    fx.handle({type:'status_applied',status:'burning',seconds:4,position:at});expect(fx.combatVfx.particles.length).toBeGreaterThan(0);
  });
  it('copre tutte le primarie di catalogo anche con il ripiego, conservando sangue e impatto',()=>{
    const ready=vi.spyOn(assets,'isVfxReady');
    try{for(const available of [true,false]){
      ready.mockReturnValue(available);
      for(const family of ITEM_FAMILIES.filter(f=>f.slot==='primary_hand')){
        const skill=family.skill,fx=new Effects(new SeededRng(1));
        expect(isBasicAttackVisual(skill.visual),family.id).toBe(true);
        fx.handle({type:'skill_cast',kind:skill.effect.kind,skillId:skill.id,visual:skill.visual,origin:at,destination:at,angle:0});
        expect(fx.combatVfx.particles,family.id).toHaveLength(0);expect(fx.particles,family.id).toHaveLength(0);
        fx.handle({type:'damage_dealt',target:'minion',minionId:1,amount:20,position:at});
        expect(fx.combatVfx.particles.some(p=>p.kind==='blood'),family.id).toBe(true);
        fx.handle({type:'minion_defeated',minionId:1,visual:'crypt_bat',position:at});
        expect(fx.combatVfx.deaths).toHaveLength(1);
      }
    }}finally{ready.mockRestore();}
  });
  it('la primaria non emette particelle in volo; secondarie e nemici mantengono la scia',()=>{
    for(const [visual,team,emits]of [['hunter_arrow','player',false],['mage_fire_bolt','player',false],['mage_wind_bolt','player',false],['mage_fire_cinder','player',true],['hunter_arrow','enemy',true]]as const){
      const fx=new Effects(new SeededRng(1)),match=createQuietMatch(),camera=new Camera();camera.follow(at);match.boss!.health.current=0;
      const projectile=new Projectile(1,{visual,team,speed:100,damage:1,radius:3,lifetime:2},at,0);match.projectiles.push(projectile);
      fx.update(.1,match,camera);expect(fx.particles.length>0,`${team}/${visual}`).toBe(emits);
      expect(fx.trailOf(projectile).length).toBeGreaterThan(0);
    }
  });
  it('l’onda del tiro segue anche un alleato, svanisce e non modifica l’effetto delle secondarie',()=>{
    const fx=new SpriteEffects(),match=createQuietMatch(),ally=createQuietMatch().player;match.players.set('ally',ally);
    fx.handle({type:'skill_cast',kind:'projectile',skillId:'hunter_arrow',visual:'hunter_arrow',origin:at,destination:at,angle:1.1,playerId:'ally'});
    expect(fx.bursts).toHaveLength(1);expect(fx.bursts[0]).toMatchObject({id:'archer-release',angle:0,attachment:{owner:'ally'}});
    ally.position=new Vec2(500,400);expect(burstPosition(fx.bursts[0],match)).toEqual({x:500,y:407});
    fx.update(.3);expect(fx.bursts).toHaveLength(0);
    fx.handle({type:'skill_cast',kind:'projectile',skillId:'frost_orb',visual:'mage_water_orb',origin:at,destination:at,angle:0});
    expect(fx.bursts).toHaveLength(0);
  });
});
