import { GEAR_SCORE } from '../items/gear-score';
import './character-page.css';
import { Character } from '../character/character';
import type { BodyType } from '../character/appearance';
import { CHARACTER_CLASSES, CLASS_LABELS, type CharacterClass } from '../character/character-class';
import { CHARACTER_NAME, cleanCharacterName, NOVICE_NAMES, STARTER_SETS } from '../character/creation';
import { levelProgress } from '../character/progression';
import { resolveCombatStats, type CombatStats } from '../classes/class-stats';
import { EQUIPMENT_SLOTS, SLOT_LABELS } from '../items/equipment-slot';
import { CharacterAltar, CLASS_ACCENTS } from '../presentation/character-altar';
import { characterPixels } from '../presentation/character-art';
import { MENU_ICONS } from '../presentation/menu-icons';
import { pixelSvg } from './character-portrait';
import { el } from './dom';
import { renderItemSlot } from './item-slot';
import { renderPixelIcon } from './pixel-icon';

/** Che cosa distingue ogni classe, in una riga: le abilita' vere dipendono dall'equipaggiamento. */
const CLASS_NOTES: Readonly<Record<CharacterClass, string>> = {
  warrior: 'Combattimento ravvicinato, robusto.',
  archer: 'Attacchi a distanza e mobilità.',
  mage: 'Magie elementali e teletrasporto.',
};

const STATS = [['Vita', 'maxHealth'], ['Difesa', 'armor'], ['Mana', 'maxMana']] as const satisfies readonly (readonly [string, keyof CombatStats])[];
type StatScale = Readonly<Record<(typeof STATS)[number][1], number>>;

/** Come apparira' un personaggio di quella classe: una prova mai salvata, con il suo set iniziale. */
function sampleOf(body: BodyType, kind: CharacterClass): Character {
  const sample = Character.createStarter(kind);
  sample.completeCreation('Anteprima', body, kind);
  return sample;
}

function statsOf(character: Character): CombatStats {
  return resolveCombatStats(character.characterClass, character.loadout(), character.totalXp);
}

/** Vita, difesa e mana con una barra a tacche. `scale` dice quanto vale la barra piena. */
function renderStats(stats: CombatStats, scale: StatScale): HTMLElement {
  const root = el('dl', 'stat-list');
  for (const [label, key] of STATS) {
    const row = el('div', 'stat-row');
    const bar = el('span', 'stat-bar'), fill = el('i');
    fill.style.width = `${Math.round((Math.min(stats[key], scale[key]) / Math.max(1, scale[key])) * 100)}%`;
    bar.setAttribute('aria-hidden', 'true');
    bar.append(fill);
    row.append(el('dt', '', label), bar, el('dd', '', String(Math.round(stats[key]))));
    root.append(row);
  }
  return root;
}

/** I quattro pezzi indossati, con il nome dello slot: lo stesso riquadro e lo stesso tooltip dell'inventario. */
function renderEquipment(character: Character): HTMLElement {
  const root = el('div', 'equipment-row');
  for (const slot of EQUIPMENT_SLOTS) {
    const cell = el('div', 'equipment-cell');
    const item = character.equippedItem(slot);
    const button = item === null ? null : renderItemSlot(item, { characterClass: character.characterClass });
    cell.append(button ?? el('span', 'equipment-empty', '–'), el('small', '', SLOT_LABELS[slot]));
    root.append(cell);
  }
  return root;
}

function panel(title: string): HTMLElement {
  const root = el('section', 'stage-panel');
  root.append(el('h3', '', title));
  return root;
}

function stageColumn(altar: CharacterAltar, banner: HTMLElement): HTMLElement {
  const column = el('div', 'altar-column'), frame = el('div', 'altar-frame');
  frame.append(altar.canvas, banner);
  column.append(frame);
  return column;
}

