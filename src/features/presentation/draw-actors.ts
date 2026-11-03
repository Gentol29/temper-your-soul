import type { CharacterAppearance } from '../character/appearance';
import { CHARACTER_ART, characterPixels, DEFAULT_APPEARANCE, type CharacterPixels } from './character-art';
import { SHADOW_ANIMATION } from './shadow-motion';
import { Vec2 } from '../../core/vec2';
import type { Boss } from '../boss/boss';
import type { Minion } from '../minions/minion';
import { bossFx } from './boss-fx';
import { minionArt } from './minion-art';
import type { Player } from '../player/player';
import { bossArt, bossSheet, sheetFrame, type BossSheet } from './boss-art';
import { sheetImage, sheetSilhouette, sheetVariant } from './boss-art/sheet-images';
import type { ActorPoses } from './poses';
import { playerCastFrame } from './poses';
import { drawSprite, type Palette, type SpriteFrame } from './sprites';
import { canvasFont } from './fonts';

/** Un raster per fotogramma/equipaggiamento, liberato insieme all'art dalla cache.
 * Evita migliaia di cambi di colore/fillRect per ogni giocatore e fotogramma. */
const rasterFrames = new WeakMap<CharacterPixels, HTMLCanvasElement>();
const previousPositions=new WeakMap<Player,{x:number;direction:1|-1}>();
function rasterOf(art: CharacterPixels): HTMLCanvasElement {
  let raster = rasterFrames.get(art); if (raster) return raster;
  raster = document.createElement('canvas'); raster.width = art.width; raster.height = art.height;
  const ctx = raster.getContext('2d')!;
  for (let y = 0; y < art.height; y++) for (let x = 0; x < art.width; x++) {
    const color = art.pixels[y]![x]; if (!color) continue;
    ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
  }
  rasterFrames.set(art, raster); return raster;
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 7);
  ctx.fill();
}

/**
 * Disegna corpo e strati equipaggiati, rivolti verso la mira. L'ombra c'e' sempre; il corpo solo se `visible` (lampeggia durante
 * l'invulnerabilita', deciso dal chiamante).
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  poses: ActorPoses,
  time: number,
  visible: boolean,
  appearance: CharacterAppearance = DEFAULT_APPEARANCE,
): void {
  drawShadow(ctx, player.position.x, player.position.y + 14, 14, 5, '#080b1480');
  if (!visible) return;
  const slots = ['primary_hand','secondary_hand','armor','boots'] as const;
  const slotIndex=player.skillBar.skills.findIndex(skill=>skill?.id===poses.playerSkillId);
  const attackSlot=slots[slotIndex] ?? 'primary_hand',skill=player.skillBar.skillAt(slotIndex);
  const cadence=skill?skill.cooldown/(slotIndex===0?1+player.buffValue('attackSpeed'):1):undefined;
  const castFrame=playerCastFrame(poses.playerCast,cadence);
  const facing = player.aim.x < player.position.x ? -1 : 1;
  const previous=previousPositions.get(player),dx=previous?player.position.x-previous.x:0;
  const walkDirection:1|-1=Math.abs(dx)>.01?(dx*facing<0?-1:1):previous?.direction??1;
  previousPositions.set(player,{x:player.position.x,direction:walkDirection});
  const count=SHADOW_ANIMATION.frames;
  const motion = castFrame!==null
    ? {state: 'cast' as const, attackSlot, frame: castFrame}
    : player.moving ? {state:'walk' as const,frame:Math.floor(poses.walkPhase)%count,walkDirection}
    : {state:'idle' as const,frame:Math.floor(time*SHADOW_ANIMATION.fps.idle)%count};
  ctx.save();
  ctx.translate(Math.round(player.position.x), Math.round(player.position.y));
  ctx.scale(facing, 1);
  const art=characterPixels(appearance,'game',0,false,motion);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(rasterOf(art), -CHARACTER_ART.feetX, 14-CHARACTER_ART.feetY);
  ctx.restore();
}

/** Stato della rappresentazione del boss in questo fotogramma (dagli effetti). */
export interface BossLook {
  /** Lampo bianco del colpo, 0–1. */
  readonly flash: number;
  /** Sobbalzo o tremito, in unita' del mondo. */
  readonly offset: Vec2;
  /** Avanzamento della morte, 0–1 (null se vivo). */
  readonly death: number | null;
  /** Avanzamento della trasformazione in furia, 0–1 (null se non e' in corso). */
  readonly transform?: number | null;
  /** Tempo reale, per la pulsazione dell'aura. */
  readonly clock: number;
  /** Bordo chiaro attorno alla sagoma (#rrggbbaa, il colore del tema come per i servitori); assente = senza bordo. */
  readonly rim?: string;
}

