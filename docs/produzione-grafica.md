# Produzione grafica: inventario e piano

> **Aggiornamento del 5 novembre 2026:** gli script e i prompt citati sotto (`tools/arte/...`) non sono più nel repository: vedi README · Strumenti esterni.
>
> **Sempre il 5 novembre:** su richiesta dell'utente sono stati tolti i confronti `?mob=classici`, `?boss=classici`, `?tile=classici` e `?vista=classica`, i fogli dei boss e i tile di terzi: la grafica del generatore locale e l'isometria sono l'unica versione nel gioco. Le righe sotto che citano quei confronti descrivono lo stato del 4 novembre.

Stato al 4 novembre 2026. Ramo `feature/produzione-grafica`, sopra `feature/mob-ai-locale` (PR 15, aperta), versione v0.11.05, sopra main 0.11.3. Tutto quello che segue e' una proposta: regole, nomi e valori di gioco restano quelli di oggi.

La grafica nuova nasce dal generatore locale (SDXL 1.0 e Pixel Art XL), quindi e' fatta con l'IA. Il proprietario non si e' ancora espresso: la PR 15 aspetta il suo si'. Se dice no, tutto questo va tolto. Per tornare indietro in ogni momento: `?mob=classici`, `?boss=classici`, `?tile=classici`.

**Le scelte sono state fatte senza il giudizio dell'utente**, che era fuori casa e ha chiesto di finire tutto subito. Vanno riviste, a partire dalla colonna Stato.

## Il riassunto dello stato

| Gruppo | Quanti | Fatti | Stato |
| --- | --- | --- | --- |
| Boss | 4 | 4 | Disegni della PR 15, fogli rifatti con la riduzione nuova e le armi intere |
| Mini boss (luogotenenti) | 12 | 12 | Come i boss; Caposquadra e Regina con disegni nuovi |
| Mob | 88 | 88 | Nel ramo, tutti in gioco. Ricontrollati due volte a x6 da revisori indipendenti; 36 rifatti |
| Mappe dei dungeon | 4 | 4 | Rifatte a 1 pixel per unita': superfici, facciate gotiche, portali, colonne, arredi, ponti. Attive; le vecchie con `?tile=classici` |
| Rifugio | 1 | 0 | Non toccato: su main e' ora l'illustrazione del menu resa giocabile (PR 14) |

## Cosa accetta il motore

Ricavato dal codice. Dove il brief chiede piu' del motore, vale il motore, come il brief stesso prevede.

| Tema | Come funziona | Dove | Conseguenza |
| --- | --- | --- | --- |
| Viste dei mob | Una sola vista. **Nuovo:** chi e' disegnato di profilo si specchia secondo il verso di marcia | `draw-actors.ts`, `drawMinion` | Niente viste da dietro. Solo aspetto |
| Viste di boss e mini boss | Una vista, specchiata verso il giocatore | `drawSheetBoss` | Una vista basta |
| Fotogrammi dei mob | **Nuovo:** 4 fotogrammi invece di 2 | `minion-art/minion-art.ts` | Solo aspetto |
| Scala | Personaggio, boss e mob nuovi: 1 pixel = 1 unita' | `CHARACTER_ART`, `boss-ia-layout.ts` | Stesso ingombro di oggi, con la tolleranza data dal disegno |
| Danno | Lampo bianco nel codice | `drawMinion`, `drawSheetBoss` | Nessun fotogramma di danno da disegnare |
| Sconfitta dei mob | Il primo fotogramma si piega e svanisce; **nuovo:** in cache | `vfx/combat-vfx.ts` | Nessun fotogramma da disegnare |
| Sconfitta dei boss | Riga `death` del foglio, poi macerie | `boss-sheet.ts` | Prodotta |
| Mob addormentati, gelati, colpiti | Tavolozza sostituita nel codice | `stonePalette`, `frostPalette` | Tavolozza ordinata dal colore piu' scuro |
| Bordo chiaro | Il gioco lo aggiunge attorno a ogni figura | `theme.silhouette` | Il contorno scuro resta nel disegno |
| Tile | **Nuovo:** 32 pixel a 32 unita', superfici che ripetono davvero, scelte dalla posizione nel mondo | `themes/tiles.ts` | Stessa densita' delle figure. Con `?tile=classici` tornano 16 pixel a 32 unita' |
| Colori a terra | Devono stare in `groundColors`, confrontati con i colpi nemici | `tiles.test.ts`, `presentation.test.ts` | Le stesse rampe con i colori intermedi, piu' tappeto, acqua e accenti: il test dei colpi passa |
| Muro in alto | **Nuovo:** facciata gotica di moduli e lesene. La camera non ha limiti, quindi sale oltre il bordo della stanza | `themes/scenery.ts`, `wall.ts` | L'ingombro di gioco non cambia: la base sta dove arrivano i piedi |
| Pilastri | **Nuovo:** colonne, statue, forni, cristalli al posto delle forme nel codice. Chi passa dietro finisce davvero dietro | `scenery.ts`, `scene-renderer.ts` | Il cerchio di collisione non cambia |
| Porte | **Nuovo:** portale gotico, grata e luce nel vano ricavato dal disegno | `draw-room.ts` | Soglia di gioco invariata |
| Pozzi e ponti | **Nuovo:** fondo che ripete, orlo a nove pezzi, assi, corrimano e pali | `draw-hazards.ts` | Rettangoli di gioco invariati |

