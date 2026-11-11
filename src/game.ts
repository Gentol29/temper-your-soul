import { setCharacterCommandSink } from './features/ui/character-actions';
import {accountToken} from './features/network/account-session';
import { AccountGate } from './features/ui/account-gate';
import type { AccessStage } from './features/ui/access-model';
import { BACKPACK_SPRITE } from './features/presentation/item-sprites';
import { GOLD_COIN_SPRITE } from './features/presentation/currency-sprites';
import { renderPixelIcon } from './features/ui/pixel-icon';
import { HubScreen } from './features/ui/hub-screen';
import { playerProfile } from './features/ui/player-profile';
import { hideItemTooltip } from './features/ui/item-slot';
import { renderCharacterCreation } from './features/ui/character-creation';
import { PROGRESSION, levelProgress } from './features/character/progression';
import { Camera, ZOOM } from './core/camera';
import { Input, SKILL_ACTIONS } from './core/input';
import { NetworkView } from './features/presentation/network-view';
import { PerformancePanel } from './features/ui/performance-panel';
import { SeededRng } from './core/rng';
import { Vec2 } from './core/vec2';
import { AudioPlayer } from './features/audio/audio-player';
import { Character } from './features/character/character';
import { CharacterRoster, deserializeRoster } from './features/character/character-roster';
import { applyAccountProfile } from './features/network/account-roster';
import { renderCharacterProfiles } from './features/ui/character-profiles';
import { browserStorage, rosterFromExternalSave, SaveStore, type LoadStatus } from './features/character/save-store';
import { CRYPT } from './features/dungeons/crypt';
import type { DungeonDefinition } from './features/dungeons/dungeon-definition';
import { canEnterDungeon, minimumDungeonGearScore } from './features/dungeons/dungeon-access';
import { lootTableFor } from './features/loot/loot-tables';
import { rollLoot } from './features/loot/roll-loot';
import { Match, type PlayerIntent } from './features/match/match';
import { BOSS_SHEETS } from './features/presentation/boss-art';
import { preloadSheets } from './features/presentation/boss-art/sheet-images';
import { preloadScenery } from './features/presentation/themes/scenery';
import { preloadTiles } from './features/presentation/themes/tiles';
import { preloadFonts } from './features/presentation/fonts';
import { Effects } from './features/presentation/effects';
import { ActorPoses } from './features/presentation/poses';
import { renderScene, type RoomLayer, type Scene } from './features/presentation/scene-renderer';
import { drawRoomFloor, drawRoomFront, drawRoomIndicators, drawRoomLabels, drawRoomPickups, type RoomLook } from './features/presentation/draw-room';
import { RoomMinimap } from './features/ui/room-minimap';
import { RoomMood } from './features/presentation/room-mood';
import { DescentMapOverlay } from './features/ui/descent-map';
import { DungeonSelect, pilgrimageGearScore } from './features/ui/dungeon-select';
import { requireElement } from './features/ui/dom';
import { FullscreenToggle } from './features/ui/fullscreen';
import { Hud } from './features/ui/hud';
import { SettingsPanel } from './features/settings/settings-panel';
import { InventoryScreen } from './features/ui/inventory-screen';
import { renderDefeat, renderDescentDefeat, renderDescentVictory, renderVictory } from './features/ui/end-screen';
import { PhaseBanner } from './features/ui/phase-banner';
import { CombatTally } from './features/match/combat-tally';
import { MainMenu, type MenuCharacter } from './features/ui/main-menu';
import { connectionLabel, type MenuActionId } from './features/ui/menu-model';
import { MenuScene } from './features/presentation/menu-scene';
import { CLASS_LABELS } from './features/character/character-class';
import { pixelSvg } from './features/ui/character-portrait';
import { characterPixels } from './features/presentation/character-art';
import { AdminMenu } from './features/ui/admin-menu';
import { RARITY_STATS } from './features/items/rarity';
import { ADMIN_TOOLS_ENABLED, grantClassItems, unlockBestiary } from './features/admin/admin-tools';
import { Overlay } from './features/ui/overlay';
import { Screens } from './features/ui/screens';
import { PartyPanel } from './features/ui/party-panel';
import { applySnapshot, replicaMatch, type BattleSnapshot, type PartyMember } from './features/network/protocol';
import { deserializeCharacter } from './features/character/save-format';
import { DUNGEONS, dungeonById } from './features/dungeons/dungeons';
import type { Item, ItemRoll } from './features/items/item';
import { DescentRun, type RunMode, type RunView } from './features/run/descent';
import { showsVeins, veinName, veinUnlocks } from './features/run/veins';
import type { RoomView } from './features/run/encounter';
import type { DoorOption } from './features/run/rooms';
import { DescentHud } from './features/ui/descent-hud';
import { BestiaryScreen } from './features/ui/bestiary-screen';
import type { AudioScreen } from './features/audio/audio-director';

/** Passo fisso della simulazione: la logica gira a 60 Hz qualunque sia la frequenza di disegno. */
const STEP = 1 / 60;
const NETWORK_HUB_INPUT=1000/30;
/** Tempo massimo simulato in un singolo fotogramma: dopo una pausa (scheda in background) non si recupera tutto. */
const MAX_FRAME_TIME = 0.25;
/** Secondi di pausa drammatica al passaggio in fase II (solo in partita singola: in cooperativa il server non si ferma). */
const PHASE_INTERLUDE = 1.6;
/** Secondi fra la fine dell'incontro e la sua schermata: il tempo di vedere il boss frantumarsi o la propria caduta. */
const END_DELAY = { won: 1.7, lost: 1.3 } as const;
/** Secondi del passaggio da una stanza all'altra (dissolvenza in nero). */
const ROOM_FADE = 0.45;
/** Per quanti millisecondi resta visibile un avviso. */
const TOAST_MS = 6000;
const GEAR_SCORE_NOTICE_MS = 2000;

/**
 * Schermata corrente dell'applicazione. Le prime sono fuori dalla partita (mostrano lo sfondo di un dungeon);
 * la partita avanza solo in `playing`.
 */
type Screen = 'login' | 'hub' | 'menu' | 'characters' | 'dungeons' | 'inventory' | 'bestiary' | 'playing' | 'paused' | 'ended';

const IDLE_SCREENS: readonly Screen[] = ['login', 'hub', 'menu', 'characters', 'dungeons', 'inventory', 'bestiary'];
/** Le schermate che hanno il rifugio dipinto come sfondo. */
const REFUGE_SCREENS: readonly Screen[] = ['login', 'menu', 'characters'];

/** Come si entra in un dungeon: il Duello di sempre, la Discesa, il Pellegrinaggio. */
type Mode = 'duel' | RunMode;

const LOAD_NOTES: Record<LoadStatus, string> = {
  fresh: 'Nuovo personaggio: i progressi si salvano in questo browser.',
  loaded: 'Progressi caricati dal salvataggio locale di questo browser.',
  recovered: 'Il salvataggio era illeggibile: ne ho conservato una copia e riparti da un personaggio nuovo.',
};

/**
 * Applicazione: collega canvas, input, interfaccia, audio, salvataggio e rappresentazione alla partita, e fa girare
 * il ciclo (simulazione a passo fisso, disegno a ogni fotogramma). Non contiene regole di gioco.
 */
