import { drawPersistentVfx } from './vfx/sprite-effects';
import { drawBloodStains, drawCombatMotes, drawMinionDeaths } from './vfx/combat-vfx';
import { drawClassCombat } from './draw-class-combat';
import type { CharacterAppearance } from '../character/appearance';
import type { Camera } from '../../core/camera';
import type { Match } from '../match/match';
import { drawBoss, drawMinion, drawPlayer } from './draw-actors';
import { drawArena } from './draw-arena';
import { drawHazards } from './draw-hazards';
import { drawChargeTelegraph, drawFallingSpell, drawPendingZone, drawProjectile, drawZoneFlash } from './draw-combat';
import { drawTelegraphs } from './draw-telegraphs';
import { drawBossIndicator, drawDecals, drawFloatingTexts, drawGlowEffects, drawParticles, drawScreenEffects } from './draw-effects';
import { FEEDBACK, type Effects } from './effects';
import { drawLight, drawVignette, LIGHT, LightMap } from './lights';
import { moodAmbient, ROOM_MOOD, type MoodFrame } from './room-mood';
import { minionArt } from './minion-art';
import { ARENA_THEMES } from './themes';
import type { ActorPoses } from './poses';
import type { Player } from '../player/player';
import { projectileLook } from './visuals';
import { canvasFont } from './fonts';

/** Tutto cio' che serve per disegnare un fotogramma. Il renderer legge e non modifica nulla. */
export interface Scene {
  readonly allies?: readonly { player: Player; poses: ActorPoses; name: string; appearance: CharacterAppearance }[];
  readonly appearance?: CharacterAppearance;
  readonly match: Match;
  readonly effects: Effects;
  readonly poses: ActorPoses;
  readonly camera: Camera;
  /** Tempo reale trascorso, sempre in avanzamento (anche in pausa): anima le torce e il lampeggio. */
  readonly clock: number;
  /**
   * Stanza della discesa, in coordinate del mondo: `floor` l'ambiente sotto la luce (soglie, cancelli), `objects` i
   * premi a piena luce, `front` cio' che sta davanti alle figure (l'ingresso nel muro in basso), `above` i cartelli
   * sopra tutto. `drawRoomScreen` in coordinate dello schermo (frecce verso i nemici fuori vista).
   */
  readonly drawRoom?: (ctx: CanvasRenderingContext2D, layer: RoomLayer) => void;
  readonly drawRoomScreen?: (ctx: CanvasRenderingContext2D) => void;
  /** La preda della Caccia (in cooperativa i servitori replicati non sanno di esserlo). */
  readonly preyId?: number | null;
  /** L'atmosfera della stanza della discesa: la luce si scalda a stanza libera, le tappe profonde si incupiscono. */
  readonly mood?: MoodFrame;
}

export type RoomLayer = 'floor' | 'objects' | 'front' | 'above';

/** Luce attorno a ogni giocatore vivo: il pavimento vicino resta sempre leggibile. Provvisori. */
export const SCENE_LIGHTS = {
  player: { color: '#e8dcc8', radius: 300, intensity: 0.85 },
  boss: { color: '#c0b0e0', radius: 230, intensity: 0.4 },
  enemyShot: { radius: 38, intensity: 0.35 },
  playerShot: { radius: 46, intensity: 0.45 },
  glowingMinion: { scale: 4, intensity: 0.5 },
} as const;

const lightMap = new LightMap();

/** Le luci di chi si muove: giocatori, boss, servitori luminosi e proiettili, aggiunte alla mappa in raccolta. */
function collectActorLights(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { match, camera } = scene;
  const lights = SCENE_LIGHTS;
  for (const p of [match.player, ...(scene.allies ?? []).map((ally) => ally.player)]) {
    if (!p.health.isDead) drawLight(ctx, p.position.x, p.position.y - 8, lights.player.color, lights.player.radius, lights.player.intensity);
  }
  const boss = match.boss;
  if (boss !== null && !boss.health.isDead) drawLight(ctx, boss.position.x, boss.position.y, lights.boss.color, lights.boss.radius, lights.boss.intensity);
  for (const minion of match.minions) {
    if (minion.isDead || minion.isHidden || minion.state === 'dormant') continue;
    const art = minionArt(minion.definition.visual);
    if (art.glow === '' || !camera.isVisible(minion.position, 120)) continue;
    drawLight(ctx, minion.position.x, minion.position.y, art.glow, minion.hitRadius * lights.glowingMinion.scale, lights.glowingMinion.intensity);
  }
  for (const projectile of match.projectiles) {
    if (!camera.isVisible(projectile.position, 60)) continue;
    const style = projectile.team === 'enemy' ? lights.enemyShot : lights.playerShot;
    drawLight(ctx, projectile.position.x, projectile.position.y, projectileLook(projectile.spec.visual).color, style.radius, style.intensity);
  }
}

