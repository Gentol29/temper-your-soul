# Sprite C ed equipaggiamento Hi-bit · 3 novembre 2026

L’utente ha scelto **C · Cacciatore d’ombre** per maschile e femminile, autorizzando esplicitamente l’integrazione nel gioco, la correzione del passo e il rifacimento degli sprite di armi/equipaggiamento. La decisione segue la segnalazione dell’area assegnata a simonragaz87-sudo e supera, per questo ambito, la precedente autorizzazione limitata ai prototipi. Il lavoro resta locale sul ramo `codex/vfx-hi-bit`.

## Corpo e animazioni

Il compositore di produzione usa il corpo C per le tre classi in HUB, incontri, alleati e anteprime del personaggio. Corpo nativo su griglia 48 px, frame 64×64 con margine 8 px per gli slanci: il margine non ingrandisce il corpo nel mondo. Coordinate dei piedi condivise dai due renderer, per mantenere l’appoggio sull’ombra. I ritratti illustrati e i PNG approvati restano quelli precedenti; non sono stati generati nuovi asset.

Corretto il difetto segnalato: prima il piede avanzava a terra e arretrava sollevato; ora avanza durante il sollevamento e torna indietro in appoggio. Braccia contrapposte, ginocchia articolate, rimbalzo del busto allineato al passaggio delle gambe, sciarpa/mantello/capelli con ritardo. La mira mantiene l’orientamento del personaggio; il renderer riconosce lo spostamento orizzontale effettivo e inverte il ciclo quando si arretra rispetto alla mira, anche per gli alleati interpolati.

Dodici fotogrammi, gesti distinti per classe e per i quattro slot. Le famiglie nello stesso slot/classe usano gli stessi agganci e la stessa posa: cambia l’aspetto dell’oggetto. Fendente del Guerriero, tiro con la seconda mano sulla corda dell’Arciere, carica e spinta del Mago; parata/attivazione e scatto hanno pose proprie. La sola posa visiva massima passa da **0,16 a 0,30 s**, e si comprime entro la cadenza della skill corrente: le primarie veloci raggiungono il colpo prima di essere riavviate. Nessun ritardo aggiunto all’attacco o cambiamento alle regole. Le armi passano dietro la testa durante riposo, marcia e preparazione, davanti al corpo durante il colpo; dita sopra l’impugnatura.

Tarature estetiche provvisorie in `shadow-motion.ts`: cammino 14 FPS, riposo 8 FPS, falcata ±6 px e sollevamento 5 px. L’anteprima rallenta il ciclo di attacco a 16 FPS per esaminare le pose. Cache delle matrici limitata a **512 frame**, raster browser associati tramite WeakMap; classe, corpo, famiglia, rarità, slot e fotogramma fanno parte della chiave, mentre UID e livello non duplicano lo stesso disegno.

## Oggetti modulari

Ridisegnate tutte le **25 famiglie** registrate: primarie, secondarie, armature e stivali. Metallo annerito, tessuti/cuoio carbone, cenere e cremisi, con piccoli accenti di origine e rarità. Le identità degli oggetti restano leggibili: osso, brace, rovi e ghiaccio hanno forme e dettagli propri. Le superfici grandi restano scure, anche sugli stivali.

Oggetti canonici in `shadow-equipment.ts`: presa comune `(24,26)` nei disegni delle armi/secondarie, trasformata insieme al polso. Le due corporature hanno proporzioni e agganci coerenti. Mantelli dietro il corpo, armature sul busto, stivali sui piedi articolati, mani sopra la presa. Scudo degli spiriti e Faretra del predatore ora rappresentati come scudo e faretra; quest’ultima sta sul dorso. Togliere un oggetto rivela la base corrispondente; nessun’arma di prova viene aggiunta a uno slot vuoto.

Icone **32×32**, ricavate dagli stessi disegni indossati, per conservare corde, guardie, dettagli e contorni rispetto alle matrici precedenti da 16 px. Il renderer SVG legge la dimensione dell’icona, mantenendo le altre icone a 16 px. I vecchi PNG PixelLab restano archiviati e accreditati. Nessuna dipendenza aggiunta o credito consumato.

Id, slot, vincoli di classe, statistiche, inventario, formati di salvataggio e protocollo invariati da questo incremento. Il protocollo 14 resta quello introdotto dall’incremento precedente dell’oro.

## Anteprima e verifiche

Verifica finale `npm run verify`: **840 test in 75 file**, controllo TypeScript client/server e build superati. `git diff --check` senza errori di whitespace.

`/character-animation.html` mostra il compositore effettivo del gioco, maschile e femminile affiancati. Tre classi, quattro slot filtrati per classe, tutte le rarità, destra/sinistra, avanti/indietro rispetto alla mira, riposo/cammino/quattro attivazioni, pausa e cursore dei dodici frame. Pavimento in movimento per giudicare il passo. La pagina non modifica i salvataggi; `/sprite-prototypes.html` conserva il confronto originale e indica la scelta C.

Test su fasi del passo, arretramento, cadenze rapide, prese, pelle non disegnata nelle armi, viso libero durante riposo/cammino, 25 famiglie distinte nei due corpi e palette scure. Tutte le **68 combinazioni di classe × 2 corpi** controllate per rimozione di ogni slot e bordo trasparente nelle pose estreme dei quattro attacchi; tutti i dodici frame di cammino e attivazione del proprio slot controllati anche per ogni famiglia singola. Test storici di salvataggi e composizione conservati. Mutazioni temporanee della fase del piede, della presenza dell’arma e della profondità rilevate dai test, poi sorgenti ripristinati.

Controllo tecnico Edge headless, profilo temporaneo isolato: tre classi e due corpi, cambio delle primarie, pausa sul frame corrente, animazione e pagina a 390 px senza overflow; icone e tavola di equipaggiamenti/fotogrammi ispezionate. Poi ingresso tramite UI nell’HUB e nella discesa con tre profili fittizi, movimento e attacco senza eccezioni JS. Questi sono controlli automatici e fotogrammi renderizzati, **non una prova giocata dell’utente**.

Da confermare giocando: sensazione del passo avanti/indietro, ritmo di tiro/fendente, leggibilità su ogni mappa, cambio dei quattro slot nei due corpi e resa in cooperativa. Nessun commit o push.
