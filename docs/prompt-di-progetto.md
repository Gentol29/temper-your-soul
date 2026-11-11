# Temper your soul: prompt di progetto

Documento d'ingresso per chi lavora sul ramo `feature/lavoro-personale` (fork `hocosaproduzione-dotcom/temper-your-soul`), persone o agenti AI. Raccoglie visione, analisi di game design, piano a incrementi, regole su risorse e licenze e il flusso di lavoro.

**Stato:** proposta di un collaboratore, scritta il 31 ottobre 2026 sulla base del commit `0a6e5f6`. Le decisioni di design restano del proprietario del progetto (Jabbaz): ciò che qui è "proposta" diventa decisione solo quando viene approvato e riportato in [game-design.md](game-design.md). In caso di contrasto valgono [README.md](../README.md), [CLAUDE.md](../CLAUDE.md) e [AGENTS.md](../AGENTS.md).

---

**Grafica vigente · 10 novembre 2026:** il [canone PixelLab](canone-grafico.md) sostituisce i precedenti riferimenti artistici. Il contesto del ramo e le proposte storiche sotto non cambiano questa direttiva.

## 1. Prompt da dare a un agente

Copiare il blocco seguente all'inizio di una sessione con un agente (Claude, Codex o altro):

```text
Lavori su "Temper your soul", gioco d'azione 2D per browser in TypeScript strict (Canvas 2D + DOM, nessun motore,
nessuna dipendenza a runtime). Repository principale: Jabbazz/temper-your-soul (proprietario: Jabbaz). Tu lavori sul
fork hocosaproduzione-dotcom/temper-your-soul, ramo feature/lavoro-personale, cartella
C:\Users\egeno\Downloads\temper-your-soul-lavoro. Il remoto `origin` e' il progetto di Jabbaz (solo lettura), `fork` e'
il fork (pubblicazione).

Prima di tutto:
1. Leggi README.md («Prima di lavorare»), CLAUDE.md, AGENTS.md, docs/prompt-di-progetto.md, docs/game-design.md,
   docs/roadmap.md, docs/bugs.md.
2. `git status`, ramo corrente, `git fetch origin` e confronta con origin/main: se Jabbaz ha pubblicato novita',
   integrale con `git merge origin/main` (mai reset, rebase forzati o force push) e riesegui `npm run verify`.
3. Comunica in italiano cosa hai capito e quale incremento farai; aggiorna l'utente spesso (circa ogni minuto di lavoro).

Regole:
- Piccoli incrementi, gioco avviabile a ogni passo, `npm run verify` con codice 0 alla fine di ognuno.
- Simulazione deterministica: niente DOM, tempo reale o Math.random in `Match` e nelle regole; dati, comportamento e
  rappresentazione separati; gli effetti e l'audio ascoltano i `GameEvent`.
- Valori di gioco sempre provvisori, in tabelle con nome; non inventare decisioni sui punti aperti: proponile.
- Grafica: leggi docs/canone-grafico.md e usa tys-grafica-pixellab. Solo PixelLab MCP per sprite, tile, immagini e UI;
  top-down 2D, frame/tile 64x64, otto direzioni, primaria destra e secondaria sinistra anatomiche, equipaggiamento modulare.
  Se PixelLab manca, consiglia al collaboratore di collegare l'MCP integrato prima di produrre asset. Questa direttiva non avvia generazioni.
- Audio esterno: solo registrazioni vere CC0, pubblico dominio o CC BY, con crediti. Grafica solo PixelLab secondo il canone;
  font approvati conservati, provenienza e termini degli output nei crediti.
- Chiedi all'utente prima di scaricare file (nome, fonte, dimensione), prima di commit, push e pull request.
- Aggiorna design, roadmap e bug quando cambia qualcosa; distingui sempre verifiche automatiche, prove nel browser
  fatte da te e prove manuali dell'utente (queste ultime solo se l'utente le dichiara).

Fatto = codice + test significativi (provati con una mutazione) + verify verde + prova nel browser per la UI +
documentazione aggiornata + elenco di cio' che resta da provare a mano.
```

Le skill di progetto in `.claude/skills/` (sezione 8) automatizzano i flussi ricorrenti.

---

## 2. Visione

**Temper your soul** è un *boss rush* d'azione con visuale dall'alto: ogni dungeon è un duello contro un boss leggibile ma esigente, e l'equipaggiamento *è* il personaggio, perché ogni pezzo porta con sé un'abilità. "Temprare" è il processo del fabbro: fuoco, martello, acqua. Il giocatore torna nello stesso fuoco più volte e ne esce più forte, nell'equipaggiamento e nell'abilità delle mani.