## Assunzioni

- **Nessuna immagine di riferimento ricevuta.** Il brief ne cita di allegate, ma non sono arrivate. Si e' lavorato su palette e materiali descritti e sulla grafica del menu e del rifugio.
- **Famiglia** = una vena di un dungeon: e' il raggruppamento che il gioco usa gia'.
- **Mini boss** = luogotenente, come nel codice.
- **Stesso ingombro** dello sprite a mano, adattato alle proporzioni del disegno: serve a non cambiare come si legge il raggio di colpo.
- **Tile che ripetono:** un nodo locale per ComfyUI, scritto qui e non scaricato (`custom_nodes/tile_circolare.py`, padding circolare), fa combaciare i bordi delle immagini. Orli e ringhiere li compone lo script.
- **Gotico per dungeon:** Cripta in ardesia e cremisi; Palude come chiesa sommersa, con muschio e radici; Fucina come fonderia-cattedrale in basalto e ferro; Ghiacciaio come cattedrale ghiacciata.

## Lacune

- **Pose:** ogni figura ha un solo disegno, da cui vengono tutte le animazioni. Il brief chiede pose dedicate: il modello non sa ridisegnare la stessa figura in un'altra posa. Attacchi dedicati dei mob non esistono nel motore.
- **Mastro d'incudine:** il modello non disegna l'incudine in spalla, nemmeno con un prompt apposta (provati 4 candidati, escono pentole). Resta il disegno della PR 15, con il martello.
- **Oggetti che il modello non capisce:** mantice, rastrelliera, palla chiodata e stallo del coro sono i piu' lontani dalla descrizione. Segnati nella colonna Stato.
- **Rifugio:** dopo la PR 14 e' l'illustrazione del menu resa giocabile. Il selciato di prova fatto qui non arrivava piu' allo schermo: e' stato tolto nel rebase.
- **Fondo dei pozzi:** ripete ogni 128 unita'; nella lava il motivo si vede un po'.

## Decisioni per il proprietario

1. Se accettare grafica generata sui nemici e sulle mappe. Da qui dipende tutto il resto.
2. Se bastano animazioni ricavate da un solo disegno.
3. Il verso di marcia: i mob di profilo si specchiano. E' una modifica di disegno, in `drawMinion`, non coperta da test unitari: provata in partita.
4. La densita' delle mappe: tutto a 1 pixel per unita'. I fogli delle mappe passano da 12 KB a circa 1,2 MB in tutto.
5. Il tappeto cremisi della Cripta e il muro che sale oltre il bordo della stanza: scelte d'atmosfera, si possono togliere.
6. Il peso: `generated-sprites.ts` passa a circa 400 KB di testo.

## Metodo seguito

1. Candidati dal generatore: 4 per mob, poi altri 8 o piu' con prompt attenti all'anatomia per chi non ne aveva uno buono.
2. Misure automatiche e scelta a occhio, famiglia per famiglia, su fondo neutro e sul pavimento.
3. Strisce dei quattro fotogrammi controllate a occhio.
4. Prova nel gioco vero: schieramento per dungeon, 111 mob a schermo, verso di marcia, fase II del boss, stanze con pozzi e ponti, rifugio.
5. Tre giri di revisione indipendente su immagini e codice, con i fogli ingranditi x6.
6. Partite automatiche: un giocatore finto attraversa le discese intere, cercando eccezioni e posizioni non valide.

