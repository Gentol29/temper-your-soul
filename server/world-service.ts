import { PublicWorld } from '../src/features/network/public-world';
import { copyProfile, type PersistentProfile, type ProfileSeed, type ProfileStore } from './storage/profiles';
import type { AccountAuth } from './auth/account-auth';
import { serializeCharacter } from '../src/features/character/save-format';
import { applyCharacterCommand } from './character-commands';
import { applyTradeDelta } from '../src/features/character/trade-transfer';
import type { BattleSnapshot, PartyMode } from '../src/features/network/protocol';
import { applyRunProgress, emptyProgress, type ProgressCursor } from './run-progress';
import { randomUUID } from 'node:crypto';
import { Character } from '../src/features/character/character';
import { CharacterRoster, serializeRoster } from '../src/features/character/character-roster';
import { profileRoster } from './storage/profile-roster';

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
  /** Solo l'account verificato può leggere la propria raccolta; non entra nel mondo e non crea nulla. */
  async characterChoices(token: unknown, stillConnected: () => boolean): Promise<string | null> {
    const identity = await this.auth.verify(token);
    return this.serial(async () => {
      if (!stillConnected()) return null;
      if (this.accounts.has(identity.id)) throw new Error('Account già connesso in un’altra scheda.');
      const profile = await this.store.find(identity.id);
      return stillConnected() ? serializeRoster(profile ? profileRoster(profile) : new CharacterRoster()) : null;
    });
  }
  /** Prima l'identità, poi una scelta esplicita: id appartenente all'account oppure nuovo personaggio. */
  async login(id: string, token: unknown, seed: ProfileSeed | null, stillConnected: () => boolean, characterId?: string): Promise<LoginOutcome> {
    const identity = await this.auth.verify(token);
    return this.serial(async () => {
      if (!stillConnected()) return 'disconnected';
      if (this.accounts.has(identity.id)) throw new Error('Account già connesso in un’altra scheda.');
      if (this.profiles.has(id)) throw new Error('Sessione già autenticata.');
      if (seed && characterId !== undefined) throw new Error('Scegli un personaggio oppure creane uno nuovo.');
      let profile = await this.store.find(identity.id);
      if (!seed && characterId === undefined) return 'character_required';
      if (seed) {
        const character = Character.createStarter(seed.characterClass);
        if (!character.completeCreation(seed.name, seed.body, seed.characterClass)) throw new Error('Nome o classe non validi.');
        if (!profile) profile = await this.store.load(identity.id, seed);
        else {
          profile = copyProfile(profile);
          profileRoster(profile).add(character);
          profile.character = character;
          await this.store.save([profile]);
        }
      } else {
        const previousId = profile ? profileRoster(profile).activeId : null;
        if (!profile || !profileRoster(profile).select(characterId!)) throw new Error('Personaggio non appartenente a questo account.');
        profile.character = profile.roster!.active!.character;
        if (previousId !== characterId) await this.store.save([profile]);
      }
      if (!profile) return 'character_required';
      if (!stillConnected()) return 'disconnected';
      this.world.enter(id, profile.character); this.profiles.set(id, profile); this.accounts.add(identity.id);
      return 'entered';
    });
  }
  profileMessage(id: string) {
    const profile = this.profiles.get(id)!;
    return { type: 'profile' as const, characterId: profileRoster(profile).activeId!, character: serializeCharacter(profile.character), gold: profile.gold, revision: profile.revision };
  }
  private adopt(id: string, saved: PersistentProfile): void {
    const original = this.profiles.get(id)!;
    Object.assign(original.character, saved.character);
    original.gold = saved.gold; original.revision = saved.revision;
    original.roster = saved.roster; profileRoster(original);
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
