# PixelLab: personaggi, equipaggiamento e rifugio

> **Archivio grafico · superato il 10 novembre 2026.** Le direzioni artistiche, i formati, le pipeline e le proposte grafiche di questo documento non sono riferimenti per nuovi asset. Usare esclusivamente il [canone PixelLab](canone-grafico.md) e la skill `tys-grafica-pixellab`. Il contenuto sotto conserva lo storico delle implementazioni e delle prove, senza autorizzare nuove produzioni.

Richiesta esplicita del proprietario del 2 novembre 2026: piano iniziale da massimo 39 generazioni, stessa chiave, creazione e integrazione di portale, mercante, fabbro, forgia, basi del personaggio, equipaggiamento e animazioni di movimento. Questa richiesta riapre la revisione degli sprite di gioco, compresa l’area precedentemente assegnata al collaboratore. I ritratti illustrati e il comportamento dell’inventario non sono inclusi.

## Stato effettivo

Repository aggiornato con `git pull --ff-only`: main `5278448`; preparazione sul ramo `codex/sprite-pixellab`. Il servizio ufficiale, interrogato con la credenziale locale protetta, restituisce ancora `subscription.status = trial`, saldo **0,8269385416666992 generazioni**, totale trial 40 e **0 USD** di crediti. Il proprietario ha successivamente confermato di aver letto 39 generazioni utilizzate su 40, non 39 disponibili. Il lavoro di generazione e integrazione è quindi rinviato su sua richiesta fino a nuovi crediti. Il piano resta valido e riutilizzabile; prima di riprenderlo verificare saldo e tariffe effettivi. Nessuna generazione inviata, nessun credito consumato in questo incremento.

Il piano riproducibile è `tools/arte/pixellab-sprites-plan.json`. È preparazione: **nessun nuovo sprite è stato generato o integrato** e nessun rendering è stato sostituito. Non azzerare il ledger precedente per simulare una ricarica.

## Copertura pianificata

| Risorsa | Job massimi |
| --- | ---: |
| Basi maschile e femminile | 2 |
| Portale, mercante con banco, fabbro con incudine, forgia | 4 |
| Camminata delle due basi | 2 |
| Tutte le famiglie equipaggiabili, su griglia condivisa dei due corpi | 25 |
| Animazioni delle quattro strutture/NPC | 4 |
| Riposo delle due basi | 2 |
| Totale pianificato | 39 |

Il numero di job non equivale necessariamente al consumo: le animazioni possono costare più di un’immagine. Verificare tariffe, risposte di fatturazione e saldo prima dell’invio; fermarsi al primo limite fra 39 generazioni addebitate e saldo effettivo. Nessuna ripetizione automatica di richieste dall’esito incerto. Se il costo delle animazioni riduce la copertura, seguire l’ordine del piano senza superare il budget e riportare precisamente ciò che resta.

## Direzione e compatibilità

Stessa linea dei prompt PixelLab del 1 novembre: Fantasy compatto, gotico caldo, contorni prugna scuro, rame antico e riflessi avorio. Trasparenza, niente testo o interfaccia incorporata. Nessuna dipendenza PixelLab nel browser: soltanto PNG locali ottimizzati e metadati.

Il piano prescrive celle 64×64, piedi su (32,58), direzione est/sud-est e specchiatura dell’intera composizione. L’atlante di riferimento 256×256 contiene otto pose maschili e otto femminili. Gli equipaggiamenti devono essere generati come layer registrati su queste pose, non ricavati dalle icone dello zaino. Scudo degli spiriti e Faretra del predatore usano la loro identità attuale, evitando i vecchi talismano/ventaglio.

Prima di integrare: controllare tutte le celle, ancoraggi, prese, trasparenza e separazione degli strati; confrontare entrambi i corpi e ogni famiglia nel movimento. Un prompt non garantisce da solo la vestibilità. Per le pose d’attacco serve controllare anche articolazioni e ordine di profondità: non dichiarare compatibilità per pose non verificate. Mantenere gli sprite attuali come ripiego se il nuovo asset manca o è incompleto.

Le nuove strutture devono sostituire visivamente quelle del rifugio senza cambiare impronte di collisione, distanza di interazione o servizi. Portale 90×32, mercante 58×30, fabbro 90×26, forgia 52×34 unità di impronta; l’altezza dell’illustrazione è separata. Animazioni ancorate ai piedi, profondità ordinata con il personaggio.

## Verifiche dopo la generazione

- Geometria/trasparenza dei PNG, frame non vuoti, nessun taglio e nessun salto dei piedi.
- Copertura delle 25 famiglie e dei due corpi; oggetti rimossi quando non equipaggiati; layer e mani corretti a destra e sinistra.
- Stesso compositore in rifugio, combattimento e anteprima dello sprite; ritratti illustrati conservati.
- Nessun cambiamento a hitbox, danni, economia, salvataggi o protocollo per una modifica solo grafica.
- Crediti PixelLab, manifest, prompt, consumo e changelog aggiornati con gli asset realmente prodotti.
- `npm run verify`, controllo visivo nel browser e successiva conferma giocata del proprietario.
