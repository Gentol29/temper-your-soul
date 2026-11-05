#!/usr/bin/env python3
"""Genera con ComfyUI gli edifici dell'HUB isometrico (cappella del portale, forgia, deposito, mercante).

Uso (Python di ComfyUI, con ComfyUI avviato): python genera_hub_iso.py [--solo id,id] [--quanti 3] [--passi 26]

Le immagini finiscono nella cartella di uscita di ComfyUI, in scenari/hub_<id>/; le riduce prepara_hub_iso.py. Stesso
modello delle scenografie (SDXL 1.0 + Pixel Art XL), senza il nodo delle texture che ripetono: gli edifici sono oggetti
interi su fondo bianco, visti in isometria 2:1 dall'angolo in basso.
"""
import argparse
import json
import time
import urllib.request
import zlib

SERVER = "http://127.0.0.1:8188"

STILE = ("pixel art, 16-bit dark gothic fantasy video game isometric building sprite, 2:1 isometric view from the front corner, "
         "{prompt}, the whole building visible, centered, bold black outline, strong readable silhouette, limited palette, "
         "dark charcoal and ash grey stone with crimson accents, on a plain flat white background")
NEGATIVO = ("person, human, character, creature, text, watermark, signature, logo, frame, border, scene, landscape, ground, grass, "
            "sky, clouds, trees, cast shadow, multiple buildings, cropped, blurry, smooth gradient, photo, photorealistic, 3d render")

EDIFICI = {
    "cappella": "small gothic chapel with a tall pointed arched doorway glowing deep red like a magic portal, slate roof, two small spires, crimson stained glass windows",
    "forgia": "blacksmith forge workshop, stone walls, glowing orange furnace mouth, tall brick chimney with smoke, anvil and tools outside",
    "deposito": "fortified stone storehouse, heavy iron bound wooden door, wooden crates and barrels stacked beside it, slate roof",
    "mercante": "merchant market stall with dark red cloth canopy on wooden poles, crates and sacks of goods, hanging lantern",
}


def flusso(positivo, negativo, seme, passi, prefisso):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": "pixel-art-xl.safetensors", "strength_model": 1.0,
                                                     "strength_clip": 1.0, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl_vae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": negativo, "clip": ["2", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"seed": seme, "steps": passi, "cfg": 7.0, "sampler_name": "dpmpp_2m",
                                                   "scheduler": "karras", "denoise": 1.0, "model": ["2", 0],
                                                   "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefisso, "images": ["8", 0]}},
    }


def chiedi(percorso, dati=None):
    corpo = json.dumps(dati).encode() if dati is not None else None
    richiesta = urllib.request.Request(SERVER + percorso, corpo, {"Content-Type": "application/json"})
    with urllib.request.urlopen(richiesta) as risposta:
        return json.load(risposta)


def genera(lavoro_json):
    lavoro = chiedi("/prompt", {"prompt": lavoro_json})["prompt_id"]
    while True:
        storia = chiedi(f"/history/{lavoro}")
        if lavoro in storia:
            if storia[lavoro]["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(storia[lavoro]["status"], indent=2))
            return
        time.sleep(0.5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--solo", default="")
    parser.add_argument("--quanti", type=int, default=3)
    parser.add_argument("--passi", type=int, default=26)
    args = parser.parse_args()
    scelti = [s for s in args.solo.split(",") if s] or list(EDIFICI)
    for nome in scelti:
        for k in range(args.quanti):
            # Semi riproducibili: dal nome e dall'indice.
            seme = zlib.crc32(f"hub-iso|{nome}|{k}".encode())
            genera(flusso(STILE.format(prompt=EDIFICI[nome]), NEGATIVO, seme, args.passi, f"scenari/hub_{nome}/c{k}"))
            print(nome, k, "ok", flush=True)


if __name__ == "__main__":
    main()
