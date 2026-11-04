import { familyById } from './features/items/item-families';
import { drawCanvasParticles, drawFloatingTexts } from './features/presentation/draw-effects';
import { VFX_IDS, PIXELLAB_MANIFEST, drawVfx } from './features/presentation/vfx/assets';
import { drawWebGLParticles } from './features/presentation/vfx/particle-webgl';
import { Effects, type Particle } from './features/presentation/effects';
import { ITEM_SPRITES } from './features/presentation/item-sprites';
import { renderPixelIcon } from './features/ui/pixel-icon';
import { drawGameCharacter } from './features/presentation/game-character-preview';
import { drawFlyingGold } from './features/presentation/gold-flight';
import { preloadFonts } from './features/presentation/fonts';
import { Camera } from './core/camera';
import { SeededRng } from './core/rng';
import { Vec2 } from './core/vec2';
import { Match } from './features/match/match';
import { Character } from './features/character/character';
import { CRYPT } from './features/dungeons/crypt';
import { CombatVfx, drawBloodStains, drawCombatMotes, drawMinionDeaths } from './features/presentation/vfx/combat-vfx';
import { minionArt } from './features/presentation/minion-art';
import { drawSprite } from './features/presentation/sprites';
const root = document.querySelector('#effects')!;
const gpu = document.querySelector<HTMLInputElement>('#gpu')!;
const backendLabel = document.querySelector('#backend')!;
const playback = document.querySelector<HTMLButtonElement>('#playback')!;
let playing = true;
playback.addEventListener('click', () => { playing = !playing; playback.textContent = playing ? 'Ferma al fotogramma 5' : 'Riprendi animazione'; });
const labels: Record<typeof VFX_IDS[number], string> = {
  'warrior-cleave':'Fendente provocatorio', 'warrior-guard':'Parata del baluardo', 'warrior-fortify':'Secondo fiato', 'warrior-rush':'Carica del guerriero',
  'mage-fireball':'Dardo di fuoco', 'mage-water-orb':'Globo d’acqua', 'mage-earth-wisp':'Luci della terra', 'mage-wind-orb':'Dardo del vento',
  'mage-fire-explosion':'Esplosione di fuoco', 'mage-water-explosion':'Marea gelida', 'mage-earth-aura':'Patto della terra', 'mage-blink':'Traslazione esplosiva',
  'archer-arrow':'Freccia del cacciatore', 'archer-predator':'Istinto predatorio', 'archer-summon':'Evocazione del lupo', 'archer-dash':'Passo del cacciatore', 'archer-release':'Onda del tiro',
};
const previews = VFX_IDS.map(id => {
  const card = document.createElement('article'), title = document.createElement('h2'), canvas = document.createElement('canvas');
  title.textContent = labels[id]; canvas.width = canvas.height = 192; card.append(title, canvas); root.append(card);
  return { id, ctx: canvas.getContext('2d')! };
});
for (const [id, sprite] of Object.entries(ITEM_SPRITES)) {
  const figure = document.createElement('figure'), caption = document.createElement('figcaption');
  caption.textContent = familyById(id)?.name ?? id; figure.append(renderPixelIcon(sprite), caption); document.querySelector('#items')!.append(figure);
}
preloadFonts();
const rewardCanvas=document.createElement('canvas');rewardCanvas.width=320;rewardCanvas.height=200;rewardCanvas.className='combat-canvas';document.querySelector('#rewards')!.append(rewardCanvas);
const rewardCtx=rewardCanvas.getContext('2d')!,rewardFx=new Effects(new SeededRng(44)),rewardCharacter=Character.createStarter('archer');
const rewardMatch=new Match({rng:new SeededRng(99),dungeon:CRYPT,loadout:[],characterClass:'archer'});rewardMatch.boss!.health.current=0;
let rewardCycle=-1,rewardGold=false;
const particles: Particle[] = Array.from({length: 28}, () => ({x:0,y:0,vx:0,vy:0,remaining:1,total:1,color:'#f6ca83',size:0.8,gravity:0}));
const demoMatch = new Match({ rng: new SeededRng(5), dungeon: CRYPT, loadout: Character.createStarter('archer').loadout(), characterClass: 'archer' });
demoMatch.boss!.health.current = 0;
demoMatch.classCombat.remote = { players: [{ id: 'local', buff: true, guard: false, rushing: false, channel: 0, charges: [] }], statuses: [], pets: [], marks: [], taunts: [], heavy: null };
const camera = new Camera(); camera.setViewSize(320, 200);
const combatRoot = document.querySelector('#combat')!;
const demos = ['Colpo · sangue', 'Uccisione · cedimento', 'Costrutto · schegge', 'Buff · particelle in movimento'].map((label, i) => {
  const card = document.createElement('article'), title = document.createElement('h2'), canvas = document.createElement('canvas'), count = document.createElement('p');
  canvas.width = 320; canvas.height = 200; canvas.className = 'combat-canvas';
  title.textContent = label; card.append(title, canvas, count); combatRoot.append(card);
  return { ctx: canvas.getContext('2d')!, fx: new CombatVfx(new SeededRng(i + 1)), count, cycle: -1 };
});
let previous = 0;
function frame(now: number): void {
  const time = playing ? now / 1000 : 4 / 24;
  const dt = playing ? Math.min(0.05, (now - previous) / 1000) : 0; previous = now;
  for (const { id, ctx } of previews) {
    ctx.clearRect(0, 0, 192, 192);
    const asset = PIXELLAB_MANIFEST.effects[id];
    const duration = asset ? asset.frames.length / asset.fps : 0.5;
    drawVfx(ctx, id, 96, 96, 176, asset?.loop ? time : time % (duration + 0.35));
    // Un solo contesto GPU per lo studio; le restanti carte mostrano gli atlanti puri.
    if (id === 'warrior-fortify') {
      particles.forEach((p, i) => { const age = (time + i / 28) % 1; const a = i * 2.4; p.x=96+Math.cos(a)*age*78; p.y=96+Math.sin(a)*age*78; p.remaining=1-age; });
      const webgl = gpu.checked && drawWebGLParticles(ctx, particles);
      if (!webgl) drawCanvasParticles(ctx, particles);
      document.body.dataset.particleBackend = webgl ? 'webgl' : 'canvas2d';
      backendLabel.textContent = webgl ? 'WebGL attivo' : 'Canvas 2D attivo';
    }
  }
  demos.forEach(({ctx, fx, count}, i) => {
    const cycle = Math.floor(time / 1.8), age = time % 1.8, at = new Vec2(160, 115);
    ctx.clearRect(0, 0, 320, 200); ctx.fillStyle = '#27222b'; ctx.fillRect(0, 0, 320, 200);
    ctx.strokeStyle = '#39303a'; ctx.lineWidth = 1;
    for (let x = 0; x < 320; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,200); ctx.stroke(); }
    for (let y = 0; y < 200; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(320,y); ctx.stroke(); }
    const visual = i === 2 ? 'crypt_skeleton' : 'crypt_acolyte';
    if (demos[i].cycle !== cycle && playing && i < 3) {
      demos[i].cycle = cycle;
      fx.handle({ type:'minion_spawned', minionId:1, position:at, visual });
      fx.handle(i === 1 ? { type:'minion_defeated', minionId:1, position:at, visual }
        : { type:'damage_dealt', target:'minion', minionId:1, amount:36, position:at });
    }
    demoMatch.classCombat.remote!.players[0].buff = i === 3;
    demoMatch.player.position = i === 3 ? at.add(new Vec2(Math.sin(time * 1.8) * 65, 0)) : at;
    fx.update(dt, demoMatch, camera); drawBloodStains(ctx, fx, camera);
    if (i !== 1 || age > 1.3) {
      const art = minionArt(visual);
      if (i === 3) drawVfx(ctx,'archer-predator',demoMatch.player.position.x,115,100,time,0,0.8);
      else drawSprite(ctx,art.frames[Math.floor(time*5)%art.frames.length]!,160,115,art.scale,art.palette);
    }
    drawMinionDeaths(ctx,fx); drawCombatMotes(ctx,fx);
    count.textContent = `${fx.particles.length} particelle · ${fx.stains.length} macchie`;
  });
  const cycle=Math.floor(time/2.6),age=time%2.6,collector=new Vec2(180,155);
  rewardMatch.player.position=collector;
  if(rewardCycle!==cycle){rewardCycle=cycle;rewardGold=false;rewardFx.clear();rewardFx.handle({type:'reward_taken',reward:'xp',amount:14,position:collector,playerId:'local'});}
  rewardFx.update(dt,rewardMatch,camera);
  if(age>=.9&&!rewardGold){rewardGold=true;rewardFx.handle({type:'reward_taken',reward:'gold',amount:12,position:collector,playerId:'local'});}
  rewardCtx.fillStyle='#27222b';rewardCtx.fillRect(0,0,320,200);
  drawGameCharacter(rewardCtx,rewardCharacter.appearance(),collector.x,collector.y,time);
  if(age<.9)drawFlyingGold(rewardCtx,new Vec2(65,150),collector,age,1);
  drawFloatingTexts(rewardCtx,rewardFx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
