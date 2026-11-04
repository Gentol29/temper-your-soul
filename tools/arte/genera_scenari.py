#!/usr/bin/env python3
"""Genera le immagini delle scenografie con ComfyUI (tile, facciate, colonne, arredi): vedi scenari-prompts.json.

Uso: python genera_scenari.py [--solo id,id] [--quanti 3] [--passi 24]

Come genera_mob.py, ma ogni voce sceglie misura e ripetizione: `asse` xy o x fa combaciare i bordi opposti dell'immagine
con il nodo locale TileCircolare (`custom_nodes/tile_circolare.py` di ComfyUI). Le immagini stanno fuori dal progetto, in
immagini/scenari/<id>/; le riduce prepara_scenari.py.
"""
import argparse
import json
import os
import time
import urllib.request
import zlib
from pathlib import Path

QUI = Path(__file__).resolve().parent
SERVER = "http://127.0.0.1:8188"
IMMAGINI = Path(os.environ.get("PIXELART_AI_IMMAGINI", Path.home() / "Downloads" / "PixelArt-AI" / "immagini"))


def flusso(positivo, negativo, seme, passi, prefisso, larg, alt, asse):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": "pixel-art-xl.safetensors", "strength_model": 1.0,
                                                     "strength_clip": 1.0, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl-vae-fp16-fix.safetensors"}},
        "10": {"class_type": "TileCircolare", "inputs": {"model": ["2", 0], "vae": ["3", 0], "asse": asse}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": negativo, "clip": ["2", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": larg, "height": alt, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"seed": seme, "steps": passi, "cfg": 7.0,
                                                   "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0,
                                                   "model": ["10", 0], "positive": ["4", 0], "negative": ["5", 0],
                                                   "latent_image": ["6", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["10", 1]}},
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
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--prompt", type=Path, default=QUI / "scenari-prompts.json")
    p.add_argument("--quanti", type=int, default=3)
    p.add_argument("--passi", type=int, default=24)
    p.add_argument("--solo", help="id separati da virgole")
    args = p.parse_args()
    dati = json.loads(args.prompt.read_text(encoding="utf-8"))
    voci = dati["voci"]
    scelti = args.solo.split(",") if args.solo else list(voci)
    lavori = [(nome, c) for nome in scelti for c in range(voci[nome].get("quanti", args.quanti))]
    inizio = time.time()
    for fatti, (nome, candidato) in enumerate(lavori, 1):
        seme = zlib.crc32(nome.encode()) + candidato * 1000
        if not list((IMMAGINI / "scenari" / nome).glob(f"{seme}_*.png")):
            voce = voci[nome]
            stile = dati["stili"][voce.get("stile", "superficie")]
            positivo = stile.format(prompt=voce["prompt"])
            negativo = ", ".join(filter(None, [dati["negativi"][voce.get("stile", "superficie")], voce.get("evita")]))
            genera(flusso(positivo, negativo, seme, args.passi, f"scenari/{nome}/{seme}",
                          voce.get("larghezza", 1024), voce.get("altezza", 1024), voce.get("asse", "nessuno")))
        print(f"{fatti}/{len(lavori)} {nome} #{candidato} ({time.time() - inizio:.0f} s)", flush=True)
    print("Fatto.", flush=True)


if __name__ == "__main__":
    main()
