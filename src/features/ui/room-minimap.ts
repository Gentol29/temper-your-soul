import type { Camera } from '../../core/camera';
import type { ArenaDefinition } from '../arena/arena';
import type { Match } from '../match/match';
import type { Minion } from '../minions/minion';
import type { RoomView } from '../run/encounter';
import { ROOM_LABELS, TRIAL_LABELS } from '../run/rooms';
import { el, formatSeconds, requireElement } from './dom';
import { canvasFont } from '../presentation/fonts';

/*
 * La minimappa della stanza: piccola e quasi muta. Mostra la forma della stanza, i pilastri, le porte, la parte
 * inquadrata, i giocatori (forma, colore e numero), i servitori come densita' (puntini solo quando ne restano pochi),
 * elite, preda, nidi, premi e boss. Mai i proiettili: quelli si leggono sullo schermo. Si ridisegna 12 volte al
 * secondo e sbiadisce quando un proiettile nemico le passa sotto. Solo rappresentazione.
 */

/** Misure e colori provvisori (colori dei giocatori: tavolozza Okabe-Ito, leggibile anche dai daltonici). */
export const MINIMAP = {
  /** Lato della cella di densita' dei servitori, in pixel della minimappa. */
  cell: 8,
  /** Con tanti servitori o meno si disegnano uno per uno. */
  fewEnemies: 6,
  refresh: 1 / 12,
  /** Opacita' quando un proiettile nemico passa sotto la minimappa. */
  fadedOpacity: 0.3,
  colors: {
    background: '#140f18cc',
    room: '#2a2230',
    wall: '#c7aebc',
    pillar: '#8a7a86',
    doorClosed: '#6a6474',
    doorOpen: '#ffd27a',
    view: '#ffe7c6',
    enemy: '#e2453a',
    elite: '#ffffff',
    prey: '#ffd889',
    nest: '#ff8a5a',
    pickup: '#ffe9a0',
    boss: '#ff5a7a',
    chasm: '#060408',
    bridge: '#8a6a50',
    cover: '#6a5848',
  },
  players: ['#56b4e9', '#e69f00', '#f0e442', '#cc79a7'],
} as const;

