import {HUB_NETWORK} from './hub-protocol';
import {HubRoom} from './hub-room';
import { bossForParty } from '../combat/party-health';
import { SeededRng } from '../../core/rng';
import { deserializeCharacter } from '../character/save-format';
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

const MODE_NAMES: Readonly<Record<PartyMode, string>> = { descent: 'la discesa', duel: 'il duello', pilgrimage: 'il Pellegrinaggio' };

/** Regole della lobby testabili senza socket. Il server assegna identità e orologio. */
export class PartyRoom {
  readonly characters = new Map<string, Character>();
  readonly ready = new Set<string>();
  readonly inputs = new Map<string, { intent: PlayerIntent; receivedAt: number }>();
  leaderId = '';
  ownerId = '';
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
  readonly hub:HubRoom;
  constructor(readonly code: string) {this.hub=new HubRoom(this.characters,()=>this.playing,code);}

  /** In combattimento: il duello o la discesa non sono finiti. */
  get playing(): boolean {
    if (this.run !== null) return this.run.status === 'playing';
    return this.match?.status === 'playing';
  }
  enter(id: string, raw: string, visitor=false): void {
    if (this.playing&&!visitor) throw new Error('Il party è già in dungeon. Attendi la fine della partita.');
    if ((!visitor&&this.hub.members.size>=NETWORK.capacity)||this.characters.size >= HUB_NETWORK.capacity) throw new Error('Il party è completo.');
    const character = deserializeCharacter(raw);
    if (!character?.created) throw new Error('Crea prima un personaggio.');
    this.characters.set(id, character);this.hub.enter(id,visitor);
    if(!this.ownerId)this.ownerId=id;if(!this.leaderId&&!visitor)this.leaderId=id;
  }
  leave(id: string): void {
    this.hub.leave(id);this.characters.delete(id); this.ready.delete(id); this.inputs.delete(id);
    if (this.run !== null && this.playing) this.run.removePlayer(id);
    else {
      const player = this.match?.players.get(id);
      if (player && this.playing) player.health.current = 0;
    }
    if(this.ownerId===id)this.ownerId=this.characters.keys().next().value??'';
    if (this.leaderId === id) {this.leaderId=[...this.hub.members][0]??'';}
  }
  leaveParty(id:string):void {
    this.hub.cancel(id);this.hub.requireFree(id);
    if(!this.hub.members.delete(id))return;
    this.ready.delete(id);this.inputs.delete(id);
    if(this.playing){if(this.run)this.run.removePlayer(id);else {const player=this.match?.players.get(id);if(player)player.health.current=0;}}
    if(this.leaderId===id)this.leaderId=[...this.hub.members][0]??'';
  }
  createParty(id:string):void {
    if(!this.characters.has(id)||this.hub.members.size)throw new Error('Un party è già presente: chiedi un invito.');
    this.hub.requireFree(id);this.hub.members.add(id);this.leaderId=id;this.ready.clear();
  }
  setPresence(id:string,present:boolean):void {this.hub.setPresence(id,present);if(!present)this.ready.delete(id);}
  startFromPortal(id:string,dungeonId:string,mode:unknown,battleId:string,seed:number):void {
    this.requireLeader(id);
    if([...this.hub.members].some(member=>this.hub.present.get(member)===false||(member!==id&&!this.ready.has(member))))throw new Error('Gli altri membri devono essere pronti e presenti nell’HUB.');
    const ready=[...this.ready];this.choose(id,dungeonId);this.chooseMode(id,mode,0);for(const member of ready)this.ready.add(member);this.ready.add(id);this.start(id,battleId,seed);
  }
  choose(id: string, dungeonId: string): void {
    this.requireLeader(id);
    if (this.playing) throw new Error('La partita è già iniziata.');
    if (!dungeonById(dungeonId)) throw new Error('Dungeon non valido.');
    this.dungeonId = dungeonId; this.ready.clear();
  }
  /** Il leader sceglie come entrare (Discesa, Duello, Pellegrinaggio). */
  chooseMode(id: string, mode: unknown, grade: unknown): void {
    this.requireLeader(id);
    if (this.playing) throw new Error('La partita è già iniziata.');
    if (typeof mode !== 'string' || !PARTY_MODES.includes(mode as PartyMode)) throw new Error('Modalità non valida.');
    if (typeof grade !== 'number' || !Number.isInteger(grade) || grade < 0 || grade !== 0) throw new Error('I gradi di tempra non sono disponibili.');
    this.mode = mode as PartyMode; this.grade = 0; this.ready.clear();
  }
  start(id: string, battleId: string, seed: number): void {
    this.requireLeader(id);
    if (this.playing) throw new Error('La partita è già iniziata.');
    if([...this.hub.members].some(p=>Boolean(this.hub.tradeFor(p))))throw new Error('Completa gli scambi prima di partire.');
    if ([...this.hub.members].some(key => !this.ready.has(key))) throw new Error('Tutti i membri devono essere pronti.');
    const dungeon = dungeonById(this.dungeonId)!;
    const gates = this.mode === 'pilgrimage' ? DUNGEONS : [dungeon];
    for (const [key,character] of this.characters) {
      if(!this.hub.members.has(key))continue;
      for (const gate of gates) {
        if (!canEnterDungeon(gate, character.gearScore)) throw new Error(`${character.name}: servono ${minimumDungeonGearScore(gate)} GS.`);
      }
      if (this.mode === 'duel' && !character.canDuel(dungeon.id)) throw new Error(`${character.name}: il duello si apre dopo aver sconfitto il boss in una discesa.`);
      if (this.mode === 'pilgrimage' && !character.canPilgrimage(DUNGEONS.map((d) => d.id))) throw new Error(`${character.name}: il Pellegrinaggio si apre dopo una discesa vinta in ogni dungeon.`);
    }
    this.run = null;
    if (this.mode === 'duel') {
      const members = [...this.characters].filter(([key])=>this.hub.members.has(key)).map(([key, character]) => ({ id: key, loadout: character.loadout(), totalXp: character.totalXp, characterClass: character.characterClass }));
      this.match = new Match({ rng: new SeededRng(seed), dungeon, loadout: members[0]!.loadout, members, boss: bossForParty(dungeon.boss,members.length) });
      spreadPlayers(this.match);
    } else {
      this.run = new DescentRun({
        mode: this.mode,
        dungeonId: this.mode === 'pilgrimage' ? DUNGEONS[0]!.id : dungeon.id,
        members: [...this.characters].filter(([key])=>this.hub.members.has(key)).map(([key, character]) => ({ id: key, loadout: character.loadout(), totalXp: character.totalXp, characterClass: character.characterClass })),
        seed,
        grade: this.grade,
        // Le vene di servitori sono quelle sbloccate dal capo gruppo.
        veins: veinUnlocks(this.characters.get(this.leaderId) ?? [...this.characters.values()][0]!, this.mode === 'pilgrimage' ? DUNGEONS.map((d) => d.id) : [dungeon.id]),
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
    this.hub.tick(now);
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
        this.rewarded = true; this.ready.clear();
        this.rewards = Object.fromEntries([...run.rewards].map(([id, rolls]) => [id, [...rolls]]));
      }
      return;
    }
    if (!this.rewarded) {
      this.rewarded = true; this.ready.clear();
      if (this.match.status === 'won') for (const id of this.hub.members) this.rewards[id] = rollLoot(lootTableFor(this.dungeonId), this.match.rng);
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
  snapshot(): BattleSnapshot | null {
    if (!this.match) return null;
    const run = this.run;
    const id = run === null ? this.battleId : `${this.battleId}:${run.roomKey}`;
    const status = run === null ? this.match.status : run.status;
    const state = snapshotOf(this.match, id, this.events, this.rewards, {
      room: run?.roomView() ?? null,
      run: run?.view() ?? null,
      status,
    });
    this.events = [];
    return state;
  }
  state(): PartyState {
    return { code: this.code, ownerId:this.ownerId, leaderId: this.leaderId, dungeonId: this.dungeonId, mode: this.mode, grade: this.grade, playing: this.playing,
      members: this.memberViews(false), visitors:this.memberViews(true) };
  }
  private memberViews(visitors:boolean):PartyState['members']{
    return [...this.characters].filter(([id])=>this.hub.members.has(id)!==visitors).map(([id,c])=>({id,character:this.hub.publicCharacter(id),name:c.name!,appearance:c.appearance(),gearScore:c.gearScore,ready:this.ready.has(id)}));
  }
  private requireLeader(id: string): void { if (id !== this.leaderId) throw new Error(`Solo il leader può scegliere e avviare ${MODE_NAMES[this.mode]}.`); }
}
