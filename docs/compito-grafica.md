# Il nostro compito: grafica e chiarezza

> **Archivio grafico · superato il 10 novembre 2026.** Le direzioni artistiche, i formati, le pipeline e le proposte grafiche di questo documento non sono riferimenti per nuovi asset. Usare esclusivamente il [canone PixelLab](canone-grafico.md) e la skill `tys-grafica-pixellab`. Il contenuto sotto conserva lo storico delle implementazioni e delle prove, senza autorizzare nuove produzioni.

Accordo con Jabbaz del 1° novembre 2026:

- la discesa a stanze è accettata;
- la **progressione** la cura lui: tempre, braci, Altare, benedizioni, sigilli, gradi e tutto ciò che potenzia il personaggio;
- a noi resta **solo la parte grafica e di chiarezza**, seguendo le fasi dello studio su grafica, stanze, minimappa e nemici.

Questo file è il riferimento per chi riprende il lavoro: persona o agente.

## Cosa facciamo

Le fasi dello studio, in quest'ordine:

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 0. Interventi rapidi | Proiettili per squadra, colori nuovi, sagome con bordo, figure ordinate per profondità, particelle sotto i proiettili nemici, luce finta, decori lungo i muri | Fatta (nella PR #4) |
| 1. Profondità e luce | Muro in alto con una faccia e muro in basso davanti alle figure, mappa di luce, tracce dello scontro sul pavimento, pavimento a due scale, particelle più leggere | Fatta, non committata |
| 2. Minimappa e mappa della discesa | Minimappa della stanza, striscia delle tappe, mappa intera con Tab | Fatta, non committata |
| 3. Forme delle stanze | Muri e massicci rettangolari dentro le stanze, porte su un tratto del muro, nuove stanze modello | Fatta, non committata (porte invariate) |
| 4. Stanze che evolvono | Porte che calano all'ingresso, luce che si scalda a stanza libera, tappe più cupe verso il boss | Fatta, non committata |
| 5. Abissi, ponti, ripari | Pozzi, ponti, ripari distruttibili e campo di flusso, come proposta per Jabbaz | Fatta, non committata |
| 6. Tileset nuovi | Set CC0 scaricati con il sì dell'utente, ricolorati dal codice | Fatta, non committata |
| 7. Nuovi servitori e boss | Le vene B e C dello studio: aspetto e comportamenti, valori provvisori da tarare con Jabbaz | Fatta, non committata |
| 8. Luogotenenti per vena | Otto luogotenenti nuovi, uno per le vene B e C di ogni dungeon | Fatta, non committata |

Fuori fase, quando servono:

- ~~movimento più fluido in cooperativa (interpolazione nel disegno)~~ (fatto da Jabbaz con `NetworkView`; la nostra versione è stata tolta all'allineamento);
- ~~un solo stile per l'interfaccia~~ (fatto: Grenze Gotisch e Silkscreen, vedi sotto);
- ~~bordo chiaro anche per boss e luogotenenti~~ (fatto);
- ~~contorno dei proiettili più spesso nel ghiacciaio~~ (fatto).

## Cosa non tocchiamo

- **Bilanciamento.** Vita, danni, velocità, cadenze, budget del regista, probabilità, ricompense, esperienza, GS. Se una fase grafica sembra chiederlo, ci si ferma e lo si annota per Jabbaz.
- **Progressione.** Tempre, braci, Altare, benedizioni, sigilli, gradi di tempra e i loro salvataggi. In pratica: `run/tempers.ts`, `run/blessings.ts`, `ui/altar-screen.ts`, `ui/temper-choice.ts` e i premi della discesa.
- **Regole di gioco.** Una fase che cambia le collisioni (forme delle stanze) cambia solo la geometria: i numeri restano quelli di oggi e ogni scelta nuova finisce in `docs/game-design.md` come proposta.

## Come lavoriamo

- **Dove.** Ramo `feature/grafica-fasi-2` nella cartella `Downloads\temper-your-soul-grafica-2`, nato dal main di Jabbaz (`df4b807`) il 1° novembre 2026. La cartella `Downloads\temper-your-soul-grafica` (ramo `feature/grafica-fasi`, nato dalla vecchia discesa) resta com'era, come riserva.
- **Commit.** Nessun commit finché l'utente non lo chiede. Una copia di sicurezza delle modifiche si salva come file patch fuori dal repo.
- **Allineamento.** Prima di ogni nuova fase si guarda se il main di Jabbaz è avanzato (`git fetch origin`) e ci si allinea senza perdere il suo lavoro né il nostro.
- **Il gioco online resta fermo.** Il server cooperativo e il tunnel per gli amici girano dalla cartella `temper-your-soul-discesa`: non si toccano. Le prove si fanno su un server di sviluppo separato (porta 5189 per questa cartella).
- **Ogni modifica:**
    - test accanto al codice per ciò che si può controllare senza browser (colori, posizioni, geometrie);
    - `npm run verify`;
    - una prova nel browser;
    - una voce in `docs/bugs.md` per ciò che si trova.
- **Asset.** Solo CC0, pubblico dominio, CC BY o OFL; niente generato con IA; nessun download senza il sì dell'utente.
- **Il disegno non cambia la simulazione.** Luci, tracce e minimappa leggono lo stato e gli eventi, mai il generatore casuale della partita. In cooperativa si vedono uguali senza nuovi dati di rete.

## Diario

### 1° novembre 2026: fasi 1–4

Fatte sul ramo `feature/grafica-fasi`, senza commit, e portate sul main di Jabbaz lo stesso giorno (vedi «Allineamento»). Copie di sicurezza come patch fuori dal repo. Verifica prima dell'allineamento: 624 test (dopo le fasi 7 e 8 e la revisione), tipi client e server, build. Ogni fase è stata guardata nel browser in tutti e quattro i dungeon.

- **Fase 1 – profondità e luce.**
    - `presentation/lights.ts`: mappa di luce a mezza risoluzione, fusa in *soft-light* solo sull'ambiente. Figure e proiettili restano a piena luce.
    - `themes/wall.ts`: faccia del muro in alto e cima del muro in basso davanti alle figure, scurita come la scena.
    - Decori appesi alla faccia del muro: torce, bocche di fornace, funghi, cristalli.
    - Tracce dello scontro in `effects.ts` e `draw-effects.ts`.
- **Fase 2 – minimappa e mappa della discesa.**
    - `ui/room-minimap.ts`: minimappa della stanza (N la nasconde). Mostra densità dei nemici, preda, nidi, élite, boss, giocatori e massicci, e sbiadisce quando un colpo nemico ci passa sotto.
    - `ui/descent-map.ts`: mappa delle tappe tenendo premuto Tab, solo in partita. Nei menu Tab resta al browser.
- **Fase 3 – forme delle stanze.**
    - `arena.ts`: massicci rettangolari (`Solid`) con collisioni, linea di vista, scatto che si ferma e deviazione dei servitori.
    - `room-templates.ts`: otto stanze nuove, due per dungeon.
    - `drawSolidBlock`: cima a lastre, bordo e faccia del tema.
    - Le luci nate sotto un massiccio vengono scartate. Test di raggiungibilità di porte e comparse in ogni stanza (`run/room-shapes.test.ts`).
- **Fase 4 – stanze che evolvono.** `presentation/room-mood.ts`:
    - la grata dell'ingresso cala dopo mezzo secondo, con rimbalzo e polvere;
    - le grate delle uscite salgono quando la stanza è libera;
    - la luce si scalda;
    - le tappe sono più cupe verso il boss (ambiente e vignettatura).

Scelte che toccano il comportamento, da far confermare a Jabbaz. Valgono solo nelle stanze nuove con i massicci; altrove nulla cambia:

- lo scatto si ferma contro un massiccio (i pilastri si attraversano come prima);
- i servitori a terra girano attorno ai massicci da un angolo all'altro;
- chi spara aspetta di vedere il bersaglio e chi tiene la distanza si sposta finché non lo vede.

### 1° novembre 2026: fuori fase e fase 7

- **Fuori fase.**
    - Nel ghiacciaio il contorno scuro dei proiettili nemici è spesso 4,5 invece di 3 (`ArenaTheme.projectileRim`).
    - Boss e luogotenenti hanno il bordo chiaro del tema: sagoma tinta del foglio PNG o tavolozza tinta per quelli a matrici.
- **Fase 7 – vene B e C.** 55 servitori nuovi: 54 dalle schede dello studio e il girino, figlio dell'Ovatura.
    - Dati in `minions/catalog/*-veins.ts`.
    - Grafica a matrici in `presentation/minion-art/*-veins.ts`.
    - Colpi e zone in `looks/veins.ts`.
    - Iscrizioni in `run/bestiary-lore.ts`.
- **Sette comportamenti nuovi** (`minion-ai.ts`), tutti con test in `minions/vein-behaviors.test.ts`:
    - raffica in serie;
    - spirale doppia;
    - anello all'arrivo di carica, salto ed emersione;
    - lanci ad anello, a croce e a cono;
    - aure di fervore e di riparazione;
    - agguato;
    - carica che rimbalza sui muri.
- **Vene nella discesa** (`run/veins.ts`):
    - due vene per discesa, una d'ingresso e una profonda;
    - ospiti nelle tappe di passaggio;
    - Incursione nel 3% degli Scontri dalla terza tappa;
    - il luogotenente evoca la folla della vena profonda;
    - sblocchi ricavati dai record che il gioco salva già, quindi niente salvataggio nuovo;
    - cooperativa al protocollo 5, con le vene del capo gruppo.
- **Interfaccia delle vene:**
    - il nome della vena sotto il cartello delle porte, nel pannello e nello stendardo (viola per l'Incursione);
    - le due vene sulla mappa della discesa;
    - il Bestiario diviso per vena, con il contatore.

### 1° novembre 2026: allineamento al main di Jabbaz

La PR #4 è stata unita in una versione senza progressione ("senza premi intermedi"). Jabbaz ha poi aggiunto ruoli e abilità di classe e una sua interpolazione della cooperativa (`presentation/network-view.ts`). Il lavoro grafico poggiava sulla vecchia discesa: è stato portato sul suo main in una cartella nuova, con una fusione a tre vie. Undici file erano in conflitto e sono stati risolti a mano:

- **Interpolazione della cooperativa.** Resta quella di Jabbaz, che disegna da una copia della partita. La nostra (`net-smoothing.ts`) faceva lo stesso lavoro ed è stata tolta.
- **Progressione tolta da Jabbaz.** Il pannello della discesa e la mappa con Tab non mostrano più premi, braci e tempre.
- **Rete.** Il protocollo passa da 7 a 8, perché i 55 servitori e gli 8 luogotenenti delle vene viaggiano per id.
- **Cripta.** Restano le rune fuori dalla cache di Jabbaz, con il bagliore e le torce appese alla faccia del muro.
- **Abilità di classe nelle stanze con i massicci.** La corsa del Guerriero e il morso e il salto del lupo dell'Arciere controllavano solo i pilastri. Ora contano anche i massicci (`sightBlocked`), e il lupo li aggira come i servitori a terra. Due test nuovi, verificati con una mutazione.

Verifica: 673 test, tipi client e server, build; prova nel browser in una stanza con i massicci, senza errori.

### 1° novembre 2026: fase 8, luogotenenti per vena

`run/vein-lieutenants.ts`, `presentation/boss-art/vein-lieutenants.ts`. Otto luogotenenti nuovi, con due schemi del boss che la loro vena porta in versione fedele e un terzo loro:

| Dungeon | Vena B | Vena C |
| --- | --- | --- |
| Cripta | Gran Becchino: FRATTURA, CARICA, terra di sepoltura | Maestro dell'organo: SPIRALE, TRIPLICE VENTAGLIO, accordo |
| Palude | Lavandaia maggiore: ANELLO DI MELMA, NUVOLA, acqua nera | Regina della colonia: PIOGGIA, ACCERCHIAMENTO, sciame |
| Fucina | Campione vuoto: CARICA DI FERRO, SBARRAMENTO, ruota di lame | Caposquadra di ferro: MARTELLATA, CROCE, mina |
| Ghiacciaio | Orsa madre: NOVA GELIDA, SCHEGGE, assalto | Astronomo: BUFERA, LANCE, passo tra le stelle |

- **Quando compaiono:** quando la vena profonda della discesa è la loro; con la vena A resta il luogotenente di sempre.
- **Furia:** chiamano la folla della loro vena.
- **Vita:** sotto la metà di quella del boss, come gli altri luogotenenti.
- **Grafica:** pixel art nel codice, con bordo chiaro, effetti di furia e pagina nel Bestiario, sotto la loro vena.
- **Prove:** le stesse dei luogotenenti di sempre (ogni schema in tutte e due le fasi), più grafica e pagine complete. Il Maestro dell'organo è stato visto in combattimento nel browser.

### Misura delle prestazioni (1° novembre 2026)

Stanza della discesa con tutte le fasi attive: luce, muri, tracce, atmosfera, minimappa, circa 50 servitori delle tre vene e 50–80 proiettili. Si misura un fotogramma intero, cioè un passo di simulazione più il disegno, nel browser di sviluppo.

| Dungeon | Media | 95% | Massimo |
| --- | --- | --- | --- |
| Cripta | 1,2 ms | 1,9 ms | 4,5 ms |
| Palude | 2,4 ms | 3,7 ms | 6,3 ms |
| Fucina | 2,1 ms | 3,5 ms | 6,1 ms |
| Ghiacciaio | 2,1 ms | 3,4 ms | 6,4 ms |

Il budget di un fotogramma a 60 Hz è 16,7 ms.

### Revisione indipendente (1° novembre 2026)

Un revisore ha riletto tutto il lavoro e trovato nove problemi, i peggiori due:

- i luogotenenti delle vene erano invisibili in cooperativa;
- i corpi restavano incastrati nei massicci addossati al muro.

Sono tutti corretti, con test che riproducono i casi trovati: l'elenco è in `docs/bugs.md`.

### 1° novembre 2026: fasi 5 e 6

L'utente ha detto sì ai download e ha chiesto le due fasi rimaste. Tutto sul ramo `feature/grafica-fasi-2`, senza commit.

- **Fase 6 – tileset.**
    - Scaricati circa 1 MB di pacchetti CC0, con la licenza ricontrollata su ogni pagina. L'elenco è in `docs/risorse-libere.md`.
    - `tools/arte/prepara_tile.py` ritaglia i tile scelti e li ricolora con le rampe di ogni tema: un foglio da circa 3 KB per dungeon, incorporato nella build (funziona anche da `file://`).
    - I tile vestono pavimenti di cripta, fucina e ghiacciaio, la grana del fango della palude, la faccia del muro della cripta, la cima dei massicci, pozzi, ponti e ripari.
    - Le lastre lisce escono più spesso delle crepate, perché le crepe restino punti di riferimento.
    - I pavimenti di fucina, palude e ghiacciaio ora stanno nella cache a tasselli di Jabbaz; restano animati crepe di lava, riflessi, canne, funghi e nebbia.
    - Un test ha fermato il bordo chiaro dei crepacci, troppo vicino a un colpo nemico del ghiacciaio: ora è più scuro.
- **Fase 5 – pozzi, ponti, ripari.** Regole nuove, proposte a Jabbaz in `docs/game-design.md`:
    - pozzi che fermano chi cammina ma non colpi e chi vola; lo scatto del Mago li supera se atterra sul pavimento;
    - ponti fra due tratti di pozzo;
    - ripari da 160 punti di vita che fermano corpi e colpi di tutti, ma non la vista, e si rompono;
    - campo di flusso per i servitori a terra nelle stanze con i pozzi;
    - vita dei ripari nell'istantanea della cooperativa, solo quando cambia;
    - otto stanze nuove, due per dungeon: Crollo, Navata dei banchi, Acque profonde, Groviglio, Fiume di lava, Deposito, Crepacci, Blocchi di ghiaccio.
- **Prove** (`run/room-hazards.test.ts`, `presentation/tiles.test.ts`):
    - stanze valide e raggiungibili senza rompere ripari;
    - bordo dei pozzi, scatto, colpi e volo sopra i pozzi;
    - servitore che arriva al giocatore passando dal ponte;
    - ripari che si consumano, si rompono e passano in rete;
    - fogli dei tile, crediti e colori a terra.

  Le regole chiave sono verificate con mutazioni: senza la spinta fuori dai pozzi, senza l'atterraggio sul pavimento o senza il danno ai ripari, le prove falliscono.
- **Nel browser.** Guardate le otto stanze. In cooperativa con due giocatori su un server separato, la seconda scheda riceve la Navata dei banchi con i dodici ripari. Fotogramma intero con circa 70 servitori e 80 proiettili:

| Stanza | Media | 95% | Massimo dopo il primo fotogramma |
| --- | --- | --- | --- |
| Crollo | 1,7 ms | 2,9 ms | sotto i 5 ms |
| Acque profonde | 1,5 ms | 2,4 ms | sotto i 5 ms |
| Fiume di lava | 1,5 ms | 2,7 ms | sotto i 5 ms |
| Crepacci | 1,4 ms | 2,4 ms | sotto i 5 ms |
| Navata dei banchi | 1,2 ms | 2,1 ms | 5,2 ms |
| Deposito | 1,1 ms | 2,1 ms | 5,8 ms |

Il primo o il secondo fotogramma di una stanza costano 6–20 ms, perché la cache del pavimento si riempie: succede durante la dissolvenza d'ingresso.

Verifica: 697 test, tipi client e server, build.

### 1° novembre 2026: seconda revisione indipendente (fasi 5 e 6)

Un revisore ha riletto pozzi, ripari, campo di flusso, tile e allineamento, provando ogni caso con una simulazione. Ha trovato sette problemi, tutti corretti con un test che riproduce il caso e una mutazione che lo fa fallire:

- **Un ratto restava incastrato all'angolo di una panca** nella Navata dei banchi, oscillando fra due angoli. Il campo di flusso vale ora in tutte le stanze con massicci, ripari o pozzi.
- **Provocati dal Guerriero, i servitori andavano dall'Arciere** perché il campo portava al giocatore più vicino. Ora c'è un campo per giocatore e ognuno segue il proprio bersaglio.
- **Il lupo dell'Arciere poteva finire dentro un pozzo** in tre modi: comparendo sul bordo, aspettando il padrone accanto al pozzo, saltando su un pipistrello che ci vola sopra. Ora resta sempre sul pavimento.
- **La copia di disegno della cooperativa** riconosceva i ripari condivisi solo se ne restava almeno uno in piedi. Ora c'è un registro esplicito delle mappe con i ripari.
- **Le corse calcolavano la meta oltre il pozzo** anche se poi si fermavano sul bordo. Ora il calcolo si ferma al bordo, come la corsa.
- **Costi:** niente copie di array e niente allocazioni nei controlli che i servitori fanno a ogni passo e nel ricalcolo del campo; dei pozzi lunghi si disegna solo la parte inquadrata. Con 30 servitori un passo costa 0,13–0,24 ms in media (0,09 in una stanza aperta), al 95% sotto 0,6 ms.

Verifica: 702 test, tipi client e server, build.

### 1° novembre 2026: un solo stile per l'interfaccia

Con il sì dell'utente ai download: tre caratteri OFL 1.1 da Google Fonts, sottoinsieme latino (accenti italiani compresi), serviti dal gioco e incorporati nella build, così funzionano anche da `file://`.

- **Titoli** in Grenze Gotisch: menu, stendardi, pannelli, Bestiario, mappa della discesa. Prima c'erano Georgia e i titoli del tema mescolati.
- **Numeri ed etichette dell'HUD** in Silkscreen: vita, mana, esperienza, tasti, suggerimenti, numeri del danno sul canvas. Prima erano in monospace.
    - Silkscreen è disegnato su una griglia da 8 pixel e resta nitido solo a 8 e 16. A 11 la C si chiudeva in una O ("ESC" diventava "ESO"). Tutte le sue misure sono ora 8 o 16 e un test lo controlla, comprese le regole per gli schermi piccoli.
    - Vita, mana ed esperienza sono a 16 pixel, con le due barre allineate al pixel; sotto i 600 pixel di larghezza tornano a 8, perché a 16 andrebbero a capo.
- **Testi** nel carattere di sistema, il più leggibile.
    - Pixelify Sans, previsto dallo studio, è stato provato e scartato: la sua B maiuscola si legge come una G anche a 48 pixel ("Bestiario" diventava "Gestiario").
    - Sul canvas i nomi degli attacchi restano nel grassetto di sistema; i numeri del danno usano Silkscreen.
- **Crediti:** sezione «Caratteri» nel pannello dei crediti, `ui/font-credits.ts`, `src/assets/fonts/LEGGIMI.md` con i testi della licenza OFL accanto ai file. Pesano 58 KB.
- **Prove** (`ui/fonts.test.ts`): file e licenze presenti, nessun file senza credito, ogni carattere dichiarato nel CSS, niente Georgia o monospace fuori dalle riserve e dal pannello FPS, Silkscreen solo a 8 o 16. La regola delle misure è verificata con una mutazione.

Verifica: 707 test, tipi client e server, build. Guardati nel browser, a dimensione naturale, menu, pannello audio con i crediti e HUD in partita.

### 1° novembre 2026: pull request

Su richiesta dell'utente il lavoro è stato committato sul ramo `feature/grafica-fasi-2` e ribasato sul main di Jabbaz v0.04.00 (danno intero per difetto). I conflitti erano solo in coda ai documenti. Anche il danno ai ripari ora si arrotonda per difetto, come quello alla vita. Verifica: 713 test, tipi client e server, build.

### 3 novembre 2026: menu del rifugio (ramo `feature/menu-rifugio`)

Su richiesta dell'utente il menu è stato rifatto più volte, fino alla versione scelta: rifugio lontano, comandi negli angoli. Regole e motivazioni sono in `docs/game-design.md`.

- **Scena:** `presentation/menu-layout.ts` tiene la tabella dei pezzi, `presentation/menu-scene.ts` il movimento: portale, fiamme, fumo, braci e luci. Con il sistema impostato su «riduci animazioni» la scena resta ferma.
- **Immagini generate con l'IA, su richiesta dell'utente:** provenienza e semi in `src/assets/art/menu/LEGGIMI.md` e `tools/arte/menu/`. Vanno approvate da Jabbaz: l'eccezione in `docs/vfx-pixellab.md` copre solo effetti e icone.
- **Componenti:** `ui/forge-menu.css`, `ui/main-menu.ts`, `ui/menu-model.ts`, `ui/coop-screen.ts`, `presentation/menu-icons.ts`.
- **Aree di altri:** nessun file in carico a `simonragaz87-sudo` è stato modificato. Il menu chiama soltanto il pannello già esistente del personaggio e lo sprite di gioco.
- **Prove:** modello dei comandi, navigazione, inviti, stati, misure della scena, punti d'arrivo nel rifugio, contrasto dei testi, Silkscreen solo a 8 o 16 anche nel nuovo CSS.
- **Nel browser:** versione finale a 1920x1080, 1280x720, 1024x768, 800x600, 1280x500 e 375x812. Cooperativa provata con due schede su un server separato, su una versione precedente della scena. Prima revisione indipendente: 44 problemi confermati, in parte doppi, tutti corretti.

Controlli automatici e fotogrammi, **non** una prova giocata: la conferma manuale resta da fare.

### 3 novembre 2026: pagina Personaggi

Il personaggio sta sui gradini del portale del rifugio (`presentation/character-altar.ts`, stessa densità di pixel del mondo, ingrandita per un intero dal CSS). A sinistra la compagnia, a destra classe con statistiche reali del set iniziale, sesso e set iniziale con i riquadri dell'inventario. Cambiando classe o sesso parte un lampo nel colore della classe. Classe e sesso partono già scelti (Guerriero, Maschio), come l'anteprima: resta da scrivere il nome. Un personaggio creato mostra livello, statistiche, equipaggiamento e il comando per entrare nel rifugio. Stili in `ui/character-page.css`, tutti sotto `#screen-characters`. Nessuna regola o valore cambia. Solo fotogrammi e controlli automatici: la prova giocata resta da fare.

### 3 novembre 2026: boss e luogotenenti con il generatore locale

Su richiesta dell'utente, ramo `feature/mob-ai-locale`, senza commit. Proposta per Jabbaz: la regola sull'IA va confermata.

- **Figure:** 16 disegni nuovi, 4 boss e 12 luogotenenti, fra 4-6 candidati ciascuno. L'utente ha scelto i primi 9; gli ultimi 7 li ho scelti io e sono da confermare (Maestro dell'organo #1, Lavandaia #1, Regina #3, Campione vuoto #0, Caposquadra #2, Orsa #1, Astronomo #2).
- **Fogli:** i luogotenenti passano ai fogli come i boss, stesso codice di disegno. Scala 1: un pixel e' un'unita' di mondo, come il personaggio. La taglia segue il cerchio di colpo.
- **Animazioni da un solo disegno:** parti del corpo spostate a pixel interi, armi intere con il braccio, furia come ricolore su una rampa, passaggio di fase a retino, morte che perde pezzi fino alle macerie.
- **Cosa si perde:** i vecchi boss avevano attacco, fase II e morte disegnati da artisti. Questi sono piu' forti come figura e piu' poveri come animazione. Per questo i fogli di terzi restano: `?boss=classici`.
- **Bestiario:** la miniatura del luogotenente viene dal foglio.
- **Solo aspetto:** vita, danni, velocita', raggi di colpo, salvataggi e protocollo non cambiano. Le ombre e i piedi restano dove erano.

- **Revisione indipendente:** ha trovato il guardiano senza stinchi (il togli-ombra li prendeva per ombra), lame sfalsate dal pugno, furie sbiadite, morti con buchi a finestra, gerarchia di taglia rotta. Corretti e riscritti nei fogli.
- **Difetti noti rimasti:** il Caposquadra sembra un soldato moderno e senza piccone; la Regina si vede dal dorso e il fungo si legge poco. Il revisore li ha bocciati come disegni: i candidati nuovi non sono stati generati perche' l'utente ha fermato il lavoro. Il Mastro d'incudine non ha un'incudine.
- **Non fatti:** gli altri mob (solo prova su 8, non nel gioco). Prova giocata di ritmo, piedi che scivolano e sincronia con i colpi.

Decisioni per Jabbaz: se accettare grafica generata sui boss; se le animazioni bastano; se togliere i vecchi fogli.

### 4 novembre 2026: mob e mappe con il generatore locale · v0.11.05

Ramo `feature/produzione-grafica`, sopra la PR 15. Proposta per Jabbaz: stessa decisione sull'IA. Inventario completo in [produzione-grafica.md](produzione-grafica.md).

- **Mob:** tutti gli 88, con quattro fotogrammi. Quelli di profilo si voltano secondo il verso di marcia; chi sta fermo non cammina sul posto.
- **Mappe:** i quattro dungeon a un pixel per unita' di mondo, con facciate, portali, colonne, arredi, ponti e bordi dei pozzi. Il disegno sta in `themes/scenery.ts`.
- **Boss:** fogli riscritti con la riduzione che tiene volti e arti; Caposquadra e Regina hanno un disegno nuovo.
- **Solo aspetto:** vita, danni, velocita', collisioni, raggi di colpo, salvataggi e protocollo non cambiano. Soglie e aperture delle porte sono disegnate di nuovo, la zona di gioco e' la stessa.
- **Prove:** partite automatiche nei quattro dungeon e in pellegrinaggio, `npm run verify`. Non provati: una partita giocata a mano e il multigiocatore.
- **Da rivedere:** 12 mob segnati nell'inventario; il modello non sa disegnare mantice e incudine. Il Rifugio non e' toccato: su main e' ora l'illustrazione del menu.

Decisioni per Jabbaz: se accettare grafica generata su mob e mappe; se togliere i mob e i tile di prima.
