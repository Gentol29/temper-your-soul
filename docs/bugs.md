# Bug e problemi rilevati

## Equipaggiamento dell'arciere: parti che dovevano restare nascoste

Segnalazione dell'utente (1 novembre 2026): stivali e armatura non si adattavano al corpo e mostravano le parti posteriori. Rilevati nell'anteprima, su entrambi i corpi:

- **Mantello delle canne:** un unico livello sopra il corpo copriva busto e braccia. Ora è diviso in cappa dietro il corpo e due lembi sul petto. Negli sprite di combattimento i lembi sono ridotti a due.
- **Stivali del vento:** interno e bordo posteriore erano sopra i pantaloni. Sulle pose dell'arciere la base è ora tagliata lungo gli orli (`cuff`, `cuffClipPath`) e lo stivale passa sotto la gamba.
- **Scheggia bianca accanto allo stivale sinistro:** il ritaglio includeva la piuma dello stivale vicino. Ritagli corretti, con gli stessi punti di aggancio.
- **Parte bassa del mantello rimpicciolita:** l'SVG conservava le proporzioni anche quando veniva stirato. Aggiunto `preserveAspectRatio="none"`; gli altri oggetti SVG mantengono già le proporzioni e non cambiano.
- **Corda dell'arco del cacciatore sopra il busto:** davanti al corpo resta solo il legno (`WEAPON_FRONT_OUTLINES`), la corda passa dietro. Arco anche inclinato attorno alla presa (`WEAPON_ROTATIONS`, valore provvisorio).
- **Mano sull'arco:** sopra l'arma tornava un'ellisse di dita che non chiudeva la presa. Sulle pose dell'arciere restano davanti solo le dita, ritagliate lungo il contorno (`primaryFingers`). Provato anche un indice disegnato nel codice davanti al legno: scartato dall'utente, resta quello del disegno originale. Il palmo sta dietro l'impugnatura, assottigliata fra i due anelli (`WEAPON_GRIP_SLICES`, scala provvisoria).
- **Gambale dello stivale frontale:** era spostato rispetto alla gamba, con l'orlo sporgente da un lato. Caviglia registrata sull'asse del polpaccio; la punta ruota di conseguenza.
- **Piume e fronte degli stivali del vento:** con lo stivale sotto la gamba restavano nascosti. Ora sono livelli a parte sopra i pantaloni (`overPants` in `BOOT_PARTS`); interno e bordo posteriore restano sotto.

Stessa gestione estesa a Guerriero e Mago, su richiesta dell'utente: orli (`cuff`) e dita (`primaryFingers`) misurati su tutte le pose; stivali illustrati e disegnati nel codice sotto i pantaloni, con il fronte sopra (`overPants`); armi davanti al palmo fin poco sotto la presa (`weaponRearCut`, valore provvisorio); parte bassa di manto della meteora, egida di brace e corazza della fornace divisa fra davanti e dietro le gambe (`ARMOR_LOWER_FRONT`). Sudario e velo restano interi davanti, perché sono vesti continue. Da rivedere: gli stivali disegnati nel codice (tombali, di brace, di brina) restano chiari e squadrati rispetto agli altri.

Sprite di combattimento femminili ridisegnati su richiesta dell'utente (`drawHeroine`): prima erano la base maschile ristretta. Ora hanno sagoma propria, coda alta che segue il passo, fascia sul braccio e contorni doppi che reggono il passaggio a 48×48; l'equipaggiamento mantiene agganci e adattamento (`bodyWidth`). Controllati nell'anteprima, non ancora in partita.

Da fare: la corda dell'arco di spine passa ancora vicino al busto e la parte superiore del corpo degli sprite resta affollata a 48×48. Controllati test e fotogrammi dell'anteprima; **conferma manuale dell'utente ancora da ricevere**.

Posa e profondità: il martello copriva parte del viso, soprattutto a riposo. Riorientate le armi lunghe verso l'esterno e separate le estremità inferiori dietro il corpo. La versione femminile risultava sostanzialmente uguale salvo i capelli: ora ha fisionomia e corporatura proprie, con adattamenti di tutti gli strati. Controlli automatici e fotogrammi eseguiti; conferma manuale da ricevere.

Ritratti illustrati A: asset separati per basi, cinque armature maschili/femminili, armi e stivali; ritagli registrati e controllati su entrambe le figure. Il montaggio resta da provare a mano su tutte le combinazioni, in particolare prese delle armi e giunzioni degli stivali. Gli asset generati non costituiscono un atlante anatomico perfetto: eventuali piccoli disallineamenti richiedono correzioni della registrazione, non delle regole di gioco.

Medaglione del livello: corrette le proporzioni 50×40 che lo rendevano ellittico. Ora ha dimensioni fisse 44×44, centrato nella colonna. Aspetto e dimensioni alle varie risoluzioni da confermare a mano.

Solo problemi effettivamente osservati o rilevati leggendo il codice, distinti per origine. Stato dopo la Fase 0 (porting del prototipo in TypeScript).

## Aperti

- **Lieve calo FPS multiplayer segnalato dall’utente.** Rilevati invio ripetuto di dati statici, ricreazione delle entità a ogni snapshot, ricostruzione della lobby a ogni ping e disegno pixel per pixel per tutti gli alleati. Ottimizzati nel protocollo v2 e nel rendering con cache; controlli comparativi in README. Da confermare sul PC dell’utente. L’aggiornamento del mondo a 30 Hz resta distinto dagli FPS del canvas; Interpolazione visuale multiplayer integrata; predizione locale ancora assente. L’utente ha segnalato un miglioramento lasciando una sola scheda di gioco per finestra; la versione combinata con le stanze richiede una nuova prova giocata.

- **Limiti cooperativa iniziale:** stanze in RAM, nessun rientro durante l’incontro dopo refresh/disconnessione; il membro uscente viene messo KO. Client con interpolazione visuale, senza predizione locale: input/snapshot 30 Hz, quindi ping e intervallo dei messaggi incidono sulla risposta visiva. Gli oggetti restano locali validati ma modificabili manualmente; non è ancora un’economia autorevole persistente. HP del boss invariati per numero di membri: bilanciamento cooperativo da provare. Il report misura danno effettivo e guarigione da rigenerazione e furto vita.