/** Le quattro direzioni del bordo chiaro, di un'unita' del mondo. */
const RIM_OFFSETS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

/** L'opacita' di un colore #rrggbbaa (1 se non ce l'ha). */
function rimAlpha(rim: string): number {
  return rim.length >= 9 ? parseInt(rim.slice(7, 9), 16) / 255 : 1;
}

const NO_LOOK: BossLook = { flash: 0, offset: Vec2.ZERO, death: null, clock: 0 };

/** Lampo bianco all'inizio della morte (quota della sequenza) e dissolvenza finale, per i boss con foglio di sprite. */
const SHEET_DEATH = { flash: 0.15, fadeFrom: 0.85 } as const;

/**
 * Disegna il boss dal suo foglio di sprite: animazioni di camminata, attacco, trasformazione e morte, specchiato
 * verso il giocatore attorno ai piedi. Lampo bianco e velo di brina sono copie colorate del foglio.
 */
function drawSheetBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  sheet: BossSheet,
  image: HTMLImageElement,
  facingLeft: boolean,
  x: number,
  y: number,
  cast: number | null,
  time: number,
  look: BossLook,
): void {
  const { layout, scale } = sheet;
  const frame = sheetFrame(sheet, {
    enraged: boss.isEnraged,
    slowed: boss.isSlowed,
    time,
    cast,
    transform: look.transform ?? null,
    death: look.death,
  });
  const { width, height } = layout.cell;
  const sx = frame.column * width;
  const sy = frame.row * height;
  const dx = -layout.feet.x * scale;
  const dy = sheet.feetY - layout.feet.y * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.scale(facingLeft !== sheet.facesLeft ? -1 : 1, 1);
  const death = look.death;
  if (death !== null && death > SHEET_DEATH.fadeFrom) ctx.globalAlpha = (1 - death) / (1 - SHEET_DEATH.fadeFrom);
  const source = boss.isSlowed && death === null ? sheetVariant(layout.url, image, 'frost') : image;
  if (look.rim !== undefined && death === null) {
    // Bordo chiaro: la sagoma tinta, spostata di un'unita' nelle quattro direzioni, sotto la figura.
    const base = ctx.globalAlpha;
    ctx.globalAlpha = base * rimAlpha(look.rim);
    const silhouette = sheetSilhouette(layout.url, image, look.rim);
    for (const [ox, oy] of RIM_OFFSETS) ctx.drawImage(silhouette, sx, sy, width, height, dx + ox, dy + oy, width * scale, height * scale);
    ctx.globalAlpha = base;
  }
  ctx.drawImage(source, sx, sy, width, height, dx, dy, width * scale, height * scale);
  // Lampo bianco: il colpo subito o il colpo finale, poi l'animazione di morte si vede pulita.
  const flash = death !== null ? Math.max(0, 1 - death / SHEET_DEATH.flash) : look.flash;
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash) * 0.85;
    ctx.drawImage(sheetVariant(layout.url, image, 'white'), sx, sy, width, height, dx, dy, width * scale, height * scale);
  }
  ctx.restore();
}

/** La stessa tavolozza tutta di un colore: la sagoma per il bordo chiaro dei boss a matrici. */
const rimCache = new WeakMap<Palette, Map<string, Palette>>();
function rimPalette(palette: Palette, color: string): Palette {
  let byColor = rimCache.get(palette);
  if (!byColor) {
    byColor = new Map();
    rimCache.set(palette, byColor);
  }
  let rim = byColor.get(color);
  if (!rim) {
    rim = Object.fromEntries(Object.keys(palette).map((key) => [key, color]));
    byColor.set(color, rim);
  }
  return rim;
}

