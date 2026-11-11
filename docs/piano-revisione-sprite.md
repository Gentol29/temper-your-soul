# Piano per la revisione di ritratti e sprite

> **Archivio grafico · superato il 10 novembre 2026.** Le direzioni artistiche, i formati, le pipeline e le proposte grafiche di questo documento non sono riferimenti per nuovi asset. Usare esclusivamente il [canone PixelLab](canone-grafico.md) e la skill `tys-grafica-pixellab`. Il contenuto sotto conserva lo storico delle implementazioni e delle prove, senza autorizzare nuove produzioni.

**Stato:** proposta di `simonragaz87-sudo`, 1 novembre 2026, in attesa della decisione di Jabbaz. Nessuna parte è stata implementata. La revisione resta sospesa finché questo piano non viene approvato, come richiesto dal [README](../README.md) e dalla [roadmap](roadmap.md).

## In sintesi

Correggere layer, agganci e vestibilità dei personaggi **partendo dagli strumenti e dai dati, senza generare nuove immagini**. Ogni fase è una pull request separata, lascia il gioco avviabile e si ferma per la prova visiva. Si ridisegna a mano solo se, dopo le prime fasi, restano difetti, e prima solo su una posa di prova.

## Decisioni richieste a Jabbaz

1. **Ripresa:** la revisione può riprendere secondo questo piano?
2. **Referente:** `simonragaz87-sudo` può prendere in carico l'area?
3. **Criteri:** i criteri di accettazione qui sotto vanno bene? Chi dà l'approvazione visiva finale?
4. **Ambito:** partiamo da ritratti e sprite di combattimento insieme, o prima solo dai ritratti?
5. **Ritocchi manuali:** se si arriva alla fase 5, si possono modificare i PNG approvati? Con quali limiti di stile?

## Il problema

Difetti già registrati in [bugs.md](bugs.md) e nella [roadmap](roadmap.md): vestibilità e offset delle armature, scale e prese delle armi, giunzioni delle gambe, profondità degli strati.

Dalla lettura del codice, le cause probabili sono:

- **Corpo in un'unica immagine:** ogni base è un solo ritaglio (`CLASS_POSES` in `portrait-rig.ts`), quindi un oggetto non può passare tra busto e braccio.
- **Testa e dita come ritagli della base:** `illustrated-portrait.ts` li rimette sopra gli oggetti con un rettangolo e un'ellisse, che possono coprire colletti e impugnature.
- **Ordine dei layer sparso:** i ritratti usano `z-index` in `illustrated-portrait.css`, con testa e mano secondaria a pari valore (4), più l'ordine di inserimento e `dungeon-portrait-layers.ts`. Gli sprite usano l'ordine di disegno in `character-art.ts` e `wearable-draw.ts`.
- **Agganci senza riscontro visivo:** collo, spalle, caviglie e prese sono coordinate scritte a mano e non esiste una vista d'insieme per controllarle.

Queste cause vengono dal codice, non da un controllo visivo sistematico: la fase 1 serve a confermarle.

## Cosa va controllato

Ogni famiglia di oggetti appartiene a una sola classe (`item-classes.ts`), quindi le combinazioni reali sono limitate.

| Classe | Primaria | Secondaria | Armatura | Stivali | Combinazioni complete |
| --- | --- | --- | --- | --- | --- |
| Guerriero | 3 | 1 | 2 | 3 | 18 |
| Arciere | 2 | 1 | 1 | 1 | 2 |
| Mago | 2 | 4 | 3 | 2 | 48 |

- **Ritratti:** 6 pose base, 50 prove con un oggetto singolo (25 famiglie su 2 corpi) e 136 combinazioni complete (68 su 2 corpi).
- **Sprite di combattimento:** 48 fotogrammi per ogni aspetto (riposo, camminata e quattro attacchi, da 8 fotogrammi ciascuno), nelle due direzioni.

## Criteri di accettazione proposti

Da confermare. Il valore in pixel è provvisorio.

**Ritratti**

- Nessun oggetto sospeso: armi impugnate, stivali uniti alla gamba, armature appoggiate su collo e spalle.
- Mani in presa sull'arma con uno scostamento massimo di **2 px** nel riquadro 640×800 (provvisorio).
- Ordine coerente: tunica davanti agli stivali, testa non coperta dal colletto né tagliata dal proprio ritaglio.
- Togliere un oggetto mostra il corpo base nella zona interessata.
- Proporzioni delle armi credibili rispetto al corpo, in entrambi i corpi.

**Sprite di combattimento**