- **Sprite e ritratti: difetti residui confermati dall’utente.** Offset e vestibilità delle armature, proporzioni e prese delle armi richiedono ancora revisione. Lavoro sospeso su richiesta esplicita per contenere le rigenerazioni; TODO nel codice (`portrait-rig.ts`) e nella roadmap. Nessuna nuova revisione grafica inclusa nell’incremento creazione/bottino.

- **Prova manuale della Fase 0 confermata solo in generale.** L'utente ha dichiarato che "funziona tutto correttamente" (2026-10-30), senza dettaglio per voce della checklist in `docs/roadmap.md`: non sono stati segnalati problemi. I controlli automatici, la prova di fumo in Edge headless e i fotogrammi renderizzati non coprono da soli sensazione di gioco, leggibilita', interfaccia in DOM e prestazioni.
- **Interfaccia in DOM, ciclo del browser e disegno non coperti dai test automatici.** `Hud`, `Overlay`, `FullscreenToggle`, `Game` e le funzioni `draw-*` non hanno test (la suite gira in Node, senza DOM ne' canvas). Sono stati solo esercitati dalla prova di fumo in un browser vero (rieseguita anche dopo le correzioni della revisione, senza errori in console).
- **Voci della revisione indipendente non corrette**: vedi le sezioni "Revisione indipendente del porting" e "Revisione indipendente della Fase 1 (parziale)" (quest'ultima non copre dungeon, mappe e boss).
- **Prova manuale della Fase 1 da eseguire** (menu, 4 dungeon, boss, oggetti, salvataggio): nulla e' confermato a mano; checklist in `docs/roadmap.md`. Equita' e leggibilita' degli attacchi dei 3 nuovi boss sono verificate solo da test automatici e fotogrammi, non giocate.
- **Raggi di collisione incoerenti (ereditati).** I proiettili usano raggio + 9 sul giocatore e + 26 sul boss; le zone raggio + 8 e + 25 (`features/combat/collision.ts`). Da unificare con la prova manuale.
- **Valori provvisori.** Tutti i valori di gioco sono quelli del prototipo e non sono tarati (vedi `docs/game-design.md`).
- **Camera senza limiti.** Vicino ai bordi dell'arena la camera mostra il vuoto scuro oltre il muro (come nel prototipo).
- **Disegno del singolo senza interpolazione.** In singolo la simulazione gira a 60 Hz e il disegno usa l'ultimo stato: su schermi a frequenza maggiore il movimento puo' risultare lievemente a scatti.
- **Differenze volute rispetto al prototipo da confermare a mano**: elenco in `docs/game-design.md` (passo fisso, tasti per posizione fisica, scossa dello schermo applicata, effetti che proseguono dopo la fine, traslazione di camera arrotondata, tocchi brevissimi non persi).
- **`npm audit` segnala avvisi sulle dipendenze di sviluppo** (osservato). Le versioni sono fissate uguali a quelle di Ashen Realm (vite 5.4.11, vitest 2.1.8): esbuild (<= 0.24.2, il server di sviluppo risponde a richieste di qualunque sito), `@vitest/mocker` (moderata) e `tinypool` (segnalata critica, ma riguarda le opzioni dei worker dei test). npm indica come correzione disponibile vite 5.4.21 e vitest 2.1.9 (aggiornamenti di patch, fuori dall'intervallo fissato). Sono solo dipendenze di sviluppo e non finiscono nel gioco pubblicato; non e' stato aggiornato nulla. Da decidere se allineare le versioni anche in Ashen Realm.

## Rilevati nel prototipo leggendo il codice (non riprodotti a mano)

Difetti o fragilita' del prototipo JavaScript, trattati nel porting come indicato.

- **Scossa dello schermo mai disegnata.** `shake` veniva impostata da danni, scoppi, furia e carica, ma `draw()` non la usava. Nel porting e' applicata (vedi differenze volute).
- **Simulazione dipendente dal frame rate.** `dt` variabile limitato a 0,033 s: sotto i 30 fps il gioco rallentava e le quantita' integrate dipendevano dal passo. Nel porting: passo fisso a 60 Hz.
- **Tasti letti con `e.key`**: dipendono dal layout (AZERTY, ecc.). Nel porting: `e.code`.
- **Un tocco piu' breve di un fotogramma su Q/E** era gestito con un lancio immediato nel gestore dell'evento; con il passo fisso e' sostituito da una pressione registrata (`Input.takeLatched`).
- **Proiettili distinti dal raggio** (`s.r === 8` per il gelo, `s.r > 6` per l'effetto d'impatto): un cambio di raggio avrebbe cambiato in silenzio comportamento e aspetto. Nel porting: `slowSeconds` e `visual` espliciti nei dati.
- **Stato globale mutabile condiviso** (variabili globali in `core.js`) e regole mescolate con particelle e DOM: nessun test era possibile. Nel porting: `Match` senza DOM, eventi, test.
- **HUD aggiornata nel DOM a ogni fotogramma** (`style.width`, `textContent`). Nel porting: solo se il valore cambia.
- **CSS a livelli sovrapposti** (tre blocchi che si ridefiniscono a vicenda, markup `header`/`foot` nascosto con `!important`). Nel porting: un solo livello con lo stesso risultato finale; `header`, `foot` e il titolo di pagina nascosti non esistono piu'.
- **Traslazione di camera non arrotondata**: il personaggio al centro vibrava di mezzo pixel. Nel porting: arrotondata.
- **Effetti congelati alla fine della partita**: l'aggiornamento si fermava con lo stato diverso da `play`, lasciando l'esplosione della vittoria ferma dietro la schermata. Nel porting: gli effetti proseguono.

## Revisione indipendente del porting (Fase 0)

Quattro revisori indipendenti hanno confrontato il porting con il prototipo (simulazione, rappresentazione, interfaccia/input, architettura e test); ogni segnalazione e' stata poi controllata da uno scettico incaricato di smentirla. Esito: **9 segnalazioni, nessuna smentita, tutte di gravita' bassa dopo la verifica**. La revisione della simulazione non ha trovato differenze di valori o di regole; quella della rappresentazione ha trovato solo il problema della mira. Si tratta di una lettura del codice da parte di agenti, non di una prova giocata.

Trattate nella stessa fase (vedi "Risolti"): mira sfasata di un passo, scorciatoie del browser intercettate, lacune dei test sui confini, id dello schema e posa iniziale.

Non corrette, da decidere:
- **Menu: WASD non e' piu' in grassetto** e il suggerimento in basso a sinistra e' stato riscritto ("WASD · Muoviti | ESC · Pausa | R · Ricomincia | Audio ... · M" invece di "WASD · Esplora la cripta | R · Ricomincia"). Il suggerimento e' voluto (nel prototipo lo stato audio stava in un elemento nascosto e non si vedeva mai); con altezza finestra sotto 450 px il suggerimento sparisce e con lui lo stato audio (come nel prototipo). Solo estetico.
- **Testi e colori delle etichette degli attacchi stanno nei dati del boss** (`BossPattern.name/labelColor/labelOffsetY`) e non in `presentation/`, a differenza dei proiettili (che hanno solo un id). Il prototipo faceva lo stesso; da spostare se si localizza o si cambia la grafica.
- **`Game` (ciclo, pausa, ripartenza), `Hud`, `Overlay`, `AudioPlayer` senza test**, e nessun controllo automatico che la simulazione non usi `Math.random` o il DOM (oggi non succede: l'unico `Math.random` e' in `cosmeticRng` e nel seme di `Game`). Possibile estrazione di un `FixedStepLoop` puro da testare.
- **La mira dipende dalla camera centrata sul giocatore**: `PlayerIntent.aimOffset` e' l'offset del mouse dal centro della vista. Se la camera avra' smorzamento o limiti, la mira andra' ricalcolata.
- **Mutante equivalente**: la ressincronizzazione della mira prima di ogni skill (`match.ts`) e' ridondante con le skill attuali; resta per quando una skill che sposta il giocatore precedera' un'altra.

## Revisione indipendente della Fase 1 (parziale)

Quattro revisori dovevano guardare salvataggio e bottino, flusso delle schermate, dungeon e boss, architettura e test, con uno scettico per ogni segnalazione. **La revisione si e' interrotta per il limite orario del servizio**: hanno finito le prospettive "salvataggio e bottino" e "flusso e interfaccia"; **non e' girata quella su dungeon, mappe e boss** (equita' degli attacchi, giocatore incastrato, schemi inevitabili) e solo in parte quella su architettura e test (alcune verifiche sono fallite). Gli esiti qui sotto sono quindi incompleti. Nessuna correzione e' stata applicata: sono tutte di gravita' bassa dopo la verifica e vanno decise.

- **Salvataggio riparato in parte senza copia di sicurezza**: oggetti con famiglia o rarita' sconosciute, equipaggiamento verso uid scartati e record di dungeon sconosciuti vengono scartati e al primo salvataggio la perdita diventa definitiva, senza avviso. Succede solo con dati manomessi o dopo aver rinominato una famiglia senza alzare `SAVE_VERSION`. Proposta: far restituire a `deserializeCharacter` un flag "riparato" e copiare il testo originale in un backup.
- **La copia `...:corrupt` puo' essere sovrascritta** da un nuovo salvataggio illeggibile (perdendo un backup valido, per esempio di una versione futura); una versione piu' recente del formato verrebbe sovrascritta alla prima vittoria. Da gestire quando si introduce la versione 2.
Nessuna di queste e' stata riprodotta a mano. Le altre segnalazioni di questa revisione sono state corrette: vedi "Correzioni rapide" in "Risolti".

## Discesa (ramo `feature/discesa`)

Aperti:

- **Banda nelle stanze affollate** (misurata con il benchmark, non un difetto osservato in partita). Una stanza del ghiacciaio con quattro giocatori e 35 servitori invia circa 26 KB/s per client, il doppio del duello. Da tenere d'occhio sui tunnel lenti.
- **«Contatto con il boss» anche per il luogotenente** (osservato nel resoconto della sconfitta). La fonte del contatto ha un nome fisso in `match.ts`.
- **Stendardo della fase II sopra la schermata di vittoria** (osservato solo facendo avanzare la simulazione a scatti da script). Il boss era morto prima della fine dello stendardo. In partita normale servirebbe un danno enorme in meno di 1,6 s: non riprodotto giocando.
- **Nessuna prova giocata a mano**: stanze liberate da script e bot. Sensazione, difficoltà e leggibilità delle ondate restano da confermare.

Risolti con la fase 0 dello studio sulla grafica (rilevati leggendo il codice e confermati nel browser):

- **Colpi dei giocatori confondibili con quelli nemici**: rombo e dardo avevano un colore fisso, quindi il globo di gelo era identico alla nova del Custode e il dardo arcano al dardo a croce. Ora ogni forma usa il suo colore e le squadre hanno un trattamento diverso (test sul contrasto).
- **Proiettili mimetizzati**: il mantice del Colosso aveva esattamente il colore della lava; le spore della Madre il colore dei funghi del pavimento. Ricolorati mantice, braci e scossa; i funghi ora sono ciano.
- **Particelle sopra i proiettili**: le scie additive, disegnate dopo, sbiadivano i proiettili nemici. Ora stanno sotto.
- **Figure non ordinate**: chi stava dietro un nemico veniva disegnato sopra. Ora le figure si ordinano per profondità.
- **Strisce nel pavimento della cripta**: il "rumore" era una sinusoide regolare. Ora è un hash.
- **Decori fuori posto nelle stanze**: bracieri sulla porta centrale e sull'ingresso, torce in mezzo al campo. Ora stanno lungo i muri e lasciano liberi porte, ingresso e pilastri (test su tutte le stanze).

Aperti dopo la fase 0:

- **La zona libera davanti alle porte vale anche nell'arena del boss**, che porte non ne ha: lì il muro in alto ha meno torce. È solo aspetto.
- ~~**Il contorno scuro dei proiettili è uguale in tutti i temi**~~: risolto sul ramo `feature/grafica-fasi`. Nel ghiacciaio è spesso 4,5 invece di 3 (`ArenaTheme.projectileRim`, test).
- ~~**Boss e luogotenenti senza bordo chiaro**~~: risolto sul ramo `feature/grafica-fasi`. I fogli PNG hanno una sagoma tinta in cache (`sheetSilhouette`), i luogotenenti a matrici una tavolozza tinta. Il bordo sparisce durante la morte (test).

Risolti con le fasi 1–4 della grafica (ramo `feature/grafica-fasi`, visti nel browser):

- **Luci sotto i massicci**: le crepe di lava coperte dal Magazzino illuminavano la cima del blocco. Ora le luci nate dentro un massiccio vengono scartate prima delle figure.
- **Cima del muro in basso troppo chiara**: disegnata dopo la mappa di luce, restava al colore pieno mentre tutto il resto era scurito. Ora si scurisce con il buio della scena (`litColor`, test).
- **Tab bloccato nei menu**: legato alla mappa della discesa, impediva di spostare il focus tra i pulsanti. Ora la mappa vale solo in partita (test).
- **Servitori incastrati dietro i massicci** e tiratori che sparavano contro la pietra: trovati dai test delle stanze nuove, risolti con la deviazione da un angolo all'altro (test che falliscono senza).

Aperti dopo le fasi 1–4:

- ~~**Chiazze del pavimento della palude a bordi netti**~~: risolto. Il fango e l'acqua seguono un rumore interpolato con un tremolio per cella e una fascia di riva bagnata. Inoltre l'ultima fila di celle non sborda più oltre il fondo della stanza.
- **Tracce sopra i massicci**: una zona del giocatore mirata sopra un blocco lascia la bruciatura sulla cima. È solo aspetto.
- **Deviazione semplice**: funziona da un blocco all'altro nelle stanze di oggi. Con disposizioni più intricate servirebbe una ricerca di percorso vera.
- **Torrette dietro un massiccio**: se compaiono dove non vedono nessuno aspettano senza sparare. È voluto, ma va confermato giocando.

Fase 7 (vene B e C):

- **Valori mai provati a mano.** I 55 servitori nuovi passano i test automatici:
    - 20 secondi di vita ciascuno, senza stati invalidi;
    - un test per ognuno dei comportamenti nuovi.

  Difficoltà e leggibilità in partita restano da provare.
- **Le lanterne cimiteriali e gli altri dormienti** si disegnano in pietra grigia finché dormono, come i doccioni. Va visto se si confondono con l'arredo più del voluto.
- **Il Lettore di stelle era blu notte come le lastre del ghiacciaio:** schiarito dopo la prova a vista.
- **Il filo del ragno era troppo vicino ai funghi chiari della palude:** ricolorato (test sul contrasto).

Revisione indipendente del lavoro grafico (1° novembre 2026): nove problemi trovati, tutti corretti e coperti da test.

- **Luogotenenti delle vene invisibili in cooperativa:** il client cercava i boss solo fra i luogotenenti di sempre, quindi non li disegnava, ma il loro contatto feriva lo stesso. Ora la rete li trova tutti (test di replica sui 12 luogotenenti).
- **Corpi spinti nel muro o incastrati in un massiccio addossato alla parete:** da dentro un blocco si usciva dal lato più vicino anche se cadeva oltre il margine, e il margine riportava il corpo nel blocco.
    - Lo subivano verme delle radici, volpe artica, teletrasporti, figli dei nidi e comparse.
    - Ora si esce solo dai lati che restano nella stanza.
- **Inseguimento incastrato fra due nicchie:** la deviazione prendeva il primo blocco dell'elenco, non il più vicino sulla strada. Ora va in ordine di distanza e, se un blocco non ha angoli utili, prova il successivo.
- **Scatto fermo contro una faccia:** uno scatto di traverso contro un blocco non si muoveva affatto, ma consumava comunque mana e ricarica. Ora scivola lungo la faccia; solo uno scatto dritto contro il blocco si ferma.
- **Agguato fragile:** il tempo era condiviso con le altre abilità e la posa si chiudeva solo per gli inseguitori. Ora ha un tempo suo e un test sul catalogo ammette l'agguato solo sugli inseguitori.
- **Spirale doppia con colpi doppi alla prima raffica:** i due anelli coincidevano e consumavano il limite dei proiettili. Ora alla prima raffica parte un anello solo.
- **Mappa della discesa (Tab) di una discesa vecchia:** la chiave della mappa non distingueva due discese alla stessa tappa. Ora comprende porte e vene.
- **Grata dell'ingresso ferma dopo un nuovo inizio** nella stessa stanza modello: la chiave dell'atmosfera ora comprende il numero della discesa.
- **Levigatore della cooperativa:** le posizioni del server tornano al loro posto anche se il disegno si interrompe (`finally`).

Da sapere: con le stanze con i massicci nell'elenco, lo stesso seme dà stanze diverse da prima anche con la sola vena A. Le stanze di sempre non cambiano.

Risolti durante le prove nel browser:

- **Bestiario vuoto a schermo**: le miniature dei servitori ereditavano la regola `canvas` dell'arena (assolute, a tutto schermo) e coprivano le schede. Ora restano nel flusso.
- **Pulsanti Discesa/Duello fuori dalle schede dei dungeon**: l'altezza fissa di 480 px non bastava per la riga in più della discesa. Ora la scheda cresce e i pulsanti restano allineati in fondo.
- **Quinta statistica della vittoria della discesa da sola su una riga**: colonne più strette, ora stanno tutte e cinque su una riga.
- **Luogotenenti assenti dal Bestiario**: le uccisioni non venivano contate e il salvataggio le scartava. Ora contano, si salvano (test) e hanno la loro pagina.
- **Record del boss nella scheda**: diceva «1 vittorie · duello» anche per il boss battuto in discesa; ora «1 vittoria · in m:ss».
- **Accenti scritti con l'apostrofo** in alcuni testi a schermo nuovi («piu'», «li'», «priorita'»): corretti.

## Risolti

- **In partita singola la finestra «Combat report» si apriva sopra la schermata di vittoria o sconfitta**, con una sola riga (osservato nel browser). Ora le statistiche stanno nella schermata finale; la finestra resta solo in cooperativa, dopo la schermata.
- **Chi aveva salvato le impostazioni audio con la versione precedente restava con l'audio spento** anche dopo il passaggio all'audio attivo di base (osservato: l'impostazione `enabled: false` restava salvata). Ora le impostazioni v1 tornano ad audio attivo, conservando i volumi (test).
- **Testo superato nella schermata di pausa e fine**: «Audio attivabile con M» con l'audio ormai attivo di base. Tolto.

- **I pulsanti in alto a destra non si potevano premere nei menu** (rilevato nella prova browser dell'incremento audio): la schermata del menu (`.screen`, z-index 9) copriva `.actions` (z-index 4), quindi "Schermo intero" e il nuovo "Audio" erano visibili ma non cliccabili. Ora `.actions` ha z-index 31. Controllato nel browser a 1440 e 390 px; non coperto da test (DOM).

- **Hover giallo sui profili, testo poco leggibile**, segnalato dall’utente. Il selettore di profilo ora sovrascrive l’hover globale dei pulsanti con un gradiente prugna scuro e testo crema smorzato; stesso trattamento sul focus tastiera. Colore controllato con hover reale nel browser.

- **Card dungeon di altezze diverse e pallini disomogenei**, segnalati dall’utente. Tolte le descrizioni dalle card, sostituite con vignette del boss e della mappa; griglia a misure fisse e pallini CSS 7×7 px. «Loot rate %» usa un tooltip mobile al posto del dropdown. Misure e movimento del tooltip controllati nel browser a 1440 e 390 px, senza attribuire questi controlli a una prova giocata.

- **Pool di bottino troppo ampi, segnalato dall’utente.** Rimossa la pesca dal catalogo generico: ogni boss ha otto combinazioni esplicite (quattro di set e quattro inferiori). Le probabilità visualizzate e l’estrazione leggono le stesse voci/pesi; test verificano slot, limiti di rarità e distribuzione simulata. Profili di menu e inventario non descrivono più il sesso, che resta una scelta solo di creazione.

- **La tastiera di gioco intercettava il nome durante la creazione.** Rilevato nel collegare il nuovo modulo: WASD, F, M e Spazio avevano `preventDefault` globale. Ora gli elementi di input, textarea, select e contenuti editabili ricevono i propri tasti. Controllo browser con eventi di tastiera reali: nome «Ada M» digitato per intero, nessuna attivazione dell’audio.

- **Mira e mirino sfasati di un passo rispetto alla camera** (revisione). La mira era calcolata con la camera del passo precedente: camminando il mirino restava circa 3 unita' (4 px a schermo) dietro il mouse e dopo il Passo astrale saltava di 125 unita' per un fotogramma. Ora `PlayerIntent.aimOffset` e la mira si ricavano dopo il movimento, prima di ogni skill e a fine passo (come `syncAim()` nel prototipo). Test: la mira e' posizione + offset dopo il movimento e dopo lo scatto; il dardo parte verso il mouse anche mentre ci si muove. Le mutazioni (togliere la sincronizzazione dopo il movimento o a fine passo) fanno fallire i test.
- **Ctrl+R e Ctrl+F intercettati** (revisione). Il gioco bloccava il comportamento del browser per tutti i tasti legati, anche con Ctrl/Meta/Alt (Ctrl+R riavviava la partita invece di ricaricare la pagina; Ctrl+F attivava lo schermo intero). Ora le scorciatoie con modificatori sono lasciate al browser (`isBrowserShortcut`). Il prototipo aveva lo stesso difetto per W/A/S/D/Q/E.
- **Lacune dei test sui confini** (revisione). Mancavano prove per: contatto a 29, raggio di colpo sul boss (raggio + 26), margine delle zone sul boss (raggio + 25), soglia della carica (37), soglia di orbita (180), rinnovo del gelo senza somma, estremi della casualita' delle fratture, esito della morte simultanea (ora si asserisce `lost`, un solo `match_ended`, nessun `boss_defeated`). Aggiunte; ognuna fallisce con la mutazione corrispondente.
- **Id dello schema non nell'evento `boss_attack`** e posa iniziale 0,5 s duplicata (revisione). Ora l'evento porta `patternId` (il test di rotazione confronta gli id stabili) e la posa e' `BOSS_STATS.attackPose`.

### Correzioni rapide (proposta del ramo `feature/lavoro-personale`, 2026-10-31)

Difetti gia' elencati qui sopra o rilevati leggendo il codice; nessuno riprodotto a mano. Ogni test nuovo e' stato provato con la mutazione corrispondente (togliendo la correzione il test fallisce). **Prova manuale ancora da fare.**

- **La conferma dello scarto restava armata** uscendo dall'equipaggiamento con ESC (il pulsante "Indietro" la azzerava gia'): al rientro il primo clic su "Scarta" scartava davvero. Ora `Game.openInventory` chiama `InventoryScreen.reset()` prima di disegnare: selezione e conferma ripartono da zero. Non coperto da test (interfaccia in DOM).
- **Il colpo ravvicinato colpiva attraverso i pilastri**, a differenza dei proiettili (rilevato leggendo il codice). Ora `strikeArc` controlla la linea di vista fino al bordo del boss piu' vicino (`pillarBetween` in `arena.ts`): un pilastro in mezzo ferma il colpo; un boss sopra un pilastro piu' piccolo di lui resta colpibile dove sporge. Test in `match.test.ts`.
- **Lo scatto accorciava l'invulnerabilita'**: dopo un colpo (0,65 s) il Passo astrale la riportava a 0,55 s, come nel prototipo. Ora si tiene il valore maggiore. Il test che documentava il vecchio comportamento e' stato aggiornato; uno nuovo verifica che da un valore minore si arrivi a 0,55 s.
- **La barra spaziatrice era bloccata a livello globale**: con il focus su un pulsante la tastiera non lo attivava (i campi di testo erano gia' esclusi). Ora lo Spazio non e' bloccato su pulsanti, collegamenti e `summary` (`blocksBrowserDefault` in `core/input.ts`, con test); fuori dai controlli resta bloccato per non far scorrere la pagina.
- **Un `nextItemNumber` enorme nel salvataggio** (>= 2^53, o un uid come `i99999999999999999999`) produceva uid duplicati. Ora `deserializeCharacter` accetta solo valori fino a `MAX_ITEM_NUMBER` (1 000 000 000) e ignora gli uid oltre il tetto; inoltre `addRolls` salta qualunque uid gia' presente. Test in `character.test.ts`.
- **Due schede aperte si sovrascrivevano il salvataggio** ("l'ultima che salva vince"). Ora `Game` ascolta l'evento `storage`: quando un'altra scheda salva, adotta la sua raccolta (`rosterFromExternalSave` in `save-store.ts`, con test), mantiene il proprio profilo attivo se esiste ancora, ridisegna la schermata aperta e avvisa. Limiti: due salvataggi quasi simultanei restano "l'ultimo vince"; durante la creazione di un personaggio il menu non si ridisegna (per non perdere il nome scritto); una partita in corso prosegue con le skill che aveva. Il collegamento in `Game` non e' coperto da test.
- **L'HUD teneva in memoria le barre di ricarica di ogni partita**: gia' risolto nel commit `0a6e5f6` (`WeakMap`).

## Incremento livelli e mana
Corretto il difetto segnalato dall'utente: i boss attraversavano i pilastri e diventavano difficili da colpire. Movimento a piccoli passi e cariche interrotte contro gli ostacoli; atterraggi dei teletrasporti risolti fuori dai pilastri. Da confermare a mano. Il movimento attuale non include una ricerca completa del percorso: un boss puo fermarsi contro un pilastro se il giocatore resta esattamente dietro.

## Correzione attacchi modulari segnalati dall’utente
Rilevati: spada deformata durante l’attacco (si inclinava solo la lama); dita duplicate del ventaglio, separate dal braccio sinistro fermo. Corretti con rotazione rigida attorno alla presa, punti della mano condivisi con il braccio e scelta della mano animata secondo lo slot della skill. Margini dei fotogrammi ampliati per le armi inclinate. Test specifici verificano perno rigido, indipendenza delle mani e assenza di pelle nello strato del ventaglio. Fotogrammi Edge dell’anteprima controllati: non costituiscono conferma manuale del giocatore.

## Ritratti: oggetti staccati dal corpo

Segnalazione dell’utente: stivali sospesi sotto le gambe e armi sovrapposte alle mani senza essere impugnate. Correzione: basi maschili/femminili specifiche per le tre classi, prive di stivali incorporati; presa registrata per ogni arma, dita in primo piano e due punti di aggancio per ciascuno stivale (caviglia e suola). Corretto anche il verso degli stivali sulla posa specchiata del mago e mantenuta la testa davanti ai colletti delle armature. Controlli automatici: geometria di tutte le prese e dei tre paia di stivali sulle sei pose, persistenza della classe e migrazione v3; prova browser di scelta corpo/classe, ricaricamento, inventario e zoom senza eccezioni JavaScript. Fotogrammi delle pose maschili e femminili ispezionati; **approvazione visiva manuale ancora da ricevere**.

Seconda segnalazione dell’utente: miglioramento parziale, ma offset delle armature, proporzioni di alcune armi e stivali davanti alla tunica ancora errati; posa dell’arciere troppo tesa. Corretti i riferimenti delle armature con collo/cintura/spalle propri per ogni indumento e corpo, invertita la profondità tunica/stivali, ridimensionate le armi e riposizionata la presa dell’arco sul legno anziché sulla corda. Sostituite le due basi dell’arciere con pose rilassate. Corretto anche il rapporto del ritratto sotto 400 px, che era deformato da 164×250 a fronte del formato 4:5. Test di continuità busto/gonna e agganci sulle sei pose, fotogrammi maschile/femminile controllati; resta da ricevere la conferma visiva dell’utente.


## Storico delle migliorie multiplayer integrate dalla copia locale

Le misure seguenti precedono l’integrazione con le stanze della PR #4; non sono benchmark della versione combinata.

## Completamento diagnostica e cache (1 novembre 2026)

- Rilevata una differenza di antialiasing sulle rune nel confronto della cache con il pavimento originale: rune riportate nel contesto di disegno finale. Sei viste ora identiche pixel per pixel, mantenendo la cache delle piastrelle e le animazioni delle torce.
- Riprodotto arresto Vite con `EBUSY` sui file Cookies dei browser di test sotto `.tools/`: watcher configurato per ignorare `.tools/` e `dist/`. Non attribuito a questo errore il calo FPS della build pubblica segnalato dall’utente.
- Il caso di calo FPS all’ingresso dell’amico resta da misurare sul PC dell’utente con F2. Nella prova isolata il server non risulta saturo; non dichiarare risolto universalmente il problema dai soli FPS del test.

### Interpolazione del multiplayer (1 novembre 2026)

Implementata `NetworkView`, una copia riservata alla rappresentazione: camera, giocatore, alleati, boss, proiettili e servitori interpolano le posizioni a ogni fotogramma fra gli stati ricevuti. Input, HUD, danni, collisioni, ricariche e premi continuano a usare lo stato autorevole. Le scie seguono le posizioni visuali; la mira locale resta agganciata al puntatore. Server a 60 Hz e trasporto a 30 Hz invariati.

Buffer visivo provvisorio di un aggiornamento (circa 33 ms); non è predizione del movimento locale. Scatti e teletrasporti vengono mostrati immediatamente, così come l’esito finale. Dopo oltre 250 ms senza aggiornamenti si riallinea la scena; senza nuovi dati si ferma all’ultima posizione confermata, senza inventare movimento o colpi. Valori regolabili in `NETWORK_VIEW`.

Verifica: 484 test, tipi client/server e build superati. Sei nuovi test coprono posizioni intermedie, separazione dallo stato autorevole, alleati/boss/proiettili/servitori, arrivi irregolari, salti, interruzioni e fine partita. Nessun test visivo eseguito, su richiesta dell’utente: fluidità e ritardo percepito restano da confermare nella sua partita.

## Skill del Guerriero ancora magiche (1 novembre 2026)

Segnalazione dell’utente: un Guerriero appena creato continuava a ricevere skill simili a quelle del Mago. Il primo incremento aveva cambiato soltanto le statistiche. Corretto il catalogo degli oggetti per tutte le classi, mantenendo gli id salvati: il Guerriero riceve fendente, parata, buff difensivo e corsa fisica; Mago e Arciere hanno i propri kit. Aggiornate icone della barra, effetti e replica cooperativa. Controllati creazione, barra e buff nel browser; un test rilegge il Guerriero salvato senza perdere equipaggiamento. Conferma giocata dell’utente ancora da ricevere.

## Troppi decimali nel danno (1 novembre 2026)

Segnalazione dell’utente: danno inflitto e subito con numerose cifre decimali. Il risultato dopo bonus e difesa era applicato direttamente agli HP ed emesso negli eventi; la rarità aveva inoltre un arrotondamento anticipato. Corretto il calcolo con un solo difetto finale, condiviso da HP, eventi, numeri e report; conservata la precisione intermedia. Cure continue accumulate internamente per mantenere HP interi senza azzerare la rigenerazione a ogni passo. Prove automatiche della pipeline superate; conferma giocata dell’utente ancora da ricevere.

## Fasi 5 e 6 della grafica (ramo `feature/grafica-fasi-2`, 1 novembre 2026)

Trovati e corretti durante il lavoro:

- **Il bordo dei crepacci si confondeva con un colpo nemico** (`glacier_nova_late`, distanza di colore 55 contro le 70 richieste). L'ha fermato il test sul contrasto, che ora conta anche i colori dei tile; il bordo è più scuro.
- **Il centro della stanza dei Crepacci cadeva dentro un crepaccio.** Oggi nelle stanze di scontro non serve, ma i crepacci sono stati spostati e un test controlla che il centro resti pavimento.
- **Le abilità di classe di Jabbaz ignoravano i massicci.** La corsa del Guerriero colpiva oltre un blocco, e il lupo dell'Arciere ci saltava attraverso e ci restava incastrato. Ora usano la stessa linea di vista (`sightBlocked`) e il lupo aggira i blocchi. Due test, verificati con una mutazione.
- **I temi in cache non si disegnavano nei test senza browser:** la cache ora dipinge direttamente la vista quando non c'è `document`.

Aperti, da decidere con Jabbaz (vedi `docs/game-design.md`):

- i ripari non si rompono con i colpi ravvicinati, le zone o il lupo, solo con i proiettili;
- nelle stanze con i pozzi il regista manda gli stessi nemici delle altre, anche se c'è meno pavimento;
- le crepe di lava del pavimento della fucina sono decorative e si calpestano, accanto alla lava vera dei pozzi. Sono sottili e si distinguono, ma restano un'ambiguità;
- la palude ha ancora chiazze d'acqua bassa solo disegnate accanto all'acqua profonda vera. Si distinguono per colore e bordo, ma lo studio proponeva di renderle una regola (rallentano) o di toglierle.

### Seconda revisione indipendente (fasi 5 e 6)

Corretti, ognuno con un test in `run/room-hazards.test.ts` verificato con una mutazione:

- **Servitori incastrati all'angolo di un riparo** (la deviazione da un angolo all'altro oscillava fra due angoli): il campo di flusso vale in tutte le stanze con massicci, ripari o pozzi.
- **Servitori provocati che andavano dal giocatore sbagliato:** un campo di flusso per giocatore, scelto in base alla meta del servitore.
- **Il lupo dell'Arciere dentro un pozzo o un riparo** (alla comparsa, in attesa, nel salto dopo un'uccisione): ora sta sempre sul pavimento.
- **Ripari condivisi riconosciuti solo se ne restava uno in piedi:** registro esplicito delle mappe con i ripari.
- **La meta delle corse oltre il pozzo:** ora si ferma al bordo come la corsa.
- **Costi nei passi caldi:** niente copie e allocazioni nei controlli di percorso e nel ricalcolo del campo; dei pozzi lunghi si disegna solo la parte inquadrata.

### Stile unico dell'interfaccia (1° novembre 2026)

- **Pixelify Sans scartato:** la B maiuscola si legge come una G a ogni misura provata (10–48 pixel), quindi «Bestiario» diventava «Gestiario» e «Bach» «Gach». I testi restano nel carattere di sistema.
- **Silkscreen sfocato fuori dalla sua griglia:** a 10–12 pixel la C si chiudeva in una O («ESC» → «ESO», «Ricomincia» → «Rioominoia»). Corretto portando tutte le misure a 8 o 16, anche dove una regola successiva o una per gli schermi piccoli cambiava la misura. Il test `ui/fonts.test.ts` lo controlla.
- **I pulsanti non ereditavano il carattere:** il browser usa il proprio per pulsanti e campi. Ora `font-family: inherit`.
- **Numeri della vita e del mana troppo piccoli a 8 pixel** su uno schermo grande: su richiesta dell'utente vita, mana ed esperienza sono a 16 pixel. Il pannello della vita è spostato di 2 pixel perché le due barre restino allineate al pixel. Sotto i 600 pixel di larghezza i numeri tornano a 8, perché «200 / 200 MANA» a 16 andava a capo.

## Preda della Caccia permanentemente intoccabile nella palude (1 novembre 2026)

Segnalazione dell’utente: bersaglio simile a uno slime, che continua a evocare due funghetti ma non riceve i fendenti del Guerriero. Riprodotto scegliendo il Verme delle radici come preda: `Minion` lo inizializzava in `burrowed`, mentre `stepMinion` eseguiva il ramo della preda (fuga/evocazione) tornando prima del ciclo di emersione. Rimaneva quindi `isHidden` per sempre, immune anche agli altri attacchi, non solo al Guerriero.

Correzione: le prede iniziano `idle`, esposte e attive, senza ereditare gli stati iniziali sotterraneo/addormentato delle controparti ordinarie. I vermi normali restano sotterranei e i gargoyle normali dormienti. Test inizialmente falliti sul codice precedente, poi superati: preda della palude visibile, due sporelli evocati, danno dal fendente e stanza liberata con un inseguimento simulato. Nessuna modifica a HP, danni o frequenza degli spawn. Conferma giocata dell’utente ancora da ricevere; per una nuova verifica ricaricare e avviare una nuova discesa, e riavviare il server se in cooperativa.

## VFX personali fermi e duplicati (1 novembre 2026)

Segnalazione giocata dell’utente: cerchi di primaria Guerriero e buff Arciere lasciati nel punto del lancio, vecchi fendenti/barriere sovrapposti agli atlanti PixelLab. Corretto: il fendente e il lampo di parata seguono il proprietario (anche remoto); i buff vengono disegnati soltanto dallo stato persistente, nella posizione attuale. Eliminati i doppi anelli, archi e flash quando il relativo asset è pronto; i disegni precedenti restano soltanto come ripiego di caricamento. Il settore visivo del fendente usa raggio e arco dell’evento autorevole e viene ritagliato entro quel settore. Danno e cancellazione proiettili restano istantanei al lancio: lo sprite in dissolvenza non aggiunge colpi durante il movimento. Test di regressione su ancoraggio, buff senza duplicati e ripiego. Nuova conferma giocata dell’utente ancora da ricevere.

## Messaggio party fuorviante per disallineamento client/server (1 novembre 2026)

Segnalato il messaggio di ricarica anche con il numero di versione aggiornato nel menu. Il controllo riguarda il protocollo di rete, non il numero mostrato: un processo server vecchio o un client in cache può mantenere un protocollo diverso. Verificato sul servizio attivo: protocollo 8 accettato e creazione party riuscita, protocollo 7 rifiutato. Messaggio aggiornato per indicare anche aggiornamento e riavvio del server cooperativo quando la ricarica non basta. Non alterato il controllo di compatibilità.

## Scaling HP cooperativo applicato solo ai luogotenenti (1 novembre 2026)

Rilevato dal nuovo test di bilanciamento: boss finali in Duello/Discesa e servitori non ricevevano il +50% HP per membro aggiuntivo già previsto, mentre i luogotenenti sì. Unificato il fattore in `combat/party-health.ts`, applicato ai dati del boss all’ingresso e alle nascite dei servitori. La replica continua a leggere gli HP esatti del server senza riscalarli. Test del Duello a due membri: boss Cripta 8.100 HP, servitore base 100 → 150 HP, stessa vita dopo replica. Luogotenenti senza doppio aumento.

## Footer versione e changelog che risale scorrendo il menu (1 novembre 2026)

Segnalazione dell’utente con screenshot: durante creazione personaggio e ridimensionamento, la fascia inferiore rimaneva a metà della finestra. Il footer `fixed` era discendente di `.screen`, che ha `backdrop-filter` e scorrimento: quel filtro stabilisce il containing block anche per i discendenti fissi. Spostato il footer come fratello della schermata menu, fuori dal contenitore filtrato, conservando la visibilità solo nel menu e lo spazio riservato a fine contenuto. Controllo tecnico nel browser di coordinate durante scorrimento e ridimensionamento; nuova conferma visiva del proprietario ancora da ricevere.


### Limiti dell’incremento progressione/rifugio · 2 novembre 2026
- Controllo UI automatico non completato: localhost va in timeout nel browser integrato; Computer Use Windows interrotto perché l’URL corrente non è verificabile. Aspetto, ridimensionamento e flussi DOM richiedono conferma manuale.
- Oro condiviso solo fra i profili del medesimo salvataggio browser/origine, nessuna identità cloud o economia protetta. Come per gli altri progressi, scritture simultanee da più schede non sono transazioni: evitare due run contemporanee sullo stesso salvataggio.
- L’hub è locale e personale; la simulazione cooperativa dei raid resta autorevole sul server. Deposito e servizi non sono una mappa multiplayer condivisa.

Aggiornamento rifugio 2 novembre: controllo desktop nel browser ora riuscito usando il server locale sulla porta 5176. Restano da confermare dall’utente aspetto, controlli e resa responsive. La precedente nota sul mancato controllo visivo resta storica.

Deposito, 2 novembre: durante la prova browser il trascinamento HTML nativo non trasferiva l’oggetto. Sostituito con Pointer Events e verificato il trasferimento nei due sensi e il salvataggio della posizione. La resa su dispositivi touch è ancora da confermare.


### Correzioni party, inviti e profili · 2 novembre 2026

Il widget del party si riallinea anche dalla presenza autorevole periodica nell’hub dopo l’accettazione dell’invito. Il link della stanza apre una visita all’hub; l’invito tramite E e la sua accettazione aggiungono il visitatore ai quattro membri del party. Inviti condivisibili solo con URL pubblico HTTPS, mai localhost/LAN: `npm.cmd run tunnel` registra il tunnel Cloudflare corrente per la porta del server. Restano supportati `PUBLIC_URL` e il riconoscimento dell’accesso tramite Cloudflare. Senza indirizzo pubblico noto, Copia invito è disabilitato invece di copiare un link locale.

Scambia invia prima una richiesta: «Accetti lo scambio da X?» con Sì/No. Solo il destinatario può accettare; prima del consenso il server rifiuta offerte e conferme, e nessun inventario di scambio viene aperto. No, chiusura o disconnessione annullano la richiesta. La doppia conferma finale resta necessaria. Mostra profilo visualizza statistiche, ritratto ed equipaggiamento indossato, senza zaino o deposito. Protocollo 12; riavvio server e ricarica client richiesti.

Controllo browser automatico con un client locale e uno tramite tunnel Cloudflare reale: link pubblico dal leader locale, due membri nel widget dopo accettazione, profilo senza zaino, No che annulla la richiesta e Sì che apre le offerte su entrambi i client. Conferma manuale dell’utente ancora da ricevere.
