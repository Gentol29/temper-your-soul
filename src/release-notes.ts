import { version } from '../package.json';

export interface BalanceChange {
  readonly label: string;
  readonly before: number;
  readonly after: number;
  readonly unit: string;
}

export interface ReleaseNotes {
  readonly version: string;
  readonly date: string;
  readonly changes: readonly string[];
  readonly balanceChanges: readonly BalanceChange[];
}

/** Prima voce = aggiornamento corrente; conservare le precedenti per lo storico. Vedere docs/versioning.md. */
const CLASS_ROLES_PREVIEW: ReleaseNotes = {
    version: "0.2.3", date: "2026-11-01",
    changes: [
      "Changelog completo consultabile per versione e data, con le feature e i bilanciamenti precedenti conservati.",
      "Prima taratura dei ruoli: profili e bonus equipaggiamento separati per Guerriero, Mago e Arciere. Valori provvisori, da provare giocando.",
      "Ogni slot concede bonus di classe, moltiplicati per la rarità x1/1,2/1,5/2/3; il livello oggetto continua a influire solo sul GS. Esempio: corazza Guerriero Comune +12 difesa, Leggendaria +36.",
      "Difesa a rendimenti decrescenti: danno ricevuto moltiplicato per 100/(100+difesa). Report ed eventi contano gli HP effettivamente persi.",
      "Frequenza primaria: cooldown diviso per 1+bonus. Potenza abilità: danno moltiplicato per 1+bonus. Gli oggetti mostrano i nuovi bonus nei dettagli.",
      "Attacchi primari del Guerriero e dell’Arciere gratuiti; il Mago continua a spendere mana per tutti i lanci.",
      "Statistiche conservate fra stanze e nella replica visuale. Protocollo 7: riavviare server e ricaricare client; salvataggi invariati.",
      "Oggetti del Guerriero rifatti: primaria a fendente con taunt in raggio e cancellazione dei proiettili ordinari; Scudo degli spiriti con parata singola anche contro il colpo rosso; armature con difesa e rigenerazione; stivali con corsa e urto, fermata dai pilastri.",
      "Mago: staffe con proc elementale al 15%, secondarie elementali, meteora e marea con canalizzazione rallentata, buff della terra e teletrasporto con esplosione immediata. Fuoco brucia, acqua rallenta, terra blocca il movimento ordinario, vento aumenta il danno ricevuto.",
      "Arciere: frecce gratuite che marchiano e penetrano il 35% dello scudo numerico; Faretra del predatore con frequenza e furto vita; armatura che evoca un lupo per 20 s; due cariche di scatto fisico.",
      "Lupo: segue il proprietario, attacca il marchio, salta al prossimo nemico vicino dopo una uccisione. Ogni morso ha il 20% di sanguinamento; il danno periodico dipende da boss, luogotenente o servitore. La rarità scala il danno del morso.",
      "Boss e luogotenenti: colpo speciale rosso da 100 danni base, preparato per 1,1 s, ogni 12 s dopo il primo a 10 s. Supera l’invulnerabilità ordinaria e i fendenti, si evita spostandosi o con la parata dello scudo.",
      "Nuove icone della barra per tutte le abilità di classe; icona oggetto dello scudo e nomi Scudo/Faretra novizi. Effetti persistenti per buff, parata, channeling, marchio, pet e debuff. Nessuna rigenerazione di ritratti o sprite dei personaggi.",
      "Protocollo cooperativo 7: pet, stati, buff, preparazione del colpo speciale e cariche replicati dal server; nessun cambio ai salvataggi o agli id delle famiglie. Anche gli oggetti già posseduti ricevono le nuove abilità.",
    ],
    balanceChanges: [
      {"label": "Guerriero · Vita innata", "before": 100, "after": 150, "unit": "HP"},
      {"label": "Guerriero · Difesa innata", "before": 0, "after": 15, "unit": "punti"},
      {"label": "Guerriero · Mana innato", "before": 100, "after": 60, "unit": "MP"},
      {"label": "Guerriero · Recupero innato", "before": 8, "after": 5, "unit": "MP/s"},
      {"label": "Guerriero · Movimento innato", "before": 177, "after": 170, "unit": "u/s"},
      {"label": "Mago · Vita innata", "before": 100, "after": 90, "unit": "HP"},
      {"label": "Mago · Mana innato", "before": 100, "after": 150, "unit": "MP"},
      {"label": "Mago · Recupero innato", "before": 8, "after": 10, "unit": "MP/s"},
      {"label": "Arciere · Vita innata", "before": 100, "after": 110, "unit": "HP"},
      {"label": "Arciere · Difesa innata", "before": 0, "after": 5, "unit": "punti"},
      {"label": "Arciere · Mana innato", "before": 100, "after": 80, "unit": "MP"},
      {"label": "Arciere · Recupero innato", "before": 8, "after": 6, "unit": "MP/s"},
      {"label": "Arciere · Movimento innato", "before": 177, "after": 195, "unit": "u/s"},
      {"label": "Arciere · Bonus frequenza primaria innato", "before": 0, "after": 10, "unit": "%"},
      {"label": "Guerriero · set Comune livello 1 · Vita", "before": 100, "after": 200, "unit": "HP"},
      {"label": "Guerriero · set Comune livello 1 · Difesa", "before": 0, "after": 40, "unit": "punti"},
      {"label": "Guerriero · set Comune livello 1 · Mana", "before": 100, "after": 60, "unit": "MP"},
      {"label": "Guerriero · set Comune livello 1 · Movimento", "before": 177, "after": 173, "unit": "u/s"},
      {"label": "Mago · set Comune livello 1 · Vita", "before": 100, "after": 95, "unit": "HP"},
      {"label": "Mago · set Comune livello 1 · Difesa", "before": 0, "after": 2, "unit": "punti"},
      {"label": "Mago · set Comune livello 1 · Mana", "before": 100, "after": 200, "unit": "MP"},
      {"label": "Mago · set Comune livello 1 · Movimento", "before": 177, "after": 179, "unit": "u/s"},
      {"label": "Mago · set Comune livello 1 · Bonus danno abilità", "before": 0, "after": 7, "unit": "%"},
      {"label": "Arciere · set Comune livello 1 · Vita", "before": 100, "after": 120, "unit": "HP"},
      {"label": "Arciere · set Comune livello 1 · Difesa", "before": 0, "after": 10, "unit": "punti"},
      {"label": "Arciere · set Comune livello 1 · Mana", "before": 100, "after": 80, "unit": "MP"},
      {"label": "Arciere · set Comune livello 1 · Movimento", "before": 177, "after": 212, "unit": "u/s"},
      {"label": "Arciere · set Comune livello 1 · Bonus frequenza primaria", "before": 0, "after": 20, "unit": "%"},
      {"label": "Lama del guardiano · primaria Comune livello 1", "before": 3, "after": 0, "unit": "MP/lancio"},
      {"label": "Martello della fornace · primaria Comune livello 1", "before": 12, "after": 0, "unit": "MP/lancio"},
      {"label": "Lancia di ghiaccio · primaria Comune livello 1", "before": 8, "after": 0, "unit": "MP/lancio"},
      {"label": "Arco del cacciatore · primaria Comune livello 1", "before": 1, "after": 0, "unit": "MP/lancio"},
      {"label": "Arco di rovi · primaria Comune livello 1", "before": 3, "after": 0, "unit": "MP/lancio"},
      {"label": "Arco del cacciatore · set Comune livello 1 · ricarica primaria", "before": 0.16, "after": 0.13333333333333333, "unit": "s"},
      {"label": "Dardo arcano · set Comune livello 1 · danno effettivo", "before": 19, "after": 20.33, "unit": "HP"},
      {"label": "Mago · set Comune livello 1 · rigenerazione totale", "before": 9.6, "after": 15.1, "unit": "MP/s"},
      {"label": "Guerriero · set Comune livello 1 · rigenerazione totale", "before": 9.5, "after": 6.7, "unit": "MP/s"},
      {"label": "Arciere · set Comune livello 1 · rigenerazione totale", "before": 9.6, "after": 8, "unit": "MP/s"},
      {"label": "Stivali del sepolcro · Comune livello 1 · ricarica", "before": 4.2, "after": 4, "unit": "s"},
      {"label": "Stivali del sepolcro · Comune livello 1 · costo", "before": 18, "after": 10, "unit": "MP"},
      {"label": "Stivali del sepolcro · Comune livello 1 · distanza", "before": 110, "after": 150, "unit": "unità"},
      {"label": "Stivali del sepolcro · Comune livello 1 · invulnerabilità", "before": 0.85, "after": 0.15, "unit": "s"},
      {"label": "Arco di rovi · Comune livello 1 · costo", "before": 3, "after": 0, "unit": "MP"},
      {"label": "Mantello delle canne · Comune livello 1 · danno diretto / morso", "before": 145, "after": 22, "unit": "HP"},
      {"label": "Mantello delle canne · Comune livello 1 · ricarica", "before": 6.2, "after": 24, "unit": "s"},
      {"label": "Mantello delle canne · Comune livello 1 · costo", "before": 24, "after": 25, "unit": "MP"},
      {"label": "Calzari della fornace · Comune livello 1 · ricarica", "before": 4.8, "after": 4, "unit": "s"},
      {"label": "Calzari della fornace · Comune livello 1 · costo", "before": 19, "after": 10, "unit": "MP"},
      {"label": "Calzari della fornace · Comune livello 1 · distanza", "before": 230, "after": 210, "unit": "unità"},
      {"label": "Calzari della fornace · Comune livello 1 · invulnerabilità", "before": 0.25, "after": 0.15, "unit": "s"},
      {"label": "Scudo degli spiriti · Comune livello 1 · danno diretto / morso", "before": 42, "after": 0, "unit": "HP"},
      {"label": "Scudo degli spiriti · Comune livello 1 · ricarica", "before": 2, "after": 8, "unit": "s"},
      {"label": "Scudo degli spiriti · Comune livello 1 · costo", "before": 18, "after": 12, "unit": "MP"},
      {"label": "Egida di brace · Comune livello 1 · danno diretto / morso", "before": 130, "after": 0, "unit": "HP"},
      {"label": "Egida di brace · Comune livello 1 · ricarica", "before": 4.5, "after": 12, "unit": "s"},
      {"label": "Egida di brace · Comune livello 1 · costo", "before": 22, "after": 20, "unit": "MP"},
      {"label": "Stivali del vento · Comune livello 1 · ricarica", "before": 2.4, "after": 3, "unit": "s"},
      {"label": "Stivali del vento · Comune livello 1 · costo", "before": 10, "after": 0, "unit": "MP"},
      {"label": "Stivali del vento · Comune livello 1 · distanza", "before": 200, "after": 170, "unit": "unità"},
      {"label": "Stivali del vento · Comune livello 1 · invulnerabilità", "before": 0.3, "after": 0.22, "unit": "s"},
      {"label": "Lama del guardiano · Comune livello 1 · danno diretto / morso", "before": 55, "after": 36, "unit": "HP"},
      {"label": "Lama del guardiano · Comune livello 1 · ricarica", "before": 0.7, "after": 0.45, "unit": "s"},
      {"label": "Lama del guardiano · Comune livello 1 · costo", "before": 3, "after": 0, "unit": "MP"},
      {"label": "Sudario della cripta · Comune livello 1 · danno diretto / morso", "before": 170, "after": 0, "unit": "HP"},
      {"label": "Sudario della cripta · Comune livello 1 · ricarica", "before": 9, "after": 12, "unit": "s"},
      {"label": "Sudario della cripta · Comune livello 1 · costo", "before": 28, "after": 25, "unit": "MP"},
      {"label": "Faretra del predatore · Comune livello 1 · danno diretto / morso", "before": 38, "after": 0, "unit": "HP"},
      {"label": "Faretra del predatore · Comune livello 1 · ricarica", "before": 2.6, "after": 10, "unit": "s"},
      {"label": "Faretra del predatore · Comune livello 1 · costo", "before": 20, "after": 18, "unit": "MP"},
      {"label": "Stivali del pantano · Comune livello 1 · ricarica", "before": 4.5, "after": 4, "unit": "s"},
      {"label": "Stivali del pantano · Comune livello 1 · costo", "before": 18, "after": 10, "unit": "MP"},
      {"label": "Stivali del pantano · Comune livello 1 · distanza", "before": 90, "after": 170, "unit": "unità"},
      {"label": "Stivali del pantano · Comune livello 1 · invulnerabilità", "before": 0.8, "after": 0.15, "unit": "s"},
      {"label": "Martello della fornace · Comune livello 1 · danno diretto / morso", "before": 160, "after": 60, "unit": "HP"},
      {"label": "Martello della fornace · Comune livello 1 · ricarica", "before": 1.4, "after": 0.75, "unit": "s"},
      {"label": "Martello della fornace · Comune livello 1 · costo", "before": 12, "after": 0, "unit": "MP"},
      {"label": "Corazza della fornace · Comune livello 1 · danno diretto / morso", "before": 360, "after": 0, "unit": "HP"},
      {"label": "Corazza della fornace · Comune livello 1 · ricarica", "before": 7, "after": 15, "unit": "s"},
      {"label": "Corazza della fornace · Comune livello 1 · costo", "before": 30, "after": 25, "unit": "MP"},
      {"label": "Lancia di ghiaccio · Comune livello 1 · danno diretto / morso", "before": 70, "after": 42, "unit": "HP"},
      {"label": "Lancia di ghiaccio · Comune livello 1 · ricarica", "before": 1.1, "after": 0.55, "unit": "s"},
      {"label": "Lancia di ghiaccio · Comune livello 1 · costo", "before": 8, "after": 0, "unit": "MP"},
      {"label": "Proc elementale primaria Mago", "before": 0, "after": 15, "unit": "%"},
      {"label": "Sanguinamento per morso", "before": 0, "after": 20, "unit": "%"},
      {"label": "Sanguinamento boss", "before": 0, "after": 0.15, "unit": "% HP massimi/s"},
      {"label": "Sanguinamento luogotenente", "before": 0, "after": 0.3, "unit": "% HP massimi/s"},
      {"label": "Sanguinamento servitore", "before": 0, "after": 2.5, "unit": "% HP massimi/s"},
      {"label": "Penetrazione scudo delle frecce", "before": 0, "after": 35, "unit": "%"},
      {"label": "Esposizione al vento: bonus danno subito", "before": 0, "after": 20, "unit": "%"},
      {"label": "Meteora Comune: channeling", "before": 0, "after": 0.7, "unit": "s"},
      {"label": "Marea Comune: channeling", "before": 0, "after": 0.5, "unit": "s"},
      {"label": "Movimento durante il channeling", "before": 100, "after": 35, "unit": "%"},
      {"label": "Blink Comune: danno esplosione", "before": 0, "after": 65, "unit": "HP"},
      {"label": "Parata Comune: assorbimento del prossimo colpo", "before": 0, "after": 100, "unit": "%"},
      {"label": "Secondo fiato Comune: difesa aggiuntiva", "before": 0, "after": 40, "unit": "punti"},
      {"label": "Secondo fiato Comune: rigenerazione", "before": 0, "after": 5, "unit": "HP/s"},
      {"label": "Fortezza vivente Comune: difesa aggiuntiva", "before": 0, "after": 65, "unit": "punti"},
      {"label": "Fortezza vivente Comune: rigenerazione", "before": 0, "after": 7, "unit": "HP/s"},
      {"label": "Istinto predatorio Comune: frequenza primaria", "before": 0, "after": 35, "unit": "%"},
      {"label": "Istinto predatorio Comune: furto vita", "before": 0, "after": 15, "unit": "%"},
      {"label": "Patto della terra Comune: difesa aggiuntiva", "before": 0, "after": 20, "unit": "punti"},
      {"label": "Patto della terra Comune: danno abilità", "before": 0, "after": 25, "unit": "%"},
      {"label": "Stivali del vento: cariche", "before": 1, "after": 2, "unit": "cariche"},
    ],
  };

