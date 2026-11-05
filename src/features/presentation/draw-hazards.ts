import type { Camera } from '../../core/camera';
import { Vec2 } from '../../core/vec2';
import type { ArenaDefinition, ArenaThemeId, Bridge, Solid } from '../arena/arena';
import type { CoverState } from '../match/match';
import { FEEDBACK } from './effects';
import { drawLight } from './lights';
import { sheetSilhouette, sheetVariant } from './boss-art/sheet-images';
import { pixelEllipse } from './themes/scenery';
import { ACTIVE_TILE_ATLASES, drawTile, tileAt, tileGrid, tileSheet, tileVariants, TILE_SCALE, TILE_SIZE } from './themes/tiles';

/*
 * Pozzi, ponti e ripari delle stanze della fase 5. Solo aspetto: le regole sono in `arena.ts` e `match.ts`. I tile
 * vengono dal foglio del tema (`themes/tiles.ts`); finche' non e' caricato si disegna tutto nel codice.
 */

/** Che cosa si muove dentro un pozzo: polvere che cade, acqua nera, lava, nebbia fredda. */
type ChasmMotion = 'dust' | 'water' | 'lava' | 'mist';

/** Come appaiono pozzi, ponti e ripari in un tema. Valori provvisori, solo aspetto. */
export interface HazardLook {
  /** Il fondo del pozzo e il suo bordo, quando non ci sono i tile. */
  readonly depth: string;
  readonly rim: string;
  readonly motion: ChasmMotion;
  /** Colore di cio' che si muove nel pozzo (polvere, increspature, lava, nebbia) e della sua luce. */
  readonly motionColor: string;
  /** Ringhiere e pali del ponte, assi quando non ci sono i tile. */
  readonly rail: string;
  readonly post: string;
  readonly deck: string;
  /** Riparo senza tile: corpo e bordo. Crepe e schegge. */
  readonly cover: string;
  readonly coverEdge: string;
  readonly crack: string;
}

export const HAZARD_LOOKS: Readonly<Record<ArenaThemeId, HazardLook>> = {
  crypt: { depth: '#030406', rim: '#4a4f5c', motion: 'dust', motionColor: '#8a8f9c', rail: '#21170f', post: '#4b3521', deck: '#3a2a1c', cover: '#352517', coverEdge: '#62462c', crack: '#100b08' },
  swamp: { depth: '#030a08', rim: '#3f5428', motion: 'water', motionColor: '#27493b', rail: '#1f170e', post: '#433422', deck: '#2f2418', cover: '#2b2117', coverEdge: '#4b3b28', crack: '#0d0a06' },
  forge: { depth: '#3a1a0c', rim: '#4a3f38', motion: 'lava', motionColor: '#ff6a1f', rail: '#2a2420', post: '#5e544c', deck: '#3a332e', cover: '#45301e', coverEdge: '#7a5a38', crack: '#120c08' },
  glacier: { depth: '#030a16', rim: '#33618a', motion: 'mist', motionColor: '#a9d6ee', rail: '#1c3450', post: '#5283ad', deck: '#355a82', cover: '#3f7fae', coverEdge: '#b4e2f6', crack: '#0f2a44' },
};

function visible(camera: Camera, rect: Solid, margin = 40): boolean {
  return camera.isVisible(new Vec2(rect.x + rect.width / 2, rect.y + rect.height / 2), Math.hypot(rect.width, rect.height) / 2 + margin);
}

