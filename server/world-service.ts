import { PublicWorld } from '../src/features/network/public-world';
import { copyProfile, type PersistentProfile, type ProfileSeed, type ProfileStore } from './storage/profiles';
import type { AccountAuth } from './auth/account-auth';
import { serializeCharacter } from '../src/features/character/save-format';
import { applyCharacterCommand } from './character-commands';
import { applyTradeDelta } from '../src/features/character/trade-transfer';
import type { BattleSnapshot, PartyMode } from '../src/features/network/protocol';
import { applyRunProgress, emptyProgress, type ProgressCursor } from './run-progress';
import { randomUUID } from 'node:crypto';

/** Esito di un accesso verificato: nel mondo, in attesa della creazione del personaggio, o connessione gia' chiusa. */
export type LoginOutcome = 'entered' | 'character_required' | 'disconnected';

/** Tutte le mutazioni persistenti condividono una coda. Il tick 60 Hz resta sincrono e indipendente. */
export class WorldService {
  readonly world: PublicWorld;
  readonly profiles = new Map<string, PersistentProfile>();
  private readonly progress = new Map<string, ProgressCursor>();
  private readonly accounts = new Set<string>();
  private readonly departures = new Map<string, BattleSnapshot | undefined>();
  private pending: Promise<unknown> = Promise.resolve();
  private queued = 0;
  constructor(private readonly store: ProfileStore, private readonly auth: AccountAuth) { this.world = new PublicWorld(randomUUID()); }
  serial<T>(work: () => Promise<T>): Promise<T> {
    if (this.queued >= 256) return Promise.reject(new Error('Server occupato: riprova fra poco.'));
    this.queued++;
    const result = this.pending.then(work).finally(() => { this.queued--; }); this.pending = result.catch(() => undefined); return result;
  }
  /**
   * Prima l'identita', poi il personaggio. Senza seme l'accesso non crea nulla: se l'account non ha un personaggio
   * l'esito e' `character_required` e l'account resta libero. Il seme arriva solo dalla creazione, dopo l'accesso.
   */
  async login(id: string, token: unknown, seed: ProfileSeed | null, stillConnected: () => boolean): Promise<LoginOutcome> {
    const identity = await this.auth.verify(token);
    return this.serial(async () => {
      if (!stillConnected()) return 'disconnected';
      if (this.accounts.has(identity.id)) throw new Error('Account già connesso in un’altra scheda.');
      if (this.profiles.has(id)) throw new Error('Sessione già autenticata.');
      const profile = seed ? await this.store.load(identity.id, seed) : await this.store.find(identity.id);
      if (!profile) return 'character_required';
      if (!stillConnected()) return 'disconnected';
      this.world.enter(id, profile.character); this.profiles.set(id, profile); this.accounts.add(identity.id);
      return 'entered';
    });
  }
  profileMessage(id: string) {
    const profile = this.profiles.get(id)!;
    return { type: 'profile' as const, character: serializeCharacter(profile.character), gold: profile.gold, revision: profile.revision };
  }
  private adopt(id: string, saved: PersistentProfile): void {
    const original = this.profiles.get(id)!;
    Object.assign(original.character, saved.character);
    original.gold = saved.gold; original.revision = saved.revision;
  }
  async command(id: string, command: unknown): Promise<void> {
    await this.serial(async () => {
      const profile = this.requireHub(id); this.world.hub.requireFree(id);
      const copy = copyProfile(profile); applyCharacterCommand(copy, command);
      await this.store.save([copy]); this.adopt(id, copy);
    });
  }
  private requireHub(id: string): PersistentProfile {
    const profile = this.profiles.get(id);
    if (!profile || this.world.locations.has(id) || this.world.hub.present.get(id) === false) throw new Error('Operazione disponibile nel rifugio.');
    return profile;
  }
  async trade(id: string, revision: number): Promise<string[]> {
    return this.serial(async () => {
      this.requireHub(id);
      const settlement = this.world.hub.confirm(id, revision); if (!settlement) return [];
      try {
        const copies = settlement.sides.map(side => {
          const profile = copyProfile(this.requireHub(side.playerId));
          if (!applyTradeDelta(profile.character, side.delta)) throw new Error('Trasferimento già registrato.');
          return profile;
        });
        await this.store.save(copies);
        settlement.sides.forEach((side, i) => this.adopt(side.playerId, copies[i]!));
        return settlement.sides.map(side => side.playerId);
      } finally { this.world.hub.finish(settlement.id); }
    });
  }
  async saveProgress(id: string, snapshot: BattleSnapshot): Promise<void> {
    await this.serial(async () => {
      const profile = this.profiles.get(id); if (!profile) return;
      const key = `${snapshot.id.split(':')[0]}:${id}`, previous = this.progress.get(key) ?? emptyProgress();
      const copy = copyProfile(profile), next = applyRunProgress(copy, id, snapshot, previous);
      if (JSON.stringify(next) === JSON.stringify(previous)) return;
      await this.store.save([copy]); this.adopt(id, copy); this.progress.set(key, next);
    });
  }
  start(id: string, dungeonId: string, mode: PartyMode, battleId: string, seed: number) {
    this.requireHub(id);
    const room = this.world.start(id, dungeonId, mode, battleId, seed);
    // Chi entra tardi non riceve vittorie anteriori al suo ingresso.
    this.progress.set(`${room.battleId}:${id}`, { ...emptyProgress(), victories: room.run?.victories.length ?? 0 });
    return room;
  }
  /** Rimozione immediata della presenza; la pulizia del profilo aspetta le scritture già accodate. */
  async leave(id: string, snapshot?: BattleSnapshot): Promise<void> {
    this.world.leave(id);
    this.departures.set(id, snapshot);
    await this.finishDeparture(id);
  }
  async retryDepartures(): Promise<void> {
    for (const id of this.departures.keys()) await this.finishDeparture(id);
  }
  private async finishDeparture(id: string): Promise<void> {
    const snapshot = this.departures.get(id);
    if (snapshot) await this.saveProgress(id, snapshot);
    await this.serial(async () => {
      const profile = this.profiles.get(id); if (profile) this.accounts.delete(profile.accountId);
      this.profiles.delete(id);
      this.departures.delete(id);
      for (const key of this.progress.keys()) if (key.endsWith(`:${id}`)) this.progress.delete(key);
    });
  }
}
