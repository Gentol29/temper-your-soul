"""Compone per il gioco fondale e strutture, schiariti e con una palette comune.

Uso: python componi.py <fondale.png 1536x864> <scena_1280x864> <prove3> <isolati> <assets>
Per ogni struttura usa la prova ripulita dal modello, se c'e'; altrimenti il ritaglio su verde.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

FONDALE, SCENA, PROVE, ISOLATI, ASSETS = (Path(p) for p in sys.argv[1:6])
SCELTE = "d22_l80_s7"
NOMI = {"cattedrale": "cathedral", "deposito": "storage", "fucina": "forge", "mercante": "merchant", "cancello": "gate", "mura_ovest": "wall_west", "mura_est": "wall_east"}
MONDO = (1024, 576)
COLORI = 128
# Schiarisce i toni medi e scuri: la scena deve leggersi bene anche dietro i pannelli.
GAMMA = 0.72
LUT = [round(255 * (v / 255) ** GAMMA) for v in range(256)] * 3


def riduci(img, cella=2):
    a = np.asarray(img.convert("RGB"))
    alto, largo = a.shape[0] // cella, a.shape[1] // cella
    a = a[: alto * cella, : largo * cella]
    blocchi = a.reshape(alto, cella, largo, cella, 3).transpose(0, 2, 1, 3, 4)
    return Image.fromarray(np.median(blocchi.reshape(alto, largo, -1, 3), axis=2).astype(np.uint8), "RGB")


def sprite(nome, misure, palette):
    prova = PROVE / f"{nome}__{SCELTE}.png"
    sorgente = prova if prova.exists() else ISOLATI / f"{nome}.png"
    img = Image.open(sorgente).convert("RGB")
    a = np.asarray(img, dtype=np.int32)
    verde = (a[:, :, 1] > a[:, :, 0] * 1.25) & (a[:, :, 1] > a[:, :, 2] * 1.25) & (a[:, :, 1] > 70)
    a = np.asarray(img.point(LUT), dtype=np.int32)
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
    alfa = rgba[:, :, 3]
    colori = Image.fromarray(rgba[:, :, :3], "RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGB")
    uscita = np.dstack([np.asarray(colori), alfa])
    vuoto = alfa == 0
    bordo = (alfa > 0) & (np.roll(vuoto, 1, 0) | np.roll(vuoto, -1, 0) | np.roll(vuoto, 1, 1) | np.roll(vuoto, -1, 1))
    return Image.fromarray(uscita.astype(np.uint8), "RGBA"), sorgente.name


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    scena = riduci(Image.open(SCENA)).point(LUT)
    fondale = Image.open(FONDALE).convert("RGB").resize(MONDO, Image.Resampling.BOX).point(LUT)
    palette = Image.merge("RGB", [Image.fromarray(np.vstack([np.asarray(scena)[:, :, i], np.asarray(fondale.crop((0, 0, 640, 200)))[:, :, i]])) for i in range(3)]).quantize(colors=COLORI, method=Image.Quantize.MEDIANCUT, kmeans=8, dither=Image.Dither.NONE)
    fondale.quantize(palette=palette, dither=Image.Dither.NONE).save(ASSETS / "courtyard.png", optimize=True)
    misure = json.loads((ISOLATI / "misure.json").read_text(encoding="utf-8"))
    for nome, inglese in NOMI.items():
        img, origine = sprite(nome, misure[nome], palette)
        img.save(ASSETS / f"{inglese}.png", optimize=True)
        print(inglese, origine, img.size, (ASSETS / f"{inglese}.png").stat().st_size)
    print("fondale", (ASSETS / "courtyard.png").stat().st_size)


if __name__ == "__main__":
    main()
