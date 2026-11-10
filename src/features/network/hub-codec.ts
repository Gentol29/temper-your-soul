import type { HubPlayer, HubView } from './hub-protocol';

/** Codec v2 ordinato anche per l'HUB: profili alla nascita/modifica, pose in tuple. */
export interface HubFrame {
  type: 'hub_frame'; q: number; reset?: true;
  a?: HubPlayer[]; r?: string[];
  p: [string, number, number, number, number, number][];
  social?: Pick<HubView, 'trades' | 'requests'>;
}
export class HubEncoder {
  private sequence = 0;
  private readonly known = new Map<string, string>();
  private social = '';
  encode(view: HubView): HubFrame {
    const frame: HubFrame = { type: 'hub_frame', q: this.sequence++, p: [] };
    if (frame.q === 0) frame.reset = true;
    const alive = new Set<string>();
    for (const player of view.players) {
      alive.add(player.id);
      const key = JSON.stringify([player.character, player.name, player.appearance]);
      if (this.known.get(player.id) !== key) { (frame.a ??= []).push(player); this.known.set(player.id, key); }
      frame.p.push([player.id, Math.round(player.x * 100) / 100, Math.round(player.y * 100) / 100,
        player.moving ? 1 : 0, player.facing, player.present === false ? 0 : 1]);
    }
    for (const id of this.known.keys()) if (!alive.has(id)) { (frame.r ??= []).push(id); this.known.delete(id); }
    const social = { trades: view.trades, requests: view.requests ?? [] }, key = JSON.stringify(social);
    if (key !== this.social) { frame.social = social; this.social = key; }
    return frame;
  }
}
export class HubDecoder {
  private next = 0;
  private readonly players = new Map<string, HubPlayer>();
  private social: Pick<HubView, 'trades' | 'requests'> = { trades: [], requests: [] };
  decode(frame: HubFrame): HubView {
    if (frame.reset) { if (frame.q !== 0) throw new Error('Inizio HUB non valido.'); this.next = 0; this.players.clear(); this.social = { trades: [], requests: [] }; }
    if (frame.q !== this.next++) throw new Error('Aggiornamento HUB mancante o fuori ordine.');
    for (const player of frame.a ?? []) this.players.set(player.id, { ...player });
    for (const [id, x, y, moving, facing, present] of frame.p) {
      const player = this.players.get(id);
      if (!player) throw new Error('Giocatore HUB senza definizione.');
      Object.assign(player, { x, y, moving: moving === 1, facing, present: present === 1 });
    }
    for (const id of frame.r ?? []) this.players.delete(id);
    if (frame.social) this.social = frame.social;
    return { players: [...this.players.values()].map(p => ({ ...p })), ...this.social };
  }
}
