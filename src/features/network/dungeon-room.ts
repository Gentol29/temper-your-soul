import { publicCharacter } from './hub-room';
import { bossForParty } from '../combat/party-health';
import { SeededRng } from '../../core/rng';
import type { Character } from '../character/character';
import type { GameEvent } from '../combat/events';
import { DUNGEONS, dungeonById } from '../dungeons/dungeons';
import { canEnterDungeon, minimumDungeonGearScore } from '../dungeons/dungeon-access';
import { lootTableFor } from '../loot/loot-tables';
import { rollLoot } from '../loot/roll-loot';
import type { ItemRoll } from '../items/item';
import { Match, spreadPlayers, type PlayerIntent } from '../match/match';
import { DescentRun } from '../run/descent';
import { veinUnlocks } from '../run/veins';
import { NETWORK, PARTY_MODES, snapshotOf, type PartyMode, type PartyState, type BattleSnapshot } from './protocol';


/** Istanza pubblica di dungeon: nessun proprietario, invito o stato di prontezza. */
export class DungeonRoom {
  readonly characters = new Map<string, Character>();
  readonly inputs = new Map<string, { intent: PlayerIntent; receivedAt: number }>();
  dungeonId = 'crypt';
  mode: PartyMode = 'descent';
  grade = 0;
  /** La partita in corso: il duello o la stanza attuale della discesa. */
  match: Match | null = null;
  /** La discesa in corso (Discesa e Pellegrinaggio). */
  run: DescentRun | null = null;
  battleId = '';
  private events: GameEvent[] = [];
  private rewards: Record<string, ItemRoll[]> = {};
  private rewarded = false;
  private lootRng = new SeededRng(1);
  constructor(readonly code: string) {}

