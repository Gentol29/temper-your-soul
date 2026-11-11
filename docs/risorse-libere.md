# Risorse libere: fonti valutate

**Grafica · 10 novembre 2026:** fonti, candidati e ricette grafiche sotto sono un archivio di provenienza, non riferimenti per nuovi asset. La grafica si produce esclusivamente con PixelLab MCP secondo [canone-grafico.md](canone-grafico.md). Le regole di audio e font restano separate; conservare i font approvati.

Ricerca del 31 ottobre 2026, solo pagine web, nessun download. **V** = verificato aprendo la pagina; **D** = dedotto (tag, descrizione, fonti terze). Regole in [prompt-di-progetto.md](prompt-di-progetto.md), sezione 5. Il primo lotto è nel progetto (vedi sotto). Ogni nuovo scaricamento va proposto all'utente (nome, fonte, dimensione) e registrato in `src/features/audio/audio-credits.ts`.

Che una registrazione sia "vera" lo si ricava dalla descrizione dell'autore, non dall'ascolto: va confermato ascoltando, prima di inserirla.

## Escluse (e perché)

| Fonte | Motivo |
| --- | --- |
| Kevin MacLeod / incompetech | La pagina "software" (aggiornata a novembre 2025) dichiara l'uso di **Suno** (IA) per cori e strumenti solisti, oltre a Tone Transfer e a librerie di campioni: non si può sapere quali brani contengano IA (V) |
| Pixabay | Licenza propria, non CC; le linee guida ammettono audio IA anche senza etichetta (V) |
| BBC Sound Effects (RemArc) | Solo uso personale, educativo o di ricerca (D) |
| Musica su OpenGameArt | Quasi sempre campioni o synth (per esempio "Solemn (Opening)" elenca "Synth") (V) |
| Licenze BY-SA (per esempio Night on Bald Mountain, Skidmore College) | La clausola SA su musica sincronizzata a immagini è rischiosa per un gioco (V la licenza, D l'interpretazione) |
| Holst, *Mars* (USAF Heritage of America Band) | Possibile trascrizione ancora protetta (Merlin Patterson); licenze discordanti fra le pagine |
| Internet Archive senza verifica | La licenza la dichiara chi carica, spesso a torto (per esempio Karl Richter, vinile DECCA 1970, segnato come pubblico dominio) (V) |
| "12 Public Domain Boss Sprites" (OGA) | Ottenuti con stile neurale e nomi presi da giochi protetti |
| 7soul1 "496 icons" (OGA) | Licenza contraddittoria, icone rimosse perché derivate da giochi protetti (D) |

## Musica (registrazioni vere)

| Uso nel gioco | Brano ed esecuzione | Pagina | Licenza | Durata / peso | Note |
| --- | --- | --- | --- | --- | --- |
| Menu | Debussy, *La cathédrale engloutie*, Stefano Ligoratti (pianoforte) | imslp.org/wiki/Special:ImagefromIndex/220924 | CC BY 3.0 (V) | 5:51, 5,4 MB | Solo questo file: altri dello stesso esecutore sono NC |
| Menu (alt.) | Bach, *Variazioni Goldberg*, Aria, Kimiko Ishizaka | archive.org/details/The_Open_Goldberg_Variations-11823 | CC0 (V) | 4:59 | Più sereno che cupo |
| Cripta | Canto gregoriano binaurale, monastero vicino a Burgos, Suso_Ramallo | freesound.org/people/Suso_Ramallo/sounds/320530/ | CC BY 4.0 (V) | 10:25 | Ritagliare 1–2 min per l'anello |
| Cripta (organo) | "Pipe Organ Clip", St Mark's, g0ggs | freesound.org/people/g0ggs/sounds/342598/ | CC0 (V) | 2:50 | Satura verso la fine |
| Palude | Drone di violoncello, carrieedick / juskiddink | freesound.org/people/carrieedick/sounds/465558/ · …/juskiddink/sounds/81032/ | CC0 / CC BY 4.0 (V) | 1:08 / 0:32 | Tappeto da sovrapporre all'ambiente |
| Fucina | Taiko (4 tamburi, suona Dave Thayer), whatsanickname4u | freesound.org/people/whatsanickname4u/sounds/127337/ | CC BY 3.0 (V) | 3:31 | Anello a battute; citare anche l'esecutore |
| Ghiacciaio | Grieg, *La morte di Åse*, Czech National Symphony Orchestra (Musopen 2012) | imslp.org/wiki/Special:ImagefromIndex/246988 | CC BY 3.0 su IMSLP, Public Domain Mark su archive.org: **trattare come CC BY e citare** (V) | 4:38, 10,7 MB | Archi |
| Ghiacciaio (alt.) | Debussy, *Des pas sur la neige*, Chiara Bertoglio | imslp.org/wiki/Special:ImagefromIndex/297337 | CC BY 3.0 (V) | 4:01 | Non trovata una celesta vera e libera |
| Furia del boss | Grieg, *Nell'antro del re della montagna*, CNSO (Musopen) | imslp.org/wiki/Special:ImagefromIndex/246990 | Come Åse | 2:38, 6,1 MB | Accelera: non fa da anello. Alternativa: anello di taiko |
| Vittoria | "Medieval Fanfare", due trombe (Jo Wright), tobyk | freesound.org/people/tobyk/sounds/26198/ | CC BY 3.0 (V) | 0:07 | — |
| Sconfitta | "funeral bell", aoristos | freesound.org/people/aoristos/sounds/329324/ | CC0 (V) | 0:29 | Alternativa: Chopin, marcia funebre, Harald Vetter, IMSLP 683229, CC BY 4.0 |

## Effetti sonori

| Fonte | Licenza | Uso | Avvertenze |
| --- | --- | --- | --- |
| Freesound, autori **kyles**, **Breviceps**, **felix.blume** | Quasi tutto CC0 (V; kyles 2 NC, felix.blume 22 NC) | Foley, ambienti, fango bollente (lava), cori | Controllare ogni singolo suono |
| Freesound, **qubodup** | CC0 e CC BY (V) | Fruscii, pozze di fango | Licenza diversa suono per suono |
| Freesound, **InspectorJ**, **klankbeeld** | Quasi tutto CC BY (V) | Passi, vento, horror | Evitare "Wind, Synthesized" |
| **Kenney** UI Audio | CC0 (V) | Clic e interfaccia | Dichiarati "organic sounds" (V) |
| **Kenney** RPG Audio, Impact Sounds | CC0 (V) | Colpi, oggetti, passi | Metodo di registrazione non dichiarato (D: foley); evitare Digital/Sci-fi Audio |
| Michel Baradari, "15 monster grunt/pain/death" (OGA) | CC BY 3.0 (V) | Versi del boss | Origine non dichiarata |
| Sonniss GDC bundle | Licenza propria, non CC (V) | — | Non ridistribuibile come effetti; pacchetti enormi: non adatto a un repository pubblico |

Suoni puntuali CC0 (V tramite filtro di licenza): spade Fenodyrie 568790, Qat 107589 · arco calvarychurchatlanta 179996, EminYILDIRIM 536067, plantmonkey 410751 · fuoco TheWoodlandNomad 363092, Spandau 40699 · esplosioni waxsocks 254836 · ghiaccio northern87 369982, karlis.stigis 168712 · mostri Voices_Of_Marz 444444 (voce elaborata) · passi su neve bajko 378056, zerrofs 118417; fango Nox_Sound 548384, Alex_hears_things 376809 · gong Paiste 32" JensZygar 486629 · campane aoristos 329324, Aeonemi 180330 · ambienti: palude chris_dagorne 181364, vento moxobna 47704, lava RTB45 415609 e Breviceps 456806, grotta Andy_Gardner 196713. Gli indirizzi sono `freesound.org/s/<numero>/`.

## Primo lotto: scaricato il 31 ottobre 2026

Approvato dall'utente e integrato nel gioco: 48 file, circa 10,5 MB in `src/assets/audio/`. Crediti in `src/features/audio/audio-credits.ts` e nel pannello Audio; script in `tools/audio/`. Licenze rilette sulle pagine al momento dello scaricamento.

Differenze rispetto alla proposta:

- **Menu:** l'Aria delle *Goldberg* di Kimiko Ishizaka (CC0) al posto del Debussy di Ligoratti. IMSLP fa scaricare quel file solo dopo aver accettato una dichiarazione sul copyright, e accettarla spetta all'utente. Il Debussy resta un'alternativa.
- **Grieg:** scaricato dagli indirizzi diretti del lettore della pagina IMSLP dell'opera. La pagina conferma "Musopen, 2012 · Creative Commons Attribution 3.0" e "Czech National Symphony Orchestra".
- **Kenney:** usato anche per l'arcano (vetro), la natura (fruscio d'erba), gli scoppi (impatti uniti alle registrazioni del materiale), il bottino e il livello (campane).