/** Valore pseudocasuale stabile in [0, 1) per un punto (solo aspetto). */
function noise(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Pozzi, ponti e ripari della mappa, nell'ordine in cui stanno uno sull'altro. `covers` e' la vita dei ripari della
 * partita, `flashes` i secondi di lampo dei ripari appena colpiti.
 */
export function drawHazards(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, covers: readonly CoverState[], camera: Camera, clock: number, flashes: ReadonlyMap<number, number>): void {
  for (const chasm of arena.chasms ?? []) drawChasm(ctx, chasm, arena.theme, camera, clock);
  for (const bridge of arena.bridges ?? []) drawBridge(ctx, bridge, arena.theme, camera);
  for (const solid of arena.solids ?? []) {
    if (solid.cover === undefined) continue;
    const state = covers[solid.cover];
    drawCover(ctx, solid, state === undefined ? 1 : state.health / state.maxHealth, arena.theme, camera, flashes.get(solid.cover) ?? 0);
  }
}

/** La parte del rettangolo dentro la vista (con un margine), o null se non si vede. */
function visiblePart(rect: Solid, camera: Camera, margin: number): Solid | null {
  const left = Math.max(rect.x, camera.position.x - margin);
  const top = Math.max(rect.y, camera.position.y - margin);
  const right = Math.min(rect.x + rect.width, camera.position.x + camera.width + margin);
  const bottom = Math.min(rect.y + rect.height, camera.position.y + camera.height + margin);
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}

/**
 * Il fondo del pozzo: i tile 3 x 3 del tema (angoli, lati, centro) adattati al rettangolo, o un riempimento scuro. Si
 * disegnano solo le colonne e le righe di `view`: un fiume lungo quanto la stanza non costa piu' della parte inquadrata.
 */
export function drawChasmBed(ctx: CanvasRenderingContext2D, rect: Solid, theme: ArenaThemeId, view: Solid): void {
  const look = HAZARD_LOOKS[theme];
  const sheet = tileSheet(theme);
  const pieces = tileVariants(theme, 'chasm');
  if (sheet !== null && pieces.length === 9) {
    // Il fondo che ripete, allineato al mondo; i nove pezzi sono solo l'orlo.
    const hasBed = tileGrid(theme, 'chasmBed') !== undefined;
    if (hasBed) {
      for (let y = Math.floor(view.y / TILE_SIZE) * TILE_SIZE; y < view.y + view.height; y += TILE_SIZE) {
        for (let x = Math.floor(view.x / TILE_SIZE) * TILE_SIZE; x < view.x + view.width; x += TILE_SIZE) {
          const tile = tileAt(theme, 'chasmBed', x, y, 0);
          if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
        }
      }
    }
    // L'ultima colonna e l'ultima riga si appoggiano al bordo: il rettangolo puo' non essere un multiplo dei tile.
    const cols = Math.max(2, Math.ceil(rect.width / TILE_SIZE));
    const rows = Math.max(2, Math.ceil(rect.height / TILE_SIZE));
    const firstColumn = Math.max(0, Math.floor((view.x - rect.x) / TILE_SIZE) - 1);
    const lastColumn = Math.min(cols - 1, Math.ceil((view.x + view.width - rect.x) / TILE_SIZE));
    const firstRow = Math.max(0, Math.floor((view.y - rect.y) / TILE_SIZE) - 1);
    const lastRow = Math.min(rows - 1, Math.ceil((view.y + view.height - rect.y) / TILE_SIZE));
    // La colonna e la riga di bordo (appoggiate all'altro lato) possono cadere nella vista anche fuori da questi indici.
    const columns = [...new Set([...Array.from({ length: Math.max(0, lastColumn - firstColumn + 1) }, (_, k) => firstColumn + k), cols - 1])];
    const rowList = [...new Set([...Array.from({ length: Math.max(0, lastRow - firstRow + 1) }, (_, k) => firstRow + k), rows - 1])];
    for (const j of rowList) {
      for (const i of columns) {
        const column = i === 0 ? 0 : i === cols - 1 ? 2 : 1;
        const row = j === 0 ? 0 : j === rows - 1 ? 2 : 1;
        if (hasBed && column === 1 && row === 1) continue;
        const x = i === cols - 1 ? rect.x + rect.width - TILE_SIZE : rect.x + i * TILE_SIZE;
        const y = j === rows - 1 ? rect.y + rect.height - TILE_SIZE : rect.y + j * TILE_SIZE;
        drawTile(ctx, sheet, pieces[row * 3 + column]!, x, y);
      }
    }
    return;
  }
  ctx.fillStyle = look.depth;
  ctx.fillRect(view.x, view.y, view.width, view.height);
  // La parete lontana del pozzo (in alto, vista a tre quarti) e il bordo.
  ctx.fillStyle = look.rim;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(rect.x, rect.y, rect.width, Math.min(16, rect.height / 3));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = look.rim;
  ctx.lineWidth = 4;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);
}

