# Ricompense, lupo e prototipi · 3 novembre 2026

> **Archivio grafico · superato il 10 novembre 2026.** Le direzioni artistiche, i formati, le pipeline e le proposte grafiche di questo documento non sono riferimenti per nuovi asset. Usare esclusivamente il [canone PixelLab](canone-grafico.md) e la skill `tys-grafica-pixellab`. Il contenuto sotto conserva lo storico delle implementazioni e delle prove, senza autorizzare nuove produzioni.

Richiesta del proprietario: XP sopra il giocatore, correzione del lupo inattivo, oro che esce dal mostro e vola al personaggio dopo mezzo secondo; tre coppie di prototipi Hi-bit più scuri, maschile e femminile. Il proprietario ha confermato esplicitamente la preparazione dei prototipi separati dal gioco, dopo la segnalazione dell’area assegnata a simonragaz87-sudo. Nessuna sostituzione degli sprite/ritratti o modifica ai file del compositore assegnati al referente.

## XP e oro

Gli eventi XP contengono la posizione del destinatario; il testo `+N XP` ha un ancoraggio al suo id e segue la posizione corrente anche in cooperativa. Il testo sale rispetto allo sprite per 1,2 s; massimo quattro righe e 48 etichette, font Silkscreen a 8 pixel interni. Nessun cambiamento agli XP assegnati.

L’oro conserva il 70% di probabilità di uscire da ogni mob/luogotenente e le quantità T1/T2/T3/T4 di 3/6/9/12. Cambia la raccolta: raggio di prossimità 30 unità → assorbimento automatico per ogni superstite, senza requisito di distanza. Nessun mucchio, luce, etichetta o icona sulla minimappa resta nel punto della morte.

Fasi sincronizzate dalla simulazione: 0–0,5 s, le monete emergono dal corpo con dispersione/sollevamento e comparsa graduale; da 0,5 a 0,9 s volano verso la posizione corrente del giocatore; a 0,9 s si assorbono e il premio viene assegnato una sola volta. Durata del volo 0,4 s e tarature estetiche provvisorie in `MOB_REWARDS`/`GOLD_ART`; i 0,5 s prima dell’attrazione sono richiesti dal proprietario. L’oro in viaggio si chiude all’uscita dalla stanza per non perdere consegne già emesse. Un personaggio KO non incassa nuove quote; nessun premio per autoesplosione o rimozione dei nemici.

L’età delle monete viaggia nella vista della stanza: **protocollo 13 → 14**, riavviare server cooperativo e ricaricare tutti i client. Salvataggi e valori economici invariati.

## Lupo dell’Arciere

Difetto riprodotto: `pet.target === null` impediva di scegliere il vicino, quindi dopo l’evocazione o un intervallo senza prede il lupo aspettava un marchio. Ora acquisisce autonomamente il vicino e cancella il vecchio id quando non c’è più un bersaglio valido. Priorità al marchio, poi alla preda precedente, poi al vicino.

Acquisizione distinta dal salto: prima cercava nel raggio di salto di 180 unità e solo con bersaglio precedente; ora raggio di acquisizione provvisorio **480 unità**. Il salto dopo un’uccisione conserva le 180 unità, il movimento rispetta ancora massicci, pilastri e pozzi. Danno base 22 HP/morso, intervallo 0,7 s, velocità 340 unità/s e durata base 20 s invariati, con la scalatura di rarità esistente. Descrizione della skill aggiornata.

## Tre coppie di prototipi

Pagina di sviluppo con Vite: `/sprite-prototypes.html`. Prototipi raster reali con corpo su griglia 48 pixel, con maschile/femminile, scala nativa e ingrandimento nearest-neighbor, fondo del pavimento dell’HUB. La revisione animata usa un frame 64×64 con 8 pixel di margine per le armi. Scelta fra Guerriero, Arciere e Mago; riposo, cammino e attacco animati. Nessun salvataggio e nessuna dipendenza o generazione a pagamento.

- **A · Ferro e cenere:** piastre grigie scure, mantello corto cremisi, sagoma solida.
- **B · Pellegrino cremisi:** cappuccio, sopravveste rossa scura, mantello e orli consumati.
- **C · Cacciatore d’ombre:** cuoio carbone, sciarpa, spallaccio asimmetrico e sagoma più agile.