## Boss e mini boss

| Dungeon | Boss | Foglio |
| --- | --- | --- |
| Cripta | Guardiano della cripta | PR 15 |
| Palude spenta | Madre delle spore | PR 15 |
| Fucina in rovina | Colosso della fornace | PR 15 |
| Ghiacciaio eterno | Custode del ghiaccio | PR 15 |

| Dungeon | Vena | Mini boss | Id grafica | Raggio | Stato |
| --- | --- | --- | --- | --- | --- |
| Cripta | Navata | Doccione del campanile | `belfry_gargoyle` | 22 | PR 15 |
| Cripta | Catacombe | Gran becchino | `grand_gravedigger` | 24 | PR 15 |
| Cripta | Cantoria | Maestro dell'organo | `organ_master` | 22 | PR 15 |
| Palude spenta | Torbiera | Rospo re | `toad_king` | 28 | PR 15 |
| Palude spenta | Sommersi | Lavandaia maggiore | `elder_washer` | 24 | PR 15 |
| Palude spenta | Colonia | Regina della colonia | `colony_queen` | 28 | Rifatto in questo ramo |
| Fucina in rovina | Officina | Mastro d'incudine | `anvil_master` | 30 | PR 15 |
| Fucina in rovina | Armeria | Campione vuoto | `hollow_champion` | 28 | PR 15 |
| Fucina in rovina | Miniera | Caposquadra di ferro | `iron_foreman` | 30 | Rifatto in questo ramo |
| Ghiacciaio eterno | Scuola del Custode | Prima allieva | `first_apprentice` | 20 | PR 15 |
| Ghiacciaio eterno | Tana del gelo | Orsa madre | `mother_bear` | 30 | PR 15 |
| Ghiacciaio eterno | Osservatorio | Astronomo | `astronomer` | 22 | PR 15 |

## Mob, per dungeon e vena

### Cripta

**Navata** (8)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Fuoco fatuo di brace | `crypt_wisp` | Kamikaze | kamikaze | 10 | 24x24 | fatto |
| Cero vivo | `crypt_candle` | Torretta | turret | 8 | 24x36 | fatto |
| Pipistrello del campanile | `crypt_bat` | Folla volante | flyer | 7 | 33x18 | fatto |
| Ossario | `crypt_skeleton` | Folla | chaser | 9 | 24x33 | fatto |
| Doccione | `crypt_gargoyle` | Dormiente | charger | 11 | 36x30 | fatto |
| Accolito turiferario | `crypt_acolyte` | Tiratore | shooter | 9 | 30x36 | fatto |
| Campana del vespro | `crypt_bell` | Pesante | turret | 14 | 36x36 | fatto |
| Reliquiario | `crypt_reliquary` | Nido | nest | 15 | 36x30 | fatto |

**Catacombe** (7)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Teschio saltellante | `crypt_skull` | Folla | leaper | 7 | 21x21 | fatto |
| Ratto dei loculi | `crypt_rat` | Folla | chaser | 6 | 27x15 | fatto |
| Becchino | `crypt_gravedigger` | Scavatore | burrower | 11 | 30x33 | fatto |
| Lanterna cimiteriale | `crypt_lantern` | Torretta | turret | 9 | 18x30 | fatto |
| Prefica velata | `crypt_mourner` | Tiratore | shooter | 9 | 27x36 | fatto; da rivedere: sagoma a punta, senza volto |
| Colosso d'ossa | `crypt_bone_colossus` | Pesante | charger | 16 | 36x36 | fatto |
| Fossa comune | `crypt_mass_grave` | Nido | nest | 16 | 42x30 | fatto |

**Cantoria** (7)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Corista spettrale | `crypt_choir_ghost` | Folla | chaser | 8 | 21x27 | fatto |
| Salterio volante | `crypt_psalter` | Folla volante | flyer | 7 | 27x18 | fatto |
| Canna d'organo | `crypt_organ_pipe` | Torretta | turret | 10 | 18x42 | fatto; da rivedere: piedistallo sottile |
| Cantore del vespro | `crypt_cantor` | Tiratore | shooter | 9 | 27x36 | fatto |
| Maestro di cappella | `crypt_chapel_master` | Sostegno | support | 9 | 27x36 | fatto |
| Aquila del leggio | `crypt_eagle` | Pesante | leaper | 15 | 42x36 | fatto |
| Stallo del coro | `crypt_choir_stall` | Nido | nest | 16 | 42x30 | fatto; da rivedere: sembra un banco |

