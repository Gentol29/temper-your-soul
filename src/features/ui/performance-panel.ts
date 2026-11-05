import type { PartyClient } from '../network/party-client';
import { rendererLabel } from '../presentation/webgl-renderer';
import { el, requireElement } from './dom';

interface ServerMetrics {
  cpuPercent: number; eventLoopPercent: number;
  step: { meanMs: number; p95Ms: number }; network: { meanMs: number; p95Ms: number };
}

/** Millisecondi di un fotogramma per parte (misurati in `game.ts`), per capire dove va il tempo. */
export interface FrameParts {
  readonly steps: number;
  readonly simulation: number;
  readonly interface: number;
  readonly scene: number;
  readonly room: number;
}

/** Diagnostica facoltativa: costi del browser distinti da rete e simulazione server. */
export class PerformancePanel {
  private readonly root = requireElement('performance-panel');
  private readonly button = requireElement('performance-button');
  private readonly lines = new Map<string, HTMLElement>();
  private visible = false;
  private since = 0;
  private lastFrame = 0;
  private intervals: number[] = [];
  private work = 0;
  private parts = { steps: 0, simulation: 0, interface: 0, scene: 0, room: 0, long: 0 };
  private bytes = 0;
  private snapshots = 0;
  private server: ServerMetrics | null = null;
  private lastPoll = 0;
  private polling = false;
  constructor() {
    this.root.append(el('strong', '', 'Prestazioni · F2'));
    for (const id of ['fps', 'work', 'parts', 'browser', 'render', 'network', 'ping', 'server', 'cost']) { const line = el('div'); this.lines.set(id, line); this.root.append(line); }
    this.root.append(el('small', '', 'FPS = disegno; aggiornamenti/s = rete. CPU server riferita a un core.'));
    this.button.addEventListener('click', () => this.toggle());
  }
  toggle(): void {
    this.visible = !this.visible; this.root.classList.toggle('hidden', !this.visible);
    this.button.setAttribute('aria-expanded', String(this.visible)); this.since = 0; this.lastFrame = 0; this.intervals = []; this.work = 0;
    this.parts = { steps: 0, simulation: 0, interface: 0, scene: 0, room: 0, long: 0 };
  }
  frame(now: number, workMs: number, client: PartyClient, parts?: FrameParts): void {
    if (!this.visible) return;
    if (!this.since) { this.since = now; this.bytes = client.receivedCharacters; this.snapshots = client.receivedFrames; }
    if (this.lastFrame) this.intervals.push(now - this.lastFrame);
    this.lastFrame = now; this.work += workMs;
    if (parts) {
      const sum = this.parts;
      sum.steps += parts.steps; sum.simulation += parts.simulation; sum.interface += parts.interface; sum.scene += parts.scene; sum.room += parts.room;
      if (workMs > 16) sum.long++;
    }
    if (now - this.since < 1000) return;
    const elapsed = (now - this.since) / 1000, frames = this.intervals.length;
    const sorted = this.intervals.sort((a, b) => a - b);
    this.set('fps', `${Math.round(frames / elapsed)} FPS · frame p95 ${(sorted[Math.floor(frames * .95)] ?? 0).toFixed(1)} ms`);
    this.set('work', `Lavoro per frame: ${(this.work / Math.max(1, frames)).toFixed(2)} ms`);
    const n = Math.max(1, frames), p = this.parts;
    this.set('parts', `Simulazione ${(p.simulation / n).toFixed(2)} ms (${(p.steps / n).toFixed(1)} passi) · interfaccia ${(p.interface / n).toFixed(2)} · scena ${(p.scene / n).toFixed(2)} · stanza ${(p.room / n).toFixed(2)} ms`);
    // Il tempo fra due fotogrammi che non e' lavoro del gioco: stili, impaginazione, composizione e GPU del browser.
    const interval = this.intervals.reduce((total, value) => total + value, 0) / n;
    this.set('browser', `Browser fuori dal gioco: ${Math.max(0, interval - this.work / n).toFixed(1)} ms · fotogrammi oltre 16 ms di lavoro: ${p.long}`);
    this.parts = { steps: 0, simulation: 0, interface: 0, scene: 0, room: 0, long: 0 };
    this.set('render', `Disegno: ${rendererLabel()}`);
    this.set('network', client.state ? `Rete: ${Math.round((client.receivedFrames - this.snapshots) / elapsed)} aggiornamenti/s · ≈ ${((client.receivedCharacters - this.bytes) / elapsed / 1024).toFixed(1)} KB/s` : 'Rete: partita locale');
    this.set('ping', client.state && client.latency !== null ? `RTT: ${client.latency} ms · variazione ${Math.round(client.jitter)} ms` : 'RTT: —');
    this.set('server', client.state && this.server ? `Server: CPU ${this.server.cpuPercent}% · loop ${this.server.eventLoopPercent}%` : 'Server: —');
    this.set('cost', client.state && this.server ? `Server p95: passo ${this.server.step.p95Ms.toFixed(2)} ms · invio ${this.server.network.p95Ms.toFixed(2)} ms` : 'Server: dati in attesa');
    this.since = now; this.intervals = []; this.work = 0; this.bytes = client.receivedCharacters; this.snapshots = client.receivedFrames;
    if (client.state && !this.polling && now - this.lastPoll >= 2000) {
      this.lastPoll = now; this.polling = true;
      const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 1800);
      void fetch('/health', { signal: controller.signal }).then(response => response.json() as Promise<{ performance?: ServerMetrics }>)
        .then(data => { this.server = data.performance ?? null; }).catch(() => { this.server = null; })
        .finally(() => { window.clearTimeout(timeout); this.polling = false; });
    }
  }
  private set(id: string, text: string): void { const line = this.lines.get(id)!; if (line.textContent !== text) line.textContent = text; }
}
