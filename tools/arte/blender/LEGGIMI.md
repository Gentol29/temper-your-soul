# Personaggi 3D resi in isometrico (Blender)

Rendono un personaggio costruito con forme semplici in **8 direzioni con camera isometrica 2:1** (ortografica, 30°), senza GPU
(motore Workbench), e lo riducono a pixel in stile Hi-bit: due passate senza sfumature (colori piatti dei materiali e luce), toni a
gradini, contorno scuro di 1 px che diventa rosso brace vicino alle parti incandescenti. Nessuna IA: è un modello 3D fatto qui.
Valori provvisori (forme, palette, soglie, angoli delle animazioni); i frame 64×64 seguono la convenzione degli eroi.

Requisiti: Blender 5.x (`blender` da riga di comando) e Python con Pillow (quello di ComfyUI va bene).
Le immagini restano fuori dal repository (es. `D:\PixelArt-AI\immagini\blender\...`).

```powershell
# 1. posa ferma o animazione, in 8 direzioni (S, SE, E, NE, N, NW, W, SW)
blender -b -P tools/arte/blender/iso_8_direzioni.py -- --out <cartella> --lato 64 --scala 2.25
blender -b -P tools/arte/blender/iso_8_direzioni.py -- --out <cartella> --lato 64 --scala 2.25 --animazione camminata
#    animazioni: camminata (8 fotogrammi), attacco (8), colpo (--fotogrammi 6), morte (8)

# 2. palette Hi-bit, contorno, fogli e GIF (stesso Python di ComfyUI)
python tools/arte/blender/foglio_8_direzioni.py <cartella> scheletro --ingrandisci 8
python tools/arte/blender/foglio_animazione.py <cartella> scheletro camminata [--fotogrammi 6 per colpo]

# 3. come sprite di un mob del gioco (quattro fotogrammi di camminata della vista SE)
python tools/arte/blender/esporta_mob.py <cartella> scheletro crypt_skeleton
```

| Script | Cosa fa |
| --- | --- |
| `iso_8_direzioni.py` | Costruisce lo scheletro (articolato: anche, ginocchia, caviglie, busto, spalle, gomito), lo anima e rende le due passate |
| `foglio_8_direzioni.py` | Palette `HI_BIT`, soglie `SOGLIE`, contorno; foglio e anteprima della posa ferma |
| `foglio_animazione.py` | Lo stesso per le animazioni: un foglio per animazione (una riga per direzione), anteprima e GIF |
| `esporta_mob.py` | Ritaglia i fotogrammi e scrive `src/features/presentation/minion-art/blender-sprites.ts` (non modificare a mano) |
| `rifinisci_ia.py` | Facoltativo: passa le viste al modello locale (ComfyUI, img2img). A 64 px il dettaglio si perde nella riduzione: serve per sprite più grandi |

## Limiti

- Il gioco usa **una sola direzione** (profilo verso destra, specchiato) con quattro fotogrammi di camminata: le altre direzioni e le
  animazioni di attacco, colpo e morte non sono ancora collegate.
- La morte è un accasciarsi sul posto: una caduta lunga uscirebbe da un riquadro di 64 px.
- Il corpo nero può perdersi sui fondi molto scuri: da verificare giocando.
- Un solo personaggio (`scheletro`); per aggiungerne uno si scrive la sua funzione di costruzione in `iso_8_direzioni.py`.
