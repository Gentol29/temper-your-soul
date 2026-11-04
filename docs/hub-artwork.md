# Artwork del menu come HUB · revisione locale della PR #14

Richiesta del proprietario del 4 novembre 2026. Incremento v0.11.03 per il ramo `feature/menu-rifugio` della PR #14, preparato sul ramo locale `codex/hub-artwork`. Pubblicazione dell’intero incremento autorizzata dal proprietario dopo le revisioni descritte sotto.

- Rimosso il menu di accessi in basso a destra. Il riquadro del personaggio apre i profili; il Party resta nell’HUB.
- **Entra** al posto di Continua, con zoom continuo sulla stessa scena, comparsa a righe intere del personaggio, anello di rune e braci al centro del cortile. Controlli sospesi per 1,5 s; ingresso immediato con animazioni ridotte. Tornare da un servizio conserva la posizione.
- Nuova mappa da 1024×576 unità, con gli stessi PNG della PR, senza generazioni aggiuntive. Simulazione e collisioni in `character/hub-map.ts`, disegno condiviso in `presentation/refuge-artwork.ts`. Cattedrale/Portale, Deposito, Forgia e Mercante hanno interazioni raggiungibili a piedi; il Fabbro è una scheda dentro la Forgia. Edifici esclusi dal cammino disegnati prima dei personaggi; cinta e varco conservano l’occlusione secondo la profondità.
- Silkscreen anche per titoli, testi e controlli DOM/canvas, come XP e oro. Misure a multipli di 8; i file e i crediti del vecchio font restano nello storico locale. Nessuna revisione degli sprite o dei ritratti assegnati ad altri.
- Protocollo 17: vecchi client esclusi dalla nuova geometria; server da riavviare e schede da ricaricare. Salvataggio, prezzi, bilanciamento e loot invariati. Le anteprime separate degli sprite conservano il fondale procedurale precedente.

## Prima verifica e prova manuale

`npm run verify`: 897 test in 83 file, tipi client/server e build. Test su passaggi, collisioni, raggio d’interazione, curva di zoom, comparsa e animazioni ridotte. Una mutazione temporanea che disabilita le collisioni degli edifici fa fallire i test; codice originale ripristinato.

Controlli tecnici nel browser integrato a desktop e 390 px: menu, creazione e selezione del personaggio, ingresso, movimento verso il portale e apertura dei dungeon con E, profilo/zaino, Impostazioni senza scorrimento orizzontale. Nessun errore della console osservato. Salvataggio di un profilo di prova soltanto nell’origine locale del browser di test. WebSocket reale: protocollo 14 rifiutato, 15 accettato con partenza (512, 332). Server di anteprima riavviato su `http://localhost:4174/`.

Questi sono controlli automatici e fotogrammi, **non una prova giocata confermata dall’utente**. La cooperativa con due persone e il gradimento della transizione restano da confermare.

Da provare: Entra più volte, annullamento con ESC, cambio personaggio, movimento e collisioni lungo tutto il cortile, E davanti ai quattro accessi e cambio scheda nella Forgia, apertura/chiusura degli oggetti e partenza nel dungeon. In cooperativa: gruppo e visite, posizioni coerenti, scambio, ritorno al menu, rientro e partenza comune. Leggibilità del font anche su finestre strette. La durata e l’ampiezza dello zoom restano provvisorie.


## Correzione delle card del portale · 4 novembre 2026

Su segnalazione dell’utente: rimossi i vincoli che facevano sovrapporre canvas e nome del boss e uscire Duello dal bordo. Immagini centrate nel rapporto naturale 12:7, colonna restringibile, testi e comandi dentro la card. Pericolo, GS e record 8 → 10 px (+2 px richiesti); Bestiario, Discesa e Duello 16 → 12 px. Questa è un’eccezione tipografica locale richiesta dall’utente, senza cambiare gli altri testi del gioco. Stessa versione locale 0.11.03, nessun commit o push aggiuntivo.