### Palude spenta

**Torbiera** (8)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Sporello | `swamp_sporeling` | Folla | chaser | 11 | 24x24 | fatto |
| Vescia | `swamp_puffball` | Kamikaze | kamikaze | 10 | 30x27 | fatto |
| Zanzara di torbiera | `swamp_gnat` | Folla volante | flyer | 6 | 21x15 | fatto |
| Rospo di torbiera | `swamp_toad` | Saltatore | leaper | 12 | 36x24 | fatto |
| Fiore sputaveleno | `swamp_flower` | Artiglieria | turret | 11 | 33x36 | fatto |
| Verme delle radici | `swamp_worm` | Scavatore | burrower | 12 | 27x30 | fatto |
| Lumaca di muschio | `swamp_snail` | Pesante | chaser | 15 | 42x30 | fatto |
| Cerchio delle fate | `swamp_fairy_ring` | Nido | nest | 16 | 42x27 | fatto |

**Sommersi** (8)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Sanguisuga | `swamp_leech` | Folla | chaser | 6 | 24x12 | fatto; da rivedere: scuro, si stacca solo col bordo chiaro |
| Annegato | `swamp_drowned` | Folla | chaser | 10 | 24x33 | fatto |
| Luccio delle acque nere | `swamp_pike` | Caricatore | charger | 12 | 42x18 | fatto |
| Ninfea carnivora | `swamp_lily` | Torretta | turret | 11 | 36x24 | fatto |
| Lavandaia della notte | `swamp_washer` | Artiglieria | shooter | 9 | 27x36 | fatto |
| Annegato gonfio | `swamp_bloated` | Pesante | kamikaze | 16 | 39x39 | fatto |
| Ovatura | `swamp_spawn` | Nido | nest | 15 | 36x30 | fatto; da rivedere: piu' cespuglio che uova |
| Girino | `swamp_tadpole` | Folla | chaser | 6 | 18x12 | fatto; da rivedere: poco dettaglio |

**Colonia** (7)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Formica infestata | `swamp_ant` | Folla | chaser | 7 | 24x18 | fatto |
| Falena delle spore | `swamp_moth` | Folla volante | flyer | 7 | 27x18 | fatto |
| Scarabeo bombardiere | `swamp_beetle` | Artiglieria | shooter | 10 | 30x24 | fatto |
| Ragno tessitore | `swamp_spider` | Tiratore | shooter | 10 | 30x27 | fatto |
| Cicala marcia | `swamp_cicada` | Orbitante | orbiter | 8 | 27x21 | fatto |
| Cervo infestato | `swamp_stag` | Pesante | charger | 16 | 42x39 | fatto |
| Formicaio | `swamp_anthill` | Nido | nest | 16 | 42x27 | fatto |

### Fucina in rovina

**Officina** (9)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Folletto di scoria | `forge_imp` | Kamikaze | kamikaze | 9 | 24x24 | fatto |
| Scintilla | `forge_spark` | Folla volante | flyer | 6 | 18x18 | fatto |
| Sassolino di scoria | `forge_pebble` | Folla | chaser | 8 | 24x21 | fatto |
| Mantice vivo | `forge_bellows` | Torretta | turret | 13 | 36x30 | fatto; da rivedere: sacco vivo, il modello non sa fare un mantice |
| Diavoletto della forgia | `forge_devil` | Tiratore | shooter | 9 | 30x33 | fatto |
| Incudine animata | `forge_anvil` | Pesante | chaser | 16 | 42x33 | fatto; scelta dell'utente: il demone, senza incudine |
| Colata | `forge_slag` | Scissione | chaser | 13 | 36x27 | fatto |
| Goccia fusa | `forge_droplet` | Folla | chaser | 7 | 18x15 | fatto |
| Crogiolo | `forge_crucible` | Pesante | turret | 15 | 36x36 | fatto |