/** Un pozzo, con cio' che ci si muove dentro: polvere che cade, increspature, lava che pulsa e illumina, nebbia. */
function drawChasm(ctx: CanvasRenderingContext2D, rect: Solid, theme: ArenaThemeId, camera: Camera, clock: number): void {
  const view = visiblePart(rect, camera, 40);
  if (view === null) return;
  const look = HAZARD_LOOKS[theme];
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  drawChasmBed(ctx, rect, theme, view);
  // Cio' che si muove dentro, solo nella parte inquadrata (allineato al mondo, quindi non salta scorrendo).
  const inner = { x: Math.max(rect.x + 14, view.x), y: rect.y + 20, width: Math.min(rect.x + rect.width - 14, view.x + view.width) - Math.max(rect.x + 14, view.x), height: rect.height - 34 };
  switch (look.motion) {
    case 'dust':
      // Granelli che cadono nel buio e si spengono.
      ctx.fillStyle = look.motionColor;
      for (let x = Math.floor(inner.x / 48) * 48; x < inner.x + inner.width; x += 48) {
        const h = noise(x, rect.y);
        const t = (clock * (0.25 + h * 0.2) + h) % 1;
        ctx.globalAlpha = 0.5 * (1 - t);
        ctx.fillRect(x + h * 40, inner.y + t * inner.height, 2, 2);
      }
      break;
    case 'water':
      // Acqua nera: increspature lente e qualche riflesso.
      ctx.fillStyle = look.motionColor;
      for (let y = inner.y + 8; y < inner.y + inner.height; y += 28) {
        for (let x = Math.floor(inner.x / 64) * 64; x < inner.x + inner.width; x += 64) {
          const h = noise(x, y);
          ctx.globalAlpha = 0.55 + 0.25 * Math.sin(clock * 1.2 + h * 9);
          ctx.fillRect(x + h * 30 + Math.sin(clock * 0.8 + h * 6) * 6, y, 18 + h * 10, 2);
        }
      }
      break;
    case 'lava': {
      // La lava pulsa e illumina le rive.
      const pulse = 0.5 + 0.5 * Math.sin(clock * 1.6 + rect.x * 0.01);
      ctx.globalAlpha = 0.08 + 0.1 * pulse;
      ctx.fillStyle = '#ffc15a';
      ctx.fillRect(inner.x, inner.y, inner.width, inner.height);
      ctx.globalAlpha = 1;
      const long = rect.width >= rect.height;
      for (let at = 48; at < (long ? rect.width : rect.height); at += 128) {
        const x = long ? rect.x + at : rect.x + rect.width / 2;
        const y = long ? rect.y + rect.height / 2 : rect.y + at;
        // Le luci lontane dalla vista non illuminano nulla di visibile.
        if (!camera.isVisible(new Vec2(x, y), 150)) continue;
        drawLight(ctx, x, y, look.motionColor, 150, 0.45 + 0.2 * pulse);
        // Una bolla che sale e scoppia.
        const h = noise(x, y);
        const t = (clock * 0.7 + h * 3) % 1;
        ctx.fillStyle = '#ffd98a';
        ctx.globalAlpha = 1 - t;
        ctx.fillRect(x + (h - 0.5) * 40, y + 10 - t * 16, 4, 4);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'mist':
      // Nebbia fredda che sale dal fondo del crepaccio.
      ctx.fillStyle = look.motionColor;
      if (tileGrid(theme, 'chasmBed') === undefined) {
        for (let x = Math.floor(inner.x / 72) * 72; x < inner.x + inner.width; x += 72) {
          const h = noise(x, rect.y);
          ctx.globalAlpha = 0.06 + 0.05 * Math.sin(clock * 0.9 + h * 7);
          ctx.fillRect(x + Math.sin(clock * 0.4 + h * 5) * 10, inner.y + inner.height * 0.35, 60, inner.height * 0.4);
        }
        break;
      }
      // Con i fogli nuovi a fiocchi, a pixel interi: niente fasce sfumate.
      for (let x = Math.floor(inner.x / 28) * 28; x < inner.x + inner.width; x += 28) {
        const h = noise(x, rect.y);
        const t = (clock * (0.12 + h * 0.1) + h) % 1;
        ctx.globalAlpha = 0.55 * (1 - t);
        ctx.fillRect(Math.round(x + h * 20 + Math.sin(clock * 0.8 + h * 9) * 4), Math.round(inner.y + inner.height * (1 - t)), 2, 2);
      }
      break;
  }
  ctx.restore();
}

/** Un ponte: il vuoto sotto, le assi (tile del tema) che sporgono un poco sulle rive, le ringhiere con i pali. */
export function drawBridge(ctx: CanvasRenderingContext2D, bridge: Bridge, theme: ArenaThemeId, camera: Camera): void {
  if (!visible(camera, bridge)) return;
  const look = HAZARD_LOOKS[theme];
  const ns = bridge.along === 'ns';
  // Il vuoto sotto il ponte, come il centro del pozzo.
  ctx.fillStyle = look.depth;
  ctx.fillRect(bridge.x, bridge.y, bridge.width, bridge.height);
  // Le assi: oltre il pozzo di 8 unita' per parte, nel verso in cui si cammina.
  const deck = ns
    ? { x: bridge.x + 6, y: bridge.y - 8, width: bridge.width - 12, height: bridge.height + 16 }
    : { x: bridge.x - 8, y: bridge.y + 6, width: bridge.width + 16, height: bridge.height - 12 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(deck.x, deck.y, deck.width, deck.height);
  ctx.clip();
  const sheet = tileSheet(theme);
  const material = ns ? 'bridgeNS' : 'bridgeEW';
  const plank = tileVariants(theme, material)[0];
  if (sheet !== null && plank !== undefined && tileGrid(theme, material) !== undefined) {
    // Una superficie che ripete, allineata al mondo: fra una tavola e l'altra non si vede il tile.
    for (let y = Math.floor(deck.y / TILE_SIZE) * TILE_SIZE; y < deck.y + deck.height; y += TILE_SIZE) {
      for (let x = Math.floor(deck.x / TILE_SIZE) * TILE_SIZE; x < deck.x + deck.width; x += TILE_SIZE) {
        const tile = tileAt(theme, material, x, y, 0);
        if (tile !== undefined) drawTile(ctx, sheet, tile, x, y);
      }
    }
  } else if (sheet !== null && plank !== undefined) {
    for (let y = deck.y; y < deck.y + deck.height; y += TILE_SIZE) {
      for (let x = deck.x; x < deck.x + deck.width; x += TILE_SIZE) drawTile(ctx, sheet, plank, x, y);
    }
  } else {
    ctx.fillStyle = look.deck;
    ctx.fillRect(deck.x, deck.y, deck.width, deck.height);
    ctx.fillStyle = look.rail;
    if (ns) for (let y = deck.y; y < deck.y + deck.height; y += 16) ctx.fillRect(deck.x, y, deck.width, 2);
    else for (let x = deck.x; x < deck.x + deck.width; x += 16) ctx.fillRect(x, deck.y, 2, deck.height);
  }
  ctx.restore();
  // Ombra delle assi sul vuoto e ringhiere ai due lati, con un palo ogni 64 unita'.
  ctx.fillStyle = '#00000066';
  if (ns) ctx.fillRect(deck.x, deck.y + deck.height, deck.width, 6);
  else ctx.fillRect(deck.x, deck.y + deck.height, deck.width, 8);
  const railPiece = tileVariants(theme, ns ? 'railNS' : 'railEW')[0];
  const postPiece = tileVariants(theme, 'post')[0];
  if (sheet !== null && railPiece !== undefined && postPiece !== undefined) {
    // Corrimano e pali del foglio: stessa grana delle assi.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (ns) {
      for (const x of [deck.x - 2, deck.x + deck.width - railPiece.w + 2]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, deck.y, railPiece.w, deck.height);
        ctx.clip();
        for (let y = deck.y; y < deck.y + deck.height; y += railPiece.h) drawTile(ctx, sheet, railPiece, x, y);
        ctx.restore();
        for (let y = deck.y; y <= deck.y + deck.height - postPiece.h; y += 64) drawTile(ctx, sheet, postPiece, x - 2, y);
      }
    } else {
      for (const y of [deck.y - 2, deck.y + deck.height - railPiece.h + 2]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(deck.x, y, deck.width, railPiece.h);
        ctx.clip();
        for (let x = deck.x; x < deck.x + deck.width; x += railPiece.w) drawTile(ctx, sheet, railPiece, x, y);
        ctx.restore();
        for (let x = deck.x; x <= deck.x + deck.width - postPiece.w; x += 64) drawTile(ctx, sheet, postPiece, x, y - 4);
      }
    }
    ctx.restore();
    return;
  }
  const rails = ns
    ? [{ x: deck.x, y: deck.y, width: 4, height: deck.height }, { x: deck.x + deck.width - 4, y: deck.y, width: 4, height: deck.height }]
    : [{ x: deck.x, y: deck.y, width: deck.width, height: 4 }, { x: deck.x, y: deck.y + deck.height - 4, width: deck.width, height: 4 }];
  for (const rail of rails) {
    ctx.fillStyle = look.rail;
    ctx.fillRect(rail.x, rail.y, rail.width, rail.height);
    ctx.fillStyle = look.post;
    const length = ns ? rail.height : rail.width;
    for (let at = 0; at <= length; at += 64) {
      const x = ns ? rail.x - 2 : rail.x + Math.min(at, length - 8);
      const y = ns ? rail.y + Math.min(at, length - 8) : rail.y - 2;
      ctx.fillRect(x, y, 8, 8);
    }
  }
}

/**
 * Un riparo: lo sprite del tema ripetuto lungo il rettangolo, appoggiato al suo lato basso, con l'ombra. Sotto i due
 * terzi della vita compaiono le crepe, sotto un terzo si spezza; appena colpito trema e schiarisce.
 */
function drawCover(ctx: CanvasRenderingContext2D, solid: Solid, left: number, theme: ArenaThemeId, camera: Camera, flash: number): void {
  if (!visible(camera, solid)) return;
  const look = HAZARD_LOOKS[theme];
  const shake = flash > 0 ? Math.sin(flash * 90) * 2 : 0;
  const scenic = tileGrid(theme, 'chasmBed') !== undefined;
  if (scenic) {
    pixelEllipse(ctx, solid.x + solid.width / 2 + 4, solid.y + solid.height - 2, solid.width / 2 + 4, 9, '#00000059');
  } else {
    ctx.fillStyle = '#00000059';
    ctx.beginPath();
    ctx.ellipse(solid.x + solid.width / 2 + 4, solid.y + solid.height - 2, solid.width / 2 + 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const sheet = tileSheet(theme);
  const sprite = tileVariants(theme, 'cover')[0];
  const pieces: Solid[] = [];
  if (sheet !== null && sprite !== undefined) {
    const width = sprite.w * TILE_SCALE;
    const height = sprite.h * TILE_SCALE;
    const count = Math.max(1, Math.round(solid.width / width));
    const slot = solid.width / count;
    for (let k = 0; k < count; k++) {
      const x = Math.round(solid.x + k * slot + (slot - width) / 2 + shake);
      const y = Math.round(solid.y + solid.height - height);
      drawTile(ctx, sheet, sprite, x, y);
      pieces.push({ x, y, width, height });
    }
  } else {
    const body = { x: solid.x + shake, y: solid.y - 8, width: solid.width, height: solid.height + 8 };
    ctx.fillStyle = look.cover;
    ctx.fillRect(body.x, body.y, body.width, body.height);
    ctx.fillStyle = look.coverEdge;
    ctx.fillRect(body.x, body.y, body.width, 4);
    pieces.push(body);
  }
  // Crepe che si allargano con il danno: una sotto i due terzi, tre sotto un terzo, con un filo chiaro accanto (la
  // scheggiatura) perche' si leggano anche sui ripari gia' venati. Sotto un terzo il riparo scurisce e perde pezzi.
  const cracks = left < 1 / 3 ? 3 : left < 2 / 3 ? 1 : 0;
  for (const piece of pieces) {
    if (left < 1 / 3) {
      if (scenic && sheet !== null && sprite !== undefined) {
        // Scurisce solo la sagoma: i ripari nuovi sono trasparenti attorno.
        ctx.globalAlpha = 0.24;
        ctx.drawImage(sheetSilhouette(ACTIVE_TILE_ATLASES[theme].url, sheet, '#000000'), sprite.x, sprite.y, sprite.w, sprite.h, piece.x, piece.y, piece.width, piece.height);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#00000038';
        ctx.fillRect(piece.x, piece.y, piece.width, piece.height);
      }
    }
    for (let c = 0; c < cracks; c++) {
      const h = noise(piece.x + c * 17, piece.y);
      // Sui ripari nuovi le crepe stanno al centro, dove la sagoma e' piena.
      let x = piece.x + piece.width * (scenic ? 0.34 + ((h + c * 0.31) % 1) * 0.32 : 0.2 + ((h + c * 0.31) % 1) * 0.6);
      const crackTop = scenic ? piece.y + piece.height * 0.28 : piece.y + 2;
      const crackEnd = scenic ? piece.y + piece.height * 0.86 : piece.y + piece.height - 2;
      for (let y = crackTop; y < crackEnd; y += 4) {
        ctx.fillStyle = look.crack;
        ctx.fillRect(Math.round(x), y, 3, 4);
        ctx.fillStyle = look.coverEdge;
        ctx.fillRect(Math.round(x) + 3, y, 1, 4);
        x += noise(x, y) > 0.5 ? 2 : -2;
      }
    }
    if (left < 1 / 3 && !scenic) {
      // Pezzi mancanti sul bordo alto.
      ctx.fillStyle = look.crack;
      for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(piece.x + piece.width * (0.15 + k * 0.3)), piece.y, 6, 4);
    }
  }
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash / FEEDBACK.hitFlash) * 0.3;
    if (scenic && sheet !== null && sprite !== undefined) {
      const white = sheetVariant(ACTIVE_TILE_ATLASES[theme].url, sheet, 'white');
      for (const piece of pieces) ctx.drawImage(white, sprite.x, sprite.y, sprite.w, sprite.h, piece.x, piece.y, piece.width, piece.height);
    } else {
      ctx.fillStyle = '#fff6e0';
      for (const piece of pieces) ctx.fillRect(piece.x, piece.y, piece.width, piece.height);
    }
    ctx.globalAlpha = 1;
  }
}
