# Temper your soul

**v0.17.00 · 10 novembre 2026:** MMO con HUB pubblico condiviso, profili PostgreSQL autorevoli e accesso/registrazione Supabase nel gioco. Fino a 64 presenze nel mondo, dungeon pubblici fino a 32 ingressi e party sociali con quattro posti e inviti. Esc torna al menu mantenendo la connessione; Logout esce dall’account. Simulazione a 60 Hz, codec ordinato v2 a 30 Hz, protocollo applicativo 21, salvataggi v10 con migrazioni precedenti conservate. [Configurazione, schema e limiti](docs/mmo-persistente.md).

Il `.env` è locale ed escluso da Git. Verificati connessione PostgreSQL reale, UPSERT/rollback in tabella temporanea e interfaccia con due account fittizi; prova giocata con account reali ancora da eseguire. Rilevata RLS disabilitata sui profili remoti: [difetto aperto](docs/bugs.md), da risolvere prima dell’uso pubblico. Le sezioni datate sotto conservano lo storico del progetto.

Gioco d’azione 2D per browser in **TypeScript strict**, Canvas 2D e DOM, senza motore di gioco né dipendenze runtime nel browser (server cooperativo Node con WebSocket). I principi sono ispirati ad Ashen Realm: le abilità dipendono dall’equipaggiamento. Il prototipo originale si chiamava Emberfall; il nome del gioco attuale è **Temper your soul**.

**Stato al 3 novembre 2026 · v0.11.01:** quattro dungeon con discese a otto tappe, tre classi, profili locali multipli, livelli/XP, mana, 25 famiglie di oggetti, GS e cooperativa autorevole fino a quattro giocatori. Mob e luogotenenti assegnano XP e hanno il 70% di probabilità di emettere oro, assorbito automaticamente dopo 0,5 s di emissione e 0,4 s di volo; il bottino degli oggetti resta sul boss finale. Attacchi base con animazioni Hi-bit proprie, senza particelle casuali al lancio/in volo; sangue, impatti, morti e buff conservati. Testi XP/oro da 16 px Silkscreen sopra il giocatore, HUB carbone/grigio/rosso con portale gotico animato e sprite C · Cacciatore d’ombre con equipaggiamento modulare per entrambi i corpi. Lupo dell’Arciere autonomo nella ricerca dei nemici, cursori Reliquiario personalizzabili e ostacoli Hi-bit della cripta integrati. Salvataggio v10, protocollo cooperativo 14: riavviare server e ricaricare i client. Verifica automatica: **872 test**, tipi e build; prova giocata della versione combinata ancora da confermare. Il permadeath non è implementato.

