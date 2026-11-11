# Canone grafico PixelLab

Direttiva del proprietario · 10 novembre 2026. Fonte unica per persone e agenti AI che producono grafica per **Temper your soul**. Sostituisce le precedenti direzioni artistiche, tavole di riferimento e ricette di produzione. I documenti grafici precedenti descrivono soltanto lo storico degli asset esistenti.

Questo incremento definisce il canone e il flusso di lavoro: non genera immagini e non certifica che gli asset attuali siano già conformi. Il rifacimento avverrà per lotti richiesti dall'utente.

## Strumento di produzione

- **PixelLab, tramite l'MCP integrato nel progetto, è lo strumento obbligatorio per creare o modificare sprite, equipaggiamenti, tile, scenari, immagini, icone, cursori, illustrazioni, VFX raster e componenti grafici della UI.** Anche i ritocchi ai pixel passano dagli strumenti PixelLab, inclusi i workbench quando adatti.
- Non usare altri generatori, rendering 3D, editor di immagini, pacchetti grafici di terzi o disegni procedurali in codice come alternativa per produrre queste immagini. Gli asset già presenti rimangono utilizzabili durante la migrazione; non diventano riferimenti artistici per nuove produzioni.
- Se PixelLab manca nell'ambiente del collaboratore, avvisare: **«Per mantenere il canone del progetto è consigliato usare PixelLab tramite l'MCP integrato. Collega PixelLab prima di produrre nuovi asset grafici.»** Proseguire con specifiche e codice indipendenti dagli asset; non sostituire di nascosto lo strumento. Una deroga richiede una nuova indicazione esplicita del proprietario.
- Impaginazione DOM/CSS, accessibilità, testi, composizione dei layer, caricamento e rendering restano codice del gioco. Conservare i font approvati, incluso Silkscreen: PixelLab produce la grafica dell'interfaccia, mentre etichette e testi localizzabili restano testo reale.
- PixelLab è uno strumento di sviluppo: il gioco distribuisce asset locali, senza chiavi né chiamate al servizio nel browser. Questa direttiva riguarda la grafica; non cambia le regole dell'audio.

## Identità fantasy

Lo stile è **fantasy medievale**, anche nei corpi base e negli abiti iniziali: tuniche, mantelli, cappucci, cuoio, lacci, cinture, bracciali e stivali devono rendere leggibile la classe. Niente jeans/denim, canottiere o T-shirt moderne, cerniere, scarpe da ginnastica o dettagli contemporanei. Una base modulare indossa abiti semplici fantasy: la modularità non giustifica un aspetto moderno o privo di identità.

Per l'**Arciere**, dopo il chiarimento del proprietario del 10 novembre 2026: **arco nella destra anatomica e faretra sulla schiena**. La faretra equipaggiata è uno strato posteriore, non un oggetto da tenere in mano. Durante il tiro la sinistra tende la corda. Negli altri casi la regola generale sulle mani resta valida. Gli indossabili restano separabili e cambiano con gli slot effettivamente equipaggiati.

L’Arciere maschio mantiene **il cappuccio alzato in tutte le otto viste e in ogni fotogramma**, anche in SE e durante il tiro. Busto, cintura, gambe e stivali devono avere sagome complete e collegate: i ritagli degli arti non possono cancellare porzioni degli abiti. Nelle viste posteriori il mantello copre le braccia che passano davanti al torace; nessun avambraccio o mano deve apparire sulla schiena. HUB, partita e anteprime devono condividere queste stesse sagome e profondità.

## Vista, pixel e misure

| Risorsa | Requisito |
| --- | --- |
| Mondo, HUB e dungeon | 2D top-down ortogonale, stessa vista e scala visiva tra ambiente e attori |
| Personaggi e nemici, inclusi boss | Ogni fotogramma nativo è **64×64 px**, con sfondo trasparente |
| Equipaggiamenti indossati | Layer trasparenti **64×64 px**, registrati sui fotogrammi del corpo |
| Tileset e mappe | Ogni tile è **64×64 px**; le mappe sono composizioni su questa griglia |
| Fogli e atlanti | Possono essere più grandi: ogni cella di sprite o tile resta 64×64, senza ridimensionamenti frazionari |
| Icone e moduli UI | Stessa pixel art e palette; icone su cella 64×64. Pannelli e immagini composte hanno dimensioni dichiarate nel brief, con bordi alla stessa densità di pixel |