Pilastri proposti, da usare come filtro per ogni nuova idea:

1. **Ogni scontro è un esame onesto.** Attacchi annunciati, schivabili e imparabili; la sconfitta deve sembrare colpa propria, mai del gioco.
2. **L'equipaggiamento è il personaggio.** Quattro slot, quattro abilità: le scelte di build devono cambiare davvero il modo di combattere.
3. **La tempra.** Progressione che premia la perseveranza: anche una vittoria senza bottino deve lasciare qualcosa.
4. **Atmosfera coerente.** Grafica e palette del canone PixelLab, suoni veri e dettagli leggibili nel mondo top-down.

---

## 3. Analisi da game designer: cosa manca

Gravità: **A** = manca un pezzo del ciclo di gioco; **M** = qualità percepita; **B** = rifinitura. "Decide Jabbaz" indica le proposte che toccano regole o punti aperti del design.

### 3.1 Ciclo di gioco e progressione

| Cosa manca | Perché conta | Proposta | Grav. | Decide Jabbaz |
| --- | --- | --- | --- | --- |
| Un significato meccanico di "tempra" | Il nome promette un sistema che oggi non esiste | **Braci dell'anima**: ogni vittoria dà braci (più nei dungeon alti), anche senza bottino. Alla **Forgia** si spendono per alzare il *livello oggetto* (1–20), che esiste già e già alimenta il GS e le soglie T3/T4. Costo crescente con livello e rarità | A | Sì |
| Protezione dalla sfortuna | Il drop è al 25% senza garanzie: lunghe serie a vuoto frustrano | Contatore di "pietà": dopo N vittorie consecutive senza oggetto il prossimo è garantito (N provvisorio, per esempio 6). Mostrato nella scheda del dungeon | A | Sì |
| Morte con conseguenze | Il README lo indica come prossimo incremento | Due opzioni da presentare: personaggio *Temprato* (perde braci non spese) o *Fragile* (permadeath, ricompense maggiori), scelta alla creazione | A | Sì, già in agenda |
| Rigiocabilità oltre T4 | Finito il ghiacciaio non resta un obiettivo | **Gradi di tempra** per dungeon (I–X): il boss guadagna modificatori (vita, velocità, uno schema in più) e il bottino migliora. **Prova del giorno**: seme fisso per data (la simulazione è già deterministica) e record locale | M | Sì |
| Crescita del personaggio con il livello | Il livello oggi non dà nulla | Ogni livello dà un punto in tratti dell'anima (vita, rigenerazione mana, durata dell'invulnerabilità), con tetti bassi | M | Sì |

### 3.2 Combattimento e sensazione

| Cosa manca | Proposta | Grav. |
| --- | --- | --- |
| Colpi poco "sentiti" | Lampo bianco sul boss colpito, micro-pausa sui colpi pesanti (solo nella rappresentazione, la simulazione resta a passo fisso), numeri del danno che crescono con l'entità | M |
| Movimento a scatti oltre i 60 Hz e camera che mostra il vuoto oltre i muri | Interpolare il disegno tra i passi; limiti morbidi della camera (ricalcolando la mira, vedi `bugs.md`) | M |
| Boss prevedibili | Rotazione degli schemi casuale pesata senza ripetizioni, con l'`Rng` della partita (deterministica). I test che controllano l'ordine vanno adattati | M |
| Boss che si incastra dietro un pilastro | Aggiramento semplice degli ostacoli (*steering*) prima di un pathfinding completo | M |
| Nessuna ricompensa per l'aggressività | Barra di *stordimento* del boss: i colpi la riempiono, piena apre 2–3 s di vulnerabilità. Dà un ruolo ai colpi pesanti | B, decide Jabbaz |
| Furia annunciata solo dal testo | Segnale audio e visivo della furia (gong, bagliore, scossa); tacca del 50% sulla barra del boss | B |

### 3.3 Contenuti e build

| Cosa manca | Proposta | Grav. |
| --- | --- | --- |
| Solo 4 tipi di effetto (proiettile, zona, scatto, colpo ravvicinato) | Nuovi tipi generici in `SkillEffect`: **raggio** canalizzato, **catena** tra bersagli, **trappola** a terra, **barriera** che assorbe un colpo, **evocazione** di un alleato temporaneo. Ognuno apre famiglie nuove per tutte e tre le classi | M |
| Slot passivi (anello, collana) già nei punti aperti | Modificatori delle skill (perforazione, rimbalzo, +1 proiettile, costo mana ridotto) invece di statistiche nude | M, decide Jabbaz |
| Un solo nemico per scontro | Servitori occasionali in alcuni schemi (ad esempio i funghi della Madre delle spore) per variare il ritmo | B |
| Quinto dungeon | Sale dell'Eco (tema suono e specchi) o Abisso della brace (verticale, lava che sale): si aggiunge con la ricetta dei dungeon e la skill `tys-nuovo-dungeon` | B |
| Lore assente | Codice/bestiario sbloccabile: una pagina per boss e set, scritta come iscrizione del reliquiario | B |

