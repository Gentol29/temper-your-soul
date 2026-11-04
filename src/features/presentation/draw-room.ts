import { gateFrame } from './themes/scenery';
import type { Camera } from '../../core/camera';
import { TAU, Vec2 } from '../../core/vec2';
import { drawFlyingGold } from './gold-flight';
import type { ArenaDefinition, ArenaThemeId } from '../arena/arena';
import type { Minion } from '../minions/minion';
import type { PickupKind, RoomView } from '../run/encounter';
import { ROOM_LAYOUT } from '../run/room-templates';
import { ROOM_LABELS, type DoorOption } from '../run/rooms';
import { drawBossIndicator } from './draw-effects';
import { drawLight } from './lights';
import { ROOM_MOOD, type MoodFrame } from './room-mood';
import { drawSprite, type Palette, type SpriteFrame } from './sprites';
import { wallFaceHeight } from './themes/wall';
import { canvasFont } from './fonts';

/*
 * La stanza della discesa nel mondo: i cancelli delle porte (chiusi finche' la stanza non e' libera), i cartelli con
 * tipo di stanza e premio, la soglia che si riempie quando il gruppo ci sta sopra, i premi a terra. Solo aspetto: le
 * regole stanno in `run/encounter.ts`.
 */

/**
 * Colori dei cancelli per tema: grata della cripta, radici della palude, saracinesca della fucina, lastra di ghiaccio.
 * `dust` e' la polvere (o la neve) che si alza quando la grata dell'ingresso tocca terra.
 */
const GATES: Readonly<Record<ArenaThemeId, { readonly bar: string; readonly frame: string; readonly glow: string; readonly dust: string }>> = {
  crypt: { bar: '#6a6474', frame: '#3a3644', glow: '#ffd27a', dust: '#a49eb0' },
  swamp: { bar: '#5a4428', frame: '#2a2414', glow: '#c8e060', dust: '#7e7050' },
  forge: { bar: '#4a4a56', frame: '#24242c', glow: '#ff9a3d', dust: '#8e7e74' },
  glacier: { bar: '#9fe4ff', frame: '#2a4a6a', glow: '#e8fbff', dust: '#eef8ff' },
};

/** Icone dei premi: pixel art 7x7. */
const PICKUP_ICONS: Readonly<Record<PickupKind, { readonly frame: SpriteFrame; readonly palette: Palette; readonly label: string }>> = {
  gold: { frame: ['..aaa..','.abbba.','abcccba','abcdcba','abcccba','.abbba.','..aaa..'], palette: {a:'#654419',b:'#c58c29',c:'#f2c85d',d:'#fff1b4'}, label: 'Oro' },
  temper: { frame: ['..aaa..', '.abcba.', 'abcdcba', 'abcccba', '.aeeea.', '..aea..', '.aaaaa.'], palette: { a: '#2a1a14', b: '#ff9a3d', c: '#ffd04a', d: '#fff6e0', e: '#6a6474' }, label: 'Tempra' },
  embers: { frame: ['...a...', '..aba..', '.abcba.', 'abcdcba', 'abcccba', '.abbba.', '..aaa..'], palette: { a: '#3a1408', b: '#ff6a1a', c: '#ffb04a', d: '#fff0b0' }, label: 'Braci' },
  heal: { frame: ['..aaa..', '...a...', '..aba..', '.abbba.', 'abcbbba', 'abbbbba', '.aaaaa.'], palette: { a: '#2a1418', b: '#d53640', c: '#ffb0b0' }, label: 'Ristoro' },
  seal: { frame: ['.aaaaa.', 'abbbbba', 'abcccba', 'abcdcba', 'abcccba', 'abbbbba', '.aaaaa.'], palette: { a: '#3a1418', b: '#a82a3a', c: '#d84a5a', d: '#ffd889' }, label: 'Sigillo' },
  fountain: { frame: ['...b...', '..bcb..', '...b...', 'aaaaaaa', 'abcccba', '.abbba.', '..aaa..'], palette: { a: '#3a4250', b: '#7fd8ff', c: '#e8fbff' }, label: 'Fonte · cura' },
  anvil: { frame: ['.......', 'aaaaaaa', 'abbbbba', '.aabaa.', '..aba..', '.abbba.', 'aaaaaaa'], palette: { a: '#14141a', b: '#6a6a78' }, label: 'Incudine · tempra' },
  chest: { frame: ['.aaaaa.', 'abbbbba', 'accccca', 'abbdbba', 'abbbbba', 'abbbbba', 'aaaaaaa'], palette: { a: '#2a1a10', b: '#8a5a2a', c: '#d8a84a', d: '#ffe9a0' }, label: 'Forziere' },
};

