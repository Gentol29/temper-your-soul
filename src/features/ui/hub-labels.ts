import './hub-labels.css';
import { HUB_STATIONS } from '../character/hub-state';
import type { HubPlayer } from '../network/hub-protocol';
import type { HubIsoRenderer } from '../presentation/hub-iso-renderer';
import { snapHubLabel } from '../presentation/hub-projection';
import { el } from './dom';

interface LabelNode { readonly element: HTMLElement; key: string; width: number; height: number }

/** Etichette a risoluzione schermo: il testo non passa attraverso il raster ingrandito della mappa. */
export class HubLabels {
  readonly root = el('div', 'hub-map-labels hidden');
  private readonly labels = new Map<string, LabelNode>();
  constructor() {
    this.root.setAttribute('aria-hidden', 'true');
    // Se il font arriva dopo il primo ingresso, rimisura anche le etichette già visibili.
    void document.fonts.ready.then(() => { for (const node of this.labels.values()) node.key = ''; });
  }

  draw(renderer: HubIsoRenderer, peers: readonly HubPlayer[], visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
    if (!visible) return;
    const entries = [
      ...HUB_STATIONS.map(s => ({ id: s.id, text: s.name, x: s.x, y: s.y, lift: 42 })),
      ...peers.map(p => ({ id: `peer:${p.id}`, text: p.name, x: p.x, y: p.y, lift: 54 })),
    ];
    const live = new Set(entries.map(entry => entry.id));
    for (const [id, node] of this.labels) if (!live.has(id)) { node.element.remove(); this.labels.delete(id); }
    const fontSize = Math.max(16, Math.round(renderer.scale) * 8) - 2, ratio = window.devicePixelRatio || 1;
    for (const entry of entries) {
      let node = this.labels.get(entry.id);
      if (node === undefined) {
        const element = el('span', 'hub-map-label'); this.root.append(element);
        node = { element, key: '', width: 0, height: 0 }; this.labels.set(entry.id, node);
      }
      const key = `${entry.text}|${fontSize}`;
      if (node.key !== key) {
        node.element.textContent = entry.text; node.element.style.fontSize = `${fontSize}px`; node.key = key;
        node.width = node.element.offsetWidth; node.height = node.element.offsetHeight;
      }
      const point = renderer.screenPoint(entry.x, entry.y, entry.lift);
      node.element.style.left = `${snapHubLabel(point.x - node.width / 2, ratio)}px`;
      node.element.style.top = `${snapHubLabel(point.y - node.height, ratio)}px`;
    }
  }
}
