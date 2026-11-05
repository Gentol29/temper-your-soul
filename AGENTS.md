# Temper your soul: istruzioni per Codex

## Collaborazione obbligatoria fra persone e agenti AI

Leggere prima [README.md](README.md), in particolare «Prima di lavorare», stato corrente e prossimi passi. Queste regole sono richieste dal proprietario del progetto e valgono anche quando si riprende un lavoro precedente.

- **Prima di qualsiasi nuova modifica**, comunicare in italiano l'obiettivo e controllare repository, ramo e stato locale; eseguire **`git pull --ff-only`** sull'upstream corrente. Per un nuovo ramo, aggiornare prima la base. Non lavorare su una copia obsoleta ignorando il pull.
- Se il pull non riesce, spiegare subito perché e risolvere l'allineamento senza perdere lavoro. Non usare reset distruttivi, force push, stash automatici o risoluzioni che scartino il lavoro dell'altro collaboratore. Non iniziare nuove modifiche finché manca una base allineata in sicurezza.
- **Tenere aggiornato l'utente durante il lavoro**, indicativamente almeno ogni minuto di lavoro attivo, e quando emergono risultati, ostacoli o cambi di piano. Alla fine: modifiche, verifiche, limiti, prova manuale ancora da fare; ramo/hash se pubblicato.
- Non fare commit/push senza autorizzazione esplicita; quando autorizzati, ricontrollare remoto e stato prima della pubblicazione. Coordinare lavori simultanei su rami separati.
- **Consultare [docs/ripartizione-compiti.md](docs/ripartizione-compiti.md) prima di iniziare un lavoro**: se tocca un'area in carico a un altro referente, segnalarlo all'utente e attendere la sua decisione.
- Rispettare la direzione UI **C — Reliquiario** e gli sprite di gioco **C — Cacciatore d’ombre**, scelti dall’utente. La revisione dei ritratti illustrati resta sospesa: non consumare crediti per rigenerazioni senza una nuova richiesta esplicita.
- **Versione e changelog obbligatori:** prima di creare/aggiornare una PR o fare un commit diretto a `main` autorizzato, applicare automaticamente [docs/versioning.md](docs/versioning.md). Aggiornare `package.json`, lockfile e prima voce di `src/release-notes.ts`; riassumere tutte le modifiche dell’incremento in italiano. Per bilanciamento riportare valori prima → dopo con unità, skill/oggetto/boss, rarità/livello/fase pertinenti. Convenzione vA.BB.CC: nuovo feature branch da main a CC=01 (registrato nel primo commit), ogni commit successivo incrementa CC di 1; ogni merge/squash o commit diretto autorizzato a main incrementa BB di 1 rispetto al main aggiornato e azzera CC. A resta invariato salvo richiesta esplicita. Aggiornare note a ogni commit; la release main riassume tutta la PR. Aprire una PR o fare push senza nuovi commit non aumenta la versione. Preservare lo storico, verificare collisioni dopo il pull ed eseguire `npm run verify`. Questa regola non autorizza commit/push.

