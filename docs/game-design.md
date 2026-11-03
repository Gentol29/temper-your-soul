# Temper your soul: design del gioco

## Versione e note nel menu (1 novembre 2026)

La versione del gioco è letta da `package.json` e mostrata solo nel menu principale, in piccolo al centro in basso (`v0.02.00`). Il pulsante Changelog in basso a sinistra apre le note dell’ultimo aggiornamento, incluse nella build. Le note precedenti restano in `src/release-notes.ts`; i cambiamenti numerici riportano etichetta, valori prima/dopo e unità. La [procedura di versioning](versioning.md) è obbligatoria per gli agenti a ogni PR o commit diretto a main autorizzato. Nessuna modifica a danni o progressione in questo incremento; versioni di rete e salvataggi indipendenti. Prova visiva a carico dell’utente.

## Aspetto del personaggio e oggetti indossati

Direzione artistica scelta dall'utente: **A — Fantasy compatto** (distinta dal tema UI C — Reliquiario). La tavola generata e un riferimento artistico, non un atlante utilizzabile direttamente. Prima traduzione modulare: basi a tre quarti in lino e cuoio, colori caldi, materiali ombreggiati, capelli a ciocche, mantelli aperti e spallacci con sagome differenti. L'approvazione della tavola non costituisce approvazione della resa del prototipo nel gioco.

Sviluppo grafico dei ritratti del personaggio **sospeso su richiesta dell’utente**: restano difetti di vestibilità e registrazione da rivedere in un incremento dedicato. Nessuna rigenerazione per le modifiche di gioco correnti. Sesso e classe ora si scelgono con il nome alla creazione e non si modificano dallo zaino; il formato v6 conserva più personaggi, identità e livello degli oggetti.

Le 17 famiglie hanno tre rappresentazioni: icona inventario, strato illustrato per la scheda personaggio e strato compatto da combattimento (48×48, inclusi margini per il movimento delle armi). Su richiesta dell'utente, il ritratto usa ora asset PNG dettagliati derivati dalla proposta A (`src/assets/portraits/`), con due basi e armature distinte per sesso, oggetti secondari, armi e stivali. `portrait-atlas.ts` collega ogni famiglia al suo asset; `portrait-layout.ts` ne registra posizione, scala e ritaglio. È possibile ingrandire il ritratto con Zoom. Gli elementi vengono ricomposti quando cambia l'equipaggiamento, non si sceglie un'illustrazione fissa di classe.

Il combattimento continua a usare `WEARABLES` e `characterPixels`, separati dal ritratto. `adventurer-body.ts` definisce articolazioni, fisionomie e proporzioni; `wearable-draw.ts` aggancia gli oggetti alle stesse pose. Riposo, camminata e lancio hanno cicli di 8 fotogrammi campionati. La base femminile è più esile anche sotto il collo, con proporzioni proprie di viso, spalle, vita e gambe; tutti gli oggetti vengono adattati a questi punti di attacco. Le parti sotto la presa di arco, martello, scettro, bastone e lancia passano dietro il corpo; la spada e gli oggetti secondari restano davanti. Un futuro scudo userà il livello davanti al torso, senza che questo incremento aggiunga uno scudo al catalogo.

L'arco ha flettenti curvi e corda separata di profilo; la posa di attacco mostra anche freccia e tensione. Queste sono pose visive, non modificano tempi, danno o geometria della skill. Il ritratto illustrato è statico; le animazioni sono del personaggio in gioco. La pagina di sviluppo `/character-animation.html` permette di confrontare il ritratto illustrato con lo sprite piccolo, entrambi i corpi, tutti gli oggetti e le animazioni, senza leggere o modificare il salvataggio; non fa parte della build di produzione.

Una nuova famiglia deve avere icona, skill con statistiche e icona spell. La revisione di `WEARABLES` e degli asset illustrati in `PORTRAIT_LAYERS` con entrambi i corpi è rinviata alla ripresa del lavoro grafico. Gli asset attuali vengono distribuiti localmente, senza nuove dipendenze o generazione remota durante il gioco.

Direzione UI scelta dall'utente: **C — Reliquiario**. Comandi principali in rame e prugna, bordi lavorati con angoli asimmetrici, rilievo e pannello del menu coordinato. Implementazione CSS senza nuove dipendenze.

Distingue le **decisioni prese** dai **valori provvisori** e dai **punti aperti**. Nessun valore numerico è definitivo, salvo dove indicato.

## Decisioni prese

- Il gioco si chiama **Temper your soul**. Repository: https://github.com/Jabbazz/temper-your-soul.
- Gioco **per browser**, in **TypeScript**, senza motore di gioco e senza dipendenze a runtime. Single-player locale.
- **Stessi principi di lavoro di Ashen Realm**: piccoli incrementi, simulazione a passo fisso separata dal disegno, dati / comportamento / rappresentazione separati, test accanto al codice, `verify` come comando unico, documentazione con decisioni e punti aperti distinti, nessun valore inventato per ciò che è ancora aperto.
- **Menu iniziale** con scelta del **dungeon**: la cripta del prototipo più altri **3 dungeon**, ognuno con una **mappa** diversa (dimensioni, tema grafico, ostacoli) e un **boss unico** con schemi di attacco propri.
- **Il personaggio si salva in locale** (nel browser, `localStorage`): inventario, equipaggiamento e record dei dungeon. Il backend cooperativo conserva soltanto stanze e incontri in memoria; nessun salvataggio cloud.
- **I boss lasciano oggetti** alla vittoria, con **rarità diverse**.
- **Gli oggetti conferiscono le abilità** (come in Ashen Realm): ogni oggetto sta in uno slot; la **famiglia** dell'oggetto determina la skill di quello slot, la **rarità** ne migliora i valori mantenendone l'identità. Ogni boss ha famiglie **esclusive** con abilità uniche che le altre non hanno.
- Quattro slot di equipaggiamento, uno per skill: **mano primaria** (skill 1, clic sinistro tenuto), **mano secondaria** (skill 2, clic destro), **armatura** (skill 3, Q), **stivali** (skill 4, E). Uno slot può restare vuoto (nessuna skill).

## Struttura del gioco (come funziona oggi)

Menu → Dungeon (scegli uno dei 4) → partita contro il boss → vittoria: bottino e record, oppure sconfitta: si riprova. Dal menu si apre anche l'**Equipaggiamento** (equipaggiare, rimuovere, scartare). Tutti i dungeon sono sempre selezionabili. Alla sconfitta non si perde nulla (regola provvisoria, vedi punti aperti).

## Provvisorio (non è una scelta di design)

Tutti i valori sono provvisori e modificabili: stanno in tabelle di dati con nome (file indicati).

### Impostazione e giocatore

- Visuale dall'alto, camera centrata sul giocatore (zoom 1,5, nessun limite ai bordi). Movimento con WASD, mira con il mouse, si può lanciare mentre ci si muove. Vittoria: il boss arriva a 0 PV. Sconfitta: il giocatore arriva a 0 PV.
- Grafica: pixel art disegnata dal codice (matrici di caratteri), particelle e ambiente procedurali. Audio: motore a canali guidato dai dati con registrazioni vere a licenza libera (vedi "Audio" sotto), acceso per impostazione.
- **Giocatore** (valori storici del prototipo, sostituiti dai profili di classe nell’ultima sezione): vita 100, velocità 177/s (in diagonale non aumenta), 0,65 s di invulnerabilità dopo un colpo. Raggio di colpo 9, corpo contro i pilastri 10 (`combat/collision.ts`).
- Ambientazione e testi del prototipo ("Ordine della Brace", "cripta", "guardiano") sono provvisori.

### Dungeon, mappe e boss

| Dungeon (id) | Pericolo | Mappa | Boss (id) | Vita | Carattere |
| --- | --- | --- | --- | --- | --- |
| La cripta (`crypt`) | 1 | 3200 x 2400, 6 ostacoli scenografici (cumuli di teschi, fontane distrutte, colonne spezzate, ossa con candele; provvisori) | Guardiano della cripta (`guardian`) | 1800 | quello del prototipo: raffiche, nova, frattura, carica, spirale, ventaglio |
| La palude spenta (`swamp`) | 2 | 2800 x 2800, 8 alberi morti, nebbia e funghi luminosi | Madre delle spore (`spore_mother`) | 2400 | lento e ingombrante, controlla lo spazio: nuvole di spore, cerchi di zone con centro sicuro, tentacoli, anelli che si chiudono, pioggia di spore, balzo tossico |
| La fucina in rovina (`forge`) | 3 | 3600 x 2200, 8 pilastri di ferro, lava | Colosso della fornace (`forge_colossus`) | 3000 | enorme (raggio di colpo 40), colpi pesanti e zone molto grandi: martellata con anello di schegge, file di lava con varco, raffiche, croce, spirale a due bracci, carica |
| Il ghiacciaio eterno (`glacier`) | 4 | 3000 x 3000, 7 colonne di cristallo, neve | Custode del ghiaccio (`frost_warden`) | 3600 | agile ed evasivo (velocità 165, quasi come il giocatore): ventagli di schegge, punte di ghiaccio, teletrasporto, bufera a spirali opposte, nova doppia, carica con zone sul percorso |

I valori di ogni boss (`BossStats`: vita, velocità, raggio di colpo, danno da contatto e carica, intervalli) e di ogni schema (`ByPhase`: normale / furia) stanno in `features/boss/guardian.ts` e `features/dungeons/<id>/`. Regole comuni: seconda fase (furia) sotto il 50% di vita; un boss lancia i propri schemi in rotazione e non ne inizia uno nuovo finché carica e azioni programmate non sono finite; il boss **ignora i pilastri** (vola) e può teletrasportarsi (Custode).

- **Pilastri**: bloccano il movimento del giocatore (che scivola lungo la superficie) e **assorbono i proiettili di entrambe le squadre**, quindi sono ripari. Fermano anche il colpo ravvicinato se tagliano la linea fino al bordo del boss. Non fermano le zone a terra.
- Vincoli verificati dai test per ogni dungeon: mappa 2000-4000 di lato, partenze libere, nessuna fessura più stretta del corpo del giocatore, danno per colpo <= 30 (proiettili) / 40 (zone) / 30 (contatto) / 40 (carica), zone con avviso >= 0,5 s, almeno 3 schemi esclusivi per boss.

### Skill base del mago (`features/skills/mage-skills.ts`)

La dotazione iniziale (oggetti Comuni di base): corrisponde esattamente alle skill del prototipo.

