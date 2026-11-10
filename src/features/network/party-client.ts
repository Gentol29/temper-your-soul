import type {HubView} from './hub-protocol';
import type { PlayerIntent } from '../match/match';
import { NETWORK, type BattleSnapshot, type ClientMessage, type PartyState, type ServerMessage } from './protocol';
import { SnapshotDecoder } from './snapshot-codec';
import { HubDecoder } from './hub-codec';
import { accountToken } from './account-session';
import type { CharacterSeed, ProfileMessage } from './account-protocol';
import type {SocialPartyView} from './social-party';

export class PartyClient {
  profile: ProfileMessage | null = null;
  social:SocialPartyView={members:[],invitations:[],outgoing:[]};
  pendingOperation:string|null=null;
  profileChanged: ((profile: ProfileMessage) => void) | null = null;
  private hubDecoder = new HubDecoder();
  state: PartyState | null = null;
  hub:HubView|null=null;
  tradeSaving=false;
  playerId = '';
  latency: number | null = null;
  jitter = 0;
  receivedCharacters = 0;
  receivedFrames = 0;
  connecting = false;
  /** La connessione si e' interrotta senza che il giocatore l'abbia chiesto, o il tentativo e' fallito. */
  lost = false;
  /** L'account e' verificato ma non ha un personaggio: resta vero finche' non si entra nel mondo o si esce dall'account. */
  characterRequired = false;
  private socket: WebSocket | null = null;
  private timer: number | undefined;
  private lastInput = 0;
  private lastReply = 0;
  private lastSnapshot = 0;
  private decoder = new SnapshotDecoder();
  private pending: BattleSnapshot | null = null;
  constructor(private readonly changed: (pingOnly?: boolean) => void, private readonly snapshot: (state: BattleSnapshot) => void,
    private readonly error: (message: string) => void, private readonly disconnected: () => void) {}