Gioco d'azione 2D per browser in **TypeScript** (Canvas 2D, nessuna dipendenza runtime nel browser, nessun motore di gioco). La cooperativa usa un server Node/WebSocket: `npm run build` e `npm run server` (porta 4173); Vite in sviluppo inoltra `/party` a quel server. Vedere README per inviti, autorità della simulazione e limiti della prima versione.
Nato come prototipo JavaScript generato con ChatGPT ("Emberfall", un mago contro un guardiano in un'arena), poi riscritto con la struttura e i principi di Ashen Realm.
Decisioni di gioco: `docs/game-design.md`. Fasi e criteri: `docs/roadmap.md`. Problemi noti: `docs/bugs.md`.
Repository: https://github.com/Jabbazz/temper-your-soul (remote `origin` configurato, branch `main`).

## Il prototipo originale

Resta in `legacy/emberfall-prototype/` (HTML + JS classico, si apre con doppio clic) **solo come riferimento storico**: non fa parte del build, non e' coperto da `tsc` ne' dai test. Il client e il dominio condiviso sono in `src/`; il trasporto HTTP/WebSocket è in `server/`.

## Strumenti

- Node 22 + npm. Se `node` non e' nel PATH si puo' usare la copia portatile di Ashen Realm:
  `$env:PATH = "C:\Users\gianm\Documents\ashen-realm\.tools\node-v22.11.0-win-x64;$env:PATH"` (PowerShell). `tools/verify.ps1` la cerca da solo.
- TypeScript 5.6 (strict), Vite 5 (sviluppo e build), Vitest 2 (test). Versioni fissate in `package.json`, come in Ashen Realm.
- `C:\Users\gianm` e' un repository Git (senza commit): questo progetto ha un repository **dedicato** nella propria cartella; non toccare quello della home.

## Comandi (dalla radice del progetto)

```powershell
npm install        # una sola volta
npm run dev        # sviluppo con ricarica (5173); cooperativa richiede anche il server su 4173
npm run server     # serve dist/ e WebSocket /party su 4173, dopo npm run build
npm run benchmark:network # confronto ripetibile snapshot completi/protocollo compatto
npm run build      # controllo dei tipi + build di produzione in dist/
npm run typecheck  # controllo TypeScript client, server e benchmark
npm test           # tutti i test (Vitest)
npm run verify     # tipi + test + build: esce con codice 0 solo se tutto riesce
.\tools\verify.ps1 # come npm run verify, ma trova Node da solo e stampa "VERIFICA COMPLETA: OK"
```

`dist/index.html` e' uno script classico (non un modulo ES): si apre anche con doppio clic (`file://`) e si pubblica su qualunque hosting statico.

## Struttura

Organizzazione per funzionalita', non per tipo di file. Test accanto al codice (`*.test.ts`).

```
index.html, src/main.ts, src/game.ts, src/style.css   pagina, avvio, ciclo (passo fisso 60 Hz), macchina delle schermate, collegamento di tutte le parti
src/core/        vec2, rng (Rng + SeededRng), signal, input (azioni), camera (+ ZOOM)
src/features/
  arena/         arena.ts: ArenaDefinition (mappa: dimensioni, partenze, margini, pilastri), clamp, pilastri (pillarAt, pushOutOfPillars)
  combat/        health, team, collision (raggi), projectile (+ ProjectileSpec), danger-zone (+ DangerZoneSpec), events (GameEvent)
  skills/        skill-definition (SkillDefinition, SkillEffect: projectile | ground_blast | dash | melee_arc, Loadout), mage-skills (le 4 base),
                 skill-bar (ricariche, slot anche vuoti), skill-effects (comportamento)
  player/        player.ts (movimento con pilastri, vita, invulnerabilita', loadout)
  boss/          boss-definition (BossDefinition/BossStats/BossPattern/ScheduledAction/ByPhase), boss.ts (stato, movimento, fasi, carica, azioni
                 programmate), pattern-kit.ts (anelli, ventagli, schedule, carica), guardian.ts (il boss della cripta), boss-context.ts
  dungeons/      dungeon-definition, crypt.ts, dungeons.ts (registro DUNGEONS), e una cartella per dungeon (swamp/, forge/, glacier/) con
                 mappa, boss, schemi e test; dungeons.test.ts valida OGNI dungeon registrato
  items/         rarity, equipment-slot, item-family + item-families (catalogo), item-skills (valori delle skill), item (Item, resolveItemSkill,
                 describeSkillStats), scaling (rarita' -> valori)
  loot/          loot-table + loot-tables (per dungeon), roll-loot (deterministico con Rng)
  character/     character.ts (inventario, equipaggiamento, record), save-format (serializzazione e VALIDAZIONE), save-store (localStorage)
  match/         match.ts: la partita (dungeon + loadout) senza DOM, un solo ordine di passo, emette eventi
  presentation/  visuals + looks/ (aspetti per id), themes/ (disegno delle mappe), boss-art/ (grafica dei boss), effects, poses, sprites, draw-*.ts,
                 scene-renderer.ts
  ui/            hud, overlay (pausa e fine), screens, main-menu, dungeon-select, inventory-screen + inventory-view (ordinamento/filtri, testabile),
                 item-card, loot-view, fullscreen, dom
  audio/         audio-player.ts (Web Audio, ascolta gli eventi)
server/index.ts  server HTTP/WebSocket autorevole; stanze in memoria, PUBLIC_URL per inviti pubblici da localhost
src/features/network/  lobby, client, protocollo v2, codec ordinato, test di sincronizzazione/efficienza
tools/network-benchmark.ts  fixture di stress ripetibile, senza salvataggi
src/testing.ts   aiuti per i test (partite con seme e dungeon, intenzioni, esecuzione a passo fisso, contesto del boss)
```

Flusso singolo: `Game` tiene il personaggio (caricato da `SaveStore`) e la schermata corrente (menu, dungeon, equipaggiamento, partita, pausa, fine). Avviare un dungeon crea un `Match` con `character.loadout()`; `Game.frame` accumula il tempo e chiama a 60 Hz `Match.step(dt, intent)`; `Match` modifica solo se stessa ed emette `GameEvent`; effetti, pose e audio ascoltano gli eventi; alla vittoria `Game` tira il bottino (`rollLoot`), lo aggiunge al personaggio, registra il record e salva PRIMA di mostrare la schermata; `renderScene` disegna leggendo lo stato.

In cooperativa il server esegue `Match.stepParty(dt, intents)` a 60 Hz; i client inviano intenzioni e ricevono aggiornamenti a 30 Hz tramite `SnapshotEncoder`/`SnapshotDecoder`. I delta sono ordinati: non saltarli in silenzio e non cambiare il protocollo senza incrementare `NETWORK.protocolVersion`. Definizioni e nascite si inviano una sola volta; report/premi nel frame finale. Il client rappresenta lo stato più recente e salva immediatamente i premi finali anche se il rendering è sospeso. La lobby controlla leader, pronto e GS di tutti. Non introdurre regole di combattimento nel trasporto o nel rendering. Stanze non persistenti, nessuna riconnessione in corso e nessun salvataggio cloud; dettagli e limiti nel README.

## Convenzioni

### Direzione grafica condivisa · Hi-bit

- **Requisito per tutti i collaboratori e agenti:** nuovi sprite, icone, VFX e revisioni grafiche devono seguire lo stile **Hi-bit** approvato: pixel interi, contorni definiti, campionamento nearest-neighbor e palette esplicite. Usare gli sprite C e gli effetti locali come riferimento; nessuna sfocatura o antialiasing introdotti nei raster.
- **Palette:** dark fantasy cupo, carbone/nero, cenere e grigi con accenti cremisi/rosso fuoco. Superfici ampie scure, luci localizzate e sottili; HUB e portale usano `hub-palette.ts`. Personaggi ed equipaggiamenti seguono `shadow-equipment.ts`. Gli elementi delle skill restano distinguibili con accenti dedicati (fuoco, acqua, terra, vento), su contorni e materiali scuri: evitare di uniformarli tutti al rosso o schiarire l’intera figura.
- **Attacchi base:** fendente, freccia/onda del tiro e dardi elementali hanno animazioni Hi-bit con sagome proprie. Nessuna emissione di particelle casuali al lancio o lungo la scia delle primarie; conservare sangue, impatti, morti, buff, stati e altre abilità. Gli effetti non aggiungono hitbox né cambiano danni, gittate o cadenze.
- **Testi:** conservare i font approvati, incluso Silkscreen. Per la leggibilità ingrandire i testi; sul canvas Silkscreen usa multipli di 8 px. Premi XP/oro almeno 16 px interni, contorno scuro e righe sufficientemente distanziate. Un cambio di stile o famiglia del font richiede una nuova indicazione dell’utente.

### Codice e simulazione

- **Moduli piccoli per responsabilità:** classi in `src/features/classes/<classe>/`, stati in `combat/status-effects/`. Separare profili, equipaggiamento, skill e comportamento; mantenere registri condivisi leggeri. Estrarre nuove categorie in file dedicati invece di ampliare file monolitici. Gli id esistenti di skill e oggetti restano stabili.

- TypeScript **strict**: niente `any`, parametri inutilizzati con prefisso `_`. File in `kebab-case`, classi in `PascalCase`.
- Testi visibili al giocatore e documentazione in italiano; identificatori nel codice in inglese.
- **La simulazione non conosce il DOM, il canvas, il tempo reale ne' `Math.random`**: tutto cio' che e' casuale nelle regole passa da un `Rng` iniettato (`SeededRng` nei test e nelle partite), cosi' una partita e' riproducibile con il seme. La casualita' estetica (`cosmeticRng`) vale solo in `presentation/`.
- **Passo fisso**: la logica avanza solo in `Match.step(dt, intent)` (singolo) / `Match.stepParty(dt, intents)` (server cooperativo) a 1/60 s (mai dipendente dal frame rate); disegno e HUD a ogni fotogramma. Il tempo di partita (`Match.time`) si ferma alla fine.
- **Dati / comportamento / rappresentazione separati**: i dati (`SkillDefinition`, `ItemFamily`, `ProjectileSpec`, `DangerZoneSpec`, `ArenaDefinition`, `BossDefinition`/`BossStats`, tabelle degli schemi) sono di sola lettura a runtime; il comportamento sta in `skill-effects.ts`, `boss.ts`, `boss-patterns.ts`, `match.ts`; l'aspetto in `presentation/`. I dati scelgono l'aspetto con un id (`ProjectileVisual`), mai con un colore o con un numero (non identificare un proiettile dal raggio). Non mettere regole nella rappresentazione ne' aspetto nei dati.
- **Eventi**: la simulazione dice cosa e' successo (`GameEvent`), non cosa disegnare o suonare. Aggiungere un effetto o un suono = ascoltare un evento esistente; se manca l'evento, aggiungerlo a `events.ts` e coprirlo con un test.
- **Valori provvisori**: i valori stanno in tabelle di dati con nome (`PLAYER_STATS`, le `BossStats` di ogni boss, `MAGE_SKILLS`, `item-skills.ts`, `RARITY_STATS`, `LOOT_TABLES`, le tabelle degli schemi, le `ArenaDefinition`, `HIT_RADIUS`), non sepolti nel codice. Sono tutti provvisori (vedi `docs/game-design.md`): non inventare valori definitivi, usare un valore regolabile e segnalarlo.
- Input solo tramite azioni (`Action`), mai tasti hardcoded; tasti legati per posizione fisica (`event.code`). Le pressioni piu' brevi di un passo non si perdono (`Input.isActionActive` + `takeLatched`).
- Id stabili (`arcane_bolt`, `frost_orb`, `meteor`, `astral_step`, id degli schemi, `ProjectileVisual`): non rinominarli, li usano test, eventi e rappresentazione.
- **Oggetti**: 25 famiglie; la famiglia decide skill, slot e classe richiesta, la rarità scala le skill. Un oggetto salvato è `{ uid, familyId, rarity, level? }`; skill e GS si ricalcolano dai dati. Per una nuova famiglia: skill in `item-skills.ts` o `dungeon-item-skills.ts`, voce nel catalogo, requisito in `item-classes.ts`, costo in `SPELL_MANA`, icone oggetto/spell, look ed equipaggiamento nei due corpi, test. Inserire esplicitamente le voci nei pool di `loot-tables.ts`: non derivarli da `exclusiveTo`, che indica solo l'origine. Niente equip di altre classi; gli oggetti incompatibili restano nello zaino.
- **Salvataggio**: formato v6, raccolta `character-roster` con profili separati. Ogni dato esterno passa da `deserializeRoster` e `deserializeCharacter`; preservare le migrazioni v1–v5 e le copie `...:corrupt` / `...:before-roster`. Una raccolta invalida non si ripara perdendo profili in silenzio. I pezzi di altre classi si rimuovono dagli slot, non dall'inventario. Cambiando il formato incrementare `SAVE_VERSION` e gestire la migrazione.
- **Dungeon**: per aggiungerne uno creare `features/dungeons/<id>/` con `ArenaDefinition`, `BossDefinition` (schemi con gli attrezzi di `pattern-kit.ts`), `DungeonDefinition`; un tema in `presentation/themes/`, la grafica isometrica registrata in `presentation/iso/view-mode.ts` (obbligatoria: tutte le mappe sono in isometria), la grafica in `presentation/boss-art/`, gli aspetti in `presentation/looks/`; registrarlo in `dungeons.ts`, nei registri di temi, grafiche e aspetti, e aggiungere la tabella di bottino. `dungeons.test.ts` e' il criterio di accettazione (mappa valida, schemi eseguibili e leggibili, danno limitato, simulazione lunga). L'id del dungeon, del boss e degli schemi e' stabile.
- Per aggiungere una skill base: `SkillDefinition` (con `visual`) e, se serve un nuovo tipo di effetto, un caso in `skill-effects.ts`, in `Effects.onSkillCast` e (per il suono) in `AudioPlayer`; test.
- Grafica provvisoria: pixel art nel codice e PNG locali già approvati in `src/assets/portraits/`. Non rigenerare i ritratti sospesi. L'HUD è in DOM sopra il canvas: UI e tooltip leggono le stesse regole del dominio, senza duplicarle.

## Programmi esterni e file generati

Vale per ogni persona o agente che lavora su questo progetto, in qualunque fork o clone. Lo scopo: nel repository nessun file inutile, e meno file che gli agenti devono leggere.

- **Fuori dalla cartella del progetto.** I programmi esterni al gioco (generatori di immagini o audio, modelli locali come ComfyUI, Blender, ffmpeg, editor, convertitori, scaricatori) si eseguono in una cartella di lavoro propria di chi li usa, fuori dal repository. Lì restano i loro script e configurazioni, prompt, semi, immagini di partenza, candidati, risultati intermedi, cache e log.
- **Nessun percorso della propria macchina nei file del repository.** Niente dischi, nomi utente o cartelle personali (né assoluti né relativi a una cartella privata): si scrive il ruolo («la cartella di lavoro esterna») e ognuno sceglie la propria.
- **Prima fuori, poi dentro solo se approvato.** Generare e provare fuori dal repository; mostrare all'utente confronti e anteprime, anch'essi fuori; integrare **solo dopo la sua approvazione esplicita**.
- **Cosa entra nella codebase:** l'asset finale ottimizzato in `src/assets/` (PNG, audio), i file di dati che il gioco legge (manifest, geometrie), crediti in `art-credits.ts` / `audio-credits.ts`, test, e una nota breve di provenienza (programma o modello, licenza, parametri essenziali come seme e intensità) nel `LEGGIMI.md` della cartella dell'asset o nel manifest. Poi `npm run verify`.
- **Cosa non entra:** script che pilotano programmi esterni, prompt, immagini di partenza o intermedie, cache (`__pycache__`, modelli, output), pagine di anteprima usate solo per le prove. `tools/` contiene solo strumenti Node del progetto che girano con `node`/`npm` senza programmi esterni.
- **File di dati generati:** portano in testa che sono generati e non si modificano a mano. Per rigenerarli si usano i propri strumenti esterni; quelli usati in passato si recuperano dalla storia Git.

## Verifica

`npm run verify` (o `.\tools\verify.ps1`) deve terminare con codice 0. I test sono headless (nessun browser) e coprono regole, boss, skill, giocatore, partita, effetti e coerenza dei dati; **non** verificano l'aspetto visivo, la sensazione di gioco, l'interfaccia in DOM (HUD, schermate, pulsanti) ne' il ciclo del browser: quelli si controllano aprendo il gioco (`npm run dev` o `dist/index.html`).
Fotogrammi renderizzati da uno script (es. Edge headless) e prove di fumo **non** sono prove giocate: la conferma manuale la da' l'utente.
Dopo aver scritto un test conviene verificare che possa fallire (mutazione temporanea e ripristino): ad esempio cambiare `HIT_RADIUS.player` o togliere `slowSeconds` dalla logica del gelo deve far fallire un test.

## Come lavorare

- **Piccoli incrementi**: una funzionalita' per volta, gioco avviabile a ogni passo; fermarsi a fine incremento in attesa della prova manuale.
- Prima di cambiare, leggere i file esistenti.
- Dopo ogni modifica: `npm run verify`. Se si aggiunge comportamento, estendere i test o dichiarare che non e' coperto.
- **Conferme manuali**: nella documentazione si registra come confermato a mano solo cio' che l'utente ha detto esplicitamente di aver provato. Distinguere sempre controlli automatici, fotogrammi renderizzati e prove manuali ancora da fare.
- Non inventare valori definitivi o regole per i punti aperti di `docs/game-design.md`: usare un valore provvisorio regolabile, segnalarlo e aggiungerlo ai punti aperti.
- Registrare i difetti realmente rilevati in `docs/bugs.md`; aggiornare roadmap e design quando una decisione cambia.
- **Non fare commit, push o repository remoti senza richiesta esplicita.** Mai force push. Commit con messaggio descrittivo in italiano.
- Non riscrivere file sorgente con `Get-Content`/`Set-Content`/`WriteAllText` in PowerShell 5.1: altera i caratteri non ASCII (il codice usa `·`, `→`, `✦`, `è`). Usare Python (UTF-8 esplicito), Node o lo strumento di modifica.
