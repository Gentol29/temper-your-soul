# Mondo condiviso e profili PostgreSQL

Release **v0.17.00** del 10 novembre 2026. Protocollo applicativo **21** (22 dalla v0.17.02, vedi [Ordine dell’accesso](#ordine-dellaccesso--v01702)), codec compatto ordinato v2, salvataggi **v10** con lettura dei precedenti formati, incluso v9. Riavviare server e client insieme.

L’account verificato entra direttamente nel mondo pubblico `HUB`. Il rifugio usa artwork, collisioni e servizi esistenti, con fino a 64 sessioni sul processo e posizioni interpolate tramite `NetworkView.Hub`. Non esistono lobby chiuse, inviti `?party=`, leader o stato Pronto. Su richiesta successiva del proprietario è ripristinato il party sociale: icona originale, quattro posti, inviti nel pannello o interagendo con un giocatore nell’HUB, accettazione/rifiuto e uscita dal gruppo mantenendo account e avatar connessi. Gli inviti scadono dopo 60 secondi; capienza e durata sono tarature in `SOCIAL_PARTY`. I gruppi non riservano istanze o posti in dungeon: il portale apre un’istanza pubblica per dungeon/modalità; gli accessi successivi si uniscono alla stessa istanza in corso, fino a 32 giocatori. Si applicano ancora requisiti GS e sblocchi. Le tarature di combattimento restano quelle esistenti: il bilanciamento con più di quattro persone richiede una prova giocata.

Il pannello party non gestisce il logout. Esc chiude le finestre aperte e poi torna al menu principale, mantenendo connessione, party e avatar nell’HUB. Da un dungeon il ritorno al menu salva e riporta nell’HUB senza uscire dall’account. Soltanto **Logout** nel menu principale disconnette volontariamente dal mondo. Chiusura della scheda e perdita della rete restano disconnessioni tecniche. La navigazione al menu ferma subito il movimento; il menu continua a mostrare lo stato connesso.

`LoadingIndicator` è un componente riutilizzabile inline o sovrapposto. Il suo stato conta operazioni concorrenti e chiude ciascuna nel `finally`, anche in caso di errore: niente durata finta o percentuale inventata. È usato per configurazione accesso, login, registrazione, logout, handshake WebSocket, ingresso/ritorno dal dungeon e salvataggi del personaggio. Rispetta la preferenza di movimento ridotto.

La simulazione avanza a 60 Hz; istantanee e input a 30 Hz. Identità/aspetto alla comparsa o modifica, movimento in tuple, rimozioni esplicite e controllo della sequenza. Un nuovo client riceve tutte le definizioni necessarie. I delta non vengono saltati per mascherare un ritardo; un client troppo lento viene disconnesso. L’uscita rimuove avatar ed evocazioni senza KO e non termina l’incontro degli altri.

## Scelta dei personaggi dell’account · 11 novembre 2026

Dopo ogni login verificato si apre la raccolta privata dell’account: si sceglie con quale personaggio entrare oppure si usa **Nuovo personaggio**. Il menu espone **Personaggi** per tornare alla scelta dal rifugio senza rifare il login. La creazione aggiunge un personaggio; non sostituisce quelli esistenti. Nome, classe, sesso, XP, inventario, equipaggiamento, deposito e record restano propri di ciascun personaggio. **L’oro è condiviso solo tra i personaggi dello stesso account**, mai con account diversi.

Il server rilegge la raccolta alla scelta, verifica token e appartenenza dell’id e salva la nuova creazione prima dell’ingresso nell’HUB. Una sola sessione per account resta ammessa nel processo; le revisioni PostgreSQL proteggono le scritture concorrenti e gli scambi. I profili locali non vengono importati né sovrascritti.

Si riutilizza il formato `character-roster` v10 già validato dal gioco nella colonna JSON esistente (`character` oppure `inventory` nel layout legacy). Un vecchio personaggio singolo viene adottato come `c1` con tutti i suoi dati. Non servono nuove tabelle, colonne o modifiche RLS: la colonna `gold` dell’account resta autorevole; nel layout legacy nome, classe, livello e XP descrivono il personaggio selezionato. Un solo personaggio invalido blocca l’intera raccolta senza scartare gli altri. Il formato dei salvataggi locali resta v10.

**Protocollo 23:** riavviare server e ricaricare i client. Il login con il solo token risponde con `character_required` e la raccolta privata, anche se non è vuota. L’ingresso successivo invia soltanto `characterId` oppure le scelte `creation`; non accetta oro o inventari dal browser. La rimozione di personaggi online non è prevista in questo incremento.

Verifiche automatiche e tecniche: adozione dei vecchi dati, raccolta multipla, scelta dopo il login, saldo comune, conservazione dei personaggi inattivi, conflitti di revisione, fallimenti del salvataggio e isolamento degli account. Verifica PostgreSQL reale in sole tabelle temporanee per entrambi gli adattatori; browser locale isolato con dati di prova. La prova giocata con l’account dell’utente resta da fare.

## Ordine dell’accesso · v0.17.02

Questa sezione conserva lo storico; il protocollo 23 descritto sopra ripristina la scelta dei personaggi.

Richiesta del 10 novembre 2026: l’autenticazione va fatta prima della creazione del personaggio. Fino alla v0.17.01 il messaggio di accesso portava già nome, classe e sesso, quindi il personaggio andava creato in locale prima di poter accedere.

1. **Accesso.** Il gioco si apre sulla schermata che chiede email e password, con Accedi e Crea account (oppure il pulsante verso il provider esterno, se configurato). Senza sessione non esistono menu, creazione o rifugio. Un ritorno dal provider con token nell’indirizzo salta il modulo.
2. **Personaggio.** Il client invia `login` con il solo token. Il server verifica l’identità e cerca il profilo con `ProfileStore.find`, che non scrive nulla. Se manca risponde `character_required`: l’account resta libero e il client apre la creazione. Alla conferma il client accede di nuovo aggiungendo `creation` (nome, classe, sesso); il token viene verificato un’altra volta e il profilo nasce con `ProfileStore.load`, che non sovrascrive mai un profilo esistente.
3. **Rifugio.** Con il profilo caricato il server inserisce l’avatar nell’HUB e il gioco entra nel rifugio. Agli accessi successivi basta il token.

Il menu principale mostra Entra, Impostazioni e Logout; «Nuovo personaggio» è stato tolto perché ogni account ha un personaggio. Logout, sessione scaduta e connessione interrotta riportano alla schermata di accesso, che propone Riconnetti ed Esci dall’account. Dalla creazione si può soltanto uscire dall’account. I profili locali del browser restano salvati e non vengono letti né mostrati in questo flusso; `ui/character-profiles.ts` e i relativi stili non sono più raggiungibili e si possono rimuovere in una pulizia dedicata.

Protocollo applicativo **22**: riavviare il server e ricaricare i client. Schema del database, salvataggi e bilanciamento invariati. Codice: `ui/account-gate.ts` (schermata e connessione), `ui/access-model.ts` (tappe, senza DOM), `network/party-client.ts`, `server/world-service.ts`.

Verifiche: **1.085 test in 106 file**, tipi e build. I test nuovi coprono le tappe, l’accesso senza scritture, la creazione dopo `character_required` su WebSocket reali, il rientro con il solo token, dati di creazione non previsti e la ricerca del profilo nei due adattatori. Controllo tecnico nel browser con un server locale isolato, account fittizi e profili in memoria: registrazione, messaggio di conferma email, accesso, creazione, ingresso nell’HUB, menu, logout, rientro diretto con il personaggio salvato, password errata, seconda scheda con lo stesso account, server spento durante il gioco e all’avvio, modalità provider. Nessun account Supabase creato e nessuna email inviata; accesso con account reale, conferma email e prova giocata restano da eseguire dall’utente.

## Collegamento al provider esistente

Il repository originario non conteneva autenticazione o schema di `profiles`. Il collegamento è configurabile: confrontare i nomi delle colonne con la tabella esistente prima dell’avvio. Non vengono applicate migrazioni DDL automaticamente.

1. Copiare `.env.example` in `.env` e compilare `DATABASE_URL`. Per il progetto Supabase impostare `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `AUTH_MODE=supabase-password`: il gioco mostra email/password con **Accedi** e **Crea account**. La registrazione richiede anche la conferma della password; il server inoltra le credenziali a Supabase. Con conferma email attiva si mostra l’invito a controllare la posta e poi accedere; se Supabase restituisce subito una sessione completa si entra automaticamente. L’identità viene sempre verificata su `/auth/v1/user` prima di creare il profilo e inserire l’avatar nell’HUB. `SUPABASE_ANON_KEY` resta supportata per le configurazioni precedenti. Password e token non vengono scritti nei profili, nello storage del browser o nei log. La sessione resta in memoria, viene rinnovata automaticamente e all’uscita si revoca la sessione corrente; ricaricando la pagina occorre accedere nuovamente. Il recupero password resta da implementare.
2. Per un altro provider, configurare `AUTH_USERINFO_URL`: deve verificare un Bearer token e restituire un `sub` o `id` stabile. Impostare `AUTH_LOGIN_URL` alla sua pagina di accesso esistente, lasciando disattivata la modalità password integrata. Il callback può ritornare con `#access_token=...`, rimosso subito dall’indirizzo, oppure consegnare la sessione al gioco con l’evento seguente.

   ```js
   window.dispatchEvent(new CustomEvent('temper-your-soul:login', {
     detail: { accessToken: session.access_token }
   }));
   ```

3. La configurazione `PROFILES_*` mappa schema, tabella e colonne. `PROFILES_LAYOUT=json` usa chiave account univoca `id`, JSONB `character`, intero `gold`, intero `revision`. `PROFILES_LAYOUT=legacy-v9` supporta invece la tabella Supabase esistente con `account_id`, `name`, `class`, `level`, `xp`, `gold`, `save_version`, `inventory` e `updated_at`, senza aggiungere colonne. Gli identificatori vengono validati. La raccolta completa dei personaggi si conserva in `inventory`; nome, classe, livello, XP e versione vengono aggiornati anche nelle rispettive colonne. `updated_at` fornisce la revisione a microsecondi, controllata prima di ogni aggiornamento. Un JSON o metadati incoerenti bloccano il caricamento senza sovrascrivere il record. Il formato v9 viene letto; le scritture usano la versione corrente del gioco. L’oro dell’account è separato dal JSON, come nel precedente roster. Un account conserva più personaggi e ne sceglie uno online per sessione; l’oro è condiviso nell’account. I profili locali multipli restano conservati e separati; non sono importati automaticamente nel mondo autorevole.
4. `server/storage/schema.sql` è uno schema di riferimento per un database nuovo. Per una tabella esistente adattare la migrazione dopo averne controllato colonne, vincoli, eventuali trigger e tipo della chiave account. Dare accesso al ruolo PostgreSQL del server; con Supabase mantenere vietate le scritture dal browser tramite RLS.
5. Eseguire `npm run build` e `npm run server`. Il comando server carica `.env`. In sviluppo avviare anche Vite; il proxy inoltra WebSocket, configurazione online e `/auth`. In produzione configurare HTTPS/WSS e `ALLOWED_ORIGINS`.

Per il ritorno automatico dopo la conferma email, configurare il Site URL nella dashboard Supabase Auth oppure impostare `AUTH_EMAIL_REDIRECT_URL` nel server e ammettere lo stesso URL nei Redirect URLs del progetto. Senza override si usa il Site URL del progetto: dopo la conferma è sempre possibile tornare al gioco e accedere. Il callback con access token e refresh token viene acquisito in memoria e rimosso dall’indirizzo. [Registrazione email e URL di ritorno](https://supabase.com/docs/guides/auth/passwords). I limiti di invio, SMTP, requisiti password e messaggi di conferma restano gestiti dal provider; non si disabilita la verifica email.

Un profilo assente riceve livello 1 e quattro pezzi bianchi della classe scelta. Quello esistente viene caricato dal database. Un salvataggio invalido blocca l’accesso, senza sovrascriverlo con un nuovo personaggio. Il server ignora inventari, saldi e ID account dichiarati dal browser: accetta soltanto token verificati e comandi del dominio.

## Autorità e durabilità

Equipaggiamento, scarto, deposito, mercante, forgia e migliorie sono comandi validati sul server. Il profilo torna al client dopo il commit. Gli scambi aggiornano entrambi i profili nella stessa transazione PostgreSQL; un errore esegue rollback. Le revisioni impediscono di sovrascrivere una scrittura concorrente. Due sessioni dello stesso account sul processo vengono rifiutate.

I progressi dei dungeon sono applicati con cursori incrementali lato server: checkpoint fino a una volta al secondo, salvataggio finale prima del risultato inviato al client, salvataggio in uscita e allo spegnimento ordinato. I duplicati non riassegnano XP, oro, oggetti o record. Un errore lascia il cursore precedente e permette il retry. Le uscite con scrittura fallita restano pendenti e vengono riprovate mantenendo occupato l’account.

HUB e istanze vivono su un unico processo. I profili persistono fra riavvii; combattimenti, posizioni e istanze non vengono ripristinati dopo un arresto. Un crash può perdere i progressi successivi all’ultimo checkpoint: non è una simulazione con log transazionale di ogni tick. Non sono implementati shard distribuiti, ripresa del dungeon dopo disconnessione, permadeath o un nuovo mondo aperto. Ricaricando si effettua nuovamente l’accesso e si rientra nell’HUB con il profilo persistito.

## Verifiche

Pulizia della release: rimossi schermata cooperativa irraggiungibile, stili di lobby/prontezza, no-op del client, parametri di leader superati e metodi `SaveStore.load`/`save` del salvataggio singolo. Restano `loadRoster`/`saveRoster` per archiviare i profili locali, preferenze e copie di sicurezza. Gli account online usano soltanto il repository PostgreSQL autorevole. Il launcher del tunnel non scrive più metadati della vecchia lobby. Suite finale: **1.064 test in 105 file**, tipi e build superati, senza eliminare i test dei salvataggi precedenti.

Revisione party/menu/caricamenti: **1.064 test in 105 file**, tipi e build superati. Controllo tecnico nel browser con due account fittizi su server locale isolato e dati solo in memoria: indicatore durante accesso/uscita, icona Party dentro il pulsante, invito e consenso, due membri visibili, Esc al menu con avatar ancora visibile all’altro browser, logout con rimozione dell’avatar e ritorno al profilo locale. Corrette durante la prova la chiusura del dialogo dopo l’accesso e l’etichetta del salvataggio dopo il logout. Nessun account Supabase creato e nessuna conferma giocata dell’utente attribuita a questi controlli. Restano da provare con account reali e sulla rete dell’utente.

`npm run verify` controlla tipi, suite esistente aggiornata e build. I test nuovi includono 32 WebSocket reali su localhost, 64 presenze simulate, codec ordinato, ingressi tardivi, rimozioni, autenticazione tramite provider simulato, comandi autorevoli, errori di scrittura e scambi atomici. I test ordinari del database usano un’interfaccia controllata: non provano il PostgreSQL o il provider del proprietario.

Verifica completa dopo l’integrazione della registrazione: **1.052 test in 103 file**, tipi e build superati. I test dell’accesso includono login, registrazione con conferma email o sessione immediata, rifiuto di risposte incomplete, callback con rinnovo, requisiti password, limiti del provider, rinnovo in memoria senza interrompere il dungeon, revoca della sessione, origini, JSON e limiti delle richieste. Controllo tecnico iniziale nel browser locale: modulo email/password visibile e messaggio previsto dopo credenziali fittizie rifiutate dal Supabase reale. Nessun account creato né email inviata dagli strumenti; consegna dell’email, conferma, ingresso con account valido e prova giocata ancora da eseguire dall’utente.

Controllo tecnico successivo nel browser: passaggio da Accedi a Crea account, campo Conferma password, blocco dell’invio con password differenti e resa del modulo sul tema Reliquiario. I campi di prova sono stati svuotati al termine. Le impostazioni pubbliche del Supabase reale confermano registrazione email abilitata e conferma email obbligatoria; non sono state alterate.

`npm run verify:postgres` usa invece `TEST_DATABASE_URL` per verificare realmente caricamento, creazione, UPSERT, revisioni e rollback. Crea e rimuove soltanto uno schema temporaneo con nome casuale nel database di prova. Senza tale variabile fallisce esplicitamente. Non puntarlo al database di produzione.

Ancora da verificare con un account reale: login/rinnovo completo, persistenza dopo riavvio, gioco simultaneo fra browser, fluidità e bilanciamento con 32 persone. Un controllo tecnico del browser non equivale alla conferma giocata dell’utente.

Controllo browser iniziale eseguito sull’accesso: creazione del profilo di prova, apertura del dialogo account, assenza dei comandi party e segnalazione del server non raggiungibile. I controlli del collegamento reale successivi sono descritti sotto.

Benchmark sintetico ripetibile (`npm run benchmark:network`): 300 frame in 10 secondi simulati, 32 presenze → 30.713 byte/s per client e −97,35% rispetto agli snapshot completi; 64 presenze → 60.728 byte/s per client e −97,38%. Comprende il primo frame con le definizioni. Questi dati misurano serializzazione e simulazione, non FPS giocati o latenza su Internet. La mutazione temporanea che impedisce di rimuovere un avatar fa fallire i test degli ingressi/uscite; sorgente ripristinato prima della verifica completa.

Riferimenti del driver: [query parametrizzate](https://node-postgres.com/features/queries), [transazioni su un solo client del Pool](https://node-postgres.com/features/transactions).

## Collegamento al progetto Supabase esistente · 10 novembre 2026

MCP collegato e query di lettura riuscita su PostgreSQL 17.11. Lo schema effettivo di `public.profiles` è quello legacy descritto sopra; l’UPSERT del relativo adattatore è stato pianificato con `EXPLAIN`, senza eseguirlo e senza inserire o modificare record. Endpoint Auth e chiave pubblicabile verificati tramite `/auth/v1/settings`: email/password attivo, nessun provider OAuth esterno abilitato.

Creato `.env` locale ignorato da Git con URL, chiave pubblicabile, endpoint Auth, accesso email/password integrato e mappatura delle colonne. L’utente ha completato localmente `DATABASE_URL`; la connessione diretta tramite `pg` è riuscita. Un test sull’adattatore effettivo ha verificato creazione iniziale, metadati, UPSERT, controllo di revisione e rollback atomico, usando una copia temporanea della struttura di `profiles` in una transazione finale annullata: nessun profilo reale inserito o modificato. Nessuna connessione di produzione viene riutilizzata automaticamente per `TEST_DATABASE_URL`.

Rilevato: RLS disabilitata su `public.profiles` e privilegi diretti di lettura/scrittura ai ruoli `anon` e `authenticated`. Questa configurazione permette di aggirare l’autorità del server usando la Data API. Prima dell’uso pubblico occorre definire e applicare i permessi appropriati; nessuna modifica a RLS o privilegi remoti è stata eseguita durante la compilazione del `.env`. [Guida RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
