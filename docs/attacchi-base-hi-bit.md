# Attacchi base Hi-bit e premi leggibili · 3 novembre 2026

Richiesta dell’utente: togliere soltanto le particelle durante le primarie delle tre classi, conservando le altre aggiunte; animazioni locali Hi-bit per fendente, freccia/onda del tiro e proiettili elementali del Mago; testi oro/XP più grandi senza sostituire il font. Il checkout originale contiene un lavoro in corso sulla camera: incremento isolato nella worktree e nel ramo `codex/vfx-attacchi-hi-bit`, base iniziale `319950a` di main. Versione locale di avvio del feature **v0.10.01**, senza commit/push.

## Particelle e animazioni

`basic-attack-visuals.ts` identifica gli aspetti delle sette famiglie primarie, inclusi gli id storici. Il filtro esclude solo lo scoppio al lancio di `CombatVfx`, quello del ripiego, lo sbuffo della provocazione emesso a ogni fendente e le particelle della scia di volo dei proiettili primari del giocatore. I punti della scia restano disponibili al renderer di ripiego. Impatti, sangue, morte, parate, buff, stati, scatti, pet, secondarie e proiettili nemici conservano emissioni e dinamica precedenti.

`basic-attack-art.ts` disegna sette sprite a dodici pose, con pixel interi e palette esplicite:

- Fendente: taglio curvo continuo con dorso carbone, fascia cremisi, acciaio e filo chiaro. Raggio del raster entro 48 px dal pivot; conserva scala, direzione, ancoraggio al proprietario e clipping nel settore reale. Nessuna hitbox o particella aggiunta.
- Freccia: asta, punta metallica e impennaggio cremisi articolato. Onda di rilascio ellittica attorno ai piedi dell’Arciere, 0,24 s, ancorata al proprietario anche remoto. Mantiene la prospettiva del pavimento indipendentemente dalla mira. L’onda è solo visiva.
- Fuoco: cometa con lingue di fiamma collegate e nucleo caldo; acqua: goccia sfaccettata con falce orbitante; terra: geode angolare con venatura e anello minerale; vento: tre nastri di vortice attorno al nucleo sottile. Sagome e moto differenti, oltre ai colori.

Gli altri atlanti e le altre particelle restano quelli della v0.10.00. L’onda è un nuovo id nativo `archer-release`, senza PNG storico; i sedici asset PixelLab e i relativi crediti restano disponibili come prima. Il gioco usa i raster locali per queste animazioni, senza generazioni o download. Cache e preparazione graduale degli atlanti conservate.

## Premi e font

XP: **8 → 16 px interni**, distanza fra le quattro righe **12 → 24 unità**. Font sempre **Silkscreen**, grassetto con contorno scuro. La scelta della riga tiene conto dei testi già saliti, così il successivo oro non viene posizionato sugli XP ancora visibili. Durata 1,2 s e ancoraggio sopra il giocatore conservati.

Oro: all’accredito dopo il volo compare `+N oro`, stesso font a **16 px**, colore oro e ancoraggio al destinatario. Il valore proviene dalla consegna effettiva, una sola volta per giocatore vivo. Usa l’evento esistente `reward_taken` con quantità e proprietario, già supportato dal codec; nessuna modifica al protocollo o ai salvataggi. Non aggiunge esplosioni o suoni di bottino. Emissione 0,5 s, volo 0,4 s, probabilità e quantità dei premi invariate.

## Regole per i collaboratori

`AGENTS.md` conteneva Reliquiario e la sospensione dei ritratti, ma mancava una regola esplicita su Hi-bit e nuova palette. Aggiunta la direzione condivisa: pixel interi, contorni, nearest-neighbor, carbone/cenere/grigi con cremisi e rosso fuoco, accenti elementali distinti e luci localizzate. Specificati gli sprite C già scelti, font approvati conservati, premi da almeno 16 px e assenza delle sole particelle delle primarie. `CLAUDE.md` rimanda alla stessa sezione per gli altri agenti. La revisione dei ritratti illustrati resta sospesa.

## Verifiche e prova giocata

`npm run verify`: **849 test in 76 file**, tipi client/server e build superati. Copertura di tutte le primarie di catalogo con e senza asset pronti, lancio reale del Guerriero con evento di provocazione, scie primarie assenti e scie secondarie/nemiche presenti, sangue e morti conservati, onda ancorata e scaduta, dodici pose distinte con bordo trasparente, quattro maschere elementali differenti e filo del fendente entro il raggio previsto. Oro emesso una sola volta, quote personali nel codec, testi mobili da 16 px e separazione fra XP già saliti e oro tardivo.