/** Teschio delle porte piu' dure. */
const SKULL: SpriteFrame = ['.aaa.', 'abbba', 'acbca', 'abbba', '.aba.'];
const SKULL_PALETTE: Palette = { a: '#1a1418', b: '#e8dfc8', c: '#1a1418' };

export interface RoomLook {
  readonly view: RoomView;
  readonly arena: ArenaDefinition;
  /** Le porte della tappa successiva, nell'ordine dei cancelli. */
  readonly nextOptions: readonly DoorOption[];
  /** Il giocatore di questo client (i premi gia' presi da lui non si vedono piu'). */
  readonly localId: string;
  /** L'atmosfera della stanza (grate che calano e salgono); senza, le grate seguono `view.doorsOpen` di colpo. */
  readonly mood?: MoodFrame;
  /** La vena di servitori dietro le porte ("Catacombe"), se la discesa ne usa piu' d'una. */
  readonly nextVein?: string;
  /** Il destinatario vivo: l'oro vola verso di lui e non richiede prossimità. */
  readonly collector?: Vec2;
}

function pickupHidden(view: RoomView, pickup: RoomView['pickups'][number], localId: string): boolean {
  if (pickup.kind === 'seal') return pickup.takenBy.length > 0;
  if (pickup.takenBy.includes(localId)) return true;
  // Fonte o incudine: presa una, l'altra sparisce.
  if (pickup.kind === 'fountain' || pickup.kind === 'anvil') {
    return view.pickups.some((other) => (other.kind === 'fountain' || other.kind === 'anvil') && other.takenBy.includes(localId));
  }
  return false;
}

/**
 * L'ambiente della stanza, sotto la luce: soglie e cancelli delle porte (alti quanto la faccia del muro). Le porte
 * aperte e i premi accendono una luce nella mappa.
 */
