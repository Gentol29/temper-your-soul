import type { Scene } from '../scene-renderer';
import { SCENE_LIGHTS } from '../scene-renderer';
import { drawBoss, drawMinion, drawPlayer } from '../draw-actors';
import { drawChargeTelegraph, drawFallingSpell, drawPendingZone, drawProjectile, drawZoneFlash } from '../draw-combat';
import { drawTelegraphs } from '../draw-telegraphs';
import { drawBossIndicator, drawDecals, drawFloatingTexts, drawGlowEffects, drawParticles, drawScreenEffects } from '../draw-effects';
import { drawClassCombat } from '../draw-class-combat';
import { drawPersistentVfx } from '../vfx/sprite-effects';
import { drawBloodStains, drawCombatMotes, drawMinionDeaths } from '../vfx/combat-vfx';
import { pixiLayer } from '../webgl-renderer';
import { drawProjectileTrails } from '../vfx/trail-layer';
import { drawMeteorGlow } from '../vfx/glow-layer';
import { drawMeteorImpact, impactBox, meteorImpactReady } from '../vfx/meteor-impact';
import { FEEDBACK } from '../effects';
import { drawLight, drawVignette, LIGHT, LightMap } from '../lights';
import { moodAmbient, moodAmbientBlend, ROOM_MOOD } from '../room-mood';
import { minionArt } from '../minion-art';
import { ARENA_THEMES } from '../themes';
import { projectileLook } from '../visuals';
import { canvasFont } from '../fonts';
import { IsoFloorCache } from './iso-floor-cache';
import type { IsoArtFrame, IsoThemeArt } from './iso-theme';
import { orderWithOccluders, rememberIsoScene, type IsoFigure } from './occluders';
import { ISO_BODY_LIFT, sceneViewFor, type SceneView } from './scene-view';
import { PLAYER_FEET, bossFeet, figureBox, minionFeet, minionSize } from './actor-anchors';

/*
 * Il fotogramma in isometria. Stessi strati e stesse funzioni di `renderScene`, ma ogni cosa va al suo posto nella vista:
 * il pavimento dalla cache a rombo, i muri e gli ostacoli dalla grafica isometrica del tema, le figure con i piedi sul
 * punto proiettato e ordinate per profondita' con le ristampe degli ostacoli, le forme a terra sotto la matrice della
 * proiezione. La vista dall'alto non passa di qui: `renderScene` resta com'era.
 */

const lightMap = new LightMap();
const floorCaches = new WeakMap<IsoThemeArt, IsoFloorCache>();

function floorCacheOf(art: IsoThemeArt): IsoFloorCache {
  let cache = floorCaches.get(art);
  if (cache === undefined) {
    cache = new IsoFloorCache((ctx, arena, camera) => art.paintGround(ctx, arena, camera));
    floorCaches.set(art, cache);
  }
  return cache;
}

/** Le luci di chi si muove, ciascuna nel punto in cui e' disegnata la sua fonte. */
function collectActorLights(ctx: CanvasRenderingContext2D, scene: Scene, view: SceneView): void {
  const { match, camera } = scene;
  const lights = SCENE_LIGHTS;
  for (const p of [match.player, ...(scene.allies ?? []).map((ally) => ally.player)]) {
    if (p.health.isDead) continue;
    view.at(ctx, p.position.x, p.position.y, PLAYER_FEET, () => drawLight(ctx, p.position.x, p.position.y - 8, lights.player.color, lights.player.radius, lights.player.intensity));
  }
  const boss = match.boss;
  if (boss !== null && !boss.health.isDead) {
    view.at(ctx, boss.position.x, boss.position.y, bossFeet(boss), () => drawLight(ctx, boss.position.x, boss.position.y, lights.boss.color, lights.boss.radius, lights.boss.intensity));
  }
  for (const minion of match.minions) {
    if (minion.isDead || minion.isHidden || minion.state === 'dormant') continue;
    const art = minionArt(minion.definition.visual);
    if (art.glow === '' || !camera.isVisible(minion.position, 120)) continue;
    view.at(ctx, minion.position.x, minion.position.y, minionFeet(minion), () => drawLight(ctx, minion.position.x, minion.position.y, art.glow, minion.hitRadius * lights.glowingMinion.scale, lights.glowingMinion.intensity));
  }
  for (const projectile of match.projectiles) {
    if (!camera.isVisible(projectile.position, 60)) continue;
    const style = projectile.team === 'enemy' ? lights.enemyShot : lights.playerShot;
    view.at(ctx, projectile.position.x, projectile.position.y, ISO_BODY_LIFT, () => drawLight(ctx, projectile.position.x, projectile.position.y, projectileLook(projectile.spec.visual).color, style.radius, style.intensity));
  }
}

