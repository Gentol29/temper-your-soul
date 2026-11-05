# Ambiente ComfyUI locale per gli sprite

ComfyUI gira **sul tuo PC**: niente token, niente crediti, niente account. Il limite è solo la GPU e il tempo (circa 20–40 s a immagine 1024×1024 su una RTX 2070 SUPER da 8 GB, stima da confermare).

## Installazione

```powershell
.\tools\arte\comfyui\installa-comfyui.ps1            # solo elenco di cosa scarica
.\tools\arte\comfyui\installa-comfyui.ps1 -Scarica   # installa (~9,5 GB)
```

Mette tutto in `Downloads\PixelArt-AI` (fuori dal repository): ComfyUI portatile con il suo Python, SDXL base 1.0, VAE fp16-fix, LoRA Pixel Art XL (stessi modelli di `genera_mob.py`) e il nodo `tile_circolare.py` del progetto. Serve 7-Zip e una GPU NVIDIA aggiornata.

## Uso

1. Avvia `Downloads\PixelArt-AI\avvia-comfyui.bat` (interfaccia a nodi su http://127.0.0.1:8188; ascolta solo su questo PC; opzione `--lowvram` per gli 8 GB).
2. Controlla che tutto sia visibile: `python_embeded\python.exe tools\arte\genera_isometrico.py --controlla` (dalla cartella `ComfyUI_windows_portable`, con il percorso completo dello script).
3. Genera i candidati: `genera_isometrico.py --quanti 8` oppure `--solo iso_scheletro --quanti 16`. I prompt sono in `tools/arte/isometrico-prompts.json`; stesso id e stesso numero danno lo stesso seme.
4. Gli originali stanno in `Downloads\PixelArt-AI\immagini\isometrico\<id>\`. La riduzione a pixel e la palette sono `prepara_mob.py`; stile e palette obbligatori in `AGENTS.md` (Hi-bit).

## Limiti

- SDXL **non garantisce una vera proiezione isometrica 2:1**: si generano molti candidati e si sceglie a occhio. Per tile perfetti serve un ritocco o un LoRA isometrico (da cercare e valutare la licenza con la skill `tys-risorse-libere`; non incluso).
- Le immagini sono generate con l'IA: vale la stessa **decisione aperta del proprietario** sulla grafica del generatore locale (vedi `docs/produzione-grafica.md`).
- Versioni dei modelli e URL di download non verificati su questo PC: nessun file è ancora stato scaricato qui.
