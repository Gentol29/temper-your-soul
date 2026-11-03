# Versione del gioco e changelog

Il menu mostra la versione al centro in basso (`v0.02.00`) e il pulsante **Changelog** in basso a sinistra. Il changelog mostra la cronologia completa disponibile in `src/release-notes.ts`, dalla versione corrente alle precedenti. Ogni versione ha data, feature e variazioni di bilanciamento in una sezione espandibile; quella corrente è aperta inizialmente. Non eliminare né nascondere le versioni passate quando si aggiungono nuove note. Questi elementi appartengono solo al menu, mai a dungeon, zaino o combattimento.

## Fonti e formato

- `package.json` è la fonte del numero: `major.minor.patch`, senza zeri iniziali (es. `0.2.0`). Per questo progetto `minor` conta le integrazioni in main e `patch` gli avanzamenti del feature branch: non si sceglie l’incremento in base alla dimensione della feature. `package-lock.json` deve restare allineato.
- Il menu aggiunge `v` e visualizza minor/patch con almeno due cifre: `0.2.0` → `v0.02.00`. Nessuna versione hardcoded nell’HTML.
- `src/release-notes.ts`: prima voce = versione corrente, data, brevi descrizioni in italiano e variazioni numeriche di bilanciamento. Conservare le voci precedenti.
- Il numero del gioco è indipendente da `SAVE_VERSION` e `NETWORK.protocolVersion`: questi cambiano solo quando cambia il rispettivo formato.
- Le note sono incluse nella build: funzionano offline e con `file://`, senza richieste a GitHub o dipendenze browser aggiuntive. Dopo un aggiornamento ricostruire `dist/` e ricaricare le schede.

## Incrementi per branch, commit e merge

La convenzione del progetto è **vA.BB.CC**:

- **A** resta invariato, salvo decisione esplicita del proprietario su una nuova versione maggiore.
- **BB** aumenta di uno per ogni integrazione in `main`, sia merge di una PR sia commit diretto autorizzato. **CC viene azzerato**.
- **CC** aumenta di uno alla creazione di un feature branch e per ogni commit successivo su quel branch, compresi fix, documentazione e commit di sincronizzazione. Il numero centrale resta quello della base main aggiornata.

| Evento | Versione nel gioco | Versione nel package |
| --- | --- | --- |
| Base aggiornata di main | v0.02.00 | 0.2.0 |
| Creazione del feature branch e suo primo commit | v0.02.01 | 0.2.1 |
| Commit successivo sul feature branch | v0.02.02 | 0.2.2 |
| Ulteriore commit sul feature branch | v0.02.03 | 0.2.3 |
| Integrazione in main, anche tramite squash | v0.03.00 | 0.3.0 |
| Nuovo feature branch da quel main | v0.03.01 | 0.3.1 |
| Successivo merge o commit diretto a main | v0.04.00 | 0.4.0 |

Git non salva file alla sola creazione di un riferimento: assegnare `.01` subito nel worktree del nuovo feature branch e registrarlo nel primo commit. Quel primo commit registra l’incremento di creazione; **non incrementare due volte per lo stesso avvio**. Dal secondo commit aumentare CC ogni volta. L’apertura o la modifica del testo di una PR, un push senza nuovi commit e un semplice pull non producono incrementi aggiuntivi. Non creare un commit separato solo per correggere la versione del commit appena preparato: versione, note e modifica vanno insieme.

I branch paralleli possono avere lo stesso numero (es. entrambi v0.03.01): il numero da solo non identifica il branch. Prima di integrarli rileggere main. Se main è già a v0.04.00, il prossimo merge produrrà v0.05.00, indipendentemente dalla vecchia base del feature. Non sovrascrivere note di altre integrazioni né riscrivere commit pubblicati per rinumerarli.