Sono proposte isolate in `src/dev/`, non importate dal gioco. Armi ed equipaggiamento di prova; l’adattamento dei 25 oggetti, tutte le animazioni di produzione e l’integrazione seguiranno la scelta dell’utente e il coordinamento con il referente. Pelle naturale in piccole aree, luci sottili e palette carbone/cenere/cremisi; nessun filtro globale sul personaggio corrente.

## Verifiche e conferma ancora necessaria

`npm run verify`: 828 test in 74 file, tipi e build. Test su XP agganciati a un destinatario mobile, oro non assegnato prima del volo e raccolto da lontano una sola volta, quote personali/KO/cambio stanza, età nel codec, emissione invisibile all’origine e convergenza delle monete, lupo senza marchio e acquisizione di nuove ondate, griglie/palette/pose dei prototipi. Mutazioni di ancoraggio XP, attesa dell’oro e selezione del lupo rilevate dai test; sorgenti originali ripristinati.

Controllo tecnico Edge headless con profilo temporaneo isolato: sei sprite distinti per ciascuna delle tre classi, cammino in movimento, pagina a 390 px, XP sopra il giocatore e fotogrammi delle tre fasi dell’oro; nessuna eccezione JavaScript. Non è una prova giocata dell’utente. Prova manuale da fare: lupo su nemici sparsi e ostacoli, assorbimento mentre si corre in singolo/party, lettura degli XP con sciami e scelta A/B/C nelle due versioni. Nessun commit o push.

## Animazioni più ampie · revisione successiva 3 novembre 2026

Feedback dell’utente sulla pagina: micromovimenti poco leggibili. Sostituita la traslazione minima con parti articolate: gambe in due segmenti e ginocchiere, piedi che salgono e falcata da −6 a +6 pixel, oscillazione contrapposta delle braccia, inclinazione del busto e mantelli/capelli con ritardo rispetto al movimento. I piedi in appoggio non ereditano il rimbalzo del busto.

Dodici fotogrammi per ciclo; tarature estetiche provvisorie in `character-prototype-motion.ts`: riposo 8 FPS, cammino 14 FPS, attacco 16 FPS. Fendente del Guerriero con arma portata dietro/sopra la testa, scatto in avanti e chiusura del colpo; Arciere con arco sollevato, corda tirata dal secondo braccio, rilascio e contraccolpo; Mago con mano alzata, carica visibile e spinta del bastone. Le parti sono rasterizzate nella cache mantenendo palette e pixel interi. Il frame passa da 48×48 a 64×64 per dare margine alle armi senza ingrandire il corpo.

La pagina parte in cammino; pausa sul fotogramma corrente e cursore per esaminare tutti e dodici i frame. Scala reale 1× e ingrandimento 3× (2× nei viewport piccoli), sempre nearest-neighbor. Rimangono tre proposte separate con entrambe le versioni e tutte le classi: nessuna integrazione nel gioco prima della scelta.

Verifica aggiornata: **831 test in 74 file**, tipi e build. Test sulle matrici effettive per apertura delle gambe, spostamento e rotazione della lama, tutti i frame di cammino/attacco senza tagli sui bordi nelle 18 combinazioni. Ridurre a zero la falcata o disabilitare la rotazione della lama fa fallire i test; codice ripristinato. Un controllo ha rilevato la spada nascosta dalla testa durante il caricamento: posa rialzata e test superato.

Controllo Edge headless della pagina: pose di preparazione e colpo per ogni classe e le sei anteprime, pausa che conserva il frame, cammino in movimento, desktop e 390 px senza overflow né eccezioni JS; sequenza di fotogrammi ispezionata. Valutazione dell’ampiezza/ritmo da parte dell’utente ancora necessaria; questa verifica non costituisce prova giocata o scelta del prototipo. Nessun commit/push.


## Scelta ricevuta e integrazione successiva

Il 3 novembre l’utente ha scelto la terza opzione e chiesto esplicitamente di usarla nel gioco, correggere la camminata e rifare armi/equipaggiamento come parti modulari. Questa decisione supera l’autorizzazione precedente limitata ai prototipi per il solo ambito degli sprite di gioco. [Incremento C e verifiche](sprite-c-equipaggiamento.md); ritratti illustrati ancora sospesi.
