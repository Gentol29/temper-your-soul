# Roadmap

## Migrazione MMO · 10 novembre 2026

- Release v0.17.00: codice di lobby e storage singolo superato rimosso; archivi locali, migrazioni e copie di sicurezza conservati. Verifica finale: 1.064 test, tipi e build.

- Implementati HUB globale, ingresso con account, repository PostgreSQL, comandi autorevoli per beni e premi, scambi transazionali, ingressi tardivi e uscita senza KO.
- Conservati passo fisso 60 Hz, codec ordinato compatto v2 a 30 Hz e artwork del rifugio. Protocollo applicativo 21.
- Ripristinati icona Party e inviti con consenso per gruppi sociali di quattro persone; menu con Logout, Esc e presenza nell’HUB conservata. Componente LoadingIndicator riutilizzabile per API, ingresso nel mondo, transizioni e salvataggi.
- Verifica della revisione: 1.064 test, tipi e build; browser con due account fittizi, invito/consenso, permanenza dell’avatar dal menu e rimozione al logout. Prova giocata con account reali ancora da eseguire.
- Configurati provider Supabase e colonne di `profiles`; connessione `pg`, UPSERT e rollback verificati su tabella temporanea. Implementati Accedi e Crea account nel gioco con conferma email e rinnovo sessione; verifica completa: 1.052 test, tipi e build.
- Da provare: registrazione reale, consegna e conferma email, accesso all’HUB, 32 persone, portali pubblici, economia e persistenza dopo riavvio. Da risolvere prima dell’uso pubblico: RLS remota sui profili. [Specifiche e limiti](mmo-persistente.md).


## Priorità corrente e TODO

- [x] Rimosso il tooltip persistente delle azioni del menu principale, mantenendo navigazione e descrizioni accessibili.

- [x] Forgia utilizzabile lungo tutto il fronte, tooltip coerente anche arrivando da sinistra; nomi dell’HUB e tooltip ridotti di 2 px. Collisioni conservate dopo il riscontro positivo dell’utente.
- [ ] Conferma manuale del nuovo accesso della Forgia e della misura ridotta delle scritte.

- [x] HUB: appoggio dei piedi coerente con collisioni e profondità, sagome prospettiche, limite al selciato e partenze cooperative libere; protocollo 17. Etichette a risoluzione schermo e canvas senza stiramento frazionario.
- [ ] Prova giocata lungo tutti gli edifici e la cinta, apertura dei quattro servizi, ponte sud, ghosting sul monitor dell’utente e cooperativa dopo il riavvio. [Verifiche tecniche](hub-artwork.md).

- [x] Fabbro dentro la Forgia, con due schede per creazione e migliorie; NPC e ostacolo separati rimossi. Protocollo 16.
- [ ] Conferma manuale delle due schede, creazione/migliorie e passaggio libero nell’area del vecchio banco.

- [x] Revisione locale PR #14: menu essenziale, Entra, Silkscreen globale, artwork condiviso con HUB giocabile e ingresso con zoom/materializzazione. Protocollo 15; salvataggi invariati.
- [ ] Prova manuale del nuovo HUB: ingresso, durata dello zoom, font, ostacoli, Portale/Deposito/Forgia/Fabbro/Mercante e cooperativa dopo il riavvio. [Dettagli](hub-artwork.md).

- [x] Camera degli incontri con offset del mouse limitato e smorzamento esponenziale a ogni fotogramma, separato dal passo fisso. Mira dalla vista decentrata; gli snapshot cooperativi ricentrano soltanto entrando in una stanza. Dieci nuovi test, verifica completa della v0.11.01: 872 test in 79 file, tipi e build.
- [x] Controllo tecnico nel browser della camera a desktop e 390 px: limite, cursore fermo senza deriva, movimento, mira, pausa/ripresa e resize; nessuna eccezione. Non costituisce conferma giocata.
- [ ] Prova giocata della camera: tarare massimo 100 unità / velocità 8 s⁻¹, provare rientro al centro, movimento/scatti, pausa, finestre strette e cooperativa. HUB con camera autonoma invariato; limiti ai bordi degli incontri ancora aperti.

- [x] Versione nel menu e changelog dell’ultimo aggiornamento, con storico nel codice e procedura obbligatoria per gli agenti su PR/commit main. Valori di bilanciamento prima → dopo.
- [ ] Conferma utente di posizione, leggibilità e apertura del changelog nel menu, anche su finestre strette. Nessuna prova visiva automatizzata eseguita.

- [ ] **Sprite e ritratti: lavoro sospeso su richiesta dell’utente.** Alla ripresa rivedere manualmente vestibilità delle armature, scale delle armi, prese, giunzioni delle gambe e profondità degli strati. Evitare rigenerazioni successive per ogni incremento di gioco; prima fissare basi, misure e criteri di accettazione. Le revisioni precedenti sotto restano storico, non approvazione finale.
- [x] Creazione con nome, sesso e classe, conferma unica e identità non modificabile dallo zaino.
- [x] Set bianco novizio per ciascuna classe, escluso dai drop; GS per pezzo e totale equipaggiato.
- [x] Drop non garantito, primo boss al massimo Raro, bottino senza filtro di classe; probabilità nelle schede dungeon.
- [x] Testi, campi e pulsanti nuovi nel tema globale Reliquiario.
- [x] Sesso visibile solo nella creazione, rimosso dai riepiloghi del profilo.
- [x] Pool specifici per boss: quattro pezzi di set e quattro alternative inferiori, uno per slot, con percentuali esatte.
- [x] Otto oggetti nuovi con skill/statistiche, mana, icone, effetti, strati animati e ritratti disegnati nel codice; nessuna rigenerazione raster.
- [x] Drop uniforme al 25%; card dungeon di altezza unica, artwork basati su sprite/tema, pallini uniformi, «Loot rate %» come tooltip mobile.
- [x] Profili locali multipli con selezione, creazione annullabile, rimozione nominativa e migrazione del vecchio personaggio con copia di sicurezza.
- [x] Pulsante Menu principale in alto a sinistra, disponibile anche durante la partita.
- [x] Hover profili scuro e leggibile; bottino condizionato 25% → 1/3 set o 2/3 verdi → 25% per pezzo.
- [x] Ingresso T3 da 100 GS e T4 da 200 GS, controllato sia nella scheda sia all’avvio.
- [x] Vincoli di classe per tutte le 25 famiglie; oggetti incompatibili scuri, niente equip tramite clic/drag e conservazione nello zaino dei vecchi oggetti.
- [x] Interfaccia party in alto a destra: quattro posti, sprite del personaggio attivo, lobby locale con stato pronto e boss comune; stile Reliquiario e layout mobile.
- [x] Server cooperativo autorevole Node/WebSocket: link, leader/destinazione/avvio, pronto, controllo GS di tutti, alleati/boss condivisi, no fuoco amico, ping, KO/disconnessioni, premi personali e combat report.
- [x] Ottimizzazione rete/rendering: protocollo compatto v2, entità riutilizzate, raster cache, badge ping senza ricostruzione DOM, snapshot serializzato una volta per stanza e stop dopo la fine.
- [ ] Prova giocata con amici su reti differenti; predizione locale, riconnessione e server persistente in incrementi successivi. Profilare i picchi RTT osservati nel browser in sviluppo Vite (fino a 922 ms nella prova localhost→tunnel), distinti dalle misure dirette e dalla build pubblica.
- [ ] Provare manualmente creazione, persistenza, sensazione dei tre set iniziali, grind e premi dei quattro boss.
- [ ] Tarare GS, livelli oggetto, probabilità e futuro effetto del livello oggetto sulle statistiche.
- [ ] Prova manuale del grind per classe, della chiarezza delle probabilità condizionate e dei blocchi GS.
- [x] Revisione PR #4: mantenuti mappe, 32 servitori, luogotenenti/pre-boss, Bestiario e direzioni delle stanze.
- [x] Rimossi premi intermedi, tempre, sigilli, braci, Altare e selettori a tendina di dungeon/modalità/grado. Skill dell’equipaggiamento e ricompense dei boss invariate.
- [x] Salvataggio v7 conservato senza perdita dei dati storici; relativi bonus disattivati. Protocollo cooperativo 5.
- [ ] Prova manuale utente: porte, mappe, Prova/Assedio/Caccia, luogotenenti, Bestiario, ricompense dei soli boss, singolo e cooperativa. Nessuna nuova prova visiva automatizzata richiesta.
- [ ] Definire con l’utente la progressione tra stanze in un incremento successivo.
- [ ] Tarare budget e danni dei servitori dopo le prove giocate.