/** La stessa tavolozza, tutta bianca: per il lampo del colpo. */
const whiteCache = new WeakMap<Palette, Palette>();
function whitePalette(palette: Palette): Palette {
  let white = whiteCache.get(palette);
  if (!white) {
    white = Object.fromEntries(Object.keys(palette).map((key) => [key, '#fff8ec']));
    whiteCache.set(palette, white);
  }
  return white;
}

/**
 * Disegna il boss con la grafica della sua definizione, rivolto verso il giocatore: il foglio di sprite se c'e' ed e'
 * caricato, altrimenti la grafica a matrici. In furia ha un alone pulsante del suo colore; quando e' colpito lampeggia
 * di bianco e sobbalza; morendo trema e si frantuma.
 */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, player: Player, poses: ActorPoses, time: number, look: BossLook = NO_LOOK): void {
  const art = bossArt(boss.definition.art);
  const sheet = bossSheet(boss.definition.art);
  const image = sheet === null ? null : sheetImage(sheet.layout.url);
  const x = Math.round(boss.position.x + look.offset.x);
  const y = Math.round(boss.position.y + look.offset.y);
  drawShadow(ctx, boss.position.x, boss.position.y + art.shadow.offsetY, art.shadow.radiusX, art.shadow.radiusY, '#070c1680');
  if (boss.isEnraged || look.death !== null) {
    // Alone della furia (e della morte): un bagliore del colore del boss che pulsa sotto lo sprite.
    const glow = bossFx(boss.definition.art).rage.glow;
    const pulse = 0.5 + 0.5 * Math.sin(look.clock * 6);
    const radius = art.shadow.radiusX * (1.6 + 0.25 * pulse);
    const gradient = ctx.createRadialGradient(x, y, 4, x, y, radius);
    gradient.addColorStop(0, `${glow}${look.death !== null ? 'aa' : '66'}`);
    gradient.addColorStop(1, `${glow}00`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const facingLeft = player.position.x < boss.position.x;
  if (sheet !== null && image !== null) {
    drawSheetBoss(ctx, boss, sheet, image, facingLeft, x, y, look.death === null ? poses.bossCastProgress : null, time, look);
    return;
  }
  const frame = Math.floor(time * (boss.isSlowed ? 2 : 5)) % 4;
  const casting = poses.bossCast > 0 && look.death === null;
  const sprite = casting ? art.casting : art.walk[frame]!;
  const bob = casting ? art.bob.casting : frame % 2 ? art.bob.odd : art.bob.even;
  const palette = art.palette(boss.isSlowed, boss.isEnraged);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingLeft ? -1 : 1, 1);
  if (look.death !== null) ctx.globalAlpha = 1 - look.death * 0.85;
  if (look.rim !== undefined && look.death === null) {
    ctx.globalAlpha = rimAlpha(look.rim);
    const rim = rimPalette(palette, look.rim.slice(0, 7));
    for (const [ox, oy] of RIM_OFFSETS) drawSprite(ctx, sprite, ox, bob + oy, art.scale, rim);
    ctx.globalAlpha = 1;
  }
  drawSprite(ctx, sprite, 0, bob, art.scale, palette);
  if (casting) art.drawCastFx?.(ctx, boss.isEnraged);
  const flash = look.death !== null ? 0.35 + look.death * 0.65 : look.flash;
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash) * (look.death !== null ? 1 - look.death * 0.5 : 0.85);
    drawSprite(ctx, sprite, 0, bob, art.scale, whitePalette(palette));
  }
  ctx.restore();
}

/** La stessa tavolozza in pietra grigia: un servitore addormentato sembra arredo. */
const stoneCache = new WeakMap<Palette, Palette>();
function stonePalette(palette: Palette): Palette {
  let stone = stoneCache.get(palette);
  if (!stone) {
    const greys = ['#2a2a30', '#5a5a64', '#7a7a84', '#8a8a94'];
    stone = Object.fromEntries(Object.keys(palette).map((key, i) => [key, greys[Math.min(i, greys.length - 1)]!]));
    stoneCache.set(palette, stone);
  }
  return stone;
}

/** La stessa tavolozza velata di brina: un servitore rallentato dal gelo. */
const frostCache = new WeakMap<Palette, Palette>();
function frostPalette(palette: Palette): Palette {
  let frost = frostCache.get(palette);
  if (!frost) {
    frost = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, mixHex(color, '#9fe4ff', 0.45)]));
    frostCache.set(palette, frost);
  }
  return frost;
}