/** Disegna un fotogramma della partita sul canvas. */
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { match, effects, poses, camera, clock } = scene;
  const { player, boss } = match;
  const theme = ARENA_THEMES[match.arena.theme];

  ctx.clearRect(0, 0, camera.width, camera.height);
  ctx.save();
  // La traslazione e' arrotondata al pixel: la pixel art resta nitida anche con la camera in movimento.
  const left = Math.round(camera.position.x + camera.shakeOffset.x);
  const top = Math.round(camera.position.y + camera.shakeOffset.y);
  ctx.translate(-left, -top);

  // L'ambiente, mentre si raccolgono le luci: pavimento, decori, pilastri, cancelli, tracce dello scontro.
  lightMap.begin();
  drawArena(ctx, match.arena, camera, clock);
  scene.drawRoom?.(ctx, 'floor');
  // Le luci nate sotto un massiccio o dentro un pozzo non si vedono; la lava dei pozzi si accende dopo.
  lightMap.dropCovered(match.arena.solids);
  lightMap.dropCovered(match.arena.chasms);
  drawDecals(ctx, effects, camera);
  drawBloodStains(ctx, effects.combatVfx, camera);
  drawHazards(ctx, match.arena, match.covers, camera, clock, effects.coverFlashes);
  collectActorLights(ctx, scene);
  const ambient = scene.mood === undefined ? theme.ambient : moodAmbient(theme.ambient, scene.mood);
  lightMap.composite(ctx, camera, left, top, ambient);
  scene.drawRoom?.(ctx, 'objects');

  if (boss !== null && boss.charge !== null) drawChargeTelegraph(ctx, boss.charge);
  for (const flash of effects.flashes) drawZoneFlash(ctx, flash);
  for (const zone of match.zones) drawPendingZone(ctx, zone, match.time);
  drawTelegraphs(ctx, effects.telegraphs, match.minions);

  drawPersistentVfx(ctx, match, match.time);

  // Le figure si disegnano dall'alto in basso: chi sta piu' in basso e' piu' vicino e copre chi sta dietro.
  const figures: { y: number; draw: () => void }[] = [];
  for (const minion of match.minions) {
    figures.push({ y: minion.position.y, draw: () => drawMinion(ctx, minion, clock, effects.minionFlashes.get(minion.id) ?? 0, minion.prey || minion.id === scene.preyId, theme.silhouette) });
  }
  // Il boss resta visibile durante la sequenza della morte (lampeggia, trema e si frantuma).
  const death = effects.bossDeath;
  if (boss !== null && (!boss.health.isDead || death !== null)) {
    figures.push({
      y: boss.position.y,
      draw: () => drawBoss(ctx, boss, player, poses, match.time, {
        flash: effects.bossFlash / FEEDBACK.hitFlash,
        offset: effects.bossOffset(),
        death: death === null ? null : 1 - death.remaining / death.total,
        transform: effects.bossTransform > 0 ? 1 - effects.bossTransform / FEEDBACK.bossTransform : null,
        clock,
        rim: theme.silhouette,
      }),
    });
  }
  figures.push({ y: player.position.y, draw: () => drawPlayer(ctx, player, poses, match.time, !player.isInvulnerable || Math.floor(clock * 20) % 2 === 0, scene.appearance) });
  for (const ally of scene.allies ?? []) {
    figures.push({
      y: ally.player.position.y,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = ally.player.health.isDead ? 0.35 : 1;
        drawPlayer(ctx, ally.player, ally.poses, match.time, true, ally.appearance);
        ctx.restore();
      },
    });
  }
  figures.sort((a, b) => a.y - b.y);
  for (const figure of figures) figure.draw();
  drawMinionDeaths(ctx, effects.combatVfx);
  // Il muro in basso e l'ingresso stanno davanti alle figure.
  theme.drawForeground?.(ctx, match.arena, camera, clock, ambient);
  scene.drawRoom?.(ctx, 'front');
  // Nomi e vita degli alleati sopra tutte le figure, cosi' nessuno li copre.
  for (const ally of scene.allies ?? []) {
    ctx.save();
    ctx.globalAlpha = ally.player.health.isDead ? 0.35 : 1;
    ctx.font = canvasFont(9, 'text'); ctx.textAlign = 'center';
    const label = ally.name + (ally.player.health.isDead ? ' · KO' : '');
    const width = ctx.measureText(label).width + 10;
    ctx.fillStyle = '#161321dd'; ctx.fillRect(ally.player.position.x - width / 2, ally.player.position.y - 51, width, 13);
    ctx.fillStyle = '#c1dccb'; ctx.fillText(label, ally.player.position.x, ally.player.position.y - 41);
    ctx.fillStyle = '#26202b'; ctx.fillRect(ally.player.position.x - 16, ally.player.position.y - 36, 32, 3);
    ctx.fillStyle = '#83b797'; ctx.fillRect(ally.player.position.x - 16, ally.player.position.y - 36, 32 * ally.player.health.fraction, 3);
    ctx.restore();
  }

  // Prima i colpi dei giocatori, poi le particelle, infine i proiettili nemici: la minaccia resta sempre in vista.
  for (const projectile of match.projectiles) {
    if (projectile.team !== 'enemy') drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time);
  }
  effects.spriteVfx.draw(ctx, match);
  drawParticles(ctx, effects);
  drawCombatMotes(ctx, effects.combatVfx);
  for (const projectile of match.projectiles) {
    if (projectile.team === 'enemy') drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time, theme.projectileRim);
  }
  for (const zone of match.zones) drawFallingSpell(ctx, zone);

  scene.drawRoom?.(ctx, 'above');
  drawClassCombat(ctx, match, clock);
  drawGlowEffects(ctx, effects);
  drawFloatingTexts(ctx, effects);
  ctx.restore();

  drawVignette(ctx, camera, theme.vignette, LIGHT.vignetteAlpha + ROOM_MOOD.depthVignette * (scene.mood?.depth ?? 0));
  if (boss !== null && !boss.health.isDead) drawBossIndicator(ctx, camera, player.position, boss.position);
  scene.drawRoomScreen?.(ctx);
  drawScreenEffects(ctx, camera, effects, player.health.fraction, clock);
}
