import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Match } from '../match/match';
import { applySnapshot, type BattleSnapshot } from '../network/protocol';
import type { HubPlayer } from '../network/hub-protocol';

/** Un aggiornamento di ritardo visuale; nessuna predizione di collisioni, danni o risultati. */
export const NETWORK_VIEW = { blendMs: 1000 / 30, staleMs: 250, teleportDistance: 64 } as const;
interface Track { from: Vec2; to: Vec2; current: Vec2 }

/** Stesso ritardo visuale per il rifugio; nessuna simulazione delle collisioni sul client. */
class HubNetworkView {
  private readonly tracks = new Map<string, { player: HubPlayer; from: Vec2; to: Vec2 }>();
  private receivedAt = 0;
  accept(players: readonly HubPlayer[], now: number): void {
    const current = new Map(this.sample(now).map(player => [player.id, player]));
    this.tracks.clear();
    for (const player of players) {
      const before = current.get(player.id), to = new Vec2(player.x, player.y);
      const from = before ? new Vec2(before.x, before.y) : to;
      const snap = now - this.receivedAt > NETWORK_VIEW.staleMs || from.distanceTo(to) > NETWORK_VIEW.teleportDistance;
      this.tracks.set(player.id, { player, from: snap ? to : from, to });
    }
    this.receivedAt = now;
  }
  sample(now: number): HubPlayer[] {
    const fraction = Math.min(1, Math.max(0, (now - this.receivedAt) / NETWORK_VIEW.blendMs));
    return [...this.tracks.values()].map(track => { const p = track.from.lerp(track.to, fraction); return { ...track.player, x: p.x, y: p.y }; });
  }
}

/** Copia dedicata al disegno. Lo stato autorevole usato da HUD/input/premi non viene interpolato. */
export class NetworkView {
  static readonly Hub = HubNetworkView;
  readonly match: Match;
  private readonly players = new Map<string, Track>();
  private readonly shots = new Map<number, Track>();
  private readonly minions = new Map<number, Track>();
  private boss: Track | null = null;
  private receivedAt: number | null = null;
  private snapshotTime = 0;

  constructor(authoritative: Match) {
    this.match = new Match({ dungeon: authoritative.dungeon, arena: authoritative.arena, boss: authoritative.boss?.definition ?? null, rng: new SeededRng(1), loadout: authoritative.player.skillBar.skills,
      members: [...authoritative.players].map(([id, player]) => ({ id, loadout: player.baseLoadout, totalXp: player.totalXp, characterClass: player.characterClass, maxHealth: player.health.max })) });
    this.match.viewPlayerId = authoritative.viewPlayerId;
  }

  accept(snapshot: BattleSnapshot, now: number): void {
    this.sample(now);
    const snap = this.receivedAt === null || now - this.receivedAt > NETWORK_VIEW.staleMs || snapshot.status !== 'playing';
    const track = (from: Vec2 | undefined, to: Vec2, checkJump = true): Track => {
      const start = !from || snap || (checkJump && from.distanceTo(to) > NETWORK_VIEW.teleportDistance) ? to : from;
      return { from: start, to, current: start };
    };
    const livePlayers = new Set<string>(), liveShots = new Set<number>(), liveMinions = new Set<number>();
    const dashed = new Set(snapshot.events.flatMap(event => event.type === 'skill_cast' && event.kind === 'dash' && !event.travelSeconds && event.playerId ? [event.playerId] : []));
    for (const p of snapshot.players) {
      livePlayers.add(p.id); this.players.set(p.id, track(dashed.has(p.id) ? undefined : this.match.players.get(p.id)?.position, p.position));
    }
    for (const p of snapshot.projectiles) {
      liveShots.add(p.id); this.shots.set(p.id, track(this.shots.get(p.id)?.current, p.position, false));
    }
    for (const m of snapshot.minions) {
      liveMinions.add(m.id); this.minions.set(m.id, track(this.minions.get(m.id)?.current, m.position));
    }
    for (const id of this.players.keys()) if (!livePlayers.has(id)) this.players.delete(id);
    for (const id of this.shots.keys()) if (!liveShots.has(id)) this.shots.delete(id);
    for (const id of this.minions.keys()) if (!liveMinions.has(id)) this.minions.delete(id);
    this.boss = snapshot.boss === null ? null : track(snapshot.events.some(event => event.type === 'boss_teleported') ? undefined : this.match.boss?.position, snapshot.boss.position);
    applySnapshot(this.match, snapshot);
    this.receivedAt = now; this.snapshotTime = snapshot.time;
    this.sample(now);
  }

  /** Chiamato a ogni RAF, anche se da rete non è arrivato un nuovo messaggio. */
  sample(now: number): void {
    if (this.receivedAt === null) return;
    const elapsed = Math.max(0, now - this.receivedAt), fraction = Math.min(1, elapsed / NETWORK_VIEW.blendMs);
    const position = (t: Track): Vec2 => t.current = fraction === 1 ? t.to : t.from.lerp(t.to, fraction);
    for (const [id, t] of this.players) { const p = this.match.players.get(id); if (p) p.position = position(t); }
    if (this.boss && this.match.boss) this.match.boss.position = position(this.boss);
    for (const p of this.match.projectiles) { const t = this.shots.get(p.id); if (t) p.position = position(t); }
    for (const m of this.match.minions) { const t = this.minions.get(m.id); if (t) m.position = position(t); }
    this.match.time = this.snapshotTime + (this.match.status === 'playing' ? Math.min(elapsed, NETWORK_VIEW.blendMs) / 1000 : 0);
  }
}
