"""Passa le 8 direzioni di Blender al modello locale (ComfyUI, SDXL + Pixel Art XL) in img2img.

Blender fissa angolo e proporzioni; il modello ridisegna i dettagli. Lo stesso seme per tutte le direzioni e una forza
di modifica (denoise) moderata limitano la deriva fra una vista e l'altra, ma non la eliminano: si controlla a occhio.

Prima: iso_8_direzioni.py e foglio_8_direzioni.py (servono <nome>_<DIR>_pixel.png). ComfyUI deve essere avviato.
Si esegue col Python di ComfyUI:
  python tools/arte/blender/rifinisci_ia.py D:\\PixelArt-AI\\immagini\\blender\\scheletro scheletro [--denoise 0.5]

Variabili: COMFY_SERVER (http://127.0.0.1:8188), COMFY_INPUT (cartella input di ComfyUI), PIXELART_AI_IMMAGINI.
Scrive in PIXELART_AI_IMMAGINI/blender_ia/<nome>/<DIR>_*.png e <nome>_ia_foglio.png nella cartella di Blender.
"""
import argparse
import json
import os
import time
import urllib.request
from pathlib import Path

from PIL import Image

ORDINE = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
SERVER = os.environ.get("COMFY_SERVER", "http://127.0.0.1:8188")
RADICE = Path(r"D:\PixelArt-AI")
INPUT = Path(os.environ.get("COMFY_INPUT", RADICE / "ComfyUI_windows_portable" / "ComfyUI" / "input"))
IMMAGINI = Path(os.environ.get("PIXELART_AI_IMMAGINI", RADICE / "immagini"))
GRIGIO = (150, 150, 150)

PROMPT = ("pixel art, 16-bit dark fantasy video game sprite, isometric view, a skeleton warrior with a rusty sword and a "
          "round iron shield, crimson scarf and loincloth, glowing red eyes, bold black outline, strong readable "
          "silhouette, dark charcoal and ash grey palette with crimson accents, limited palette, on a plain flat grey background")
NEGATIVO = ("3d render, realistic, photo, blurry, gradient, text, watermark, sprite sheet, multiple characters, collage, "
            "scenery, floor, cast shadow, frame, border")


def chiedi(percorso, dati=None):
    corpo = json.dumps(dati).encode() if dati is not None else None
    r = urllib.request.Request(SERVER + percorso, corpo, {"Content-Type": "application/json"})
    with urllib.request.urlopen(r) as risposta:
        return json.load(risposta)


def flusso(nome_input, seme, denoise, prefisso, passi):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": "pixel-art-xl.safetensors", "strength_model": 1.0,
                                                     "strength_clip": 1.0, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl-vae-fp16-fix.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": PROMPT, "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVO, "clip": ["2", 1]}},
        "6": {"class_type": "LoadImage", "inputs": {"image": nome_input}},
        "7": {"class_type": "VAEEncode", "inputs": {"pixels": ["6", 0], "vae": ["3", 0]}},
        "8": {"class_type": "KSampler", "inputs": {"seed": seme, "steps": passi, "cfg": 7.0, "sampler_name": "dpmpp_2m",
                                                   "scheduler": "karras", "denoise": denoise, "model": ["2", 0],
                                                   "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["7", 0]}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefisso, "images": ["9", 0]}},
    }


def prepara_ingresso(sorgente, destinazione):
    """Frame 96 px con trasparenza -> 1024 px su grigio piatto, ingrandito a pixel interi (nearest)."""
    q = Image.open(sorgente).convert("RGBA")
    k = 1024 // max(q.size)
    q = q.resize((q.width * k, q.height * k), Image.NEAREST)
    tela = Image.new("RGB", (1024, 1024), GRIGIO)
    tela.paste(q, ((1024 - q.width) // 2, (1024 - q.height) // 2), q)
    tela.save(destinazione)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cartella", type=Path)
    p.add_argument("nome")
    p.add_argument("--denoise", type=float, default=0.5, help="0 = identico a Blender, 1 = ignora Blender")
    p.add_argument("--seme", type=int, default=12345)
    p.add_argument("--passi", type=int, default=24)
    p.add_argument("--solo", help="direzioni separate da virgole")
    args = p.parse_args()

    scelte = args.solo.split(",") if args.solo else ORDINE
    tag = f"d{int(args.denoise * 100):02d}"
    uscita = IMMAGINI / "blender_ia" / args.nome
    inizio = time.time()
    for d in scelte:
        nome_in = f"{args.nome}_{d}_ia_in.png"
        prepara_ingresso(args.cartella / f"{args.nome}_{d}_pixel.png", INPUT / nome_in)
        prefisso = f"blender_ia/{args.nome}/{tag}_{d}"
        lavoro = chiedi("/prompt", {"prompt": flusso(nome_in, args.seme, args.denoise, prefisso, args.passi)})["prompt_id"]
        while True:
            storia = chiedi(f"/history/{lavoro}")
            if lavoro in storia:
                if storia[lavoro]["status"].get("status_str") == "error":
                    raise RuntimeError(json.dumps(storia[lavoro]["status"], indent=2))
                break
            time.sleep(0.5)
        print(f"{d} ({time.time() - inizio:.0f} s)", flush=True)

    # Foglio di confronto: originale Blender sopra, risultato del modello sotto, a 256 px per vista.
    quadri = []
    for d in scelte:
        trovati = sorted(uscita.glob(f"{tag}_{d}_*.png"))
        if trovati:
            quadri.append((d, trovati[-1]))
    foglio = Image.new("RGB", (256 * len(quadri), 512), GRIGIO)
    for i, (d, f) in enumerate(quadri):
        ing = Image.open(INPUT / f"{args.nome}_{d}_ia_in.png").convert("RGB").resize((256, 256), Image.NEAREST)
        ris = Image.open(f).convert("RGB").resize((256, 256), Image.LANCZOS)
        foglio.paste(ing, (i * 256, 0))
        foglio.paste(ris, (i * 256, 256))
    percorso = args.cartella / f"{args.nome}_ia_{tag}_confronto.png"
    foglio.save(percorso)
    print(f"Confronto: {percorso}")


if __name__ == "__main__":
    main()