export class Game {
  private readonly input = new Input();
  private readonly hub: HubScreen;
  private profileDialog: HTMLDialogElement | null = null;
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly poses = new ActorPoses();
  private readonly audio: AudioPlayer;
  private readonly settingsPanel: SettingsPanel;
  private readonly hud = new Hud(this.input.bindings);
  private readonly descentHud = new DescentHud();
  private readonly minimap = new RoomMinimap();
  private readonly descentMap = new DescentMapOverlay();
  /** Grate che calano e salgono, luce che si scalda, tappe piu' cupe: solo disegno. */
  private readonly roomMood = new RoomMood();
  private readonly performancePanel = new PerformancePanel();
  private readonly overlay = new Overlay();
  private readonly tally = new CombatTally();
  /** Statistiche di tutta la discesa (la `tally` riparte a ogni stanza). */
  private readonly runTally = new CombatTally();
  private readonly phaseBanner = new PhaseBanner();
  /** Secondi di pausa drammatica rimasti (fase II in partita singola): intanto la simulazione aspetta. */
  private interlude = 0;
  /** Schermata di fine incontro in attesa: prima si guarda la morte del boss (o la propria), poi il resoconto. */
  private pendingEnd: { remaining: number; show: () => void } | null = null;
  /** Passaggio alla stanza successiva: dissolvenza, poi `enter`. */
  private pendingRoom: { remaining: number; enter: () => void } | null = null;
  private readonly screens = new Screens();
  private readonly party = new PartyPanel(() => { this.settingsPanel?.close(); this.input.releaseAll(); }, snapshot => this.receiveSnapshot(snapshot), () => {
    const hadAccount=Boolean(this.offlineRoster);
    setCharacterCommandSink(null);if(this.offlineRoster){this.roster=this.offlineRoster;this.offlineRoster=null;}
    if(hadAccount)this.menu?.setSave({text:'Salvataggio locale',detail:'Profili locali conservati in questo browser.',tone:'ok'});
    if (this.networkBattleId) { this.networkBattleId = ''; this.showToast('Hai lasciato il combattimento cooperativo.'); this.showMenu(); }
    else if(hadAccount)this.showMenu();
  });
  private networkBattleId = '';
  private hubSession='';
  private dismissedNetworkRun='';
  private lastPresence:boolean|null=null;
  private lastHubInput=0;
  private networkView: NetworkView | null = null;
  /** Numero della discesa in singolo: una discesa nuova nella stessa stanza modello rifa' calare la grata. */
  private runSerial = 0;
  private readonly completedBattles = new Set<string>();
  private battleMembers: PartyMember[] = [];
  private readonly allyPoses = new Map<string, ActorPoses>();
  private allyVisuals: Scene['allies'] = [];
  private renderAppearance: Scene['appearance'];
  private readonly fullscreen: FullscreenToggle;
  private readonly menu: MainMenu;
  private readonly menuScene = new MenuScene(requireElement<HTMLCanvasElement>('menu-scene'));
  /** Da dove si e' arrivati a dungeon e inventario: chiudendoli si torna li'. */
  private returnTo: 'menu' | 'hub' = 'hub';
  private connectionLost = false;
  private wasOnline = false;
  private readonly adminMenu: AdminMenu;
  private readonly dungeonSelect: DungeonSelect;
  private readonly inventoryScreen: InventoryScreen;
  private readonly bestiaryScreen: BestiaryScreen;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly saveStore: SaveStore;

  private roster:CharacterRoster;
  private offlineRoster:CharacterRoster|null=null;
  private draft:Character|null=null;
  private get character():Character {return this.draft??this.roster.active?.character??this.newDraft();}
  private newDraft():Character {this.draft=Character.createStarter();return this.draft;}
  private updateParty():void {
    this.party.update(this.character);
  }
  /** Prima l'account, poi il personaggio, poi il rifugio: la porta decide la tappa, `Game` mostra la schermata. */
  private readonly gate = new AccountGate(this.party.client, stage => this.onAccessStage(stage));
  private readonly loadStatus: LoadStatus;
  private dungeon: DungeonDefinition = CRYPT;
  private match: Match;
  private screen: Screen = 'menu';
  private accumulator = 0;
  private lastTime = 0;
  private clock = 0;
  private toastTimer: number | undefined;
  private saveWarningShown = false;

