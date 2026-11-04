# Fogli di boss e luogotenenti fatti con il generatore locale

Generati il 3 novembre 2026 su richiesta dell'utente, sul suo PC: SDXL 1.0 base (licenza OpenRAIL++-M) con la LoRA Pixel Art XL di nerijs (licenza OpenRAIL-M) e il VAE fp16-fix, in ComfyUI. Nessun servizio esterno e nessun collegamento durante il gioco. Sono immagini generate con l'IA: la regola del progetto le escludeva, quindi questa e' una **proposta da confermare con il proprietario**.

- Un foglio per figura, sei righe: camminata, attacco, le stesse in furia, passaggio di fase, morte.
- Prompt in `tools/arte/boss-prompts.json`; moto, misure, furia e candidato scelto in `tools/arte/boss-progetto.json`.
- Rifarli: `tools/arte/genera_mob.py --prompt tools/arte/boss-prompts.json`, poi `tools/arte/prepara_boss_ia.py --scrivi`. Stesso mob e stesso numero di candidato danno lo stesso seme. Gli originali restano fuori dal repository, nella cartella del generatore.
- Geometria generata in `src/features/presentation/boss-art/boss-ia-layout.ts`, da non modificare a mano.