Il carattere "registrazione vera" è stato ricavato da titoli e descrizioni; **l'ascolto finale spetta all'utente** (vedi la checklist in `docs/roadmap.md`).

## Secondo lotto proposto (da approvare)

| Suono | Candidati | Licenza | Peso |
| --- | --- | --- | --- |
| `cast_dash` (scatto, oggi tono del prototipo) | Fruscio di un bastone di bambù, qubodup (verificare la licenza del singolo suono) | CC0 o CC BY | < 0,1 MB |
| `boss_attack` (annuncio degli attacchi, oggi muto) | Versi di mostri di Michel Baradari (OGA, origine non dichiarata) o Voices_Of_Marz 444444 (voce elaborata) | CC BY 3.0 / CC0 | < 0,5 MB |
| Varianti per boss | Ruggito diverso per ciascun boss, scelto con `tools/cerca-risorse.mjs` | CC0 / CC BY | < 0,5 MB |
| Passi (proposta nuova) | Kenney Impact Sounds, già nel progetto: `footstep_concrete`, `footstep_grass`, `footstep_snow` per cripta, palude e ghiacciaio | CC0 | già scaricati |
| Organo per la cripta (alternativa) | "Pipe Organ Clip", g0ggs (CC0), oppure l'organo del Duomo di Vienna, Breviceps 462340 (CC0) | CC0 | circa 2 MB |