  /** In combattimento: il duello o la discesa non sono finiti. */
  get playing(): boolean {
    if (this.run !== null) return this.run.status === 'playing';
    return this.match?.status === 'playing';
  }
  enter(id: string, character: Character): void {
    if (!character?.created) throw new Error('Crea prima un personaggio.');
    if (this.characters.has(id)) throw new Error('Giocatore già presente.');
    if (this.characters.size >= NETWORK.dungeonCapacity) throw new Error('Il dungeon è completo.');
    if (this.playing) { this.joinPublic(id, character); return; }
    this.characters.set(id, character);
  }
  leave(id: string): void {
    this.characters.delete(id); this.inputs.delete(id);
    if (this.run) this.run.removePlayer(id); else this.match?.removePlayer(id);
  }
  /** Ingresso dal portale pubblico, anche a incontro già avviato. */
  joinPublic(id: string, character: Character): void {
    if (!this.playing || this.characters.size >= NETWORK.dungeonCapacity) throw new Error('Istanza non disponibile.');
    const dungeon = dungeonById(this.dungeonId)!;
    for (const gate of this.mode === 'pilgrimage' ? DUNGEONS : [dungeon]) {
      if (!canEnterDungeon(gate, character.gearScore)) throw new Error(`Servono ${minimumDungeonGearScore(gate)} GS.`);
    }
    if (this.mode === 'duel' && !character.canDuel(dungeon.id)) throw new Error('Sconfiggi prima il boss in discesa.');
    if (this.mode === 'pilgrimage' && !character.canPilgrimage(DUNGEONS.map(d => d.id))) throw new Error('Completa prima tutte le discese.');
    this.characters.set(id, character);
    const member = { id, loadout: character.loadout(), totalXp: character.totalXp, characterClass: character.characterClass };
    if (this.run) this.run.addPlayer(member); else this.match!.addPlayer(member);
  }
  choose(dungeonId: string): void {
    if (this.playing) throw new Error('La partita è già iniziata.');
    if (!dungeonById(dungeonId)) throw new Error('Dungeon non valido.');
    this.dungeonId = dungeonId;
  }
  /** Come entrare (Discesa, Duello, Pellegrinaggio). */
  chooseMode(mode: unknown, grade: unknown): void {
    if (this.playing) throw new Error('La partita è già iniziata.');
    if (typeof mode !== 'string' || !PARTY_MODES.includes(mode as PartyMode)) throw new Error('Modalità non valida.');
    if (typeof grade !== 'number' || !Number.isInteger(grade) || grade < 0 || grade !== 0) throw new Error('I gradi di tempra non sono disponibili.');
    this.mode = mode as PartyMode; this.grade = 0;
  }
  start(battleId: string, seed: number): void {
    if (this.playing) throw new Error('La partita è già iniziata.');
    if(!this.characters.size)throw new Error('Nessun giocatore nel dungeon.');
    const dungeon = dungeonById(this.dungeonId)!;
    const gates = this.mode === 'pilgrimage' ? DUNGEONS : [dungeon];
    for (const character of this.characters.values()) {
      for (const gate of gates) {
        if (!canEnterDungeon(gate, character.gearScore)) throw new Error(`${character.name}: servono ${minimumDungeonGearScore(gate)} GS.`);
      }
      if (this.mode === 'duel' && !character.canDuel(dungeon.id)) throw new Error(`${character.name}: il duello si apre dopo aver sconfitto il boss in una discesa.`);
      if (this.mode === 'pilgrimage' && !character.canPilgrimage(DUNGEONS.map((d) => d.id))) throw new Error(`${character.name}: il Pellegrinaggio si apre dopo una discesa vinta in ogni dungeon.`);
    }
    this.run = null;
    if (this.mode === 'duel') {
      const members = [...this.characters].map(([key, character]) => ({ id: key, loadout: character.loadout(), totalXp: character.totalXp, characterClass: character.characterClass }));
      this.match = new Match({ rng: new SeededRng(seed), dungeon, loadout: members[0]!.loadout, members, boss: bossForParty(dungeon.boss,members.length) });
      spreadPlayers(this.match);
    } else {
      this.run = new DescentRun({
        mode: this.mode,
        dungeonId: this.mode === 'pilgrimage' ? DUNGEONS[0]!.id : dungeon.id,
        members: [...this.characters].map(([key, character]) => ({ id: key, loadout: character.loadout(), totalXp: character.totalXp, characterClass: character.characterClass })),
        seed,
        grade: this.grade,
        // Le vene di servitori sono quelle sbloccate dal primo arrivato.
        veins: veinUnlocks([...this.characters.values()][0]!, this.mode === 'pilgrimage' ? DUNGEONS.map((d) => d.id) : [dungeon.id]),
      });
      this.match = this.run.match;
    }
    this.lootRng = new SeededRng((seed ^ 0x10075) >>> 0);
    this.battleId = battleId; this.events = []; this.rewards = {}; this.rewarded = false; this.inputs.clear();
    this.listen(this.match);
  }
  private listen(match: Match): void {
    match.events.connect(event => { if (match === this.match) this.events.push(event); });
  }
  tick(now: number): void {
    if (!this.match || !this.playing) return;
    const intents = new Map<string, PlayerIntent>();
    for (const [id, input] of this.inputs) if (now - input.receivedAt <= NETWORK.staleInputMs) intents.set(id, input.intent);
    this.match.stepParty(NETWORK.step, intents);
    if (this.match.status === 'playing') return;
    const run = this.run;
    if (run !== null) {
      // La stanza e' finita: bottino se era il boss, poi la stanza dopo (o la fine della discesa).
      if (this.match.status === 'won' && run.atBoss) run.rollBossLoot(this.lootRng);
      run.advance();
      if (run.status === 'playing') {
        this.match = run.match;
        this.listen(this.match);
        return;
      }
      if (!this.rewarded) {
        this.rewarded = true;
        this.rewards = Object.fromEntries([...run.rewards].map(([id, rolls]) => [id, [...rolls]]));
      }
      return;
    }
    if (!this.rewarded) {
      this.rewarded = true;
      if (this.match.status === 'won') for (const id of this.characters.keys()) this.rewards[id] = rollLoot(lootTableFor(this.dungeonId), this.match.rng);
    }
  }
  /** Un giocatore sceglie una tempra fra quelle offerte. */
  chooseTemper(id: string, index: unknown): void {
    if (this.run === null || !this.playing || typeof index !== 'number' || !Number.isInteger(index)) throw new Error('Scelta non valida.');
    if (!this.run.encounter.chooseOffer(this.run.match, id, index)) throw new Error('Nessuna tempra da scegliere.');
  }
  /** Un giocatore risponde al patto del forziere. */
  answerPact(id: string, accept: unknown): void {
    if (this.run === null || !this.playing || typeof accept !== 'boolean') throw new Error('Risposta non valida.');
    if (!this.run.encounter.answerPact(this.run.match, id, accept)) throw new Error('Nessun patto in attesa.');
  }
  snapshot(consumeEvents = true): BattleSnapshot | null {
    if (!this.match) return null;
    const run = this.run;
    const id = run === null ? this.battleId : `${this.battleId}:${run.roomKey}`;
    const status = run === null ? this.match.status : run.status;
    const state = snapshotOf(this.match, id, this.events, this.rewards, {
      room: run?.roomView() ?? null,
      run: run?.view() ?? null,
      status,
    });
    if (consumeEvents) this.events = [];
    return state;
  }
  state(): PartyState {
    return { code: this.code, dungeonId: this.dungeonId, mode: this.mode, grade: this.grade, playing: this.playing,
      members: [...this.characters].map(([id,c])=>({id,character:publicCharacter(c),name:c.name!,appearance:c.appearance(),gearScore:c.gearScore})) };
  }
}
