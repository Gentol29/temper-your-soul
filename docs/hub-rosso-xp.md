# HUB rosso e testi XP · incremento locale 3 novembre 2026

Richiesta del proprietario: indicare gli XP guadagnati uccidendo un mostro con il font Hi-bit già in uso; rifare il portale, più definito e animato in rosso; portare gli elementi dell’HUB verso un dark fantasy cupo, nero/grigio/rosso fuoco. L’immagine allegata «Immagine ChatGPT 3 nov 2026, 00_37_17.png» è un riferimento d’atmosfera e architettura, non una risorsa importata. Tutto il nuovo disegno è raster nel codice; nessun download o credito di generazione.

## XP dopo l’uccisione

Il premio già assegnato da `RoomEncounter.rewardMob` emette l’evento esistente `reward_taken` con `reward: 'xp'`, quantità, posizione del giocatore e destinatario. Correzione richiesta dal proprietario: gli XP compaiono sopra il personaggio e lo seguono mentre cammina, non sul nemico. Copre mob e luogotenenti; autoesplosioni, rimozione dei servitori e scheletri che si rialzano non producono premi aggiuntivi. Il boss finale conserva gli XP e il riepilogo vittoria già previsti.

`Effects` mostra `+N XP` sopra lo sprite del giocatore, a 8 pixel interni, in Silkscreen grassetto e colore avorio caldo, con contorno scuro. Sale e svanisce in 1,2 s seguendo la posizione attuale del destinatario; quattro righe distanziate di 12 unità separano le etichette vicine. Al massimo 48 etichette XP contemporanee, senza eliminare i numeri di danno. In cooperativa ogni client mostra solo la propria quota, anche se a uccidere è un alleato. Nessun nuovo suono di bottino o esplosione luminosa per ogni premio XP. La presentazione non incrementa gli XP.

Valori invariati: T1 4 XP, T2 7 XP, T3 10 XP, T4 14 XP per mob/luogotenente; probabilità e quantità di oro invariate. L’evento XP è già supportato dal codec. L’incremento successivo dell’oro introduce il protocollo 14: [ricompense, lupo e prototipi](ricompense-lupo-prototipi.md). Salvataggi invariati.

## Portale e palette

Il precedente anello ovale è sostituito da un arco a sesto acuto in pietra e ferro: conci separati, archivolto, strombatura nera, colonne con incisioni, pinnacoli, crestina rossa, bracieri laterali e tre gradini con bordi distinti. La cavità non riflette: correnti cremisi si avvitano verso un centro nero, con braci in risalita e rune pulsanti. Ciclo di 32 fotogrammi a 16 FPS, raster 128 × 156 con trasparenza; sagoma e fotogrammi sono memorizzati in cache. Campionamento nearest-neighbor e pixel interi.

`hub-palette.ts` centralizza i colori di carbone, cenere, ferro, cremisi e fuoco. Rimappatura dei materiali dell’HUB: pavimento e bordure, tetti, mattoni, cattedrale, mura, vetrate rosse, casse/deposito, fucina, banco/tendaggi del mercante e dettagli metallici. Luce del portale, torce e forgia nella stessa famiglia rossa. Nessun filtro globale sui personaggi; pelle e sprite/equipaggiamento del giocatore conservati. Impronte solide, coordinate dei servizi, interazione E, camera e servizi restano quelli esistenti. Pannelli e inventario mantengono la direzione Reliquiario.

## Verifiche e prova successiva

`npm run verify`: 821 test in 72 file, tipi e build. Test su premio effettivo nei quattro dungeon, trasporto del premio nel codec, filtro del destinatario, scadenza e assenza di premi per autoesplosioni; font, separazione e limite delle etichette; sagome del portale nella griglia, trasparenza dei bordi, cavità nera, palette rossa, fotogrammi distinti e conservazione alpha/pelle nella rimappatura. Disabilitare temporaneamente l’evento XP o congelare il vortice fa fallire il test pertinente; entrambi i codici originali sono stati ripristinati.

Controllo automatico con Edge headless, profilo temporaneo isolato e stesso `HubRenderer` del gioco: fotogrammi desktop 1440 × 960 e viewport 390 × 844, immagini distinte a tempi diversi, `+4 XP` renderizzato con Silkscreen caricato, nessuna eccezione JavaScript. Non usa i salvataggi reali. Questa è una verifica tecnica dell’agente, non una prova giocata dell’utente.

Da confermare a mano: intensità e ritmo del portale, distinzione fra cornice e cavità, visibilità delle postazioni e movimento davanti/dietro il portale, lettura delle etichette con sciami e danni sovrapposti, XP da un’uccisione alleata in party. Numeri estetici provvisori. Nessun commit o push eseguito; ramo locale `codex/vfx-hi-bit` con i precedenti VFX conservati.