/** Come la stanza entra nel riquadro: scala e scostamento, con un margine di 4 pixel. */
export interface MinimapLayout {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export function minimapLayout(arena: Pick<ArenaDefinition, 'width' | 'height'>, width: number, height: number): MinimapLayout {
  const margin = 4;
  const scale = Math.min((width - margin * 2) / arena.width, (height - margin * 2) / arena.height);
  return { scale, offsetX: (width - arena.width * scale) / 2, offsetY: (height - arena.height * scale) / 2 };
}

/** Le celle occupate dai servitori ostili, con il numero di servitori in ciascuna (chiave "colonna,riga"). */
export function densityCells(minions: readonly Pick<Minion, 'position' | 'isDead' | 'isHidden' | 'hostile'>[], layout: MinimapLayout, cell: number): Map<string, number> {
  const cells = new Map<string, number>();
  for (const minion of minions) {
    if (minion.isDead || minion.isHidden || !minion.hostile) continue;
    const column = Math.floor((layout.offsetX + minion.position.x * layout.scale) / cell);
    const row = Math.floor((layout.offsetY + minion.position.y * layout.scale) / cell);
    const key = `${column},${row}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
  return cells;
}

/** La riga sotto la minimappa: che stanza e' e a che punto e'. */
export function minimapStatus(room: RoomView | null, match: Pick<Match, 'boss' | 'minions'>): string {
  const boss = match.boss;
  const bossLine = boss !== null && !boss.health.isDead ? `${Math.ceil(boss.health.fraction * 100)}%` : null;
  if (room === null) return bossLine === null ? '' : `Boss · ${bossLine}`;
  const name = ROOM_LABELS[room.kind].name;
  if (room.cleared) return room.doors.length > 0 ? `${name} · libera, scegli una porta` : `${name} · libera`;
  const hostile = match.minions.filter((minion) => !minion.isDead && minion.hostile).length;
  if (room.kind === 'siege' && room.countdown !== null) {
    const nests = match.minions.filter((minion) => !minion.isDead && minion.definition.behavior === 'nest').length;
    return `${name} · ${formatSeconds(room.countdown)} · nidi ${nests}`;
  }
  if (room.kind === 'hunt' && room.preyId !== null) {
    const prey = match.minions.find((minion) => minion.id === room.preyId);
    return prey === undefined ? name : `${name} · preda ${Math.ceil(prey.health.fraction * 100)}%`;
  }
  if (room.kind === 'trial' && room.countdown !== null) return `${name} · ${formatSeconds(room.countdown)}`;
  if (room.kind === 'trial' && room.rule) return `${name} · ${TRIAL_LABELS[room.rule].name}`;
  if (bossLine !== null) return `${name} · ${bossLine}`;
  if (room.waves > 0) return `${name} · ondata ${Math.max(1, room.wave)}/${room.waves} · nemici ${hostile}`;
  return name;
}

export class RoomMinimap {
  private readonly root = requireElement('room-minimap');
  private readonly canvas = el('canvas', 'room-minimap-canvas');
  private readonly status = el('span', 'room-minimap-status');
  private elapsed = Infinity;
  private enabled = true;

  constructor() {
    this.root.replaceChildren(this.canvas, this.status);
  }

  /** Accende o spegne la minimappa (tasto N); resta spenta finche' non si riaccende. */
  toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) this.hide();
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  /**
   * Ridisegna al piu' 12 volte al secondo. `players` e' l'ordine dei giocatori (per colore e numero), `localId` il
   * giocatore di questo client.
   */
  update(dt: number, match: Match, room: RoomView | null, camera: Camera, localId: string, gameCanvas: HTMLCanvasElement): void {
    if (!this.enabled) return;
    this.root.classList.remove('hidden');
    this.elapsed += dt;
    if (this.elapsed < MINIMAP.refresh) return;
    this.elapsed = 0;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const ratio = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(width * ratio) || this.canvas.height !== Math.round(height * ratio)) {
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
    }
    const ctx = this.canvas.getContext('2d');
    if (ctx === null) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawMinimap(ctx, width, height, match, room, camera, localId);
    const status = minimapStatus(room, match);
    if (this.status.textContent !== status) this.status.textContent = status;
    this.root.setAttribute('aria-label', `Minimappa. ${status}`);
    this.root.style.opacity = this.shotUnder(match, camera, gameCanvas) ? String(MINIMAP.fadedOpacity) : '';
  }

  /** Vero se un proiettile nemico sta nella parte di mondo che la minimappa copre sullo schermo. */
  private shotUnder(match: Match, camera: Camera, gameCanvas: HTMLCanvasElement): boolean {
    const box = this.root.getBoundingClientRect();
    const view = gameCanvas.getBoundingClientRect();
    if (view.width === 0 || view.height === 0) return false;
    const toWorldX = (x: number): number => camera.position.x + ((x - view.left) / view.width) * camera.width;
    const toWorldY = (y: number): number => camera.position.y + ((y - view.top) / view.height) * camera.height;
    const x0 = toWorldX(box.left), x1 = toWorldX(box.right), y0 = toWorldY(box.top), y1 = toWorldY(box.bottom);
    return match.projectiles.some((shot) => shot.team === 'enemy' && shot.position.x > x0 && shot.position.x < x1 && shot.position.y > y0 && shot.position.y < y1);
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, width: number, height: number, match: Match, room: RoomView | null, camera: Camera, localId: string): void {
  const colors = MINIMAP.colors;
  const arena = match.arena;
  const layout = minimapLayout(arena, width, height);
  const X = (x: number): number => layout.offsetX + x * layout.scale;
  const Y = (y: number): number => layout.offsetY + y * layout.scale;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);
  // La stanza e i suoi muri.
  ctx.fillStyle = colors.room;
  ctx.fillRect(X(0), Y(0), arena.width * layout.scale, arena.height * layout.scale);
  ctx.strokeStyle = colors.wall;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(X(0) + 0.75, Y(0) + 0.75, arena.width * layout.scale - 1.5, arena.height * layout.scale - 1.5);
  ctx.fillStyle = colors.pillar;
  for (const pillar of arena.pillars) {
    ctx.beginPath();
    ctx.arc(X(pillar.position.x), Y(pillar.position.y), Math.max(1.5, pillar.radius * layout.scale), 0, Math.PI * 2);
    ctx.fill();
  }
  // I pozzi neri e i ponti che li attraversano; poi i massicci, pieni come i pilastri, e i ripari ancora in piedi.
  ctx.fillStyle = colors.chasm;
  for (const chasm of arena.chasms ?? []) ctx.fillRect(X(chasm.x), Y(chasm.y), chasm.width * layout.scale, chasm.height * layout.scale);
  ctx.fillStyle = colors.bridge;
  for (const bridge of arena.bridges ?? []) {
    const inset = 2 / layout.scale;
    if (bridge.along === 'ns') ctx.fillRect(X(bridge.x + inset), Y(bridge.y), (bridge.width - 2 * inset) * layout.scale, bridge.height * layout.scale);
    else ctx.fillRect(X(bridge.x), Y(bridge.y + inset), bridge.width * layout.scale, (bridge.height - 2 * inset) * layout.scale);
  }
  for (const solid of arena.solids ?? []) {
    ctx.fillStyle = solid.cover === undefined ? colors.pillar : colors.cover;
    ctx.fillRect(X(solid.x), Y(solid.y), solid.width * layout.scale, solid.height * layout.scale);
  }
  // Le porte sul muro in alto: oro se aperte, grigie con una × se chiuse.
  if (room !== null) {
    for (const door of room.doors) {
      const x = X(door.x);
      ctx.fillStyle = room.doorsOpen ? colors.doorOpen : colors.doorClosed;
      ctx.fillRect(x - 5, Y(0) - 1, 10, 4);
      if (!room.doorsOpen) {
        ctx.strokeStyle = colors.background;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 2, Y(0));
        ctx.lineTo(x + 2, Y(0) + 3);
        ctx.moveTo(x + 2, Y(0));
        ctx.lineTo(x - 2, Y(0) + 3);
        ctx.stroke();
      }
    }
    ctx.fillStyle = colors.pickup;
    for (const pickup of room.pickups) {
      if (pickup.kind === 'gold' || pickup.takenBy.includes(localId)) continue;
      ctx.fillRect(Math.round(X(pickup.x)) - 1.5, Math.round(Y(pickup.y)) - 1.5, 3, 3);
    }
  }
  // La parte inquadrata dalla camera.
  ctx.strokeStyle = colors.view;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeRect(X(camera.position.x) + 0.5, Y(camera.position.y) + 0.5, camera.width * layout.scale, camera.height * layout.scale);
  ctx.globalAlpha = 1;
  // I servitori: densita' a celle, oppure uno per uno quando ne restano pochi.
  const hostile = match.minions.filter((minion) => !minion.isDead && !minion.isHidden && minion.hostile);
  if (hostile.length > MINIMAP.fewEnemies) {
    for (const [key, count] of densityCells(hostile, layout, MINIMAP.cell)) {
      const [column, row] = key.split(',').map(Number) as [number, number];
      ctx.globalAlpha = Math.min(0.6, 0.25 + count * 0.1);
      ctx.fillStyle = colors.enemy;
      ctx.fillRect(column * MINIMAP.cell, row * MINIMAP.cell, MINIMAP.cell, MINIMAP.cell);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = colors.enemy;
    for (const minion of hostile) {
      ctx.beginPath();
      ctx.arc(X(minion.position.x), Y(minion.position.y), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Elite (rombo), preda (stella), nidi (esagono): sempre visibili, con un bordo scuro.
  for (const minion of hostile) {
    const x = X(minion.position.x), y = Y(minion.position.y);
    if (room !== null && minion.id === room.preyId) drawStar(ctx, x, y, 5, colors.prey);
    else if (minion.definition.behavior === 'nest') drawPolygon(ctx, x, y, 4.5, 6, colors.nest);
    else if (minion.elite !== null) drawPolygon(ctx, x, y, 4, 4, colors.elite);
  }
  const boss = match.boss;
  if (boss !== null && !boss.health.isDead) drawPolygon(ctx, X(boss.position.x), Y(boss.position.y), 6, 4, colors.boss);
  // I giocatori: triangolo verso la mira, colore e numero; quello di questo client con il bordo chiaro.
  let index = 0;
  for (const [id, player] of match.players) {
    const color = MINIMAP.players[index % MINIMAP.players.length]!;
    index++;
    const x = X(player.position.x), y = Y(player.position.y);
    const angle = Math.atan2(player.aim.y - player.position.y, player.aim.x - player.position.x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = player.health.isDead ? 0.4 : 1;
    ctx.fillStyle = color;
    ctx.strokeStyle = id === localId ? '#ffffff' : '#140f18';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (match.players.size > 1) {
      ctx.font = canvasFont(8, 'pixel', 'bold');
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText(String(index), x, y - 6);
    }
  }
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, color: string): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#140f18';
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#140f18';
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
}
