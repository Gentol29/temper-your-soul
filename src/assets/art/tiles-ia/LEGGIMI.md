# Tile generati in locale

Un foglio per dungeon, preparato da `prepara_scenari.py` (strumenti esterni, vedi README).

A un pixel per unita' di mondo, come le figure: un tile copre sempre 32 unita', ma ha 32 pixel di lato invece di 16.

| Materiale | Che cos'e' |
| --- | --- |
| `floor`, `floorWorn`, `floorDark` | Il pavimento: una superficie da 128 pixel che ripete davvero, nei toni del tema |
| `water` | L'acqua nera della palude |
| `carpet` | Il tappeto cremisi della cripta |
| `cap`, `wall` | La cima e la faccia dei massicci e dei muri |
| `chasmBed` | Il fondo dei pozzi; nella fucina, la lava |
| `chasm` | I nove pezzi dell'orlo: labbro chiaro e parete in ombra. Il centro e' vuoto, sotto c'e' il fondo |
| `bridgeEW`, `bridgeNS`, `railEW`, `railNS`, `post` | Assi, corrimano e pali dei ponti |
| `cover` | I ripari |

## Come sono fatti

Le superfici nascono da SDXL 1.0 e Pixel Art XL con il nodo locale `TileCircolare` (`custom_nodes/tile_circolare.py` di ComfyUI): le convoluzioni leggono oltre il bordo dal lato opposto, quindi l'immagine combacia con se stessa. Nessun nodo scaricato. La griglia del modello diventa un pixel, la luminosita' si stende sui gradini della rampa del tema.

Le rampe di terra contengono tutti i colori dei vecchi tile di terzi (tolti il 5 novembre 2026, rampe in `rampe-tile.json` degli strumenti esterni), piu' i colori intermedi: i test li confrontano con i colpi nemici. Orli dei pozzi e ringhiere li compone lo script, cosi' combaciano per costruzione.

Le immagini originali restano fuori dal progetto, nella cartella di lavoro esterna di chi le ha generate.

Licenze: SDXL 1.0 OpenRAIL++-M, Pixel Art XL OpenRAIL-M. Scelta del proprietario se tenerli: vedi `docs/produzione-grafica.md`.
