---
name: tys-collabora
description: Gestire sincronizzazione Git, commit/push autorizzati e PR di Temper your soul. Usare per queste operazioni, non per ogni modifica al gioco.
---

# Collaborazione Git

Le regole comuni sono in `README.md` («Prima di lavorare») e `AGENTS.md`/`CLAUDE.md`: usa quelle già in contesto, senza rileggerle tramite questa skill.

1. Controlla repository, stato, remoti e upstream (`git remote -v`, `git branch -vv`). Ricava le destinazioni dalla configurazione reale e dalle autorizzazioni: non presumere account, remoto `fork` o `origin` scrivibile.
2. Sincronizza con `git pull --ff-only` sull'upstream. Se manca, identifica prima la base corretta; se fallisce, risolvi l'allineamento preservando il lavoro locale prima di modificare file.
3. Prima di commit/PR autorizzati applica `docs/versioning.md`, esegui `npm run verify` e includi solo i file dell'incremento. Commit in italiano.
4. Commit, push e apertura PR richiedono la rispettiva richiesta esplicita. Ricontrolla stato e allineamento prima di pubblicare. Usa remoto/ramo espliciti per il push; per la PR verifica repository, base e head reali e usa `--body-file`. Mai force push o modifiche ai remoti per aggirare permessi.
5. Riporta modifiche, controlli, limiti e prova manuale pendente; ramo/hash/link solo se pubblicati.