**Armeria** (7)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Lama volante | `forge_blade` | Folla volante | chaser | 7 | 27x9 | fatto |
| Paggio di latta | `forge_page` | Folla | chaser | 8 | 24x30 | fatto |
| Balestra a ripetizione | `forge_crossbow` | Torretta | turret | 11 | 33x24 | fatto |
| Mazzafrusto | `forge_flail` | Orbitante | orbiter | 10 | 30x30 | fatto; da rivedere: palla senza spuntoni |
| Armatura vuota | `forge_armor` | Pesante | charger | 15 | 36x42 | fatto; da rivedere: visiera a T, controllare che non ricordi un personaggio noto |
| Armaiolo | `forge_armorer` | Sostegno | support | 9 | 27x36 | fatto |
| Rastrelliera | `forge_rack` | Nido | nest | 16 | 42x30 | fatto; da rivedere: legno con lame appese, senza piedi |

**Miniera** (7)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Canarino del grisou | `forge_canary` | Folla volante | flyer | 6 | 18x18 | fatto |
| Minatore dannato | `forge_miner` | Folla | chaser | 9 | 24x33 | fatto |
| Talpa di ferro | `forge_mole` | Scavatore | burrower | 11 | 30x24 | fatto |
| Fochino | `forge_blaster` | Artiglieria | shooter | 9 | 27x33 | fatto; da rivedere: la dinamite si legge poco |
| Carrello impazzito | `forge_cart` | Caricatore | charger | 13 | 36x27 | fatto |
| Gigante di minerale | `forge_ore_giant` | Pesante | leaper | 17 | 42x42 | fatto |
| Pozzo della miniera | `forge_shaft` | Nido | nest | 16 | 36x36 | fatto |

### Ghiacciaio eterno

**Scuola del Custode** (8)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Sentinella di brina | `glacier_sentinel` | Torretta | turret | 12 | 24x24 | fatto |
| Fiocco tagliente | `glacier_flake` | Folla volante | flyer | 6 | 21x21 | fatto |
| Lupo delle nevi | `glacier_wolf` | Branco | charger | 9 | 39x24 | fatto |
| Apprendista del gelo | `glacier_apprentice` | Tiratore | shooter | 9 | 27x36 | fatto |
| Spirito della bufera | `glacier_spirit` | Orbitante | orbiter | 9 | 27x24 | fatto; da rivedere: un'onda di neve, senza volto |
| Blocco vivo | `glacier_ice_block` | Pesante | chaser | 15 | 36x33 | fatto |
| Cristallo eco | `glacier_crystal` | Sostegno | support | 11 | 27x36 | fatto |
| Ariete di ghiaccio | `glacier_ram` | Caricatore | charger | 13 | 39x30 | fatto |

**Tana del gelo** (6)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Ermellino | `glacier_ermine` | Folla | chaser | 6 | 27x12 | fatto |
| Lemming del dirupo | `glacier_lemming` | Kamikaze | kamikaze | 7 | 18x15 | fatto |
| Gufo delle nevi | `glacier_owl` | Orbitante | orbiter | 9 | 27x27 | fatto |
| Volpe artica | `glacier_fox` | Agguato | chaser | 9 | 30x18 | fatto |
| Orso delle nevi | `glacier_bear` | Pesante | chaser | 16 | 42x36 | fatto |
| Tana sotto la neve | `glacier_den` | Nido | nest | 15 | 36x24 | fatto |

**Osservatorio** (6)

| Nome | Id grafica | Ruolo | Comportamento | Raggio | Ingombro | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Omuncolo di brina | `glacier_homunculus` | Folla | chaser | 6 | 18x24 | fatto |
| Palla di neve | `glacier_snowball` | Folla | chaser | 6 | 15x15 | fatto |
| Astrolabio vivo | `glacier_astrolabe` | Torretta | turret | 12 | 36x36 | fatto |
| Lettore di stelle | `glacier_star_reader` | Artiglieria | shooter | 9 | 24x36 | fatto |
| Pupazzo colossale | `glacier_snowman` | Pesante | chaser | 17 | 42x42 | fatto |
| Alambicco gelato | `glacier_alembic` | Nido | nest | 14 | 30x36 | fatto |

## Mappe

Tutto a un pixel per unita' di mondo, come personaggio, boss e mob, e con la stessa riduzione: stessa densita', stesso contorno scuro sugli oggetti. Fogli in `src/assets/art/tiles-ia/` e `src/assets/art/scenari/`, con le spiegazioni nei loro `LEGGIMI.md`.

