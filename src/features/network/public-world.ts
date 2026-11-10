import { HubRoom } from './hub-room';
import { DungeonRoom } from './dungeon-room';
import type { Character } from '../character/character';
import { HUB_NETWORK } from './hub-protocol';
import { NETWORK, type PartyMode } from './protocol';
import {SocialParties} from './social-party';

/** Il rifugio non dipende dall'esistenza di una discesa e non scompare quando è vuoto. */
export class PublicWorld {
  readonly id = 'HUB';
  readonly characters = new Map<string, Character>();
  readonly hub: HubRoom;
  readonly parties:SocialParties;
  readonly instances = new Map<string, DungeonRoom>();
  readonly locations = new Map<string, DungeonRoom>();
  constructor(sessionId = 'session') { this.hub = new HubRoom(this.characters, `HUB:${sessionId}`);this.parties=new SocialParties(this.characters,id=>this.hub.publicCharacter(id)); }
  enter(id: string, character: Character): void {
    if (this.characters.has(id)) throw new Error('Sessione già presente.');
    if (this.characters.size >= HUB_NETWORK.capacity) throw new Error('Mondo pieno. Riprova fra poco.');
    this.characters.set(id, character); this.hub.enter(id, true);
  }
  leave(id: string): void {
    this.parties.leave(id);
    this.returnToHub(id);
    this.hub.leave(id); this.characters.delete(id);
  }
  returnToHub(id: string): void {
    const room = this.locations.get(id);
    if (room) {
      room.leave(id); this.locations.delete(id);
      if (!room.characters.size) this.instances.delete(room.code);
    }
    if (this.hub.positions.has(id)) this.hub.setPresence(id, true);
  }
  start(id: string, dungeonId: string, mode: PartyMode, battleId: string, seed: number): DungeonRoom {
    if (this.locations.get(id)?.playing) throw new Error('Sei già in dungeon.');
    this.hub.requireFree(id);
    const character = this.characters.get(id); if (!character) throw new Error('Accedi prima al mondo.');
    const existing = [...this.instances.values()].find(room => room.playing && room.dungeonId === dungeonId && room.mode === mode && room.characters.size < NETWORK.dungeonCapacity);
    if (existing) {
      existing.joinPublic(id, character); this.returnToHub(id);
      this.locations.set(id, existing); this.hub.setPresence(id, false); return existing;
    }
    // Prima presenza: avvia subito l'istanza pubblica, senza lobby.
    const room = new DungeonRoom(battleId);
    room.enter(id, character); room.choose(dungeonId); room.chooseMode(mode, 0);
    room.start(battleId, seed);
    this.returnToHub(id);
    this.locations.set(id, room); this.instances.set(battleId, room); this.hub.setPresence(id, false);
    return room;
  }
  tick(now: number): void {
    this.hub.tick(now);
    for (const room of this.instances.values()) room.tick(now);
  }
}
