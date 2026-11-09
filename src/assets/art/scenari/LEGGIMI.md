# Scenografie dei dungeon

Un foglio per tema, preparato da `prepara_scenari.py` (strumenti esterni, vedi README). Finche' non sono caricati i temi disegnano le forme nel codice.

Tutto a un pixel per unita' di mondo, come personaggio, boss e mob, e con la stessa riduzione dei mob: gli oggetti hanno lo stesso contorno scuro.

| Ruolo | Che cos'e' |
| --- | --- |
| `facade` | Moduli gotici del muro in alto, generati con il bordo destro che combacia col sinistro (`asse: x`) |
| `pilaster` | Lesene e colonne che coprono i giunti fra i moduli |
| `gate` | Il portale delle porte. Il vano (`hole`) e' ricavato dal disegno: li' stanno la grata e la luce |
| `hang` | Stendardi, liane, catene, ghiaccioli appesi alla facciata |
| `pillarS`, `pillarM`, `pillarL` | Gli ostacoli rotondi, per raggio di collisione (fino a 36, fino a 50, oltre). Non cambiano l'ingombro di gioco |
| `scatter` | Arredi bassi a terra, che non bloccano: macerie, ossa, candele, canne, carbone, neve |
| `sconce`, `brazier`, `anvil` | I supporti di torce, bracieri e incudini. Le fiamme sono nel codice |

Cripta: ardesia e cremisi, con statue, ossari, sarcofagi. Palude: gotico sommerso, muschio, radici, funghi. Fucina: basalto e ferro, forni e ingranaggi. Ghiacciaio: cattedrale ghiacciata, cristalli, cavalieri nel ghiaccio.

Generate in locale con SDXL 1.0 e Pixel Art XL, prompt e scelte in `scenari-prompts.json` e `scenari-progetto.json` degli strumenti esterni (README · Strumenti esterni). Gli originali restano fuori dal progetto, nella cartella di lavoro esterna di chi le ha generate.

Licenze: SDXL 1.0 OpenRAIL++-M, Pixel Art XL OpenRAIL-M. Scelta del proprietario se tenerli: vedi `docs/produzione-grafica.md`.