export function drawRoomFloor(ctx: CanvasRenderingContext2D, look: RoomLook, clock: number): void {
  const { view, arena } = look;
  const gate = GATES[arena.theme];
  const wall = ROOM_LAYOUT.wallThickness;
  const face = wallFaceHeight(arena);
  // Le grate salgono quando la stanza e' libera (di colpo se non c'e' l'atmosfera).
  const raised = look.mood?.exits ?? (view.doorsOpen ? 1 : 0);
  for (const door of view.doors) {
    const open = raised > 0.5;
    // La soglia: una lastra davanti al cancello, che si accende quando il gruppo ci sta sopra.
    if (gateFrame(arena.theme) !== null) {
      drawGothicThreshold(ctx, door.x, wall + face, wall + ROOM_LAYOUT.doorDepth, open ? gate.glow : '#000000', open ? (door.progress > 0 ? 0.42 : 0.2) : 0.3);
    } else {
      ctx.save();
      ctx.fillStyle = open ? `${gate.glow}${door.progress > 0 ? '40' : '18'}` : '#00000030';
      ctx.fillRect(door.x - ROOM_LAYOUT.doorHalfWidth, wall, ROOM_LAYOUT.doorHalfWidth * 2, ROOM_LAYOUT.doorDepth);
      ctx.restore();
    }
    if (!drawGothicGate(ctx, door.x, wall + face, arena.theme, gate, raised, clock)) drawGate(ctx, door.x, 0, wall + face, gate, raised, clock, false);
    if (raised > 0) drawLight(ctx, door.x, wall + face, gate.glow, 170, (0.55 + 0.25 * door.progress) * raised);
    if (door.progress > 0) {
      ctx.save();
      ctx.strokeStyle = gate.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(door.x, door.y, 30, -Math.PI / 2, -Math.PI / 2 + door.progress * TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const pickup of view.pickups) {
    if (pickup.kind !== 'gold' && !pickupHidden(view, pickup, look.localId)) drawLight(ctx, pickup.x, pickup.y, '#ffe9a0', 120, 0.7);
  }
}

/**
 * L'ingresso alle spalle: sta nel muro in basso, quindi davanti alle figure. Con l'atmosfera la sua grata cala poco
 * dopo l'arrivo e alza un po' di polvere; senza, e' sempre chiusa.
 */
export function drawRoomFront(ctx: CanvasRenderingContext2D, look: RoomLook, clock: number): void {
  const wall = ROOM_LAYOUT.wallThickness;
  const gate = GATES[look.arena.theme];
  const x = look.arena.width / 2;
  const top = look.arena.height - wall;
  drawGate(ctx, x, top, wall, gate, 1 - (look.mood?.entrance ?? 1), clock, true);
  const since = look.mood?.sinceImpact ?? null;
  if (since !== null && since < ROOM_MOOD.dustTime) drawGateDust(ctx, x, top, gate.dust, since / ROOM_MOOD.dustTime);
}

/** Sbuffi di polvere ai lati della grata appena caduta: `t` da 0 (impatto) a 1 (spariti). */
function drawGateDust(ctx: CanvasRenderingContext2D, x: number, top: number, color: string, t: number): void {
  const half = ROOM_LAYOUT.doorHalfWidth;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.65 * (1 - t);
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const spread = 0.35 + ((i * 37) % 11) / 11;
    const rise = 10 + ((i * 53) % 7) * 4;
    const size = 3 + (i % 3);
    const px = x + side * (half * 0.6 + spread * 70 * Math.sqrt(t));
    const py = top - 4 - rise * Math.sqrt(t);
    ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
  }
  ctx.restore();
}

/** I premi a terra, a piena luce (sopra la mappa di luce, sotto le figure). */
export function drawRoomPickups(ctx: CanvasRenderingContext2D, look: RoomLook, clock: number): void {
  const { view } = look;
  for (const pickup of view.pickups) {
    if (pickupHidden(view, pickup, look.localId)) continue;
    if (pickup.kind === 'gold') {
      if (look.collector) drawFlyingGold(ctx, new Vec2(pickup.x, pickup.y), look.collector, pickup.age ?? 0, pickup.id);
      continue;
    }
    const icon = PICKUP_ICONS[pickup.kind];
    const bob = Math.sin(clock * 3 + pickup.id) * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(pickup.x, pickup.y, 2, pickup.x, pickup.y, 34);
    gradient.addColorStop(0, '#ffe9a055');
    gradient.addColorStop(1, '#ffe9a000');
    ctx.fillStyle = gradient;
    ctx.fillRect(pickup.x - 34, pickup.y - 34, 68, 68);
    ctx.restore();
    ctx.fillStyle = '#070c1670';
    ctx.beginPath();
    ctx.ellipse(pickup.x, pickup.y + 14, 12, 4, 0, 0, TAU);
    ctx.fill();
    drawSprite(ctx, icon.frame, pickup.x, pickup.y - 4 + bob, 3, icon.palette);
  }
}

/**
 * Un cancello alto `height` nel muro. `raised` dice quanto e' alzata la grata (0 giu', 1 tutta dentro il muro): sale e
 * scende scorrendo, con le punte in basso. Le uscite aperte brillano; l'ingresso aperto resta buio.
 */
/**
 * Una porta come portale gotico del tema: il vano buio, la luce quando si apre, la grata che sale e, sopra, l'arco. La
 * soglia di gioco resta quella di `ROOM_LAYOUT`. Falso se i fogli non ci sono.
 */
function drawGothicGate(ctx: CanvasRenderingContext2D, x: number, base: number, theme: ArenaThemeId, gate: (typeof GATES)[ArenaThemeId], raised: number, clock: number): boolean {
  const frame = gateFrame(theme);
  const hole = frame?.piece.hole;
  if (frame === null || hole === undefined) return false;
  const { sheet, piece } = frame;
  const left = Math.round(x - piece.w / 2);
  const top = base - piece.h;
  const hx = left + hole.x;
  const hy = top + hole.y;
  const lift = Math.max(0, Math.min(1, raised));
  ctx.save();
  ctx.fillStyle = '#07060a';
  ctx.fillRect(hx, hy, hole.w, hole.h);
  if (lift > 0) {
    // La luce viene da oltre la porta: piu' forte in basso, a gradini come il resto.
    const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(clock * 4 + x));
    ctx.fillStyle = gate.glow;
    for (let y = 0; y < hole.h; y += 4) {
      ctx.globalAlpha = (0.1 + 0.8 * ((y + 4) / hole.h) ** 1.4) * pulse * lift;
      ctx.fillRect(hx, hy + y, hole.w, Math.min(4, hole.h - y));
    }
    ctx.globalAlpha = 1;
  }
  const hanging = hole.h * (1 - lift);
  if (hanging > 0.5) {
    for (let bx = hx + 4; bx < hx + hole.w - 2; bx += 10) {
      ctx.fillStyle = gate.bar;
      ctx.fillRect(bx, hy, 3, hanging);
      ctx.fillStyle = gate.frame;
      ctx.fillRect(bx + 3, hy, 1, hanging);
      // Punte in fondo alle sbarre.
      ctx.fillStyle = gate.bar;
      ctx.fillRect(bx - 1, hy + hanging - 3, 5, 2);
    }
    for (const at of [0.3, 0.68]) {
      ctx.fillStyle = gate.frame;
      ctx.fillRect(hx, Math.round(hy + hanging * at), hole.w, 3);
      ctx.fillStyle = gate.bar;
      ctx.fillRect(hx, Math.round(hy + hanging * at), hole.w, 1);
    }
  }
  ctx.drawImage(sheet, piece.x, piece.y, piece.w, piece.h, left, top, piece.w, piece.h);
  ctx.restore();
  return true;
}