### 3.4 Grafica

Usare esclusivamente [canone-grafico.md](canone-grafico.md) e la skill `tys-grafica-pixellab`. Le vecchie tavole, ricette e proposte grafiche sono superate. Lotti di sprite modulari 64×64 e nemici in otto direzioni, tile seamless 64×64 e moduli UI passano tutti da PixelLab MCP. Nessuna generazione è avviata da questo prompt. Font approvati conservati.

### 3.5 Audio (primo incremento di questo ramo)

Prima di questo ramo esistevano solo quattro toni sintetizzati per i lanci e uno per i colpi subiti, spenti all'avvio, senza musica né ambiente. Obiettivo (incrementi 1 e 2 fatti, vedi `roadmap.md`):

- **Motore audio a canali** (generale, musica, effetti, ambiente, interfaccia) con volumi salvati, musica con dissolvenza incrociata, limiti di voci simultanee, posizione stereo rispetto al giocatore, funzionante sia da server (Web Audio) sia da `file://` (elementi `<audio>`).
- **Catalogo dei suoni guidato dai dati:** ogni skill, zona ed evento del boss è associato a un suono per *materiale* (arcano, fuoco, ghiaccio, natura, arco, lama, scatto). Un oggetto nuovo eredita il suono dal materiale e un test obbliga a dichiararlo.
- **Musica per contesto:** menu, un brano per dungeon, uno per la furia, stacchetti di vittoria e sconfitta.
- **Solo registrazioni vere con licenza libera**, con crediti visibili nel gioco.

### 3.6 Interfaccia, accessibilità, piattaforme

