import type { KeyValueStore } from '../character/save-store';
import { el } from '../ui/dom';
import { CURSOR_COLORS, CURSOR_SHAPES, customCursorColor, cursorColorChannels, DEFAULT_CURSOR_COLOR, isCustomCursorColor, isDarkCursorColor, loadCursorColor, recolorPixels, saveCursorColor, type CursorColor, type CursorShape } from './cursor-colors';

const sources = new Map<string, Promise<ImageData>>();

async function loadSource(shape: CursorShape): Promise<ImageData> {
  const image = new Image();
  // Non decode(): resta in attesa finche' la pagina non viene disegnata, per esempio in una scheda in secondo piano.
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Cursore non caricato: ${shape.name}`));
    image.src = shape.url;
  });
  const canvas = el('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D non disponibile');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function source(shape: CursorShape): Promise<ImageData> {
  let image = sources.get(shape.name);
  if (image === undefined) {
    image = loadSource(shape);
    sources.set(shape.name, image);
  }
  return image;
}

function paint(image: ImageData, color: CursorColor): string {
  const pixels = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  recolorPixels(pixels.data, color);
  const canvas = el('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D non disponibile');
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

/** La scheda Cursore: applica subito il colore scelto, che vale per questo browser come le associazioni dei tasti. */
export class CursorView {
  private selected: CursorColor;
  private latest = 0;
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private readonly previews = new Map<string, HTMLImageElement>();
  private readonly sliders: HTMLInputElement[] = [];
  private readonly numbers: HTMLInputElement[] = [];
  private readonly customChip = el('span', 'cursor-color-chip');
  private readonly customLabel = el('span', 'cursor-custom-label');
  private readonly hint = el('p', 'cursor-hint');
  private readonly status = el('p', 'settings-storage');

  constructor(root: HTMLElement, private readonly storage: KeyValueStore | null) {
    this.selected = loadCursorColor(storage);
    const palette = el('div', 'cursor-colors');
    palette.setAttribute('role', 'group');
    palette.setAttribute('aria-label', 'Colore del cursore');
    for (const color of CURSOR_COLORS) {
      const button = el('button', 'cursor-color');
      button.type = 'button';
      const chip = el('span', 'cursor-color-chip');
      chip.style.background = color.ramp[1];
      chip.style.borderColor = color.ramp[0];
      button.append(chip, color.name);
      button.addEventListener('click', () => this.choose(color));
      this.buttons.set(color.id, button);
      palette.append(button);
    }
    const preview = el('div', 'cursor-preview');
    preview.setAttribute('aria-hidden', 'true');
    for (const shape of CURSOR_SHAPES) {
      const image = el('img', 'cursor-preview-image');
      image.alt = '';
      this.previews.set(shape.name, image);
      preview.append(image);
    }
    this.status.setAttribute('role', 'status');
    this.hint.setAttribute('role', 'status');
    root.append(el('p', '', 'Colore di freccia, mani e mirino. Vale per questo browser.'), palette, this.buildCustom(), preview, this.hint, this.status);
    this.syncChannels();
    void this.show();
  }

  private buildCustom(): HTMLElement {
    const custom = el('div', 'cursor-custom');
    custom.setAttribute('role', 'group');
    custom.setAttribute('aria-label', 'Colore personalizzato in RGB');
    const title = el('div', 'cursor-custom-title');
    title.append(this.customChip, this.customLabel);
    custom.append(title);
    for (const [index, name] of ['Rosso', 'Verde', 'Blu'].entries()) {
      const row = el('label', 'cursor-channel');
      const slider = el('input'), number = el('input');
      for (const input of [slider, number]) {
        input.min = '0';
        input.max = '255';
        input.step = '1';
        input.setAttribute('aria-label', name);
      }
      slider.type = 'range';
      number.type = 'number';
      slider.addEventListener('input', () => {
        number.value = slider.value;
        this.previewCustom();
      });
      number.addEventListener('input', () => {
        // Un campo vuoto vuol dire che si sta ancora scrivendo: lo slider tiene l'ultimo valore valido.
        if (number.value === '') return;
        slider.value = number.value;
        this.previewCustom();
      });
      for (const input of [slider, number]) {
        input.addEventListener('change', () => {
          number.value = slider.value;
          this.previewCustom();
          this.save();
        });
      }
      this.sliders[index] = slider;
      this.numbers[index] = number;
      row.append(el('span', 'cursor-channel-name', name[0]), slider, number);
      custom.append(row);
    }
    return custom;
  }

  private choose(color: CursorColor): void {
    this.selected = color;
    this.syncChannels();
    this.save();
    void this.show();
  }

  /** Mentre si trascina si vede il colore ma non si scrive a ogni passo: si salva al rilascio. */
  private previewCustom(): void {
    const [red, green, blue] = this.sliders.map((slider) => Number(slider.value));
    this.selected = customCursorColor(red!, green!, blue!);
    void this.show();
  }

  private save(): void {
    this.status.textContent = saveCursorColor(this.selected, this.storage) ? '' : 'Salvataggio non disponibile: colore valido per questa sessione.';
  }

  private syncChannels(): void {
    cursorColorChannels(this.selected).forEach((value, index) => {
      this.sliders[index]!.value = String(value);
      this.numbers[index]!.value = String(value);
    });
  }

  private async show(): Promise<void> {
    const color = this.selected, turn = ++this.latest;
    for (const [id, button] of this.buttons) button.setAttribute('aria-pressed', String(id === color.id));
    this.customChip.style.background = color.ramp[1];
    this.customChip.style.borderColor = color.ramp[0];
    this.customLabel.textContent = isCustomCursorColor(color) ? `Personalizzato ${color.id}` : 'Personalizzato';
    this.hint.textContent = isDarkCursorColor(color) ? 'Colore molto scuro: sulle mappe scure si vedrà poco.' : '';
    try {
      const images = await Promise.all(CURSOR_SHAPES.map(source));
      if (turn !== this.latest) return;
      const root = document.documentElement.style;
      CURSOR_SHAPES.forEach((shape, index) => {
        const image = paint(images[index]!, color);
        this.previews.get(shape.name)!.src = image;
        // Il rame e' gia' nel CSS: togliendo la variabile torna il file originale.
        if (color === DEFAULT_CURSOR_COLOR) root.removeProperty(`--cursor-${shape.name}`);
        else root.setProperty(`--cursor-${shape.name}`, `url("${image}") ${shape.hotspot[0]} ${shape.hotspot[1]}, ${shape.fallback}`);
      });
    } catch {
      // Immagine non disponibile: restano i cursori gia' attivi, il gioco non ne dipende.
      if (turn === this.latest) this.status.textContent = 'Colore non disponibile in questo browser.';
    }
  }
}