/** La soglia sotto un portale: una luce che si spegne a gradini verso la stanza e due angoli che segnano dove finisce. */
function drawGothicThreshold(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, color: string, strength: number): void {
  const half = ROOM_LAYOUT.doorHalfWidth;
  const step = 6;
  ctx.save();
  ctx.fillStyle = color;
  for (let y = top; y < bottom; y += step) {
    const fade = 1 - (y - top) / (bottom - top);
    const height = Math.min(step, bottom - y);
    ctx.globalAlpha = strength * fade * 0.55;
    ctx.fillRect(x - half, y, half * 2, height);
    ctx.globalAlpha = strength * fade * 0.45;
    ctx.fillRect(x - half + 12, y, half * 2 - 24, height);
  }
  ctx.globalAlpha = Math.min(1, strength * 2.2);
  for (const side of [-1, 1]) {
    const edge = side < 0 ? x - half : x + half - 2;
    const foot = side < 0 ? x - half : x + half - 10;
    ctx.fillRect(edge, bottom - 10, 2, 10);
    ctx.fillRect(foot, bottom - 2, 10, 2);
  }
  ctx.restore();
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  height: number,
  gate: (typeof GATES)[ArenaThemeId],
  raised: number,
  clock: number,
  entrance: boolean,
): void {
  const half = ROOM_LAYOUT.doorHalfWidth - 6;
  const lift = Math.max(0, Math.min(1, raised));
  ctx.save();
  ctx.fillStyle = gate.frame;
  ctx.fillRect(x - half - 8, top - 2, half * 2 + 16, height + 4);
  ctx.fillStyle = '#07060a';
  ctx.fillRect(x - half, top, half * 2, height);
  if (lift > 0 && !entrance) {
    const pulse = 0.5 + 0.5 * Math.sin(clock * 4 + x);
    ctx.globalAlpha = (0.35 + 0.35 * pulse) * lift;
    ctx.fillStyle = gate.glow;
    ctx.fillRect(x - half, top, half * 2, height);
    ctx.globalAlpha = 1;
  }
  const hanging = height * (1 - lift);
  if (hanging > 0.5) {
    ctx.beginPath();
    ctx.rect(x - half, top, half * 2, height);
    ctx.clip();
    ctx.fillStyle = gate.bar;
    for (let bx = x - half + 6; bx < x + half; bx += 12) {
      ctx.fillRect(bx, top, 4, hanging);
      // Punte in fondo alle sbarre.
      ctx.fillRect(bx - 1, top + hanging - 3, 6, 2);
    }
    // La traversa sale con la grata.
    if (!entrance) ctx.fillRect(x - half, top + height / 2 - 2 - height * lift, half * 2, 4);
  }
  ctx.restore();
}