/** Un personaggio gia' creato: sulla soglia, con cio' che indossa e il comando per entrare nel rifugio. */
function renderCharacterSheet(character: Character, onContinue: () => void): HTMLElement {
  const kind = character.characterClass!, stage = el('div', 'character-stage');
  stage.style.setProperty('--class-accent', CLASS_ACCENTS[kind]);
  const altar = new CharacterAltar(character.appearance(), CLASS_ACCENTS[kind]);
  const column = stageColumn(altar, el('span', 'altar-banner', CLASS_LABELS[kind]));
  const progress = levelProgress(character.totalXp);
  const plate = el('div', 'name-plate name-plate-static');
  plate.append(el('strong', '', character.name!));
  const enter = el('button', 'forge-plate is-primary stage-action');
  enter.type = 'button';
  enter.append(renderPixelIcon(MENU_ICONS.continue), el('span', 'forge-plate-label', 'Entra nel rifugio'));
  enter.addEventListener('click', onContinue);
  column.append(plate, enter);

  const xp = el('div', 'sheet-xp'), fill = el('i');
  fill.style.width = `${Math.round((progress.current / Math.max(1, progress.required)) * 100)}%`;
  xp.append(fill);
  const identity = panel(`Livello ${progress.level}`);
  identity.append(xp, el('p', 'stage-note', `${progress.current} / ${progress.required} XP`));
  const current = statsOf(character);
  const stats = panel('Statistiche');
  const tiles = el('dl', 'stat-tiles');
  for (const [label, key] of STATS) {
    const tile = el('div', 'stat-tile');
    tile.append(el('dt', '', label), el('dd', '', String(Math.round(current[key]))));
    tiles.append(tile);
  }
  stats.append(tiles);
  const gear = panel(`Equipaggiamento · ${character.gearScore} / ${GEAR_SCORE.maximum * EQUIPMENT_SLOTS.length} GS`);
  gear.append(renderEquipment(character));
  const side = el('div', 'stage-side');
  side.append(identity, stats, gear);
  stage.append(column, side);
  return stage;
}