## Grafica e caratteri (per quando la grafica riprenderà)

Le fonti grafiche di questa sezione sono archiviate: non usarle per nuove produzioni, che seguono il canone PixelLab.

| Nome | Licenza | Uso | Avvertenze |
| --- | --- | --- | --- |
| 0x72 DungeonTileset II | CC0 (V) | Pietra della cripta, eroi, non morti | Niente lava, ghiaccio o palude |
| Puny Characters (Shade, OGA) | CC0 (V) | Riferimento per le 3 classi in 8 direzioni | Le edizioni estese su itch.io hanno un'altra licenza |
| DawnLike (DragonDePlatino) | CC BY 4.0 + citare DawnBringer (V) | Tileset roguelike vasto | Leggere il file di licenza nel pacchetto |
| ArMM1998 "Zelda-like" + Eman Quest (OGA) | CC0 (V) | Lava di caverna, foresta di ghiaccio, foresta morta | Ricolorati Endesga |
| actg "swamp" | CC0, "No generative AI" (V) | Acqua animata, ninfee | Da ricolorare in chiave cupa |
| Kenney Tiny Dungeon, Roguelike Caves & Dungeons | CC0 (V) | Tile 16×16 | — |
| foozlecc Pixel Magic Sprite Effects | CC0, "No generative AI" (V) | Effetti 32×32 (fuoco, esplosione, vento, terra) | — |
| Kyrise 16×16 RPG Icon Pack | CC BY 4.0 (V) | Icone di oggetti | — |
| game-icons.net | CC BY 3.0 (V) | Icone di abilità (vettoriali) | Da pixelare; citare |
| Font: Jacquard 24, Jacquarda Bastarda 9, Grenze Gotisch, Cinzel Decorative, Silkscreen, Pixelify Sans | OFL (V) | Titoli gotici e testi | Servire in locale (`@font-face`), niente CDN |
| Palette Resurrect 64 / Endesga 32 (Lospec) | Nessuna licenza; uso in giochi confermato dall'autrice di Resurrect 64 (V) | Palette unica per i ricolori | — |