| Ambientazione | Idea | Pezzi |
| --- | --- | --- |
| Cripta | Chiesa funeraria in ardesia, con finestre cremisi | lastre grandi, tappeto cremisi, nicchie, stendardi, torce, statue d'angelo, ossari con candele, sarcofagi, altari, gabbie, panche di quercia |
| Palude spenta | Chiesa sommersa, muschio e radici | lastre affondate nel fango, acqua nera, archi muschiati, angeli sommersi, alberi morti, funghi giganti, ceppi, passerella marcia |
| Fucina in rovina | Fonderia-cattedrale in basalto e ferro | basalto, lava, archi con bocche di forno, catene, forni, incudini, ingranaggi, crogioli, bracieri, casse, grata di ferro |
| Ghiacciaio eterno | Cattedrale ghiacciata | ghiaccio, neve, archi sotto il ghiaccio, cristalli, cavalieri nel ghiaccio, stalagmiti, ponte gelato, blocchi |

Limiti noti:

- Il muro in alto sale oltre il bordo della stanza, perche' la camera non ha limiti. Sopra sfuma nel buio.
- Il fondo dei pozzi e' un motivo da 128 unita'.
- La Palude compone la riva pixel per pixel una volta per tassello: un punto di costo in piu' solo all'ingresso, misurato in 14-53 ms per una vista intera.
- Soglia e luce delle porte restano nel codice, a gradini: la zona di gioco non cambia, i due angoli ne segnano il fondo. Con `?tile=classici` resta la lastra di prima.
- Le fiamme di torce e bracieri sono ancora rettangoli nel codice, animati: i supporti vengono dai fogli.
- Gli arredi a terra sono bassi apposta: non bloccano e non devono sembrare ostacoli.
- Colonne larghe: quando nessun pezzo del foglio copre il cerchio di collisione, la colonna e' un gruppo di pezzi vari, non uno solo allargato. Le collisioni non sono cambiate.

## Prove fatte

4 novembre 2026, nel gioco vero con il server di sviluppo:

- Mob di ogni dungeon schierati sul loro pavimento, con il bordo chiaro; 111 a schermo, 1,4-3,7 ms per fotogramma dopo i primi.
- Verso di marcia: lupi, volpi ed ermellini guardano chi inseguono, dai due lati.
- Chi passa dietro una colonna finisce dietro, con la luce giusta.
- Stanze con pozzi, ponti e ripari nei quattro dungeon; fase II del Guardiano; portali aperti; ritorno ai classici con `?tile=classici` e `?mob=classici`.
- Partite automatiche nei quattro dungeon e in pellegrinaggio, circa 360.000 fotogrammi in tutto, con boss uccisi e schermata di fine: nessuna eccezione, nessuna posizione non valida, nessun errore in console. Sono partite di un programma: controllano che il gioco non si rompa, non che sia bello o bilanciato.
- Costo per fotogramma in stanze dei quattro dungeon, a fine lavoro: 0,2-0,43 ms.
- Bestiario con tutti i 100 nemici scoperti: 88 mob e 12 mini boss, miniature a due pixel per pixel.
- Una vista intera di pavimento nuovo costa 10-15 ms all'ingresso in una stanza, 14-53 ms nella Palude; poi i tasselli stanno in cache e il pavimento costa meno di 0,5 ms per fotogramma.
- `npm run verify`: tipi, test e build passano.

Non provato: una partita giocata a mano da una persona, il multigiocatore.

## File prodotti

| Cosa | Dove |
| --- | --- |
| Strumenti | `tools/arte/genera_mob.py`, `genera_scenari.py`, `prepara_mob.py`, `prepara_boss_ia.py`, `prepara_scenari.py` |
| Fogli di boss e mini boss | `src/assets/art/boss-ia/` |
| Mappe | `src/assets/art/tiles-ia/`, `src/assets/art/scenari/`; geometria in `themes/tile-atlas-ia.ts` e `themes/scenery-atlas.ts` |
| Disegno delle scenografie | `themes/scenery.ts` |
| Prompt e scelte | `tools/arte/boss-prompts.json`, `boss-progetto.json`, `mob-prompts.json`, `mob-moti.json`, `scenari-prompts.json`, `scenari-progetto.json` |
| Sprite dei mob | `src/features/presentation/minion-art/generated-sprites.ts`, generato da `prepara_mob.py --scrivi` |
| Originali del generatore | Fuori dal repository, nella cartella di ComfyUI |

Per il generatore: `custom_nodes/tile_circolare.py` modifica il modello in memoria. Dopo le texture, una voce con `asse: nessuno` lo riporta al normale: i mob generati con il modello ancora circolare escono con pezzi ripetuti ai bordi.