Niente isometria, prospettiva inclinata del terreno, asset 3D o pittorici. Pixel interi, contorni nitidi, campionamento nearest-neighbor; niente sfocatura o antialiasing incorporati nei raster. Stessa densità di dettaglio, proporzioni e direzione della luce tra richieste. Il primo campione approvato fissa l'inclinazione della vista top-down e l'illuminazione da riutilizzare.

La cella 64×64 non impone che la sagoma riempia il riquadro: lasciare spazio per movimento, armi e morte senza tagli. Non trasformare automaticamente un tile in una hitbox da 64 unità: scala di presentazione e collisioni della simulazione restano distinte. Dimensioni dello schermo e della mappa completa non sono limitate a 64×64.

## Palette condivisa

Conservare la palette attuale, senza riprendere le vecchie tavole stilistiche: dark fantasy cupo, materiali carbone, cenere, pietra, ferro, cuoio e tessuto scuri; cremisi e rosso fuoco come accenti localizzati. La pelle conserva colori naturali. Evitare superfici interamente luminose e filtri rossi applicati a tutto il personaggio.

La base dell'ambiente proviene da `src/features/presentation/hub-palette.ts` (`HUB_COLORS`):

| Uso | Colori esistenti |
| --- | --- |
| Nero e ombra | `#0c0b0e`, `#101014`, `#1b191d` |
| Pietra e cenere | `#353436`, `#49474a`, `#686569`, `#8a8081` |
| Ferro | `#28272b`, `#655f63` |
| Cremisi e fuoco | `#40121c`, `#8d2431`, `#cf3c3b`, `#f05b3c`, `#ffad72` |
| Testo chiaro | `#ddd1c9` |

Materiali dell'equipaggiamento e accenti per elemento provengono da `src/features/presentation/shadow-equipment.ts`. Leggere le voci pertinenti e includere i relativi codici esadecimali nel brief: fuoco, acqua/ghiaccio, terra/natura e vento/energia restano distinguibili. Non ridurre ogni elemento al rosso. I dungeon condividono la base e differiscono per materiali e accenti già associati al loro tema.

Passare la palette esplicita ai tool che la supportano; negli altri inserirla nel brief e verificarla sull'output. Un prompt non garantisce il rispetto dei colori. Un'estensione della palette va proposta al proprietario prima di diventare riferimento per altri asset. In caso di variazioni future, i file di palette del gioco sono la fonte dei valori.

## Personaggi ed equipaggiamento modulare

- Personaggi giocanti e nemici hanno **otto direzioni**: `south`, `south-west`, `west`, `north-west`, `north`, `north-east`, `east`, `south-east`. Registrare esplicitamente l'ordine nell'atlante; adattare i nomi all'API senza dedurlo dall'indice.
- Il corpo base deve poter indossare tutti gli equipaggiamenti compatibili con quel corpo e con la classe. Non incorporare definitivamente l'armatura o l'arma nel corpo. I vincoli di classe del gioco rimangono validi.
- Ogni pezzo equipaggiato deve cambiare l'aspetto dello sprite in gioco; rimuoverlo ripristina la parte base. Preparare layer distinti per i pezzi e gli slot effettivamente supportati, estendibili a nuovi pezzi senza rigenerare tutte le combinazioni complete.
- **Mano primaria sempre destra anatomica; mano secondaria sempre sinistra anatomica**, indipendentemente dalla direzione dello sguardo e dal lato dello schermo. Vale per armi, scudi, tomi e altri oggetti secondari tenuti in mano. La faretra dell’Arciere resta sulla schiena e segue il suo slot senza occupare la sinistra. Nelle armi a due mani la destra mantiene la presa primaria e la sinistra il supporto; questo non introduce nuovi slot o regole di equipaggiamento.
- **Non specchiare l'intero personaggio equipaggiato per ottenere le direzioni mancanti:** scambierebbe le mani. Un eventuale riuso di parti simmetriche deve mantenere anatomia, impugnature e luce corrette, verificabili nella composizione finale.
- Per ciascun corpo, direzione e animazione condividere griglia, pivot ai piedi, proporzioni, pose, numero di frame e tempi tra base e layer. Documentare agganci di mani, spalle, busto e piedi; le coordinate si fissano sul primo campione approvato, non si inventano per ogni oggetto.
- Gestire gli strati anteriori e posteriori secondo posa e direzione: braccia, impugnature, lama, scudo e mantelli devono poter passare davanti o dietro al corpo. Nessun ritaglio deve cancellare dita, volto o pezzi di equipaggiamento.
- HUB, combattimento e anteprima dello sprite devono utilizzare lo stesso contratto di composizione. Le icone devono rappresentare lo stesso oggetto, ma non sostituiscono i layer indossabili.