| Cosa manca | Proposta |
| --- | --- |
| Impostazioni | Pannello unico: volumi, intensità della scossa, lampi ridotti, numeri del danno, rimappatura dei tasti |
| Confronto tra oggetti | Tooltip con differenze rispetto al pezzo equipaggiato (danno, ricarica, mana, GS) |
| Capire perché si è morti | Riepilogo della sconfitta: schemi che hanno colpito e quanto |
| Primo avvio | Arena d'allenamento con un manichino e indicazioni dei comandi |
| Daltonismo | Segnali d'attacco riconoscibili anche dalla forma, non solo dal colore |
| Controller e touch | Gamepad API (l'input passa già da azioni astratte); touch in un secondo tempo |
| Prove di gioco a distanza | Anteprima del fork pubblicata con GitHub Pages a ogni push del ramo, così Jabbaz prova le proposte senza installare nulla |
| Salvataggi | Esportazione e importazione del salvataggio in un file |

---

## 4. Piano a incrementi (proposta)

Ordine pensato per non pestare i piedi al lavoro di Jabbaz: prima le parti nuove o poco toccate (audio, strumenti), poi le proposte che richiedono il suo consenso.

| # | Incremento | Fatto quando | Richiede consenso |
| --- | --- | --- | --- |
| 1 | **Motore audio e impostazioni** | Catalogo, regia, canali, volumi salvati, pannello Audio con crediti, test; nessun cambiamento alla simulazione | No |
| 2 | **Registrazioni vere** scelte dalle fonti libere, scaricate, convertite e registrate nei crediti. **Primo lotto fatto** (31.10.2026); secondo lotto proposto in `risorse-libere.md` | Ogni evento importante ha un suono, ogni dungeon una musica; crediti completi; peso totale ragionevole | Download: sì (utente) |
| 3 | **Sensazione di colpo**: lampo, numeri, barre con memoria, fase II, schermate finali, servitori. **Fatto** (ramo `feature/combattimento-e-vittoria`, vedi `studio-combattimento-e-vittoria.md`); restano interpolazione e limiti della camera | Prova manuale: colpi più leggibili, nessun peggioramento della mira | Servitori: sì |
| 4 | **Impostazioni e accessibilità** | Pannello completo, rimappatura, gamepad | No |
| 5 | **Tempra e pietà del bottino** | Regole approvate in `game-design.md`, formato di salvataggio migrato, test | **Sì** |
| 6 | **Morte e permadeath** | Regole approvate, migrazione, test | **Sì** (già in agenda) |
| 7 | **Nuovi tipi di skill e quinto dungeon** | Passano i test generici dei dungeon e degli oggetti | Sì per i valori |
| 8 | **Grafica: luce, particelle, tipografia** | Lotto richiesto e approvato secondo il canone PixelLab | **Sì** |
| 9 | **Pubblicazione**: anteprima su GitHub Pages, eventuale PWA | Link stabile di prova | Sì |

---

## 5. Regole su risorse e licenze

1. **Audio e font:** CC0, pubblico dominio, CC BY 3.0/4.0 (crediti obbligatori), OFL per i caratteri. Per la grafica valgono provenienza e termini PixelLab secondo il canone. **Escluse:** NC, ND, "solo uso personale", licenze poco chiare, pagine che contraddicono il file scaricato. Nel dubbio si scarta.
2. **Niente IA generativa per audio e musica.** La grafica nuova e i ritocchi usano esclusivamente PixelLab MCP. L'audio deve essere **registrato** (strumenti veri, orchestra, coro, field recording, foley).
3. **Ogni file ha i crediti** nel catalogo: titolo, autore, fonte, licenza, data di consultazione. Un test fallisce se un file non ha crediti. I crediti CC BY sono visibili nel gioco (pannello Audio).
4. **Peso:** effetti in mp3 mono 96–128 kbps (pochi KB l'uno); musiche in mp3 stereo 128 kbps, preferibilmente sotto i 3 MB. Le musiche partono solo quando servono.
5. **Funzionamento da `file://`:** niente CDN né richieste di rete in gioco; i file stanno in `src/assets/` e Vite li copia nella build.
6. Prima di scaricare si chiede all'utente (nome, fonte, dimensione). Fonti e candidati in [risorse-libere.md](risorse-libere.md).

---

## 6. Flusso di lavoro con il progetto di Jabbaz

```
lavoro qui ──► ramo feature/… sul fork ──► pull request verso Jabbazz/temper-your-soul:main ──► revisione di Jabbaz ──► unione
```

- **Aggiornarsi:** `git fetch origin` e poi `git merge origin/main` sul proprio ramo. Il `git pull` del ramo scarica dal fork, non da Jabbaz.
- **Un ramo per proposta** (`feature/audio`, `feature/tempra`, …): richieste piccole sono più facili da rivedere. Il primo giro di lavoro (correzioni dei bug, prompt di progetto, audio) è stato proposto insieme dal ramo `feature/lavoro-personale`, in commit separati.
- **Commit** in italiano, descrittivi, solo con l'autorizzazione dell'utente; mai force push.
- **Pull request** con descrizione: cosa cambia, perché, verifiche fatte, cosa provare a mano, decisioni richieste a Jabbaz.

---

## 7. Strumenti per agenti

### Skill di progetto (`.claude/skills/` e `.agents/skills/`)

| Skill | Quando |
| --- | --- |
| `tys-collabora` | Operazioni Git richieste: sincronizzazione, commit/push autorizzati e PR; remoti ricavati dalla copia corrente |
| `tys-risorse-libere` | Cercare, valutare, scaricare (con permesso), convertire e registrare audio o caratteri |
| `tys-grafica-pixellab` | Produrre grafica con PixelLab MCP secondo il canone top-down 64×64, modularità, otto direzioni e palette condivisa |
| `tys-nuovo-dungeon` | Aggiungere un dungeon con mappa, boss, tema, bottino e test |
| `tys-nuova-famiglia` | Aggiungere una famiglia di oggetti (skill, classe, icona, suono, bottino, test) |

### Connettori

- **GitHub:** la riga di comando `gh` è autenticata con l'account `hocosaproduzione-dotcom` (scrittura sul fork, lettura sul progetto di Jabbaz). Basta per rami, pull request e controlli; non serve un altro connettore.
- **Ricerca di risorse:** `tools/cerca-risorse.mjs` interroga l'API pubblica di Openverse (nessuna chiave) filtrando per licenza e restituisce titolo, autore, licenza e fonte. Freesound offre un'API migliore per l'audio ma richiede una chiave personale: va creata dall'utente se servirà.

---

## 8. Definizione di "fatto" per ogni incremento

1. Codice coerente con le convenzioni (TypeScript strict, file in kebab-case, testi in italiano, identificatori in inglese).
2. Test significativi, ognuno provato con una mutazione che lo fa fallire.
3. `npm run verify` con codice 0.
4. Per la UI: prova nel browser (desktop e 390 px), senza errori in console.
5. `docs/` aggiornati: decisioni, bug, roadmap e crediti.
6. Messaggio finale: cosa è cambiato, verifiche, limiti, prova manuale da fare, decisioni richieste a Jabbaz.