Verifica automatica della revisione: `npm run verify` superato, 555 test in 42 file, tipi e build. Le prove manuali della revisione restano da fare dall’utente. Le correzioni descritte sotto appartengono alla PR originale e non confermano la revisione corrente.

Corretti durante le prove:
- miniature del Bestiario che coprivano la schermata;
- pulsanti delle schede dei dungeon fuori dal riquadro;
- quinta statistica della vittoria a capo;
- luogotenenti assenti dal Bestiario;
- testi con accenti scritti come apostrofi.

Non è una prova giocata a mano: le stanze sono state liberate da script e bot.

Incremento vincoli e probabilità: **383 test**, tipi e build superati. Copertura delle tre classi su tutte le famiglie, dei set iniziali compatibili, della lettura di vecchi equipaggiamenti, dei confini GS e della raggiungibilità delle soglie tramite i dungeon precedenti. Browser isolato a 1440 e 390 px: hover scuro, arco non equipaggiabile al Mago da clic destro o pulsante, trascinamento disattivato, blocchi T3/T4 a 80 GS, sblocco esatto a 100/200, tooltip 33,33%/66,67% e quote per pezzo. Nessuna eccezione JavaScript; conferma giocata ancora da ricevere.

Incremento cooperativa: 397 test, tipi client/server e build superati. Prove automatiche con due browser isolati: locale (sconfitta comune) e tunnel (vittoria comune, 934/866 danni), lobby/invito, autorità del leader, pronto/destinazione, movimento remoto, mana, mondo senza pausa e report identico. Premi: 100 XP personali salvati una volta, anche con snapshot finali ripetuti. Screenshot desktop e report 390 px ispezionati, nessuna eccezione JS; non è conferma manuale. RTT WebSocket su 40 campioni per percorso: locale mediana 0,34 ms, p95 1,20 ms; tunnel mediana 13,85 ms, p95 17,05 ms (misura da questo PC, non una garanzia per altre reti).
- [ ] Provare manualmente i nuovi set, le abilità e la leggibilità delle quattro nuove forme di proiettile; resa dei nuovi strati nei due corpi ancora da approvare.
- [ ] Definire e implementare permadeath e ricreazione dopo la morte.

Incremento creazione e bottino: formato v5 con migrazione senza reset dei vecchi progressi; 370 test, tipi e build superati. Prova browser automatica su profilo isolato: digitazione reale del nome (inclusi tasti di gioco), set dell’Arciere, ricaricamento, identità consultabile, GS e tooltip, dettagli drop che non avviano la partita, avvio esplicito del dungeon. Fotogrammi desktop e 390 px controllati. Questi controlli non sono una prova giocata né una conferma manuale.

Incremento card e raccolta personaggi (v6): **377 test**, tipi e build superati. Browser su profilo isolato: create tre classi, verificati gli inventari distinti, selezione, annullamento della rimozione, rimozione di profili attivi/inattivi, ricaricamento e raccolta vuota dopo l’ultimo; nessuna eccezione JavaScript. Misurate le altezze uguali delle quattro card e dei sedici pallini; artwork distinti; tooltip con otto voci che segue il cursore; menu raggiunto con clic reale in alto a sinistra. Fotogrammi desktop e 390 px controllati. Ancora da provare manualmente: migrazione del proprio salvataggio, comodità della gestione personaggi e resa degli artwork. Nessuna nuova conferma manuale dedotta.

Revisione pool per boss: **371 test**, tipi e build superati. Verificati otto ingressi per boss, copertura dei quattro slot nei due gruppi, rarità inferiore delle alternative, disponibilità di tutte le 25 famiglie e corrispondenza delle distribuzioni simulate con le percentuali mostrate. Test delle otto nuove skill e copertura dei kit sui due corpi. Controllo browser isolato: sesso assente nei due riepiloghi, gruppi set/alternative visibili, strati dei nuovi oggetti presenti e quattro nuovi proiettili renderizzati su Canvas senza eccezioni. Fotogrammi dei nuovi strati controllati, qualità artistica e prova giocata ancora da confermare. Il completamento dei set non conferisce bonus aggiuntivi.

## Incremento aspetto modulare (implementato, prova manuale da fare)

Aggiornamento richiesto: ritratto illustrato derivato dalla tavola A nello zaino e nella selezione del corpo, con Zoom; sprite piccolo mantenuto per il gioco. Differenziate fisionomia e corporatura femminili e adattati tutti gli oggetti; introdotti strati anteriori/posteriori per armi lunghe inclinate verso l'esterno. Test automatici: copertura delle 17 famiglie illustrate, ritagli entro gli atlanti, versioni femminili delle cinque armature, corporatura femminile più esile anche senza capelli, profondità e martello fuori dal viso in tutti i fotogrammi. Fotogrammi Edge dei due sessi controllati: nessuna nuova conferma manuale dedotta.

Prova di fumo Edge su profilo isolato: zaino visibile, ritratto illustrato con quattro strati equipaggiati, apertura Zoom, Escape chiude Zoom lasciando aperto lo zaino, nessuna eccezione JavaScript. Controllato anche il fotogramma della scheda reale, oltre alla pagina di anteprima. Verifica completa: 358 test, tipi e build superati.

Scelta artistica ricevuta: A — Fantasy compatto. Primo adattamento modulare animato implementato; da confrontare a mano con la tavola scelta. Pagina di sviluppo `/character-animation.html`: cambio sesso, tutti i 17 oggetti, riposo/camminata/lancio, specchiatura, ritratto e miniatura. Tipi, test e build controllano gli asset; un fotogramma Edge headless ha mostrato il prototipo, non dimostra qualita artistica approvata o prova giocata.

Storico v3: scelta iniziale Maschio/Femmina e modifica nello zaino. **Superato dal v5: sesso e classe fissi alla creazione.** Due corpi generici e 17 aspetti indossabili, nelle versioni ritratto e combattimento, composti in strati distinti dalle icone. Test automatici coprono tutte le famiglie su entrambi i corpi e alle due risoluzioni, persistenza, migrazione, cambio/rimozione oggetto e pose. Nessuna nuova conferma manuale ricevuta.

- [ ] Scelta iniziale e persistenza dopo ricaricamento; nessuna modifica dell’identità nello zaino (decisione v5).
- [ ] Ogni oggetto cambia aspetto nel ritratto e in combattimento, con entrambi i corpi.
- [ ] Rimuovere un oggetto mostra il corpo base nella zona interessata.
- [ ] Camminata, lancio, mira a destra/sinistra e lampeggio restano leggibili senza strati disallineati.
- [ ] I precedenti salvataggi conservano oggetti, XP e record.

Le fasi sono una **proposta di ordine di lavoro**, non una pianificazione vincolante, e non fissano valori di design. Ogni fase e' un piccolo incremento che lascia il progetto avviabile. Le regole aperte stanno in `docs/game-design.md`.

Criterio valido per tutte le fasi: `npm run verify` con esito positivo (tipi, test, build), test estesi quando serve, **prova manuale da parte dell'utente**, `docs/bugs.md` aggiornato.

## Fase 0: fondamenta e porting del prototipo (implementata, prova manuale confermata in generale)

Il prototipo "Emberfall" (JavaScript classico, variabili globali, regole e disegno mescolati) e' stato riscritto in **TypeScript** con la struttura di Ashen Realm, mantenendo le stesse regole e gli stessi valori: arena, mago con quattro skill, guardiano a due fasi con sei attacchi, particelle, pixel art, HUD, menu/pausa/fine partita, audio sintetizzato. Aggiunti: simulazione a passo fisso senza DOM e riproducibile con un seme, eventi dalla simulazione verso effetti/audio, dati separati da comportamento e aspetto, suite di test, `verify`, documentazione, repository dedicato. Il prototipo originale e' in `legacy/emberfall-prototype/`. Le differenze volute di comportamento sono elencate in `docs/game-design.md`.