const INTEGER_DAMAGE_PREVIEW: ReleaseNotes = {
    version: '0.3.1', date: '2026-11-01',
    changes: [
      'Danni interi nella simulazione: un solo arrotondamento per difetto dopo rarità, potenza, vulnerabilità, scudi e difesa; nessun ritocco ai soli numeri a schermo.',
      'HP sottratti, eventi e report condividono la perdita intera effettiva, limitata agli HP rimasti. Anche danni periodici e danni subiti seguono la stessa regola; sotto 1 il danno è 0.',
      'Rimosso l’arrotondamento anticipato del danno da rarità: i decimali intermedi vengono conservati fino all’applicazione.',
      'HP e massimi interi; rigenerazione e furto vita accumulano le frazioni internamente, recuperando HP interi senza perdere le piccole cure a 60 Hz. Nessuna riserva accumulata a vita piena.',
      'Report e schermata finale non arrotondano più i totali di danno ricevuti. Corretta anche la nota sulla guarigione, ora effettivamente disponibile.',
    ],
    balanceChanges: [
      { label: 'Dardo di fuoco · set Comune livello 1 · danno effettivo', before: 20.33, after: 20, unit: 'HP' },
      { label: 'Blink esplosivo · set Comune livello 1 · danno effettivo', before: 69.55, after: 69, unit: 'HP' },
      { label: 'Colpo rosso 100 danni · Guerriero con set Comune e difesa 40', before: 100 / 1.4, after: 71, unit: 'HP subiti' },
      { label: 'Dardo di fuoco · set Raro livello 1 · danno finale', before: 29 * 1.105, after: 31, unit: 'HP' },
    ],
  };

