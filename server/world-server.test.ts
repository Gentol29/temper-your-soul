import { afterEach, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { once } from 'node:events';
import { createWorldServer } from './world-server';
import { WorldService } from './world-service';
import { Character } from '../src/features/character/character';
import { copyProfile, type PersistentProfile, type ProfileStore, type ProfileSeed } from './storage/profiles';
import { NETWORK, type ServerMessage } from '../src/features/network/protocol';
import { HubDecoder } from '../src/features/network/hub-codec';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function runtime(allowedOrigins?: readonly string[]) {
  const rows = new Map<string, PersistentProfile>();
  const store: ProfileStore = {
    async load(accountId: string, seed: ProfileSeed) {
      let p = rows.get(accountId);
      if (!p) { const character = Character.createStarter(seed.characterClass); character.completeCreation(seed.name, seed.body, seed.characterClass); p = { accountId, character, gold: 0, revision: 0 }; rows.set(accountId, copyProfile(p)); }
      return copyProfile(p);
    },
    async save(profiles) { for (const p of profiles) { p.revision++; rows.set(p.accountId, copyProfile(p)); } },
  };
  const service = new WorldService(store, { verify: async token => { if (typeof token !== 'string' || !token.startsWith('verified-')) throw new Error('Token non valido'); return { id: token }; } });
  const server = createWorldServer({ service, allowedOrigins }); server.server.listen(0, '127.0.0.1'); await once(server.server, 'listening');
  const address = server.server.address(); if (!address || typeof address === 'string') throw new Error('address');
  const port = address.port;
  const peers: WebSocket[] = [];
  cleanup.push(async () => { for (const peer of peers) peer.terminate(); await server.close(); });
  async function connect(id: string) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/party`), messages: ServerMessage[] = [];
    peers.push(socket); socket.on('message', raw => messages.push(JSON.parse(String(raw)) as ServerMessage));
    await once(socket, 'open');
    const send = (message: unknown) => socket.send(JSON.stringify(message));
    async function wait(predicate: (m: ServerMessage) => boolean): Promise<ServerMessage> {
      const prior = messages.find(predicate); if (prior) return prior;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { socket.off('message', receive); reject(new Error('Timeout messaggio di rete')); }, 4000);
        function receive(raw: unknown) { const m = JSON.parse(String(raw)) as ServerMessage; if (predicate(m)) { clearTimeout(timeout); socket.off('message', receive); resolve(m); } }
        socket.on('message', receive);
      });
    }
    send({ type: 'login', protocol: NETWORK.protocolVersion, token: `verified-${id}`, name: 'Eroe', characterClass: 'mage', body: 'male' });
    const entered = await wait(m => m.type === 'party'); if (entered.type !== 'party') throw new Error('login');
    return { socket, messages, send, wait, id: entered.playerId };
  }
  return { server, connect, rows, port, peers };
}
it('32 WebSocket reali entrano nel medesimo HUB; i nuovi client ricevono tuple complete e vedono le disconnessioni', async () => {
  const { server, connect } = await runtime(), peers = await Promise.all(Array.from({ length: 32 }, (_, i) => connect(String(i))));
  expect(server.service.world.characters.size).toBe(32);
  const peer = peers[0]!; await peer.wait(m => m.type === 'hub_frame' && m.p.length === 32);
  const decoder = new HubDecoder();
  for (const frame of peer.messages) if (frame.type === 'hub_frame') decoder.decode(frame);
  const gone = peers[1]!.id; peers[1]!.socket.close();
  await peer.wait(m => m.type === 'hub_frame' && m.r?.includes(gone) === true);
  expect(server.service.world.characters.has(gone)).toBe(false);
}, 15_000);
it('il trasporto rifiuta inventari completi e non pubblica un profilo prima del commit', async () => {
  const { connect, rows } = await runtime(), peer = await connect('one');
  peer.send({ type: 'character', character: JSON.stringify({ gold: 9999 }) });
  await peer.wait(m => m.type === 'error' && m.message === 'Comando non valido.'); expect(rows.get('verified-one')!.gold).toBe(0);
  peer.send({ type: 'character_command', command: { kind: 'unequip', slot: 'primary_hand' } });
  const response = await peer.wait(m => m.type === 'profile' && m.revision === 1); expect(response.type).toBe('profile');
  expect(rows.get('verified-one')!.character.equipped.primary_hand).toBeNull();
});
it('il portale unisce due socket allo stesso dungeon senza prontezza e l’uscita lascia attiva la simulazione', async () => {
  const { connect, server } = await runtime(), a = await connect('a'), b = await connect('b');
  a.send({ type: 'portal_start', dungeonId: 'crypt', mode: 'descent' }); await a.wait(m => m.type === 'frame');
  b.send({ type: 'portal_start', dungeonId: 'crypt', mode: 'descent' }); await b.wait(m => m.type === 'frame');
  const room = server.service.world.locations.get(a.id)!; expect(server.service.world.locations.get(b.id)).toBe(room);
  b.send({ type: 'return_hub' }); await b.wait(m => m.type === 'party' && m.state.code === 'HUB' && !server.service.world.locations.has(b.id));
  expect(room.match!.players.has(b.id)).toBe(false); expect(room.playing).toBe(true);
});
it('inviti e membri viaggiano sul WebSocket e lasciare il party mantiene l’avatar nell’HUB',async()=>{
 const {connect,server}=await runtime(),a=await connect('social-a'),b=await connect('social-b');
 a.send({type:'social_invite',target:b.id});
 const invitation=await b.wait(m=>m.type==='social_party'&&m.state.invitations.length===1);if(invitation.type!=='social_party')throw new Error('invite');
 b.send({type:'social_answer',id:invitation.state.invitations[0]!.id,accept:true});
 await a.wait(m=>m.type==='social_party'&&m.state.members.length===2);
 b.send({type:'social_leave'});await a.wait(m=>m.type==='social_party'&&m.state.members.length===0&&server.service.world.parties.view(a.id,performance.now()).members.length===0);
 expect(server.service.world.characters.has(b.id)).toBe(true);expect(b.socket.readyState).toBe(WebSocket.OPEN);
});
it('con origini limitate il WebSocket ammette la pagina servita dallo stesso host e rifiuta le altre', async () => {
  const { port, peers } = await runtime(['https://ammessa.example']);
  // 0 = connessione viva (risponde al ping); altrimenti il codice con cui il server l'ha chiusa.
  async function outcome(origin: string): Promise<number> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/party`, { origin }); peers.push(socket);
    return Promise.race([
      once(socket, 'close').then(([code]) => code as number),
      once(socket, 'open').then(() => { socket.ping(); return once(socket, 'pong'); }).then(() => 0),
    ]);
  }
  expect(await outcome('https://estranea.example')).toBe(1008);
  expect(await outcome('https://ammessa.example')).toBe(0);
  expect(await outcome(`http://127.0.0.1:${port}`)).toBe(0);
  expect(await outcome(`https://127.0.0.1:${port}`)).toBe(0);
});