Ricerca storica: nessun boss top-down CC0 di qualità verificato. Per nuovi boss usare PixelLab secondo il canone attuale.

## Connettori e API

| Servizio | Accesso | Filtro di licenza | Limiti | Note |
| --- | --- | --- | --- | --- |
| **Openverse** | Anonimo (circa 1 richiesta/s, 20 risultati per pagina) o token gratuito | `license=cc0,by,pdm` | — | Usato da `tools/cerca-risorse.mjs`; indicizza Freesound (circa 592 000 audio), Wikimedia, Jamendo (spesso NC: il filtro le esclude) |
| **Freesound API v2** | Chiave personale per cercare; OAuth2 per gli originali | `license:"Creative Commons 0"` / `"Attribution"` | 60/min, 2000/giorno | Esistono server MCP (johnkimdw/freesound-mcp-server, timjrobinson/freesoundmcpserver), manutenzione non verificata. Serve un account dell'utente: un agente non lo crea |
| Internet Archive | `advancedsearch.php`, senza chiave | `licenseurl:(*publicdomain*)` | — | Licenze dichiarate da chi carica: verificarle |
| Wikimedia Commons | API MediaWiki | Sì | — | Da questo PC `upload.wikimedia.org` è troppo lento |
| OpenGameArt, Musopen, IMSLP, FMA | Nessuna API utile; OGA risponde 403 alle letture automatiche, Musopen ha una verifica anti-bot | — | — | Leggerli con il browser |

## Studio: pixel art per boss, servitori, effetti e schermate (1 novembre 2026)

Ricerca di approfondimento, solo pagine web, nessun download. **V** = verificato sulla pagina; **D** = dedotto; **(!)** = licenza da ricontrollare nel pacchetto. Quasi tutta la pixel art animata libera è **laterale**: in un gioco dall'alto si usa specchiandola in orizzontale. Le rare risorse davvero dall'alto sono segnate **TD**.

**Vincolo del progetto:** la revisione grafica di sprite e ritratti è sospesa da Jabbaz. Questo studio serve a **decidere** il prossimo lotto grafico: nulla va scaricato senza il suo consenso e quello dell'utente.

### Boss

