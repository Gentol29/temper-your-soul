# Strumenti per la grafica

Script usati per il primo lotto grafico e per i tile della fase 6 (1 novembre 2026), conservati per rifare o estendere il lavoro. Regole e fonti in `docs/risorse-libere.md`, procedura nella skill `.claude/skills/tys-risorse-libere`.

Requisiti: Python 3 e Pillow (`pip install --user pillow`). Si esegue con `python -I`, su file scaricati in una **cartella temporanea fuori dal progetto**: nel repository finiscono solo i fogli preparati in `src/assets/art/boss/` e la loro geometria.

| Script | Cosa fa |
| --- | --- |
| `prepara_boss.py <scaricati> <radice_progetto>` | Per ogni boss ritaglia le animazioni scelte, le ricolora con la tavolozza del gioco (calma e furia), aggiunge il contorno dove manca e scrive un PNG a celle uguali, una riga per animazione. Scrive poi `src/features/presentation/boss-art/boss-sheet-layout.ts` (cella, punto dei piedi, righe e fotogrammi): quel file non va modificato a mano |
| `prepara_tile.py <scaricati> <radice_progetto>` | Per ogni dungeon ritaglia i tile scelti (pavimento, faccia del muro, cima dei massicci, pozzi, ponti, ripari), li riporta a 16 pixel e li ricolora con le rampe del tema. Scrive un PNG per tema in `src/assets/art/tiles/` e la geometria in `src/features/presentation/themes/tile-atlas.ts`, che non va modificato a mano. Cerca i file scaricati per nome in tutta la cartella: vedi `src/assets/art/tiles/LEGGIMI.md` |
| `genera-cursori.mjs [anteprima.png]` | Solo Node, nessun file scaricato. Disegna da griglie di testo i cursori del tema in `src/assets/art/cursors/`; i punti attivi sono nelle variabili `--cursor-*` di `style.css`. L'argomento facoltativo scrive un foglio ingrandito su fondo scuro e chiaro |

La cartella dei file scaricati deve contenere gli archivi estratti con i nomi originali:

- `statue-spritesheet-alt-no-green.png` (Animated Statue, Calciumtrice, OpenGameArt);
- `mon4/mon4_sprite_base.png` (da `mon4.zip`, Demon Flower Monster, Rosswet Mobile, OpenGameArt);
- `enemy_galore/Golem/...` (da `enemy_galore_i.zip`, Enemy Galore I, Admurin, OpenGameArt);
- `evil-wizard-2/EVil Wizard 2/Sprites/...` (da `EVil Wizard 2.zip`, LuizMelo, itch.io; il pacchetto contiene `License.txt` con CC0).

Per cambiare colori, animazioni o boss si modificano le tabelle `PALETTES` e `BOSSES` in cima allo script e lo si rilancia; scala, verso della figura e velocita' si regolano invece in `boss-sheets.ts`. I crediti stanno in `src/features/presentation/art-credits.ts` e si vedono nel gioco (pannello Audio, «Crediti»).

## Boss e mob con il generatore locale (3 novembre 2026)

Si eseguono con il Python del generatore (`Downloads\PixelArt-AI\ComfyUI\venv`), con ComfyUI avviato.

- `genera_mob.py`: fa i candidati dai prompt, con semi riproducibili.
- `prepara_boss_ia.py`: dai candidati ai fogli di boss e luogotenenti, con confronti (`--candidati`), animazioni e misure (`--prove`) e scrittura per il gioco (`--scrivi`).
- `prepara_mob.py`: la riduzione a pixel, comune ai due, e la prova sugli 8 mob (`--anteprime`). I mob non sono ancora nel gioco.

I controlli misurano figura, colore e movimento, ma hanno gia' mancato difetti evidenti: si guardano sempre anche i fogli. Lezioni: un colore di sfondo nel prompt colora il soggetto; con "enemy sprite" gli oggetti diventano persone; togliere i buchi con tolleranza alta mangia ossa e pelo bianchi; un retino fine con il contorno rifatto sembra una rete; un'arma deve muoversi intera con il braccio (`arma`).
