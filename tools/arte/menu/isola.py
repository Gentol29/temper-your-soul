"""Prepara ogni struttura su fondo verde per il modello, e dalle uscite ricava lo sprite con trasparenza.

  python isola.py prepara scena_1280x864.png cartella        -> <nome>.png su verde + serie3.json
  python isola.py sprite <nome> uscita_modello.png out.png   -> sprite in pixel di mondo, sfondo trasparente
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

VERDE = (0, 200, 60)
MARGINE = 6

# Sagome tracciate a mano sulla griglia, in pixel di mondo (640 x 432). `buchi`: parti da svuotare.
PEZZI = {
    "cattedrale": {"sagoma": [(192, 0), (444, 0), (444, 122), (402, 128), (392, 138), (386, 150), (372, 156), (352, 154), (290, 154), (270, 156), (258, 146), (248, 140), (236, 146), (230, 130), (192, 130)],
                   "prompt": "gothic cathedral facade with a pointed arch doorway, stone steps, hanging crimson banners, candles on stone pedestals"},
    "deposito": {"sagoma": [(57, 8), (60, 22), (72, 36), (84, 50), (90, 40), (92, 30), (108, 22), (135, 14), (150, 0), (192, 0), (192, 128), (176, 140), (160, 146), (130, 148), (122, 165), (100, 168), (90, 172), (58, 172), (60, 196), (42, 196), (38, 172), (34, 150), (30, 140), (34, 100), (38, 60), (48, 40)],
                 "prompt": "gothic stone storeroom with an open arch, shelves, candles, crates, a brazier, crimson banners"},
    "fucina": {"sagoma": [(443, 100), (460, 96), (485, 84), (520, 62), (553, 52), (566, 42), (594, 42), (602, 66), (618, 90), (640, 118), (640, 150), (628, 160), (626, 205), (600, 216), (576, 226), (556, 226), (546, 204), (528, 204), (500, 190), (496, 176), (470, 176), (460, 186), (443, 186)],
               "prompt": "blacksmith forge with dark slate roof, brick chimney, glowing furnace, wooden workbench, timber posts"},
    "mercante": {"sagoma": [(75, 202), (84, 212), (100, 212), (112, 205), (122, 218), (140, 225), (168, 222), (172, 232), (190, 248), (178, 248), (186, 282), (172, 288), (160, 298), (146, 308), (120, 316), (104, 326), (86, 326), (62, 312), (58, 302), (44, 300), (44, 262), (30, 258), (34, 240), (50, 222), (62, 210)],
                 "prompt": "merchant stall with torn crimson canopy, wooden counter with potions, candles, crates and barrels"},
    "cancello": {"sagoma": [(222, 345), (232, 312), (236, 290), (240, 312), (255, 318), (260, 296), (264, 318), (275, 320), (285, 316), (296, 305), (318, 283), (324, 283), (345, 305), (358, 318), (368, 320), (378, 298), (382, 320), (394, 312), (400, 290), (404, 312), (414, 345), (420, 400), (414, 416), (400, 420), (372, 420), (350, 405), (345, 400), (297, 400), (285, 412), (262, 420), (240, 420), (222, 405)],
                 "buchi": [[(300, 338), (304, 328), (320, 318), (336, 328), (342, 338), (342, 400), (298, 400)]],
                 "prompt": "wrought iron gothic gate with spires and a pointed arch, two burning braziers on stone pillars"},
    "mura_ovest": {"sagoma": [(60, 372), (85, 360), (108, 350), (118, 342), (150, 345), (185, 332), (200, 345), (228, 348), (228, 432), (60, 432)],
                   "prompt": "ruined gothic stone wall with small towers, iron railing and a crimson banner"},
    "mura_est": {"sagoma": [(418, 345), (445, 330), (475, 300), (510, 275), (545, 262), (562, 285), (575, 330), (540, 360), (520, 390), (500, 432), (418, 432)],
                 "prompt": "ruined gothic arcade of stone arches with a shrine niche"},
}


def prepara(scena_percorso, cartella):
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    scena = Image.open(scena_percorso).convert("RGB")  # 1280 x 864: 2 pixel per pixel di mondo
    serie = []
    misure = {}
    for nome, pezzo in PEZZI.items():
        xs = [p[0] for p in pezzo["sagoma"]]
        ys = [p[1] for p in pezzo["sagoma"]]
        x0, y0, x1, y1 = min(xs) - MARGINE, min(ys) - MARGINE, max(xs) + MARGINE, max(ys) + MARGINE
        largo, alto = x1 - x0, y1 - y0
        fattore = 1216 / max(largo, alto)
        w, h = int(largo * fattore) // 8 * 8, int(alto * fattore) // 8 * 8
        maschera = Image.new("L", (largo * 8, alto * 8), 0)
        d = ImageDraw.Draw(maschera)
        d.polygon([((x - x0) * 8, (y - y0) * 8) for x, y in pezzo["sagoma"]], fill=255)
        for buco in pezzo.get("buchi", []):
            d.polygon([((x - x0) * 8, (y - y0) * 8) for x, y in buco], fill=0)
        maschera = maschera.resize((w, h), Image.Resampling.LANCZOS).point(lambda v: 255 if v > 127 else 0)
        ritaglio = scena.crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2)).resize((w, h), Image.Resampling.LANCZOS)
        tela = Image.new("RGB", (w, h), VERDE)
        tela.paste(ritaglio, (0, 0), maschera)
        file = cartella / f"{nome}.png"
        tela.save(file)
        misure[nome] = {"x": x0, "y": y0, "width": largo, "height": alto, "base": max(ys)}
        serie.append({"nome": nome, "sorgente": str(file), "larghezza": w, "altezza": h,
                      "prompt": f"single isolated {pezzo['prompt']}, seen from above at a slight angle, dark fantasy, hi-bit detailed pixel art, charcoal and crimson, on a flat solid green background",
                      "denoise": [0.22, 0.32], "lora": [0.8], "semi": [7, 8]})
    (cartella / "serie3.json").write_text(json.dumps(serie, indent=1), encoding="utf-8")
    (cartella / "misure.json").write_text(json.dumps(misure, indent=1), encoding="utf-8")
    print(json.dumps(misure))


def sprite(nome, uscita_modello, destinazione):
    misure = json.loads((Path(uscita_modello).parent.parent / "isolati" / "misure.json").read_text(encoding="utf-8"))[nome]
    img = Image.open(uscita_modello).convert("RGB")
    a = np.asarray(img, dtype=np.int32)
    verde = (a[:, :, 1] > a[:, :, 0] * 1.25) & (a[:, :, 1] > a[:, :, 2] * 1.25) & (a[:, :, 1] > 70)
    # Riduzione a pixel di mondo con la mediana dei soli pixel che non sono fondo.
    largo, alto = misure["width"], misure["height"]
    fx, fy = img.width / largo, img.height / alto
    rgba = np.zeros((alto, largo, 4), dtype=np.uint8)
    for y in range(alto):
        y0, y1 = int(y * fy), max(int((y + 1) * fy), int(y * fy) + 1)
        for x in range(largo):
            x0, x1 = int(x * fx), max(int((x + 1) * fx), int(x * fx) + 1)
            blocco = a[y0:y1, x0:x1].reshape(-1, 3)
            tenuti = blocco[~verde[y0:y1, x0:x1].reshape(-1)]
            if tenuti.shape[0] * 2 >= blocco.shape[0]:
                rgba[y, x, :3] = np.median(tenuti, axis=0).astype(np.uint8)
                rgba[y, x, 3] = 255
    Image.fromarray(rgba, "RGBA").save(destinazione)
    print(destinazione, rgba.shape)


if __name__ == "__main__":
    if sys.argv[1] == "prepara":
        prepara(sys.argv[2], sys.argv[3])
    else:
        sprite(sys.argv[2], sys.argv[3], sys.argv[4])