  /** Modalità di ingresso; il grado storico resta fisso a zero. */
  private mode: Mode = 'descent';
  private grade = 0;
  /** La discesa in corso (partita singola). */
  private run: DescentRun | null = null;
  /** Quanto della discesa e' gia' passato nel personaggio salvato. */
  private runSaved = { gold: 0, embers: 0, xp: 0, kills: {} as Record<string, number> };
  /** Oggetti vinti nei boss della discesa (il Pellegrinaggio ne ha piu' d'uno). */
  private runItems: Item[] = [];
  /** XP del personaggio all'inizio della discesa (per la barra della schermata finale). */
  private runXpStart = 0;
  /** Cooperativa: la discesa e la stanza ricevute dal server, e quanto ne e' gia' stato salvato. */
  private networkRun: RunView | null = null;
  private networkRoom: RoomView | null = null;
  private networkRunId = '';
  private networkSaved = { gold: 0, embers: 0, xp: 0, kills: {} as Record<string, number>, items: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Canvas 2D non disponibile in questo browser');
    this.ctx = ctx;
    this.fullscreen = new FullscreenToggle(() => this.resize());
    // I fogli dei boss (circa 110 KB) si caricano subito: il boss entra gia' con la sua grafica.
    preloadSheets(Object.values(BOSS_SHEETS).map((sheet) => sheet.layout.url));
    preloadTiles();
    preloadScenery();
    preloadFonts();

    const storage = browserStorage();
    this.saveStore = new SaveStore(storage);
    this.audio = new AudioPlayer(storage);
    this.settingsPanel = new SettingsPanel(this.audio, this.input, storage, {
      onOpen: () => { this.party.close(); this.pauseIfPlaying(); },
      onFullscreen: () => void this.fullscreen.toggle(),
      onPerformance: () => this.performancePanel.toggle(),
    });
    const loaded = this.saveStore.loadRoster();
    this.roster=loaded.roster;
    this.loadStatus = loaded.status;
    this.party.client.profileChanged=profile=>{
      if(!this.offlineRoster){this.offlineRoster=this.roster;this.roster=new CharacterRoster();}
      if(!applyAccountProfile(this.roster,profile))return;
      this.draft=null;this.roster.gold=profile.gold;this.renderAppearance=undefined;
      setCharacterCommandSink(command=>{if(!this.party.client.tradeSaving)this.party.client.send({type:'character_command',command});});
      this.hub?.refreshProfile();
      if(this.screen==='inventory')this.inventoryScreen.render(this.character);
      this.menu.setSave({text:'Salvato sul server',detail:'Profilo persistente del tuo account.',tone:'ok'});
    };

    this.hub = new HubScreen({portal:()=>this.openDungeons('hub'),save:()=>{this.persist();},inventory:()=>this.openInventory('hub'),menu:()=>this.showMenu()});
    this.menu = new MainMenu({
      onAction: (id) => this.onMenuAction(id),
      onBlocked: (reason) => this.showToast(reason, 2600),
      onSceneFocus: (scene) => { this.menuScene.focus = scene; },
    });
    // La pagina del personaggio si apre solo per crearlo, dopo l'accesso: da li' si puo' soltanto uscire dall'account.
    requireElement('characters-back').addEventListener('click', () => { if (this.gate.isOffline) this.showMenu(); else this.gate.logout(); });
    requireElement('login-settings').addEventListener('click', () => this.settingsPanel.open());
    // Nel menu il riquadro del party non si vede: il motivo di un errore arriva con un avviso; all'accesso lo mostra la porta.
    this.party.onProblem = (message) => { this.gate.problem(message); if (this.screen === 'menu' || this.screen === 'characters') this.showToast(message); };
    this.party.onChanged = () => this.gate.sync();
    // Dentro i campi di testo l'Input ignora i tasti: anche li' ESC torna al menu.
    requireElement('screen-characters').addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && event.target instanceof HTMLInputElement) { event.preventDefault(); this.showMenu(); }
    });
    requireElement('party-panel').addEventListener('keydown',event=>{if(event.code==='Escape'&&(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)){event.preventDefault();this.party.close();this.showMenu();}});
    this.adminMenu = new AdminMenu(ADMIN_TOOLS_ENABLED, {
      onGrantItems: (rarity) => {
        const added = grantClassItems(this.character, rarity);
        if (added.length > 0) { this.inventoryScreen.reset(); this.persist(); }
        this.showToast(added.length > 0 ? `Admin: ${added.length} oggetti ${RARITY_STATS[rarity].label.toLowerCase()} aggiunti allo zaino.` : 'Admin: hai già tutti gli oggetti della classe a questa rarità.');
      },
      onUnlockBestiary: () => {
        const opened = unlockBestiary(this.character);
        if (opened > 0) this.persist();
        this.showToast(opened > 0 ? `Admin: ${opened} pagine del bestiario aperte.` : 'Admin: il bestiario è già tutto aperto.');
      },
    });
    this.dungeonSelect = new DungeonSelect({
      onDescent: (dungeon, grade) => this.startDungeon(dungeon, 'descent', grade),
      onDuel: (dungeon) => this.startDungeon(dungeon, 'duel', 0),
      onPilgrimage: () => this.startDungeon(DUNGEONS[0]!, 'pilgrimage', 0),
      onPreview: (dungeon) => this.preview(dungeon),
      onBestiary: (dungeon) => this.openBestiary(dungeon),
      onInsufficientGearScore: (minimum) => this.showToast(`Punteggio gear score non sufficiente, gear score richiesto ${minimum}.`, GEAR_SCORE_NOTICE_MS, true),
      onBack: () => this.leavePlace(),
    });
    this.inventoryScreen = new InventoryScreen({ onChange: () => this.persist(), onBack: () => this.leavePlace() }, this.input.bindings);
    this.bestiaryScreen = new BestiaryScreen({ onBack: () => this.openDungeons() });
    this.match = this.createMatch(this.dungeon);
    const problem = storage === null || this.loadStatus === 'recovered';
    this.menu.setSave({
      text: storage === null ? 'Salvataggio non disponibile' : this.loadStatus === 'recovered' ? 'Salvataggio illeggibile, copia conservata' : 'Salvataggio locale',
      detail: storage === null ? 'Salvataggio locale non disponibile: i progressi non verranno conservati.' : LOAD_NOTES[this.loadStatus],
      tone: problem ? 'bad' : 'ok',
    });
    if (problem) this.showToast(storage === null ? 'Salvataggio locale non disponibile: i progressi non verranno conservati.' : LOAD_NOTES.recovered);
  }

  start(): void {
    this.input.attach(this.canvas);
    this.input.actionPressed.connect((action) => {
      if (action === 'interact' && this.screen === 'hub') this.hub.interact();
      else if (action === 'pause') this.onEscape();
      else if (action === 'restart') this.restartIfInGame();
      else if (action === 'toggle_audio') this.toggleAudio();
      else if (action === 'toggle_performance') this.performancePanel.toggle();
      else if (action === 'toggle_minimap') this.minimap.toggle();
      else if (action === 'toggle_fullscreen') void this.fullscreen.toggle();
    });
    const profileButton=document.createElement('button');profileButton.id='player-profile-button';profileButton.className='relic-button secondary';profileButton.title='Personaggio e zaino';profileButton.setAttribute('aria-label','Personaggio e zaino');profileButton.append(renderPixelIcon(BACKPACK_SPRITE));profileButton.onclick=()=>this.openPlayerProfile();requireElement('global-controls').prepend(profileButton);
    requireElement('global-controls').insertBefore(requireElement('party-toggle'),requireElement('settings-button'));
    requireElement('global-wallet').prepend(renderPixelIcon(GOLD_COIN_SPRITE));
    // L'hub è un fratello di main: anche i controlli globali devono stare fuori dal suo stacking context.
    document.body.append(requireElement('global-wallet'),requireElement('global-controls'),requireElement('party-panel'),requireElement('settings-panel'));
    const menuButton=document.createElement('button');menuButton.className='relic-button secondary';menuButton.textContent='Menu principale';menuButton.onclick=()=>{this.settingsPanel.close();this.showMenu();};requireElement('settings-panel').append(menuButton);
    requireElement('pause-button').addEventListener('click', () => this.togglePause());
    requireElement('main-menu-button').addEventListener('click',()=>this.showMenu());
    this.overlay.onButtons(
      () => (this.screen === 'paused' ? this.togglePause() : this.startMatch()),
      () => this.showMenu(),
    );
    window.addEventListener('storage', (event) => this.adoptExternalSave(event.key, event.newValue));
    window.addEventListener('blur', () => this.pauseIfPlaying());
    // Il browser avvia l'audio solo dopo un gesto: ogni clic o tasto lo sblocca (le chiamate successive non costano).
    window.addEventListener('pointerdown', () => this.audio.unlock());
    window.addEventListener('keydown', () => this.audio.unlock());
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('button') !== null) this.audio.play('ui_click');
    });
    this.audio.changed.connect((settings) => this.showAudioState(settings.enabled));
    this.showAudioState(this.audio.enabled);
    document.addEventListener('visibilitychange', () => {
      this.audio.setHidden(document.hidden);
      if (document.hidden) this.pauseIfPlaying();
    });
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? this.canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // La prima schermata e' l'accesso: il menu e il rifugio arrivano dopo account e personaggio.
    this.gate.start();
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.frame(time));
    // Il riquadro di caricamento resta finche' i caratteri sono pronti, ma non blocca mai il gioco.
    const fontsReady = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    void Promise.race([fontsReady, new Promise((resolve) => window.setTimeout(resolve, 2500))]).then(() => requireElement('system-loading').classList.add('hidden'));
  }

  // --- Navigazione tra le schermate ------------------------------------------------------------------------------

  /** Chiude finestre, rifugio e incontro in corso: da qui si mostra il menu oppure l'accesso. */
  private leaveGame(): void {
    this.party.close();this.settingsPanel.close();
    if(this.party.client.state)this.party.client.send({type:'hub_input',move:{x:0,y:0}});
    this.hub.hide();
    this.profileDialog?.close();
    if(this.networkBattleId){this.dismissedNetworkRun=this.networkBattleId.split(':')[0]!;this.party.client.returnToHub();}
    this.networkBattleId = '';
    this.networkRun = null;
    this.networkRoom = null;
    this.networkRunId = '';
    this.abandonRun();
    this.input.releaseAll();
    this.clearBattleFeedback();
    this.overlay.hide();
  }

  /** Il mondo si apre da solo al primo stato ricevuto (vedi `frame`); le altre tappe hanno la loro schermata. */
  private onAccessStage(stage: AccessStage): void {
    if (stage !== 'world') this.showAccess(stage);
    else if (this.gate.isOffline) this.showMenu();
  }

  /** Accesso all'account, poi creazione del personaggio: le due tappe che precedono il rifugio. */
  private showAccess(stage: Exclude<AccessStage, 'world'>): void {
    const screen = stage === 'creation' ? 'characters' : 'login';
    // Gia' sulla schermata giusta: non si ridisegna, cosi' il testo che si sta scrivendo resta.
    if (this.screen === screen) return;
    this.leaveGame();
    this.screen = screen;
    this.screens.show(screen);
    this.preview(this.dungeon);
    if (stage === 'creation') {
      // Soltanto la raccolta dell'account verificato, mai i profili locali del browser.
      const roster=deserializeRoster(this.party.client.characterRoster??'');
      if(!roster){this.showToast('Raccolta dei personaggi non valida. Riprova l’accesso.');this.gate.logout();return;}
      if(!this.offlineRoster)this.offlineRoster=this.roster;
      this.roster=roster;this.draft=null;
      if(!roster.profiles.length)this.newDraft();
      this.inventoryScreen.reset();
      this.renderCharacters();
      requireElement('characters-title').focus();
    } else {
      this.draft = null;
      if(!accountToken()&&this.offlineRoster){this.roster=this.offlineRoster;this.offlineRoster=null;}
      requireElement('login-title').focus();
      this.gate.sync();
    }
  }

  private showMenu(): void {
    // Il menu esiste solo con account e personaggio: prima vengono l'accesso e la creazione.
    const stage = this.gate.stage;
    if (stage !== 'world') { this.showAccess(stage); return; }
    this.leaveGame();
    this.screen = 'menu';
    // Tornando al menu una creazione lasciata a meta' si annulla, se c'e' gia' un personaggio a cui tornare.
    if (this.draft !== null && this.roster.active) this.draft = null;
    this.screens.show('menu');
    this.preview(this.dungeon);
    const character = this.character;
    const progress = levelProgress(character.totalXp);
    const summary: MenuCharacter | null = character.created
      ? { name: character.name!, className: CLASS_LABELS[character.characterClass!], level: progress.level, gold: this.roster.gold, gearScore: character.gearScore, levelProgress: progress.current / progress.required, figure: pixelSvg(characterPixels(character.appearance(), 'game')) }
      : null;
    this.menu.render(summary, { characterName: summary?.name ?? null, incomplete: this.draft === null && !character.created,authenticated:Boolean(accountToken())||this.gate.isOffline });
  }

  private onMenuAction(id: MenuActionId): void {
    switch (id) {
      case 'continue': if (this.character.created) this.openHub(true); else this.openCharacters(); break;
      case 'settings': this.settingsPanel.open(); break;
      case 'characters': this.openCharacters(); break;
      // La sessione chiusa riporta da sola alla schermata di accesso.
      case 'logout': if (this.gate.isOffline) this.gate.leaveOffline(); else this.gate.logout(); break;
    }
  }

  private openCharacters(): void {
    if(this.networkBattleId){this.showToast('Torna nel rifugio prima di cambiare personaggio.');return;}
    if(!this.gate.isOffline){this.gate.chooseCharacters();return;}
    // Offline: i profili locali del browser, creati e scelti senza server.
    this.leaveGame();this.screen='characters';this.screens.show('characters');
    if(!this.roster.profiles.length&&!this.draft)this.newDraft();
    this.inventoryScreen.reset();this.renderCharacters();requireElement('characters-title').focus();
  }

  private renderCharacters(): void {
    const character=this.character;
    requireElement('characters-title').textContent=this.draft?'Crea il tuo personaggio':'Scegli il personaggio';
    const offline=this.gate.isOffline;
    requireElement('menu-profiles').replaceChildren(...(offline?[]:[this.gate.creationNote(this.roster.gold)]),renderCharacterProfiles(this.roster,this.draft!==null,{
      onNew:()=>{this.newDraft();this.renderCharacters();},
      onCancel:()=>{this.draft=null;this.renderCharacters();},
      onSelect:id=>{if(this.roster.select(id)){this.draft=null;this.renderCharacters();}},
    }));
    requireElement('menu-appearance').replaceChildren(renderCharacterCreation(character,{
      // L'account e' gia' verificato: il personaggio nasce sul server, che poi apre il rifugio.
      onCreate:(name,body,kind)=>{
        if(!offline){this.gate.createCharacter({name,characterClass:kind,body});return;}
        if(!character.completeCreation(name,body,kind))return;
        if(this.draft===character){this.roster.add(character);this.draft=null;}
        this.persist();this.showMenu();
      },
      onContinue:()=>{if(offline)this.openHub(true);else if(this.roster.activeId)this.gate.selectCharacter(this.roster.activeId);},
    }));
    this.adminMenu.setAvailable(false);
  }

  /** Chiude dungeon o inventario tornando da dove si era partiti. */
  private leavePlace(): void {
    if (this.returnTo === 'menu') this.showMenu();
    else this.openHub();
  }

  private openHub(arrive = false): void {
    if(!this.party.client.profile&&!this.gate.isOffline){this.showMenu();return;}
    if(!this.character.created){this.showMenu();return;}
    if(this.networkBattleId){this.dismissedNetworkRun=this.networkBattleId.split(':')[0]!;this.party.client.returnToHub();}
    this.abandonRun();this.networkBattleId='';this.networkRun=null;this.networkRoom=null;
    this.screen='hub';this.input.releaseAll();this.clearBattleFeedback();this.overlay.hide();this.screens.show(null);
    document.body.classList.add('in-menu');this.hub.show(this.character,this.roster,arrive,this.clock);this.updateParty();
  }

  private openPlayerProfile(): void {
    if(!this.character.created || this.profileDialog)return;
    if(this.screen==='hub'){this.hub.openProfile();return;}
    const resume=this.screen==='playing'&&!this.networkBattleId;
    if(resume)this.togglePause();this.input.releaseAll();this.input.suspended=true;
    const dialog=document.createElement('dialog');dialog.className='profile-modal menu-card';dialog.setAttribute('aria-label','Profilo del personaggio');
    const close=document.createElement('button');close.textContent='Chiudi · ESC';close.onclick=()=>dialog.close();
    dialog.append(close,playerProfile(this.character,this.roster.gold));
    dialog.addEventListener('close',()=>{hideItemTooltip();dialog.remove();this.profileDialog=null;this.input.suspended=false;this.input.releaseAll();if(resume&&this.screen==='paused')this.togglePause();});
    document.body.append(dialog);this.profileDialog=dialog;dialog.showModal();
  }

  private openDungeons(from?: 'menu' | 'hub'): void {
    this.hub.hide();
    if(!this.character.created) return;
    if (from !== undefined) this.returnTo = from;
    this.screen = 'dungeons';
    this.screens.show('dungeons');
    this.dungeonSelect.render(this.character);
    this.updateParty();
  }

  private openInventory(from?: 'menu' | 'hub'): void {
    this.hub.hide();
    if(!this.character.created)return;
    if (from !== undefined) this.returnTo = from;
    this.screen = 'inventory';
    this.clearBattleFeedback();
    this.overlay.hide();
    this.screens.show('inventory');
    // Si riapre da capo: uno scarto chiesto prima di uscire (anche con ESC) non resta in attesa di conferma.
    this.inventoryScreen.reset();
    this.inventoryScreen.render(this.character);
    this.updateParty();
  }

  private openBestiary(dungeon: DungeonDefinition): void {
    if (!this.character.created) return;
    this.screen = 'bestiary';
    this.screens.show('bestiary');
    this.bestiaryScreen.render(this.character, dungeon.id);
  }

  /** Sfondo delle schermate fuori dalla partita: la mappa e il boss del dungeon indicato, fermi. */
  private preview(dungeon: DungeonDefinition): void {
    this.networkView = null;
    this.renderAppearance = undefined; this.allyVisuals = [];
    this.dungeon = dungeon;
    this.match = this.createMatch(dungeon);
    this.effects.clear();
    this.poses.reset();
    this.recenter();
    this.updateParty();
  }

  private startDungeon(dungeon: DungeonDefinition, mode: Mode, _grade: number): void {
    if (this.party.client.state&&this.party.client.profile) {
      this.party.client.send({type:'portal_start',dungeonId:dungeon.id,mode});this.party.close();return;
    }
    this.dungeon = dungeon;
    this.mode = mode;
    this.grade = 0;
    this.startMatch();
  }

  /** Nuova partita nel dungeon corrente: il Duello con il boss, oppure una Discesa (o un Pellegrinaggio) da capo. */
  private startMatch(): void {
    this.hub.hide();
    if(this.party.client.state&&this.party.client.profile){this.startDungeon(this.dungeon,this.mode,0);return;}
    this.networkBattleId = '';this.networkView=null;this.allyPoses.clear();
    this.renderAppearance = undefined; this.allyVisuals = [];
    if(!this.character.created)return;
    if (this.mode === 'pilgrimage') {
      const minimum = pilgrimageGearScore();
      if (this.character.gearScore < minimum) { this.showToast(`Servono almeno ${minimum} GS equipaggiati per il Pellegrinaggio.`); return; }
    } else if(!canEnterDungeon(this.dungeon,this.character.gearScore)){
      this.showToast(`Servono almeno ${minimumDungeonGearScore(this.dungeon)} GS equipaggiati per questo dungeon.`);return;
    }
    if (this.mode === 'duel' && !this.character.canDuel(this.dungeon.id)) {
      this.showToast('Il Duello si apre dopo aver sconfitto il boss in una discesa.'); return;
    }
    this.abandonRun();
    this.runTally.reset('local');
    if (this.mode === 'duel') {
      this.descentHud.hide();
      this.enterMatch(this.createMatch(this.dungeon));
      return;
    }
    this.runSerial++;
    this.run = new DescentRun({
      mode: this.mode,
      dungeonId: this.mode === 'pilgrimage' ? DUNGEONS[0]!.id : this.dungeon.id,
      members: [{ id: 'local', loadout: this.character.loadout(), totalXp: this.character.totalXp, characterClass: this.character.characterClass }],
      seed: Math.floor(Math.random() * 0x100000000),
      grade: this.grade,
      veins: veinUnlocks(this.character, this.mode === 'pilgrimage' ? DUNGEONS.map((dungeon) => dungeon.id) : [this.dungeon.id]),
    });
    this.runSaved = { gold: 0, embers: 0, xp: 0, kills: {} };
    this.runItems = [];
    this.runXpStart = this.character.totalXp;
    this.enterRoom();
  }

  /** Mette in scena una partita (il duello o una stanza della discesa). */
  private enterMatch(match: Match): void {
    this.match = match;
    this.effects.clear();
    this.poses.reset();
    this.input.releaseAll();
    this.clearBattleFeedback();
    this.tally.reset('local');
    this.hud.resetBars();
    this.screen = 'playing';
    this.screens.show(null);
    this.overlay.hide();
    this.hud.buildSkills(this.match.player.skillBar.skills);
    this.hud.setBossName(this.match.boss?.definition.name ?? '');
    this.recenter();
    this.hud.update(this.match, levelProgress(this.character.totalXp));
    this.canvas.focus();
    this.updateParty();
  }

  /** Entra nella stanza attuale della discesa. */
  private enterRoom(): void {
    const run = this.run;
    if (run === null) return;
    this.dungeon = run.dungeon;
    this.attach(run.match);
    this.enterMatch(run.match);
    this.descentHud.announce(run.view(), run.roomView());
  }

  private restartIfInGame(): void {
    if (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'ended') this.startMatch();
  }

  private onEscape(): void {
    if(this.profileDialog){this.profileDialog.close();return;}
    if(this.party.isOpen){this.party.close();return;}
    if(this.settingsPanel.isOpen){this.settingsPanel.close();return;}
    if(this.screen==='hub'){if(!this.hub.closeDialog())this.showMenu();return;}
    if(this.screen!=='menu')this.showMenu();
  }

  /** Una partita del duello (o lo sfondo dei menu), con i suoi ascoltatori. */
  private createMatch(dungeon: DungeonDefinition): Match {
    const match = new Match({
      rng: new SeededRng(Math.floor(Math.random() * 0x100000000)),
      dungeon,
      loadout: this.character.loadout(), totalXp: this.character.totalXp, characterClass: this.character.characterClass,
    });
    this.attach(match);
    return match;
  }

  /** Effetti, pose, audio, interfaccia e statistiche ascoltano gli eventi della partita. */
  private attach(match: Match): void {
    match.events.connect((event) => {
      this.effects.handle(event);
      this.poses.handle(event);
      this.audio.handle(event);
      this.hud.onEvent(event);
      this.tally.handle(event);
      this.runTally.handle(event);
      if (event.type === 'boss_phase_changed') this.onPhaseChanged(event.text, true);
      if (event.type === 'match_ended') {
        if (this.run !== null && match === this.run.match) this.onRoomEnded(match, event.won);
        else this.onMatchEnded(match, event.won);
      }
    });
  }

  // --- Discesa: stanze, premi, fine ------------------------------------------------------------------------------

  /** Una stanza della discesa e' finita: porta attraversata, boss caduto o tutti a terra. */
  private onRoomEnded(match: Match, won: boolean): void {
    const run = this.run;
    if (run === null) return;
    const bossRoom = run.atBoss;
    if (won && bossRoom) this.onDescentBoss(match, run);
    run.advance();
    this.saveRunProgress();
    if (run.status === 'playing') {
      // Nuova stanza: un attimo di buio (piu' lungo dopo un boss del Pellegrinaggio, per vederlo cadere).
      this.pendingRoom = { remaining: bossRoom ? END_DELAY.won : ROOM_FADE, enter: () => this.enterRoom() };
      if (!bossRoom) document.body.classList.add('room-fading');
      return;
    }
    this.finishRun(run);
  }

  /** Il boss della discesa e' caduto: bottino e record del boss, salvati subito. */
  private onDescentBoss(match: Match, run: DescentRun): void {
    const rolls = run.rollBossLoot(new SeededRng(Math.floor(Math.random() * 0x100000000))).get('local') ?? [];
    this.runItems.push(...this.character.addRolls(rolls));
    this.character.recordVictory(run.dungeon.id, match.time);
    this.persist();
  }

  /** Porta nel personaggio cio' che la discesa ha dato finora (braci, esperienza, bestiario) e salva. */
  private saveRunProgress(): void {
    this.run?.syncProgress();
    const state = this.run?.players.get('local');
    if (state === undefined) return;
    const embers = state.embers - this.runSaved.embers;
    const xp = state.xp - this.runSaved.xp;
    const kills: Record<string, number> = {};
    for (const [id, count] of Object.entries(state.kills)) {
      const delta = count - (this.runSaved.kills[id] ?? 0);
      if (delta > 0) kills[id] = delta;
    }
    if (state.gold === this.runSaved.gold && embers === 0 && xp === 0 && Object.keys(kills).length === 0) return;
    this.character.totalXp += Math.max(0, xp);
    this.character.addKills(kills);
    this.roster.gold += Math.max(0, state.gold - this.runSaved.gold);
    this.runSaved = { gold: state.gold, embers: state.embers, xp: state.xp, kills: { ...state.kills } };
    this.persist();
  }

  /** La discesa e' finita: record, salvataggio e schermata. */
  private finishRun(run: DescentRun): void {
    const won = run.status === 'won';
    this.saveRunProgress();
    let record = { firstClear: false, newBest: false };
    if (!this.party.client.profile && run.mode === 'pilgrimage') {
      if (won) {
        const best = this.character.pilgrimage.bestTimeSeconds;
        record = { firstClear: this.character.pilgrimage.clears === 0, newBest: best === null || run.seconds < best };
        this.character.pilgrimage = { clears: this.character.pilgrimage.clears + 1, bestTimeSeconds: record.newBest ? run.seconds : best };
      }
      for (const victory of run.victories) this.character.recordDescent(victory.dungeonId, { won: true, seconds: victory.seconds, grade: run.grade, stage: run.plan.stages.length });
    } else {
      record = this.character.recordDescent(run.dungeon.id, { won, seconds: run.seconds, grade: run.grade, stage: run.stage + 1 });
    }
    const saved = this.persist();
    const state = run.players.get('local')!;
    const before = levelProgress(this.runXpStart);
    const after = levelProgress(this.character.totalXp);
    const view = {
      title: won
        ? run.mode === 'pilgrimage' ? 'Pellegrinaggio compiuto · quattro boss' : `Discesa completata · ${titleCase(run.dungeon.boss.name)}`
        : 'La discesa si è interrotta',
      seconds: run.seconds,
      newBest: record.newBest,
      firstClear: record.firstClear,
      stage: run.stage + 1,
      stages: run.plan.stages.length,
      rooms: run.roomsCleared,
      embers: state.embers,
      tempers: state.tempers.length,
      seals: run.victories.at(-1)?.seals ?? run.seals,
      summary: this.runTally.summary(),
      xp: { gained: state.xp, levelBefore: before.level, levelAfter: after.level, before: before.current / before.required, after: after.current / after.required },
      items: this.runItems,
      saved,
      characterClass: this.character.characterClass,
      dropChance: run.lootTable(run.dungeon.id, run.victories.at(-1)?.seals ?? 0).dropChance,
    };
    this.screen = 'ended';
    this.input.releaseAll();
    const extra = won ? renderDescentVictory(view) : renderDescentDefeat({ ...view, onInventory: () => this.openInventory() });
    if (!won) document.body.classList.add('defeated');
    let sounds: Array<'loot' | 'level_up'> = [];
    if (this.runItems.length > 0) sounds.push('loot');
    if (after.level > before.level) sounds.push('level_up');
    const dungeonName = run.mode === 'pilgrimage' ? 'Pellegrinaggio' : run.dungeon.name;
    this.run = null;
    this.pendingEnd = {
      remaining: won ? END_DELAY.won : END_DELAY.lost,
      show: () => {
        this.overlay.showEnded({ won, dungeonName, extra });
        for (const sound of sounds) this.audio.play(sound);
        sounds = [];
        this.descentHud.hide();
      },
    };
    this.updateParty();
  }

  /** Uscire a meta' discesa: cio' che e' stato guadagnato resta, la tappa raggiunta conta. */
  private abandonRun(): void {
    const run = this.run;
    if (run === null) return;
    this.run = null;
    this.pendingRoom = null;
    document.body.classList.remove('room-fading');
    this.descentHud.hide();
    this.descentHud.hideBanner();
    const state = run.players.get('local');
    if (state !== undefined) {
      this.saveRunProgressFrom(run);
      if (run.status === 'playing') {
        if (run.mode === 'descent') this.character.recordDescent(run.dungeon.id, { won: false, seconds: run.seconds, grade: run.grade, stage: run.stage + 1 });
        this.persist();
      }
    }
  }

  private saveRunProgressFrom(run: DescentRun): void {
    const previous = this.run;
    this.run = run;
    this.saveRunProgress();
    this.run = previous;
  }

  // --- Fine partita del duello, bottino e salvataggio -------------------------------------------------------------

  /**
   * Fine dell'incontro. Bottino, esperienza e record si assegnano e si salvano SUBITO (se la pagina si chiude ora non
   * si perde nulla); la schermata arriva dopo `END_DELAY`, il tempo di vedere il colpo finale.
   */
  private onMatchEnded(match: Match, won: boolean, networkRolls?: readonly ItemRoll[]): void {
    this.screen = 'ended';
    this.input.releaseAll();
    this.interlude = 0;
    const summary = this.tally.summary();
    let extra: HTMLElement;
    let sounds: Array<'loot' | 'level_up'> = [];
    if (won) {
      const rolls = networkRolls ?? rollLoot(lootTableFor(match.dungeon.id), new SeededRng(Math.floor(Math.random() * 0x100000000)));
      const items = this.party.client.profile ? (rolls.length ? this.character.inventory.slice(-rolls.length) : []) : this.character.addRolls(rolls);
      const before = levelProgress(this.party.client.profile ? this.runXpStart : this.character.totalXp);
      const gained = PROGRESSION.rewards[match.dungeon.id as keyof typeof PROGRESSION.rewards] ?? 100;
      if(!this.party.client.profile)this.character.totalXp += gained;
      const afterXp = levelProgress(this.character.totalXp);
      const onlineRecord = this.character.recordFor(match.dungeon.id);
      const record = this.party.client.profile ? {firstClear:onlineRecord.clears===1,newBest:onlineRecord.bestTimeSeconds===match.time} : this.character.recordVictory(match.dungeon.id, match.time);
      const saved = this.persist();
      if (items.length > 0) sounds.push('loot');
      if (afterXp.level > before.level) sounds.push('level_up');
      extra = renderVictory({
        bossName: match.boss?.definition.name ?? match.dungeon.boss.name,
        seconds: match.time,
        firstClear: record.firstClear,
        newBest: record.newBest,
        healthLeft: match.player.health.current,
        healthMax: match.player.health.max,
        summary,
        xp: {
          gained,
          levelBefore: before.level,
          levelAfter: afterXp.level,
          before: before.current / before.required,
          after: afterXp.current / afterXp.required,
        },
        items,
        saved,
        characterClass: this.character.characterClass,
      });
    } else {
      extra = renderDefeat({
        bossName: match.boss?.definition.name ?? match.dungeon.boss.name,
        seconds: match.time,
        bossHealth: match.boss?.health.fraction ?? 1,
        summary,
        onInventory: () => this.openInventory(),
      });
      // La scena si spegne (grigia e scura) mentre si aspetta la schermata.
      document.body.classList.add('defeated');
    }
    this.pendingEnd = {
      remaining: won ? END_DELAY.won : END_DELAY.lost,
      show: () => {
        this.overlay.showEnded({ won, dungeonName: match.dungeon.name, extra });
        for (const sound of sounds) this.audio.play(sound);
        sounds = [];
      },
    };
    this.updateParty();
  }

  /** Passaggio alla fase II: stendardo a tutto schermo e, in partita singola, una breve pausa drammatica. */
  private onPhaseChanged(text: string, freeze: boolean): void {
    this.phaseBanner.show(text);
    if (freeze) this.interlude = PHASE_INTERLUDE;
  }

  /** Toglie cio' che resta di un incontro: pausa drammatica, schermata in attesa, stendardo, scena spenta. */
  private clearBattleFeedback(): void {
    this.interlude = 0;
    this.pendingEnd = null;
    this.pendingRoom = null;
    this.phaseBanner.hide();
    document.body.classList.remove('defeated', 'room-fading');
  }

  private receiveSnapshot(snapshot: BattleSnapshot): void {
    const me = this.party.client.playerId;
    if(!this.party.client.isMember||snapshot.id.split(':')[0]===this.dismissedNetworkRun)return;
    if (this.completedBattles.has(snapshot.id) || !snapshot.players.some(p => p.id === me)) return;
    const enteringBattle = snapshot.id !== this.networkBattleId;
    if (enteringBattle) {
      const state = this.party.client.state, dungeon = dungeonById(snapshot.dungeonId);
      if (!state || !dungeon) return;
      this.hub.hide();this.party.close();this.abandonRun();
      // Una discesa: ogni stanza e' un incontro nuovo (`<id>:<stanza>`); la discesa e' la stessa finche' non cambia l'id.
      const runId = snapshot.id.split(':')[0]!;
      if (runId !== this.networkRunId) {
        this.networkRunId = runId;
        this.networkSaved = { gold: 0, embers: 0, xp: 0, kills: {}, items: 0 };
        this.runItems = [];
        this.runXpStart = this.character.totalXp;
        this.runTally.reset(me);
      }
      this.networkBattleId = snapshot.id; this.dungeon = dungeon; this.battleMembers = [...state.members];
      const members = state.members
        .filter(m => snapshot.players.some(p => p.id === m.id))
        .map(m => {
          const character = deserializeCharacter(m.character)!;
          return { id: m.id, loadout: character.loadout(), characterClass: character.characterClass };
        });
      this.match = replicaMatch(dungeon, snapshot.setup, members);
      this.match.viewPlayerId = me;
      const view = new NetworkView(this.match); this.networkView = view;
      this.allyPoses.clear(); for (const member of members) this.allyPoses.set(member.id, new ActorPoses());
      this.allyVisuals = this.battleMembers.filter(m => m.id !== me && this.match.players.has(m.id)).map(member => ({
        player: view.match.players.get(member.id)!, poses: this.allyPoses.get(member.id)!, name: member.name, appearance: member.appearance,
      }));
      this.renderAppearance = this.character.appearance();
      this.effects.clear(); this.poses.reset(); this.input.releaseAll();
      this.clearBattleFeedback(); this.tally.reset(me); this.hud.resetBars();
      this.screen = 'playing'; this.screens.show(null); this.overlay.hide(); this.party.close();
      this.hud.buildSkills(this.match.player.skillBar.skills); this.hud.setBossName(this.match.boss?.definition.name ?? ''); this.canvas.focus();
      if (snapshot.run !== null && snapshot.room !== null) this.descentHud.announce(snapshot.run, snapshot.room);
      else this.descentHud.hide();
    }
    const membership=this.party.client.state?.members??[];
    if(snapshot.players.map(p=>p.id).join(',')!==[...this.match.players.keys()].join(',')){
      applySnapshot(this.match,snapshot);
      this.battleMembers=membership.filter(m=>snapshot.players.some(p=>p.id===m.id));
      for(const m of this.battleMembers)if(!this.allyPoses.has(m.id))this.allyPoses.set(m.id,new ActorPoses());
    }
    this.networkRun = snapshot.run;
    this.networkRoom = snapshot.room;
    applySnapshot(this.match, snapshot);
    this.networkView!.accept(snapshot, performance.now());
    this.allyVisuals=this.battleMembers.filter(m=>m.id!==me&&this.networkView!.match.players.has(m.id)).map(m=>({player:this.networkView!.match.players.get(m.id)!,poses:this.allyPoses.get(m.id)!,name:m.name,appearance:m.appearance}));
    for (const event of snapshot.events) {
      this.effects.handle(event, me); this.audio.handle(event, me);
      this.hud.onEvent(event, me); this.tally.handle(event); this.runTally.handle(event);
      if (event.type === 'boss_phase_changed') this.onPhaseChanged(event.text, false);
      if (!event.playerId || event.playerId === me) this.poses.handle(event);
      if (event.playerId) this.allyPoses.get(event.playerId)?.handle(event);
    }
    if (enteringBattle) this.recenter();
    if (snapshot.run !== null) this.saveNetworkRunProgress(snapshot.run);
    if (snapshot.status !== 'playing') {
      this.completedBattles.add(snapshot.id);
      if (snapshot.run !== null) this.finishNetworkRun(snapshot.run);
      else this.onMatchEnded(this.match, snapshot.status === 'won', snapshot.rewards[me] ?? []);
    }
  }

  /** Cooperativa: porta nel personaggio braci, esperienza, bestiario e bottino della discesa man mano che arrivano. */
  private saveNetworkRunProgress(run: RunView): void {
    if(this.party.client.profile){
      const count=run.rewards[this.party.client.playerId]?.length??0;
      this.runItems=count?this.character.inventory.slice(-count):[];
      return;
    }
    const me = this.party.client.playerId;
    const state = run.players[me];
    if (state === undefined) return;
    const saved = this.networkSaved;
    const rewards = run.rewards[me] ?? [];
    const kills: Record<string, number> = {};
    for (const [id, count] of Object.entries(state.kills)) {
      const delta = count - (saved.kills[id] ?? 0);
      if (delta > 0) kills[id] = delta;
    }
    const newItems = rewards.slice(saved.items);
    if ((state.gold ?? 0) === saved.gold && state.embers === saved.embers && state.xp === saved.xp && Object.keys(kills).length === 0 && newItems.length === 0) return;
    this.character.totalXp += Math.max(0, state.xp - saved.xp);
    this.character.addKills(kills);
    this.runItems.push(...this.character.addRolls(newItems));
    this.roster.gold += Math.max(0, (state.gold ?? 0) - saved.gold);
    this.networkSaved = { gold: state.gold ?? 0, embers: state.embers, xp: state.xp, kills: { ...state.kills }, items: rewards.length };
    this.persist();
  }

  /** Cooperativa: la discesa e' finita sul server. Record, salvataggio e schermata, come in partita singola. */
  private finishNetworkRun(run: RunView): void {
    this.saveNetworkRunProgress(run);
    const me = this.party.client.playerId;
    const won = run.status === 'won';
    if(!this.party.client.profile)for (const victory of run.victories) this.character.recordVictory(victory.dungeonId, Number.NaN);
    let record = { firstClear: false, newBest: false };
    if(this.party.client.profile){
      const savedRecord=run.mode==='pilgrimage'?this.character.pilgrimage:this.character.descentFor(run.dungeonId);
      record={firstClear:won&&savedRecord.clears===1,newBest:won&&savedRecord.bestTimeSeconds===run.seconds};
    }
    if (!this.party.client.profile && run.mode === 'pilgrimage') {
      if (won) {
        const best = this.character.pilgrimage.bestTimeSeconds;
        record = { firstClear: this.character.pilgrimage.clears === 0, newBest: best === null || run.seconds < best };
        this.character.pilgrimage = { clears: this.character.pilgrimage.clears + 1, bestTimeSeconds: record.newBest ? run.seconds : best };
      }
      for (const victory of run.victories) this.character.recordDescent(victory.dungeonId, { won: true, seconds: victory.seconds, grade: run.grade, stage: run.stages });
    } else if(!this.party.client.profile) {
      record = this.character.recordDescent(run.dungeonId, { won, seconds: run.seconds, grade: run.grade, stage: run.stage + 1 });
    }
    const saved = this.persist();
    const state = run.players[me];
    const before = levelProgress(this.runXpStart);
    const afterXp = levelProgress(this.character.totalXp);
    const dungeon = dungeonById(run.dungeonId) ?? this.dungeon;
    const seals = run.victories.at(-1)?.seals ?? run.seals;
    const view = {
      title: won ? (run.mode === 'pilgrimage' ? 'Pellegrinaggio compiuto · quattro boss' : `Discesa completata · ${titleCase(dungeon.boss.name)}`) : 'La discesa si è interrotta',
      seconds: run.seconds,
      newBest: record.newBest,
      firstClear: record.firstClear,
      stage: run.stage + 1,
      stages: run.stages,
      rooms: run.roomsCleared,
      embers: state?.embers ?? 0,
      tempers: state?.tempers.length ?? 0,
      seals,
      summary: this.runTally.summary(),
      xp: { gained: state?.xp ?? 0, levelBefore: before.level, levelAfter: afterXp.level, before: before.current / before.required, after: afterXp.current / afterXp.required },
      items: this.runItems,
      saved,
      characterClass: this.character.characterClass,
      dropChance: Math.min(1, lootTableFor(run.dungeonId).dropChance + 0.05 * seals),
    };
    this.screen = 'ended';
    this.input.releaseAll();
    const extra = won ? renderDescentVictory(view) : renderDescentDefeat({ ...view, onInventory: () => this.openInventory() });
    if (!won) document.body.classList.add('defeated');
    this.networkRunId = '';
    this.pendingEnd = {
      remaining: won ? END_DELAY.won : END_DELAY.lost,
      show: () => {
        this.overlay.showEnded({ won, dungeonName: run.mode === 'pilgrimage' ? 'Pellegrinaggio' : dungeon.name, extra });
        this.descentHud.hide();
      },
    };
    this.updateParty();
  }

  /**
   * Un'altra scheda ha salvato: si adotta la sua raccolta (con il profilo attivo di questa scheda, se esiste ancora) e
   * si ridisegna la schermata aperta. Una partita in corso prosegue con le skill che aveva; il bottino va al personaggio
   * aggiornato. Il personaggio in creazione (`draft`) non e' nella raccolta e resta com'e'.
   */
  private adoptExternalSave(key: string | null, newValue: string | null): void {
    if(this.offlineRoster)return;
    const roster = rosterFromExternalSave(key, newValue, this.roster.activeId);
    if (roster === null) return;
    this.roster = roster;
    // Come dopo un salvataggio: l'aspetto disegnato e il pannello del party seguono il personaggio aggiornato.
    this.renderAppearance = undefined;
    this.updateParty();
    if (this.screen === 'menu') this.showMenu();
    // Durante la creazione non si ridisegna la pagina: il nome che si sta scrivendo andrebbe perso.
    else if (this.screen === 'characters' && this.draft === null) this.renderCharacters();
    else if (this.screen === 'hub') this.hub.show(this.character,this.roster,false,this.clock);
    else if (this.screen === 'dungeons') this.dungeonSelect.render(this.character);
    else if (this.screen === 'bestiary') this.bestiaryScreen.render(this.character);
    else if (this.screen === 'inventory') {
      this.inventoryScreen.reset();
      this.inventoryScreen.render(this.character);
    }
    this.showToast('Progressi aggiornati da un\'altra scheda di questo browser.');
  }

  /** Salva il personaggio; se non riesce avvisa una volta sola. Restituisce se il salvataggio e' riuscito. */
  private persist(): boolean {
    if(this.offlineRoster){this.renderAppearance=undefined;return true;}
    this.renderAppearance = undefined;
    const saved = this.saveStore.saveRoster(this.roster);
    this.menu.setSave(saved
      ? { text: 'Salvato in locale', detail: 'I progressi sono salvati in questo browser.', tone: 'ok' }
      : { text: 'Salvataggio non riuscito', detail: 'Impossibile salvare in questo browser: i progressi andranno persi alla chiusura.', tone: 'bad' });
    this.updateParty();
    if (!saved && !this.saveWarningShown) {
      this.saveWarningShown = true;
      this.showToast('Impossibile salvare in questo browser: i progressi andranno persi alla chiusura.');
    }
    return saved;
  }

  private showToast(text: string, duration = TOAST_MS, error = false): void {
    const toast = requireElement('toast');
    toast.textContent = text;
    toast.classList.toggle('toast-error', error);
    toast.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.add('hidden'), duration);
  }

  // --- Pausa, audio, ridimensionamento ---------------------------------------------------------------------------

  private togglePause(): void {
    if (this.networkBattleId && this.screen === 'playing') { this.showMenu(); return; }
    if (this.screen === 'playing') {
      this.screen = 'paused';
      this.overlay.showPaused(this.run !== null ? `${this.dungeon.name} · tappa ${this.run.stage + 1}` : this.dungeon.name);
    } else if (this.screen === 'paused') {
      this.screen = 'playing';
      this.overlay.hide();
      this.canvas.focus();
    } else {
      return;
    }
    this.input.releaseAll();
    this.updateParty();
  }

  private pauseIfPlaying(): void {
    if (this.screen === 'playing' && !this.networkBattleId) this.togglePause();
  }

  private toggleAudio(): void {
    this.audio.toggle();
  }

  private showAudioState(enabled: boolean): void {
    requireElement('audio-state').textContent = enabled ? 'Audio attivo · M' : 'Audio disattivato · M';
  }

  private recenter(): void {
    this.camera.follow(this.match.player.position);
  }

  /** La vista e' la finestra divisa per lo zoom: il canvas ha risoluzione ridotta e il CSS lo ingrandisce a scatti. */
  private resize(): void {
    const stage = this.canvas.parentElement ?? this.canvas;
    this.camera.setViewSize(stage.clientWidth / ZOOM, stage.clientHeight / ZOOM);
    this.canvas.width = this.camera.width;
    this.canvas.height = this.camera.height;
    this.ctx.imageSmoothingEnabled = false;
    this.recenter();
  }

  // --- Ciclo -----------------------------------------------------------------------------------------------------

  private readIntent(): PlayerIntent {
    const playerPosition = this.networkBattleId && this.networkView
      ? this.networkView.match.player.position
      : this.match.player.position;
    return {
      move: this.input.getVector('move_left', 'move_right', 'move_up', 'move_down'),
      aimOffset: this.camera.pointerOffset(this.input.pointer, playerPosition),
      skills: SKILL_ACTIONS.map((action) => this.input.isActionActive(action)),
    };
  }

  private step(): void {
    const { match } = this;
    if(this.screen==='hub'){
      const move=this.input.getVector('move_left','move_right','move_up','move_down');this.hub.step(STEP,move);
      if(this.party.client.state&&performance.now()-this.lastHubInput>NETWORK_HUB_INPUT){this.lastHubInput=performance.now();this.party.client.send({type:'hub_input',move:this.hub.inputLocked?Vec2.ZERO:move});}
    }
    if (this.screen === 'playing' || this.screen === 'ended') {
      this.poses.update(STEP, match.player.moving);
      for (const [id, poses] of this.allyPoses) poses.update(STEP, match.players.get(id)?.moving ?? false);
      this.effects.update(STEP, this.networkBattleId && this.networkView ? this.networkView.match : match, this.camera);
    }
    if (this.screen === 'playing' && this.pendingRoom === null) {
      if (this.networkBattleId) {
        if (this.party.client.input(this.readIntent())) this.input.takeLatched();
      } else if (this.interlude > 0) {
        // Pausa drammatica della fase II: il mondo aspetta, gli effetti continuano; le pressioni non si accumulano.
        this.interlude -= STEP; this.input.takeLatched();
      } else {
        match.step(STEP, this.readIntent()); this.saveRunProgress(); this.input.takeLatched();
      }
    }
  }

  /** Le viste della discesa in corso: dalla partita singola o dal server (cooperativa). */
  private descentViews(): { run: RunView; room: RoomView; next: readonly DoorOption[]; localId: string } | null {
    if (this.networkBattleId) {
      const run = this.networkRun, room = this.networkRoom;
      if (run === null || room === null) return null;
      return { run, room, next: run.plan[run.stage + 1]?.options ?? [], localId: this.party.client.playerId };
    }
    const run = this.run;
    if (run === null || run.match !== this.match) return null;
    return { run: run.view(), room: run.roomView(), next: run.nextOptions, localId: 'local' };
  }

  private frame(time: number): void {
    const frameStart = performance.now();
    this.party.client.flushSnapshot();
    const partyState=this.party.client.state,hub=this.party.client.hub;
    if(partyState){const first=!this.hubSession;this.hubSession=partyState.code;if(first&&partyState.code==='HUB')this.openHub();}
    if(!partyState){this.hubSession='';this.lastPresence=null;}
    if(partyState&&this.networkBattleId&&!this.party.client.isMember){this.dismissedNetworkRun=this.networkBattleId.split(':')[0]!;this.networkBattleId='';this.networkView=null;this.openHub();}
    if(partyState){const present=!partyState.playing;if(present!==this.lastPresence){this.lastPresence=present;this.party.client.send({type:'hub_presence',present});}}

    this.hub.setOnline(hub&&partyState?{id:this.party.client.playerId,view:hub,busy:this.party.client.tradeSaving,send:m=>this.party.client.send(m)}:null);
    const delta = Math.min((time - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = time;
    this.clock += delta;
    this.accumulator += delta;
    const view = this.networkBattleId && this.networkView ? this.networkView : null;
    view?.sample(performance.now());
    let steps = 0;
    while (this.accumulator >= STEP) {
      this.step();
      this.accumulator -= STEP;
      steps++;
    }
    const simulated = performance.now();
    if (this.screen === 'hub') this.hub.render(delta);
    if (this.pendingEnd !== null) {
      this.pendingEnd.remaining -= delta;
      if (this.pendingEnd.remaining <= 0) {
        const { show } = this.pendingEnd;
        this.pendingEnd = null;
        show();
      }
    }
    if (this.pendingRoom !== null) {
      this.pendingRoom.remaining -= delta;
      if (this.pendingRoom.remaining <= 0) {
        const { enter } = this.pendingRoom;
        this.pendingRoom = null;
        document.body.classList.remove('room-fading');
        enter();
      }
    }
    this.camera.shakeOffset =
      this.screen === 'playing' || this.screen === 'ended' ? this.effects.shakeOffset() : Vec2.ZERO;
    const renderedMatch = view?.match ?? this.match;
    if (this.screen === 'playing' || this.screen === 'ended') {
      this.camera.update(renderedMatch.player.position, this.input.pointer, delta);
    } else if (IDLE_SCREENS.includes(this.screen)) {
      this.camera.follow(renderedMatch.player.position);
    }
    // Aggiornamento visuale dopo lo spostamento della camera: il mirino resta sotto il cursore,
    // anche nei fotogrammi senza passi di simulazione. La scossa resta esclusa dalla mira.
    renderedMatch.player.aim = this.camera.pointerToWorld(this.input.pointer);
    this.hud.update(this.match, levelProgress(this.character.totalXp));
    document.body.classList.toggle('aiming',this.screen==='playing');
    const inRefuge=REFUGE_SCREENS.includes(this.screen);
    document.body.classList.toggle('initial-menu',inRefuge);
    document.body.classList.toggle('refuge-backdrop',inRefuge);
    const link={connecting:this.party.client.connecting,online:Boolean(this.party.client.state),failed:this.party.failed};
    if(link.failed&&!this.connectionLost&&this.wasOnline&&inRefuge)this.showToast('Connessione al server persa.');
    this.connectionLost=link.failed;
    this.wasOnline=link.online;
    this.menu.setConnection(connectionLabel({...link,latency:this.party.client.latency}));
    const balance=requireElement('global-gold'),goldLabel=this.roster.gold.toLocaleString('it-IT');
    if(balance.textContent!==goldLabel)balance.textContent=goldLabel;
    const views = this.descentViews();
    if (views !== null && (this.screen === 'playing' || this.screen === 'paused')) this.descentHud.update(views.run, views.room, views.localId);
    // Minimappa della stanza (anche nel Duello) e, tenendo premuto Tab, la mappa intera della discesa.
    const inMatch = this.screen === 'playing' || this.screen === 'paused';
    this.input.inMatch = this.screen === 'playing';
    if (inMatch) this.minimap.update(delta, renderedMatch, views?.room ?? null, this.camera, views?.localId ?? (this.networkBattleId ? this.party.client.playerId : 'local'), this.canvas);
    else this.minimap.hide();
    if (this.input.inMatch && views !== null && this.input.isActionPressed('show_map')) this.descentMap.show(views.run);
    else this.descentMap.hide();
    this.audio.setListener(this.match.player.position, this.camera.width / 2);
    const audioScreen: AudioScreen = this.screen === 'login' || this.screen === 'bestiary' || this.screen === 'hub' || this.screen === 'characters' ? 'menu' : this.screen;
    this.audio.setScene({ screen: audioScreen, theme: this.match.arena.theme, enraged: this.match.boss?.isEnraged ?? false });
    this.audio.update(delta);
    const mood = views === null
      ? undefined
      : this.roomMood.frame(
          this.clock,
          `${this.networkBattleId || this.runSerial}|${views.run.dungeonIndex}|${views.run.stage}|${this.match.arena.id}`,
          views.room.doorsOpen,
          views.run.stage / Math.max(1, views.run.stages - 1),
        );
    const nextVein = views !== null && showsVeins(views.run.veins) ? views.run.stageVeins?.[views.run.stage + 1] : undefined;
    const look: RoomLook | null = views === null ? null : {
      view: views.room,
      arena: this.match.arena,
      nextOptions: views.next,
      localId: views.localId,
      ...(renderedMatch.player.health.isDead ? {} : { collector: renderedMatch.player.position }),
      ...(mood === undefined ? {} : { mood }),
      ...(nextVein === undefined ? {} : { nextVein: veinName(views.run.dungeonId, nextVein) }),
    };
    const sceneStart = performance.now();
    let roomMs = 0;
    if (inRefuge) {
      this.menuScene.draw(this.clock, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } else renderScene(this.ctx, {
      match: renderedMatch,
      effects: this.effects,
      poses: this.poses,
      camera: this.camera,
      clock: this.clock,
      appearance: this.renderAppearance ??= this.character.appearance(),
      allies: this.allyVisuals,
      ...(look === null ? {} : {
        drawRoom: (ctx: CanvasRenderingContext2D, layer: RoomLayer) => {
          const roomStart = performance.now();
          if (layer === 'floor') drawRoomFloor(ctx, look, this.clock);
          else if (layer === 'objects') drawRoomPickups(ctx, look, this.clock);
          else if (layer === 'front') drawRoomFront(ctx, look, this.clock);
          else drawRoomLabels(ctx, look);
          roomMs += performance.now() - roomStart;
        },
        drawRoomScreen: (ctx: CanvasRenderingContext2D) => drawRoomIndicators(ctx, this.camera, renderedMatch.player.position, look.view, renderedMatch.minions),
        preyId: look.view.preyId,
        ...(mood === undefined ? {} : { mood }),
      }),
    });
    const end = performance.now();
    this.performancePanel.frame(time, end - frameStart, this.party.client, {
      steps, simulation: simulated - frameStart, interface: sceneStart - simulated, scene: end - sceneStart - roomMs, room: roomMs,
    });
    requestAnimationFrame((next) => this.frame(next));
  }
}

/** "GUARDIANO DELLA CRIPTA" -> "Guardiano della cripta". */
function titleCase(name: string): string {
  const lower = name.toLocaleLowerCase('it-IT');
  return lower.charAt(0).toLocaleUpperCase('it-IT') + lower.slice(1);
}