| Slot | Skill (id) | Ricarica | Effetto |
| --- | --- | --- | --- |
| 1 | Dardo arcano (`arcane_bolt`) | 0,2 s | proiettile, 19 danni, 440/s, raggio 4 |
| 2 | Globo di gelo (`frost_orb`) | 2,4 s | proiettile, 100 danni, 310/s, raggio 8; rallenta il boss 2 s |
| 3 | Meteora (`meteor`) | 5 s | zona di raggio 66 sul mirino, scoppia dopo 0,65 s, 210 danni |
| 4 | Passo astrale (`astral_step`) | 3,5 s | scatto di 125 verso la mira, invulnerabile 0,55 s (non accorcia un'invulnerabilità più lunga già in corso) |

Tipi di effetto disponibili (`SkillEffect`): **proiettile** (anche a ventaglio con `count` e `spread`), **zona a terra** (sul mirino o attorno al lanciatore, con rallentamento opzionale), **scatto** e **colpo ravvicinato ad arco**. Ogni skill ha ricarica propria (nessuna ricarica globale).

### Oggetti, rarità e bottino

**Famiglie** (25, `features/items/item-families.ts`; valori in `item-skills.ts` e `dungeon-item-skills.ts`). Nove famiglie storiche e sedici pezzi di set. La tabella seguente descrive i 17 oggetti originari; gli otto nuovi sono riportati sotto. `exclusiveTo` conserva il dungeon di origine del set, mentre le fonti effettive sono le voci esplicite in `LOOT_TABLES`, anche quando un pezzo compare altrove come alternativa inferiore.

| Slot | Generiche | Esclusive (boss) |
| --- | --- | --- |
| Mano primaria | Bastone arcano (dardo, base), Arco del cacciatore (freccia veloce 14 danni, 0,16 s), Scettro tempestoso (sfera lenta 23 danni, 0,4 s) | Lama del guardiano (cripta): colpo ravvicinato ad ampio arco, 55 danni, portata 95 · Martello della fornace (fucina): zona piccola e devastante sul mirino, 160 danni · Lancia di ghiaccio (ghiacciaio): scheggia veloce 70 danni che rallenta |
| Mano secondaria | Grimorio del gelo (globo, base), Talismano degli spiriti (3 fuochi fatui a ventaglio, 42 danni ciascuno) | Ventaglio di spore (palude): 5 semi a ventaglio, 38 danni ciascuno |
| Armatura | Mantello della meteora (base), Egida di brace (esplosione attorno a te, raggio 110, 130 danni) | Sudario della cripta (cripta): grande esplosione attorno a te che rallenta 2,5 s · Corazza della fornace (fucina): enorme zona ritardata sul mirino, 360 danni · Velo di bufera (ghiacciaio): esplosione attorno a te che rallenta 3 s |
| Stivali | Stivali astrali (base), Stivali del vento (scatto 200, invulnerabile 0,3 s, ricarica 2,4 s) | Stivali del pantano (palude): scatto corto con invulnerabilità lunga (0,8 s) |

**Rarità** (`items/rarity.ts`): Comune bianco, Non comune verde, Raro blu, Epico viola, Leggendario rosso (l’id `legendary` resta stabile). Danno x 1 / 1,2 / 1,5 / 2 / 3 e ricarica x 1 / 0,95 / 0,9 / 0,85 / 0,8; distanza e invulnerabilità dello scatto crescono della metà dell'aumento di potenza. A rarità Comune la skill è identica alla base. I valori restano provvisori.

**Bottino** (`loot/loot-tables.ts`): un tentativo per vittoria, **0 oppure 1 oggetto**, nessun drop garantito e nessun filtro di classe. Ogni boss ha otto voci: un set tematico completo di quattro slot e una sola alternativa verde Non comune per slot. Estrazione condizionata in tre passi: 25% di ottenere un oggetto; una volta ottenuto, **1/3 set e 2/3 Non comune** (33,33% e 66,67%, normalizzati al 100%); poi quattro pezzi equiprobabili, 25% ciascuno nel proprio gruppo. Per ogni specifico pezzo: `P(pezzo)=P(drop)×P(gruppo|drop)×P(pezzo|gruppo)`, quindi 2,0833% per uccisione per un pezzo di set e 4,1667% per un verde. I pesi per voce sono 1 nel set e 2 nelle alternative su tutti i boss, incluso il ghiacciaio. Rarità del set e livello restano fissati nella voce; nessuna estrazione dal catalogo generico globale.

| Dungeon | Drop | Set principale | Alternative |
| --- | --- | --- | --- |
| Cripta | 25% | Reliquie dell’ossario · Raro, livello 1 | Non comune, livello 1 |
| Palude | 25% | Custode dei rovi · Epico, livello 5 | Non comune, livello 1 |
| Fucina | 25% | Anima della fornace · Leggendario, livello 10 | Non comune, livello 6 |
| Ghiacciaio | 25% | Cuore del ghiacciaio · Leggendario, livello 15 | Non comune, livello 11 |

Set principali, nell’ordine primaria/secondaria/armatura/stivali: Cripta = Lama del guardiano, Lanterna dell’ossario, Sudario della cripta, Stivali del sepolcro; Palude = Arco di rovi, Ventaglio di spore, Mantello delle canne, Stivali del pantano; Fucina = Martello della fornace, Cuore di brace, Corazza della fornace, Calzari della fornace; Ghiacciaio = Lancia di ghiaccio, Specchio del ghiacciaio, Velo di bufera, Stivali di brina. Sono set tematici senza bonus per completamento.

Alternative per slot: Cripta = Arco del cacciatore, Grimorio del gelo, Egida di brace, Stivali del vento; Palude = Bastone arcano, Talismano degli spiriti, Mantello della meteora, Stivali astrali; Fucina = Scettro tempestoso, Ventaglio di spore, Mantello delle canne, Stivali del pantano; Ghiacciaio = i quattro pezzi della Fucina in variante Non comune. Tutte le 25 famiglie restano ottenibili; le varianti storiche già possedute restano valide.

**Salvataggio** (`features/character/`): chiave `temper-your-soul:save` in `localStorage`, versione **6**, raccolta con `format: character-roster`. Ogni profilo ha id stabile e dati separati; si conserva l’id attivo. Si salva alla creazione, selezione, rimozione, vittoria e modifica dell'equipaggiamento. I singoli personaggi v1–v5 vengono importati senza reset; alla prima scrittura della raccolta il vecchio testo viene conservato in `temper-your-soul:save:before-roster`. Dati illeggibili o futuri vengono copiati in `temper-your-soul:save:corrupt`; una raccolta con profili non validi non viene riparata scartandoli in silenzio. Se il browser non permette di salvare il gioco funziona in memoria e avvisa.

### Audio (proposta del ramo `feature/lavoro-personale`, da approvare)

Motore in `features/audio/`, separato in dati, regia e riproduzione. La simulazione non cambia: l'audio ascolta i `GameEvent`.

- **Catalogo** (`audio-catalog.ts`): suoni brevi per **materiale** (lanci e scoppi arcano, gelo, fuoco, natura; arco, lama, scatto), colpi, eventi del boss (annuncio d'attacco, furia, teletrasporto, schianto della carica, sconfitta), interfaccia ed esiti (clic, bottino, livello, vittoria, sconfitta). Musiche: menu, una per dungeon, una per la furia. Ambienti in anello per tema. Ogni skill degli oggetti dichiara il proprio materiale in `SKILL_SOUNDS` (un test lo impone); le zone dei boss lo ricavano dal prefisso dell'aspetto (`forge_`, `glacier_`, `swamp_`, `void_`…).
- **Regia** (`audio-director.ts`, funzioni pure): evento → suoni (in cooperativa il colpo subito solo per il giocatore del client, gli alleati colpiti come impatti); musica del menu fuori dalla partita, del dungeon in partita, della furia se esiste, abbassata in pausa, silenzio a fine partita; ambiente del dungeon anche dietro i menu, più basso; stereo e distanza rispetto al giocatore; limite di voci e intervallo minimo per suono.
- **Motore** (`audio-player.ts`): effetti con Web Audio (stereo, piccole variazioni di velocità) quando i file si possono leggere, elementi `<audio>` aprendo il gioco da `file://`; musica e ambienti con dissolvenza incrociata di 1,5 s. Si avvia al primo clic o tasto, come chiedono i browser; tace a scheda nascosta.
- **Impostazioni** (`audio-settings.ts`, chiave `temper-your-soul:audio`, separata dal salvataggio del personaggio): acceso/spento (tasto M) e volumi generale, musica, effetti, ambiente, interfaccia. Pannello **Audio** in alto a destra, con i crediti delle registrazioni.
- **Registrazioni:** solo vere e con licenza libera (CC0, pubblico dominio, CC BY con crediti visibili), mai IA. Crediti in `audio-credits.ts`; i test rifiutano file senza credito o mancanti. Primo lotto (48 file, circa 10,5 MB):

| Contesto | Registrazione | Licenza |
| --- | --- | --- |
| Menu | Bach, Aria delle *Goldberg*, Kimiko Ishizaka (pianoforte) | CC0 |
| Cripta | Canto gregoriano binaurale, Suso_Ramallo; ambiente: grotta, Andy_Gardner | CC BY 4.0; CC0 |
| Palude | Violoncello tenuto, carrieedick; ambiente: palude di notte, chris_dagorne | CC0 |
| Fucina | Taiko dal vivo, whatsanickname4u (Dave Thayer); ambiente: fango che ribolle, Breviceps | CC BY 3.0; CC0 |
| Ghiacciaio | Grieg, *La morte di Åse*, Czech National Symphony Orchestra (Musopen); ambiente: vento, moxobna | CC BY 3.0; CC0 |
| Furia dei boss | Grieg, finale di *Nell'antro del re della montagna*, CNSO (Musopen), in anello; gong Paiste, JensZygar | CC BY 3.0; CC0 |
| Vittoria / sconfitta | Fanfara per due trombe, tobyk; campana funebre, aoristos | CC BY 3.0; CC0 |
| Lanci | Lama: spade, Fenodyrie · Arco: rilascio della freccia, calvarychurchatlanta · Fuoco: scoppiettio, TheWoodlandNomad · Gelo: ghiaccio che si crepa, northern87 · Arcano: vetro (Kenney) · Natura: fruscio d'erba (Kenney) | CC0 |
| Scoppi, colpi, boss, interfaccia | Impatti, campane e clic di Kenney (Impact Sounds, UI Audio); gli scoppi uniscono un impatto Kenney alla registrazione del materiale | CC0 |

Ancora senza registrazione (secondo lotto, vedi `docs/risorse-libere.md`): lo scatto, che conserva il tono del prototipo, e l'annuncio degli attacchi del boss, che resta muto.

Valori provvisori: volumi, limiti di voci, dissolvenza, abbassamento in pausa (0,4), ambiente dietro i menu (0,35), stereo massimo (0,7), volume minimo dei suoni lontani (0,3), audio acceso per impostazione (nel prototipo era spento: c'erano solo toni sintetizzati).

## Differenze volute rispetto al prototipo originale

Il porting della Fase 0 conservava regole e valori; restano queste differenze (tutte da confermare a mano):

- Passo fisso a 60 Hz; tasti legati alla posizione fisica (`KeyboardEvent.code`); scossa dello schermo applicata; effetti che proseguono dopo la fine; traslazione di camera arrotondata; tocchi brevissimi non persi; scorciatoie del browser con Ctrl/Meta/Alt non intercettate.
- Un proiettile è riconosciuto per i suoi dati (`slowSeconds`, `visual`), non per il raggio; le zone dopo lo scoppio non restano "vive" (il bagliore è un effetto).

## Punti aperti

- **Direzione del gioco**: che cosa significa "temprare l'anima" (progressione, build, rischio/ricompensa, struttura a run o a incontri, tono). Oggi il ciclo è: dungeon → boss → oggetti → build.
- **Morte**: oggi non si perde nulla. Ashen Realm perde livello, equipaggiamento e chiavi: da decidere se e cosa perdere.
- **Progressione**: livelli ed esperienza, tier T1-T15 come in Ashen Realm (qui la potenza viene dalla rarità), sblocco dei dungeon (oggi sono tutti disponibili), difficoltà scalabile.
- **Altri slot**: anello e collana come modificatori delle skill, ali sulla velocità, pantaloni, peso dell'armatura (come in Ashen Realm). Oggi gli slot sono 4, uno per skill.
- **Oggetti**: capienza dell'inventario (oggi illimitata), vendita o riforgiatura, confronto tra oggetti, modificatori casuali, oggetti identici duplicati, eventuali oggetti unici con nome proprio.
- **Salvataggio**: cloud, esportazione/importazione del salvataggio e due schede aperte contemporaneamente (oggi una scheda adotta i salvataggi dell'altra appena avvengono; due salvataggi quasi simultanei restano "l'ultimo vince"). Profili multipli e rimozione individuale sono implementati localmente.
- Tutti i valori numerici (vita, danni, velocità, ricariche, pesi del bottino, scalatura delle rarità), da tarare con la prova manuale; equilibrio tra le famiglie e tra i dungeon.
- Ambientazione e lore: nomi dei dungeon e dei boss, "Ordine della Brace", "Emberfall".
- Raggi di collisione (oggi incoerenti di 1 tra proiettili e zone), perforazione e rimbalzo dei proiettili, pilastri distruttibili o che fermano anche le zone.
- Camera: limiti ai bordi, smorzamento, interpolazione del disegno (su schermi a più di 60 Hz il movimento può sembrare lievemente a scatti).
- Direzione artistica e audio definitivi; controlli (rimappatura, controller, touch/mobile); piattaforme e pubblicazione.

### Inventario a slot (2026-10-31)

Lo zaino si apre dal pulsante con icona pixel art nel menu. Equipaggiamento e bottino usano slot compatti con uno sprite originale 16×16 per ciascuna delle 17 famiglie (`presentation/item-sprites.ts`). La famiglia conserva lo stesso sprite a ogni rarità; bordo dello slot e nome nel tooltip usano il colore della rarità. Il tooltip appare al passaggio del mouse e al focus tastiera, con nome, rarità testuale, slot, abilità e statistiche risolte dalla rarità (anche velocità, raggio, durata e apertura totale dei proiettili).

Un clic seleziona l'oggetto nello zaino e mostra i comandi Equipaggia/Scarta; lo scarto mantiene la conferma in due passi. Gli oggetti equipaggiati sono segnati con E e si rimuovono dai quattro slot superiori. Filtri, ordinamento, salvataggi e regole del bottino restano quelli esistenti. Nessuna nuova capienza o statistica di bilanciamento introdotta.

## Livelli, mana e HUD (incremento corrente)
XP cumulativi salvati nel formato v2; v1 migrato con 0 XP mantenendo oggetti e record. Premi provvisori per vittoria: cripta 100, palude 180, fucina 280, ghiacciaio 400. Livello iniziale 1; costo del passaggio 100 + 50 per ogni livello gia ottenuto. Nessun bonus automatico alle statistiche per livello, per ora.
Mana massimo e rigenerazione base dipendono ora dalla classe (vedi ultima sezione); ogni oggetto aggiunge un bonus secondo il tipo di skill e la rarita. Costi per tutte le skill in SPELL_MANA; rigenerazione ferma in pausa/fine partita. Skill senza mana non attiva ricarica. Danno per rarita: x1, x1.2, x1.5, x2, x3; costi e cooldown migliorano con rarita. Valori tutti provvisori.
HUD centrale in basso: vita rossa, livello, mana blu, barra XP e icone originali pixel art in ordine DX/SX/Q/E; tooltip con statistiche. Ogni nuova skill richiede icona in SKILL_ICONS, costo in SPELL_MANA e test di copertura.
Boss e cariche collidono coi pilastri; i teletrasporti atterrano fuori dagli ostacoli. Droprate e permadeath rimandati.

## Classi e anteprima delle animazioni
Le tre classi sono Guerriero, Arciere e Mago. Nell’anteprima: Fornace rappresenta il Guerriero, arco e stivali del vento rappresentano l’Arciere, Arcano rappresenta il Mago. I preset dell’anteprima sono combinazioni visive libere; nel gioco reale ogni famiglia è ora vincolata a una classe, con statistiche innate distinte dal primo incremento di bilanciamento (vedi ultima sezione).
Le armi vengono disegnate come strati rigidi e ruotate attorno alla presa, senza deformare la lama. Braccio, polso e dita condividono un punto di attacco per mano; il lancio usa lo slot della skill effettivamente lanciata. L’anteprima permette di scegliere Primaria/Secondaria/Armatura/Stivali. Il ventaglio non contiene pixel di pelle: la mano viene disegnata una sola volta dal corpo.

### Ritratti indossabili e scelta della classe

La scheda personaggio usa la direzione A «Fantasy compatto», con sei basi illustrate: maschio e femmina per Guerriero, Arciere e Mago. Il Guerriero ha una presa bassa, l’Arciere una posa rilassata con arco non teso, il Mago una mano per bastone/scettro e una aperta per sostenere il tomo. Gli oggetti vengono montati su punti anatomici: presa delle mani, collo e spalle, caviglia e suola di ciascun piede. Le armature si adattano con registrazioni proprie di collo, cintura e spalle: busto e gonna hanno un giunto continuo alla cintura; le tuniche lunghe coprono la parte alta degli stivali. Gli stivali sostituiscono i piedi della base e seguono l’inclinazione della gamba. Dita davanti alle impugnature e parti delle armi lunghe dietro al corpo definiscono la profondità. I ritratti restano statici; gli sprite piccoli e le animazioni di combattimento restano quelli esistenti.

Nome, sesso e classe si scelgono nel menu prima del primo dungeon, con un’unica conferma. Da quel momento non si cambiano. I salvataggi v1–v4 mantengono inventario, equipaggiamento, XP, record e le scelte già fatte; richiedono solo i campi mancanti. La morte permanente non è ancora implementata: una sconfitta attuale non sblocca la ricreazione del personaggio.

### Creazione, equipaggiamento novizio e GS

Nome da 3 a 20 caratteri, con lettere Unicode, numeri, spazi, apostrofi e trattini; gli spazi vengono normalizzati. Nessun controllo di unicità globale, essendo un gioco locale.

Ogni nuovo personaggio riceve quattro pezzi Comuni bianchi della propria classe, uno per slot, già equipaggiati, livello oggetto 1 e 20 GS per pezzo (totale 80). Riutilizzano famiglie e abilità attuali con nomi novizio: Guerriero (spada, talismano, armatura, schinieri), Arciere (arco, ventaglio, corpetto delle canne, stivali), Mago (bastone, tomo, tunica, calzari). L’Arciere non condivide più l’Egida di brace del Guerriero. Il bianco è riservato al set iniziale e non compare nei dungeon. Nessun nuovo asset o skill per questo adeguamento.

GS provvisorio per pezzo: `min(100, baseRarità + livelloOggetto - 1)`, basi 20/40/60/80/100 e livello oggetto limitato a 1–20. Esempi: Arco novizio bianco livello 1 = 20, Arco del cacciatore verde livello 1 = 40, verde livello 5 = 44, rosso = 100. Le fasce non si sovrappongono; totale equipaggiato = somma dei quattro slot, massimo 400. Il livello oggetto è indipendente dal livello personaggio e attualmente entra nel GS; la potenza delle skill continua a scalare con la rarità. Eventuali bonus diretti per livello oggetto restano da definire.

Tooltip e slot mostrano GS; la scheda personaggio mostra nome, classe, livello e GS totale. **Il sesso compare solo durante la creazione**, resta salvato per il corpo e non viene descritto nei riepiloghi di menu o inventario. Ogni scheda dungeon mostra artwork, nome, pericolo, record, XP e livello del set. Descrizioni e taglines sono rimosse dalla card; altezza uniforme di 480 px e pallini 7×7 px. **«Loot rate %»** apre un tooltip che segue il cursore, senza dropdown: mostra drop 25%, nessun oggetto 75%, percentuali dei gruppi e, a destra, la ripartizione condizionata dopo il drop (8,33% per pezzo di set, 16,67% per verde); nei dettagli resta la probabilità complessiva per uccisione. Mostra anche classe richiesta, rarità, livello e GS. Accessibile con focus/clic, chiuso con Escape o navigazione.

### Vincoli di classe e ingresso nei dungeon

Ogni famiglia ha una sola classe richiesta (`item-classes.ts`, esposta da `ItemFamily.characterClass`), uguale a tutte le rarità. Mago: bastoni/scettri, tomi, lanterna, globo di brace, specchio, vesti magiche, calzari astrali e di brina. Arciere: archi, ventaglio, mantello delle canne e stivali del vento. Guerriero: spada, martello, lancia, talismano, armature pesanti e schinieri del sepolcro/pantano/fornace. Il bottino non è filtrato per classe: un oggetto di un’altra classe si conserva o si scarta, ma non si equipaggia.

Inventario e bottino mostrano gli oggetti incompatibili più scuri; i tooltip indicano la classe richiesta. Clic destro, pulsante Equipaggia e trascinamento passano dalle stesse regole di `Character`. I vecchi salvataggi conservano tutti gli oggetti, ma gli slot incompatibili vengono svuotati. Questi oggetti non conferiscono skill né GS, anche se referenziati impropriamente. Gli stati incompleti senza classe servono solo alla creazione/migrazione e non possono entrare in partita.

T1 e T2 non hanno soglia; **T3 richiede almeno 100 GS equipaggiati, T4 almeno 200**. La scheda disabilita l’ingresso e mostra requisito e GS attuale; la verifica è ripetuta nell’avvio della partita. Si conta solo il totale degli oggetti equipaggiati compatibili, non l’inventario. Test controllano i confini esatti e che ciascuna classe possa raggiungere le soglie con il bottino dei dungeon precedenti. Soglie richieste dall’utente; bilanciamento delle probabilità e dei valori ancora provvisorio.

### Profili locali e ritorno al menu

Il menu elenca i personaggi con nome, classe, livello e GS. «Nuovo personaggio» apre una bozza: non sostituisce il profilo selezionato e si può annullare; solo la conferma aggiunge il nuovo personaggio alla raccolta. Selezionare un profilo cambia personaggio attivo; inventario, equipaggiamento, XP e record non sono condivisi. «Rimuovi» apre una conferma nominativa, inizialmente focalizzata su Annulla, e cancella solo quel profilo; rimuovendo l’ultimo si torna alla creazione e la raccolta vuota resta vuota al ricaricamento. Non è permadeath.

Il pulsante **«← Menu principale»** resta nell’angolo superiore sinistro durante dungeon, inventario, partita, pausa e fine. Durante una partita abbandona l’incontro senza premi; gli oggetti e i progressi già salvati restano. Lo stato di selezione/scarto dell’inventario viene azzerato quando si cambia profilo.

### Party cooperativo sincronizzato

Server autorevole **Node + WebSocket**: una sola simulazione a 60 Hz per stanza, input e snapshot a 30 Hz. Il browser rappresenta lo stato ricevuto; HP, mana, collisioni, ricariche, danni, esito e bottino sono decisi dal server. Il client non invia posizioni o danni. Nessuna dipendenza di rete nel bundle browser; `ws` gira soltanto sul server e `tsx` esegue il server TypeScript.

1. Crea/seleziona un personaggio, apri **Party** in alto a destra e premi **Crea party**.
2. **Copia invito** condivide un URL `?party=<codice>`. Chi lo apre sceglie/crea il proprio personaggio e si unisce alla stessa stanza (massimo quattro membri).
3. Solo il creatore/leader sceglie il dungeon. Tutti confermano **Sono pronto**, poi il leader preme **Avvia dungeon**. Cambiare destinazione azzera le conferme. Il server verifica il GS di **tutti**: T3 100, T4 200.
4. Alleati visibili con sprite/equipaggiamento, nome e barra vita. Proiettili, zone e colpi alleati non infliggono fuoco amico; attacchi, contatto e cariche del boss possono colpire ciascun membro. Il boss prende di mira il vivo più vicino. Un KO rimane fuori combattimento fino al prossimo incontro; sconfitta solo quando tutti sono KO. Nessuna resurrezione né permadeath aggiunti.
5. A vittoria/sconfitta si apre il **Combat report** condiviso: danni effettivi inflitti, subiti e guarigione per membro, senza overkill. Guarigione resta 0: cure/Chierico non sono ancora implementati. Anche il singolo ha il report.

Il pannello mostra il **ping RTT** misurato ogni due secondi, con variazione dell’ultima misura nel tooltip. In cooperativa aprire menu/lobby o cambiare scheda **non mette in pausa il mondo**; l’input scade dopo 350 ms senza comandi. Uscita, ricaricamento e disconnessione abbandonano l’incontro (nessun rientro nello stesso combattimento); il corpo diventa KO. Se il leader esce, il comando passa al primo membro rimasto. Tornare al menu durante l’incontro esce dal party. Cambiare profilo esce dal party; cambiare equipaggiamento in lobby aggiorna il personaggio sul server e annulla il proprio pronto.

Ogni membro ancora connesso alla vittoria riceve gli XP interi del dungeon, il proprio record e un tiro personale di bottino (25%, massimo un pezzo), salvati nel proprio browser prima di mostrare i premi; anche un membro KO riceve il premio se il party vince. Nessuna divisione degli XP. Premi estratti una sola volta per incontro sul server; snapshot ripetuti non ripetono l’assegnazione client. Stanze e incontri sono in memoria: riavviare il server li elimina. Personaggi/equipaggiamento arrivano dai salvataggi locali validati: questa versione di prova non è un’economia protetta contro modifiche manuali dei salvataggi.

Avvio cooperativo (due terminali per sviluppo, solo il secondo per condividere la build):

```bash
npm run build
npm run server                  # http://127.0.0.1:4173, build + /party WebSocket + /health
# In un altro terminale, se si sviluppa:
npm run dev                     # Vite 5173, proxy WebSocket verso 4173
```

Se il leader usa localhost e gli ospiti il tunnel, `PUBLIC_URL` sul server deve contenere l’URL HTTPS del tunnel: la lobby restituisce quell’origine per «Copia invito». Senza configurazione si usa l’indirizzo della pagina. Quando cambia il tunnel, aggiornare la variabile e riavviare il server.

Per il tunnel pubblico puntare a **4173**, cioè al server cooperativo, per esempio `cloudflared tunnel --url http://127.0.0.1:4173 --protocol http2`. Tenere attivi server e tunnel. Il server espone solo `dist/`, non il workspace. L’URL del tunnel è temporaneo: non va salvato come indirizzo permanente. Le build pubbliche si aggiornano con `npm run build`; dopo cambi al codice server riavviare `npm run server`. Porta alternativa tramite variabile d’ambiente `PORT` (aggiornare proxy/tunnel se cambia). `npm run preview`, hosting statico e `file://` consentono il singolo, ma non ospitano stanze multiplayer.

Valori provvisori da tarare: capienza 4, input/snapshot 30 Hz, scadenza input 350 ms, boss senza aumento automatico degli HP per dimensione del party. Premi interi personali e bersaglio vivo più vicino sono scelte iniziali regolabili, da confermare con prove giocate. Nessun riassetto degli sprite incluso.

### Ottimizzazione multiplayer (31 ottobre 2026)

- Protocollo ordinato v2: tuple compatte per personaggi/boss; tipi di proiettile/zona e nascite trasmessi una sola volta per incontro; dopo si inviano rimozioni. Posizione dei proiettili lineari e countdown sono ricostruiti dal tempo autorevole. La simulazione resta a 60 Hz, la rete a 30 Hz. Arrotondamento solo visuale delle coordinate/ricariche dei personaggi: errore massimo 0,005 unità; danni, HP e regole server invariati.
- Ogni frame è serializzato **una volta per stanza**, condiviso fra i membri; report/premi solo a fine incontro e trasmissione del mondo interrotta dopo l’esito. I delta non vengono saltati in silenzio: sequenza non valida o connessione troppo lenta provocano un’uscita esplicita. Dopo questo aggiornamento ricaricare la pagina; il server rifiuta client col vecchio protocollo con un messaggio di aggiornamento.
- Il client riutilizza proiettili/zone per id e applica al massimo uno stato per fotogramma, preservando gli eventi; gli esiti finali e il salvataggio non attendono il rendering di una scheda in background. Ogni ping aggiorna soltanto il badge, senza ricreare il party o interrompere il focus nella lobby.
- Gli sprite attuali vengono rasterizzati una volta per posa/equipaggiamento e disegnati con un’unica operazione per personaggio. Cache limitata a 256 fotogrammi per gestire quattro equipaggiamenti; eliminati array temporanei nel controllo delle collisioni e riutilizzate le descrizioni visive degli alleati. Nessun nuovo asset o cambiamento dello stile.

Benchmark ripetibile: `npm run benchmark:network`. Fixture sintetica di 40 secondi con quattro giocatori e Ghiacciaio in furia, fino a 226 proiettili, 1.200 aggiornamenti: **28.582.862 → 480.050 byte**, circa **−98,3%** rispetto agli snapshot completi. Test confrontano traiettorie, zone, rimozioni, eventi, cambio incontro e premi. I tempi di decodifica stampati dipendono dalla macchina e dal riscaldamento del runtime.

Confronto browser tramite tunnel, due Edge headless isolati a 1440×1000, finestra di 8 secondi: traffico ricevuto **889.719 → 51.553 byte (−94,2%)**, tempo CPU del thread principale **4.099 → 3.469 ms (−15,4%)**, tempo script **1.229 → 944 ms (−23,2%)**. Entrambe le versioni erano già a circa 60 FPS, senza frame oltre 25 ms nella finestra: non è una promessa di aumento FPS universale. Ulteriore prova con quattro browser/classi miste: circa **59,8 FPS**, due frame oltre 25 ms su 478. Le finestre reali non sono replay perfettamente identici; conferma della fluidità sul PC del giocatore ancora necessaria. Vittoria, report identico e premi personali verificati anche dopo il cambio di protocollo.

### Kit degli otto nuovi oggetti

Lanterna dell’ossario: due luci lente con rallentamento; Arco di rovi: due spine divergenti; Cuore di brace: tre frammenti rapidi; Specchio del ghiacciaio: cinque schegge ad ampio ventaglio. Ciascun proiettile ha id, scia e forma propri (luce spettrale, spina, brace, frammento speculare). Mantello delle canne: zona di rovi attorno al giocatore con preavviso e rallentamento. Stivali del sepolcro, Calzari della fornace e Stivali di brina: tre scatti con distanze, invulnerabilità, ricariche, mana ed effetti differenti. Statistiche e costi sono provvisori e risolti dalla rarità come per le altre famiglie.

Ogni oggetto ha icona inventario 16×16, icona spell, strato indossato animato in gioco per entrambi i corpi e strati dedicati del ritratto. I nuovi strati del ritratto sono SVG disegnati nel codice, separati dalle icone dello zaino e agganciati a mani/caviglie/busto: non sono nuove immagini generate. Gli atlanti illustrati precedenti restano invariati; la revisione estetica complessiva rimane sospesa. Nessuna modifica al formato v5 o reset dei salvataggi richiesto.

Punti aperti: taratura di probabilità e GS, bonus del livello oggetto, futura gestione della morte e ricreazione. Vincoli di classe e soglie di ingresso sono implementati. UI nel tema C — Reliquiario; l’hover dei profili usa prugna scuro con testo crema smorzato, senza il vecchio fondo giallo.

## Sensazione di combattimento, fase II, servitori e schermate finali (proposta del ramo `feature/combattimento-e-vittoria`, da approvare)

Studio completo, con stato prima e dopo, in [studio-combattimento-e-vittoria.md](studio-combattimento-e-vittoria.md). Valori tutti provvisori, nelle tabelle con nome indicate.

- **Risposta ai colpi** (`presentation/effects.ts`, `FEEDBACK`, `DAMAGE_TIERS`):
  - colpo a segno su boss o servitore: lampo bianco di 0,09 s, sobbalzo, scintilla a stella, scoppio;
  - colpo contro un pilastro: polvere spenta;
  - proiettile perso nel vuoto (nuovo evento `projectile_faded`): sbuffo grigio;
  - numeri del danno a quattro livelli (13/16/20/24 px, dal bianco all'arancio), con contorno scuro e "pop";
  - colpo subito: vignetta rossa e scossa, solo per il giocatore di questo client in cooperativa; sotto il 30% di vita la vignetta pulsa.
- **Barre** (`ui/health-feedback.ts`, `CHIP`, `DAMAGE_WINDOW`):
  - scheggia chiara dei danni appena fatti o subiti, che resta 0,45 s e poi si consuma;
  - contatore dei danni degli ultimi 1,6 s sotto la barra del boss;
  - tacca della soglia della fase II;
  - in furia barra rosso-arancio, "FASE II" e bordo acceso.
- **Fase II**: stendardo «FASE II · <testo della furia>», lampo rosso, tre onde d'urto, scossa forte. In partita singola la simulazione si ferma per 1,6 s (`PHASE_INTERLUDE` in `game.ts`); in cooperativa il server non si ferma e il client mostra solo lo stendardo. Dopo, alone pulsante e particelle fitte del colore del boss (`presentation/boss-fx.ts`).
- **Morte del boss e fine incontro**: il boss resta visibile per 1,4 s mentre si illumina, trema e si frantuma, con un lampo bianco. Bottino, XP e record si salvano subito; la schermata arriva dopo 1,7 s alla vittoria e 1,3 s alla sconfitta (`END_DELAY`), e alla sconfitta la scena si spegne in grigio.
- **Vittoria** (`ui/end-screen.ts`): «Vittoria» dorato animato, «Boss sconfitto · nome», statistiche con distintivi («Record!», «Prima vittoria», «Intatto»), barra XP che si riempie con salita di livello, bottino rivelato con un lampo. La finestra «Combat report» resta solo in cooperativa (in partita singola ripeteva una riga).
- **Sconfitta**: «Sei caduto», vita rimasta al boss, tempo resistito, danni, precisione, «Ti ha colpito soprattutto» (prime due fonti con colpi e danni) e un consiglio per tipo di colpo (`DEFEAT_TIPS`), più il pulsante «Cambia equipaggiamento». La fonte dei danni arriva dalla simulazione (`damage_dealt.source`: nome dello schema, contatto, carica, servitore).
- **Statistiche** (`match/combat-tally.ts`):
  - si contano dagli eventi, anche in cooperativa (solo il giocatore del client);
  - precisione = proiettili a segno su proiettili a segno, persi nel vuoto o fermati da un pilastro;
  - le zone e i colpi ravvicinati contano nei danni, non nella precisione.

### Servitori (decisione per Jabbaz)

Sistema generico in `features/minions/`: comportamenti `chaser` (insegue e ferisce a contatto), `kamikaze` (esplode a contatto), `turret` (spara da ferma).

| Boss | Servitore | Comportamento | Vita | Velocità | Danno | All'ingresso in furia | In furia | Massimo vivi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardiano | Fuoco fatuo di brace | kamikaze, esplosione di raggio 34 | 60 | 120 | 14 | 3 | 2 ogni 4 attacchi | 4 |
| Madre delle spore | Sporello | chaser | 90 | 72 | 10 | 4 | 2 ogni 4 attacchi | 6 |
| Colosso della fornace | Folletto di scoria | kamikaze, esplosione di raggio 38 | 50 | 165 | 16 | 3 | 2 ogni 4 attacchi | 4 |
| Custode del ghiaccio | Sentinella di brina | turret, scheggia da 10 ogni 1,9 s | 110 | 0 | 8 | 2 | 1 ogni 5 attacchi | 3 |

Regole comuni:
- compaiono in cerchio attorno al boss, senza casualità (la partita resta riproducibile);
- fermano i proiettili del giocatore prima del boss (fanno da scudo) e sono colpiti da zone e colpi ravvicinati;
- contano nei danni del resoconto e muoiono con il boss;
- in cooperativa viaggiano nelle istantanee (protocollo **3**: lista `m` con id, tipo, posizione e vita; nel revisione locale della PR #4 protocollo 5, vedi sotto).

Grafica nel codice in `presentation/minion-art.ts`. Punti aperti: numeri e frequenze, esperienza o bottino per i servitori (oggi nessuno), servitori anche in fase I.

## Discesa: decisione del 1 novembre 2026 (revisione PR #4)

La revisione locale della PR #4 mantiene mappe, 32 servitori a tema con élite, luogotenenti/pre-boss, Bestiario e scelta delle direzioni lungo otto tappe. **Nessuna ricompensa intermedia**: niente XP, oggetti, braci, cure a fine stanza, sigilli, tempre o Altare. Le skill restano quelle dell’equipaggiamento; solo il boss finale assegna gli XP e il bottino già previsti (25% di possibilità di un oggetto). La progressione tra stanze verrà progettata in un secondo momento.

- Otto tappe: Soglia; due Scontri; Scontro/Prova/Reliquiario; Luogotenente; Santuario/Assedio; Scontro/Caccia; Anticamera; Boss. Il percorso e le direzioni restano deterministici dal seme.
- A stanza libera si aprono le porte. Tutti i vivi restano sulla stessa soglia per 0,8 s. Nessuna scelta di potenziamenti blocca l’uscita.
- Restano ondate a budget, insidie a tema, élite, segnali di comparsa, tetto dei vivi e scalatura del gruppo. Nessun moltiplicatore da gradi di tempra.
- Prove, Assedio e Caccia mantengono obiettivi e combattimento. Stanze tranquille e Anticamera non curano e non generano forzieri/fonti/incudini.
- Vita e mana passano alla stanza successiva; la rigenerazione mana ordinaria resta. In cooperativa un alleato a terra si rialza nella stanza seguente al 30%: meccanica KO preesistente, non premio di stanza.
- Restano i 32 servitori a tema, i quattro luogotenenti e le mappe modello. Uccisioni registrate nel Bestiario anche alla sconfitta.
- Boss: XP originali e tabelle originali, nessun bonus sigillo. I servitori e i luogotenenti non assegnano oggetti, XP o valuta.
- Restano Duello e Pellegrinaggio della PR; la progressione tra stanze è rinviata.
- Salvataggio v7: conserva migrazioni e dati storici braci/benedizioni/gradi senza applicarne gli effetti. Nessun reset dei profili.
- Cooperativa: protocollo 5, stessa autorità server. Leader sceglie dungeon e modalità con pulsanti; grado sempre zero. I comandi storici di tempra/patto non assegnano benefici.

### Punti aperti

- Taratura di vita, danni e budget con partite vere: ogni dungeon è stato provato a fondo solo con simulazioni e bot.
- Banda nelle stanze affollate: si potrebbero inviare le posizioni dei servitori a 15 Hz o solo quando cambiano.
- Il resoconto della sconfitta chiama "Contatto con il boss" anche il contatto con il luogotenente.
- Il Bestiario usa il tema Reliquiario, ma la revisione grafica complessiva resta sospesa.

## Grafica: fase 0 dello studio (proposta del ramo `feature/discesa`, da approvare)

Primo passo dello studio su grafica, stanze, minimappa e nemici (documento a parte, condiviso dall'utente): leggibilità a costo basso, senza nuovi asset e senza toccare le regole. Valori provvisori nelle tabelle indicate.

- **Proiettili per squadra** (`draw-combat.ts`, `PROJECTILE_STYLE`):
  - quelli nemici hanno alone, contorno scuro e nucleo chiaro;
  - quelli dei giocatori sono al 70% di opacità, con scia leggera e senza alone.

  Tutte le forme usano il colore del loro aspetto. Prima il rombo e il dardo avevano un colore fisso, quindi il globo di gelo era uguale alla nova del Custode e il dardo arcano uguale al dardo a croce.
- **Colori nuovi dei proiettili nemici** che si confondevano con la lava o con i colpi dei giocatori:
  - fucina: mantice, braci e scossa del Colosso, dardo a croce e schegge d'incudine;
  - ghiacciaio: nova, schegge, bufera antioraria e schegge dell'apprendista;
  - cripta: incensiere e campana.

  Le zone a terra restano del loro materiale. Un test controlla la distanza di colore fra colpi dei giocatori e proiettili nemici della stessa forma, e fra i proiettili di un dungeon e i colori a terra del suo tema (`ArenaTheme.groundColors`).
- **Ordine di disegno**: le figure (servitori, boss, eroi) si ordinano per profondità, poi vengono i colpi dei giocatori, le particelle e infine i proiettili nemici. Nomi e vita degli alleati stanno sopra tutto. Con più di 40 proiettili le particelle di scia si dimezzano.
- **Sagome**: i servitori hanno un bordo chiaro di un'unità del colore del tema (`ArenaTheme.silhouette`), cotto nel raster in cache. I dormienti non ce l'hanno: devono sembrare pietra.
- **Luce finta** (`presentation/lights.ts`):
  - aloni in cache sotto torce, bracieri, crepe di lava, funghi e cristalli;
  - buio ai bordi dello schermo, del colore del tema.

  I funghi della palude diventano ciano: il giallo e il viola sono della Madre delle spore.
- **Decori**:
  - torce della cripta e bracieri della fucina stanno lungo i muri, a passo regolare;
  - le incudini stanno in posizioni relative alla mappa;
  - tutti lontano da ingresso, porte e pilastri (`themes/decor.ts`);
  - tappeto e cerchi runici della cripta sono frazioni della mappa: nell'arena del boss restano dov'erano.

  Prima, nelle stanze, un braciere cadeva sulla porta centrale e uno sull'ingresso.
- **Pavimento della cripta**: un hash vero al posto della sinusoide, che disegnava strisce regolari.


## Storico delle migliorie multiplayer integrate dalla copia locale

Le misure seguenti precedono l’integrazione con le stanze della PR #4; non sono benchmark della versione combinata.

### Diagnostica FPS e completamento dell’ottimizzazione (1 novembre 2026)

Il tasto **F2**, o il pulsante **FPS · F2**, apre un pannello facoltativo con FPS, tempo dei fotogrammi al 95° percentile, lavoro per frame, aggiornamenti di rete al secondo, traffico approssimato, RTT e costi del server. I dati server arrivano da `/health` soltanto quando il pannello è visibile e il client è in party. CPU server è una percentuale di **un core**, non il consumo totale del PC; il tempo del frame non misura direttamente il carico della GPU. Nessuna telemetria inviata a terzi.

La Cripta memorizza il pavimento in tasselli con cache limitata a 8 MiB per arena; torce animate e rune sono disegnate a parte. Completata la verifica di sei viste, inclusi bordi e coordinate frazionarie: **zero differenze di pixel** rispetto alla versione senza cache. Due test controllano riutilizzo, separazione fra arene e rimozione dei tasselli vecchi. Il caricamento audio limita a due le operazioni contemporanee; selezione delle piste e scritture di volume evitano lavoro ripetuto quando lo stato non cambia. Queste ottimizzazioni erano già integrate nel main; la ripresa ne completa verifica e documentazione.

Corretto un problema rilevato nelle prove Windows: il watcher di Vite includeva `.tools/` e poteva arrestarsi con `EBUSY` su file bloccati dei profili browser. Ora ignora `.tools/` e `dist/`. È un problema dell’ambiente di sviluppo/test, non una causa dimostrata del calo durante una partita sulla build pubblica.

Profilo della versione attuale: un browser con accelerazione grafica e un alleato simulato tramite socket, senza un secondo renderer sul PC. Circa **159 FPS in singolo e 165 in party**, frame p95 circa 6,2 ms; server circa **1,5–3,1% di un core**, passo p95 0,11–0,13 ms, invio p95 0,34–0,35 ms, rete 30 aggiornamenti/s e circa 6,3 KB/s nella finestra misurata. In questa prova il server non è risultato saturo e il calo segnalato non è stato riprodotto: non è una garanzia per altre reti, dungeon o carichi. La misura con F2 durante il problema reale resta necessaria; aggiornamenti del mondo a 30 Hz e FPS del canvas sono grandezze distinte. Questo profilo precede l’interpolazione implementata nel successivo incremento descritto sotto.

Verifica aggiornata: **478 test**, tipi client/server e build superati. Controllati il pannello desktop/mobile e la lettura dei dati server. Conferma giocata dell’utente ancora da ricevere. La prossima parte della progressione resta da concordare, senza modifiche implicite a XP, drop o permadeath.

### Interpolazione del multiplayer (1 novembre 2026)

Implementata `NetworkView`, una copia riservata alla rappresentazione: camera, giocatore, alleati, boss, proiettili e servitori interpolano le posizioni a ogni fotogramma fra gli stati ricevuti. Input, HUD, danni, collisioni, ricariche e premi continuano a usare lo stato autorevole. Le scie seguono le posizioni visuali; la mira locale resta agganciata al puntatore. Server a 60 Hz e trasporto a 30 Hz invariati.

Buffer visivo provvisorio di un aggiornamento (circa 33 ms); non è predizione del movimento locale. Scatti e teletrasporti vengono mostrati immediatamente, così come l’esito finale. Dopo oltre 250 ms senza aggiornamenti si riallinea la scena; senza nuovi dati si ferma all’ultima posizione confermata, senza inventare movimento o colpi. Valori regolabili in `NETWORK_VIEW`.

Verifica: 484 test, tipi client/server e build superati. Sei nuovi test coprono posizioni intermedie, separazione dallo stato autorevole, alleati/boss/proiettili/servitori, arrivi irregolari, salti, interruzioni e fine partita. Nessun test visivo eseguito, su richiesta dell’utente: fluidità e ritardo percepito restano da confermare nella sua partita.


### Verifica della versione combinata (1 novembre 2026)

Integrate le fix delle stanze e le migliorie multiplayer locali. `npm run verify`: 555 test in 42 file, tipi client/server e build superati. Due regressioni aggiuntive verificano interpolazione in stanze senza boss e conservazione del luogotenente con vita scalata. Nessuna nuova prova visiva eseguita, come richiesto dall’utente.

## Ruoli di classe: richiesta e primo incremento (1 novembre 2026)

Decisione: Guerriero tank (HP/difesa), Mago magia e controllo elementale (mana/recupero/potenza), Arciere movimento e frequenza d’attacco. Tabelle provvisorie in `features/classes/<classe>/profile.ts`; aggregazione in `class-stats.ts`. Ogni slot concede bonus specifici di classe, moltiplicati per la potenza della rarità x1/1,2/1,5/2/3. Nessun bonus dal livello oggetto oltre al GS. La difesa riduce ogni danno ricevuto con `100/(100+difesa)`; report ed eventi usano la perdita effettiva di HP.

| Classe | HP base / set Comune | Difesa base / set | MP base / set | Movimento base / set (u/s) | Bonus frequenza primaria base / set | Potenza abilità base / set |
| --- | --- | --- | --- | --- | --- | --- |
| Guerriero | 150 / 200 | 15 / 40 | 60 / 60 | 170 / 173 | 0% / 0% | 0% / 0% |
| Mago | 90 / 95 | 0 / 2 | 150 / 200 | 177 / 179 | 0% / 0% | 0% / 7% |
| Arciere | 110 / 120 | 5 / 10 | 80 / 80 | 195 / 212 | 10% / 20% | 0% / 0% |

Rigenerazione mana base: Guerriero 5/s, Mago 10/s, Arciere 6/s. Restano i precedenti bonus delle skill; il set Comune del Mago aggiunge ulteriori 3,5 MP/s. Frequenza primaria: cooldown diviso per (1+bonus); gli altri slot non accelerano. Tutti gli attacchi primari non magici costano 0 MP, inclusi martello e lancia; tutti i lanci del Mago mantengono i costi correnti. La potenza aumenta il danno generato dalle abilità, oltre allo scaling già presente della rarità. Nessun dato nuovo nei salvataggi; protocollo 6 trasmette la classe nel setup.

### Revisione delle skill di classe (1 novembre 2026)

Le famiglie salvate mantengono gli id: i pezzi già posseduti ricalcolano le nuove abilità. Il catalogo viene dai registri `classes/warrior/skills.ts`, `classes/mage/skills.ts`, `classes/archer/skills.ts`; `ClassCombat` gestisce interazioni, compagni e colpo speciale, `StatusRuntime` gestisce applicazione e scadenza degli stati. Nessun cambio al formato di salvataggio.

| Classe | Primaria · SX | Secondaria · DX | Armatura · Q | Stivali · E |
| --- | --- | --- | --- | --- |
| Guerriero | Fendenti di spada/martello/lancia; cancellano proiettili ordinari nell’arco e provocano in raggio | Scudo: assorbe completamente il prossimo colpo per 2 s, anche rosso | Secondo fiato / Fortezza vivente: difesa e rigenerazione HP temporanee | Corse fisiche con urto, fermate dai pilastri |
| Mago | Staffa: fuoco; scettro: vento; 15% di stato per proiettile a segno | Tomo/specchio acqua, lanterna terra, globo fuoco; stato garantito al colpo | Meteora fuoco con channeling, Marea acqua con channeling, Patto della terra con buff | Blink con esplosione immediata e esposizione al vento all’arrivo |
| Arciere | Frecce gratuite con marchio e 35% di penetrazione dello scudo numerico | Faretra: frequenza primaria +35% e furto vita 15% per 5 s | Lupo evocato per 20 s | Due cariche di corsa, recuperate una alla volta |

Valori Comuni provvisori: fendente 36 danni/0,45 s, spazzata martello 60/0,75 s, falciata lancia 42/0,55 s. Tutte provocano entro 300 unità per 3 s: prevale l’ultima provocazione valida, termina al KO o fuori raggio; i proiettili e gli attacchi già diretti non cambiano traiettoria. Scudo: costo 12 MP, recupero 8 s. Armatura base: +40 difesa e 5 HP/s per 5 s, costo 20 MP e recupero 12 s; fornace: +65 difesa e 7 HP/s per 6 s, 25 MP e 15 s. Le rigenerazioni e il furto vita contano gli HP effettivamente recuperati nel report.

Corse del Guerriero: 150–210 unità in 0,22 s, urto 35–55 danni Comuni una sola volta per nemico attraversato; collisione verificata lungo il percorso, nessun blink. Arciere: 170 unità in 0,16 s, 0 MP, due cariche e recupero base 3 s. La rarità aumenta distanza, protezione e danni secondo lo scaling esistente. Parata e buff sono distinti e possono coesistere; riapplicare lo stesso tipo di buff rinnova senza cumulare indefinitamente.

Il channeling paga mana e avvia la ricarica all’inizio; movimento al 35%, nessun nuovo lancio durante la preparazione. Meteora: 0,7 s; Marea: 0,5 s. Alla fine usa il punto mirato all’inizio della canalizzazione; il KO interrompe senza rimborso. Blink: esplosione immediata da 65 danni base, raggio 85. La rarità scala il danno dell’esplosione.

Stati, senza cumulo dello stesso stato sullo stesso bersaglio (nuovo colpo rinnova la durata, non anticipa il prossimo tick): fuoco → bruciatura 8 HP/s per 4 s alla rarità Comune; acqua → rallentamento per 3 s; terra → radicamento del movimento ordinario per 1,2 s (non interrompe le cariche o i teletrasporti speciali); vento → esposizione, +20% danno subito per 4 s. Effetti su boss, luogotenenti e servitori; tiri tramite Rng iniettato, nessun proc sul colpo mancato. La bruciatura scala con la rarità; il bonus di potenza del personaggio scala il danno diretto delle abilità, non aggiunge un secondo moltiplicatore al danno periodico.

Lupo: segue senza sovrapporsi al proprietario, attacca il marchio delle frecce; dopo una uccisione può saltare su un nemico entro 180 unità senza attraversare un pilastro. Morso Comune 22 danni ogni 0,7 s; la rarità scala il morso x1/1,2/1,5/2/3. Ogni morso a segno ha 20% di sanguinamento per 4 s: danno ogni secondo pari allo 0,15% degli HP massimi del boss, 0,3% del luogotenente, 2,5% del servitore. Il pet svanisce a scadenza/KO o cambio stanza; può essere rievocato dalla skill. Il marchio è personale per proprietario. La penetrazione delle frecce agisce sugli scudi numerici esistenti; non è stata aggiunta una nuova statistica di armatura ai nemici. Gli scudi speciali degli élite mantengono la loro regola di rottura tramite melee/area.

Boss e luogotenenti: colpo rosso speciale a 10 s, poi ogni 12 s; preparazione 1,1 s con linea di mira e glifi rossi rotanti, quindi proiettile da 100 danni base a 390 u/s. Supera invulnerabilità ordinaria e cancellazione del fendente, ma viene assorbito dalla parata; può essere evitato muovendosi o usando gli ostacoli. Non è un colpo garantito. Dati in `classes/combat-tuning.ts`. Non introdotto questo attacco nelle fixture storiche prive di classe; nel gioco ogni personaggio ha la propria classe esplicita.

Icone della barra nuove per tutte le skill di classe; Scudo degli spiriti e Faretra del predatore rinominati mantenendo gli id salvati. Aggiornata l’icona oggetto dello scudo; nessuna rigenerazione o revisione dei ritratti/personaggi. Segnali persistenti per parata, buff, canalizzazione, pet, marchio e debuff. Protocollo **7**: il server trasmette anche stato delle classi e cariche; il client rappresenta senza simulare danni, DoT o pet. Riavviare server e ricaricare i client.

Verifica: tipi client/server, suite e build; controlli browser con nuovi personaggi delle tre classi (icone, skill, Q Guerriero, lupo e due cariche, channeling Mago). Mutazione della parata rilevata dal test e ripristinata. Questi controlli non sono una conferma giocata dell’utente.

### Ancora aperto

- Taratura giocata di durate, danni, costi e recuperi; bilanciamento completo dei quattro boss.
- Aumento HP base dei boss e danno/velocità dei proiettili ordinari. +50% HP per membro aggiuntivo per boss e servitori: oggi questa crescita è già presente per i luogotenenti, il budget delle ondate cresce col party; resta da uniformare.
- Salvataggio del pet fra stanze e profili di resistenza dei nemici: non aggiunti in questo incremento.

## Danno finale intero per difetto · v0.03.01

Richiesta dell’utente: arrotondare il risultato del calcolo, non correggere soltanto i numeri mostrati. Il danno conserva i decimali di rarità e modificatori intermedi; `Health.takeDamage` applica `floor(max(0, danno))` una sola volta, dopo bonus offensivi, esposizione, scudi/penetrazione o difesa. Poi limita la perdita agli HP interi rimasti. Lo stesso intero viene sottratto alla vita, emesso in `damage_dealt` e sommato nel report, senza overkill. Vale anche per danni periodici, contatto e urti. Non esiste un minimo artificiale di 1: sotto 1 il danno finale è 0.

Rimosso `Math.round` dal danno della rarità. Esempio: Dardo con set Raro, livello 1: `19 × 1,5 × 1,105 = 31,4925 → 31`; prima era `round(19 × 1,5) × 1,105 = 32,045`. Se il bersaglio è esposto, il +20% si applica prima del difetto (`37,791 → 37`). Colpo rosso contro 40 difesa: `100 × 100/140 → 71`. Blink con set Comune: `65 × 1,07 → 69`. I coefficienti non cambiano; cambia il punto e il verso dell’arrotondamento.

Vita corrente e massima intere (il massimo viene arrotondato per difetto dopo la somma dei bonus). Per preservare rigenerazione e furto vita, `Health.heal` accumula internamente le frazioni fino a maturare HP interi: 5 HP/s recuperano ancora 5 HP in un secondo a 60 Hz. Le frazioni non vengono accumulate a vita piena. Anche la guarigione effettiva del report è intera. Nessun nuovo formato di salvataggio o rete.

Verifica: 605 test, tipi e build; regressioni su difesa, rarità/potenza/vulnerabilità, scudo e penetrazione, DoT, overkill e cure a piccoli passi. La rimozione temporanea del difetto fa fallire il test della pipeline, poi viene ripristinata. Taratura di piccoli DoT che diventano 0 e conferma giocata restano aperte.

## Grafica: fasi 1–4 dello studio (ramo `feature/grafica-fasi`, da approvare)

Seguono la fase 0, con lo stesso vincolo: solo aspetto e chiarezza, nessun numero di bilanciamento toccato. Il compito e lo stato delle fasi sono in `docs/compito-grafica.md`.

- **Luce** (`presentation/lights.ts`).
    - Le luci si raccolgono mentre si disegna l'ambiente: torce, bracieri, crepe, rune, funghi, cristalli, porte aperte e premi.
    - Le figure aggiungono la loro: giocatori, boss, colpi, servitori luminosi.
    - La mappa, a mezza risoluzione, parte dal buio del tema (`ArenaTheme.ambient`) e si fonde in *soft-light* solo sul pavimento e sui muri. Figure, telegrafi e proiettili restano a piena luce: la leggibilità del combattimento non dipende dalla luce.
- **Muri a tre quarti** (`themes/wall.ts`).
    - Il muro in alto ha una faccia alta fin dove arrivano i piedi del giocatore, con il motivo del tema e un'ombra a bande.
    - La cima del muro in basso si ridisegna davanti alle figure.
    - I decori in rilievo si appendono alla faccia, lontano dalle porte (`faceSpots`).
- **Tracce dello scontro**: bruciature delle esplosioni e resti dei servitori. Al più 60, durano 26 s, solo disegno.
- **Minimappa e mappa della discesa**: N nasconde la minimappa, Tab tenuto mostra le tappe. Leggono la vista della stanza e della discesa: in cooperativa niente dati di rete in più.
- **Massicci** (`ArenaDefinition.solids`): rettangoli che fermano chiunque cammini e assorbono i proiettili di entrambe le squadre, come i pilastri.
    - Otto stanze nuove, due per dungeon. Cripta: Sala a gomito, Crocevia. Palude: Strettoia, Argini. Fucina: Crocevia delle colate, Magazzino. Ghiacciaio: Gola, Seracchi.
    - Le stanze di prima non cambiano.
    - Il disegno ha cima a lastre, bordo e faccia come il muro del tema.
    - La rete non cambia: l'id della stanza porta con sé la geometria.
- **Atmosfera della stanza** (`presentation/room-mood.ts`).
    - La grata dell'ingresso cala alle spalle 0,5 s dopo l'arrivo, con un rimbalzo e due sbuffi di polvere del tema.
    - Le grate delle uscite salgono in 0,9 s quando la stanza è libera, poi la luce si scalda in 1,6 s.
    - L'ultima tappa ha l'ambiente più scuro del 32% e un po' di vignettatura in più.
    - Legge solo la vista della stanza e il tempo reale.

### Decisioni da confermare con Jabbaz (fasi 1–4)

- **Movimento nelle stanze con i massicci.** Senza una regola, un servitore a terra dietro un blocco restava incastrato e un tiratore sparava contro la pietra. Proposta attuale, solo dove ci sono massicci:
    - chi cammina gira attorno al blocco da un angolo all'altro (`detourAround`);
    - chi spara aspetta di vedere il bersaglio;
    - chi tiene la distanza si sposta finché non lo vede;
    - le cariche vanno dritte e si fermano contro il blocco;
    - lo scatto del giocatore si ferma davanti al blocco, mentre i pilastri si attraversano come prima.
- **Tab per la mappa.** In partita il Tab apre la mappa e non sposta il focus; nei menu resta al browser.

## Vene di servitori (fase 7 dello studio sulla grafica, ramo `feature/grafica-fasi`, da approvare)

Tre «vene» di servitori per dungeon: la A è quella di sempre, la B e la C vengono dalle schede dello studio.

| Dungeon | Vena A | Vena B | Vena C |
| --- | --- | --- | --- |
| Cripta | Navata | Catacombe | Cantoria |
| Palude | Torbiera | Sommersi | Colonia |
| Fucina | Officina | Armeria | Miniera |
| Ghiacciaio | Scuola del Custode | Tana del gelo | Osservatorio |

Ogni vena ha folla, minacce, un pesante e un nido o un sostegno per l'Assedio. Fa eccezione la vena A della fucina: lì l'Assedio usa i pesanti, come prima.

- **Composizione** (`run/room-bestiary.ts`, `VEIN_BESTIARY`):
    - vita sulla scala della cripta, costo nel regista e prima tappa utile dalle schede;
    - valori provvisori.
- **Come si usano** (`run/veins.ts`):
    - ogni discesa estrae dal seme due vene fra quelle sbloccate, una d'ingresso e una profonda;
    - la d'ingresso vale fino alla tappa prima del luogotenente, la profonda dal luogotenente in poi;
    - la tappa prima del luogotenente ospita un tipo di folla o di minaccia della profonda, e la tappa dopo l'Assedio un tipo della d'ingresso;
    - il 3% degli Scontri dalla terza tappa è un'Incursione, cioè una stanza tutta della terza vena, con uno stendardo viola;
    - il Pellegrinaggio usa una vena per dungeon.
- **Sblocchi:**
    - la A sempre;
    - la B arrivando al luogotenente (tappa 4);
    - la C con la prima vittoria.

  Si leggono dai record delle discese che il gioco salva già: nessun salvataggio nuovo. La prima discesa usa solo la vena A, quindi le tarature di oggi restano valide.
- **Luogotenente:** con una vena profonda B o C è quello della vena (fase 8, `run/vein-lieutenants.ts`): otto luogotenenti nuovi, che in furia chiamano la folla della loro vena. Con la vena A resta quello di sempre.
- **Cooperativa:**
    - protocollo 8;
    - il server usa le vene sbloccate dal capo gruppo;
    - i servitori viaggiano per id e la grafica è nel codice, quindi i client non scaricano nulla.
- **Comportamenti nuovi** (`minions/minion-ai.ts`), tutti opzioni dei dati:
    - `shot.series`: altre raffiche dopo la prima, senza nuova posa, ruotate di `turn`;
    - `ring.mirror`: un secondo anello che ruota al contrario;
    - `arrivalRing` su carica, salto e scavatore;
    - `lob.shape`: `ring` (il centro resta libero), `cross` (dal centro verso fuori) e `cone` (ondate verso il bersaglio);
    - `aura.kind`: `haste` (intervalli ×0,7 per 3 s) e `repair` (+15% della vita ogni 5 s);
    - `ambush`: un segnale dietro il bersaglio, poi il servitore ricompare lì e morde a ventaglio;
    - `charge.bounces`: la carica riparte di sponda dai muri della stanza.

### Decisioni da confermare con Jabbaz (vene)

- **La struttura:** due vene per discesa, gli ospiti, l'Incursione al 3%.
- **Gli sblocchi:** la B al luogotenente, la C con la prima vittoria. In alternativa si possono legare alla progressione, che è sua.
- **I valori dei 55 servitori:** vita, danni, velocità, costi e tappe sono quelli delle schede, mai provati a mano.
- **Gli otto luogotenenti delle vene:** schemi e vita provvisori, sulla scala dei luogotenenti di sempre.

## Pozzi, ponti e ripari (fase 5 dello studio grafico, ramo `feature/grafica-fasi-2`, da approvare)

Regole nuove, proposte a Jabbaz: valgono solo in otto stanze nuove, due per dungeon, e le stanze di prima non cambiano. I valori sono in tabelle con nome e sono provvisori.

| Dungeon | Pozzi e ponti | Ripari |
| --- | --- | --- |
| Cripta | Crollo: un crollo da muro a muro con due passerelle di assi | Navata dei banchi: dodici panche |
| Palude | Acque profonde: una pozza nera tagliata da una passerella, due pozze contro i muri | Groviglio: sette grovigli di radici e due pozze |
| Fucina | Fiume di lava con due ponti di ferro | Deposito: sette file di casse attorno a una pozza di lava |
| Ghiacciaio | Crepacci: due crepacci con i ponti di neve alle estremità opposte | Blocchi di ghiaccio: sette blocchi attorno a una spaccatura |

- **Pozzi** (`ArenaDefinition.chasms`).
    - Chi cammina non ci entra: si ferma sul bordo, come contro un massiccio. Vale per giocatori, servitori a terra, corse del Guerriero e dell'Arciere, cariche.
    - Colpi, zone e servitori che volano ci passano sopra; il pozzo non sbarra la vista.
    - Lo scatto del Mago (un balzo) li supera se atterra sul pavimento. Se finirebbe dentro, si ferma sulla riva da cui parte. Le corse di Guerriero e Arciere sono a terra e si fermano sul bordo.
    - Salti, teletrasporti e uscite degli scavatori finiscono sempre sul pavimento.
    - Nessuno cade e nessuno prende danno: il pozzo è solo un ostacolo per chi cammina.
- **Ponti** (`ArenaDefinition.bridges`): sono il pavimento fra due tratti di pozzo, disegnato come un ponte. Larghi 128–160 unità.
- **Ripari** (`ArenaDefinition.covers`, `COVER_RULES` in `match.ts`).
    - Ognuno ha 160 punti di vita e ferma chi cammina e i colpi di entrambe le squadre. Ogni colpo che lo raggiunge gli toglie il suo danno.
    - A zero si rompe: non ferma più nulla e lascia schegge a terra.
    - È basso: non sbarra la vista. I tiratori quindi mirano anche a chi ci sta dietro e il riparo si consuma.
    - Non lo rompono i colpi ravvicinati, le zone e il morso del lupo: solo i proiettili.
- **Percorsi** (`arena/nav-field.ts`).
    - Nelle stanze con massicci, ripari o pozzi i servitori a terra seguono un campo di flusso: celle da 40 unità, uno per giocatore, ricalcolato ogni 6 passi.
    - Ogni servitore segue il campo del proprio bersaglio, anche quando lo provoca il Guerriero.
    - Così trovano i ponti anche quando il pozzo attraversa tutta la stanza, e non restano agli angoli delle panche.
    - Nelle stanze aperte nulla cambia.
- **Il lupo dell'Arciere** compare, aspetta e salta solo sul pavimento: non salta su un nemico che vola sopra un pozzo o un riparo.
- **Cooperativa:** protocollo 8. La vita dei ripari viaggia nell'istantanea solo quando cambia; pozzi e ponti arrivano con l'id della stanza.
- **Disegno** (`presentation/draw-hazards.ts`): pozzi a tile con ciò che ci si muove dentro (polvere, acqua nera, lava che illumina, nebbia), ponti con ringhiere, ripari che si incrinano sotto i due terzi della vita e si scheggiano sotto un terzo. Nella minimappa i pozzi sono neri, i ponti marroni, i ripari più chiari dei massicci.

### Decisioni da confermare con Jabbaz (fase 5)

- **Se volerle.** In alternativa le otto stanze si tolgono da `ROOM_TEMPLATES`: il resto del codice non cambia.
- **Cadere nei pozzi.** Oggi non si cade. Si potrebbe cadere con un danno e tornare sulla riva, come in Gungeon.
- **Lo scatto sopra i pozzi.** Oggi solo il Mago, perché il suo scatto è un salto. Le corse di Guerriero e Arciere si fermano sul bordo.
- **I ripari.** Da decidere la vita, se li rompono anche colpi ravvicinati e zone, e se la vista deve fermarsi.
- **Il numero di nemici.** Il regista non sa che una stanza con i pozzi ha meno pavimento. Lo studio proponeva di scalare budget e tetto sull'area calpestabile; è bilanciamento, quindi resta a Jabbaz.

## Tileset (fase 6 dello studio grafico, ramo `feature/grafica-fasi-2`, da approvare)

- **Fonti.** Tile CC0 di 0x72 (DungeonTileset II), Night Blade (Eman Quest) e Kevin's Mom's House (dungeon_, tundra_), scaricati con il sì dell'utente. Crediti in `art-credits.ts`, nel gioco e in `src/assets/art/tiles/LEGGIMI.md`.
- **Preparazione.** `tools/arte/prepara_tile.py` ricolora ogni tile con le rampe del tema. Nel gioco entrano solo i colori delle rampe, e i test li confrontano con i colpi nemici come gli altri colori a terra. Un foglio per dungeon, 3 KB ciascuno.
- **Scala.** Un tile da 16 pixel copre 32 unità: 2 unità per pixel, come le lastre della cripta.
- **Dove si usano:**
    - pavimenti di cripta, fucina e ghiacciaio, e la grana del fango della palude;
    - la faccia del muro della cripta;
    - la cima dei massicci;
    - pozzi, ponti e ripari.
- **Cosa resta nel codice:** luce, crepe di lava, riflessi, neve, funghi, nebbia e grate.
- **Cache del pavimento.** Tutti e quattro i temi tengono il pavimento fermo nella cache a tasselli (`FloorCache`); si ridipinge una volta sola quando arriva il foglio dei tile. Finché il foglio non è caricato, o senza browser nei test, si disegna come prima.

### Direzione VFX · 1 novembre 2026

PixelLab scelto dal proprietario per effetti e icone: guerriero oro/rame, mago colori elementali, arciere salvia con artigli cremisi. Particelle additive WebGL con fallback Canvas 2D. Resta aperta la taratura estetica di opacità/dimensioni nelle stanze affollate; nessuna variazione delle regole di combattimento. [Dettagli](vfx-pixellab.md).

### Revisione VFX Hi-bit · 3 novembre 2026

Richiesta del proprietario: più particelle, sangue dopo i colpi subiti, morte dei nemici animata, buff continui e sprite delle skill più incisivi. Nuovi atlanti raster locali nel codice per le sedici animazioni delle tre classi; nessuna generazione consumata. Sangue cremisi con gravità e macchie per creature/giocatori, schegge per ossa/costrutti, energia per spiriti; nessun sangue per un impatto senza danno. Morti dei servitori tramite sagoma esistente, lampo/cedimento/dissolvenza; le resurrezioni non duplicano il corpo. Buff, scatti e stati emettono dalla posizione autorevole attuale anche in cooperativa, con frequenza indipendente dagli FPS.

Budget estetico provvisorio: massimo 3.800 particelle complessive, 180 macchie e 48 morti animate. Raggi e settore del fendente continuano a provenire dalla simulazione; danni, ricariche, salvataggi e protocollo invariati. Direzione Reliquiario conservata. Restano aperte intensità e prestazioni con sciami/party, leggibilità nei quattro dungeon e qualità percepita: fotogrammi raster controllati, prova nel browser e conferma giocata ancora necessarie. [Valori, verifica e limiti](vfx-pixellab.md#revisione-hi-bit--incremento-locale-3-novembre-2026).

## Seconda taratura delle classi e impostazioni (incremento 0.5.1, 1 novembre 2026)

Decisione del proprietario dopo la prova giocata: primaria del Mago gratuita a ogni rarità; le spell restano a mana. Per compensare la minore mobilità rispetto all’Arciere, +35% danno diretto alle skill del Mago e +50% velocità ai proiettili. La durata in volo si divide per 1,5: la gittata resta invariata. Nessuna modifica al danno periodico elementale o alla mobilità innata. Arciere: ricarica base di entrambe le primarie moltiplicata per 1,15, compreso l’Arco di rovi. Rarità e bonus di frequenza continuano ad applicarsi dopo questa base.

Esempi Comuni livello 1 prima dei bonus: dardo 19 → 25,65 HP e 440 → 660 u/s; scettro 23 → 31,05 HP e 250 → 375 u/s; globo 100 → 135 HP e 310 → 465 u/s; meteora 210 → 283,5 HP; esplosione degli stivali 65 → 87,75 HP. Il danno effettivo continua a essere arrotondato per difetto solo alla fine dei modificatori. Arco del cacciatore: 0,16 → 0,184 s base (set Comune: circa 0,1333 → 0,1533 s); Arco di rovi: 0,5 → 0,575 s base. Valori provvisori, da confermare giocando.

Invulnerabilità dopo il danno: 0,65 → 0 s. Colpi multipli nello stesso passo e contatto continuato possono ferire consecutivamente. Restano scatti, teletrasporti e parata difensiva: rimuovere gli i-frame dopo il danno non cancella le protezioni delle skill. Attenzione di taratura ancora aperta: la permanenza a contatto è molto più punitiva, perché il danno può applicarsi a ogni passo fisso.

Boss finali, singolo ed entrambe le fasi: Cripta 1.800 → 5.400 HP; Palude 2.400 → 7.200 HP; Fucina 3.000 → 9.000 HP; Ghiacciaio 3.600 → 10.800 HP. In cooperativa si applica il moltiplicatore `1 + 0,5 × (membri − 1)`. Il controllo ha rilevato che prima il fattore era applicato solo ai luogotenenti: ripristinato anche per boss finali e servitori. Nessun doppio aumento ai luogotenenti; replica con gli HP esatti del server.

Pannello Impostazioni con ingranaggio e schede Associazione tasti / Audio. Le quattro skill sono rimappabili a tasti fisici o pulsanti del mouse supportati; i comandi fissi restano riservati, i doppioni tra skill vengono scambiati. Salvataggio locale separato dai personaggi, ripristino predefiniti e etichette coerenti in HUD/inventario. Il pannello sospende l’input di combattimento mentre si catturano i tasti; in singolo mette in pausa, in cooperativa il mondo continua. Crediti esistenti conservati nella scheda Audio. Lingua e altre schede generiche rimandate.

### Riduzione moderata del recupero MP · 2 novembre 2026

Dopo la prova giocata il proprietario giudica le classi più equilibrate, ma segnala assenza di pressione sul mana. Ridotto uniformemente del 20% il recupero: Guerriero innato 5 → 4, Arciere 6 → 4,8, Mago 10 → 8 MP/s. I bonus passivi delle skill e quelli del profilo equipaggiamento del Mago scendono nello stesso rapporto; coefficiente del recupero aggiuntivo da rarità 8 → 6,4. Formula invariata, soltanto coefficiente ridotto: `(1 / moltiplicatoreRicarica − 1) × 6,4 + bonusSkill`. In questo modo anche l’intero set Leggendario conserva la riduzione del 20%, senza recuperare indirettamente tutto il mana attraverso la rarità.

Set Comuni livello 1: Guerriero 6,7 → 5,36 MP/s; Arciere 8 → 6,4; Mago 15,1 → 12,08. Costi delle spell, mana massimo e primarie gratuite invariati. Valori provvisori: nuova prova giocata necessaria, soprattutto tra set Comune e Leggendario e durante uso continuo delle spell.


## Progressione dei mob e rifugio · incremento locale 2 novembre 2026

Decisione del proprietario: i mob assegnano XP e hanno il **70%** di possibilità di lasciare oro a terra. Raccolta automatica entro 30 unità, anche durante il combattimento. Valori provvisori per mob (incluso il luogotenente): T1 4 XP / 3 oro, T2 7 XP / 6 oro, T3 10 XP / 9 oro, T4 14 XP / 12 oro. Le autoesplosioni e la rimozione dei servitori non assegnano premi. Il bottino e gli XP dei boss restano aggiuntivi e invariati. In cooperativa ogni membro ottiene XP interi e raccoglie una quota personale da ciascun mucchio; nessun doppione da snapshot ripetuti.

L’oro appartiene alla raccolta dei profili del browser, non al personaggio: resta dopo sconfitte, cambi e rimozioni dei profili. Non è un account cloud. XP e oro raccolti si salvano durante la run. Il permadeath rimane futuro: per ora la sconfitta continua a conservare anche il personaggio e gli oggetti.

Ogni livello dopo il primo concede **+3 HP massimi, +2 MP massimi, +1 difesa, +1 punto percentuale al moltiplicatore di attacco**. Nessuna cura o ricarica automatica al level-up. Curva XP esistente invariata. Il profilo in partita mostra statistiche a sinistra, ritratto equipaggiato al centro, nove caselle a destra (pagine da nove per gli zaini storici più grandi, nessuna perdita o limite retroattivo). In singolo apre la pausa; in cooperativa il mondo continua.

Il rifugio si apre dal menu: WASD per muoversi, **E per interagire** nelle vicinanze. **Scatto predefinito: E → Spazio**; migrazione della vecchia preferenza su E, preservate le altre associazioni valide. Portale animato verso la scelta raid, deposito personale, forgia, fabbro umanoide con incudine e mercante. Riuso delle immagini esistenti, nessuna rigenerazione.

Servizi provvisori: mercante 30 oro per pezzo Comune di classe; forgia 120 oro per creare un pezzo Non comune delle quattro famiglie iniziali di classe, senza materiali in questo incremento. Fabbro: costo 60 × prossimo grado in oro, da +0 a +5; ogni grado aggiunge il 5% delle statistiche passive originali dell’oggetto e +2 punti percentuali al moltiplicatore di attacco. Non cambia la rarità né la scalatura storica del livello oggetto/GS. Deposito personale, nessun oggetto equipaggiato trasferibile: identità e migliorie conservate. Eventuale deposito condiviso, materiali/ricette, bilanciamento e destino degli oggetti depositati col permadeath restano punti aperti.

Salvataggio **v8**, migrazione dei roster v6/v7 e dei personaggi storici; oro di partenza 0. Protocollo cooperativo **9**: riavviare il server e ricaricare tutti i client. Nessun commit o push in questo incremento. Controllo visivo non completato: timeout del browser integrato su localhost e Computer Use interrotto perché non riesce a verificare l’URL di Opera. Nessuna conferma giocata.


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


## Hub condiviso e scambi · incremento locale 2 novembre 2026

La finestra Party è disponibile anche nel rifugio. Il link della stanza porta nell’hub del creatore come visitatore; avvicinandosi a un giocatore, E apre Mostra profilo, Scambia e Invita al party (se non è già membro). L’invito richiede accettazione. Limiti provvisori regolabili: otto presenze nel rifugio, quattro membri del party. Dal portale il leader sceglie dungeon e modalità e avvia insieme tutti i membri, con i requisiti GS esistenti; i visitatori restano nel rifugio e possono continuare a usare i servizi. Deposito, oro e personaggio rimangono personali. Se il leader esce, la guida passa a un membro rimasto o al primo visitatore.

Lo scambio mostra il proprio zaino selezionabile e l’offerta dell’altro giocatore, con sprite degli oggetti. Sono ammessi oggetti non equipaggiati nello zaino, fino a 40 per offerta (limite provvisorio). Ogni modifica azzera entrambe le conferme; entrambi devono confermare l’offerta corrente e accettare la conferma finale. Prima della registrazione, annullare o disconnettersi lascia gli oggetti invariati. Durante il completamento le modifiche al personaggio sono bloccate.

Il server registra prima i trasferimenti pendenti in `.tools/trade-ledger.json` (percorso configurabile con `TRADE_LEDGER_PATH`); conservare questo file ai riavvii. Il browser salva il trasferimento e una ricevuta nella stessa raccolta locale, poi conferma al server. Le consegne pendenti vengono riproposte alla riconnessione della medesima identità browser/profilo, senza duplicare gli oggetti già ricevuti. Stanze e partite rimangono non persistenti; questa identità locale non è un account cloud o un sistema anti-manomissione. Cambiare origine del browser o cancellare i dati locali non recupera il profilo.

Salvataggi v10 con migrazione dei formati precedenti e inventari v10 legittimamente vuoti preservati; protocollo cooperativo 11: riavviare il server e ricaricare tutti i client dopo l’aggiornamento. Nessun nuovo bilanciamento di combattimento.

Controllo browser automatico con due origini separate: ingresso come visitatore, invito e accettazione, profilo remoto, scambio Spada/Bastone con doppia conferma, deposito privato e partenza simultanea in Cripta anche con deposito aperto sul secondo client. Non è una conferma manuale dell’utente. Da provare manualmente: fluidità e leggibilità con più persone, rete pubblica e schermi piccoli.


### Correzioni party, inviti e profili · 2 novembre 2026

Il widget del party si riallinea anche dalla presenza autorevole periodica nell’hub dopo l’accettazione dell’invito. Il link della stanza apre una visita all’hub; l’invito tramite E e la sua accettazione aggiungono il visitatore ai quattro membri del party. Inviti condivisibili solo con URL pubblico HTTPS, mai localhost/LAN: `npm.cmd run tunnel` registra il tunnel Cloudflare corrente per la porta del server. Restano supportati `PUBLIC_URL` e il riconoscimento dell’accesso tramite Cloudflare. Senza indirizzo pubblico noto, Copia invito è disabilitato invece di copiare un link locale.

Scambia invia prima una richiesta: «Accetti lo scambio da X?» con Sì/No. Solo il destinatario può accettare; prima del consenso il server rifiuta offerte e conferme, e nessun inventario di scambio viene aperto. No, chiusura o disconnessione annullano la richiesta. La doppia conferma finale resta necessaria. Mostra profilo visualizza statistiche, ritratto ed equipaggiamento indossato, senza zaino o deposito. Protocollo 12; riavvio server e ricarica client richiesti.

Controllo browser automatico con un client locale e uno tramite tunnel Cloudflare reale: link pubblico dal leader locale, due membri nel widget dopo accettazione, profilo senza zaino, No che annulla la richiesta e Sì che apre le offerte su entrambi i client. Conferma manuale dell’utente ancora da ricevere.


### Sessione cooperativa e party indipendenti · modifica locale 2 novembre 2026
L’icona Party accanto allo zaino apre un riquadro con membri e comandi; rimossa la finestra separata con destinazione, modalità, boss e avvio. La destinazione si sceglie dal portale. Nel riquadro: Pronto verde (con stato selezionato), Lascia il party rosso, Copia invito HUB e Torna in singolo. Crea party apre una sessione condivisa; il link invita a visitare l’HUB del creatore, senza aggiungere automaticamente al gruppo di raid. L’invito al gruppo resta tramite E e accettazione.

La proprietà dell’HUB è distinta dalla guida del party. Lascia il party rimuove solo dal gruppo e dall’eventuale raid, conservando connessione, personaggio, deposito e posizione nell’HUB; se serve la guida passa al membro successivo. Se il gruppo è vuoto si può ricrearlo nella stessa sessione. Torna in singolo disconnette dalla sessione condivisa. Menu e run locali mantengono la connessione: durante l’assenza lo sprite non è visibile né interagibile nell’HUB e la prontezza viene tolta. Il proprietario può restare al menu o in una run singola e gli ospiti continuano a usare l’istanza. Il gruppo di un solo membro e gli ospiti fuori dal gruppo possono avviare una run locale; un gruppo di più membri parte insieme dal portale del leader quando gli altri sono pronti e presenti. I requisiti di accesso dei personaggi restano validi. Nel raid cooperativo, tornare al menu abbandona il raid/gruppo ma conserva la sessione.

Resta un solo gruppo di raid per istanza in questo incremento; più gruppi asincroni nella medesima istanza sono futuri. L’istanza vive finché almeno una connessione rimane attiva, non oltre lo spegnimento del server o l’uscita di tutti. Depositi e progressi restano personali e locali al browser. Protocollo 13: riavviare il server e ricaricare tutti i client. Nessun cambiamento ai salvataggi o al bilanciamento.

Controllo browser automatico: icona accanto allo zaino, comandi nel riquadro senza selettori dungeon, colori verde/rosso, uscita dal gruppo conservando l’HUB, menu e run singola con rientro nella stessa sessione, ricreazione del gruppo, invito/prontezza e partenza in Cripta di due membri dal portale. Prova manuale dell’utente e resa mobile ancora da confermare.


### Cadenza dei danni nemici · 2 novembre 2026
Il contatto non è più danno a ogni passo: intervallo provvisorio 0,8 s fra tentativi della stessa coppia mob/giocatore, 1 s per boss e luogotenenti. Definizioni configurabili con `contactInterval`; cadenza condivisa fra contatto e carica del boss. Un tentativo parato/schivato consuma il recupero del nemico. Altri attaccanti, proiettili e zone rimangono indipendenti: nessuna invulnerabilità automatica. Uscire e rientrare dal contatto non azzera il timer.
Ogni orb viene consumato al primo impatto, anche contro parata/invulnerabilità da skill. Ora si considera tutto il segmento percorso nel passo e il primo corpo vivo lungo la traiettoria, evitando attraversamenti e impatti scelti dall’ordine del party. Danno per colpo, difesa e periodicità delle zone invariati. Stato autorevole sul server, nessun nuovo campo nel protocollo.


### Barra HUD permanente · 2 novembre 2026
Dopo il menu iniziale, contatore oro automatico fisso a sinistra e comandi fissi a destra in ordine zaino, party, impostazioni, fullscreen a icona. Il party non mette in pausa; party e impostazioni si chiudono reciprocamente. Il menu principale è raggiungibile dalle impostazioni. Nessuna modifica a premi o raccolta.


### Menu e Bestiario · 2 novembre 2026
Menu iniziale senza zaino e Bestiario. Ogni card dungeon affianca Bestiario a Loot rate %: mostra solo i servitori e luogotenenti di quel dungeon già abbattuti almeno una volta; messaggio esplicito se nessuno è scoperto. La chiusura torna ai dungeon.


### Audio delle anteprime · 2 novembre 2026
Le anteprime dei dungeon sono solo visive: nessun caricamento di musica o ambiente specifico durante hover/focus. Queste tracce partono entrando nel dungeon; i menu mantengono la propria musica.


### Accesso dungeon nella UI · 2 novembre 2026
Le card senza GS sufficiente sono opacizzate. Discesa conserva il nome e aria-disabled; il tentativo con mouse, tocco o tastiera mostra per 2 secondi «Punteggio gear score non sufficiente, gear score richiesto X.» in rosso e Silkscreen. Non avvia la partita. Soglie 100/200 GS invariate. Duello usa lo stile Reliquiario; X chiude la scelta e torna all’HUB. Verifica visiva e prova manuale ancora da confermare.

### Etichette XP e HUB rosso · 3 novembre 2026

Richiesta del proprietario: `+N XP` in Silkscreen sopra ogni mob/luogotenente che assegna esperienza, con quantità effettiva e solo il proprio premio in cooperativa. Tarature XP invariate; nessun premio aggiuntivo per autoesplosioni, rimozioni o resurrezioni. Il boss finale conserva il riepilogo già previsto. Etichette a 8 pixel interni, 1,2 s di durata e contorno scuro.

HUB nella palette carbone, cenere, ferro e rosso fuoco ispirata all’immagine fornita: vetrate e tendaggi cremisi, strutture e tetti scuri, luci rosse. Portale Hi-bit con arco a sesto acuto definito, rune, bracieri e vortice rosso verso un centro nero; 32 frame a 16 FPS. Nessuna risorsa generata/importata, revisione dei personaggi o modifica a collisioni/servizi. [Valori, verifiche e conferma giocata ancora necessaria](hub-rosso-xp.md).

### Ricompense e compagno · revisione 3 novembre 2026

Indicazione esplicita del proprietario: XP **sopra il personaggio**, con ancoraggio alla sua posizione durante il movimento. Oro non più a terra: emissione dal corpo del nemico, attrazione dopo 0,5 s e volo provvisorio di 0,4 s, poi accredito autorevole per ciascun destinatario vivo. Requisito 30 unità di prossimità → nessuna distanza richiesta; probabilità 70% e quantità T1/T2/T3/T4 3/6/9/12 invariate. Consegne in viaggio chiuse al cambio stanza, senza doppioni né nuovi premi per KO/autoesplosioni/despawn. Protocollo 13 → 14, salvataggi invariati.

Lupo: corretta la mancata acquisizione con bersaglio nullo. Caccia autonoma nel raggio provvisorio di 480 unità; marchio e preda precedente prioritari, salto dopo l’uccisione ancora 180 unità. Danno, cadenza, durata e movimento su ostacoli invariati. Prototipi A/B/C del personaggio, maschile/femminile per tre classi, autorizzati solo come anteprima separata; scelta e integrazione da fare. [Specifiche e verifiche](ricompense-lupo-prototipi.md).


### Scelta sprite C e modularità · decisione 3 novembre 2026

L’utente sceglie **C · Cacciatore d’ombre** nelle due versioni e autorizza l’uso nel gioco, correggendo la camminata inversa. Corpo carbone/cuoio/cenere, sciarpa e spallaccio asimmetrico; i tre profili di classe mantengono tratti propri. Ogni pezzo equipaggiato cambia visibilmente il personaggio: i 25 id e slot esistenti restano stabili, con armi e secondarie ridisegnate, scudo e faretra coerenti con le classi attuali, armature adattate al busto e stivali ai piedi articolati. Per ogni classe/slot, le famiglie condividono gesto e presa; varia il disegno dell’oggetto. Rimuovere il pezzo mostra la base, senza armi fittizie. Le icone Hi-bit 32×32 derivano dagli stessi disegni indossati.

Cammino a dodici frame con piede sollevato in avanzamento e appoggio in arretramento. La mira continua a scegliere il lato; indietreggiare inverte solo il ciclo estetico. Tarature estetiche provvisorie: corpo 48 px, frame 64×64 con margine 8 px, 14 FPS di cammino, posa visiva di attacco **0,16 → 0,30 s**, cache **256 → 512 frame**. Non cambia alcun tempo/danno di combattimento, equipaggiamento, ricompensa, salvataggio o protocollo. Ritratti illustrati ancora secondo la direzione precedente; la richiesta riguarda gli sprite. Conferma giocata di ritmo, prese e leggibilità da ricevere. [Specifica](sprite-c-equipaggiamento.md).


### Primarie senza particelle e testi premio · 3 novembre 2026

Decisione esplicita: rimuovere soltanto particelle di lancio e scia delle primarie delle tre classi; conservare gli altri effetti. Fendente, freccia e dardi elementali ricevono animazioni Hi-bit locali; onda visiva di 0,24 s attorno all’Arciere durante il tiro. Nessun cambiamento a danno, settore, hitbox, gittata o cadenza. XP 8 → 16 px, distanza righe 12 → 24 unità, stesso Silkscreen; nuovo testo +N oro da 16 px all’accredito effettivo, sopra il destinatario. Regole economiche, salvataggio v10 e protocollo 14 invariati. Nuovi interventi grafici vincolati allo stile Hi-bit e alla palette cupa con accenti elementali: requisito in AGENTS.md/CLAUDE.md. [Dettagli e verifiche](attacchi-base-hi-bit.md).
