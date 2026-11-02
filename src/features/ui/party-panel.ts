import type { Character } from '../character/character';
import { deserializeCharacter } from '../character/save-format';
import { CLASS_LABELS } from '../character/character-class';
import { levelProgress } from '../character/progression';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { DUNGEONS, dungeonById } from '../dungeons/dungeons';
import { minimumDungeonGearScore } from '../dungeons/dungeon-access';
import { PartyClient } from '../network/party-client';
import { publicInviteBase } from '../network/public-invite';
import { NETWORK, type BattleSnapshot } from '../network/protocol';
import { characterPixels } from '../presentation/character-art';
import { renderBossArtwork } from './boss-artwork';
import { pixelSvg } from './character-portrait';
import { el, requireElement } from './dom';

export const PARTY_CAPACITY = NETWORK.capacity;
type PartyPhase = 'idle' | 'playing' | 'paused' | 'ended';

/** La lobby visualizza solo lo stato confermato dal server. */
export class PartyPanel {
  readonly client: PartyClient;
  private readonly root = requireElement('party-panel');
  private character: Character | null = null;
  private profileId: string | null = null;
  private dungeon: DungeonDefinition | null = null;
  private phase: PartyPhase = 'idle';
  private dialog: HTMLDialogElement | null = null;
  private note = '';
  private pendingInvite = new URLSearchParams(location.search).get('party');
  constructor(private readonly onOpen: () => void, snapshot: (s: BattleSnapshot) => void, disconnected: () => void) {
    this.client = new PartyClient(pingOnly => {
      if (pingOnly) this.updatePing();
      else { this.renderWidget(); if (this.dialog?.open) this.renderDialog(); }
    }, snapshot,
      message => { this.note = message; this.renderWidget(); if (this.dialog?.open) this.renderDialog(); }, disconnected);
  }
  update(character: Character, profileId: string | null, dungeon: DungeonDefinition, phase: PartyPhase): void {
    const id = character.created ? profileId : null;
    if (this.profileId && id !== this.profileId) this.client.leave();
    this.profileId = id; this.character = id ? character : null; this.dungeon = dungeon; this.phase = phase;
    if (this.pendingInvite && this.character && !this.client.connecting && !this.client.state) {
      const code = this.pendingInvite; this.pendingInvite = null; this.client.connect(this.character, code,this.profileId??'default');
    }
    if (this.character) this.client.sync(this.character);
    this.renderWidget(); if (this.dialog?.open) this.renderDialog();
  }
  private status(): string {
    if (this.client.connecting) return 'Connessione…';
    if (!this.character) return this.pendingInvite ? 'Crea un personaggio per accettare l’invito' : 'Scegli un personaggio';
    if (this.client.state?.playing) return 'In dungeon · cooperativa';
    if (this.client.state) return 'Lobby · ' + (this.client.state.leaderId === this.client.playerId ? 'Sei il leader' : 'In attesa del leader');
    return this.phase === 'playing' ? 'In dungeon · Solo' : 'Solo';
  }
  private slot(index: number, detailed = false): HTMLElement {
    const member = this.client.state?.members[index];
    const local = !this.client.state && index === 0 ? this.character : null;
    const character = member ? deserializeCharacter(member.character) : local;
    const slot = detailed ? el('article', 'party-slot party-slot-detailed') : el('button', 'party-slot');
    slot.classList.toggle('party-slot-empty', !character); slot.dataset.partySlot = String(index + 1);
    if (slot instanceof HTMLButtonElement) { slot.type = 'button'; slot.addEventListener('click', () => this.openDialog()); }
    const art = el('span', 'party-member-art');
    if (character) art.append(pixelSvg(characterPixels(character.appearance(), 'game')));
    else art.append(el('b', 'party-slot-plus', '+'));
    slot.append(art, el('span', 'party-member-name', character?.name ?? 'Libero'));
    slot.setAttribute('aria-label', character?.name ?? `Posto ${index + 1} libero`);
    if (detailed && character) {
      slot.append(el('small', '', `${CLASS_LABELS[character.characterClass!]} · Lv. ${levelProgress(character.totalXp).level}`));
      slot.append(el('span', 'party-member-status', `${character.gearScore} GS · ${member?.ready ? 'Pronto' : 'In preparazione'}`));
      if (member?.id === this.client.state?.leaderId) slot.append(el('span', 'party-leader', member?.id === this.client.playerId ? 'Tu · Leader' : 'Leader'));
    }
    return slot;
  }
  private renderWidget(): void {
    this.root.replaceChildren(); const state = this.client.state;
    const head = el('div', 'party-heading'), open = el('button', 'party-open', `Party · ${state?.members.length ?? (this.character ? 1 : 0)}/${PARTY_CAPACITY}`);
    open.type = 'button'; open.setAttribute('aria-label', 'Apri il party cooperativo'); open.addEventListener('click', () => this.openDialog());
    const latency = this.client.latency;
    const ping = el('span', 'party-local-badge', state ? latency === null ? 'Online' : `${latency} ms` : 'Cooperativa');
    ping.title = `Tempo di andata e ritorno (RTT). Variazione ultima misura: ${Math.round(this.client.jitter)} ms.`;
    head.append(open, ping); this.root.append(head);
    const slots = el('div', 'party-slots'); for (let i = 0; i < PARTY_CAPACITY; i++) slots.append(this.slot(i));
    this.root.append(slots, el('small', 'party-widget-status', this.status()));
  }
  /** Il ping non modifica i membri: evita di rigenerare SVG, bottoni e dialog ogni due secondi. */
  private updatePing(): void {
    const badge = this.root.querySelector('.party-local-badge');
    if (badge && this.client.state && this.client.latency !== null) {
      badge.textContent = `${this.client.latency} ms`;
      badge.setAttribute('title', `Tempo di andata e ritorno (RTT). Variazione ultima misura: ${Math.round(this.client.jitter)} ms.`);
    }
  }
  openDialog(): void {
    if (this.dialog) return;
    const dialog = el('dialog', 'party-dialog'); this.dialog = dialog; dialog.setAttribute('aria-labelledby', 'party-title');
    dialog.addEventListener('keydown', e => { if (e.code === 'Escape') e.stopPropagation(); });
    dialog.addEventListener('close', () => { dialog.remove(); this.dialog = null; });
    document.body.append(dialog); this.renderDialog(); dialog.showModal(); this.onOpen();
  }
  close(): void { this.dialog?.close(); }
  private renderDialog(): void {
    const dialog = this.dialog; if (!dialog) return; dialog.replaceChildren();
    const state = this.client.state, leader = state?.leaderId === this.client.playerId;
    const head = el('div', 'party-dialog-heading'), titles = el('div'), title = el('h2', '', 'Party cooperativo'); title.id = 'party-title';
    titles.append(el('span', 'eyebrow', 'UNA DISCESA · UN BOSS COMUNE'), title);
    const close = el('button', 'secondary party-close', 'Chiudi'); close.addEventListener('click', () => dialog.close()); head.append(titles, close); dialog.append(head);
    dialog.append(el('p', 'party-intro', 'Fino a 4 alleati. Nessun fuoco amico. Il leader sceglie destinazione e modalità e avvia; nella discesa la porta si attraversa insieme.'));
    const slots = el('div', 'party-lobby-slots'); for (let i = 0; i < PARTY_CAPACITY; i++) slots.append(this.slot(i, true)); dialog.append(slots);
    const dungeon = (state && dungeonById(state.dungeonId)) || this.dungeon;
    if (dungeon) {
      const objective = el('div', 'party-objective'), text = el('div'); objective.append(renderBossArtwork(dungeon));
      text.append(el('small', '', 'Obiettivo comune'), el('strong', '', dungeon.boss.name), el('span', '', dungeon.name)); objective.append(text); dialog.append(objective);
    }
    if (state) {
      const destinations = el('div', 'party-destination-buttons');
      destinations.setAttribute('role', 'group'); destinations.setAttribute('aria-label', 'Destinazione party');
      for (const d of DUNGEONS) {
        const button = el('button', 'secondary', d.name);
        button.disabled = !leader || state.playing; button.setAttribute('aria-pressed', String(d.id === state.dungeonId));
        button.title = 'Requisito: ' + minimumDungeonGearScore(d) + ' GS';
        button.addEventListener('click', () => this.client.send({ type: 'choose', dungeonId: d.id })); destinations.append(button);
      }
      dialog.append(destinations);
      const modes = el('div', 'party-lobby-actions');
      for (const [id, text] of [['descent', 'Stanze e boss'], ['duel', 'Solo boss']] as const) {
        const button = el('button', 'secondary', text); button.disabled = !leader || state.playing;
        button.setAttribute('aria-pressed', String(state.mode === id));
        button.addEventListener('click', () => this.client.send({ type: 'mode', mode: id, grade: 0 })); modes.append(button);
      }
      dialog.append(modes);
      const link = el('input', 'party-link'); link.readOnly = true; link.value = this.inviteUrl();link.placeholder='Avvia il tunnel Cloudflare per generare il link pubblico'; link.setAttribute('aria-label', 'Link invito al party'); link.addEventListener('click', () => link.select()); dialog.append(link);
    }
    if(state?.visitors?.length)dialog.append(el('p','party-preview-note','Visitatori nel rifugio: '+state.visitors.map(v=>v.name).join(', ')+'. Avvicinati e premi E per invitarli nel party.'));
    dialog.append(el('p', 'party-preview-note', this.note || (state ? 'Il mondo continua anche se apri il menu o cambi scheda. Uscire dal party abbandona il combattimento. I progressi restano in questo browser.' : 'Crea un party e condividi il link con i tuoi amici.')));
    const actions = el('div', 'party-lobby-actions');
    const prepare = el('button', 'secondary party-prepare', state ? 'Esci dal party' : this.client.connecting ? 'Connessione…' : 'Crea party');
    prepare.disabled = !this.character || this.client.connecting;
    prepare.addEventListener('click', () => { this.note = ''; if (state) this.client.leave(); else if (this.character) this.client.connect(this.character,undefined,this.profileId??'default'); }); actions.append(prepare);
    if (state) {
      const me = state.members.find(m => m.id === this.client.playerId);
      const ready = el('button', 'secondary party-ready', me?.ready ? 'Non sono pronto' : 'Sono pronto'); ready.disabled = state.playing||!me;
      ready.addEventListener('click', () => this.client.send({ type: 'ready', ready: !me?.ready })); actions.append(ready);
      const invite = el('button', 'secondary party-invite', 'Copia invito'); invite.disabled=!this.inviteUrl();invite.addEventListener('click', () => {
        void navigator.clipboard.writeText(this.inviteUrl()).then(() => { this.note = 'Link copiato.'; this.renderDialog(); }).catch(() => { this.note = 'Seleziona e copia il link qui sopra.'; this.renderDialog(); });
      }); actions.append(invite);
      if (leader) {
        const startLabel = state.mode === 'duel' ? 'Avvia il duello →' : state.mode === 'pilgrimage' ? 'Avvia il Pellegrinaggio →' : 'Avvia la discesa →';
        const start = el('button', 'primary party-start', startLabel); start.disabled = state.playing || state.members.some(m => !m.ready);
        start.addEventListener('click', () => this.client.send({ type: 'start' })); actions.append(start);
      }
    }
    dialog.append(actions);
  }
  private inviteUrl(): string { const base=publicInviteBase(this.client.inviteBase)||publicInviteBase(location.href);if(!base)return '';const url = new URL(base);url.searchParams.set('party', this.client.state!.code); return url.href; }
}