/** Disegna un fotogramma della partita in isometria con la grafica `art` del tema della mappa. */
export function renderIsometricScene(ctx: CanvasRenderingContext2D, scene: Scene, art: IsoThemeArt): void {
  const { match, effects, poses, camera, clock } = scene;
  const { player, boss } = match;
  const theme = ARENA_THEMES[match.arena.theme];
  const view = sceneViewFor(camera.projection);
  // Prepara lo strato WebGL gia' al primo fotogramma del dungeon, non alla prima morte.
  pixiLayer();
  meteorImpactReady();
  const ambient = scene.mood === undefined ? theme.ambient : moodAmbient(theme.ambient, scene.mood);
  const ambientBlend = scene.mood === undefined ? null : moodAmbientBlend(theme.ambient, scene.mood);

  ctx.clearRect(0, 0, camera.width, camera.height);
  ctx.fillStyle = art.void;
  ctx.fillRect(0, 0, camera.width, camera.height);
  ctx.save();
  // Traslazione intera: la camera e' gia' nella vista.
  const left = Math.round(camera.position.x + camera.shakeOffset.x);
  const top = Math.round(camera.position.y + camera.shakeOffset.y);
  ctx.translate(-left, -top);
  const frame: IsoArtFrame = { arena: match.arena, view, camera, clock, covers: match.covers, coverFlashes: effects.coverFlashes, ambient, ambientBlend };

  // L'ambiente illuminato: pavimento, muri di fondo, porte, tracce a terra, pozzi, arredi e ostacoli in piedi.
  lightMap.begin(true);
  floorCacheOf(art).draw(ctx, match.arena, camera, art.groundVersion());
  art.drawBackdrop(ctx, frame);
  scene.drawRoom?.(ctx, 'floor');
  lightMap.dropCovered(match.arena.solids);
  lightMap.dropCovered(match.arena.chasms);
  drawDecals(ctx, effects, camera, view);
  drawBloodStains(ctx, effects.combatVfx, camera, view);
  art.drawHazards(ctx, frame);
  art.drawDecor(ctx, frame);
  const occluders = art.drawOccluders(ctx, frame);
  collectActorLights(ctx, scene, view);
  lightMap.composite(ctx, camera, left, top, ambient);
  scene.drawRoom?.(ctx, 'objects');

  // Le forme a terra dei pericoli, nel mondo sotto la matrice della proiezione: coincidono con le zone di gioco.
  view.ground(ctx, () => {
    if (boss !== null && boss.charge !== null) drawChargeTelegraph(ctx, boss.charge);
    for (const flash of effects.flashes) drawZoneFlash(ctx, flash);
    for (const zone of match.zones) drawPendingZone(ctx, zone, match.time);
    drawTelegraphs(ctx, effects.telegraphs, match.minions);
  });
  drawPersistentVfx(ctx, match, match.time, view);

  // Le figure con i piedi sul punto proiettato, per profondita', con gli ostacoli che tornano davanti a chi passa dietro.
  const figures: IsoFigure[] = [];
  for (const minion of match.minions) {
    const feet = minionFeet(minion);
    const size = minionSize(minion);
    const at = view.point(minion.position.x, minion.position.y);
    figures.push({
      x: minion.position.x,
      y: minion.position.y,
      box: figureBox(at.x, at.y, size.width + 8, size.height + 64),
      draw: () => view.at(ctx, minion.position.x, minion.position.y, feet, () => drawMinion(ctx, minion, clock, effects.minionFlashes.get(minion.id) ?? 0, minion.prey || minion.id === scene.preyId, theme.silhouette, view)),
    });
  }
  const death = effects.bossDeath;
  if (boss !== null && (!boss.health.isDead || death !== null)) {
    const at = view.point(boss.position.x, boss.position.y);
    figures.push({
      x: boss.position.x,
      y: boss.position.y,
      box: figureBox(at.x, at.y, 140, 140),
      draw: () => view.at(ctx, boss.position.x, boss.position.y, bossFeet(boss), () => drawBoss(ctx, boss, player, poses, match.time, {
        flash: effects.bossFlash / FEEDBACK.hitFlash,
        offset: effects.bossOffset(),
        death: death === null ? null : 1 - death.remaining / death.total,
        transform: effects.bossTransform > 0 ? 1 - effects.bossTransform / FEEDBACK.bossTransform : null,
        clock,
        rim: theme.silhouette,
      }, view)),
    });
  }
  const playerAt = view.point(player.position.x, player.position.y);
  figures.push({
    x: player.position.x,
    y: player.position.y,
    box: figureBox(playerAt.x, playerAt.y, 48, 60),
    draw: () => view.at(ctx, player.position.x, player.position.y, PLAYER_FEET, () => drawPlayer(ctx, player, poses, match.time, !player.isInvulnerable || Math.floor(clock * 20) % 2 === 0, scene.appearance, view)),
  });
  for (const ally of scene.allies ?? []) {
    const at = view.point(ally.player.position.x, ally.player.position.y);
    figures.push({
      x: ally.player.position.x,
      y: ally.player.position.y,
      box: figureBox(at.x, at.y, 48, 60),
      draw: () => view.at(ctx, ally.player.position.x, ally.player.position.y, PLAYER_FEET, () => {
        ctx.save();
        ctx.globalAlpha = ally.player.health.isDead ? 0.35 : 1;
        drawPlayer(ctx, ally.player, ally.poses, match.time, true, ally.appearance, view);
        ctx.restore();
      }),
    });
  }
  // L'impatto della meteora sta sul pavimento come una figura: chi gli sta davanti lo copre, chi sta dietro ne e' coperto.
  for (const impact of effects.meteorImpacts.impacts) {
    figures.push({ x: impact.x, y: impact.y, box: impactBox(impact, view), draw: () => drawMeteorImpact(ctx, impact, view) });
  }
  if (occluders.length > 0) rememberIsoScene(ctx);
  for (const step of orderWithOccluders(figures, occluders)) step();
  drawMinionDeaths(ctx, effects.combatVfx, view);

  // Davanti a tutti: i muri bassi in primo piano e l'ingresso.
  art.drawForeground(ctx, frame);
  scene.drawRoom?.(ctx, 'front');
  for (const ally of scene.allies ?? []) {
    view.at(ctx, ally.player.position.x, ally.player.position.y, PLAYER_FEET, () => {
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
    });
  }

  // Colpi, particelle ed effetti: all'altezza del corpo, sopra le figure come dall'alto. Prima le scie (PixiJS), sotto i colpi.
  drawProjectileTrails(ctx, effects.projectileTrails, view, effects.meteorImpacts.embers);
  // Luce additiva della meteora (PixiJS, composta con `lighter`): sopra le scie, sotto i colpi.
  drawMeteorGlow(ctx, effects.meteorGlow, match.zones, view);
  for (const projectile of match.projectiles) {
    if (projectile.team === 'enemy') continue;
    drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time, undefined, view);
  }
  effects.spriteVfx.draw(ctx, match, view);
  drawParticles(ctx, effects, view);
  drawCombatMotes(ctx, effects.combatVfx, view);
  for (const projectile of match.projectiles) {
    if (projectile.team !== 'enemy') continue;
    drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time, theme.projectileRim, view);
  }
  for (const zone of match.zones) view.at(ctx, zone.position.x, zone.position.y, 0, () => drawFallingSpell(ctx, zone));

  scene.drawRoom?.(ctx, 'above');
  drawClassCombat(ctx, match, clock, view);
  // Onde e fendenti di ripiego sono forme di gioco a terra: sotto la proiezione.
  view.ground(ctx, () => drawGlowEffects(ctx, effects));
  drawFloatingTexts(ctx, effects, view);
  ctx.restore();

  drawVignette(ctx, camera, theme.vignette, LIGHT.vignetteAlpha + ROOM_MOOD.depthVignette * (scene.mood?.depth ?? 0));
  if (boss !== null && !boss.health.isDead) drawBossIndicator(ctx, camera, player.position, boss.position);
  scene.drawRoomScreen?.(ctx);
  drawScreenEffects(ctx, camera, effects, player.health.fraction, clock);
}