Mutazioni temporanee che reintroducono particelle al lancio, scie primarie o sprite congelati rilevate dai test; tutti i sorgenti ripristinati. Controllo tecnico con Edge headless e profilo isolato: anteprima dei 17 effetti a desktop/390 px, font Silkscreen caricato e tavola di fotogrammi ispezionata; ingresso nella discesa e attacco delle tre classi su profili fittizi senza eccezioni JavaScript. Sono controlli automatici e immagini renderizzate, non una prova giocata dell’utente.

Anteprima Vite: `/vfx-preview.html`, con XP/oro ingranditi, primarie e particelle di colpo/morte/buff. Da valutare giocando: leggibilità dei tagli e dell’onda sui quattro temi, carattere percepito dei dardi, sovrapposizione dei premi negli sciami e fluidità in cooperativa. Nessuna modifica di danni, ricariche, mana, hitbox, ricompense o tempi di assorbimento.


## Riallineamento a main · PR #12

Su richiesta dell’utente, base del ramo e riferimento locale `main` aggiornati a `3203bbd`, merge della PR #12 `feature/cursore-reliquiario`. Non c’erano commit locali da riprodurre: i 26 file modificati/nuovi sono stati conservati in una copia verificata, la base è avanzata e le modifiche VFX sono state riapplicate con fusione a tre vie. README e changelog uniti preservando cursori e VFX; la voce v0.10.01 è unica e indica i due rami d’origine, come richiesto dalle regole sulle collisioni di versione. Package e lockfile coincidono ora con main a 0.10.1; dipendenze invariate.

Verifica combinata: **862 test in 78 file**, tipi client/server e build superati. Controllo tecnico browser con profilo isolato: scheda Cursore raggiungibile dal menu, colori presenti, cronologia senza duplicati con entrambi i contributi e 17 effetti locali disponibili. Prova giocata ancora necessaria. Modifiche VFX ripristinate come non staged; nessun nuovo commit o push.


## Secondo riallineamento · PR #13

Base del ramo e `main` locale aggiornati a `fb6c600`, merge della PR #13 `feature/ostacoli-cripta`, versione **v0.10.03**. Conservate le 24 modifiche/file locali in una nuova copia verificata e riapplicati i VFX senza conflitti; mantenuti i nuovi ostacoli Hi-bit della cripta e le note 0.10.03/0.10.02. Package, lockfile e prima voce della cronologia coincidono con il nuovo main a 0.10.3. Le note VFX locali restano nella voce 0.10.01 già unita al contributo dei cursori.

Verifica combinata ripetuta: **862 test in 78 file**, tipi e build superati; controllo browser di versione, cursori e 17 effetti locali senza eccezioni. Dipendenze invariate, modifiche locali non staged, nessun nuovo commit o push. Prova giocata dei nuovi ostacoli insieme ai VFX ancora da confermare.

## Integrazione autorizzata in main · v0.11.00

Su richiesta esplicita dell’utente, tutti i file di questo incremento sono predisposti per commit e push diretti a `main`, base aggiornata `fb6c600`. Versione `0.10.3` → `0.11.0` secondo la convenzione delle integrazioni; package, lockfile e nuova prima voce delle note aggiornati insieme. Le note VFX prima locali sono raccolte nella release v0.11.00; le note pubblicate di v0.10.01 tornano a descrivere solo i cursori della PR #12, senza perdere quelle degli ostacoli v0.10.02/v0.10.03. Nessun cambiamento alle dipendenze o al lavoro parallelo della camera.

Verifiche della release prima del push: `npm run verify` superato con **862 test in 78 file**, tipi client/server e build; controllo tecnico browser di v0.11.00, cronologia senza duplicati, scheda Cursore e diciassette effetti in anteprima senza eccezioni. Restano da confermare giocando leggibilità dei fendenti/dardi, intensità dell’onda, premi simultanei e fluidità in cooperativa; nessuna di queste prove è dichiarata manualmente confermata.

## Aggiornamento · 5 novembre 2026

`basic-attack-art.ts` e `hi-bit-atlas.ts` non esistono più: le animazioni descritte qui sopra sono diventate le pose di base
(`tools/arte/vfx/pose/`) dei fogli a fotogrammi rifiniti con il generatore locale. Vedi `docs/vfx-pixellab.md`.