/** Sopra i personaggi: i cartelli delle porte (tipo di stanza, premio, teschio per le piu' dure) e i nomi dei premi. */
export function drawRoomLabels(ctx: CanvasRenderingContext2D, look: RoomLook): void {
  const { view } = look;
  view.doors.forEach((door, index) => {
    const option = look.nextOptions[index];
    if (option === undefined) return;
    const room = ROOM_LABELS[option.kind].name.toUpperCase();
    const reward = '';
    const text = reward !== '' ? `${room} · ${reward}` : room;
    ctx.save();
    ctx.font = canvasFont(10, 'text', 'bold');
    ctx.textAlign = 'center';
    const width = ctx.measureText(text).width + (option.hard ? 26 : 14);
    const y = ROOM_LAYOUT.wallThickness + ROOM_LAYOUT.doorDepth + 18;
    ctx.fillStyle = view.doorsOpen ? '#1a1218e6' : '#1a121890';
    ctx.fillRect(door.x - width / 2, y - 11, width, 15);
    ctx.strokeStyle = option.hard ? '#d84a5a' : '#8d6b61';
    ctx.lineWidth = 1;
    ctx.strokeRect(door.x - width / 2 + 0.5, y - 10.5, width - 1, 14);
    ctx.fillStyle = view.doorsOpen ? '#ffe7c6' : '#a89aa0';
    ctx.fillText(text, door.x + (option.hard ? 6 : 0), y);
    if (option.hard) drawSprite(ctx, SKULL, door.x - width / 2 + 9, y - 4, 2, SKULL_PALETTE);
    // La vena dietro la porta, sotto il cartello.
    if (look.nextVein !== undefined && option.kind !== 'sanctuary' && option.kind !== 'antechamber' && option.kind !== 'boss') {
      ctx.font = canvasFont(9, 'text');
      ctx.fillStyle = view.doorsOpen ? '#d8c0e8' : '#8a7a90';
      ctx.fillText(look.nextVein, door.x, y + 13);
    }
    ctx.restore();
  });
  for (const pickup of view.pickups) {
    if (pickup.kind === 'gold' || pickupHidden(view, pickup, look.localId)) continue;
    ctx.save();
    ctx.font = canvasFont(9, 'text');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a0';
    ctx.fillText(PICKUP_ICONS[pickup.kind].label, pickup.x, pickup.y + 28);
    ctx.restore();
  }
}

/** Sullo schermo: frecce verso la preda della Caccia e verso l'ultimo nemico fuori vista. */
export function drawRoomIndicators(ctx: CanvasRenderingContext2D, camera: Camera, player: Vec2, view: RoomView, minions: readonly Minion[]): void {
  if (view.cleared) return;
  const prey = view.preyId === null ? undefined : minions.find((minion) => minion.id === view.preyId);
  if (prey !== undefined) {
    drawBossIndicator(ctx, camera, player, prey.position, 'PREDA', '#ffd889');
    return;
  }
  const hostile = minions.filter((minion) => !minion.isDead && minion.hostile);
  if (hostile.length > 0 && hostile.length <= 3) {
    for (const minion of hostile) drawBossIndicator(ctx, camera, player, minion.position, hostile.length === 1 ? 'ULTIMO' : '', '#e8c4aa');
  }
}