Verifica: 897 test in 83 file, tipi e build; misure DOM e fotogrammi tecnici a 1878×922 e 1280×720, errore di centratura orizzontale delle immagini pari a 0 px, pulsanti contenuti nelle quattro card. Nessun errore della console osservato. Leggibilità e gradimento da confermare sullo schermo dell’utente.


## Fabbro nella Forgia

Richiesta del proprietario, ripresa dopo l’interruzione per limite di utilizzo: eliminare il fabbro come NPC separato e riunire creazione e migliorie nello stesso edificio. Rimossi sprite, incudine, etichetta, interazione e impronta solida del vecchio banco dalla mappa attiva. Le anteprime storiche degli sprite restano separate.

E davanti alla Forgia apre la scheda **Forgia**; la scheda **Fabbro** contiene il precedente servizio di miglioria. Le operazioni riuscite salvano e aggiornano oro, prezzi e oggetti nella stessa scheda, senza tornare alla creazione. Schede accessibili con clic, frecce, Home ed End; chiusura con ESC. Prezzi, bonus, limite +5 e salvataggi invariati. Protocollo 16 per la rimozione dell’ostacolo condiviso: riavviare il server e ricaricare i client.

Verifica completa superata: 898 test in 83 file, tipi client/server e build. Il test sul passaggio del vecchio banco fallisce reintroducendo temporaneamente l’ostacolo; mappa corretta ripristinata. Nel browser: passaggio libero verso la Forgia, NPC/etichetta assenti, apertura delle due schede, clic e Home/End, prezzi esistenti e pulsanti disabilitati con oro insufficiente. A 390 px schede contenute e nessuno scorrimento orizzontale del dialogo. Nessun errore della console osservato.

Le operazioni economiche sono coperte dai test del dominio; il profilo del browser di prova ha 0 oro, quindi acquisti e migliorie riusciti non sono stati eseguiti nel browser. Prova manuale di creazione, miglioria con oro disponibile, chiusura/rientro e cooperativa ancora da confermare. Anteprima riavviata su `http://localhost:4174/`, con protocollo 16.

## Selciato, prospettiva e scritte in movimento · ultima verifica del 4 novembre

Su segnalazione dell’utente, la posizione dell’HUB diventa l’appoggio dei piedi: il corpo è disegnato 14 px più in alto, senza modificare il compositore condiviso degli sprite. Cerchio di collisione e ombra seguono lo stesso punto. Sostituite le impronte rettangolari con sagome poligonali di Cattedrale, Deposito, Forgia, Mercante e colonne del varco; il perimetro segue il bordo interno del selciato e del ponte. Durante il controllo del muro est è stato stretto ulteriormente il margine che consentiva di sovrapporre i piedi al coronamento. Gli edifici esclusi dal cammino non nascondono chi sta davanti; cinta e varco conservano l’occlusione. Accessi dei servizi e punti di nascita dei visitatori sono sul pavimento libero.

Etichette dei servizi e nomi dei visitatori passano a testi DOM alla risoluzione dello schermo, senza trasformazioni e con coordinate arrotondate ai pixel fisici. Il canvas conserva lo stesso fattore di scala sui due assi, senza stirare l’ultimo pixel per coprire dimensioni dispari; pulizia completa a ogni fotogramma. Restano Silkscreen, passo fisso 60 Hz e frequenze di rete attuali. Non si attribuisce il ghosting al monitor senza una prova sul dispositivo dell’utente.

Verifica completa finale: **924 test in 85 file**, tipi client/server e build. Test su 14 punti problematici di edifici/cinta, raggiungibilità dei quattro servizi, diagonali e passi lunghi da tutti gli accessi, ponte, partenze dei visitatori e coerenza fra client e server. Test geometrici su rientri concavi, spigoli e raggio d’appoggio; proiezione a dimensioni dispari e allineamento del testo con rapporti di pixel 1/1,25/1,5/2. Disabilitando temporaneamente gli ostacoli, il test sulla tenda del Mercante fallisce; sorgente ripristinato e test nuovamente superati.

