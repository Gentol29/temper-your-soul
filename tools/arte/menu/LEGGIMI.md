# Immagini del menu

Script che hanno prodotto `src/assets/art/menu/`, con ComfyUI in locale, SDXL base 1.0, VAE fp16-fix e la LoRA Pixel Art XL. Le immagini sono generate con l'IA: vedi `src/assets/art/menu/LEGGIMI.md`.

La cartella delle uscite di ComfyUI si indica con la variabile d'ambiente `COMFY_USCITA`. Le immagini di riferimento dell'utente e le prove intermedie non sono nel repository: i semi qui sotto servono a ritrovare le scelte, partendo dalle stesse immagini.

| Passo | Script | Scelta |
| --- | --- | --- |
| Scena dal riferimento | `prove.py` | intensità 0,42, LoRA 0,8, seme 29 |
| Ogni struttura su fondo verde | `isola.py`, poi `prove.py` | intensità 0,22, LoRA 0,8, seme 7 |
| Scena lontana con i dintorni | `lontana.py` | intensità 0,62, seme 22 |
| Cortile senza edifici | `vuota.py` | intensità 0,62, seme 33 |
| PNG per il gioco, palette comune e schiarita | `componi.py` | gamma 0,72, 128 colori |