export const RELEASES: readonly ReleaseNotes[] = [
{
  "version": "0.7.0",
  "date": "2026-11-02",
  "changes": [
    "Rifugio condiviso con presenza e movimento degli altri giocatori: fino a otto visitatori e quattro membri del party. Il widget Party è disponibile anche nell’HUB e si aggiorna dopo l’accettazione degli inviti.",
    "Il leader seleziona dungeon e modalità dal portale e porta con sé tutti i membri del party; i visitatori restano nel rifugio. Servizi e deposito restano personali.",
    "Interazione E vicino ai giocatori: profilo con statistiche ed equipaggiamento indossato, richiesta di scambio e invito al party. Il profilo remoto non mostra lo zaino.",
    "Scambi con consenso iniziale Sì/No, offerte con sprite e almeno nove slot per lato, conferma finale obbligatoria di entrambi. Ogni modifica dell’offerta azzera le conferme; solo gli oggetti non equipaggiati nello zaino possono essere offerti.",
    "Trasferimenti registrati sul server prima della consegna e ricevute salvate nel profilo locale: le consegne pendenti riprendono alla riconnessione senza duplicare gli oggetti. Conservare il registro server .tools/trade-ledger.json. I profili restano locali al browser, senza account cloud.",
    "Inviti con indirizzo pubblico HTTPS, senza link localhost/LAN. Il comando npm.cmd run tunnel avvia Cloudflare e comunica automaticamente al server il link corrente; restano disponibili PUBLIC_URL e il riconoscimento degli accessi tramite tunnel.",
    "Oro nell’HUB in alto a sinistra con moneta statica e cifra; zaino e impostazioni in alto a destra. Rimosso il conteggio degli oggetti nello zaino. Finestre di consenso e menu delle azioni dei giocatori compatti, nello stile Reliquiario.",
    "Salvataggi v10 con migrazioni preservate e inventari legittimamente vuoti conservati; protocollo cooperativo 12. Riavviare il server e ricaricare tutti i client dopo l’aggiornamento. Nessuna modifica ai valori di combattimento.",
    "Verifica automatica di tipi, test e build; controlli browser di hub condiviso, inviti Cloudflare, depositi privati, scambi e partenza comune. Prova manuale e resa su schermi piccoli ancora da confermare."
  ],
  "balanceChanges": []
},
  {
  "version": "0.6.0",
  "date": "2026-11-02",
  "changes": [
    "Rigenerazione MP ridotta uniformemente del 20%: base delle classi, bonus equipaggiamento e contributo della rarità. Riserve MP invariate; i costi cambiano solo per le primarie del Mago, ora gratuite.",
    "Versione e Changelog ancorati al bordo inferiore della finestra: non scorrono più insieme al menu durante creazione personaggio o ridimensionamento.",
    "Impostazioni unificate dietro un ingranaggio: schede Associazione tasti e Audio, con mixer e crediti conservati.",
    "Quattro comandi skill riconfigurabili da tastiera o mouse, salvati per browser; tasti già assegnati scambiati, ripristino predefiniti, HUD e inventario aggiornati insieme.",
    "Mago: primaria gratuita a ogni rarità, +35% danno diretto e +50% velocità dei proiettili, con gittata invariata. Le spell secondarie, le armature e i teletrasporti mantengono il proprio costo.",
    "Arciere: tempo tra le primarie aumentato del 15%, senza modificare movimento o due cariche dello scatto.",
    "Eliminata la protezione dopo il danno: colpi consecutivi e contatto continuato restano pericolosi. Conservate parata e invulnerabilità concessa dalle skill.",
    "HP dei quattro boss finali triplicati; ripristinato +50% HP per ciascun membro aggiuntivo anche a boss finali e servitori (prima applicato solo ai luogotenenti).",
    "Messaggio party corretto: un disallineamento può richiedere anche aggiornamento e riavvio del server, non soltanto ricarica della pagina.",
    "Progressione dai mob: ogni uccisione assegna XP crescenti con il pericolo T1–T4 e ha il 70% di possibilità di lasciare oro a terra, raccolto avvicinandosi entro 30 unità. Anche i luogotenenti concedono questi premi; autoesplosioni e rimozioni dei servitori non ne concedono.",
    "Oro condiviso fra tutti i personaggi del medesimo salvataggio browser: raccolta e XP salvati durante la run, senza attendere il boss. In cooperativa ogni membro riceve XP interi e può raccogliere la propria quota di ciascun mucchio. Nessun account cloud o permadeath implementato.",
    "Livelli del personaggio: dopo il primo, ogni livello aggiunge 3 HP massimi, 2 MP massimi, 1 difesa e un punto percentuale al moltiplicatore di attacco. Aumento immediato anche durante la stanza e in cooperativa, senza cura o ricarica automatica. Curva XP e ricompense dei boss invariate.",
    "Rifugio cittadino a tutto schermo: selciato, mattoni, abitazioni perimetrali, casse e torce in pixel art; portale animato per scegliere i raid, deposito, mercante, forgia e fabbro con incudine. Movimento con collisioni e suggerimento E accanto al punto vicino; sprite equipaggiato di gioco animato nella mappa.",
    "E riservato alle interazioni e scatto predefinito su Spazio, con migrazione del precedente E e conservazione delle altre associazioni valide. Pulsante con la sola icona dello zaino nell’hub; pannelli e comandi nello stile Reliquiario del menu.",
    "Personaggio e zaino mostrano il ritratto illustrato già usato nell’inventario, statistiche, quattro slot equipaggiati e nove caselle per pagina. Si rimuovono o equipaggiano oggetti nell’hub; il profilo in partita resta consultivo, con pausa solo in singolo.",
    "Deposito personale con 20 caselle persistenti: apertura simultanea di deposito a sinistra e personaggio/zaino a destra. Trascinamento con mouse o tocco nei due sensi, spostamento nelle caselle libere, alternativa con selezione e Sposta. Nessun rimpiazzo di caselle occupate, duplicazione o eliminazione di eccedenze storiche.",
    "Mercante: pezzi Comuni di classe a 30 oro; forgia: pezzi Non comuni delle famiglie iniziali a 120 oro, senza materiali per ora. Fabbro: gradi da +1 a +5, costo 60 × prossimo grado; ciascun grado aggiunge il 5% dei bonus passivi originali dell’oggetto e 2 punti percentuali al moltiplicatore di attacco. Icone, rarità, GS e tooltip condivisi con l’inventario in tutti i servizi. Valori provvisori.",
    "Salvataggio v9: oro del roster, deposito personale e posizioni delle caselle; migrazioni storiche preservate. Protocollo cooperativo 10, con aggiornamenti dei livelli nella stessa stanza: riavviare il server e ricaricare tutti i client.",
    "Verifica: 764 test in 65 file, tipi e build; controllo browser desktop di pannelli, icone, trasferimenti nei due sensi e posizione del deposito conservata dopo ricaricamento. Bilanciamento, prova giocata della versione combinata e resa touch/responsive restano da confermare. Nessuna nuova generazione di ritratti o sprite approvati."
  ],
  "balanceChanges": [
    {
      "label": "Guerriero · Rigenerazione innata",
      "before": 5,
      "after": 4,
      "unit": "MP/s"
    },
    {
      "label": "Arciere · Rigenerazione innata",
      "before": 6,
      "after": 4.8,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Rigenerazione innata",
      "before": 10,
      "after": 8,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Primaria Comune livello 1 · Bonus equipaggiamento",
      "before": 0.5,
      "after": 0.4,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Secondaria Comune livello 1 · Bonus equipaggiamento",
      "before": 1,
      "after": 0.8,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Armatura Comune livello 1 · Bonus equipaggiamento",
      "before": 1.5,
      "after": 1.2,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Stivali Comuni livello 1 · Bonus equipaggiamento",
      "before": 0.5,
      "after": 0.4,
      "unit": "MP/s"
    },
    {
      "label": "Skill proiettile · Comune · Recupero passivo",
      "before": 0.2,
      "after": 0.16,
      "unit": "MP/s"
    },
    {
      "label": "Skill area · Comune · Recupero passivo",
      "before": 0.8,
      "after": 0.64,
      "unit": "MP/s"
    },
    {
      "label": "Skill scatto · Comune · Recupero passivo",
      "before": 0.4,
      "after": 0.32,
      "unit": "MP/s"
    },
    {
      "label": "Skill melee · Comune · Recupero passivo",
      "before": 0.1,
      "after": 0.08,
      "unit": "MP/s"
    },
    {
      "label": "Skill buff · Comune · Recupero passivo",
      "before": 0.6,
      "after": 0.48,
      "unit": "MP/s"
    },
    {
      "label": "Skill evocazione · Comune · Recupero passivo",
      "before": 0.8,
      "after": 0.64,
      "unit": "MP/s"
    },
    {
      "label": "Rarità · Coefficiente aggiuntivo nella formula (1 / moltiplicatore ricarica − 1) × coefficiente",
      "before": 8,
      "after": 6.4,
      "unit": "MP/s"
    },
    {
      "label": "Guerriero · Set Comune livello 1 · Recupero totale",
      "before": 6.7,
      "after": 5.36,
      "unit": "MP/s"
    },
    {
      "label": "Arciere · Set Comune livello 1 · Recupero totale",
      "before": 8,
      "after": 6.4,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Set Comune livello 1 · Recupero totale",
      "before": 15.1,
      "after": 12.08,
      "unit": "MP/s"
    },
    {
      "label": "Boss finali e servitori · Cooperativa · 2 membri · Moltiplicatore HP",
      "before": 1,
      "after": 1.5,
      "unit": "×"
    },
    {
      "label": "Boss finali e servitori · Cooperativa · 4 membri · Moltiplicatore HP",
      "before": 1,
      "after": 2.5,
      "unit": "×"
    },
    {
      "label": "Lanterna dell’ossario · Comune livello 1 · Danno per proiettile",
      "before": 44,
      "after": 59.4,
      "unit": "HP"
    },
    {
      "label": "Lanterna dell’ossario · Comune livello 1 · Velocità proiettile",
      "before": 200,
      "after": 300,
      "unit": "u/s"
    },
    {
      "label": "Lanterna dell’ossario · Comune livello 1 · Durata proiettile",
      "before": 3,
      "after": 2,
      "unit": "s"
    },
    {
      "label": "Arco di rovi · Comune livello 1 · Ricarica primaria",
      "before": 0.5,
      "after": 0.575,
      "unit": "s"
    },
    {
      "label": "Cuore di brace · Comune livello 1 · Danno per proiettile",
      "before": 38,
      "after": 51.3,
      "unit": "HP"
    },
    {
      "label": "Cuore di brace · Comune livello 1 · Velocità proiettile",
      "before": 410,
      "after": 615,
      "unit": "u/s"
    },
    {
      "label": "Cuore di brace · Comune livello 1 · Durata proiettile",
      "before": 1.3,
      "after": 0.866667,
      "unit": "s"
    },
    {
      "label": "Specchio del ghiacciaio · Comune livello 1 · Danno per proiettile",
      "before": 27,
      "after": 36.45,
      "unit": "HP"
    },
    {
      "label": "Specchio del ghiacciaio · Comune livello 1 · Velocità proiettile",
      "before": 540,
      "after": 810,
      "unit": "u/s"
    },
    {
      "label": "Specchio del ghiacciaio · Comune livello 1 · Durata proiettile",
      "before": 1.7,
      "after": 1.133333,
      "unit": "s"
    },
    {
      "label": "Stivali di brina · Comune livello 1 · Danno esplosione",
      "before": 65,
      "after": 87.75,
      "unit": "HP"
    },
    {
      "label": "Bastone arcano · Comune livello 1 · Danno per proiettile",
      "before": 19,
      "after": 25.65,
      "unit": "HP"
    },
    {
      "label": "Bastone arcano · Comune livello 1 · Velocità proiettile",
      "before": 440,
      "after": 660,
      "unit": "u/s"
    },
    {
      "label": "Bastone arcano · Comune livello 1 · Durata proiettile",
      "before": 2.5,
      "after": 1.666667,
      "unit": "s"
    },
    {
      "label": "Arco del cacciatore · Comune livello 1 · Ricarica primaria",
      "before": 0.16,
      "after": 0.184,
      "unit": "s"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Danno per proiettile",
      "before": 23,
      "after": 31.05,
      "unit": "HP"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Velocità proiettile",
      "before": 250,
      "after": 375,
      "unit": "u/s"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Durata proiettile",
      "before": 3,
      "after": 2,
      "unit": "s"
    },
    {
      "label": "Grimorio del gelo · Comune livello 1 · Danno per proiettile",
      "before": 100,
      "after": 135,
      "unit": "HP"
    },
    {
      "label": "Grimorio del gelo · Comune livello 1 · Velocità proiettile",
      "before": 310,
      "after": 465,
      "unit": "u/s"
    },
    {
      "label": "Grimorio del gelo · Comune livello 1 · Durata proiettile",
      "before": 2.5,
      "after": 1.666667,
      "unit": "s"
    },
    {
      "label": "Mantello della meteora · Comune livello 1 · Danno area",
      "before": 210,
      "after": 283.5,
      "unit": "HP"
    },
    {
      "label": "Stivali astrali · Comune livello 1 · Danno esplosione",
      "before": 65,
      "after": 87.75,
      "unit": "HP"
    },
    {
      "label": "Velo di bufera · Comune livello 1 · Danno area",
      "before": 110,
      "after": 148.5,
      "unit": "HP"
    },
    {
      "label": "Staffa arcana · Comune livello 1 · Primaria",
      "before": 2,
      "after": 0,
      "unit": "MP/lancio"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Primaria",
      "before": 5,
      "after": 0,
      "unit": "MP/lancio"
    },
    {
      "label": "Tutte le classi · Invulnerabilità dopo il danno",
      "before": 0.65,
      "after": 0,
      "unit": "s"
    },
    {
      "label": "Guardiano della cripta · Singolo · Entrambe le fasi",
      "before": 1800,
      "after": 5400,
      "unit": "HP"
    },
    {
      "label": "Madre delle spore · Singolo · Entrambe le fasi",
      "before": 2400,
      "after": 7200,
      "unit": "HP"
    },
    {
      "label": "Colosso della fornace · Singolo · Entrambe le fasi",
      "before": 3000,
      "after": 9000,
      "unit": "HP"
    },
    {
      "label": "Custode del ghiaccio · Singolo · Entrambe le fasi",
      "before": 3600,
      "after": 10800,
      "unit": "HP"
    },
    {
      "label": "Mob e luogotenenti · tutti i dungeon · Probabilità di drop oro",
      "before": 0,
      "after": 70,
      "unit": "%"
    },
    {
      "label": "Mob e luogotenenti · T1 Cripta · Esperienza per uccisione",
      "before": 0,
      "after": 4,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T1 Cripta · Oro quando avviene il drop",
      "before": 0,
      "after": 3,
      "unit": "oro"
    },
    {
      "label": "Mob e luogotenenti · T2 Palude · Esperienza per uccisione",
      "before": 0,
      "after": 7,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T2 Palude · Oro quando avviene il drop",
      "before": 0,
      "after": 6,
      "unit": "oro"
    },
    {
      "label": "Mob e luogotenenti · T3 Fucina · Esperienza per uccisione",
      "before": 0,
      "after": 10,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T3 Fucina · Oro quando avviene il drop",
      "before": 0,
      "after": 9,
      "unit": "oro"
    },
    {
      "label": "Mob e luogotenenti · T4 Ghiacciaio · Esperienza per uccisione",
      "before": 0,
      "after": 14,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T4 Ghiacciaio · Oro quando avviene il drop",
      "before": 0,
      "after": 12,
      "unit": "oro"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Vita massima",
      "before": 0,
      "after": 3,
      "unit": "HP/livello"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Mana massimo",
      "before": 0,
      "after": 2,
      "unit": "MP/livello"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Difesa",
      "before": 0,
      "after": 1,
      "unit": "punti/livello"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Moltiplicatore attacco",
      "before": 0,
      "after": 1,
      "unit": "punti percentuali/livello"
    },
    {
      "label": "Fabbro · ogni grado +1…+5 · Aumento dei bonus passivi originali del pezzo",
      "before": 0,
      "after": 5,
      "unit": "%/grado"
    },
    {
      "label": "Fabbro · ogni grado +1…+5 · Bonus al moltiplicatore attacco",
      "before": 0,
      "after": 2,
      "unit": "punti percentuali/grado"
    }
  ]
},
  {
  "version": "0.5.1",
  "date": "2026-11-02",
  "changes": [
    "Rigenerazione MP ridotta uniformemente del 20%: base delle classi, bonus equipaggiamento e contributo della rarità. Riserve MP invariate; i costi cambiano solo per le primarie del Mago, ora gratuite.",
    "Versione e Changelog ancorati al bordo inferiore della finestra: non scorrono più insieme al menu durante creazione personaggio o ridimensionamento.",
    "Impostazioni unificate dietro un ingranaggio: schede Associazione tasti e Audio, con mixer e crediti conservati.",
    "Quattro comandi skill riconfigurabili da tastiera o mouse, salvati per browser; tasti già assegnati scambiati, ripristino predefiniti, HUD e inventario aggiornati insieme.",
    "Mago: primaria gratuita a ogni rarità, +35% danno diretto e +50% velocità dei proiettili, con gittata invariata. Le spell secondarie, le armature e i teletrasporti mantengono il proprio costo.",
    "Arciere: tempo tra le primarie aumentato del 15%, senza modificare movimento o due cariche dello scatto.",
    "Eliminata la protezione dopo il danno: colpi consecutivi e contatto continuato restano pericolosi. Conservate parata e invulnerabilità concessa dalle skill.",
    "HP dei quattro boss finali triplicati; ripristinato +50% HP per ciascun membro aggiuntivo anche a boss finali e servitori (prima applicato solo ai luogotenenti).",
    "Messaggio party corretto: un disallineamento può richiedere anche aggiornamento e riavvio del server, non soltanto ricarica della pagina.",
    "Progressione dai mob: ogni uccisione assegna XP crescenti con il pericolo T1–T4 e ha il 70% di possibilità di lasciare oro a terra, raccolto avvicinandosi entro 30 unità. Anche i luogotenenti concedono questi premi; autoesplosioni e rimozioni dei servitori non ne concedono.",
    "Oro condiviso fra tutti i personaggi del medesimo salvataggio browser: raccolta e XP salvati durante la run, senza attendere il boss. In cooperativa ogni membro riceve XP interi e può raccogliere la propria quota di ciascun mucchio. Nessun account cloud o permadeath implementato.",
    "Livelli del personaggio: dopo il primo, ogni livello aggiunge 3 HP massimi, 2 MP massimi, 1 difesa e un punto percentuale al moltiplicatore di attacco. Aumento immediato anche durante la stanza e in cooperativa, senza cura o ricarica automatica. Curva XP e ricompense dei boss invariate.",
    "Rifugio cittadino a tutto schermo: selciato, mattoni, abitazioni perimetrali, casse e torce in pixel art; portale animato per scegliere i raid, deposito, mercante, forgia e fabbro con incudine. Movimento con collisioni e suggerimento E accanto al punto vicino; sprite equipaggiato di gioco animato nella mappa.",
    "E riservato alle interazioni e scatto predefinito su Spazio, con migrazione del precedente E e conservazione delle altre associazioni valide. Pulsante con la sola icona dello zaino nell’hub; pannelli e comandi nello stile Reliquiario del menu.",
    "Personaggio e zaino mostrano il ritratto illustrato già usato nell’inventario, statistiche, quattro slot equipaggiati e nove caselle per pagina. Si rimuovono o equipaggiano oggetti nell’hub; il profilo in partita resta consultivo, con pausa solo in singolo.",
    "Deposito personale con 20 caselle persistenti: apertura simultanea di deposito a sinistra e personaggio/zaino a destra. Trascinamento con mouse o tocco nei due sensi, spostamento nelle caselle libere, alternativa con selezione e Sposta. Nessun rimpiazzo di caselle occupate, duplicazione o eliminazione di eccedenze storiche.",
    "Mercante: pezzi Comuni di classe a 30 oro; forgia: pezzi Non comuni delle famiglie iniziali a 120 oro, senza materiali per ora. Fabbro: gradi da +1 a +5, costo 60 × prossimo grado; ciascun grado aggiunge il 5% dei bonus passivi originali dell’oggetto e 2 punti percentuali al moltiplicatore di attacco. Icone, rarità, GS e tooltip condivisi con l’inventario in tutti i servizi. Valori provvisori.",
    "Salvataggio v9: oro del roster, deposito personale e posizioni delle caselle; migrazioni storiche preservate. Protocollo cooperativo 10, con aggiornamenti dei livelli nella stessa stanza: riavviare il server e ricaricare tutti i client.",
    "Verifica: 764 test in 65 file, tipi e build; controllo browser desktop di pannelli, icone, trasferimenti nei due sensi e posizione del deposito conservata dopo ricaricamento. Bilanciamento, prova giocata della versione combinata e resa touch/responsive restano da confermare. Nessuna nuova generazione di ritratti o sprite approvati."
  ],
  "balanceChanges": [
    {
      "label": "Guerriero · Rigenerazione innata",
      "before": 5,
      "after": 4,
      "unit": "MP/s"
    },
    {
      "label": "Arciere · Rigenerazione innata",
      "before": 6,
      "after": 4.8,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Rigenerazione innata",
      "before": 10,
      "after": 8,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Primaria Comune livello 1 · Bonus equipaggiamento",
      "before": 0.5,
      "after": 0.4,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Secondaria Comune livello 1 · Bonus equipaggiamento",
      "before": 1,
      "after": 0.8,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Armatura Comune livello 1 · Bonus equipaggiamento",
      "before": 1.5,
      "after": 1.2,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Stivali Comuni livello 1 · Bonus equipaggiamento",
      "before": 0.5,
      "after": 0.4,
      "unit": "MP/s"
    },
    {
      "label": "Skill proiettile · Comune · Recupero passivo",
      "before": 0.2,
      "after": 0.16,
      "unit": "MP/s"
    },
    {
      "label": "Skill area · Comune · Recupero passivo",
      "before": 0.8,
      "after": 0.64,
      "unit": "MP/s"
    },
    {
      "label": "Skill scatto · Comune · Recupero passivo",
      "before": 0.4,
      "after": 0.32,
      "unit": "MP/s"
    },
    {
      "label": "Skill melee · Comune · Recupero passivo",
      "before": 0.1,
      "after": 0.08,
      "unit": "MP/s"
    },
    {
      "label": "Skill buff · Comune · Recupero passivo",
      "before": 0.6,
      "after": 0.48,
      "unit": "MP/s"
    },
    {
      "label": "Skill evocazione · Comune · Recupero passivo",
      "before": 0.8,
      "after": 0.64,
      "unit": "MP/s"
    },
    {
      "label": "Rarità · Coefficiente aggiuntivo nella formula (1 / moltiplicatore ricarica − 1) × coefficiente",
      "before": 8,
      "after": 6.4,
      "unit": "MP/s"
    },
    {
      "label": "Guerriero · Set Comune livello 1 · Recupero totale",
      "before": 6.7,
      "after": 5.36,
      "unit": "MP/s"
    },
    {
      "label": "Arciere · Set Comune livello 1 · Recupero totale",
      "before": 8,
      "after": 6.4,
      "unit": "MP/s"
    },
    {
      "label": "Mago · Set Comune livello 1 · Recupero totale",
      "before": 15.1,
      "after": 12.08,
      "unit": "MP/s"
    },
    {
      "label": "Boss finali e servitori · Cooperativa · 2 membri · Moltiplicatore HP",
      "before": 1,
      "after": 1.5,
      "unit": "×"
    },
    {
      "label": "Boss finali e servitori · Cooperativa · 4 membri · Moltiplicatore HP",
      "before": 1,
      "after": 2.5,
      "unit": "×"
    },
    {
      "label": "Lanterna dell’ossario · Comune livello 1 · Danno per proiettile",
      "before": 44,
      "after": 59.4,
      "unit": "HP"
    },
    {
      "label": "Lanterna dell’ossario · Comune livello 1 · Velocità proiettile",
      "before": 200,
      "after": 300,
      "unit": "u/s"
    },
    {
      "label": "Lanterna dell’ossario · Comune livello 1 · Durata proiettile",
      "before": 3,
      "after": 2,
      "unit": "s"
    },
    {
      "label": "Arco di rovi · Comune livello 1 · Ricarica primaria",
      "before": 0.5,
      "after": 0.575,
      "unit": "s"
    },
    {
      "label": "Cuore di brace · Comune livello 1 · Danno per proiettile",
      "before": 38,
      "after": 51.3,
      "unit": "HP"
    },
    {
      "label": "Cuore di brace · Comune livello 1 · Velocità proiettile",
      "before": 410,
      "after": 615,
      "unit": "u/s"
    },
    {
      "label": "Cuore di brace · Comune livello 1 · Durata proiettile",
      "before": 1.3,
      "after": 0.866667,
      "unit": "s"
    },
    {
      "label": "Specchio del ghiacciaio · Comune livello 1 · Danno per proiettile",
      "before": 27,
      "after": 36.45,
      "unit": "HP"
    },
    {
      "label": "Specchio del ghiacciaio · Comune livello 1 · Velocità proiettile",
      "before": 540,
      "after": 810,
      "unit": "u/s"
    },
    {
      "label": "Specchio del ghiacciaio · Comune livello 1 · Durata proiettile",
      "before": 1.7,
      "after": 1.133333,
      "unit": "s"
    },
    {
      "label": "Stivali di brina · Comune livello 1 · Danno esplosione",
      "before": 65,
      "after": 87.75,
      "unit": "HP"
    },
    {
      "label": "Bastone arcano · Comune livello 1 · Danno per proiettile",
      "before": 19,
      "after": 25.65,
      "unit": "HP"
    },
    {
      "label": "Bastone arcano · Comune livello 1 · Velocità proiettile",
      "before": 440,
      "after": 660,
      "unit": "u/s"
    },
    {
      "label": "Bastone arcano · Comune livello 1 · Durata proiettile",
      "before": 2.5,
      "after": 1.666667,
      "unit": "s"
    },
    {
      "label": "Arco del cacciatore · Comune livello 1 · Ricarica primaria",
      "before": 0.16,
      "after": 0.184,
      "unit": "s"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Danno per proiettile",
      "before": 23,
      "after": 31.05,
      "unit": "HP"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Velocità proiettile",
      "before": 250,
      "after": 375,
      "unit": "u/s"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Durata proiettile",
      "before": 3,
      "after": 2,
      "unit": "s"
    },
    {
      "label": "Grimorio del gelo · Comune livello 1 · Danno per proiettile",
      "before": 100,
      "after": 135,
      "unit": "HP"
    },
    {
      "label": "Grimorio del gelo · Comune livello 1 · Velocità proiettile",
      "before": 310,
      "after": 465,
      "unit": "u/s"
    },
    {
      "label": "Grimorio del gelo · Comune livello 1 · Durata proiettile",
      "before": 2.5,
      "after": 1.666667,
      "unit": "s"
    },
    {
      "label": "Mantello della meteora · Comune livello 1 · Danno area",
      "before": 210,
      "after": 283.5,
      "unit": "HP"
    },
    {
      "label": "Stivali astrali · Comune livello 1 · Danno esplosione",
      "before": 65,
      "after": 87.75,
      "unit": "HP"
    },
    {
      "label": "Velo di bufera · Comune livello 1 · Danno area",
      "before": 110,
      "after": 148.5,
      "unit": "HP"
    },
    {
      "label": "Staffa arcana · Comune livello 1 · Primaria",
      "before": 2,
      "after": 0,
      "unit": "MP/lancio"
    },
    {
      "label": "Scettro tempestoso · Comune livello 1 · Primaria",
      "before": 5,
      "after": 0,
      "unit": "MP/lancio"
    },
    {
      "label": "Tutte le classi · Invulnerabilità dopo il danno",
      "before": 0.65,
      "after": 0,
      "unit": "s"
    },
    {
      "label": "Guardiano della cripta · Singolo · Entrambe le fasi",
      "before": 1800,
      "after": 5400,
      "unit": "HP"
    },
    {
      "label": "Madre delle spore · Singolo · Entrambe le fasi",
      "before": 2400,
      "after": 7200,
      "unit": "HP"
    },
    {
      "label": "Colosso della fornace · Singolo · Entrambe le fasi",
      "before": 3000,
      "after": 9000,
      "unit": "HP"
    },
    {
      "label": "Custode del ghiaccio · Singolo · Entrambe le fasi",
      "before": 3600,
      "after": 10800,
      "unit": "HP"
    },
    {
      "label": "Mob e luogotenenti · tutti i dungeon · Probabilità di drop oro",
      "before": 0,
      "after": 70,
      "unit": "%"
    },
    {
      "label": "Mob e luogotenenti · T1 Cripta · Esperienza per uccisione",
      "before": 0,
      "after": 4,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T1 Cripta · Oro quando avviene il drop",
      "before": 0,
      "after": 3,
      "unit": "oro"
    },
    {
      "label": "Mob e luogotenenti · T2 Palude · Esperienza per uccisione",
      "before": 0,
      "after": 7,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T2 Palude · Oro quando avviene il drop",
      "before": 0,
      "after": 6,
      "unit": "oro"
    },
    {
      "label": "Mob e luogotenenti · T3 Fucina · Esperienza per uccisione",
      "before": 0,
      "after": 10,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T3 Fucina · Oro quando avviene il drop",
      "before": 0,
      "after": 9,
      "unit": "oro"
    },
    {
      "label": "Mob e luogotenenti · T4 Ghiacciaio · Esperienza per uccisione",
      "before": 0,
      "after": 14,
      "unit": "XP"
    },
    {
      "label": "Mob e luogotenenti · T4 Ghiacciaio · Oro quando avviene il drop",
      "before": 0,
      "after": 12,
      "unit": "oro"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Vita massima",
      "before": 0,
      "after": 3,
      "unit": "HP/livello"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Mana massimo",
      "before": 0,
      "after": 2,
      "unit": "MP/livello"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Difesa",
      "before": 0,
      "after": 1,
      "unit": "punti/livello"
    },
    {
      "label": "Personaggio · ogni livello dopo il primo · Moltiplicatore attacco",
      "before": 0,
      "after": 1,
      "unit": "punti percentuali/livello"
    },
    {
      "label": "Fabbro · ogni grado +1…+5 · Aumento dei bonus passivi originali del pezzo",
      "before": 0,
      "after": 5,
      "unit": "%/grado"
    },
    {
      "label": "Fabbro · ogni grado +1…+5 · Bonus al moltiplicatore attacco",
      "before": 0,
      "after": 2,
      "unit": "punti percentuali/grado"
    }
  ]
},
  { version: '0.5.0', date: '2026-11-01', changes: [
    'Corretti gli effetti personali fermi a terra: fendente e parata seguono il proprietario, buff disegnati una sola volta. Vecchi archi, cerchi e barriere esclusi quando gli atlanti sono pronti. Fendente ritagliato nel raggio e arco autorevoli.',
    'Corretta la preda intoccabile nella Caccia della palude: le prede iniziano esposte, conservando fuga ed evocazione. I nemici ordinari mantengono il comportamento originale.',
    'Animazioni PixelLab locali per fendenti, parata, rigenerazione, scatti, proiettili elementali, esplosioni, evocazione e buff delle tre classi.',
    'Particelle accelerate con WebGL, con ripiego automatico su Canvas 2D. I proiettili nemici restano sopra gli effetti dei giocatori.',
    '22 nuove icone equipaggiamento generate con il budget residuo. Gli ultimi tre stivali conservano il disegno precedente; ripiego disponibile per immagini mancanti.',
    'Crediti e provenienza PixelLab registrati; nessuna modifica a danni, ricariche, salvataggi o sprite dei personaggi.',
  ], balanceChanges: [] },
  { version: '0.4.1', date: '2026-11-01', changes: [
    'Corretti gli effetti personali fermi a terra: fendente e parata seguono il proprietario, buff disegnati una sola volta. Vecchi archi, cerchi e barriere esclusi quando gli atlanti sono pronti. Fendente ritagliato nel raggio e arco autorevoli.',
    'Corretta la preda intoccabile nella Caccia della palude: le prede iniziano esposte, conservando fuga ed evocazione. I nemici ordinari mantengono il comportamento originale.',
    'Animazioni PixelLab locali per fendenti, parata, rigenerazione, scatti, proiettili elementali, esplosioni, evocazione e buff delle tre classi.',
    'Particelle accelerate con WebGL, con ripiego automatico su Canvas 2D. I proiettili nemici restano sopra gli effetti dei giocatori.',
    '22 nuove icone equipaggiamento generate con il budget residuo. Gli ultimi tre stivali conservano il disegno precedente; ripiego disponibile per immagini mancanti.',
    'Crediti e provenienza PixelLab registrati; nessuna modifica a danni, ricariche, salvataggi o sprite dei personaggi.',
  ], balanceChanges: [] },
  { ...INTEGER_DAMAGE_PREVIEW, version: '0.4.0', date: '2026-11-01' },
  INTEGER_DAMAGE_PREVIEW,
  { ...CLASS_ROLES_PREVIEW, version: '0.3.0', date: '2026-11-01' },
  CLASS_ROLES_PREVIEW,
  {
    version: '0.2.2', date: '2026-11-01',
    changes: [
      'Ritratti di Guerriero e Mago: i pantaloni ricadono sugli stivali, con il fronte dello stivale sopra; interno e bordo posteriore non si vedono più.',
      'Dita davanti alle armi e palmo coperto dall\'arma, su tutte le classi.',
      'Manto della meteora, egida di brace e corazza della fornace: fodere e stendardi laterali passano dietro le gambe. Sudario e velo restano interi davanti.',
      'Sprite di combattimento femminili ridisegnati: sagoma propria, viso più fine, coda alta che segue il passo e fascia sul braccio, nello stesso stile di quelli maschili.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.2.1', date: '2026-11-01',
    changes: [
      'Ritratti dell\'arciere: il mantello delle canne si divide in cappa dietro il corpo e due lembi sul petto, così tunica, cintura e braccia restano visibili.',
      'Stivali del vento sotto i pantaloni, con piume e fronte del gambale sopra: interno e bordo posteriore non si vedono più.',
      'Arco del cacciatore: corda dietro il corpo, impugnatura più sottile e palmo dietro il legno, con le dita davanti.',
      'Sprite di combattimento: meno lembi del mantello delle canne sul busto. Nessuna nuova immagine generata.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.2.0', date: '2026-11-01',
    changes: [
      'Versione del gioco visibile in basso al centro e testo introduttivo del menu aggiornato.',
      'Changelog consultabile in basso a sinistra, solo nel menu.',
      'Versioning per branch: ultimo numero incrementato a ogni commit del feature; numero centrale incrementato e ultimo azzerato al merge in main. Note con valori prima e dopo per il bilanciamento.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.1.0', date: '2026-11-01',
    changes: [
      'Aggiunto il piano per la futura revisione di ritratti e sprite (PR #6). La revisione grafica resta sospesa.',
    ],
    balanceChanges: [],
  },
];

/** La versione del pacchetto è l’unica fonte del numero mostrato nel gioco. */
export const GAME_VERSION = version;
export const CURRENT_RELEASE = RELEASES[0]!;
export function formatVersion(value: string): string {
  return `v${value.split('.').map((part, index) => index === 0 ? part : part.padStart(2, '0')).join('.')}`;
}
export const GAME_VERSION_LABEL = formatVersion(version);

export function describeBalanceChange(change: BalanceChange): string {
  return `${change.label}: ${change.before} → ${change.after}${change.unit ? ` ${change.unit}` : ''}`;
}
