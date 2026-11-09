---
name: tys-nuovo-dungeon
description: Ricetta per aggiungere un dungeon a Temper your soul (mappa, boss con schemi d'attacco, tema grafico, aspetti, bottino, accesso, audio e test). Usare quando si progetta o implementa un nuovo dungeon o boss.
---

# Aggiungere un dungeon

Prima leggi `AGENTS.md` (sezione Dungeon), `docs/game-design.md` e un dungeon esistente completo, per esempio `src/features/dungeons/swamp/`. Gli id di dungeon, boss e schemi sono **stabili**: non rinominarli dopo la pubblicazione.

## 1. Design (da proporre all'utente e a Jabbaz prima del codice)

- Fantasia del luogo e del boss in una frase; ruolo nella curva di difficoltà (tier, soglia GS, XP).
- 5–7 schemi d'attacco: almeno 3 esclusivi, ognuno con **preavviso leggibile** (zone con avviso di almeno 0,5 s), una via di fuga chiara e un'idea che insegna qualcosa (posizionamento, tempismo, uso dei pilastri).
- Seconda fase (furia) sotto il 50%: schemi più fitti, non nuove regole ingiuste.
- Mappa: dimensioni 2000–4000, ostacoli che diventano ripari, nessuna fessura più stretta del corpo del giocatore.
- Set di bottino tematico (4 pezzi, uno per slot, classi coerenti) e alternative Non comuni, con pool espliciti.

## 2. Implementazione

1. `src/features/dungeons/<id>/`: `ArenaDefinition`, `BossStats`, schemi con gli attrezzi di `boss/pattern-kit.ts` (anelli, ventagli, `schedule`, cariche), `DungeonDefinition`; valori in tabelle con nome e commento "provvisorio".
2. Registro in `dungeons.ts`; soglia in `dungeon-access.ts`; XP in `character/progression.ts`; bottino in `loot/loot-tables.ts` (voci esplicite).
3. Rappresentazione: tema mappa ortogonale in pixel art in `presentation/themes/`, allineato alle coordinate e agli ostacoli di `ArenaDefinition`, grafica del boss in `presentation/boss-art/`, aspetti di proiettili e zone in `presentation/looks/`, artwork della scheda.
4. Audio: tema d'ambiente e musica in `audio/audio-catalog.ts` (`ambienceFor`/`musicFor` per il nuovo `ArenaThemeId`), suoni delle zone per materiale in `ZONE_SOUNDS`. Risorse con la skill `tys-risorse-libere`.
5. Nuove famiglie di oggetti con la skill `tys-nuova-famiglia`.

## 3. Verifica

- `dungeons.test.ts` valida ogni dungeon registrato: mappa, partenze, schemi eseguibili e leggibili, danni limitati, simulazione lunga senza stati invalidi. Aggiungi test specifici come `swamp/swamp.test.ts` e provali con una mutazione.
- `npm run verify` verde; prova nel browser della scheda e della partita, poi elenca all'utente cosa provare giocando (leggibilità, equità, ritmo).
- Aggiorna `docs/game-design.md` (tabella dei dungeon), `docs/roadmap.md` e `README.md` se cambia lo stato.
