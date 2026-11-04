import type { Character } from '../character/character';
import { DUNGEONS } from '../dungeons/dungeons';
import { VEIN_MINIONS, type VeinId } from '../minions/minion-catalog';
import type { MinionDefinition } from '../minions/minion-definition';
import { bossSheet } from '../presentation/boss-art';
import { sheetImage, sheetSilhouette, whenSheetReady } from '../presentation/boss-art/sheet-images';
import { minionArt } from '../presentation/minion-art';
import { drawSprite } from '../presentation/sprites';
import { LIEUTENANT_LORE, MINION_LORE } from '../run/bestiary-lore';
import { LIEUTENANTS } from '../run/lieutenants';
import { VEIN_LIEUTENANTS } from '../run/vein-lieutenants';
import type { BossDefinition } from '../boss/boss-definition';
import { veinName } from '../run/veins';
import { el, requireElement } from './dom';

/**
 * Il bestiario: una pagina per servitore, divisa per dungeon e per vena («Catacombe 4/7»). Si apre con la prima
 * uccisione; le pagine non ancora scoperte restano nascoste. Ogni pagina dice ruolo, schema del boss che insegna, uccisioni e
 * un'iscrizione.
 */
export class BestiaryScreen {
  private readonly list = requireElement('bestiary-list');

  constructor(handlers: { readonly onBack: () => void }) {
    requireElement('bestiary-back').addEventListener('click', handlers.onBack);
  }

  private dungeonId: string | undefined;

  render(character: Character, dungeonId = this.dungeonId): void {
    this.dungeonId = dungeonId;
    const sections: HTMLElement[] = [];
    let known = 0;
    let total = 0;
    for (const dungeon of DUNGEONS) {
      if (dungeonId !== undefined && dungeon.id !== dungeonId) continue;
      const section = el('section', 'bestiary-section');
      section.append(el('h3', '', dungeon.name));
      const veins = VEIN_MINIONS[dungeon.id];
      for (const vein of ['a', 'b', 'c'] as const satisfies readonly VeinId[]) {
        const minions = veins?.[vein] ?? [];
        if (minions.length === 0) continue;
        const grid = el('div', 'bestiary-grid');
        const cards = minions.map((minion) => minionCard(minion, character.bestiary[minion.id] ?? 0));
        // Il luogotenente della vena: quello di sempre per la A, il suo per la B e la C.
        const lieutenant = vein === 'a' ? LIEUTENANTS[dungeon.id] : VEIN_LIEUTENANTS[dungeon.id]?.[vein];
        if (lieutenant !== undefined) cards.push(lieutenantCard(lieutenant, character.bestiary[lieutenant.id] ?? 0));
        const opened = cards.filter((card) => !card.classList.contains('locked')).length;
        grid.append(...cards.filter((card) => !card.classList.contains('locked')));
        total += cards.length;
        known += opened;
        if (opened > 0) section.append(el('h4', 'bestiary-vein', `${veinName(dungeon.id, vein)} ${opened}/${cards.length}`), grid);
      }
      sections.push(section);
    }
    this.list.replaceChildren(el('p', 'bestiary-count', known > 0 ? `Mostri scoperti: ${known} di ${total}` : 'Nessun mostro scoperto in questo dungeon. Abbattine uno per aggiungerlo al Bestiario.'), ...sections);
  }
}

/** La pagina di un luogotenente: come quella di un servitore, con la sua posa d'attacco. */
function lieutenantCard(lieutenant: BossDefinition, kills: number): HTMLElement {
  const lore = LIEUTENANT_LORE[lieutenant.id];
  const open = kills > 0;
  const card = el('article', open ? 'bestiary-card bestiary-lieutenant' : 'bestiary-card bestiary-lieutenant locked');
  card.append(lieutenantThumbnail(lieutenant.art, open), el('strong', '', open ? lieutenant.name : '???'));
  if (open && lore) {
    card.append(
      el('span', 'bestiary-role', `${lore.role} · insegna: ${lore.teaches}`),
      el('p', '', lore.text),
      el('small', '', `Abbattuti: ${kills}`),
    );
  } else card.append(el('small', '', 'Il luogotenente di metà discesa.'));
  return card;
}

/** La pagina di un servitore: aperta con la prima uccisione, altrimenti solo la sagoma. */
function minionCard(minion: MinionDefinition, kills: number): HTMLElement {
  const lore = MINION_LORE[minion.id];
  const open = kills > 0;
  const card = el('article', open ? 'bestiary-card' : 'bestiary-card locked');
  card.append(thumbnail(minion.visual, open));
  card.append(el('strong', '', open ? minion.name : '???'));
  if (open && lore) {
    card.append(
      el('span', 'bestiary-role', `${lore.role} · insegna: ${lore.teaches}`),
      el('p', '', lore.text),
      el('small', '', `Abbattuti: ${kills}`),
    );
  } else card.append(el('small', '', 'Abbattine uno per aprire la pagina.'));
  return card;
}

/** Miniatura del servitore (sagoma scura se la pagina e' chiusa). */
function thumbnail(visual: string, open: boolean): HTMLCanvasElement {
  const art = minionArt(visual);
  const frame = art.frames[0];
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.className = 'bestiary-thumb';
  canvas.width = Math.max(...frame.map((row) => row.length)) * scale;
  canvas.height = frame.length * scale;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const palette = open ? art.palette : Object.fromEntries(Object.keys(art.palette).map((key) => [key, '#2a2230']));
    drawSprite(ctx, frame, canvas.width / 2, canvas.height / 2, scale, palette);
  }
  return canvas;
}

/** Miniatura del luogotenente: il primo fotogramma del suo foglio, sagoma scura se la pagina e' chiusa. Altezza pari alle altre. */
function lieutenantThumbnail(id: string, open: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'bestiary-thumb';
  const sheet = bossSheet(id);
  if (sheet === null) return canvas;
  const { cell, clips } = sheet.layout;
  canvas.width = cell.width;
  canvas.height = cell.height;
  const paint = (image: HTMLImageElement): void => {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cell.width, cell.height);
    const source = open ? image : sheetSilhouette(sheet.layout.url, image, '#2a2230');
    ctx.drawImage(source, 0, clips.walk.row * cell.height, cell.width, cell.height, 0, 0, cell.width, cell.height);
  };
  const image = sheetImage(sheet.layout.url);
  if (image !== null) paint(image);
  else whenSheetReady(sheet.layout.url).then(paint, () => undefined);
  return canvas;
}
