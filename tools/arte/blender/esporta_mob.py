"""Esporta una camminata resa con Blender come sprite di un mob del gioco, in 8 direzioni (matrici di caratteri + palette).

Si esegue col Python di ComfyUI (Pillow), dopo iso_8_direzioni.py --animazione camminata e foglio_animazione.py:
  python tools/arte/blender/esporta_mob.py D:\\PixelArt-AI\\immagini\\blender\\scheletro44 scheletro crypt_skeleton

Legge <nome>_camminata_<DIR>_<n>_pixel.png per le 8 direzioni (n = 0,2,4,6: quattro fotogrammi a un quarto di ciclo) e scrive
src/features/presentation/minion-art/blender-sprites.ts, che `minion-art.ts` sovrappone a `generated-sprites.ts`
(quel file e' generato da prepara_mob.py e non va modificato a mano). Con `?mob=classici` si rivede la grafica a mano.

Il mob ha 8 serie di 4 fotogrammi (`directions`, nell'ordine S, SE, E, NE, N, NW, W, SW): il gioco sceglie la serie dalla
direzione in cui il servitore si muove sullo schermo. `frames` e' la serie SE (bestiario, morte): senza specchio (`faces: false`).
Il ritaglio e' uguale per tutte le serie e simmetrico attorno al centro del corpo (il gioco centra lo sprite sul punto di
gioco), con i piedi sull'ultima riga: il gioco mette i piedi due pixel sopra il bordo basso.
"""
import argparse
import importlib.util
from pathlib import Path

from PIL import Image

RADICE = Path(__file__).resolve().parents[3]
USCITA = RADICE / "src" / "features" / "presentation" / "minion-art" / "blender-sprites.ts"
LETTERE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIREZIONI = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]  # stesso ordine di SPRITE_DIRECTIONS in minion-directions.ts


def carica_foglio():
    """Il modulo foglio_8_direzioni.py, per leggere i colori dei contorni (una sola fonte)."""
    spec = importlib.util.spec_from_file_location("foglio", Path(__file__).parent / "foglio_8_direzioni.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cartella", type=Path)
    p.add_argument("nome")
    p.add_argument("visual", help="id d'aspetto del mob (es. crypt_skeleton)")
    p.add_argument("--fotogrammi", default="0,2,4,6", help="indici del ciclo di camminata, separati da virgole")
    p.add_argument("--fps", type=int, default=7)
    p.add_argument("--uscita", type=Path, default=USCITA)
    args = p.parse_args()

    indici = [int(x) for x in args.fotogrammi.split(",")]
    quadri = {d: [Image.open(args.cartella / f"{args.nome}_camminata_{d}_{i}_pixel.png").convert("RGBA") for i in indici] for d in DIREZIONI}
    w, h = quadri["S"][0].size
    centro = w / 2
    boxes = [q.getbbox() for serie in quadri.values() for q in serie]
    mezza = max(max(centro - b[0], b[2] - centro) for b in boxes)
    sx, dx = int(centro - mezza), int(centro + mezza)
    alto, basso = min(b[1] for b in boxes), max(b[3] for b in boxes)
    ritagli = {d: [q.crop((sx, alto, dx, basso)) for q in serie] for d, serie in quadri.items()}

    # Un carattere per colore. 'a' e' sempre il contorno scuro (come negli sprite del generatore locale) e il contorno
    # rosso brace segue subito: i test del gioco li riconoscono dai simboli dichiarati in `outline`. Gli altri, dal piu' usato.
    foglio = carica_foglio()
    contorni = [tuple(foglio.CONTORNO[:3]), tuple(foglio.CONTORNO_BRACE[:3])]
    conta = {}
    for serie in ritagli.values():
        for r in serie:
            px = r.load()
            for y in range(r.height):
                for x in range(r.width):
                    if px[x, y][3] >= 128:
                        conta[px[x, y][:3]] = conta.get(px[x, y][:3], 0) + 1
    if contorni[0] not in conta:
        raise SystemExit("Manca il contorno scuro: rifinire prima con foglio_animazione.py")
    fissi = [c for c in contorni if c in conta]
    colori = fissi + sorted((c for c in conta if c not in fissi), key=lambda c: -conta[c])
    if len(colori) > len(LETTERE):
        raise SystemExit(f"Troppi colori ({len(colori)}): la palette del gioco ne ammette {len(LETTERE)}")
    lettera = {c: LETTERE[i] for i, c in enumerate(colori)}
    altri_contorni = [lettera[c] for c in fissi[1:]]

    def righe_di(r):
        px = r.load()
        return ["".join(lettera[px[x, y][:3]] if px[x, y][3] >= 128 else "." for x in range(r.width)) for y in range(r.height)]

    nome_serie = f"{args.visual.upper()}_DIRECTIONS"
    testo = [
        "/*",
        " * Generato da tools/arte/blender/esporta_mob.py: non modificare a mano.",
        " * Sprite dei mob resi con Blender (modello 3D, camera isometrica 2:1, resa Hi-bit): 8 direzioni, ciascuna con",
        " * quattro fotogrammi di camminata. Sovrappone `generated-sprites.ts`; con `?mob=classici` si rivede la grafica a mano.",
        " */",
        "",
        "import type { GeneratedSprite } from './generated-sprites';",
        "",
        "/** Come `GeneratedSprite`, piu' i simboli dei contorni colorati (oltre al contorno scuro 'a'): il bagliore delle braci. */",
        "export interface BlenderSprite extends GeneratedSprite {",
        "  readonly outline: readonly string[];",
        "  /** 8 serie di fotogrammi nell'ordine S, SE, E, NE, N, NW, W, SW (vedi `minion-directions.ts`). */",
        "  readonly directions: readonly (readonly (readonly string[])[])[];",
        "}",
        "",
        f"const {nome_serie}: readonly (readonly (readonly string[])[])[] = [",
    ]
    for d in DIREZIONI:
        testo.append(f"  // {d}")
        testo.append("  [")
        for r in ritagli[d]:
            testo.append("    [")
            testo.extend("      '" + s + "'," for s in righe_di(r))
            testo.append("    ],")
        testo.append("  ],")
    testo.append("];")
    pal = ", ".join(f"{lettera[c]}: '#{c[0]:02x}{c[1]:02x}{c[2]:02x}'" for c in colori)
    contorno_ts = ", ".join(f"'{s}'" for s in altri_contorni)
    testo += [
        "",
        "export const BLENDER_SPRITES: Readonly<Record<string, BlenderSprite>> = {",
        f"  {args.visual}: {{",
        f"    directions: {nome_serie},",
        f"    frames: {nome_serie}[{DIREZIONI.index('SE')}]!,",
        f"    palette: {{ {pal} }},",
        f"    outline: [{contorno_ts}],",
        f"    fps: {args.fps},",
        "    walks: true,",
        "    faces: false,",
        "    bob: false,",
        "  },",
        "};",
        "",
    ]
    args.uscita.write_text("\n".join(testo), encoding="utf-8", newline="\n")
    print(f"{args.visual}: 8 direzioni x {len(indici)} fotogrammi, {dx - sx}x{basso - alto}, {len(colori)} colori -> {args.uscita}")


if __name__ == "__main__":
    main()