- Camminata, attacchi, mira a destra e a sinistra e lampeggio leggibili, senza strati staccati tra un fotogramma e l'altro.
- Ogni oggetto riconoscibile nel gioco a 48×48.

**Per tutti**

- `npm run verify` termina con codice 0.
- L'approvazione è solo visiva e manuale: test e fotogrammi automatici non la sostituiscono.

## Fasi

| Fase | Lavoro | Risultato | Cambia l'aspetto del gioco? |
| --- | --- | --- | --- |
| 0 | Decisioni di Jabbaz, criteri | Accordo scritto | No |
| 1 | Tavola di controllo con tutte le prove elencate sopra | Elenco dei difetti reali in `bugs.md` | No, solo pagina di sviluppo |
| 2 | Tabella unica dei layer dei ritratti, PNG e SVG | Ordine in un solo punto, senza pari merito | Solo dove l'ordine era sbagliato |
| 3 | Test di riferimento sugli sprite, poi correzione dell'ordine se la tavola lo richiede | Le regressioni diventano visibili | Solo dove la tavola mostra difetti |
| 4 | Editor degli agganci, con esportazione delle coordinate nelle tabelle di dati | Offset e prese corretti | Sì, solo nei dati |
| 5 | Solo se servono ancora: corpo diviso in parti su **una** posa di prova | Confronto prima/dopo per decidere se estendere | Sì, su una posa |

### Fase 1: tavola di controllo

Estende l'anteprima di sviluppo `character-animation.html`, che non fa parte della build di produzione e non tocca i salvataggi. Non modifica il rendering. È il punto di partenza anche per confrontare il prima e il dopo di ogni fase successiva.

### Fase 2: tabella dei layer

Un elenco ordinato, con nome per ogni layer, sostituisce i valori sparsi. Un test verifica che non ci siano pari merito. Dove l'ordine non cambia, il risultato deve restare identico.

### Fase 3: sprite di combattimento

`characterPixels` è una funzione senza browser, quindi può essere confrontata con valori di riferimento nei test headless, prima di modificarla. Il confronto copre ogni oggetto singolo su entrambi i corpi. Non certifica che il risultato sia bello: segnala solo cosa è cambiato.

### Fase 4: editor degli agganci

Strumento di sola sviluppo: punti trascinabili sopra il ritratto e copia delle coordinate. Le correzioni restano in `portrait-rig.ts`, `portrait-armor.ts` e `portrait-layout.ts`, e valgono i test di geometria già presenti.

### Fase 5: corpo diviso in parti

Si separano braccio dietro, busto, gambe, testa e braccio davanti con un ritocco manuale dei PNG esistenti, su una sola posa. Eliminerebbe i ritagli di testa e dita e permetterebbe alle armature di passare tra busto e braccio. Si estende alle altre pose solo con una nuova decisione.

## Alternative valutate

| Alternativa | Motivo per cui non è proposta ora |
| --- | --- |
| Ridisegnare le armature per ogni posa (circa 12 immagini: 6 armature su 2 corpi della propria classe) | Costa più delle altre fasi; ha senso solo se la fase 5 non basta |
| Rigenerare gli asset con l'AI | La roadmap chiede di evitare rigenerazioni successive prima di fissare basi e criteri |
| Ritratti in pixel art con il motore degli sprite | Toglierebbe un sistema, ma cambia la direzione artistica A: decisione di Jabbaz |
| Animazione a scheletro (Spine, DragonBones) | Dipendenza nel browser, che il progetto evita, per ritratti statici |

## Fuori ambito

- Boss, servitori, icone degli oggetti e temi delle mappe.
- Regole di gioco, formato dei salvataggi e protocollo di rete.
- Inventario: resta un lavoro separato.
- Nuove generazioni di immagini.
- Dipendenze nel browser. La direzione artistica A e la UI «C — Reliquiario» restano valide.

## Rischi

- **Lavori in parallelo:** altre aree di `presentation/` cambiano spesso (l'ultima integrazione di stanze e bestiario ha toccato molti file, compreso `draw-actors.ts`, ma non `character-art.ts`, `wearable-draw.ts` o i file dei ritratti). Prima di ogni fase va riallineato il ramo.
- **Tempo:** se la tavola mostra pochi difetti, ci si ferma prima della fase 5. Se ne mostra molti, si decide di nuovo invece di allargare il lavoro.
- **Giudizio visivo:** i criteri lasciano margine di interpretazione. Per questo ogni fase si ferma per la prova manuale.

## Se il piano viene approvato

Si aggiornano la voce sospesa in `roadmap.md` e la nota sulla sospensione nel README, poi si apre la fase 1 su un ramo dedicato.