Controlli tecnici nel browser: arresto contro Cattedrale, Deposito, tenda del Mercante, Forgia, muro ovest, muro est e bordo del ponte; passaggio fra le colonne del varco, apertura con E di Deposito e Forgia. Ricontrollato il muro est dopo l’ultima correzione. A 1365×767 il canvas misura 455×256 pixel interni e 1365×768 CSS: scala esatta 3× in entrambe le direzioni. Etichette a 24 px, coordinate intere e nessuna trasformazione prima/dopo il movimento; nessun errore o avviso osservato in console. Dimensioni del browser ripristinate. Fotogramma finale in `.tools/hub-grounding-fixed.png`.

Server di anteprima riavviato su `http://localhost:4174/`. WebSocket reale: protocollo 16 rifiutato, 17 accettato con partenza libera (512, 332). Stessa versione locale 0.11.03, nessun commit o push. Prova giocata ancora da confermare: cammino lungo tutto il selciato, prospettiva vicino ai muri, leggibilità durante il movimento sul monitor dell’utente e cooperativa con due persone.

## Forgia dal fronte e scritte più piccole · riscontro successivo del 4 novembre

L’utente riferisce che, per il resto, le collisioni sembrano a posto nella sua prova. Segnala però che la Forgia si può usare soltanto in basso a destra e chiede di rimpicciolire le scritte di 2 px. Le sagome di collisione restano quelle provate. L’interazione della Forgia misura la distanza dal fronte (652, 300) → (758, 345), con raggio invariato di 62 unità, anziché dal solo punto sul lato destro. Tooltip e priorità rispetto ai visitatori usano lo stesso punto più vicino. L’etichetta Forgia conserva la sua posizione sull’artwork.

Nomi dei servizi e dei visitatori ridotti di 2 px rispetto alla scala precedente: a 3×, 24 → 22 px; alla misura minima, 16 → 14 px. Tooltip 16 → 14 px. Eccezione DOM richiesta esplicitamente, con Silkscreen, risoluzione schermo e allineamento ai pixel fisici conservati. Stessa versione locale 0.11.03 e protocollo 17, senza modifiche ai salvataggi.

Verifica completa: **930 test in 85 file**, tipi e build. Sei casi aggiunti per accessi da sinistra, centro e destra della facciata, mantenendo assenti i tooltip lontani e corretti gli altri tre servizi. Ripristinando temporaneamente il vecchio punto singolo falliscono i test di accesso frontale; fronte corretto ripristinato prima della verifica completa.

Controllo tecnico nel browser: tooltip visibile arrivando dalla piazza a sinistra della Forgia, apertura con E da quel punto; nomi misurati a 22 px e tooltip a 14 px. Fotogramma `.tools/hub-forge-front-fixed.png`. Nuovo accesso e gradimento della misura ridotta ancora da confermare dall’utente; cooperativa con due persone ancora da provare. Anteprima aggiornata su `http://localhost:4174/`, nessun commit o push.

## Menu senza tooltip e pubblicazione autorizzata

Richiesta successiva del proprietario: eliminare il tooltip che rimaneva visibile quando una voce in basso a sinistra era selezionata e pubblicare tutte le modifiche sul ramo originale della PR #14, `hocosaproduzione-dotcom/temper-your-soul:feature/menu-rifugio`. Rimosso il riquadro descrittivo, il suo nodo HTML e gli stili associati; conservate descrizioni accessibili, navigazione da tastiera, evidenziazione della scena e messaggi dei comandi non disponibili.

Verifica finale prima della pubblicazione: **930 test in 85 file**, tipi client/server e build. Nel browser il focus passa da Entra a Nuovo personaggio e Impostazioni con le frecce; nessun nodo o riquadro del tooltip nel menu, descrizioni dei tre pulsanti presenti. Nessun nuovo test headless per questa rimozione DOM: controllo tecnico nel browser, da distinguere dalla prova giocata. Versione 0.11.03 già predisposta come avanzamento unico dal commit 0.11.02; package, lockfile e note riassumono tutto questo incremento. Nessun incremento aggiuntivo per la sola pubblicazione della PR.