/** Mescola due colori esadecimali (#rrggbb) nella proporzione `amount` del secondo. */
function mixHex(from: string, to: string, amount: number): string {
  const parse = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  const a = parse(from), b = parse(to);
  return `#${a.map((value, i) => Math.round(value + (b[i]! - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Un raster per fotogramma, tavolozza e bordo: un servitore si disegna con un'immagine invece che pixel per pixel. Con
 * `rim` (#rrggbbaa) la sagoma ha un bordo di un'unita' di quel colore, che la stacca dal pavimento; '' = senza bordo.
 */
const minionRasters = new WeakMap<SpriteFrame, WeakMap<Palette, Map<string, HTMLCanvasElement>>>();
function minionRaster(frame: SpriteFrame, palette: Palette, scale: number, rim = ''): HTMLCanvasElement {
  let byPalette = minionRasters.get(frame);
  if (!byPalette) {
    byPalette = new WeakMap();
    minionRasters.set(frame, byPalette);
  }
  let byRim = byPalette.get(palette);
  if (!byRim) {
    byRim = new Map();
    byPalette.set(palette, byRim);
  }
  let raster = byRim.get(rim);
  if (raster) return raster;
  const width = Math.max(...frame.map((row) => row.length));
  const pad = rim === '' ? 0 : 1;
  raster = document.createElement('canvas');
  raster.width = width * scale + pad * 2;
  raster.height = frame.length * scale + pad * 2;
  const painter = raster.getContext('2d')!;
  drawSprite(painter, frame, raster.width / 2, raster.height / 2, scale, palette);
  if (pad > 0) {
    // La sagoma spostata di un'unita' nelle quattro direzioni, tinta del colore del bordo, poi il corpo sopra.
    const body = document.createElement('canvas');
    body.width = raster.width;
    body.height = raster.height;
    body.getContext('2d')!.drawImage(raster, 0, 0);
    painter.clearRect(0, 0, raster.width, raster.height);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) painter.drawImage(body, dx, dy);
    painter.globalCompositeOperation = 'source-in';
    painter.fillStyle = rim;
    painter.fillRect(0, 0, raster.width, raster.height);
    painter.globalCompositeOperation = 'source-over';
    painter.drawImage(body, 0, 0);
  }
  byRim.set(rim, raster);
  return raster;
}

/** Alone dei servitori: un raster per colore e raggio. */
const glowRasters = new Map<string, HTMLCanvasElement>();
function glowRaster(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}|${Math.round(radius)}`;
  let raster = glowRasters.get(key);
  if (raster) return raster;
  const size = Math.ceil(radius * 2);
  raster = document.createElement('canvas');
  raster.width = size;
  raster.height = size;
  const painter = raster.getContext('2d')!;
  const gradient = painter.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, radius);
  gradient.addColorStop(0, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  painter.fillStyle = gradient;
  painter.fillRect(0, 0, size, size);
  glowRasters.set(key, raster);
  return raster;
}

/** Colori degli anelli delle elite, per modificatore. */
export const ELITE_COLORS: Readonly<Record<string, string>> = {
  robust: '#e8b06a',
  swift: '#7fd8ff',
  twin: '#d6a0ff',
  shielded: '#ffe9a0',
  ardent: '#ff8a3c',
  rotten: '#b8d060',
  incandescent: '#ffd04a',
  frozen: '#aef0ff',
};

/**
 * Disegna un servitore: ombra, alone, sprite a due fotogrammi (da un raster in cache), lampo se colpito, vita se ferito.
 * Gli stati si vedono: addormentato in pietra, sotto terra come un cumulo, in volo durante il salto, a terra mentre
 * si rialza; le elite hanno un anello del colore del modificatore e la barra sempre visibile; gli scudi un velo.
 * `rim` e' il bordo chiaro della sagoma (dal tema della mappa); chi dorme non ce l'ha, perche' deve sembrare pietra.
 */