Per la release usare **la versione corrente di main + un incremento BB**, non il numero centrale del feature che potrebbe essere obsoleto. Preparare package, lockfile e note nel risultato dell’integrazione/commit su main e verificarli prima della pubblicazione. Non lasciare in main una versione con CC diverso da zero. Un clic su GitHub non modifica da solo questi file: l’agente deve predisporre l’integrazione con la versione corretta. Non aggiungere poi un secondo commit di release che incrementerebbe nuovamente BB.

### Eccezione puntuale · camera v0.11.01

Il 3 novembre 2026 il proprietario ha autorizzato esplicitamente commit e push della camera dinamica direttamente in main come **v0.11.01** (package `0.11.1`), mantenendo BB=11 e incrementando soltanto CC. Questa eccezione vale per tale incremento e non sostituisce la convenzione generale sopra.

## Procedura obbligatoria per gli agenti

Prima di creare/aggiornare una PR o, quando autorizzato, committare direttamente a `main`:

1. Leggere il diff reale, anche delle regole condivise. Per una PR considerare tutto il diff rispetto alla base; per un commit diretto a main le modifiche di quel commit. Non ricopiare come novità le note della versione precedente.
2. Aggiornare automaticamente versione e note nello stesso cambiamento secondo la tabella sopra. Sul feature usare `npm version patch --no-git-tag-version`; per main impostare esplicitamente il numero calcolato dalla sua ultima versione, per esempio `npm version 0.3.0 --no-git-tag-version`. Questi comandi aggiornano package e lockfile senza creare commit o tag. Non aumentare minor soltanto perché una modifica è una nuova funzionalità: conta il branch di destinazione.
3. A ogni versione del feature aggiungere in testa la nota delle modifiche di quel commit, conservando le precedenti. Aprire la PR non causa un ulteriore aumento. All’integrazione aggiungere la nota della nuova versione main con il riepilogo dell’intero diff della PR, inclusi i numeri di bilanciamento; per un commit diretto descrivere solo quel commit. La prima voce deve sempre corrispondere alla versione del package. Preservare lo storico delle feature e delle release main: se due branch hanno usato lo stesso numero, riunire le note nella stessa voce indicando i branch d’origine, senza perdere descrizioni e senza duplicare la versione nell’array.
4. Scrivere poche frasi concrete ma coprire tutte le modifiche visibili e quelle rilevanti per salvataggi, rete o funzionamento. Per un aggiornamento solo documentale dichiararlo; niente feature o prove manuali inventate.
5. Per modifiche numeriche aggiungere `balanceChanges` con `label`, `before`, `after`, `unit`. Specificare oggetto/skill/boss, rarità e livello o fase quando influenzano il valore. Includere danni, vita, mana, rigenerazione, cooldown, velocità, XP, GS, drop e altri valori effettivamente cambiati. Esempio **ipotetico**, non una modifica attuale: `Dardo · comune, livello 1: 10 → 12 danni`; `Boss · fase II: 3 → 2,5 s`; `Drop: 25 → 20 %`. Per uno scaling modificato descrivere anche la formula e almeno un confronto rappresentativo reale.
6. Se non cambia il bilanciamento lasciare `balanceChanges: []`: l’interfaccia lo indica esplicitamente. Non introdurre variazioni di danno o altre regole per riempire le note.
7. Eseguire `npm run verify`: controlla anche coerenza fra package, lockfile e versione delle note. Includere versione e breve changelog nella descrizione della PR e nel riepilogo per l’utente.

Questa procedura è un obbligo per l’agente, non un hook Git o un’automazione GitHub: un commit fatto fuori da questi agenti non viene descritto da solo. Non autorizza commit, push, tag o pubblicazioni; serve sempre la richiesta esplicita del proprietario.

## Punto di partenza

`v0.02.00` introduce il versioning nel menu. La voce storica `0.1.0` annota l’ultimo aggiornamento precedente (piano sprite, PR #6); non pretende di ricostruire retroattivamente tutte le release del prototipo.

Le modifiche ancora non committate di questo incremento completano quella stessa base iniziale: non si incrementa il numero a ogni salvataggio dei file. La convenzione si applica alla creazione/pubblicazione dei successivi avanzamenti Git.