/** La creazione: si sceglie guardando il personaggio cambiare davanti al portale. */
function renderCreationForm(character: Character, onCreate: (name: string, body: BodyType, kind: CharacterClass) => void): HTMLElement {
  // Un personaggio da completare puo' avere gia' sesso o classe: restano fissi.
  let body: BodyType = character.bodyType ?? 'male', kind: CharacterClass = character.characterClass ?? 'warrior';
  const form = el('form', 'character-creation character-stage');
  form.setAttribute('aria-label', 'Crea il tuo personaggio');
  form.noValidate = true;
  // Chi completa un vecchio profilo si vede con i propri oggetti, non con il set da novizio.
  const figureOf = (b: BodyType, k: CharacterClass) => (character.starterPending ? sampleOf(b, k).appearance() : { ...character.appearance(), body: b, characterClass: k });
  const altar = new CharacterAltar(figureOf(body, kind), CLASS_ACCENTS[kind]);
  const banner = el('span', 'altar-banner', CLASS_LABELS[kind]);
  const column = stageColumn(altar, banner);

  const plate = el('label', 'name-plate');
  plate.append(el('span', 'name-plate-label', 'Nome'));
  const name = el('input');
  name.id = 'creation-name'; name.name = 'character-name'; name.type = 'text'; name.required = true;
  name.minLength = CHARACTER_NAME.minimum; name.maxLength = CHARACTER_NAME.maximum; name.autocomplete = 'off'; name.spellcheck = false;
  name.placeholder = 'Scrivi il nome';
  const count = el('small', 'name-plate-count');
  plate.append(name, count);
  const error = el('p', 'creation-error');
  error.setAttribute('role', 'alert');
  const submit = el('button', 'forge-plate is-primary stage-action');
  submit.type = 'submit';
  submit.append(renderPixelIcon(MENU_ICONS.forge), el('span', 'forge-plate-label', 'Crea personaggio'));
  const syncName = () => {
    count.textContent = `${name.value.trim().length} / ${CHARACTER_NAME.maximum}`;
    const valid = cleanCharacterName(name.value) !== null;
    submit.setAttribute('aria-disabled', String(!valid));
    if (valid) error.textContent = '';
  };
  name.addEventListener('input', syncName);
  syncName();
  column.append(plate, error, submit);

  // La barra piena e' il massimo fra le classi, cosi' le tre schede si confrontano a colpo d'occhio.
  const starters = CHARACTER_CLASSES.map((value) => statsOf(sampleOf('male', value)));
  const top = (key: keyof CombatStats): number => Math.max(...starters.map((stats) => stats[key]));
  const scale: StatScale = { maxHealth: top('maxHealth'), armor: top('armor'), maxMana: top('maxMana') };

  const classes = el('fieldset', 'stage-panel creation-classes');
  classes.append(el('legend', '', 'Classe'));
  const gearPanel = panel(character.starterPending ? `Set iniziale · ${sampleOf(body, kind).gearScore} GS` : `Il tuo equipaggiamento · ${character.gearScore} GS`);
  const gearTitle = gearPanel.firstElementChild!;
  const refresh = () => {
    const sample = sampleOf(body, kind);
    altar.show(figureOf(body, kind), CLASS_ACCENTS[kind]);
    banner.textContent = CLASS_LABELS[kind];
    form.style.setProperty('--class-accent', CLASS_ACCENTS[kind]);
    if (character.starterPending) gearPanel.replaceChildren(gearTitle, renderEquipment(sample), el('p', 'stage-note', STARTER_SETS[kind].map((id) => NOVICE_NAMES[id]).filter(Boolean).join(' · ')));
    else gearPanel.replaceChildren(gearTitle, renderEquipment(character));
  };
  CHARACTER_CLASSES.forEach((value, index) => {
    const choice = el('label', 'class-card');
    choice.style.setProperty('--card-accent', CLASS_ACCENTS[value]);
    const input = el('input');
    input.type = 'radio'; input.name = 'creation-class'; input.value = value; input.required = true;
    input.checked = kind === value;
    input.disabled = character.characterClass !== null && character.characterClass !== value;
    input.addEventListener('change', () => { kind = value; refresh(); });
    const figure = el('span', 'class-card-figure');
    figure.append(pixelSvg(characterPixels(sampleOf('male', value).appearance(), 'game')));
    const text = el('span', 'class-card-text');
    text.append(el('b', '', CLASS_LABELS[value]), el('small', '', CLASS_NOTES[value]));
    choice.append(input, figure, text, renderStats(starters[index]!, scale));
    classes.append(choice);
  });

  const bodies = el('fieldset', 'stage-panel creation-bodies');
  bodies.append(el('legend', '', 'Sesso'));
  for (const [value, text] of [['male', 'Maschio'], ['female', 'Femmina']] as const) {
    const choice = el('label', 'body-choice');
    const input = el('input');
    input.type = 'radio'; input.name = 'creation-body'; input.value = value; input.required = true;
    input.checked = body === value;
    input.disabled = character.bodyType !== null && character.bodyType !== value;
    input.addEventListener('change', () => { body = value; refresh(); });
    choice.append(input, el('span', '', text));
    bodies.append(choice);
  }

  const side = el('div', 'stage-side');
  side.append(classes, bodies);
  if (character.starterPending) side.append(gearPanel);
  else side.append(el('p', 'stage-note', 'I tuoi oggetti e i progressi esistenti verranno conservati.'));
  side.append(el('p', 'creation-warning', 'Nome, sesso e classe vengono fissati alla creazione. Non potrai cambiarli in seguito.'));
  refresh();

  form.append(column, side);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validName = cleanCharacterName(name.value);
    if (validName === null) {
      error.textContent = `Usa da ${CHARACTER_NAME.minimum} a ${CHARACTER_NAME.maximum} lettere, numeri, spazi, apostrofi o trattini.`;
      name.focus();
      return;
    }
    onCreate(validName, body, kind);
  });
  return form;
}

export function renderCharacterCreation(character: Character, handlers: { readonly onCreate: (name: string, body: BodyType, kind: CharacterClass) => void; readonly onContinue: () => void }): HTMLElement {
  return character.created ? renderCharacterSheet(character, handlers.onContinue) : renderCreationForm(character, handlers.onCreate);
}