| Risorsa · autore | Licenza | Formato | Uso proposto |
| --- | --- | --- | --- |
| [Enemy Galore I](https://opengameart.org/content/enemy-galore-i) · Admurin | CC BY 4.0 su OGA **V** (!) | 32×32, 12 nemici, 479 fotogrammi; il golem corazzato ha una "rottura dell'armatura" | Colosso della fornace, ingrandito ×3 e ricolorato lava; la rottura dell'armatura diventa la fase II |
| [[LPC] Golem](https://opengameart.org/content/lpc-golem) · Redshrike | CC BY 3.0/4.0 (scegliere CC BY tra quelle elencate) **V** | 64×64 **TD**, camminata, attacco e morte in 4 direzioni | Colosso (alternativa dall'alto vera) |
| [Animated Statue](https://opengameart.org/content/animated-statue) · Calciumtrice | CC BY 3.0 **V** | 64×64, risveglio, camminata, attacco, sgretolamento | Guardiano della cripta: statua con crepe e occhi di brace |
| [Demon Flower Monster](https://opengameart.org/content/demon-flower-monster-sprite-sheet) · Rosswet Mobile | CC BY 3.0 **V** | 64×64, idle, salto, attacchi, morte, proiettile | Madre delle spore, desaturata |
| [EVil Wizard 2](https://luizmelo.itch.io/evil-wizard-2) · LuizMelo | CC0, "no generative AI" **V** | circa 80 px su tela 250×250, idle, corsa, 2 attacchi, colpito, morte | Custode del ghiaccio, ricolorato gelo con teletrasporto a dissolvenza |
| [Boss Cohort](https://opengameart.org/content/boss-cohort) · Gilgaphoenixignis | CC BY 3.0/4.0 **V** | ritratti statici 84–111 px | Ritratti dei boss nelle schermate finali o nell'introduzione |

Scartati: Ars Notoria (alcune parti sono CC BY-SA, lo dice l'autore nei commenti), CraftPix (licenza OGA-BY), pacchetti che spuntano tutte le licenze insieme, risorse legate a giochi protetti o modelli 3D.

### Servitori

| Tema | Risorsa · autore | Licenza | Formato |
| --- | --- | --- | --- |
| Cripta | [Skeletons Rework](https://opengameart.org/content/skeletons-rework) · AntumDeluge | CC0 **V** | 24×32 **TD**, idle e camminata |
| Cripta | [Skull Enemy](https://chrisppop.itch.io/skeleton-head) · ChrisPpop | CC0, "no generative AI" **V** | 32×32, idle, movimento, attacco, colpito, morte (teschio di brace) |
| Tutti i temi | [16x16, 16x24, 32x32 rpg enemies](https://opengameart.org/content/16x16-16x24-32x32-rpg-enemies-updated) · Redshrike | CC BY 3.0 **V** | vista 3/4 **TD**, funghi, gelatine, scheletri, golem, fiammelle |
| Palude | [Forest Monsters](https://opengameart.org/content/forest-monsters) · Calciumtrice | CC BY 3.0 **V** | 32×32, pianta che sputa veleno con nube animata |
| Palude | [Animated Mushroom Monster](https://opengameart.org/content/animated-mushroom-monster-pixel-art) · ScratchIO | CC0 **V** | 29×28, comparsa, attacco, colpito, morte |
| Fucina | [[LPC] Imp](https://opengameart.org/content/lpc-imp) · Redshrike | CC BY 3.0/4.0 **V** | 64×64 **TD**, 5 varianti |
| Ghiaccio | [Ghost animated](https://opengameart.org/content/ghost-animated) (ghostIce) · LetargicDev | CC0 **V** | 32×32, camminata, attacco, morte |
| Ghiaccio | [Bat (Rework)](https://opengameart.org/content/bat-rework) | CC BY 3.0 **V** | 32×32 **TD**, volo in 4 direzioni |

### Effetti e interfaccia

| Uso | Risorsa · autore | Licenza |
| --- | --- | --- |
| Scintille e impatti | [Pixel FX Pack](https://opengameart.org/content/pixel-fx-pack) · CodeManu | CC0 **V** |
| Esplosioni | [Explosion Set 1](https://opengameart.org/content/explosion-set-1-m484-games) · Master484; [explosion animations](https://opengameart.org/content/explosion-animations) · Jetrel | CC0 **V** |
| Fendente | [Pixel art sword slash](https://opengameart.org/content/pixel-art-sword-slash-effect) · tbbk | CC0 **V** |
| Incantesimi | [Pixel Art Spells](https://opengameart.org/content/pixel-art-spells) · DevWizard | CC0 **V** |
| Stendardi e cornici | [Golden UI](https://opengameart.org/content/golden-ui) · Buch (da ricolorare in rame); [Fantasy UI Borders](https://kenney.nl/assets/fantasy-ui-borders) · Kenney | CC0 **V** |
| Barra del boss | [Thorns – Health Bar](https://opengameart.org/content/thorns-health-bar) · Cethiel | CC0 **V** |
| Trofei e teschi | [CC0 Award Icons](https://opengameart.org/content/cc0-award-icons) · AntumDeluge | CC0 **V** |
| Numeri del danno | font Jersey 10, Tiny5, Pixelify Sans (Google Fonts) | OFL **V** |

L'onda d'urto della fase II, le braci e i coriandoli conviene farli nel codice, come già oggi: un anello che si espande, un lampo di due fotogrammi, una scossa e un cambio di palette.

### Metodo per trovarne altra

- **OpenGameArt**: ricerca avanzata filtrata per licenza. Nell'indirizzo `field_art_licenses_tid[]` vale 4 per CC0, 2 per CC BY 3.0, 17981 per CC BY 4.0. Da evitare: 3 e 17982 (licenze SA), 10310 e 31772 (OGA-BY). Il materiale assistito da IA sta nella collezione "Artificial Intelligence Assisted Artwork", con il download disattivato.
- **itch.io**: il filtro `/game-assets/assets-cc0/tag-pixel-art/tag-no-ai` funziona. Dal novembre 2024 dichiarare l'uso di IA è obbligatorio: cercare la frase "No generative AI was used".
- **Autori affidabili**: Calciumtrice, Redshrike, ansimuz, LuizMelo, AntumDeluge, Clint Bellanger, Master484, Buch, Cethiel, GrafxKid, Kenney.
- **Verifica della licenza**:
  - confrontare la pagina con il file di licenza dentro il pacchetto e con i commenti;
  - se discordano vale la più restrittiva;
  - registrare URL, autore, licenza e data nei crediti.
- **Unificare stili diversi**:
  - una palette sola (Resurrect 64 o Endesga 32), applicata a colori indicizzati;
  - ingrandimenti solo interi (×2, ×3);
  - un solo stile di contorno;
  - luce dall'alto a sinistra;
  - 8–12 fotogrammi al secondo;
  - la stessa ombra ellittica.
- **Strumenti gratuiti**: LibreSprite (GPLv2), Pixelorama (MIT, anche via web), Piskel (Apache-2.0, nel browser), Aseprite compilato dal sorgente per uso personale.
- **Commissione a un artista**, stima indicativa:
  - un boss di circa 40 fotogrammi costa 250–800 $;
  - otto servitori da 32 px costano 500–1300 $;
  - nel contratto: palette del gioco, file sorgente, cessione della licenza, nessuna IA.
- **Sprite procedurali nel codice**: adatti a servitori ed effetti (come gli attuali), meno ai boss.

### Primo lotto grafico proposto (da decidere con Jabbaz)

Scaricato il 1 novembre 2026 con il consenso dell'utente: vedi la sezione «Primo lotto grafico: scaricato e provato sui boss» qui sotto.

| # | Risorsa | Licenza | Per cosa | Peso |
| --- | --- | --- | --- | --- |
| 1 | Enemy Galore I (Admurin) | CC BY 4.0 (controllare il file nel pacchetto) | Colosso della fornace con rottura dell'armatura in fase II; sassi, teschi, pipistrelli | 1,5 MB |
| 2 | Calciumtrice: Statue, Skeleton, Forest Monsters, Rat and Bat | CC BY 3.0 | Guardiano della cripta, scheletri, pianta di spore | circa 60 KB |
| 3 | Redshrike, rpg enemies 16/24/32 | CC BY 3.0 | Servitori in vista 3/4 per tutti i temi | 17 KB |
| 4 | Demon Flower Monster (Rosswet Mobile) | CC BY 3.0 | Madre delle spore | 207 KB |
| 5 | LuizMelo: EVil Wizard 2 e Monsters Creatures Fantasy | CC0, senza IA | Custode del ghiaccio; fungo, scheletro, occhio volante | circa 140 KB |

Circa 1,9 MB di archivi; i PNG effettivamente usati resterebbero sotto i 300 KB. Si aggiungerebbero circa 0,5 MB di effetti (Pixel FX Pack, Explosion Set 1, fendente di tbbk). I crediti CC BY vanno citati (Admurin, Calciumtrice, Stephen "Redshrike" Challener con link a OpenGameArt.org, Rosswet Mobile). Gli sprite di LuizMelo sono più grandi (60–80 px): vanno usati per boss o nemici d'élite, non mescolati ai servitori da 32 px.

## Primo lotto grafico: scaricato e provato sui boss (1 novembre 2026)

> **Tolto dal gioco il 5 novembre 2026**, insieme ai crediti e agli script di preparazione: sostituito dagli sprite del generatore locale. La sezione resta come registro delle fonti valutate.

Scaricati con il consenso dell'utente gli archivi delle righe 1, 2 (statua, scheletro, ratto e pipistrello, piante), 3, 4 e 5 della tabella sopra, circa 2 MB in una cartella temporanea fuori dal progetto. Licenze ricontrollate: sulla pagina per OpenGameArt (nessun file di licenza negli archivi), nel `License.txt` del pacchetto per EVil Wizard 2 (CC0, «No generative AI was used» sulla pagina). Per Redshrike la pagina elenca anche OGA-BY: si usa CC BY 3.0.

Usati per ora **solo i quattro boss** (ramo `feature/grafica-boss`), in `src/assets/art/boss/`, circa 110 KB in tutto:

| Boss | Opera | Licenza | Animazioni usate | Scala | Fase II |
| --- | --- | --- | --- | --- | --- |
| Guardiano della cripta | Animated Statue (Calciumtrice), variante grigia | CC BY 3.0 | camminata 8, attacco 5, risveglio 4, sgretolamento 6 | ×1 | la pietra si arroventa; il risveglio fa da trasformazione |
| Madre delle spore | Demon Flower Monster (Rosswet Mobile) | CC BY 3.0 | riposo 4, sputo 14, salto 9, morte 8 | ×2 | da verde palude a viola tossico; salta entrando in furia |
| Colosso della fornace | Enemy Galore I, golem (Admurin) | CC BY 4.0 | corsa 4, attacco 11–12, rottura dell'armatura 5, morte 9 | ×3 | l'armatura si spezza e resta la roccia fusa |
| Custode del ghiaccio | EVil Wizard 2 (LuizMelo) | CC0 | riposo 8, attacco 8, morte 7 | ×1 | la fiamma di ghiaccio diventa viola-bianca |

Come sono stati adattati (`tools/arte/prepara_boss.py`):
- **una tavolozza del gioco per boss**, applicata per luminosita' a gruppi di colori (pietra, fiamma, ori, occhi), in due varianti: calma e furia;
- **contorno scuro** dove mancava (statua, mago), per staccare la figura dal pavimento;
- **ingrandimenti interi** scelti perche' la figura copra all'incirca il cerchio di colpo, che resta quello dei dati;
- le figure laterali si specchiano verso il giocatore, come prima.

Limiti noti:
- densita' dei pixel diversa fra i boss (×1, ×2, ×3): il colosso e la madre delle spore sono piu' "grossi" del giocatore, il guardiano e il custode hanno la sua stessa finezza;
- sono figure laterali in un gioco visto dall'alto, come gli sprite attuali;
- il colosso e' stato ricolorato da un golem blu: in calma e' scuro, da provare sul pavimento della fornace.

Restano nella cartella temporanea, non usati: scheletri, ratti, pipistrelli e piante di Calciumtrice, i nemici di Redshrike, gli altri nemici di Enemy Galore e di Monsters Creatures Fantasy. Sono il materiale per ridisegnare i servitori in un passo successivo, se la prova dei boss piace.

## Tileset della fase 6: scaricati il 1° novembre 2026

> **Tolto dal gioco il 5 novembre 2026**, insieme ai crediti e agli script di preparazione: sostituito dagli sprite del generatore locale. La sezione resta come registro delle fonti valutate.

Con il sì dell'utente («Scarica i file e fai i test per fase 5 e 6»), in una cartella temporanea fuori dal progetto. Licenze lette sulla pagina di ciascun pacchetto; nei pacchetti non ci sono file di licenza.

| Pacchetto | Autore | Fonte | Licenza | Peso | Usato |
| --- | --- | --- | --- | --- | --- |
| DungeonTileset II v1.7 | 0x72 | itch.io | CC0, «No generative AI was used» | 406 KB | sì: pavimenti, muri, cime, casse |
| 16x16 Dungeon Tileset v5 | 0x72 | itch.io | CC0, senza IA | 150 KB | no |
| 16x16 Dark Dungeon | kosinaz | itch.io | CC0, senza IA | 23 KB | no |
| swamp_, cave_, tundra_, dungeon_ | Kevin's Mom's House | itch.io | CC0 (scritto nella descrizione), senza IA | 41–72 KB ciascuno | sì: panche (dungeon_), blocchi di ghiaccio (tundra_) |
| 16x16 Puny Dungeon | Shade | OpenGameArt (la pagina itch.io non esiste più) | CC0 | 122 KB | no |
| Forest and Dungeon Tilesets from Eman Quest | Night Blade | OpenGameArt | CC0 | 27 KB | sì: pozzi, lava, assi, terra, radici |

Con DungeonTileset II sono arrivati anche due PNG minuscoli della stessa pagina (`pumpkin_dude.png`, `doc.png`), cancellati subito. Nel repository entrano solo i quattro fogli ricolorati (circa 12 KB): vedi `src/assets/art/tiles/LEGGIMI.md`.

## Caratteri dell'interfaccia: scaricati il 1° novembre 2026

Con il sì dell'utente, dai file ufficiali di Google Fonts (CSS API per i WOFF2 del sottoinsieme latino, repository `google/fonts` per licenze e metadati).

| Carattere | Autore | Licenza | File | Peso | Usato |
| --- | --- | --- | --- | --- | --- |
| Grenze Gotisch | Omnibus-Type | SIL OFL 1.1 | `grenze-gotisch-latin.woff2` (variabile) | 42 KB | sì, titoli |
| Silkscreen | Jason Kottke | SIL OFL 1.1 | `silkscreen-400-latin.woff2`, `silkscreen-700-latin.woff2` | 16 KB | sì, numeri ed etichette dell'HUD (solo a 8 e 16 pixel) |
| Pixelify Sans | Stefie Justprince | SIL OFL 1.1 | `pixelify-sans-latin.woff2` (variabile) | 12 KB | no: la B si legge come una G; resta solo nella cartella temporanea |

Le tre licenze OFL scaricate pesano circa 4 KB ciascuna; nel progetto ci sono le due dei caratteri usati.

## Eccezione autorizzata: PixelLab (1 novembre 2026)

> **Tolto dal gioco il 5 novembre 2026**, insieme ai crediti e agli script di preparazione: sostituito dagli sprite del generatore locale. La sezione resta come registro delle fonti valutate.

Il proprietario ha richiesto esplicitamente VFX delle skill e poi icone oggetto generati con PixelLab, entro 39 generazioni. Gli output sono registrati come `PixelLab-output`, con i termini del servizio e senza dichiararli CC0. Nessuna generazione di personaggi, boss o mob in questo incremento. Vedere [dettagli e provenienza](vfx-pixellab.md).

## Eccezione proposta: boss e luogotenenti generati in locale (3 novembre 2026)

Su richiesta dell'utente, con un generatore sul suo PC: SDXL 1.0 base ([OpenRAIL++-M](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)) e [Pixel Art XL](https://huggingface.co/nerijs/pixel-art-xl) (OpenRAIL-M). Non e' una risorsa di terzi con un autore, ed e' grafica generata con l'IA: la regola del progetto la escludeva, e l'eccezione del 1 novembre copre solo effetti e icone. **Decide il proprietario.** I fogli di terzi non sono stati tolti: restano nel gioco con `?boss=classici`, e togliere i nuovi vuol dire una riga in `boss-sheets.ts`. Dettagli in `src/assets/art/boss-ia/LEGGIMI.md`. Solo licenze dei modelli lette sulla loro pagina: la tutela delle immagini generate non e' stata valutata oltre.

## Eccezione proposta: mob e mappe generati in locale (4 novembre 2026)

Stesso generatore, stesse licenze e stessa decisione aperta dei boss qui sopra: **decide il proprietario.** Copre gli 88 mob (v0.11.05) e i fogli delle mappe dei quattro dungeon. Il nodo `tools/arte/comfyui/tile_circolare.py` e' scritto per il progetto, non scaricato. Mob a mano e tile di prima non sono stati tolti: restano con `?mob=classici` e `?tile=classici`. Inventario e candidati scelti in [produzione-grafica.md](produzione-grafica.md).
