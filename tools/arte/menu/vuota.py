"""Toglie gli edifici dalla scena lontana scelta: pietre nel selciato, poi il modello ridisegna solo il posto delle strutture.

Uso: python vuota.py lontana.png cartella_uscita
"""
import random
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from isola import PEZZI  # noqa: E402
import prove  # noqa: E402
import lontana  # noqa: E402

R = 2 * lontana.RIDUZIONE  # da pixel di scena 640 a pixel di generazione
X0, Y0 = lontana.X0, lontana.Y0
PIETRE = [(250, 170, 300, 200), (345, 175, 420, 205), (260, 265, 380, 285), (420, 215, 480, 260), (205, 200, 260, 280)]
SELCIATO = [(110, 150), (260, 160), (450, 190), (600, 225), (476, 290), (430, 342), (228, 346), (140, 342), (50, 322), (4, 250), (30, 200)]


def scala(punti):
    return [(X0 + x * R, Y0 + y * R) for x, y in punti]


def main():
    rng = random.Random(9)
    img = Image.open(sys.argv[1]).convert("RGB")
    uscita = Path(sys.argv[2])
    uscita.mkdir(parents=True, exist_ok=True)
    tolti = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(tolti)
    for pezzo in PEZZI.values():
        d.polygon(scala(pezzo["sagoma"]), fill=255)
    selciato = Image.new("L", img.size, 0)
    ImageDraw.Draw(selciato).polygon(scala(SELCIATO), fill=255)
    pieno = img.copy()
    passo_x, passo_y = int(34 * R), int(22 * R)
    for y in range(int(Y0 + 120 * R), int(Y0 + 360 * R), passo_y):
        for x in range(int(X0), int(X0 + 640 * R), passo_x):
            x0, y0, x1, y1 = rng.choice(PIETRE)
            sx, sy = rng.randint(x0, max(x0, x1 - 40)), rng.randint(y0, max(y0, y1 - 28))
            sx, sy = int(X0 + sx * R), int(Y0 + sy * R)
            pieno.paste(img.crop((sx, sy, sx + int(40 * R), sy + int(28 * R))), (x, y))
    dentro = Image.composite(tolti, Image.new("L", img.size, 0), selciato)
    base = img.copy()
    base.paste(pieno, (0, 0), dentro)
    # Alfa 0 = da ridisegnare: tutto il posto delle strutture, un po' allargato.
    tieni = tolti.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 - v)
    rgba = base.convert("RGBA")
    rgba.putalpha(tieni)
    rgba.save(uscita / "vuota_bozza.png")
    nome = prove.carica(rgba, "menu_vuota.png")
    testo = ("empty ruined gothic courtyard seen from far above, bare cracked flagstones, low broken stone walls, rubble and grey fog, "
             "no buildings, nothing standing, hi-bit detailed pixel art, fine small pixels, charcoal and slate")
    for seme in (31, 32, 33):
        etichetta = f"vuota_s{seme}"
        lavoro = lontana.flusso(nome, seme, 0.62, "menu_prove/" + etichetta)
        lavoro["4"]["inputs"]["text"] = f"pixel art, {testo}"
        lavoro["5"]["inputs"]["text"] = prove.NEGATIVO + ", buildings, towers, arches, doors, tents, big blocky pixels"
        inizio = time.time()
        uscito = prove.attendi(prove.chiedi("/prompt", {"prompt": lavoro})["prompt_id"])
        file = prove.CARTELLA_COMFY / uscito.get("subfolder", "") / uscito["filename"]
        Image.open(file).convert("RGB").save(uscita / f"{etichetta}.png")
        print(etichetta, f"{time.time() - inizio:.0f}s", flush=True)


if __name__ == "__main__":
    main()
