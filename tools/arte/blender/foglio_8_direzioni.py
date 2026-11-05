"""Rifinisce le 8 direzioni rese da iso_8_direzioni.py in stile Hi-bit "nero infuocato": toni a gradini, braci, contorno.

Si esegue col Python di ComfyUI (ha Pillow), non con quello di Blender:
  python tools/arte/blender/foglio_8_direzioni.py D:\\PixelArt-AI\\immagini\\blender\\scheletro64 scheletro [--ingrandisci 8]

Legge <nome>_<DIR>.png (colori piatti) e <nome>_<DIR>_luce.png (solo luce) e scrive nella stessa cartella:
  <nome>_<DIR>_pixel.png   un fotogramma rifinito per direzione
  <nome>_foglio.png        8 fotogrammi in fila, ordine S SE E NE N NW W SW
  <nome>_anteprima.png     il foglio ingrandito a pixel interi (nearest-neighbor) su fondo scuro

Resa Hi-bit (AGENTS.md): nessuna sfumatura e nessun semitrasparente. Il colore piatto dice DI CHE MATERIALE e' ogni pixel;
la luce, quantizzata in 3 gradini (ombra, base, luce) con SOGLIE, dice quale tono della famiglia usare. Il contorno e'
quasi nero e diventa rosso brace dove tocca un materiale incandescente (EMISSIVI): e' il bagliore. PALETTE provvisoria.
"""
import sys
from pathlib import Path

from PIL import Image

ORDINE = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
CONTORNO = (4, 2, 4, 255)
CONTORNO_BRACE = (132, 26, 6, 255)  # alone dove il contorno tocca una brace
EMISSIVI = {"brace", "occhi"}

# Colori piatti dei materiali in Blender (devono combaciare con COLORI di iso_8_direzioni.py), sRGB 0..1.
MATERIALI = {
    "osso": (0.78, 0.72, 0.58),
    "osso_scuro": (0.45, 0.40, 0.32),
    "cremisi": (0.55, 0.04, 0.07),
    "acciaio": (0.40, 0.40, 0.44),
    "ferro_scuro": (0.16, 0.16, 0.19),
    "occhi": (1.00, 0.15, 0.10),
    "vuoto": (0.05, 0.04, 0.05),
    "legno": (0.30, 0.17, 0.08),
    "brace": (0.95, 0.45, 0.06),
    "cenere": (0.62, 0.52, 0.42),
}

# Tre toni per famiglia: ombra, base, luce. Le ossa e il ferro sono carbone con una luce calda sottile sui bordi;
# la stoffa ("cremisi") e' fuoco; la brace e' sempre accesa (anche l'ombra e' arancio scuro).
HI_BIT = {
    "osso": [(8, 7, 9), (26, 22, 24), (74, 54, 50)],
    "osso_scuro": [(5, 4, 6), (17, 14, 16), (44, 32, 32)],
    "cremisi": [(70, 8, 6), (150, 30, 8), (232, 84, 16)],
    "acciaio": [(6, 6, 9), (22, 21, 28), (62, 52, 60)],
    "ferro_scuro": [(4, 4, 6), (13, 12, 16), (34, 30, 36)],
    "occhi": [(255, 196, 70)] * 3,
    "vuoto": [(2, 1, 2)] * 3,
    "legno": [(18, 10, 6), (40, 24, 12), (76, 46, 22)],
    "brace": [(178, 38, 6), (242, 106, 16), (255, 196, 76)],
    "cenere": [(50, 42, 38), (112, 98, 88), (178, 160, 142)],  # teschio: unica parte chiara, cenere calda
}
# Soglie sulla luminosita' della passata di luce (0..255): sotto la prima = ombra, sopra la seconda = luce.
SOGLIE = (105, 144)  # tarate sulla luce di Blender (valori tipici 130 = frontale, 146+ = verso l'alto)


def _lineare_a_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


# Blender tratta i colori dei materiali come lineari: sullo schermo diventano sRGB.
ATTESI = {n: tuple(255 * _lineare_a_srgb(v) for v in c) for n, c in MATERIALI.items()}


def materiale_di(rgb):
    return min(ATTESI, key=lambda n: sum((ATTESI[n][i] - rgb[i]) ** 2 for i in range(3)))


def contorno(out, accesi):
    """Contorno di 1 px attorno alla figura (4 vicini); rosso brace se tocca un pixel incandescente (insieme `accesi`)."""
    w, h = out.size
    dst = out.load()
    pieno = [[dst[x, y][3] == 255 for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if pieno[y][x]:
                continue
            colore = None
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and pieno[ny][nx]:
                    colore = CONTORNO_BRACE if (nx, ny) in accesi else (colore or CONTORNO)
                    if colore is CONTORNO_BRACE:
                        break
            if colore:
                dst[x, y] = colore
    return out


def rifinisci(piatto, luce, soglie=SOGLIE):
    """Hi-bit: materiale dal colore piatto, tono a gradini dalla luce, poi il contorno."""
    w, h = piatto.size
    sp, sl = piatto.load(), luce.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    accesi = set()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a < 128:
                continue
            lr, lg, lb, _ = sl[x, y]
            lum = 0.299 * lr + 0.587 * lg + 0.114 * lb
            tono = 0 if lum < soglie[0] else 1 if lum < soglie[1] else 2
            mat = materiale_di((r, g, b))
            dst[x, y] = (*HI_BIT[mat][tono], 255)
            if mat in EMISSIVI:
                accesi.add((x, y))
    return contorno(out, accesi)


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(args) < 2:
        raise SystemExit(__doc__)
    cartella, nome = Path(args[0]), args[1]
    k = int(sys.argv[sys.argv.index("--ingrandisci") + 1]) if "--ingrandisci" in sys.argv else 4

    quadri = []
    for d in ORDINE:
        piatto = Image.open(cartella / f"{nome}_{d}.png").convert("RGBA")
        luce = Image.open(cartella / f"{nome}_{d}_luce.png").convert("RGBA")
        q = rifinisci(piatto, luce)
        q.save(cartella / f"{nome}_{d}_pixel.png")
        quadri.append(q)
    w, h = quadri[0].size
    foglio = Image.new("RGBA", (w * len(quadri), h), (0, 0, 0, 0))
    for i, q in enumerate(quadri):
        foglio.paste(q, (i * w, 0))
    foglio.save(cartella / f"{nome}_foglio.png")

    fondo = Image.new("RGBA", foglio.size, (58, 56, 62, 255))
    fondo.alpha_composite(foglio)
    fondo.resize((foglio.width * k, foglio.height * k), Image.NEAREST).save(cartella / f"{nome}_anteprima.png")
    print(f"Scritti foglio e anteprima di {nome} in {cartella}")


if __name__ == "__main__":
    main()