  /** Senza `creation` si accede soltanto; con `creation` si crea il personaggio di un account gia' verificato. */
  connect(creation?: CharacterSeed): void {
    if (this.socket) return;
    this.lost = false;
    if (location.protocol === 'file:') { this.error('Per giocare online apri il gioco tramite il server HTTP.'); return; }
    this.connecting = true;this.pendingOperation=creation?'Creazione del personaggio…':'Ingresso nel rifugio…'; this.changed();
    this.decoder = new SnapshotDecoder();
    this.hubDecoder = new HubDecoder();
    const url = new URL('/party', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url); this.socket = socket;
    socket.addEventListener('open', () => {
      if(this.socket!==socket)return;
      this.lastReply = performance.now();
      this.send({ type: 'login', protocol: NETWORK.protocolVersion, token: accountToken(), ...(creation ? { creation } : {}) });
      this.timer = window.setInterval(() => {
        if (performance.now() - this.lastReply > 12_000 || (this.state?.playing && this.state.members.some(m=>m.id===this.playerId) && performance.now() - this.lastSnapshot > 4000)) {
          this.error('Connessione interrotta: il server non risponde.'); this.drop(); return;
        }
        this.send({ type: 'ping', sent: performance.now() });
      }, 2000);
      this.send({ type: 'ping', sent: performance.now() });
    });
    socket.addEventListener('message', event => {
      if(this.socket!==socket)return;
      const text = String(event.data); this.receivedCharacters += text.length;
      const message = JSON.parse(text) as ServerMessage; this.lastReply = performance.now();
      switch (message.type) {
        case 'profile': this.profile = message; this.profileChanged?.(message); this.tradeSaving = false;if(!this.connecting&&this.pendingOperation==='Salvataggio…'){this.pendingOperation=null;this.changed();}break;
        // Nessun personaggio per questo account: si chiude senza segnare un errore e si passa alla creazione.
        case 'character_required': this.leave(true); break;
        case 'social_party':this.social=message.state;this.changed();break;
        case 'hub_frame':
          try { const previous=this.hub?.players.map(p=>p.id+':'+p.name).join('|');this.hub = this.hubDecoder.decode(message);if(previous!==this.hub.players.map(p=>p.id+':'+p.name).join('|'))this.changed(); }
          catch (error) { this.error(error instanceof Error ? error.message : 'Dati HUB non validi.'); this.drop(); }
          break;
        case 'frame':
          this.receivedFrames++;
          try { this.receiveSnapshot(this.decoder.decode(message)); }
          catch (error) { this.error(error instanceof Error ? error.message : 'Dati di rete non validi.'); this.drop(); }
          break;
        case 'party': this.state = message.state; this.playerId = message.playerId; this.connecting = false;this.characterRequired=false;this.pendingOperation=null; this.lastSnapshot = performance.now(); this.changed(); break;
        case 'snapshot':
          this.receiveSnapshot(message.snapshot); break;
        case 'error': this.tradeSaving = false;this.pendingOperation=null;this.changed(); this.error(message.message); if (!this.state) this.drop(); break;
        case 'pong': {
          const rtt = performance.now() - message.sent;
          this.jitter = this.latency === null ? 0 : Math.abs(rtt - this.latency);
          this.latency = Math.round(rtt); this.changed(true); break;
        }
      }
    });
    socket.addEventListener('error', () => this.error('Server cooperativo non raggiungibile. Verifica che npm run server sia avviato.'));
    socket.addEventListener('close', () => { if (this.socket === socket) this.drop(); });
  }
  private receiveSnapshot(snapshot: BattleSnapshot): void {
    if(this.pendingOperation==='Ingresso nel dungeon…'){this.pendingOperation=null;this.changed();}
    this.lastSnapshot = performance.now();
    // I delta vengono tutti decodificati, ma in un burst si rappresenta solo lo stato più recente.
    if (this.pending?.id === snapshot.id) snapshot.events = [...this.pending.events, ...snapshot.events].slice(-256);
    this.pending = snapshot;
    // Esiti e salvataggi non devono attendere un RAF sospeso in una scheda in background.
    if (snapshot.status !== 'playing') this.flushSnapshot();
  }
  flushSnapshot(): void {
    const snapshot = this.pending; if (!snapshot) return; this.pending = null;
    if (this.state && snapshot.status !== 'playing' && this.state.playing) {
      this.state.playing = false; this.changed();
    }
    this.snapshot(snapshot);
  }
  send(message: ClientMessage): void { if (this.socket?.readyState === WebSocket.OPEN) {
    if(message.type==='character_command'){this.tradeSaving=true;this.pendingOperation='Salvataggio…';}
    else if(message.type==='portal_start')this.pendingOperation='Ingresso nel dungeon…';
    else if(message.type==='return_hub')this.pendingOperation='Ritorno al rifugio…';
    if(this.pendingOperation)this.changed();this.socket.send(JSON.stringify(message));
  } }
  get isMember():boolean{return Boolean(this.state?.members.some(m=>m.id===this.playerId));}
  returnToHub():void{this.send({type:'return_hub'});}
  input(intent: PlayerIntent): boolean {
    const now = performance.now(); if (now - this.lastInput < NETWORK.inputMs) return false;
    this.lastInput = now; this.send({ type: 'input', intent }); return true;
  }
  /** Uscita non chiesta dal giocatore: resta il segno, che il menu mostra come disconnessione. */
  private drop(): void {
    // Una creazione non riuscita non riporta all'accesso: si resta sulla creazione e si riprova.
    this.leave(this.characterRequired);
    this.lost = true;
    this.changed();
  }
  /** Chiude la connessione. `characterRequired` resta acceso solo quando il server chiede di creare il personaggio. */
  leave(characterRequired = false): void {
    this.lost = false; this.characterRequired = characterRequired;
    const socket = this.socket; const hadConnection = this.state !== null;
    this.socket = null; this.pending = null; window.clearInterval(this.timer); socket?.close();
    this.state = null;this.hub=null;this.profile=null;this.social={members:[],invitations:[],outgoing:[]};this.pendingOperation=null;this.tradeSaving=false; this.playerId = ''; this.connecting = false; this.latency = null; this.changed();
    if (hadConnection) this.disconnected();
  }
}