Aggiornamento locale del 2 novembre: hub condiviso, visite e inviti al party, partenza comune dal portale e scambi a doppia conferma. Salvataggio v10 e protocollo 13; dettagli e limiti in [game-design.md](docs/game-design.md#hub-condiviso-e-scambi--incremento-locale-2-novembre-2026). Il registro `.tools/trade-ledger.json` conserva le consegne pendenti e va mantenuto ai riavvii del server.

Aggiornamento v0.11.01 del 3 novembre: camera degli incontri con offset dinamico verso il mouse e inseguimento smorzato a ogni fotogramma, in singolo e cooperativa. Taratura provvisoria in `src/core/camera-offset.ts`: massimo 100 unità di mondo, velocità 8 s⁻¹. Mira convertita dalla vista effettiva, senza scossa; HUB con camera autonoma. Cursori Reliquiario, ostacoli e attacchi Hi-bit conservati. Verifica completa: 872 test, tipi e build; controllo tecnico Edge desktop/390 px su limite, assenza di deriva, movimento, mira, pausa/ripresa e resize. Prova giocata di fluidità, ampiezza, scatti e cooperativa ancora da confermare. Integrazione e push su main autorizzati dal proprietario, con eccezione esplicita alla regola di incremento BB: v0.11.01 anziché v0.12.00.

Modifica locale successiva: icona Party con comandi nel riquadro, inviti all’HUB e uscita dal gruppo separata da Torna in singolo. La sessione resta collegata passando al menu o facendo una run locale; un solo gruppo per istanza, non persistente dopo l’uscita di tutti o il riavvio server.

### Revisione PR #14 · 4 novembre 2026 · v0.11.03

Menu senza accessi in basso a destra; **Entra** avvicina la camera al cortile e materializza il personaggio al centro. Lo stesso artwork modulare diventa la mappa giocabile dell’HUB: servizi raggiungibili a piedi con collisioni condivise e portale animato. Il riquadro del personaggio apre la selezione dei profili; il party resta accessibile nell’HUB. Titoli, testi e controlli usano Silkscreen come XP e oro, per scelta esplicita del proprietario. [Dettagli e prova manuale](docs/hub-artwork.md).

**Protocollo 17:** riavviare il server e ricaricare tutte le schede. Salvataggi invariati. Incremento v0.11.03 per il ramo `feature/menu-rifugio` della PR #14, preparato su `codex/hub-artwork`; verifica automatica completata (930 test, tipi e build). Collisioni riferite ai piedi, sagome degli edifici e bordo interno del selciato; l’utente riferisce che le collisioni sembrano a posto nella sua prova. Forgia utilizzabile lungo il fronte, anche da sinistra. Etichette a risoluzione schermo ridotte di 2 px e canvas senza stiramento frazionario. Rimosso il tooltip persistente delle azioni del menu principale. Nuovo accesso, nuova misura dei testi e cooperativa da confermare giocando.

Il fabbro non è più un NPC separato nella piazza: aprendo la Forgia si trovano le schede **Forgia** e **Fabbro**, per creazione e migliorie con i prezzi già previsti.

## Prima di lavorare: istruzioni per collaboratori e agenti AI

Questa sezione si applica anche a **Claude, Codex e qualsiasi altro agente** che legga il repository. Il proprietario richiede esplicitamente sincronizzazione e aggiornamenti durante il lavoro.

1. **Prima di modificare qualsiasi file**, comunica in italiano cosa hai capito, cosa controllerai e quale incremento intendi fare. Leggi questo README, le istruzioni dell’agente ([CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md)), la [ripartizione dei compiti](docs/ripartizione-compiti.md) e i documenti pertinenti.
2. Controlla cartella, ramo e modifiche locali, poi **esegui un pull prima di iniziare nuove modifiche**:

   ```bash
   git rev-parse --show-toplevel
   git status --short
   git branch --show-current
   git pull --ff-only
   ```

   Il repository principale è [Jabbazz/temper-your-soul](https://github.com/Jabbazz/temper-your-soul), remote `origin`, ramo `main`. Il comando sopra usa l’upstream del ramo corrente; non puntare alla cieca `origin/main` da un altro ramo. Per creare un nuovo ramo di lavoro, aggiorna prima il ramo di partenza. Per Codex usa il prefisso `codex/`.
3. **Non proseguire ignorando un pull fallito.** Se manca l’accesso di rete, il ramo diverge o ci sono conflitti, comunica l’impedimento. Conserva il lavoro locale: niente reset distruttivi, force push o stash automatici delle modifiche altrui. Integra soltanto quanto autorizzato; chiedi una decisione se serve scegliere fra modifiche incompatibili. Su Windows assicurati di operare nel repository del progetto, non in quello eventualmente presente nella home dell’utente.
4. Durante il lavoro **mantieni aggiornato l’utente**: breve avanzamento almeno circa ogni minuto di lavoro attivo, con risultati, decisioni, problemi e cambi di direzione. Non limitarti a messaggi iniziali e finali. Non inventare verifiche o approvazioni manuali.
5. Procedi per incrementi piccoli. Prima di cambiare una parte leggine il codice; dopo le modifiche esegui `npm run verify`. Se cambi regole, aggiungi test significativi; se cambi la UI, controllala anche nel browser.
6. Aggiorna design, roadmap e bug quando cambiano decisioni o stato. Alla fine spiega cosa è cambiato, verifiche eseguite, limiti e prova manuale ancora necessaria.
7. **Commit e push solo su richiesta esplicita dell’utente**, con messaggio descrittivo in italiano. Prima di pubblicare ricontrolla `git status` e l’allineamento col remoto; se nel frattempo ci sono nuovi commit, integra in sicurezza e ripeti le verifiche pertinenti. Riporta ramo e hash pubblicato. Mai force push.
8. **Programmi esterni fuori dal repository.** Generatori, modelli locali, Blender, ffmpeg e simili si usano in una cartella di lavoro propria, fuori dal progetto; nel repository non si scrivono percorsi della propria macchina e si integra solo il risultato approvato dall'utente. Dettagli in CLAUDE.md/AGENTS.md, «Programmi esterni e file generati».

Quando due persone lavorano contemporaneamente, preferire rami distinti e modifiche coordinate: gli agenti non devono sovrascrivere il lavoro dell’altro collaboratore. Questo README è il punto di ingresso; i dati nel codice e [game-design.md](docs/game-design.md) descrivono le regole correnti. Le sezioni storiche della roadmap non annullano le decisioni più recenti.

## Avvio locale

### Versione e note di aggiornamento

Il menu mostra **v0.11.01** al centro in basso e **Changelog** in basso a sinistra, consultabile senza uscire dal menu. Versione e note sono incluse nella build; la fonte del numero è `package.json`. Gli agenti devono aggiornarle per ogni PR o commit diretto a main autorizzato, riportando anche i valori prima → dopo per il bilanciamento: [procedura completa](docs/versioning.md). Le note precedenti restano nello storico. La release v0.11.00 introduce le nuove animazioni delle primarie, elimina solo le loro particelle di lancio/scia e ingrandisce i premi mantenendo Silkscreen. Conservati i contributi delle PR #12 e #13 e le relative note.

Verifica della versione combinata: 872 test in 79 file, tipi e build superati. Controlli browser tecnici eseguiti; ritmo, leggibilità e prestazioni giocando ancora da confermare dall’utente.

Convenzione **vA.BB.CC**: da `v0.02.00` il nuovo feature parte a `v0.02.01`, poi ogni commit successivo passa a `.02`, `.03` e così via. Il merge in main incrementa BB e azzera CC (`v0.03.00`); i nuovi feature partono da quel main a `v0.03.01`. Anche un commit diretto autorizzato a main incrementa BB e azzera CC. Il primo commit del feature registra l’incremento di creazione, senza contarlo due volte; apertura della PR e push senza nuovi commit non aumentano il numero. La cifra A cambia solo su decisione esplicita. Dettagli su branch paralleli e note nella [procedura](docs/versioning.md).

Richiede **Node.js 22** e npm. Le versioni degli strumenti sono fissate nel lockfile: TypeScript 5.6.3, Vite 5.4.11 e Vitest 2.1.8. Non aggiornare le dipendenze incidentalmente a un’altra modifica.

```bash
git clone https://github.com/Jabbazz/temper-your-soul.git
cd temper-your-soul
npm ci
npm run dev
```

Apri l’URL stampato da Vite, normalmente **http://localhost:5173/** oppure **http://127.0.0.1:5173/**. Se la porta è occupata Vite può sceglierne un’altra: usa quella effettiva. Il processo `npm run dev` deve rimanere in esecuzione; un link locale non avvia da solo il server. Per una copia già esistente esegui prima il flusso di sincronizzazione sopra.

```bash
npm run build
npm run preview
```

La build è in `dist/`, con script classico IIFE e risorse locali: è pubblicabile su hosting statico e `dist/index.html` si può aprire anche con doppio clic. `dist/` non va committata. I salvataggi sono del browser/origine: `localhost`, `127.0.0.1`, un’altra porta e `file://` possono vedere dati differenti.

| Comando | Scopo |
| --- | --- |
| `npm run dev` | Server di sviluppo e ricaricamento automatico |
| `npm run typecheck` | TypeScript client e server, senza emettere file |
| `npm run server` | Server cooperativo + build statica su porta 4173, dopo `npm run build` |
| `npm run benchmark:network` | Confronto di traffico e decodifica: quattro giocatori, 40 secondi simulati |
| `npm test` | Suite Vitest headless |
| `npm run build` | Tipi e build di produzione |
| `npm run verify` | Tipi, tutti i test e build |
| `.\tools\verify.ps1` | Verifica su Windows; cerca anche l’installazione portatile locale di Node se disponibile |

## Cosa è implementato

### Personaggi, classi e inventario

- Profili locali multipli: creazione, selezione, annullamento della bozza e rimozione con conferma nominativa. Ogni personaggio ha inventario, equipaggiamento, XP e record separati; la selezione attiva viene salvata.
- Nome da 3 a 20 caratteri, sesso e classe scelti alla creazione. Nome, sesso e classe non sono modificabili dopo la conferma. Il sesso non è descritto nei riepiloghi del profilo, ma resta salvato per lo sprite.
- Classi: **Guerriero, Arciere, Mago**. Statistiche innate distinte e bonus passivi degli oggetti per classe; è l’oggetto a concedere la skill dello slot. Prima taratura provvisoria in `features/classes/`.
- Quattro slot: primaria, secondaria, armatura, stivali. Ogni nuovo personaggio riceve quattro pezzi **Comuni bianchi di classe**, livello oggetto 1, 20 GS ciascuno, già equipaggiati: **80 GS totali**. Queste varianti bianche non cadono dai boss.
- 25 famiglie con rarità Comune bianca, Non comune verde, Raro blu, Epico viola e Leggendario rosso. La rarità scala le skill; il livello oggetto entra attualmente nel GS, non aggiunge un secondo moltiplicatore alle skill.
- Classe richiesta su ogni famiglia: archi solo Arciere; spade, martelli e lance Guerriero; bastoni/scettri e globi Mago. Anche secondarie, armature e stivali hanno una classe specifica: vedere [item-classes.ts](src/features/items/item-classes.ts).
- Oggetti incompatibili più scuri, con classe richiesta nei dettagli. Niente equip da pulsante, clic destro o drag-and-drop. Restano selezionabili per leggerli, conservarli o scartarli. I vecchi pezzi incompatibili vengono rimossi dagli slot senza cancellarli dallo zaino.
- Zaino senza filtri per slot: ordinamento per rarità, tooltip, clic destro per equipaggiare, trascinamento sullo slot corrispondente, scarto con conferma. Gli oggetti equipaggiati non si scartano.
- Pulsante **Menu principale** in alto a sinistra, anche durante la partita: abbandona l’incontro senza premi aggiuntivi.

### Livelli, mana e gear score

- Livello iniziale 1, XP cumulativi per vittoria. Costo del passaggio di livello: `100 + 50 × (livello attuale − 1)`. Per ora salire di livello non concede bonus automatici di potenza.
- Mana massimo e rigenerazione dipendono dalla classe, più bonus degli oggetti e della rarità. Attacchi primari di tutte le classi gratuiti; le altre skill hanno un costo; senza mana non parte e non avvia la ricarica. Pausa e fine partita fermano la rigenerazione.
- GS per pezzo: `min(100, baseRarità + livelloOggetto − 1)`. Basi 20/40/60/80/100; livello oggetto 1–20. Esempi: Arco novizio bianco livello 1 = 20 GS; Arco del cacciatore verde livello 1 = 40 GS.
- GS del personaggio = somma dei quattro pezzi equipaggiati compatibili, massimo 400. Gli oggetti solo nello zaino non contano.
- HUD centrale in basso: vita rossa a sinistra, livello al centro, mana blu a destra, XP sotto e quattro icone skill in ordine **DX / SX / Q / E**.

I valori numerici di bilanciamento sono provvisori, salvo le richieste esplicite riportate nel design.

### Dungeon e bottino

| Dungeon | Boss | Pericolo | GS minimo | XP | Set principale | Livello set / verdi |
| --- | --- | --- | --- | --- | --- | --- |
| Cripta | Guardiano della cripta | T1 | Nessuno | 100 | Reliquie dell’ossario · Raro | 1 / 1 |
| Palude spenta | Madre delle spore | T2 | Nessuno | 180 | Custode dei rovi · Epico | 5 / 1 |
| Fucina in rovina | Colosso della fornace | T3 | **100** | 280 | Anima della fornace · Leggendario | 10 / 6 |
| Ghiacciaio eterno | Custode del ghiaccio | T4 | **200** | 400 | Cuore del ghiacciaio · Leggendario | 15 / 11 |

Mappe, ostacoli, schemi di attacco e sprite dei boss sono distinti. Movimento e cariche dei boss collidono con i pilastri; i teletrasporti atterrano fuori dagli ostacoli. Non c’è ancora pathfinding completo: un boss può fermarsi contro un pilastro se il giocatore resta esattamente dietro.

Le card hanno altezza uniforme, artwork composti da sprite effettivo e tema della mappa, pallini di pericolo della stessa misura e tooltip **«Loot rate %»** che segue il cursore. Gli ingressi T3/T4 sono bloccati anche nella logica di avvio quando manca GS.

**Bottino condizionato, uguale come struttura su tutti i boss:**

1. 25% di ottenere un oggetto, 75% di non ottenere nulla; massimo un oggetto per vittoria. XP e record vengono comunque assegnati alla vittoria.
2. Se l’oggetto cade: **1/3 set e 2/3 Non comune verde**, cioè 33,33% e 66,67%, normalizzati al 100%.
3. In ciascun gruppo ci sono quattro pezzi, uno per slot, con probabilità uguale del 25%.

Ogni singolo pezzo di set ha quindi **2,0833% per uccisione**; ogni singolo verde **4,1667%**. Il tooltip distingue ripartizione dopo il drop e probabilità complessiva per uccisione. Non confondere queste due percentuali. Non c’è filtro per la classe del giocatore: il grind comprende oggetti inutilizzabili dalla classe attiva.

Ogni boss ha **otto combinazioni esplicite** in [loot-tables.ts](src/features/loot/loot-tables.ts), non pesca liberamente dal catalogo. I set sono tematici: **nessun bonus al completamento del set**. La Cripta non supera il Raro. Le famiglie di origine di un set possono comparire altrove in variante verde; `exclusiveTo` indica l’origine storica, non sostituisce le tabelle effettive.

### Discesa: revisione della PR #4

La revisione locale della PR #4 mantiene mappe, 32 servitori a tema con élite, luogotenenti/pre-boss, Bestiario e scelta delle direzioni lungo otto tappe. **Nessuna ricompensa intermedia**: niente XP, oggetti, braci, cure a fine stanza, sigilli, tempre o Altare. Le skill restano quelle dell’equipaggiamento; solo il boss finale assegna gli XP e il bottino già previsti (25% di possibilità di un oggetto). La progressione tra stanze verrà progettata in un secondo momento.

Le tappe restano: Soglia → due direzioni di Scontro → Scontro/Prova/Reliquiario → Luogotenente → Santuario/Assedio → Scontro/Caccia → Anticamera → Boss. Reliquiario, Santuario e Anticamera sono stanze tranquille, senza premi o recuperi di vita. Le Prove mantengono gli obiettivi; completarli non assegna bonus.

Le porte mostrano il tipo di stanza: in cooperativa tutti i membri vivi devono sostare sulla stessa uscita. Il Bestiario conserva le uccisioni.

**Strumenti admin (provvisori, solo fase di sviluppo):** nel menu principale la tendina «Admin · sviluppo» è visibile a tutti finché `ADMIN_TOOLS_ENABLED` in `src/features/admin/admin-tools.ts` resta vero. Aggiunge allo zaino un pezzo di ogni famiglia della classe del personaggio, alla rarità scelta e al livello massimo, senza duplicare le famiglie già possedute a quella rarità; un secondo comando apre tutte le pagine del Bestiario con un'uccisione fittizia, conservando quelle vere. Le modifiche si salvano nel profilo e valgono anche per scambi e cooperativa: va spento o legato a un ruolo prima di una versione pubblica. Restano il Duello sbloccato dopo la prima vittoria e il Pellegrinaggio già presenti nella PR. Non sono disponibili gradi di tempra né menu a tendina per dungeon/modalità: la lobby usa pulsanti.

I vecchi campi del salvataggio relativi a braci/benedizioni/gradi sono conservati per non perdere dati, ma non attribuiscono bonus e non sono utilizzabili. Il protocollo 5 impedisce di mescolare client e server delle due versioni. Aggiornare tutte le schede dopo il riavvio.

Multiplayer: integrata la copia visuale `NetworkView`, che interpola camera, giocatori, boss, proiettili e servitori a ogni fotogramma senza modificare HUD, regole o premi autorevoli. Server 60 Hz e trasporto 30 Hz invariati; ritardo visuale provvisorio di circa 33 ms, nessuna predizione locale. Compatibile con stanze senza boss e luogotenenti. Integrati anche test della cache del pavimento, rune della Cripta fuori dalla cache e watcher Vite che ignora `.tools/` e `dist/`. La fluidità osservata dall’utente con una sola scheda per finestra non sostituisce una prova giocata della versione combinata.

Prossimo passo: prova manuale di porte, mappe, servitori e pre-boss in singolo/cooperativa; poi definire insieme la progressione fra stanze. Non rigenerare sprite o ritratti: revisione sospesa.

Verifica automatica della revisione: `npm run verify` superato, **555 test in 42 file**, tipi client/server e build. Le prove visive e giocate di questa revisione sono ancora a carico dell’utente.

### Multiplayer persistente

Il mondo richiede PostgreSQL e autenticazione configurati nel `.env`: seguire [mmo-persistente.md](docs/mmo-persistente.md) e `.env.example`. Dopo `npm run build`, avviare `npm run server` sulla porta 4173. In sviluppo avviare anche Vite: il proxy inoltra `/party`, `/online-config` e `/auth`. Il percorso `/party` è mantenuto per il trasporto WebSocket, senza codici di stanza o link di invito.

Dopo Accedi si entra nell’HUB comune. Il server verifica l’account e carica il personaggio da `profiles`; un account nuovo riceve livello 1 e set bianco di classe. Inventario, economia, premi e scambi sono validati e salvati sul server. Le istanze di dungeon sono pubbliche e accettano nuovi ingressi fino alla capienza. Il gruppo sociale non riserva posti in dungeon.

Per un tunnel puntare a 4173: la pagina servita dal tunnel stesso è ammessa senza aggiungerla ad `ALLOWED_ORIGINS`, che serve solo per pagine ospitate su un’altra origine; per i link di conferma email configurare anche gli URL di Supabase Auth. `npm run tunnel` avvia cloudflared e stampa l’indirizzo: non vengono più generati metadati o inviti per la vecchia lobby. Server e tunnel devono restare attivi. Il server serve soltanto `dist/`. In produzione sono necessari HTTPS/WSS e permessi appropriati sui dati.

Posizioni e istanze vivono nel processo; i profili persistono fra riavvii. Non sono ancora implementati shard, ripresa della run dopo disconnessione o permadeath. Configurazione locale e segreti non fanno parte del push.

### Ottimizzazione multiplayer (31 ottobre 2026)

- Protocollo ordinato v2: tuple compatte per personaggi/boss; tipi di proiettile/zona e nascite trasmessi una sola volta per incontro; dopo si inviano rimozioni. Posizione dei proiettili lineari e countdown sono ricostruiti dal tempo autorevole. La simulazione resta a 60 Hz, la rete a 30 Hz. Arrotondamento solo visuale delle coordinate/ricariche dei personaggi: errore massimo 0,005 unità; danni, HP e regole server invariati.
- Ogni frame è serializzato **una volta per stanza**, condiviso fra i membri; report/premi solo a fine incontro e trasmissione del mondo interrotta dopo l’esito. I delta non vengono saltati in silenzio: sequenza non valida o connessione troppo lenta provocano un’uscita esplicita. Dopo questo aggiornamento ricaricare la pagina; il server rifiuta client col vecchio protocollo con un messaggio di aggiornamento.
- Il client riutilizza proiettili/zone per id e applica al massimo uno stato per fotogramma, preservando gli eventi; gli esiti finali e il salvataggio non attendono il rendering di una scheda in background. Ogni ping aggiorna soltanto il badge, senza ricreare il party o interrompere il focus nella lobby.
- Gli sprite attuali vengono rasterizzati una volta per posa/equipaggiamento e disegnati con un’unica operazione per personaggio. Cache limitata a 256 fotogrammi per gestire quattro equipaggiamenti; eliminati array temporanei nel controllo delle collisioni e riutilizzate le descrizioni visive degli alleati. Nessun nuovo asset o cambiamento dello stile.

Benchmark ripetibile: `npm run benchmark:network`. Fixture sintetica di 40 secondi con quattro giocatori e Ghiacciaio in furia, fino a 226 proiettili, 1.200 aggiornamenti: **28.582.862 → 480.050 byte**, circa **−98,3%** rispetto agli snapshot completi. Test confrontano traiettorie, zone, rimozioni, eventi, cambio incontro e premi. I tempi di decodifica stampati dipendono dalla macchina e dal riscaldamento del runtime.

Confronto browser tramite tunnel, due Edge headless isolati a 1440×1000, finestra di 8 secondi: traffico ricevuto **889.719 → 51.553 byte (−94,2%)**, tempo CPU del thread principale **4.099 → 3.469 ms (−15,4%)**, tempo script **1.229 → 944 ms (−23,2%)**. Entrambe le versioni erano già a circa 60 FPS, senza frame oltre 25 ms nella finestra: non è una promessa di aumento FPS universale. Ulteriore prova con quattro browser/classi miste: circa **59,8 FPS**, due frame oltre 25 ms su 478. Le finestre reali non sono replay perfettamente identici; conferma della fluidità sul PC del giocatore ancora necessaria. Vittoria, report identico e premi personali verificati anche dopo il cambio di protocollo.

### Diagnostica FPS e completamento dell’ottimizzazione (1 novembre 2026)

Misure storiche precedenti all’integrazione delle stanze; non descrivono le prestazioni della versione combinata.

Il tasto **F2**, o il pulsante **FPS · F2**, apre un pannello facoltativo con FPS, tempo dei fotogrammi al 95° percentile, lavoro per frame, aggiornamenti di rete al secondo, traffico approssimato, RTT e costi del server. I dati server arrivano da `/health` soltanto quando il pannello è visibile e il client è in party. CPU server è una percentuale di **un core**, non il consumo totale del PC; il tempo del frame non misura direttamente il carico della GPU. Nessuna telemetria inviata a terzi.

La Cripta memorizza il pavimento in tasselli con cache limitata a 8 MiB per arena; torce animate e rune sono disegnate a parte. Completata la verifica di sei viste, inclusi bordi e coordinate frazionarie: **zero differenze di pixel** rispetto alla versione senza cache. Due test controllano riutilizzo, separazione fra arene e rimozione dei tasselli vecchi. Il caricamento audio limita a due le operazioni contemporanee; selezione delle piste e scritture di volume evitano lavoro ripetuto quando lo stato non cambia. Queste ottimizzazioni erano già integrate nel main; la ripresa ne completa verifica e documentazione.

Corretto un problema rilevato nelle prove Windows: il watcher di Vite includeva `.tools/` e poteva arrestarsi con `EBUSY` su file bloccati dei profili browser. Ora ignora `.tools/` e `dist/`. È un problema dell’ambiente di sviluppo/test, non una causa dimostrata del calo durante una partita sulla build pubblica.

Profilo della versione attuale: un browser con accelerazione grafica e un alleato simulato tramite socket, senza un secondo renderer sul PC. Circa **159 FPS in singolo e 165 in party**, frame p95 circa 6,2 ms; server circa **1,5–3,1% di un core**, passo p95 0,11–0,13 ms, invio p95 0,34–0,35 ms, rete 30 aggiornamenti/s e circa 6,3 KB/s nella finestra misurata. In questa prova il server non è risultato saturo e il calo segnalato non è stato riprodotto: non è una garanzia per altre reti, dungeon o carichi. La misura con F2 durante il problema reale resta necessaria; aggiornamenti del mondo a 30 Hz e FPS del canvas sono grandezze distinte. Questo profilo precede l’interpolazione implementata nel successivo incremento descritto sotto.

Verifica storica prima dell’integrazione: **484 test**, tipi client/server e build superati. Controllati il pannello desktop/mobile e la lettura dei dati server. Conferma giocata dell’utente ancora da ricevere. La prossima parte della progressione resta da concordare, senza modifiche implicite a XP, drop o permadeath.

### Archivio locale e profili online

I progressi online sono salvati soltanto dal server su PostgreSQL, con formato v10 e migrazioni precedenti conservate. I vecchi profili del browser restano archiviati sotto `temper-your-soul:save`; non vengono sovrascritti dalla sessione online e non sono importati automaticamente nel database. Restano le copie `:corrupt` e `:before-roster`, la validazione e le preferenze locali di audio e comandi.

`SaveStore` gestisce soltanto la raccolta locale con `loadRoster`/`saveRoster`; i vecchi metodi di lettura/scrittura del personaggio singolo sono rimossi. `server/storage/` gestisce caricamento, creazione e UPSERT autorevoli. Un salvataggio esterno invalido non viene sostituito silenziosamente con un profilo vuoto.

## Controlli

| Comando | Azione |
| --- | --- |
| WASD | Movimento |
| Mouse | Mira |
| Clic sinistro tenuto | Skill della primaria |
| Clic destro | Skill della secondaria |
| Q | Skill dell’armatura |
| E | Skill degli stivali |
| ESC | Chiude le finestre e torna al menu mantenendo la connessione |
| R | Ricomincia l’incontro durante una partita |
| M | Audio attivo/disattivo |
| F | Schermo intero |
| Tab tenuto | Mappa della discesa (solo in partita) |
| N | Minimappa della stanza sì/no |

I tasti di gioco non intercettano la digitazione nei campi della creazione. Le scorciatoie del browser con Ctrl/Meta/Alt restano disponibili.

## Direzione grafica e limiti attuali

**UI: C — Reliquiario**, tema globale rame/prugna, bordi asimmetrici e testi caldi. Anche i nuovi comandi devono usare questo tema. L’hover dei profili è scuro, senza fondo giallo o contrasto aggressivo.

**Sprite di gioco: C — Cacciatore d’ombre**, scelto dall’utente il 3 novembre 2026 e integrato localmente per i due corpi e le tre classi. Corpo su griglia 48 px in frame 64×64, camminata corretta e 25 famiglie di oggetti modulari con icone Hi-bit 32×32. **Ritratti: A — Fantasy compatto**, grandi e statici con equipaggiamento sovrapposto. Esistono basi e adattamenti maschili/femminili, icone oggetto e icone spell. Gli otto oggetti aggiunti per completare i set hanno effetti e rappresentazioni propri; i nuovi strati del ritratto sono disegnati nel codice. I PNG approvati sono in `src/assets/portraits/` e vengono serviti localmente.

**La revisione dei ritratti resta sospesa su richiesta dell’utente**. La nuova richiesta esplicita del 3 novembre autorizza invece gli sprite di gioco C e i relativi oggetti indossati, ridisegnati nel codice senza crediti di generazione. Vestibilità, prese, offset, proporzioni e profondità hanno ancora difetti noti. Non rigenerare né rifare i ritratti per ogni incremento: riprendere la loro revisione solo su richiesta esplicita, con un piano e criteri concordati. La scelta della direzione artistica non equivale all’approvazione della resa attuale.

**Mappe, boss, mob ed effetti:** tutti i dungeon si vedono in isometria 2:1; boss, luogotenenti, mob e tile vengono dal generatore locale; gli effetti delle skill delle tre classi sono fogli PNG a fotogrammi (`src/assets/vfx/frames/`). Il 5 novembre 2026 sono stati tolti la vista dall'alto dei dungeon, i fogli e i tile di terzi, gli atlanti PixelLab, il vecchio HUB disegnato nel codice e le pagine di anteprima, con i confronti `?vista=classica`, `?tile=classici`, `?mob=classici` e `?boss=classici` (restano nella storia Git). Se un'immagine non si carica resta la grafica a matrici nel codice.

Nessuna pagina di anteprima di sviluppo: si prova direttamente il gioco (`npm run dev`).

## Architettura e punti di ingresso

Organizzazione per funzionalità, test `*.test.ts` accanto al codice.

| Area | Responsabilità / file utili |
| --- | --- |
| `src/game.ts`, `src/main.ts` | Avvio, profilo attivo, schermate, ciclo, collegamento delle parti e premi |
| `server/index.ts`, `features/network/` | HTTP/WebSocket, stanze, autorizzazione leader, protocollo e snapshot; client di rete |
| `src/core/` | Vettori, RNG iniettato, input per azioni, camera |
| `features/character/` | Identità, creazione, inventario, progressione, raccolta profili e salvataggio |
| `features/items/` | Catalogo, classi richieste, rarità, skill e GS; `item-skills.ts`, `dungeon-item-skills.ts` |
| `features/loot/` | Pool espliciti per boss, tre estrazioni condizionate e probabilità condivise con la UI |
| `features/dungeons/` | Quattro dungeon e `dungeon-access.ts` per le soglie GS |
| `features/arena/`, `boss/`, `combat/`, `skills/`, `player/`, `match/` | Regole, collisioni, boss, mana, skill e simulazione |
| `features/presentation/` | Sprite, pose, effetti, look di proiettili/zone, mappe e registrazioni dei ritratti |
| `features/ui/` | Profili, inventario, card, tooltip, HUD e tema; regole delegate al dominio |
| `src/style.css`, `index.html` | Tema globale e struttura DOM |
| `src/testing.ts` | Supporto alle simulazioni deterministiche nei test |

I percorsi `features/` della tabella sono sotto `src/`. La logica avanza solo in **`Match.step(dt, intent)` in singolo / `Match.stepParty(dt, intents)` sul server cooperativo a 60 Hz**. La simulazione non conosce DOM, Canvas, tempo reale o `Math.random`: le regole casuali usano `Rng` iniettato. Dati, comportamento e rappresentazione restano separati; gli eventi descrivono cosa è successo e vengono ascoltati da effetti/audio/pose.

Per un nuovo oggetto servono: id stabile, famiglia e classe, skill/statistiche/costo mana, icona oggetto e spell, aspetto dei proiettili/zone/scatti, strati indossabili nelle due versioni di corpo e voce esplicita nei pool corretti. Non rinominare gli id già salvati. Rispettare la sospensione della revisione grafica: concordare eventuali nuove generazioni, senza introdurre fallback invisibili o usare solo l’icona dello zaino come vestito.

## Verifiche e prossimi passi

`npm run verify` deve uscire con codice 0. I **789 test attuali** coprono simulazione, contenuti, classi, salvataggi, profili, GS, raggiungibilità delle soglie e probabilità; il conteggio va aggiornato quando cambia. La suite è headless e **non certifica** DOM, aspetto, bilanciamento o sensazione di gioco. Sono stati eseguiti anche controlli browser isolati desktop/390 px; gli script temporanei locali non costituiscono una suite browser versionata.

Priorità per chi riprende il lavoro:

Il prossimo incremento richiesto riguarda un’altra parte della progressione del personaggio, **ancora da definire con il proprietario**. Non dedurre nuove regole di livelli, talenti, permadeath o ricompense da questa intenzione. La cooperativa è stata dichiarata funzionante dall’utente; la resa della versione ottimizzata sul suo PC resta da confermare.

1. **Conferma giocata della cooperativa:** provare con amici su reti diverse, classi miste e tutti i boss. Già verificati due browser isolati via tunnel: lobby, leader, movimento, skill, vittoria, report identico e salvataggio XP senza duplicazioni. Misura RTT su 40 campioni da questa macchina: locale mediana 0,34 ms / p95 1,20 ms; tunnel mediana 13,85 ms / p95 17,05 ms. La prova automatizzata con input validi non certifica bilanciamento o qualità della connessione da altre reti. Prossimi miglioramenti: predizione locale, rientro dopo disconnessione, server persistente e identità affidabili.
2. **Prova giocata dei tre personaggi sui quattro boss.** Verificare leggibilità, mana, collisioni, ritmo e progressione del grind. Riprodurre e registrare i problemi effettivi; distinguere verifica automatica, fotogramma e conferma manuale dell’utente.
3. **Bilanciamento di oggetti e progressione.** Tarare danni, cooldown, costi, livelli oggetto e difficoltà; mantenere la struttura di drop richiesta e le soglie GS salvo nuova decisione dell’utente. I test verificano che ogni classe possa raggiungere 100 GS prima di T3 e 200 prima di T4, non quanto sia divertente o lungo farlo.
4. **Progettare e implementare il permadeath nel prossimo incremento concordato.** Prima definire cosa viene perso, cosa succede al profilo morto e come si ricrea un personaggio. Non assumere inventario condiviso, eredità o nuove penalità non decise.
5. **Robustezza dei salvataggi:** esportazione/importazione e migrazioni future (le due schede si allineano già con l’evento `storage`). Il server cooperativo è già implementato, ma non conserva i progressi: un eventuale salvataggio cloud richiede un incremento dedicato.
6. **Debito noto:** raggi di collisione non uniformi, camera senza limiti e interpolazione del singolo ancora assente, limiti documentati dei backup. Valutare gli aggiornamenti delle dipendenze in un intervento dedicato; gli avvisi storici in `bugs.md` non sono una nuova scansione aggiornata.
7. **Grafica:** resta nella TODO, sospesa; non è il lavoro da riprendere automaticamente.

Leggere sempre [docs/game-design.md](docs/game-design.md) per decisioni e valori, [docs/roadmap.md](docs/roadmap.md) per priorità e prove, [docs/bugs.md](docs/bugs.md) per difetti e limiti. Aggiornare questi file con i risultati del prossimo incremento.

## File esclusi e prototipo storico

### Strumenti esterni (fuori dal repository)

Il repository contiene solo il gioco e i suoi risultati (sprite, fogli, audio). Generatori di immagini e audio, modelli locali, Blender, ffmpeg e gli altri programmi esterni si usano in una cartella di lavoro propria di ogni collaboratore, fuori dal repository; nel gioco entra solo il risultato approvato dall'utente. Regola completa in CLAUDE.md e AGENTS.md, sezione «Programmi esterni e file generati». Gli script usati fino al 5 novembre 2026 (ComfyUI, Blender, audio), i prompt e le pose di base degli effetti restano nella storia Git (`git log -- tools/arte tools/audio`). I file di dati generati (`generated-sprites.ts`, `blender-sprites.ts`, `boss-ia-layout.ts`, `tile-atlas-ia.ts`, `scenery-atlas.ts`, `src/assets/vfx/frames/manifest.json`) non si modificano a mano. In `tools/` restano solo gli strumenti Node del progetto (`verify.ps1`, `network-benchmark.ts`, `tunnel.mjs`, `cerca-risorse.mjs`, `arte/genera-cursori.mjs`).

`node_modules/`, `dist/`, `.tools/`, profili browser e screenshot temporanei locali non vanno pubblicati. Non committare credenziali, file `.env` o dati personali di test.

`legacy/emberfall-prototype/` conserva la bozza JavaScript originale, solo come riferimento storico: non fa parte della build né dei test. Il codice corrente si scrive in TypeScript dentro `src/` e `server/`.

### Interpolazione del multiplayer (1 novembre 2026)

Implementata `NetworkView`, una copia riservata alla rappresentazione: camera, giocatore, alleati, boss, proiettili e servitori interpolano le posizioni a ogni fotogramma fra gli stati ricevuti. Input, HUD, danni, collisioni, ricariche e premi continuano a usare lo stato autorevole. Le scie seguono le posizioni visuali; la mira locale resta agganciata al puntatore. Server a 60 Hz e trasporto a 30 Hz invariati.

Buffer visivo provvisorio di un aggiornamento (circa 33 ms); non è predizione del movimento locale. Scatti e teletrasporti vengono mostrati immediatamente, così come l’esito finale. Dopo oltre 250 ms senza aggiornamenti si riallinea la scena; senza nuovi dati si ferma all’ultima posizione confermata, senza inventare movimento o colpi. Valori regolabili in `NETWORK_VIEW`.

Verifica storica prima dell’integrazione: 484 test, tipi client/server e build superati. Sei nuovi test coprono posizioni intermedie, separazione dallo stato autorevole, alleati/boss/proiettili/servitori, arrivi irregolari, salti, interruzioni e fine partita. Nessun test visivo eseguito, su richiesta dell’utente: fluidità e ritardo percepito restano da confermare nella sua partita.

### Ruoli di classe: primo incremento (1 novembre 2026)

Con i quattro pezzi Comuni iniziali: Guerriero 200 HP, 40 difesa, 60 MP, movimento 173 u/s; Mago 95 HP, 2 difesa, 200 MP, movimento 179 u/s e +7% danno abilità; Arciere 120 HP, 10 difesa, 80 MP, movimento 212 u/s e +20% frequenza primaria. Numeri provvisori: i bonus degli slot crescono con la rarità x1/1,2/1,5/2/3, il livello oggetto continua a influire solo sul GS. Difesa: danno ricevuto = danno × 100/(100+difesa). HP e mana sono coerenti fra stanze, server e replica visuale. Protocollo 6: riavviare il server e ricaricare le schede.

Le skill di classe sono state implementate nella revisione seguente; resta da completare la taratura generale dei boss e la prova giocata.

Verifica di questo incremento: 578 test, tipi client/server e build superati; mutazione temporanea della difesa rilevata dai test e ripristinata. La verifica browser del ramo non è riuscita: il browser integrato va in timeout sul server di sviluppo 5181. Nessuna prova visiva o giocata dichiarata per questi cambiamenti.

### Skill e oggetti di classe aggiornati

- **Guerriero:** SX fendente con taunt e cancellazione proiettili ordinari; DX parata che assorbe un colpo, anche rosso; Q difesa/rigenerazione; E carica fisica con urto e collisione con pilastri.
- **Mago:** primaria con 15% di stato elementale, secondarie elementali, armature con magie canalizzate o buff; E blink con esplosione immediata. Quattro stati applicati: bruciatura, rallentamento dell’acqua, radicamento della terra, esposizione al vento.
- **Arciere:** SX gratuito con marchio e penetrazione scudo; DX buff di frequenza e furto vita; Q lupo che segue, attacca il marchio e salta al prossimo bersaglio dopo una uccisione, con 20% di sanguinamento per morso; E due cariche di corsa.

Oggetti esistenti aggiornati senza reset o migrazione: basta ricaricare e avviare una nuova partita. Icone della barra ridisegnate nel codice, effetti e suoni collegati. Protocollo 7: riavviare il server cooperativo e ricaricare tutti i client. Il boss annuncia un nuovo colpo rosso distinto: non viene cancellato dal fendente e supera l’invulnerabilità ordinaria, ma si evita muovendosi o si assorbe con la parata. Danno base 100, preparazione 1,1 s; numeri provvisori.

Verifica aggiornata: 599 test, tipi e build; controlli browser su barra e Q delle tre classi. Conferma giocata ancora necessaria. Restano fuori da questo incremento l’aumento generale degli HP dei boss, la velocità/danno dei loro colpi ordinari e la scalatura HP uniforme del party.

Versione main di questo incremento: **v0.03.00** (package `0.3.0`). Punti aperti e prove ancora necessarie restano nella roadmap; la pubblicazione non costituisce approvazione del bilanciamento o conferma giocata.

### Correzione in sviluppo · v0.03.01

Danni interi per difetto dopo tutti i modificatori: niente arrotondamento soltanto grafico. HP, eventi, numeri e report usano lo stesso intero effettivo; rimosso l’arrotondamento anticipato dalla rarità. Rigenerazione e furto vita conservano le frazioni internamente e recuperano HP interi. Verifica: 605 test, tipi e build; conferma giocata ancora necessaria. Nessun cambiamento a drop, XP o salvataggi; gli altri punti aperti restano nella roadmap.

Versione main della correzione dei danni: **v0.04.00** (package `0.4.0`), con cronologia precedente conservata. Restano aperte le prove giocate e la taratura dei boss e dei piccoli danni periodici.

## VFX delle classi · versione 0.5.0

Animazioni PixelLab locali e particelle WebGL con ripiego Canvas 2D; nuove icone con il budget residuo. Autorizzazione specifica del proprietario del 1 novembre 2026. Dettagli, copertura e prove manuali ancora necessarie: [VFX PixelLab](docs/vfx-pixellab.md). Studio animato con Vite: `/vfx-preview.html`.

## Incremento locale 0.5.1

Prima taratura correttiva: Mago più potente e rapido nei proiettili, primaria gratuita; Arciere leggermente meno rapido; nessuna protezione automatica dopo un colpo; quattro boss con HP triplicati. Tutti i valori prima/dopo nel changelog, con dettagli in game-design. Il pulsante Audio diventa un ingranaggio Impostazioni con schede Associazione tasti e Audio. Le associazioni delle quattro skill si salvano per browser e si riflettono su HUD e inventario. Lingua e altre impostazioni saranno aggiunte in seguito. Nuova conferma giocata dell’utente ancora da ricevere.


## Progressione dei mob e rifugio · incremento locale 2 novembre 2026

Decisione del proprietario: i mob assegnano XP e hanno il **70%** di possibilità di lasciare oro a terra. Raccolta automatica entro 30 unità, anche durante il combattimento. Valori provvisori per mob (incluso il luogotenente): T1 4 XP / 3 oro, T2 7 XP / 6 oro, T3 10 XP / 9 oro, T4 14 XP / 12 oro. Le autoesplosioni e la rimozione dei servitori non assegnano premi. Il bottino e gli XP dei boss restano aggiuntivi e invariati. In cooperativa ogni membro ottiene XP interi e raccoglie una quota personale da ciascun mucchio; nessun doppione da snapshot ripetuti.

L’oro appartiene alla raccolta dei profili del browser, non al personaggio: resta dopo sconfitte, cambi e rimozioni dei profili. Non è un account cloud. XP e oro raccolti si salvano durante la run. Il permadeath rimane futuro: per ora la sconfitta continua a conservare anche il personaggio e gli oggetti.

Ogni livello dopo il primo concede **+3 HP massimi, +2 MP massimi, +1 difesa, +1 punto percentuale al moltiplicatore di attacco**. Nessuna cura o ricarica automatica al level-up. Curva XP esistente invariata. Il profilo in partita mostra statistiche a sinistra, ritratto equipaggiato al centro, nove caselle a destra (pagine da nove per gli zaini storici più grandi, nessuna perdita o limite retroattivo). In singolo apre la pausa; in cooperativa il mondo continua.

Il rifugio si apre dal menu: WASD per muoversi, **E per interagire** nelle vicinanze. **Scatto predefinito: E → Spazio**; migrazione della vecchia preferenza su E, preservate le altre associazioni valide. Portale animato verso la scelta raid, deposito personale, forgia, fabbro umanoide con incudine e mercante. Riuso delle immagini esistenti, nessuna rigenerazione.

Servizi provvisori: mercante 30 oro per pezzo Comune di classe; forgia 120 oro per creare un pezzo Non comune delle quattro famiglie iniziali di classe, senza materiali in questo incremento. Fabbro: costo 60 × prossimo grado in oro, da +0 a +5; ogni grado aggiunge il 5% delle statistiche passive originali dell’oggetto e +2 punti percentuali al moltiplicatore di attacco. Non cambia la rarità né la scalatura storica del livello oggetto/GS. Deposito personale, nessun oggetto equipaggiato trasferibile: identità e migliorie conservate. Eventuale deposito condiviso, materiali/ricette, bilanciamento e destino degli oggetti depositati col permadeath restano punti aperti.

Salvataggio **v8**, migrazione dei roster v6/v7 e dei personaggi storici; oro di partenza 0. Protocollo cooperativo **9**: riavviare il server e ricaricare tutti i client. Nessun commit o push in questo incremento. Controllo visivo non completato: timeout del browser integrato su localhost e Computer Use interrotto perché non riesce a verificare l’URL di Opera. Nessuna conferma giocata.

Verifica automatica dell’incremento: 752 test in 62 file; prova di mutazione della soglia RNG rilevata (inclusione errata di 0,7) e ripristinata. Tipi e build verificati con `npm run verify`. Prova visiva e giocata ancora necessarie.


### Rifugio cittadino a schermo intero · revisione 2 novembre 2026
Su richiesta del proprietario, sostituita la prima rappresentazione DOM con una vera mappa Canvas a tutto viewport, camera limitata ai confini e raster pixel art con campionamento nearest-neighbor. Nessun titolo o cornice sopra la mappa. Selciato procedurale, mattoni, tetti in ardesia, case perimetrali, casse, griglie, muschio e torce; nessuna risorsa generata o scaricata. Moodboard Ashen Realm usata esclusivamente come riferimento di atmosfera.

Sprite del giocatore e del profilo ottenuti dallo stesso compositore `characterPixels(..., 'game')` della partita, inclusi equipaggiamento, idle e camminata. Ritratti e sprite approvati non modificati. Punti di interesse in pixel art provvisoria: portale con rune animate, deposito con riflesso, forgia con fuoco/fumo, fabbro umanoide con martello/scintille e incudine, mercante animato dietro il bancone.

Case, casse, NPC e strutture hanno collisioni nella simulazione pura del rifugio; passi suddivisi per evitare attraversamenti e scorrimento lungo le superfici. Velocità provvisoria 148 unità/s, raggio giocatore 9 unità, prossimità per E 62 unità. Tooltip contestuale accanto al punto d’interesse, visibile solo entro tale distanza e senza un dialogo aperto. Servizi, costi, oro e progressione invariati.

Verifiche automatiche: collisioni di tutte le strutture, tentativo di attraversare il mercante, moto lungo i muri, raggiungibilità dei cinque punti dalla partenza e griglie dei fotogrammi NPC. Controllo visivo desktop nel browser riuscito su porta 5176; questo supera il precedente impedimento di accesso al server locale, senza costituire una prova giocata dell’utente. Da confermare a mano: qualità visiva rispetto alla moodboard, ritmo delle animazioni, movimento e suggerimenti E sui diversi schermi.


### Zaino, deposito e servizi nello stile del menu · 2 novembre 2026
Pulsante con la sola icona dello zaino nel rifugio (stesso sprite e stile Reliquiario del menu), apre il personaggio con il ritratto illustrato già usato dall’inventario, le statistiche, i quattro slot equipaggiati e lo zaino da nove caselle per pagina. La rappresentazione nella mappa resta lo sprite di gioco. Rimozione, doppio clic e clic destro permettono di modificare l’equipaggiamento solo nei pannelli dell’hub; il profilo di combattimento resta consultivo.

Il deposito apre contemporaneamente due pannelli: 20 caselle a sinistra (4 colonne × 5 righe) e personaggio/zaino a destra. Posizioni persistenti, trasferimenti con puntatore mouse/tocco; alternativa tramite selezione e Sposta o doppio clic. Caselle occupate rifiutate; pezzi indossati da rimuovere prima di riporli; nessun rimpiazzo automatico. Lo spostamento fra caselle libere del deposito è supportato. Capienza massima 20; eventuali oggetti oltre limite provenienti dall’incremento precedente restano conservati e recuperabili. Lo zaino conserva la paginazione dei dati esistenti.

Pannelli, pulsanti, bordi, colori e font riutilizzano gli stili del menu. Mercante, fabbro e forgia mostrano gli sprite esistenti degli oggetti, rarità, GS e tooltip condivisi con l’inventario; costi e regole economiche invariati. Nessuna rigenerazione di asset.

Salvataggio **v9** per le posizioni del deposito, con migrazione v8 e precedenti e oro del roster conservato. Protocollo **10** impedisce di mescolare client incapaci di leggere il nuovo formato del personaggio: riavviare server e ricaricare le schede.

Verifica automatica: **764 test in 65 file**, tipi e build tramite `npm run verify`. Mutazione temporanea del controllo sulle caselle occupate rilevata dal nuovo test e ripristinata. Verifica browser desktop: ritratto originale, deposito e zaino affiancati, drag-and-drop nei due sensi, salvataggio dell’oggetto nella casella 12 dopo ricaricamento, offerte con icone di mercante/fabbro/forgia. Queste sono prove automatiche del browser; conferma giocata dell’utente e prova su touch/responsive restano da fare. Nessun commit o push.


### Pubblicazione del ramo · v0.05.01
Primo commit di `codex/bilanciamento-impostazioni`: taratura del combattimento, impostazioni, progressione dei mob, oro condiviso, rifugio cittadino, servizi e deposito da 20 caselle. Changelog del menu aggiornato per l’intero incremento, incluse le variazioni prima → dopo. Versione package/lock `0.5.1`, salvataggio v9 e protocollo 10. Verifica completa e prove browser desktop; prova giocata della versione combinata e touch/responsive ancora da confermare.


### Integrazione main · v0.06.00
Su richiesta esplicita del proprietario del 2 novembre 2026, il lavoro completo viene integrato e pubblicato direttamente su `origin/main`, nel repository `Jabbazz/temper-your-soul`, senza fork né PR. Questa preferenza sostituisce il precedente flusso tramite fork indicato nella skill locale. Destinazione predefinita del push: origin. Versione package/lock `0.6.0`; changelog main con riepilogo completo e storico v0.05.01 conservato. Salvataggio v9 e protocollo 10; riavviare server cooperativo e ricaricare i client.


### Correzione locale 0.7.2 · ritmo dei colpi nemici
Contatto fisico con recupero per nemico/bersaglio (mob 0,8 s; boss/luogotenenti 1 s), cariche incluse, senza reintrodurre invulnerabilità dopo il danno. Orb consumati al primo impatto; collisione anche lungo il tratto percorso per i colpi veloci. Danno per colpo invariato. Changelog con storico conservato; cadenze provvisorie da confermare giocando.


### Menu e Bestiario · 2 novembre 2026
Preparazione locale v0.08.00 su main allineato a 4082d46: barra HUD persistente, party senza pausa, Bestiario per dungeon solo con mostri scoperti e menu iniziale senza zaino. Include i precedenti cambi locali di contatto, orb, HUB condiviso e scambi; nessun commit o push eseguito.


### Pubblicazione autorizzata · v0.08.00
Incremento su main: HUD globale, navigazione e Bestiario per dungeon, accesso GS con avviso, audio delle anteprime senza caricamenti dei dungeon, comandi party e correzioni dei colpi nemici. Card con maggiore separazione fra riferimenti e azioni. Piano sprite incluso come preparazione rinviata, nessuna generazione. Verifica completa automatica; controllo visivo e prova giocata della versione combinata ancora da confermare (browser integrato in timeout). Protocollo 13: riavviare il server e ricaricare i client.


Integrazione finale v0.08.00: base aggiornata alla PR v0.07.03 (`95881c7`), menu Admin conservato. Distanza sotto Bestiario/Loot rate: 20 px. Pubblicazione su origin/main autorizzata dal proprietario dopo verifica completa.

### VFX Hi-bit · incremento locale 3 novembre 2026

Atlanti raster locali nel codice per le sedici animazioni delle tre classi, particelle aggiuntive al lancio e all’impatto anche con sprite pronti, sangue con gravità/macchie, schegge ed energia per materiali, cedimento e dissolvenza dei servitori abbattuti, emissioni continue per buff/scatti/stati anche remoti. Budget massimo complessivo 3.800 particelle; nessuna variazione delle regole o generazione consumata. Anteprima animata con Vite: `/vfx-preview.html`. Test automatici e fotogrammi raster; controllo nel browser impedito e conferma giocata ancora necessaria. [Dettagli, tarature provvisorie e prove da fare](docs/vfx-pixellab.md#revisione-hi-bit--incremento-locale-3-novembre-2026). Nessun commit o push.

### Etichette XP e HUB rosso · incremento locale 3 novembre 2026

Premi dei mob/luogotenenti visibili come `+N XP` in Silkscreen, sopra l’uccisione, con quota personale in party. Nuovo portale gotico Hi-bit rosso con vortice, rune e braci animate; palette dell’HUB su carbone, grigi e rosso fuoco. XP/ricompense e geometria invariati, nessuna generazione. Verifica completa: 821 test, tipi e build; controllo tecnico con Edge headless a desktop e 390 px. Prova giocata ancora da confermare. [Dettagli e limiti](docs/hub-rosso-xp.md). Nessun commit/push.

### XP sul giocatore, oro animato e lupo · incremento locale 3 novembre 2026

Gli XP ora compaiono sopra il giocatore e lo seguono. L’oro emerge dal mostro, dopo 0,5 s vola verso ogni destinatario vivo e viene assorbito in 0,4 s, senza raccolta per prossimità. Corretto il lupo fermo senza marchio: acquisizione autonoma, priorità al marchio conservata. Protocollo **14**: riavviare il server e ricaricare i client. Prototipi del personaggio autorizzati separatamente: `/sprite-prototypes.html`, tre direzioni A/B/C con maschile/femminile, tre classi e animazioni alla scala nativa. Nessuno sprite attivo sostituito. Verifica: 828 test, tipi e build, fotogrammi tecnici nel browser; prova giocata e scelta del prototipo ancora necessarie. [Dettagli](docs/ricompense-lupo-prototipi.md). Nessun commit/push.

Revisione dei prototipi: animazioni più ampie con falcate, ginocchia e braccia articolate, mantelli e attacchi in tre fasi distinti per classe. Dodici frame, margine per le armi, pausa sul fotogramma e cursore nella stessa pagina. Verifica aggiornata: 831 test, tipi e build; controllo browser desktop e 390 px. Ampiezza/ritmo e scelta A/B/C ancora da confermare dall’utente; sprite del gioco ancora in attesa della scelta.


### Sprite C ed equipaggiamento Hi-bit · 3 novembre 2026

L’utente ha scelto la terza proposta, Cacciatore d’ombre, e autorizzato l’integrazione e il rifacimento degli oggetti. Sprite C attivo in HUB, incontri e anteprime del personaggio. Passo con piede che avanza sollevato e arretra durante l’appoggio; ciclo invertito quando si arretra rispetto alla mira. Armi, armature e stivali delle 25 famiglie ridisegnati con prese comuni, articolazioni e profondità; icone 32×32 derivate dagli stessi disegni. Anteprima interattiva `/character-animation.html`, entrambi i corpi, tre classi e tutti gli slot/rarità. [Specifiche e verifiche](docs/sprite-c-equipaggiamento.md). Nessun commit/push.


### Cursori del tema · v0.10.01

Cursori pixel art rame e prugna al posto di quelli di sistema, generati da `tools/arte/genera-cursori.mjs` e dichiarati nelle variabili `--cursor-*` di `style.css`: freccia, mano, mano che afferra e mirino. Il mirino è il cursore del browser e compare solo sul canvas mentre si gioca (classe `aiming` sul body); rimosso il mirino disegnato nel mondo, che si sovrapponeva alla croce di sistema. Divieto e testo restano di sistema. Mira, regole, salvataggi dei personaggi e protocollo invariati.

Scheda **Cursore** nelle Impostazioni: sette colori provvisori in `features/settings/cursor-colors.ts`, ottenuti ricolorando i PNG nel browser, più un colore personalizzato con cursori R, G e B da cui si ricavano luce e ombra. La scelta si salva per browser (`temper-your-soul:cursor-color:v1`), come le associazioni dei tasti. Il menu principale nasconde ancora i comandi globali, ma ha un proprio pulsante **Impostazioni**. I test `cursors.test.ts` e `cursor-colors.test.ts` controllano file, misure, punti attivi e ricolorazione, non la resa: leggibilità dei colori sulle mappe e sensazione di mira restano da confermare giocando.


### Release v0.11.00 · attacchi base e premi leggibili

Solo le primarie perdono le particelle casuali al lancio e nella scia; sangue, impatti, uccisioni, buff, secondarie e gli altri effetti restano attivi. Nuovi sprite Hi-bit per fendente, freccia con onda del tiro e quattro elementi del Mago; XP e testo di oro assorbito a 16 px Silkscreen, con righe distanziate. Requisito Hi-bit/palette esplicito in AGENTS.md e richiamato in CLAUDE.md. Incremento isolato dal lavoro parallelo sulla camera e riallineato alle PR #12 e #13. [Specifiche, 862 test e prova tecnica del browser](docs/attacchi-base-hi-bit.md). Anteprima: `/vfx-preview.html`; prova giocata ancora da fare.

### Boss e luogotenenti con il generatore locale · v0.11.04, proposta

Sedici figure nuove fatte in locale con SDXL e Pixel Art XL, a fogli con camminata, attacco, furia, passaggio di fase e morte. Solo aspetto. Grafica generata con l'IA: da confermare con il proprietario. I vecchi boss si vedono con `?boss=classici`. Dettagli in [compito-grafica](docs/compito-grafica.md). Prova giocata ancora da fare.

### Mob e mappe gotiche con il generatore locale · v0.11.05, proposta

Tutti gli 88 mob e le mappe dei quattro dungeon fatti in locale con SDXL e Pixel Art XL, a un pixel per unità di mondo: facciate gotiche, portali, colonne e arredi diversi per ogni dungeon. Solo aspetto: collisioni, regole e salvataggi non cambiano. Grafica generata con l'IA: da confermare con il proprietario. Per confrontare: `?mob=classici`, `?tile=classici`. Dettagli in [docs/produzione-grafica.md](docs/produzione-grafica.md).

### Dungeon dall’alto · 9 novembre 2026

Cripta, Palude, Fucina e Ghiacciaio usano la stessa vista ortogonale nelle stanze e nelle arene dei boss. Il pavimento, le soglie, i ripari e le impronte dei combattenti seguono le coordinate della simulazione. Un pixel interno del canvas corrisponde a un’unità di mondo su ciascun asse. I vecchi parametri di confronto `?vista=classica` e `?tile=classici` sono superati. La camera conserva lo zoom di presentazione e l’inseguimento smorzato del cursore.

### HUB isometrico annullato · 5 novembre 2026

La piazza isometrica della v0.12.00 è stata annullata su richiesta dell'utente: l'HUB torna quello di prima, cioè la schermata principale con l'artwork modulare del cortile come mappa giocabile ([dettagli](docs/hub-artwork.md)). Sono stati rimossi la mappa e il renderer isometrici dell'HUB, gli sprite generati in `src/assets/art/hub-iso/` e gli script `tools/arte/genera_hub_iso.py` e `prepara_hub_iso.py`. La geometria dell'HUB cambia di nuovo rispetto alla v0.12.00: **protocollo 19**, riavviare il server e ricaricare tutte le schede.

### Strato WebGL con PixiJS · v0.16.00

Primo incremento della migrazione del disegno a WebGL con PixiJS 8.22.0, scelta dall'utente il 5 novembre 2026 al posto della regola «Canvas 2D, nessuna dipendenza runtime». PixiJS vive solo in `src/features/presentation/` (`webgl-renderer.ts`, `pixi-modules.ts`): simulazione, rete e `game.ts` non lo conoscono e i test senza browser non lo caricano. Durante la migrazione la scena resta in Canvas 2D; PixiJS disegna i suoi strati su una propria tela e li compone nel punto esatto dell'ordine di disegno, con la stessa trasformazione della camera, cosi' la profondita' resta quella della scena. Se WebGL manca o fallisce resta il disegno di sempre.

Primo strato: la morte dei servitori. La sagoma cade come prima e si sfalda con uno shader a rumore (`vfx/dissolve.ts`, `vfx/minion-dissolve.ts`): pixel d'arte interi, la testa per prima, orlo in brace per le creature, in cenere per ossa e costrutti, in energia per gli spiriti. La morte dura 0,8 s invece di 0,48 s, per lasciar vedere lo sfaldamento. Il pannello F2 mostra il disegno attivo (WebGL · PixiJS, in preparazione o Canvas 2D con il motivo). Valori provvisori in `DISSOLVE` e `COMBAT_VFX.deathLife`. Controllo tecnico in Edge senza interfaccia (WebGL software): lo shader compila e disegna i cinque stadi; nessuna prova giocata.

Scie dei colpi a distanza: particelle PixiJS in un solo `ParticleContainer` (`vfx/projectile-trails.ts` per emissione e moto, `vfx/trail-layer.ts` per il disegno), a passo fisso lungo il tragitto, colori a gradini per elemento, al massimo 1.600 vive. Controllo tecnico nel gioco vero con il mago che spara di continuo: 150–165 FPS, scena 1,2–2 ms. Per scrivere codice PixiJS gli agenti usano le skill ufficiali `pixijs-*` (`.claude/skills/pixijs/ORIGINE.md`).

Peso: il bundle passa da circa 1.449 a 1.983 KB (566 KB compressi) importando solo le parti di PixiJS usate. Prestazioni: **da misurare** con il pannello F2 giocando (FPS e tempi di disegno con molte morti a schermo); nessun numero e' stato misurato in gioco. Prossime fasi, da approvare: portare in PixiJS le altre parti della scena, poi luci dinamiche con normal map (le normal map vanno create fuori dal repository e approvate).
