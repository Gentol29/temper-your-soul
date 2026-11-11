---
name: tys-grafica-pixellab
description: Produrre o revisionare sprite, equipaggiamenti modulari, tileset, ambienti, immagini, icone, VFX raster e grafica UI di Temper your soul con PixelLab MCP, secondo il canone top-down 64x64. Usare anche per preparare brief e valutare coerenza degli asset; non per solo layout DOM/CSS o audio.
---

# Grafica di Temper your soul con PixelLab

Prima di definire il brief o produrre asset leggere [il canone grafico completo](../../../docs/canone-grafico.md), fonte unica per specifiche, palette, brief comune e accettazione. I vecchi piani e asset non sostituiscono il canone.

## Vincoli da portare in ogni richiesta

- PixelLab MCP per creazione e ritocchi di tutta la grafica, inclusa la UI; niente generatori o editor alternativi né asset grafici di terzi. DOM/CSS, testi reali, rendering e composizione restano codice; font approvati conservati.
- Stile fantasy medievale riconoscibile per classe: tuniche, cuoio, mantelli, bracciali e stivali. Niente jeans/denim, T-shirt, canottiere o dettagli moderni, nemmeno nelle basi modulari.
- 2D top-down ortogonale, pixel netti, nearest-neighbor. Frame di sprite e layer 64×64, tile 64×64; atlanti più grandi con celle della stessa misura. Mappe su griglia seamless, transizioni e angoli compatibili.
- Palette corrente dai file indicati nel canone, con codici hex nel brief. Riutilizzare solo campioni approvati secondo il nuovo canone per vista, proporzioni e luce.
- Personaggi e nemici in otto direzioni; ogni nemico ha attacco e morte animati nelle otto direzioni.
- Corpo ed equipaggiamenti separati: ogni pezzo compatibile cambia l'aspetto in gioco. Condividere pivot, agganci, pose, frame, tempi e profondità fra tutti i layer; non produrre una base diversa per ogni combinazione.
- Primaria nella destra anatomica, secondaria nella sinistra per gli oggetti tenuti in mano. **Arciere: arco a destra e faretra sulla schiena; la sinistra tende la corda.** Non mettere la faretra in mano. Non ottenere direzioni mancanti specchiando l'intera composizione equipaggiata.

- Armi con presa e postura plausibili, derivate da riferimenti anatomici reali: leggere la sezione dedicata del canone. Arciere: destra sull’impugnatura, sinistra sulla corda, arco abbassato/inclinato a riposo; niente arco incollato verticalmente al fianco.
- A riposo, corda dell’arco sopra e corpo in legno/impugnatura sotto: ribaltare solo l’arco e riallineare la sinistra alla corda, conservando mani anatomiche e orientamento del tiro.
- Arciere maschio sempre con cappuccio alzato in ogni vista e frame. Controllare sagoma completa e collegata di busto, cintura, gambe e stivali; niente porzioni cancellate dai ritagli. In NW/N/NE le braccia davanti al torace restano coperte dal mantello. Confrontare gli stessi sprite in HUB, partita e anteprima.

## Esecuzione

1. Distinguere richiesta di specifiche da richiesta di produzione: scrivere un canone o un brief non avvia generazioni. Per un lotto richiesto controllare capacità, costo e saldo; consultare `search_help` per i tool scelti e usare il brief del canone. Non promettere layer registrati o mani corrette solo perché presenti nel prompt.
2. Se PixelLab non è disponibile, avvisare: «Per mantenere il canone del progetto è consigliato usare PixelLab tramite l'MCP integrato. Collega PixelLab prima di produrre nuovi asset grafici.» Continuare con specifiche e codice indipendenti dagli asset; nessun cambio di strumento senza nuova indicazione del proprietario.
3. Per tile nativi 64×64 verificare la modalità Pro e il piano richiesto; non ingrandire tile più piccoli per aggirare il formato. Se manca una capacità, esplicitare il limite prima della produzione interessata.
4. Generare e mostrare i candidati fuori dal repository. Controllare ogni direzione/animazione, composizione dei pezzi e rimozione dei layer, prese corrette e assenza di tagli. Per tile provare ripetizione 3×3, bordi e transizioni in una stanza.
5. Integrare solo risultati approvati esplicitamente, con asset locali, manifest di frame/agganci/palette e provenienza nei crediti. Prompt completi e intermedi restano fuori; mai chiavi o percorsi personali nei file versionati.
6. Dopo integrazione: `npm run verify`, controllo nel browser e riepilogo della prova giocata ancora da fare. Per una sola direttiva validare documentazione e skill senza generare asset. Non cambiare simulazione, slot, hitbox o salvataggi per adattarli alle immagini.
