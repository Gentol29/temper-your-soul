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

## Oggetti della Cripta in isometria

In `crypt.png` i ruoli `pillarS`, `pillarM`, `pillarL` e `scatter` non vengono dal generatore: sono modelli 3D fatti con forme semplici e resi con Blender 5.1 (motore Workbench, nessuna IA), con strumenti esterni. Camera ortografica a 30° con l'oggetto ruotato di 45° (isometria 2:1), 64 px per 2,25 m (un po' piu' grandi dei mob, resi a 44 px per 2,25 m), senza antialiasing. Rifiniti con quattro toni per materiale, linee interne fra le parti e contorno scuro di 1 px, rosso brace vicino alle fiamme.

`foot` nell'atlante è il punto dello sprite che poggia sul centro del cerchio di collisione. Questi pezzi non hanno basamento: i raggi degli ostacoli della Cripta sono ridotti per coincidere con la loro larghezza. Gli altri ruoli di questo foglio restano quelli del generatore locale.