Completa quando: `npm run verify` termina con codice 0 **e** la prova manuale dell'utente nel browser (checklist sotto) e' superata.

**Stato: controlli automatici superati; prova manuale eseguita dall'utente.** L'utente ha dichiarato in modo generale che "funziona tutto correttamente" dopo aver provato il gioco nel browser (2026-10-30). Non ha riportato l'esito voce per voce: le caselle sotto restano non spuntate perche' non e' stato detto quali punti specifici sono stati provati (in particolare, non risulta confermato in modo esplicito il giudizio sulla scossa dello schermo, nuova rispetto al prototipo).

Controlli automatici eseguiti: controllo dei tipi (strict), test Vitest su regole, boss, skill, giocatore, partita, effetti e coerenza dei dati, build di produzione, prova di mutazione dei test piu' importanti, prova di fumo in Edge headless (carica da `file://`, avvio con input reali, pausa, ripresa, riavvio, nessun errore in console) e revisione indipendente del porting contro il prototipo (esito in `docs/bugs.md`). Fotogrammi renderizzati hanno mostrato arena, boss, mago, proiettili, zone, nomi degli attacchi e HUD, ma **non sostituiscono la prova giocata**. I test non coprono l'interfaccia in DOM (HUD, schermate, pulsanti) ne' la sensazione di gioco.

Checklist manuale (non spuntata voce per voce; vedi lo stato sopra):

- [ ] Il gioco si apre (`npm run dev` e anche `dist/index.html` con doppio clic) e mostra il menu "Risveglia il guardiano." sopra l'arena; "Entra nella cripta" avvia la partita.
- [ ] WASD muove il mago alla stessa velocita' del prototipo, anche in diagonale; il mago si gira verso il mouse; il mirino e' dove punta il mouse.
- [ ] Clic sinistro tenuto: dardi a raffica; clic destro: globo di gelo che rallenta il boss (il boss diventa azzurrato e lento); Q: meteora nel punto mirato con segnale viola e caduta; E: scatto verso il mouse con invulnerabilita' (il mago lampeggia dopo un colpo).
- [ ] Anche tenendo il clic sinistro premuto, clic destro, Q ed E funzionano; un tocco brevissimo su Q/E lancia comunque la skill.
- [ ] Le quattro ricariche in basso si svuotano e si riempiono come le skill.
- [ ] Il boss insegue, poi gira attorno al mago; sei attacchi in rotazione con il nome sopra la testa: nova, raffica, frattura (zone arancioni con conto alla rovescia), carica (fascia a terra, poi scatto), spirale, triplice ventaglio.
- [ ] Sotto la meta' della vita il boss entra in furia ("IL GUARDIANO SI INFURIA"): occhi/rune rossi, attacchi piu' fitti e veloci.
- [ ] I danni coincidono con le barre: vita del mago, vita del boss, numero del danno sul boss e "-N" rosso sul mago.
- [ ] La camera trema leggermente per colpi subiti, scoppi, furia e fine della carica (nuovo rispetto al prototipo): non da' fastidio.
- [ ] Una freccia in alto o in basso sul bordo indica dov'e' il boss quando e' fuori schermo.
- [ ] ESC mette in pausa e riprende; cambiare scheda o finestra mette in pausa; R ricomincia da qualunque schermata; M attiva l'audio (suoni al lancio e quando si e' colpiti); F schermo intero.
- [ ] Vittoria ("Il guardiano e' caduto" con tempo e vita rimasta) e sconfitta ("La brace si e' spenta"); "Riprova" riparte pulita (barre piene, nessun proiettile o effetto residuo, tasti non incastrati).
- [ ] Il gioco si adatta al ridimensionamento della finestra e allo schermo intero; la pixel art resta nitida.
- [ ] Nessuna differenza di sensazione evidente rispetto al prototipo (`legacy/emberfall-prototype/index.html`) a parte quelle elencate in `docs/game-design.md`.

## Fase 1: menu, dungeon, oggetti e salvataggio locale (implementata, prova manuale da fare)

Il gioco passa da un duello singolo a un ciclo completo: **menu iniziale**, **scelta tra 4 dungeon** (la cripta più palude, fucina e ghiacciaio, ognuno con mappa e boss unici), **oggetti che cadono dai boss** con 5 rarità, **abilità che dipendono dall'equipaggiamento** (4 slot, 17 famiglie, come in Ashen Realm) e **personaggio salvato in locale**. Refactor di base: arena, boss e skill sono ora definizioni di dati (`ArenaDefinition`, `BossDefinition`, `SkillDefinition`), la partita (`Match`) riceve dungeon e skill; nuovi tipi di effetto (ventaglio, zona sul lanciatore, colpo ravvicinato), pilastri che bloccano movimento e proiettili, azioni programmate del boss (onde, teletrasporti). Regole e valori della cripta e delle skill base sono rimasti identici al prototipo. Valori e struttura in `docs/game-design.md`.

Completa quando: `npm run verify` termina con codice 0 **e** la prova manuale dell'utente (checklist sotto) è superata.

**Stato: controlli automatici superati; prova manuale ancora da fare** (nulla è confermato a mano).

Controlli automatici eseguiti: controllo dei tipi, suite Vitest (regole, boss, skill, giocatore, partita, dungeon, oggetti, bottino, salvataggio, effetti, vista inventario), test generici validi per ogni dungeon registrato (mappa, schemi, simulazione lunga senza stati invalidi), build, prova di mutazione, revisione indipendente con verifica avversa (esito in `docs/bugs.md`) e una prova nel browser vero (Edge headless): menu, i 4 dungeon avviati, pausa e abbandono, vittoria forzata con bottino e record in tutti e 4 i dungeon, salvataggio presente in `localStorage` prima di mostrare il bottino, inventario intatto dopo il ricaricamento, equipaggiare un oggetto cambia le skill in partita. Fotogrammi renderizzati hanno mostrato menu, mappe e boss, ma **non sono una prova giocata**: non coprono leggibilità degli attacchi, difficoltà, sensazione di gioco e prestazioni.

Checklist manuale (da eseguire; nessuna voce è spuntata):

- [ ] Il gioco si apre sul menu "Temper your soul" con "Dungeon" ed "Equipaggiamento"; la nota sotto i pulsanti indica lo stato del salvataggio.
- [ ] "Dungeon" mostra 4 schede (cripta, palude, fucina, ghiacciaio) con pericolo, descrizione, boss e record; passando sopra una scheda lo sfondo mostra la mappa; un clic avvia la partita.
- [ ] **Cripta**: identica al prototipo (stessi attacchi e tempi del guardiano, stesse skill).
- [ ] **Palude**: mappa verde con alberi morti che fermano i movimenti e i proiettili; la Madre delle spore è lenta; gli attacchi sono leggibili e schivabili (cerchi di zone con il centro sicuro, tentacoli, anelli che si chiudono, pioggia, balzo).
- [ ] **Fucina**: mappa larga con lava e pilastri di ferro che fanno da riparo; il Colosso è enorme e lento con zone molto grandi; la martellata lascia un anello di schegge.
- [ ] **Ghiacciaio**: colonne di cristallo; il Custode è veloce e si teletrasporta (con segnale a terra prima), spirali opposte, nova doppia, carica con zone sul percorso.
- [ ] I pilastri bloccano il mago (scivola lungo il bordo, non resta incastrato) e fermano i proiettili del boss e i propri; lo scatto non finisce dentro un pilastro.
- [ ] Ogni boss ha una grafica diversa e il testo "… SI INFURIA" con il proprio nome sotto metà vita; gli attacchi hanno un nome sopra il boss.
- [ ] Le difficoltà crescono da cripta a ghiacciaio in modo percepibile ma sensato (nessun attacco ingiusto o inevitabile).
- [ ] Alla vittoria compare "Vittoria." con 1 o 2 oggetti (colorati per rarità), eventuali record ("Prima vittoria", "Nuovo record") e la scritta "Salvato in questo browser".
- [ ] Ricaricando la pagina gli oggetti, l'equipaggiamento e i record sono ancora lì; la nota del menu dice che i progressi sono stati caricati.
- [ ] "Equipaggiamento": 4 slot con la skill di ciascuno e le statistiche; equipaggiare un oggetto dell'inventario cambia la skill (anche la HUD in partita: nomi e comandi); "Rimuovi" svuota lo slot (la skill sparisce e la scheda in partita mostra "— vuoto —"); "Scarta" chiede conferma e non permette di scartare un oggetto equipaggiato; i filtri per slot funzionano.
- [ ] Le skill nuove si sentono diverse: arco veloce, scettro lento e pesante, talismano e ventaglio a più proiettili, Lama del guardiano a corto raggio con arco visibile, esplosioni attorno a te, scatti con invulnerabilità diverse.
- [ ] Le rarità più alte si sentono più forti (danno e ricarica) senza rompere il gioco.
- [ ] ESC in partita mette in pausa; "Abbandona e torna al menu" funziona; ESC nelle schermate del menu torna indietro; R ricomincia solo durante una partita.
- [ ] Dopo la sconfitta "Riprova" riparte pulita; dopo la vittoria "Riprova" non assegna di nuovo il bottino senza una nuova vittoria.
- [ ] Il menu e le schermate sono usabili a finestra stretta o bassa (scorrono, i pulsanti sono raggiungibili).
- [ ] Se si blocca il salvataggio (finestra in incognito/privata o dati del sito disabilitati) il gioco funziona e avvisa che i progressi non si conserveranno.

