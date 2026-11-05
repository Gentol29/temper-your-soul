---
name: tys-risorse-libere
description: Cercare, valutare, scaricare (con permesso), convertire e registrare nei crediti audio, musica, grafica o caratteri con licenza libera per Temper your soul. Usare quando servono suoni, musiche, tile, effetti grafici o font, o quando l'utente chiede "dove prendere" una risorsa.
---

# Risorse libere per Temper your soul

Regole complete in `docs/prompt-di-progetto.md` (sezione 5); fonti già valutate in `docs/risorse-libere.md`.

## Criteri (rigidi)

- Licenze: **CC0, pubblico dominio, CC BY 3.0/4.0** (crediti obbligatori), **OFL** per i caratteri. Mai NC, ND, "solo uso personale", licenze ambigue.
- **Audio solo registrato** (strumenti, voci, field recording, foley): niente sintetizzatori come musica principale e niente IA generativa. Nemmeno per la grafica importata.
- Verifica la licenza **sulla pagina e nel file/pacchetto**: se non coincidono (capita su OpenGameArt) prevale la più restrittiva, o si scarta.
- Coerenza: tono gotico caldo, tema UI "C — Reliquiario", direzione personaggi "A — Fantasy compatto". La revisione di sprite e ritratti è sospesa: non sostituirli.

## Procedura

1. **Cercare.** `node tools/cerca-risorse.mjs audio "<parole>" --licenza cc0,by` (Openverse, senza chiave), oppure le fonti di `docs/risorse-libere.md`. Annota titolo, autore, URL della pagina, licenza, durata/dimensione.
2. **Proporre all'utente** prima di scaricare: elenco con nome del file, fonte, licenza e dimensione stimata. Scarica solo dopo un sì esplicito.
3. **Scaricare** in una cartella temporanea nuova (scratchpad), mai direttamente in `src/`. Note pratiche:
   - Freesound: l'anteprima `…-hq.mp3` è raggiungibile senza account dalla pagina del suono (attributo `data-mp3`);
   - Wikimedia Commons da questo PC è lentissimo (meno di 1 KB/s): evitare i file grandi o usare `curl -C -` per riprendere.
4. **Convertire e alleggerire** con ffmpeg (`pip install --user imageio-ffmpeg`, poi `python -I` con `site.getusersitepackages()` nel `sys.path`):
   - effetti: mp3 mono 96–128 kbps, taglio dei silenzi, normalizzazione a circa -16 LUFS, durata minima utile;
   - musica e ambienti in anello: mp3 stereo 128 kbps, con un incrocio ai bordi per evitare scatti; meglio sotto i 3 MB;
   - nomi in kebab-case che dicono cosa sono (`fuoco-esplosione-1.mp3`).
5. **Registrare:**
   - file in `src/assets/audio/<effetti|musica|ambiente|interfaccia>/`;
   - credito in `src/features/audio/audio-credits.ts` (titolo, autore, fonte, licenza, consultato il, modifiche);
   - riferimento nel catalogo `src/features/audio/audio-catalog.ts`: `asset(new URL('../../assets/audio/…', import.meta.url).href, '<credito>', …)` (più crediti se il file unisce più registrazioni);
   - `npm run verify`: i test del catalogo falliscono se un file manca, pesa troppo, non ha credito o ha una licenza non ammessa.
   - Script di supporto (scaricamento da Freesound, analisi, conversione con ffmpeg): fuori dal repository, vedi README · Strumenti esterni.
6. **Provare nel browser** (`npm run dev`): volume relativo, assenza di scatti negli anelli, nessun errore in console. Il giudizio finale sul suono spetta all'utente.

## Grafica e caratteri

Stessa procedura: file in `src/assets/<categoria>/`, niente CDN. I caratteri si servono in locale con `@font-face`.

- **Crediti della grafica** in `src/features/presentation/art-credits.ts` (titolo, autore, fonte, licenza, data, uso, modifiche): si vedono nel gioco (pannello Audio, «Crediti») e i test rifiutano crediti mancanti o senza uso. Un `LEGGIMI.md` accanto ai file ripete i crediti.
- **Sprite dei boss:** i boss usano i fogli del generatore locale (`prepara_boss_ia.py`, fuori dal repository → `boss-art/boss-ia-layout.ts`). I fogli di terzi e `prepara_boss.py` sono stati tolti il 5 novembre 2026: per adattarne uno nuovo si recupera lo script dalla storia Git. Scala, verso e velocita' in `boss-art/boss-sheets.ts`; se l'immagine manca resta la grafica a matrici.
- **Pixel art:** solo ingrandimenti interi, una tavolozza per tema, un contorno coerente; preferire autori affidabili (elenco in `docs/risorse-libere.md`).