export function drawMinion(ctx: CanvasRenderingContext2D, minion: Minion, time: number, flash: number, prey = false, rim = ''): void {
  const art = minionArt(minion.definition.visual);
  const { x, y } = minion.position;
  const half = (art.frames[0].length * art.scale) / 2;
  if (minion.state === 'burrowed' || minion.state === 'emerging') {
    // Un cumulo di terra che si muove; quando sta per uscire trema.
    const shake = minion.state === 'emerging' ? Math.sin(time * 60) * 2 : 0;
    ctx.fillStyle = '#2a201890';
    ctx.beginPath();
    ctx.ellipse(x + shake, y + 4, minion.hitRadius * 1.2, minion.hitRadius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(Math.round(x - 6 + shake), Math.round(y), 4, 3);
    ctx.fillRect(Math.round(x + 3 + shake), Math.round(y + 2), 3, 2);
    return;
  }
  const lift = minion.state === 'airborne' ? Math.sin(Math.max(0, Math.min(1, 1 - minion.stateTimer / Math.max(0.01, minion.definition.leap?.flight ?? 0.5))) * Math.PI) * 60 : 0;
  drawShadow(ctx, x, y + half - 2, minion.hitRadius * (lift > 0 ? 0.7 : 1), 3, '#070c1670');
  if (minion.elite !== null || prey) {
    const color = prey ? '#ffd889' : ELITE_COLORS[minion.elite!.id] ?? '#ffd889';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 5 + minion.id);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + half - 2, minion.hitRadius + 6, (minion.hitRadius + 6) * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const dormant = minion.state === 'dormant';
  if (art.glow !== '' && !dormant) {
    const radius = minion.hitRadius * 2.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowRaster(art.glow, radius), Math.round(x - radius), Math.round(y - radius - lift));
    ctx.restore();
  }
  const frameIndex = dormant ? 0 : Math.floor(time * (art.fps ?? 6) + minion.id) % 2;
  const sprite = art.frames[frameIndex]!;
  const bob = dormant || art.bob === false ? 0 : Math.sin(time * 8 + minion.id) * 1.5;
  const palette = dormant ? stonePalette(art.palette) : art.palette;
  const outline = dormant ? '' : rim;
  const raster = minionRaster(sprite, palette, art.scale, outline);
  const left = Math.round(x - raster.width / 2);
  const top = Math.round(y - raster.height / 2 + bob - lift);
  ctx.save();
  if (minion.state === 'reviving') {
    // Le ossa a terra, schiacciate: tra poco si rialzano.
    ctx.globalAlpha = 0.6;
    ctx.drawImage(raster, left, Math.round(y + half - raster.height * 0.35), raster.width, Math.round(raster.height * 0.35));
    ctx.restore();
    return;
  }
  ctx.drawImage(minion.slowFor > 0 ? minionRaster(sprite, frostPalette(palette), art.scale, outline) : raster, left, top);
  if (flash > 0) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(minionRaster(sprite, whitePalette(art.palette), art.scale, outline), left, top);
  }
  ctx.restore();
  if (minion.shield > 0 || minion.warded) {
    ctx.save();
    ctx.strokeStyle = minion.warded ? '#ffe9a0' : '#bfefff';
    ctx.globalAlpha = minion.warded ? 0.8 : 0.35 + Math.min(0.4, minion.shield / 60);
    ctx.lineWidth = minion.warded ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(x, y - lift, minion.hitRadius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const fraction = minion.health.fraction;
  if (fraction < 1 || minion.elite !== null || prey) {
    const width = minion.elite !== null || prey ? 30 : 22;
    ctx.fillStyle = '#1a1220d0';
    ctx.fillRect(Math.round(x - width / 2), Math.round(y - half - 7 - lift), width, 4);
    ctx.fillStyle = minion.elite !== null || prey ? '#ffd889' : '#e8b06a';
    ctx.fillRect(Math.round(x - width / 2 + 1), Math.round(y - half - 6 - lift), Math.max(1, Math.round((width - 2) * fraction)), 2);
  }
  if (minion.elite !== null || prey) {
    ctx.save();
    ctx.font = canvasFont(8, 'pixel');
    ctx.textAlign = 'center';
    ctx.fillStyle = prey ? '#ffd889' : ELITE_COLORS[minion.elite!.id] ?? '#ffd889';
    ctx.fillText(prey ? 'PREDA' : minion.elite!.name.toUpperCase(), Math.round(x), Math.round(y - half - 10 - lift));
    ctx.restore();
  }
}