## Fasi successive (proposta, nessuna avviata)

L'ordine dipende dalle risposte ai punti aperti di `docs/game-design.md`, soprattutto la **direzione del gioco** ("temprare l'anima") e le regole di **morte** e **progressione**.

1. **Messa a punto e sensazione di gioco**: tarare con la prova manuale valori di boss, skill, rarità e bottino; unificare i raggi di collisione; interpolare il disegno tra i passi; feedback di colpo; limiti di camera. Completa quando l'utente ritiene i dungeon piacevoli e ben bilanciati tra loro.
2. **Progressione e "tempra"**: il meccanismo che dà senso al nome del gioco (da definire con l'utente), con regole di morte, livelli ed eventuali tier T1-T15, sblocco o scalatura della difficoltà dei dungeon.
3. **Altri slot e modificatori**: anello e collana che modificano le skill, ali sulla velocità, pantaloni e peso dell'armatura (come in Ashen Realm); modificatori casuali sugli oggetti.
4. **Gestione dell'inventario**: capienza, confronto tra oggetti, vendita o riforgiatura, ordinamento.
5. **Altri dungeon e boss**: aggiungere dungeon è aggiungere una cartella in `features/dungeons/` (mappa, boss, tema, grafica, tabella di bottino) e farli passare dai test generici.
6. **Salvataggio avanzato**: esportazione/importazione, più profili, cloud (richiede un backend), gestione di due schede aperte.
7. **Grafica e audio definitivi**: sostituzione delle forme e della pixel art provvisorie, musica.
8. **Controlli e piattaforme**: rimappatura tasti, controller, touch.
9. **Sviluppi successivi**: classifiche, co-op, altro.

## Inventario a slot e sprite (2026-10-31)

Implementati pulsante zaino, 17 sprite originali per le famiglie esistenti, griglia con bordi per rarità e tooltip su mouse/focus condivisi con il bottino. Selezione e comandi di equipaggiamento/scarto separati dalla griglia. Controlli automatici: catalogo sprite completo e matrici valide, statistiche risolte, suite `verify`; prova browser automatica con dati di test per selezione, equipaggia/rimuovi, conferma scarto, tooltip e viewport da 390 px. **Prova manuale dell'utente ancora da eseguire**, in particolare riconoscibilità degli sprite e comodità dei tooltip.

## Incremento livelli, mana, HUD e collisioni boss
Implementato, prova manuale da fare. Verificare: XP dopo ogni vittoria e persistenza ricaricando, migrazione inventario precedente, progressione di piu livelli; mana consumato e rigenerato (differenze fra equipaggiamenti), pausa; HUD e tooltip a diverse risoluzioni; tutti i boss contro i pilastri durante movimento/carica, atterraggio del Custode; differenza Comune/Leggendario. Nessuna conferma manuale ricevuta.

## Incremento ritratti e pose di classe

Implementati sei ritratti base (tre classi per due sessi), agganci anatomici per armi e stivali, dita davanti alle prese, scelta persistente della classe alla creazione e migrazione al formato v4. Verifica completa: 363 test, tipi e build; controllo browser automatico di scelta, persistenza, ritratto nell’inventario e zoom; fotogrammi delle due varianti di corpo ispezionati. Da provare manualmente nell’anteprima `character-animation.html`: tutte le combinazioni preferite di armi, secondarie, armature e stivali; continuità delle gambe e leggibilità delle mani. I ritratti grandi sono statici, mentre i piccoli sprite di combattimento conservano le animazioni esistenti. Nessuna conferma manuale ricevuta per questo incremento.

Revisione successiva: l’utente conferma un miglioramento ma segnala offset e profondità ancora da correggere. Implementate registrazioni specifiche per le cinque armature nei due tagli, adattamento separato di busto e gonna, tuniche davanti agli stivali, nuove basi dell’arciere a riposo e proporzioni riviste delle armi. Verifica automatica aggiornata: 365 test, tipi e build; fotogrammi delle due varianti controllati. Nuova conferma visiva ancora da ricevere.

### Verifica dell’ottimizzazione multiplayer

L’utente conferma che la cooperativa funziona, ma segnala un lieve calo FPS; nessuna conferma ancora della versione ottimizzata. 403 test, tipi client/server e build superati. Stress deterministico quattro giocatori: −98,3% byte. Confronto due browser sul tunnel: −94,2% traffico, −15,4% tempo CPU principale, FPS circa 60 prima/dopo. Quattro browser/classi miste: circa 59,8 FPS. Prove automatiche e screenshot non equivalgono a conferma giocata; dettagli e comando ripetibile nel README.

Ultima prova pubblica con rendering sospeso per un membro: vittoria condivisa, report identico e 100 XP salvati una sola volta per entrambi. Mutazione temporanea senza rimozioni dei proiettili rilevata dal test; sorgente ripristinato. Nessuna nuova decisione sulla progressione del personaggio inclusa in questo incremento.

## Incremento motore audio e prompt di progetto (ramo `feature/lavoro-personale`, proposta)

Implementati: motore audio a canali guidato dai dati (catalogo per materiale, regia pura, Web Audio con ripiego su `<audio>` per `file://`, dissolvenze, stereo e distanza, limite delle voci), impostazioni salvate a parte (`temper-your-soul:audio`), pannello **Audio** con volumi e crediti, suoni dell'interfaccia e degli esiti collegati. Registrazioni del primo lotto incluse subito dopo (vedi sotto). Aggiunti anche `docs/prompt-di-progetto.md` (visione, analisi, piano a incrementi, regole su risorse e licenze), `docs/risorse-libere.md`, le skill di progetto in `.claude/skills/` e `tools/cerca-risorse.mjs` (ricerca su Openverse con sole licenze ammesse).

Verifiche: 400 test (17 nuovi per l'audio, ciascuno provato con una mutazione), tipi e build; prova nel browser automatica di pannello (apertura, ESC, M, cursori, salvataggio dopo il ricaricamento, 390 px), partita con audio acceso, vittoria con salita di livello e sconfitta, senza errori in console. **Prova manuale ancora da fare** (vedi sotto). Il giudizio sui suoni si potrà dare solo con le registrazioni (prossimo incremento, dopo il permesso di scaricarle).

Checklist manuale:

- [ ] Il pulsante **Audio** in alto a destra apre il pannello anche nei menu; ESC e la ✕ lo chiudono; aprirlo in partita mette in pausa.
- [ ] La spunta "Audio attivo" e il tasto **M** si allineano a vicenda e con la scritta in basso a sinistra.
- [ ] I cursori cambiano subito il volume dei suoni di riserva (canale effetti) e restano dopo il ricaricamento.
- [ ] In partita, con l'audio acceso, i lanci e i colpi subiti suonano come prima; nessun nuovo suono sintetizzato.
- [ ] Anche "Schermo intero" ora si preme dai menu (prima era coperto dalla schermata).

## Registrazioni vere: primo lotto (ramo `feature/lavoro-personale`, proposta)

48 file (circa 10,5 MB) da Freesound, IMSLP/Musopen, archive.org e Kenney, tutti CC0 o CC BY con crediti nel pannello Audio. Musiche: Bach nel menu, canto gregoriano nella cripta, violoncello nella palude, taiko nella fucina, Grieg nel ghiacciaio e nella furia dei boss. Più ambienti per ogni mappa ed effetti per lanci, scoppi, colpi, boss, interfaccia, vittoria e sconfitta. Audio acceso per impostazione (provvisorio). Elenco completo in `docs/game-design.md`, fonti e secondo lotto in `docs/risorse-libere.md`, script in `tools/audio/`.

Verifiche: 402 test (anche esistenza, peso e crediti di ogni file, provati con mutazioni), tipi e build (41 file copiati, 7 incorporati). Prova automatica nel browser: decodifica di tutti gli effetti, musica del menu dopo il primo clic, passaggio a cripta e ambiente in partita, brano della furia sotto metà vita, vittoria, crediti nel pannello, nessun errore in console. **Nessun ascolto fatto da me: il giudizio sui suoni è dell'utente.**

Riallineamento alla cooperativa (`a8c49ec`): i tre commit del ramo sono stati riportati sopra il main con un rebase; 430 test, tipi client/server e build verdi. In cooperativa il colpo subito suona solo per il giocatore del client, quelli degli alleati come impatti; il pannello Audio si apre sotto i comandi, spostati da Jabbaz sotto il pannello del party. **La cooperativa con l'audio non è stata provata in rete.**

Checklist manuale (ascolto):

- [ ] Menu: l'Aria parte al primo clic, a volume gradevole; dietro si sente appena l'ambiente del dungeon mostrato.
- [ ] Ogni dungeon ha la sua musica e il suo ambiente; il cambio è sfumato, gli anelli ripartono senza scatti evidenti.
- [ ] Sotto metà vita del boss: gong, poi Grieg; in pausa la musica si abbassa.
- [ ] I lanci suonano per materiale (spade, frecce, fuoco, ghiaccio, vetro arcano, fruscio di natura) e non stancano con il dardo a raffica.
- [ ] Gli scoppi delle zone, i colpi subiti e dati, lo schianto delle cariche e il teletrasporto del Custode si riconoscono.
- [ ] Vittoria (fanfara), sconfitta (campana), bottino e salita di livello (campane), clic dei pulsanti.
- [ ] Volumi relativi equilibrati; nessun suono troppo forte o fastidioso. Annotare quelli da sostituire.
- [ ] Aprendo `dist/index.html` con doppio clic l'audio funziona (con elementi `<audio>` al posto di Web Audio).

## Incremento sensazione di combattimento, fase II, servitori e schermate finali (ramo `feature/combattimento-e-vittoria`, proposta)

Implementati:
- risposta ai colpi (lampo, sobbalzo, scintilla, sbuffo dei mancati, numeri a livelli, vignetta e battito);
- barre con scheggia, contatore e tacca;
- fase II con stendardo e pausa di 1,6 s in partita singola;
- morte del boss visibile e schermate finali ritardate;
- nuove schermate di vittoria e sconfitta con statistiche, cause e consigli;
- aura e particelle proprie dei boss;
- quattro servitori (anche in cooperativa, protocollo 3);
- audio attivo di base anche per chi l'aveva salvato spento (impostazioni v2) e pannello Audio con i crediti richiusi.

Studio e motivazioni in `docs/studio-combattimento-e-vittoria.md`.

Verifiche:
- 463 test (servitori, eventi, fonti dei danni, resoconto, barre, effetti, rete), tipi client e server, build. Ogni regola nuova è stata provata con una mutazione;
- prova automatica nel browser: colpi, scheggia e contatore, fase II con stendardo e servitori, morte del boss, vittoria, sconfitta con cause, pulsante «Cambia equipaggiamento», aspetto dei quattro servitori. **Nessuna prova giocata da me con le mani**, e la cooperativa in rete con i servitori non è stata provata.

Checklist manuale:

- [ ] I colpi a segno si sentono diversi da quelli mancati (scintilla e lampo contro sbuffo grigio); i numeri grandi si notano.
- [ ] La scheggia sulle barre e il contatore sotto la barra del boss fanno capire quanto si sta facendo.
- [ ] La fase II si capisce anche senza audio: stendardo, lampo, pausa breve, servitori, aura del boss. La pausa non dà fastidio.
- [ ] I servitori sono leggibili e giusti: i fuochi fatui e i folletti che esplodono si possono evitare o abbattere; le sentinelle non diventano un muro di proiettili.
- [ ] La morte del boss è un momento soddisfacente; la schermata di vittoria arriva al momento giusto, non troppo tardi.
- [ ] La schermata di sconfitta dice chiaramente cosa ha colpito e dà un consiglio utile.
- [ ] La vignetta rossa e il battito a vita bassa aiutano senza disturbare.
- [ ] Schermate leggibili anche a finestra stretta (390 px).

## Incremento grafica dei boss (ramo `feature/grafica-boss`, proposta)

Primo lotto grafico scaricato con il consenso dell'utente e provato sui quattro boss: statua animata (guardiano), fiore demoniaco (madre delle spore), golem corazzato (colosso), mago di fiamma (custode del ghiaccio). Pixel art di terzi in CC BY 3.0/4.0 e CC0, ricolorata con la tavolozza del gioco in calma e in furia; crediti nel gioco e in `src/assets/art/boss/LEGGIMI.md`. Fonti, scelte e limiti in `docs/risorse-libere.md`.

Implementati:
- fogli di sprite con camminata, attacco (segue la posa del boss), trasformazione al passaggio in fase II (risveglio della statua, salto del fiore, rottura dell'armatura del golem) e morte (sgretolamento, crollo);
- variante di furia ricolorata per ogni boss, lampo bianco del colpo e velo di brina da rallentato sulle stesse figure;
- vignette della scelta del dungeon con lo stesso sprite;
- ripiego automatico sulla grafica a matrici se un'immagine non si carica; la grafica a matrici resta nel codice;
- script ripetibile `tools/arte/prepara_boss.py`.

Verifiche: test su coerenza fra PNG e geometria, crediti, scelta del fotogramma, avanzamento della posa e trasformazione; tipi e build. Prova nel browser con i quattro boss. **Decisione per Jabbaz**: la revisione grafica era sospesa; questa e' una prova su richiesta dell'utente, da tenere o scartare.

Checklist manuale:

- [ ] I quattro boss si riconoscono e si leggono sul loro pavimento (in particolare il colosso, scuro, sulla fornace).
- [ ] La grandezza dei boss rispetto al cerchio di colpo e al giocatore e' giusta.
- [ ] Attacchi, trasformazione in fase II e morte arrivano al momento giusto.
- [ ] La differenza di finezza dei pixel fra i boss non disturba.
- [ ] Le vignette della scelta del dungeon sono piu' belle di prima.


## Storico delle migliorie multiplayer integrate dalla copia locale

Le misure seguenti precedono l’integrazione con le stanze della PR #4; non sono benchmark della versione combinata.

### Ripresa e completamento della diagnostica (1 novembre 2026)

478 test, tipi e build superati. Cache della Cripta confrontata con la versione precedente su sei viste: zero differenze di pixel; aggiunti test di riutilizzo e memoria limitata. Watcher Vite corretto per non monitorare log, build e profili browser bloccati. F2 verificato su desktop/mobile; dati server letti durante il party. Un solo browser e alleato simulato via socket: circa 165 FPS in party e server 1,5–3,1% di un core nella finestra misurata. Il calo segnalato non è stato riprodotto in quella prova: conferma manuale e misura F2 nel caso reale ancora da ricevere. Dettagli e limiti nel README.

Prova finale sul nuovo tunnel con due browser isolati: movimento e skill condivisi, vittoria, report identico e 100 XP salvati una sola volta per entrambi; verificato il salvataggio mentre il rendering del membro era sospeso e la comparsa del report alla ripresa, dopo l’animazione finale. Nessuna eccezione JavaScript.

### Interpolazione del multiplayer (1 novembre 2026)

Implementata `NetworkView`, una copia riservata alla rappresentazione: camera, giocatore, alleati, boss, proiettili e servitori interpolano le posizioni a ogni fotogramma fra gli stati ricevuti. Input, HUD, danni, collisioni, ricariche e premi continuano a usare lo stato autorevole. Le scie seguono le posizioni visuali; la mira locale resta agganciata al puntatore. Server a 60 Hz e trasporto a 30 Hz invariati.

Buffer visivo provvisorio di un aggiornamento (circa 33 ms); non è predizione del movimento locale. Scatti e teletrasporti vengono mostrati immediatamente, così come l’esito finale. Dopo oltre 250 ms senza aggiornamenti si riallinea la scena; senza nuovi dati si ferma all’ultima posizione confermata, senza inventare movimento o colpi. Valori regolabili in `NETWORK_VIEW`.

Verifica: 484 test, tipi client/server e build superati. Sei nuovi test coprono posizioni intermedie, separazione dallo stato autorevole, alleati/boss/proiettili/servitori, arrivi irregolari, salti, interruzioni e fine partita. Nessun test visivo eseguito, su richiesta dell’utente: fluidità e ritardo percepito restano da confermare nella sua partita.

## Bilanciamento per ruoli (1 novembre 2026)

- [x] Primo incremento: profili di classe separati, bonus per slot e rarità, difesa effettiva, potenza delle abilità, frequenza primaria, attacchi primari non magici gratuiti; classi propagate in discesa e cooperativa (protocollo 6).
- [x] Vocabolario di quattro elementi e stati separato dal comportamento; regola generale di modularità in AGENTS.md.
- [ ] Prova manuale di questo incremento: tre classi con set Comune e oggetti superiori, singolo e party, cambio stanza e HUD.
- [x] Guerriero: taunt, intercettazione, scudo/parata speciale, buff difensivo e scatto fisico.
- [x] Mago: applicazione dei quattro stati, incantesimi per slot, channeling e blink esplosivo.
- [x] Arciere: marchio/pet, sanguinamento, lifesteal, penetrazione degli scudi numerici e doppio scatto.
- [ ] Boss: HP base e danni/velocità dei colpi ordinari; +50% HP per membro aggiuntivo anche per boss e mob. Il colpo rosso speciale è implementato.

La suite headless non conferma bilanciamento o sensazione di gioco. Nessuna nuova prova giocata dell’utente registrata.

### Revisione skill e oggetti di classe

- [x] Applicate le nuove abilità a tutte le 25 famiglie, preservando id e inventari esistenti; registri separati per classe.
- [x] Icone della barra, segnali degli stati, lupo, marchio, buff e contatore delle cariche; suoni associati.
- [x] Colpo rosso speciale per boss e luogotenenti e parata dello scudo.
- [x] Replica autorevole con protocollo 7: pet, stati, guardia, channeling e cariche verificati anche passando per codec e lobby mista.
- [x] Controlli browser: creazione e barra delle tre classi, buff Guerriero, pet e cariche Arciere, channeling Mago. Sono prove di interfaccia automatizzate, non conferme giocate.
- [ ] Prova manuale del Guerriero già creato: SX cancella proiettili ordinari, DX para, Q protegge/cura, E corre senza attraversare pilastri.
- [ ] Prova manuale di Mago e Arciere e party misto fino al boss: effetti, leggibilità del rosso, mana, aggro, danni e recuperi.

La taratura generale degli HP e dei colpi ordinari dei boss resta un incremento separato.

### Pubblicazione su main · v0.03.00

Pubblicazione autorizzata dall’utente; restano aperte le checklist manuali e la taratura generale dei boss/HP del party. Nessuna conferma giocata aggiunta. La cronologia conserva anche la versione di sviluppo v0.02.03.

### Danno finale intero · v0.03.01

- [x] Danno arrotondato per difetto nella simulazione dopo tutti i modificatori, senza arrotondamenti anticipati da rarità.
- [x] HP, eventi e report coerenti e interi; overkill escluso dai numeri del danno.
- [x] Cure frazionarie accumulate internamente senza perdere rigenerazione a 60 Hz.
- [x] Test su tutta la pipeline e mutazione del difetto finale.
- [ ] Prova giocata di danni inflitti/subiti e report, inclusi sanguinamento/bruciatura piccoli che possono ora infliggere 0.

Gli altri punti aperti di bilanciamento restano invariati.

### Pubblicazione su main · v0.04.00

Correzione del danno intero pubblicata su richiesta dell’utente. Restano aperte tutte le checklist manuali e la taratura del bilanciamento; nessuna nuova conferma giocata registrata.

## Grafica e chiarezza: fasi 1–8 dello studio (ramo `feature/grafica-fasi-2`, proposta in pull request)

Il compito e il diario sono in `docs/compito-grafica.md`, le regole nuove da confermare in `docs/game-design.md`.

- [x] Fasi 1–4: luce, muri a tre quarti, minimappa e mappa della discesa, stanze con massicci, grate e atmosfera.
- [x] Fase 5: pozzi, ponti e ripari distruttibili in otto stanze nuove, campo di flusso per i servitori (proposta di regole).
- [x] Fase 6: tileset CC0 ricolorati per tema.
- [x] Fasi 7 e 8: vene B e C (55 servitori, sette comportamenti) e otto luogotenenti delle vene.
- [x] Verifica automatica: 713 test, tipi client e server, build; prove nel browser e in cooperativa su un server separato.
- [ ] Prova manuale dell'utente: le otto stanze con pozzi e ripari, i tileset nei quattro dungeon, le vene, in singolo e in cooperativa.
- [ ] Decisioni di Jabbaz sulle regole proposte (pozzi, ripari, vene, movimento attorno ai massicci).
- [x] Un solo stile per l'interfaccia: titoli in Grenze Gotisch, HUD in Silkscreen (a 8 e 16 pixel), testi nel carattere di sistema.

### Incremento locale: VFX di classe con PixelLab

Atlanti locali, particelle WebGL con fallback e icone secondo budget autorizzato. Copertura e verifiche in [vfx-pixellab.md](vfx-pixellab.md); approvazione manuale di leggibilità e prestazioni ancora da fare. Revisione di mob, boss e personaggi rimandata.

### Incremento locale 0.5.1 · classi, boss e impostazioni

Implementati primaria del Mago gratuita, potenza/velocità maggiori a gittata invariata, lieve riduzione della frequenza dell’Arciere, rimozione della protezione dopo il danno e HP triplicati dei quattro boss. Ingranaggio con due schede, associazioni persistenti e aggiornamento HUD/inventario. Dettagli e numeri in game-design e changelog. Prove automatiche e controlli tecnici nel browser distinti dalla nuova prova giocata del proprietario ancora necessaria. Punti aperti: taratura della letalità del contatto, confronto delle classi a parità di rarità, futura scheda lingua/impostazioni generiche.

### Recupero MP · 2 novembre 2026

Dopo il primo riscontro positivo sul bilanciamento, recupero MP ridotto del 20% su tutte le fonti, rarità compresa. Nessuna variazione a costi o riserve; primarie ancora gratuite. Test per tutte le classi/rarità e per recupero a passo fisso; nuova conferma giocata del consumo da ricevere.


### 2 novembre 2026 · progressione e rifugio locali
Implementati oro del roster, drop dei mob al 70%, XP durante la run, bonus per livello, profilo 3×3 e rifugio con servizi. Dettagli e valori provvisori in game-design. Autorizzato dal proprietario l’intervento nelle logiche dell’inventario; sprite riutilizzati. Da provare a mano: raccolta in combattimento e dopo sconfitta/ricaricamento, oro fra personaggi, E/Spazio, nove caselle e pagine, ritratto, tutti i servizi, passaggio al raid e cooperativa con level-up. Da decidere: taratura economia, ricette/materiali, deposito condiviso e futura perdita dei beni al permadeath. Verifica visiva bloccata dagli strumenti, nessuna conferma manuale.

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


### Comandi e saldo del rifugio · modifica locale 2 novembre 2026
Rimosso il conteggio degli oggetti dallo zaino. Saldo nell’hub in alto a sinistra: moneta pixel art statica e cifra, senza riquadro o dicitura. Zaino e ingranaggio Impostazioni in alto a destra, con il medesimo pannello Audio/Associazione tasti del menu. Verifica automatica: 764 test, tipi e build superati. Controllo browser desktop di disposizione, apertura impostazioni nell’hub, ritorno al menu e assenza del conteggio. Conferma manuale e schermi piccoli ancora da provare. Nessuna modifica a economia, salvataggi o protocollo; nessun commit/push richiesto per questo incremento.


## Hub condiviso e scambi · incremento locale 2 novembre 2026

La finestra Party è disponibile anche nel rifugio. Il link della stanza porta nell’hub del creatore come visitatore; avvicinandosi a un giocatore, E apre Mostra profilo, Scambia e Invita al party (se non è già membro). L’invito richiede accettazione. Limiti provvisori regolabili: otto presenze nel rifugio, quattro membri del party. Dal portale il leader sceglie dungeon e modalità e avvia insieme tutti i membri, con i requisiti GS esistenti; i visitatori restano nel rifugio e possono continuare a usare i servizi. Deposito, oro e personaggio rimangono personali. Se il leader esce, la guida passa a un membro rimasto o al primo visitatore.

Lo scambio mostra il proprio zaino selezionabile e l’offerta dell’altro giocatore, con sprite degli oggetti. Sono ammessi oggetti non equipaggiati nello zaino, fino a 40 per offerta (limite provvisorio). Ogni modifica azzera entrambe le conferme; entrambi devono confermare l’offerta corrente e accettare la conferma finale. Prima della registrazione, annullare o disconnettersi lascia gli oggetti invariati. Durante il completamento le modifiche al personaggio sono bloccate.

Il server registra prima i trasferimenti pendenti in `.tools/trade-ledger.json` (percorso configurabile con `TRADE_LEDGER_PATH`); conservare questo file ai riavvii. Il browser salva il trasferimento e una ricevuta nella stessa raccolta locale, poi conferma al server. Le consegne pendenti vengono riproposte alla riconnessione della medesima identità browser/profilo, senza duplicare gli oggetti già ricevuti. Stanze e partite rimangono non persistenti; questa identità locale non è un account cloud o un sistema anti-manomissione. Cambiare origine del browser o cancellare i dati locali non recupera il profilo.

Salvataggi v10 con migrazione dei formati precedenti e inventari v10 legittimamente vuoti preservati; protocollo cooperativo 11: riavviare il server e ricaricare tutti i client dopo l’aggiornamento. Nessun nuovo bilanciamento di combattimento.

Controllo browser automatico con due origini separate: ingresso come visitatore, invito e accettazione, profilo remoto, scambio Spada/Bastone con doppia conferma, deposito privato e partenza simultanea in Cripta anche con deposito aperto sul secondo client. Non è una conferma manuale dell’utente. Da provare manualmente: fluidità e leggibilità con più persone, rete pubblica e schermi piccoli.

Verifica finale dell’incremento: `verify` superato, 778 test in 68 file, tipi e build. Controllo di sensibilità: consentire temporaneamente lo scambio dopo una sola conferma fa fallire il test dedicato; codice corretto ripristinato. Nessun commit o push eseguito.


### Correzioni party, inviti e profili · 2 novembre 2026

Il widget del party si riallinea anche dalla presenza autorevole periodica nell’hub dopo l’accettazione dell’invito. Il link della stanza apre una visita all’hub; l’invito tramite E e la sua accettazione aggiungono il visitatore ai quattro membri del party. Inviti condivisibili solo con URL pubblico HTTPS, mai localhost/LAN: `npm.cmd run tunnel` registra il tunnel Cloudflare corrente per la porta del server. Restano supportati `PUBLIC_URL` e il riconoscimento dell’accesso tramite Cloudflare. Senza indirizzo pubblico noto, Copia invito è disabilitato invece di copiare un link locale.

Scambia invia prima una richiesta: «Accetti lo scambio da X?» con Sì/No. Solo il destinatario può accettare; prima del consenso il server rifiuta offerte e conferme, e nessun inventario di scambio viene aperto. No, chiusura o disconnessione annullano la richiesta. La doppia conferma finale resta necessaria. Mostra profilo visualizza statistiche, ritratto ed equipaggiamento indossato, senza zaino o deposito. Protocollo 12; riavvio server e ricarica client richiesti.

Controllo browser automatico con un client locale e uno tramite tunnel Cloudflare reale: link pubblico dal leader locale, due membri nel widget dopo accettazione, profilo senza zaino, No che annulla la richiesta e Sì che apre le offerte su entrambi i client. Conferma manuale dell’utente ancora da ricevere.

Verifica delle correzioni: 781 test in 69 file, tipi e build superati; controllo browser tramite tunnel reale riuscito. Nessun commit/push.


### Finestre sociali compatte e slot di scambio · 2 novembre 2026
Richiesta/attesa scambio, invito al party e menu E del giocatore usano una finestra larga al massimo 360 px, con chiusura compatta e stile Reliquiario. Le due griglie dello scambio mantengono almeno nove caselle 3×3, anche vuote; oltre nove oggetti si estendono in gruppi di nove senza introdurre nuovi limiti allo scambio. Oggetti e selezione mantengono sprite e tooltip esistenti. Nessuna modifica a regole, protocollo o salvataggi.
Verifica: 781 test in 69 file, tipi e build superati. Controllo browser desktop del menu compatto e delle nove caselle per lato con inventario vuoto e offerta contenente uno sprite; conferma manuale dell’utente e resa su schermi piccoli ancora da ricevere. Nessun nuovo test automatico per questa modifica di sola presentazione. Nessun commit/push.


Pubblicazione autorizzata su main · 2 novembre 2026: release v0.07.00 con il riepilogo completo di comandi HUB, party condiviso, inviti pubblici, scambi e finestre compatte nelle note del gioco. Nessuna modifica di bilanciamento.


### Sessione cooperativa e party indipendenti · modifica locale 2 novembre 2026
L’icona Party accanto allo zaino apre un riquadro con membri e comandi; rimossa la finestra separata con destinazione, modalità, boss e avvio. La destinazione si sceglie dal portale. Nel riquadro: Pronto verde (con stato selezionato), Lascia il party rosso, Copia invito HUB e Torna in singolo. Crea party apre una sessione condivisa; il link invita a visitare l’HUB del creatore, senza aggiungere automaticamente al gruppo di raid. L’invito al gruppo resta tramite E e accettazione.

La proprietà dell’HUB è distinta dalla guida del party. Lascia il party rimuove solo dal gruppo e dall’eventuale raid, conservando connessione, personaggio, deposito e posizione nell’HUB; se serve la guida passa al membro successivo. Se il gruppo è vuoto si può ricrearlo nella stessa sessione. Torna in singolo disconnette dalla sessione condivisa. Menu e run locali mantengono la connessione: durante l’assenza lo sprite non è visibile né interagibile nell’HUB e la prontezza viene tolta. Il proprietario può restare al menu o in una run singola e gli ospiti continuano a usare l’istanza. Il gruppo di un solo membro e gli ospiti fuori dal gruppo possono avviare una run locale; un gruppo di più membri parte insieme dal portale del leader quando gli altri sono pronti e presenti. I requisiti di accesso dei personaggi restano validi. Nel raid cooperativo, tornare al menu abbandona il raid/gruppo ma conserva la sessione.

Resta un solo gruppo di raid per istanza in questo incremento; più gruppi asincroni nella medesima istanza sono futuri. L’istanza vive finché almeno una connessione rimane attiva, non oltre lo spegnimento del server o l’uscita di tutti. Depositi e progressi restano personali e locali al browser. Protocollo 13: riavviare il server e ricaricare tutti i client. Nessun cambiamento ai salvataggi o al bilanciamento.

Controllo browser automatico: icona accanto allo zaino, comandi nel riquadro senza selettori dungeon, colori verde/rosso, uscita dal gruppo conservando l’HUB, menu e run singola con rientro nella stessa sessione, ricreazione del gruppo, invito/prontezza e partenza in Cripta di due membri dal portale. Prova manuale dell’utente e resa mobile ancora da confermare.

Verifica finale sessione/party: 789 test in 69 file, tipi e build superati. Controllo di sensibilità del test di uscita dal gruppo eseguito con regressione temporanea e codice ripristinato; prova browser di Torna in singolo riuscita. Nessun commit o push.


### Prova successiva · cadenza nemici e orb
Verificare in partita pipistrello a contatto, sciami, cariche, orb sovrapposti e cooperativa: la cadenza provvisoria 0,8 s dei mob / 1 s dei boss deve essere punitiva ma leggibile. Nessuna protezione globale dopo il danno. Test automatici a 60/120 Hz, assorbimento orb fermo/veloce, parata e primo impatto in party; mutazione del recupero rilevata e ripristinata. Nessuna prova giocata dell’utente dichiarata.

Verifica della correzione: 800 test in 70 file, tipi e build superati. Server locale aggiornato e risposta HTTP 200; nessuna conferma giocata dichiarata.


### Menu e Bestiario · 2 novembre 2026
Da confermare a mano: HUD nell’HUB, menu iniziale senza zaino, Bestiario delle quattro card con profilo nuovo e profilo con uccisioni, ritorno ai dungeon.

### VFX Hi-bit · incremento locale 3 novembre 2026

Implementati atlanti raster nel codice per sedici effetti delle tre classi, particelle aggiuntive anche con sprite pronti, sangue balistico e macchie dopo danno, schegge/energia per materiali, morti animate dai servitori esistenti, buff/rush/stati con emettitori continui. Budget finiti e cache degli atlanti preparata per singolo fotogramma nei tempi liberi del browser. Nessuna variazione di combattimento, salvataggi o protocollo, nessuna generazione a pagamento.

Test automatici su instradamento con sprite pronti, materia/sangue dopo danno, scadenze e capacità, morti/resurrezioni, buff e stati remoti mobili, equivalenza 30/144 FPS, sagome e palette raster. Mutazione del percorso di emissione rilevata e ripristinata. Ispezionati fotogrammi delle sedici animazioni; controllo nel browser impedito da timeout localhost e arresto Computer Use per URL non verificabile. Nessuna prova giocata dichiarata.

Prossimo passo: aprire `/vfx-preview.html` con Vite, poi provare primarie e tre skill di ogni classe nei quattro dungeon, buff in movimento, sangue/schegge, uccisioni in massa e party da quattro. Confermare intensità Hi-bit, lettura degli attacchi nemici, prima emissione e fluidità su schermi piccoli. [Dettagli e tarature provvisorie](vfx-pixellab.md#revisione-hi-bit--incremento-locale-3-novembre-2026). Nessun commit/push.

### XP visibili e HUB rosso · incremento locale 3 novembre 2026

Implementati `+N XP` dal premio effettivo di mob/luogotenenti, filtro del destinatario in party e Silkscreen con contorno. Portale gotico Hi-bit rosso, vortice/braci/rune a 32 fotogrammi; palette dell’HUB spostata su carbone/grigi/cremisi/fuoco. Ricompense, collisioni, servizi, salvataggi e schema del protocollo invariati; nessun credito di generazione.

Verifica completa: 821 test in 72 file, tipi e build. Mutazioni del premio XP e dell’animazione rilevate e ripristinate. Controllo con Edge headless a desktop e 390 px, font caricato, fotogrammi animati distinti e nessuna eccezione JS. Prossima prova dell’utente: etichette con sciami/party, intensità e leggibilità del portale e delle postazioni, passaggio davanti/dietro. [Dettagli](hub-rosso-xp.md). Nessuna conferma giocata, commit o push.

### Ricompense, lupo e scelta del personaggio · 3 novembre 2026

XP spostati sopra lo sprite del giocatore, che viene seguito durante il movimento. Oro senza prossimità: uscita progressiva dal corpo, attrazione dopo 0,5 s e volo di 0,4 s verso il destinatario; quote e probabilità invariate. Corretto il lupo inattivo senza marchio: acquisizione autonoma e raggio distinto dal salto. Protocollo 14, riavvio server e ricarica client richiesti.

Su autorizzazione esplicita del proprietario, tre coppie maschile/femminile isolate in `/sprite-prototypes.html`, ciascuna con tre classi, scala reale e pose animate. Nessuna modifica al compositore dei personaggi assegnato all’altro referente, nessuna generazione. Prossimo passo: scelta A/B/C, poi coordinamento e integrazione; prova giocata di lupo, oro e XP ancora necessaria. Verifica automatica: 828 test in 74 file, tipi e build; controlli tecnici nel browser e tre mutazioni rilevate/ripristinate. [Dettagli](ricompense-lupo-prototipi.md). Nessun commit/push.

### Revisione delle animazioni dei prototipi · 3 novembre 2026

Dopo il feedback sui micromovimenti: falcate e ginocchia articolate, braccia contrapposte, busto inclinato, mantelli con ritardo e attacchi distinti per classe con preparazione/slancio/recupero. Dodici frame in margine 64×64 attorno al corpo su griglia 48 pixel; cammino iniziale, pausa sul frame corrente e cursore dei fotogrammi nella pagina di confronto. Nessuna modifica allo sprite attivo o alle regole.

831 test, tipi e build; controlli tecnici nel browser su pose, pausa e viewport 390 px; regressioni di falcata e rotazione rilevate e ripristinate. Resta la valutazione visiva dell’utente sul ritmo e la scelta A/B/C, entrambe le versioni, prima dell’integrazione. [Dettagli](ricompense-lupo-prototipi.md#animazioni-più-ampie--revisione-successiva-3-novembre-2026). Nessun commit/push.


### Integrazione C ed equipaggiamento · 3 novembre 2026

Scelta esplicita ricevuta: terza proposta Cacciatore d’ombre, maschile/femminile. Integrata nel compositore usato da HUB e incontri; corrette le fasi della camminata e l’arretramento rispetto alla mira. Ridisegnati i 25 oggetti indossati e le icone 32×32, con presa/gesto condivisi per slot e classe e parti che seguono le articolazioni. `/character-animation.html` mostra gli oggetti di produzione, con cambio slot, direzione, rarità e cursore dei frame. Ritratti e regole invariati.

Verifiche e prova tecnica del browser in [sprite-c-equipaggiamento.md](sprite-c-equipaggiamento.md). Prossimo passo: prova giocata dell’utente della camminata, degli attacchi e del cambio dei quattro slot su entrambe le versioni, anche in cooperativa. Nessun commit/push.


### Release v0.10.00 · integrazione autorizzata in main, 3 novembre 2026

Su richiesta esplicita dell’utente, l’incremento raccoglie tutti i lavori locali della chat: VFX/particelle Hi-bit, sangue e morti, buff e skill, HUB rosso/portale, XP ancorati al giocatore, oro emesso e assorbito, ricerca autonoma del lupo e sprite C con 25 famiglie modulari e icone. `package.json`, lockfile e nuova prima voce del changelog allineati a **0.10.0**, conservando lo storico. Note numeriche: ricerca lupo 180 → 480 unità; vecchio vincolo di raccolta entro 30 unità rimosso, emissione 0,5 s + volo 0,4 s. Protocollo 14 e salvataggio v10. Verifica richiesta prima della pubblicazione: `npm run verify`; conferme giocate ancora necessarie come sopra.


### Release v0.11.00 · revisione delle primarie, 3 novembre 2026

Su feedback dell’utente, particelle casuali tolte soltanto al lancio e nella scia degli attacchi base; effetti su danno, morti, buff e altre abilità conservati. Animazioni Hi-bit proprie per fendente, freccia/onda del tiro e quattro elementi del Mago. Premi XP/oro a 16 px nello stesso Silkscreen, con riga libera rispetto ai testi già saliti. AGENTS.md e CLAUDE.md allineati alla direzione grafica obbligatoria.

Sviluppo nella worktree `codex/vfx-attacchi-hi-bit`, riallineata alle PR #12 e #13; integrazione diretta in main autorizzata dall’utente come v0.11.00, con lavoro della camera preservato nella sua worktree. 862 test in 78 file e build/tipi; controllo tecnico browser e mutazioni rilevate/ripristinate. [Specifica](attacchi-base-hi-bit.md). Prossimo passo: prova giocata dell’utente di effetti, premi e cooperativa.

## Dungeon in vista ortogonale · 9 novembre 2026

Tutte le stanze e le arene dei quattro dungeon usano la griglia del mondo. WASD, cursore, pericoli a terra, basamenti e strati PixiJS condividono gli assi X/Y. Il raggio di ogni impronta viene dai dati di collisione. Da confermare giocando in singolo e in cooperativa la leggibilità degli ostacoli, delle porte e dei colpi con la camera in movimento.
