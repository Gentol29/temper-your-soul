#!/usr/bin/env python3
"""Dagli edifici generati da genera_hub_iso.py agli sprite dell'HUB isometrico.

Uso (Python di ComfyUI): python prepara_hub_iso.py --anteprime <file.png>
                         python prepara_hub_iso.py --scrivi cappella=0,forgia=1,deposito=2,mercante=0 [--larghezze cappella=200,...]

Riduzione e contorno come mob e scenografie (prepara_scenari.oggetto); scrive src/assets/art/hub-iso/<id>.png e la
geometria in src/features/presentation/hub-iso-atlas.ts, che non va modificato a mano.
"""
import argparse
import os
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
USCITA_COMFY = Path(os.environ.get("COMFY_OUTPUT", r"E:\AI\TemperYourSoul\ComfyUI_windows_portable\ComfyUI\output"))
os.environ.setdefault("PIXELART_AI_IMMAGINI", str(USCITA_COMFY))
sys.path.insert(0, str(QUI))
import prepara_scenari as ps  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = QUI.parent.parent
OUT = ROOT / "src" / "assets" / "art" / "hub-iso"
OUT_TS = ROOT / "src" / "features" / "presentation" / "hub-iso-atlas.ts"
# Gli edifici del gioco (id di hub-iso-map.ts) e la cartella dei candidati.
EDIFICI = {"portal": "cappella", "forge": "forgia", "storage": "deposito", "merchant": "mercante"}
LARGHEZZE = {"portal": 200, "forge": 170, "storage": 160, "merchant": 140}


def candidati(nome):
    return sorted((ps.IMMAGINI / f"hub_{nome}").glob("*.png"))


def anteprime(destinazione):
    righe = []
    for nome in EDIFICI.values():
        pezzi = []
        for k in range(len(candidati(nome))):
            try:
                pezzi.append(ps.oggetto(f"hub_{nome}", k, largo=200))
            except Exception as errore:  # noqa: BLE001
                print(nome, k, "scartato:", errore)
        righe.append(pezzi)
    larg = sum(max((p.width for p in r), default=0) + 16 for r in righe[:1]) or 1
    larg = max(sum(p.width + 16 for p in r) for r in righe) + 16
    alt = sum(max((p.height for p in r), default=0) + 16 for r in righe) + 16
    foglio = Image.new("RGBA", (larg, alt), (60, 60, 70, 255))
    y = 16
    for r in righe:
        x = 16
        for p in r:
            foglio.alpha_composite(p, (x, y))
            x += p.width + 16
        y += max((p.height for p in r), default=0) + 16
    foglio = foglio.resize((foglio.width * 2, foglio.height * 2), Image.NEAREST)
    foglio.save(destinazione)
    print("anteprima", destinazione)


def scrivi(scelte, larghezze):
    OUT.mkdir(parents=True, exist_ok=True)
    righe = []
    for gioco, nome in EDIFICI.items():
        im = ps.oggetto(f"hub_{nome}", scelte[gioco], largo=larghezze.get(gioco, LARGHEZZE[gioco]))
        im.save(OUT / f"{gioco}.png")
        righe.append(f"  {gioco}: {{ url: new URL('../../assets/art/hub-iso/{gioco}.png', import.meta.url).href, width: {im.width}, height: {im.height} }},")
        print(gioco, im.size)
    OUT_TS.write_text(
        "// File generato da tools/arte/prepara_hub_iso.py: non modificarlo a mano, rilancia lo script.\n\n"
        "import type { HubIsoBuilding } from '../character/hub-iso-map';\n\n"
        "/** Uno sprite di edificio dell'HUB isometrico (pixel). */\n"
        "export interface HubIsoSprite {\n  readonly url: string;\n  readonly width: number;\n  readonly height: number;\n}\n\n"
        "/** Gli edifici dell'HUB, generati in locale con SDXL 1.0 e Pixel Art XL. */\n"
        "export const HUB_ISO_SPRITES: Readonly<Record<HubIsoBuilding['id'], HubIsoSprite>> = {\n" + "\n".join(righe) + "\n};\n",
        encoding="utf-8",
    )
    print("scritto", OUT_TS)


def coppie(testo):
    return {k: int(v) for k, v in (voce.split("=") for voce in testo.split(",") if voce)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--anteprime")
    parser.add_argument("--scrivi")
    parser.add_argument("--larghezze", default="")
    args = parser.parse_args()
    if args.anteprime:
        anteprime(args.anteprime)
    if args.scrivi:
        nomi = {v: k for k, v in EDIFICI.items()}
        scelte = {nomi.get(k, k): v for k, v in coppie(args.scrivi).items()}
        scrivi(scelte, {nomi.get(k, k): v for k, v in coppie(args.larghezze).items()})


if __name__ == "__main__":
    main()