## Impugnature, postura e uso delle armi

Ogni arma deve essere impugnata nel suo punto di presa reale e seguire mano, polso e braccio. Non basta incollare un’immagine ruotata vicino al personaggio. Dimensioni, baricentro, inclinazione a riposo e gesto devono risultare plausibili nelle otto direzioni. Annotare impugnatura e agganci nei metadati; non spostare l’arma fuori dalla mano per farla rientrare nel frame.

**Arciere:** destra sull’impugnatura centrale dell’arco, sinistra sulla corda; faretra fissata alla schiena con le frecce visibili sopra la spalla. A riposo e durante la camminata, arco abbassato e inclinato naturalmente verso il basso. Nel tiro: sollevamento, braccio dell’arco che si distende, sinistra che tende la corda verso il viso, rilascio e recupero. Corda e flettenti devono reagire al gesto; nessuna arma sospesa, presa sulla corda al posto dell’impugnatura o arco permanentemente verticale a lato del corpo.

Per nuove armi o pose, studiare riferimenti anatomici reali prima della produzione PixelLab, adattandoli alla classe e alla visuale del gioco. Le foto sono riferimenti del gesto, non fonti per lo stile o asset da importare. Riferimenti consultati il 10 novembre 2026: [Online Archery Academy: impugnatura, corda e arco abbassato](https://www.onlinearcheryacademy.com/archery-hand-position-set/), [World Archery: mano dell’arco e componenti](https://www.worldarchery.sport/fr/node/101217), [ODFW: presa e trazione](https://myodfw.com/learn/tip/gripping-and-shooting-bow). Le pose d'esempio vanno adattate per mantenere l'arco nella destra anatomica scelta dal proprietario.

Chiarimento del proprietario, 11 novembre 2026: **a riposo la corda dell’arco sta sul lato superiore e il corpo in legno/impugnatura sul lato inferiore**. Ribaltare il solo oggetto dove serve, senza specchiare il personaggio o scambiare le mani. La sinistra segue la nuova posizione della corda; nel tiro l’arco conserva l’orientamento verso il bersaglio.

## Animazioni

Ogni nemico, inclusi mob, luogotenenti e boss, deve avere **attacco e morte animati in tutte e otto le direzioni**. Produrre anche riposo e movimento per le entità che si muovono. Il contratto dei personaggi giocanti comprende riposo, movimento, attacchi e morte; gli equipaggiamenti seguono tutte le pose utilizzate.

Attacco leggibile con preparazione, colpo e recupero; morte riconoscibile e con conclusione stabile. La morte è una sequenza dedicata, non soltanto la sparizione del primo frame. Durata, numero di fotogrammi, frequenza e loop sono dichiarati per ogni animazione e mantenuti uguali nei relativi layer. Nessun numero di frame o FPS globale è deciso da questa direttiva.

Le animazioni rappresentano gli eventi della simulazione: non decidono quando applicare danni, non aggiungono hitbox e non cambiano velocità, gittate o ricariche. Gli effetti runtime già esistenti possono restare; un nuovo VFX raster segue PixelLab.

## Tileset e costruzione delle mappe

- Pavimenti, pareti, bordi, angoli, passaggi, acqua e decorazioni usano celle native 64×64, allineate alla stessa griglia nelle mappe dell'HUB e dei dungeon.
- I terreni ripetibili devono essere **seamless** sugli assi orizzontale e verticale. Le transizioni fra materiali devono avere bordi e angoli compatibili; non basta che due texture siano seamless separatamente.
- Produrre varianti che condividano bordi, scala dei materiali, palette e luce per evitare cuciture, scacchiere evidenti e cambi di densità. Gli oggetti estesi si compongono di celle 64×64 registrate, senza stirare un tile.
- Controllare una composizione ripetuta almeno 3×3 e una piccola stanza con transizioni, angoli interni/esterni, porte e ostacoli. Percorsi e limiti percorribili devono risultare leggibili.
- Conservare identificativi dei tile, adiacenze, ordine nell'atlante e origine della griglia nei metadati. Una mappa nuova riusa il tileset approvato; una nuova richiesta non riparte da una palette o una vista diversa.

## Brief comune da passare a PixelLab

Compilare questo brief per ogni richiesta, allegando soltanto riferimenti approvati secondo questo canone:

```text
Progetto: Temper your soul. Canone PixelLab del 10 novembre 2026.
Stile fantasy medievale leggibile: abiti, materiali e sagoma coerenti con la classe;
niente jeans, denim, T-shirt, canottiere o dettagli moderni.
Grafica 2D top-down ortogonale in pixel art; pixel netti, niente isometria,
3D, aspetto pittorico, blur o antialiasing. Palette dark fantasy condivisa.
Risorsa e id: [soggetto, ruolo e id stabile].
Dimensioni: [sprite/layer: frame 64x64; tile: 64x64; composizione UI: misure].
Palette esatta: [hex dalla base e dagli accenti pertinenti del gioco].
Riferimenti canonici: [id PixelLab o immagini approvate; stessa vista,
proporzioni, luce e densità di dettaglio].
Attori: otto direzioni; primaria nella destra anatomica, secondaria nella
sinistra anatomica per gli oggetti tenuti in mano. Arciere: arco a destra,
faretra sulla schiena e sinistra che tende la corda. Non specchiare la composizione.
Modularità: [corpo di riferimento, parte separata, agganci, layer davanti/dietro].
Impugnatura e gesto: [punto di presa reale, postura a riposo, mani e riferimento anatomico].
Arciere: destra sull’impugnatura, sinistra sulla corda, arco abbassato/inclinato
a riposo; faretra sulla schiena.
Animazione: [stato, direzioni, pose, frame e tempi del contratto condiviso].
Terreni: [materiali, bordi/angoli compatibili, seamless X e Y, transizioni].
UI: [moduli e stati, spazio per testo reale, nessuna scritta incorporata].
Output: [trasparenza, celle/atlante e metadati richiesti].
```

Omettere i campi non pertinenti. Il brief non è una chiamata API: usare solo i parametri effettivamente supportati dal tool. Non inserire chiavi, percorsi personali o vecchie tavole di stile.

## Uso dell'MCP e limiti verificati

Prima di produrre un lotto consultare `search_help(tool="...")` per il tool scelto e controllare saldo, costi e capacità attuali. Riutilizzare id e immagini canoniche approvate. La scrittura di questa direttiva non autorizza generazioni, consumi o integrazione di un lotto non richiesto; una richiesta successiva di produzione autorizza il lavoro nel suo ambito e nel budget concordato.

Al 10 novembre 2026, l'help MCP PixelLab indica:

- `create_character` supporta otto direzioni e immagini di riferimento; per le animazioni controllare quelle disponibili con `get_character` prima di usare `animate_character`.
- `create_topdown_tileset` accetta tile 64×64 in modalità `pro`, che richiede un piano compatibile. La modalità standard non copre 64×64: non sostituire il formato con tile più piccoli ingranditi. Il tool crea transizioni Wang tra terreni; mantenere i riferimenti dei tile base per collegare set successivi.
- PixelLab non garantisce layer di equipaggiamento registrati, metadati degli agganci o correttezza delle mani. `transfer_outfit` e `edit_animation` non costituiscono da soli un sistema modulare. Richiedere e verificare parti separabili con gli strumenti PixelLab; se il risultato non soddisfa il contratto, segnalarlo prima di integrare, senza appiattire tutte le combinazioni o passare a un altro generatore.

Queste capacità vanno ricontrollate quando si esegue il lavoro. Un limite del piano o del tool non modifica il canone.

## Consegna e accettazione

Generare e mostrare candidati in una cartella di lavoro esterna al repository. Integrare solo gli asset approvati esplicitamente. Nel progetto entrano asset finali locali, manifest e crediti; prompt completi, prove e intermedi rimangono fuori. Il brief comune di questo documento e la skill sono istruzioni condivise, non scarti di produzione.

Il manifest registra provenienza PixelLab e id, versione del canone, cella 64×64, palette, direzioni, frame/tempi/loop, pivot/agganci e ordine dei layer; per tile include adiacenze e transizioni. Annotare lo stato di approvazione senza spacciare un controllo automatico per prova giocata. Non attribuire agli output una licenza di terzi: riportare la provenienza e i termini effettivi del servizio nei crediti.

Prima della consegna verificare dimensioni, trasparenza, colori, assenza di tagli o salti del pivot, copertura delle otto direzioni e delle animazioni. Per gli indossabili controllare ciascun pezzo sui corpi compatibili, in tutte le pose; provare combinazioni con armi e secondaria, oltre alla rimozione dei singoli layer. Per le mappe verificare ripetizione e transizioni; per la UI stati e leggibilità con i font esistenti. Dopo l'integrazione eseguire `npm run verify` e il controllo nel browser. La resa e la prova giocata finale restano da confermare dal proprietario.
