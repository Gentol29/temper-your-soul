# Ripartizione dei compiti

Chi lavora su cosa in Temper your soul, per evitare che persone e agenti AI modifichino le stesse parti senza saperlo. Va consultato **prima di iniziare qualsiasi lavoro**, insieme a [README.md](../README.md), [CLAUDE.md](../CLAUDE.md) e [AGENTS.md](../AGENTS.md).

## Aree in carico

| Area | Referente | Stato | Dal | Dettagli |
| --- | --- | --- | --- | --- |
| Inventario | simonragaz87-sudo | In carico | 1 novembre 2026 | [Vedi sotto](#inventario) |
| Ritratti e sprite dei personaggi | simonragaz87-sudo | In corso, secondo il [piano](piano-revisione-sprite.md) | 1 novembre 2026 | [Vedi sotto](#ritratti-e-sprite-dei-personaggi) |

Un'area che non compare in tabella non ha un referente: chi vuole lavorarci può prenderla in carico.

## Regole

1. **Prima di modificare file**, controlla se il lavoro tocca un'area in tabella.
2. **Se l'area è in carico a un altro referente**, coordinati con quel referente prima di modificarla. Un agente AI lo segnala all'utente e aspetta la sua decisione, senza procedere da solo.
3. **Se il tuo lavoro tocca solo di passaggio un'area altrui**, tieni la modifica al minimo e segnalala nella descrizione della pull request.
4. **Per prendere in carico un'area**, aggiungi una riga alla tabella e una sezione con i confini, nella stessa pull request o in una dedicata. Quando un lavoro finisce, aggiorna lo stato o togli la riga.
5. **Questo file dice chi lavora su cosa, non cosa si decide.** Regole e design restano decisioni del proprietario del progetto (Jabbaz), come indicato negli altri documenti.

## Dettaglio delle aree

### Inventario

**Referente:** simonragaz87-sudo.

**Comprende** la schermata dell'inventario e il comportamento dello zaino per il giocatore (elenco, ordinamento, tooltip, equipaggiamento dallo zaino, scarto con conferma):

- `src/features/ui/inventory-screen.ts`
- `src/features/ui/inventory-view.ts` e `inventory-view.test.ts`
- `src/features/ui/equipment-actions.ts` e `equipment-actions.test.ts`

**Da coordinare**, perché usato anche da altre parti del gioco:

- `src/features/ui/item-card.ts`: scheda dell'oggetto.
- `src/features/character/character.ts`: inventario ed equipaggiamento del personaggio.
- `src/features/character/save-format.ts`: formato dei salvataggi. Cambiarlo richiede di incrementare `SAVE_VERSION` e gestire la migrazione.

**Non comprende** il catalogo degli oggetti, le tabelle di bottino e il bilanciamento.

### Ritratti e sprite dei personaggi

**Referente:** simonragaz87-sudo. Ambito e fuori ambito sono nel [piano](piano-revisione-sprite.md).

**Comprende** l'aspetto dell'equipaggiamento indossato:

- `src/features/presentation/portrait-rig.ts`, `portrait-armor.ts`, `portrait-layout.ts`, `dungeon-item-portraits.ts`, `dungeon-portrait-svg.ts`
- `src/features/presentation/character-art.ts`, `wearable-draw.ts`, `adventurer-body.ts`
- `src/features/ui/illustrated-portrait.ts` e `.css`, `dungeon-portrait-layers.ts`

**Non comprende** boss, servitori, icone degli oggetti e temi delle mappe.


### Autorizzazione puntuale · sprite C, 3 novembre 2026

Dopo la segnalazione dell’assegnazione a simonragaz87-sudo, l’utente aveva autorizzato soltanto tre coppie di prototipi separati. Successivamente ha scelto esplicitamente **C · Cacciatore d’ombre**, chiedendo di usarlo nel gioco, correggere il passo e rifare gli sprite di armi/equipaggiamento mantenendoli modulari. Questa decisione autorizza il relativo incremento locale sul ramo `codex/vfx-hi-bit`: compositore di gioco, oggetti indossati, icone e anteprima. Ritratti illustrati/PNG, inventario e regole di equipaggiamento restano nell’ambito precedente del referente. Non costituisce approvazione delle altre fasi del piano ritratti. [Incremento](sprite-c-equipaggiamento.md).

### Autorizzazione puntuale · sprite 3D del Mago, 5 novembre 2026

Dopo la segnalazione dell'assegnazione a simonragaz87-sudo e dello stile C, l'utente ha riferito di avere l'autorizzazione di tutti e ha chiesto di procedere in locale. L'autorizzazione è riportata come riferita dall'utente: va confermata dai diretti interessati nella pull request. Vale solo per lo sprite di gioco del Mago (`mage-sprite.ts`, i dati generati e il collegamento nel compositore e in `draw-actors.ts`). Guerriero, Arciere, ritratti illustrati e PNG approvati restano nell'ambito precedente. [Dettagli](sprite-c-equipaggiamento.md#mago-reso-in-3d--5-novembre-2026).
