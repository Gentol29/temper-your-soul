"""Rifinisce un'animazione resa da iso_8_direzioni.py (palette fissa + contorno) e compone foglio, anteprima e GIF.

Si esegue col Python di ComfyUI (Pillow):
  python tools/arte/blender/foglio_animazione.py D:\\PixelArt-AI\\immagini\\blender\\scheletro64 scheletro camminata [--fotogrammi 8]

Legge <nome>_<anim>_<DIR>_<n>.png (grezzi) e scrive nella stessa cartella:
  <nome>_<anim>_<DIR>_<n>_pixel.png   fotogramma rifinito
  <nome>_<anim>_foglio.png            una riga per direzione (S SE E NE N NW W SW), una colonna per fotogramma
  <nome>_<anim>_anteprima.png         il foglio ingrandito a pixel interi su fondo scuro
  <nome>_<anim>.gif                   le 8 direzioni che camminano insieme (4x2), per vedere il movimento
"""
import argparse
import importlib.util
from pathlib import Path

from PIL import Image

QUI = Path(__file__).parent
ORDINE = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
FONDO = (58, 56, 62, 255)


def carica_rifinitura():
    spec = importlib.util.spec_from_file_location("foglio", QUI / "foglio_8_direzioni.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cartella", type=Path)
    p.add_argument("nome")
    p.add_argument("anim")
    p.add_argument("--fotogrammi", type=int, default=8)
    p.add_argument("--ingrandisci", type=int, default=3)
    p.add_argument("--ms", type=int, default=90, help="durata di un fotogramma nella GIF")
    args = p.parse_args()

    rifin = carica_rifinitura()
    quadri = {}
    for d in ORDINE:
        for i in range(args.fotogrammi):
            base = args.cartella / f"{args.nome}_{args.anim}_{d}_{i}"
            q = rifin.rifinisci(Image.open(f"{base}.png").convert("RGBA"), Image.open(f"{base}_luce.png").convert("RGBA"))
            q.save(args.cartella / f"{args.nome}_{args.anim}_{d}_{i}_pixel.png")
            quadri[(d, i)] = q
    w, h = quadri[("S", 0)].size
    foglio = Image.new("RGBA", (w * args.fotogrammi, h * len(ORDINE)), (0, 0, 0, 0))
    for r, d in enumerate(ORDINE):
        for i in range(args.fotogrammi):
            foglio.paste(quadri[(d, i)], (i * w, r * h))
    foglio.save(args.cartella / f"{args.nome}_{args.anim}_foglio.png")
    sfondo = Image.new("RGBA", foglio.size, FONDO)
    sfondo.alpha_composite(foglio)
    k = args.ingrandisci
    sfondo.resize((foglio.width * k, foglio.height * k), Image.NEAREST).save(
        args.cartella / f"{args.nome}_{args.anim}_anteprima.png")

    # GIF: 4 colonne x 2 righe, ogni direzione cammina sul posto.
    gif = []
    for i in range(args.fotogrammi):
        tela = Image.new("RGBA", (w * 4, h * 2), FONDO)
        for n, d in enumerate(ORDINE):
            tela.alpha_composite(quadri[(d, i)], ((n % 4) * w, (n // 4) * h))
        gif.append(tela.resize((tela.width * k, tela.height * k), Image.NEAREST).convert("RGB"))
    gif[0].save(args.cartella / f"{args.nome}_{args.anim}.gif", save_all=True, append_images=gif[1:],
                duration=args.ms, loop=0)
    print(f"Scritti foglio, anteprima e GIF di {args.anim} in {args.cartella}")


if __name__ == "__main__":
    main()
