"""Genera i candidati degli sprite dei mob con il generatore locale (ComfyUI gia' avviato, SDXL + Pixel Art XL).

Uso, con il Python della cartella del generatore:
  python tools/arte/genera_mob.py --quanti 3
  python tools/arte/genera_mob.py --solo crypt_bat,crypt_wisp --quanti 1

I prompt stanno in mob-prompts.json. Stesso mob e stesso numero di candidato danno lo stesso seme, quindi lo stesso
risultato: un candidato gia' generato non si rifa'. Gli originali restano fuori dal repository, nella cartella di
ComfyUI (immagini/mob/<id>/); li riduce a sprite prepara_mob.py.
"""
import argparse
import json
import os
import time
import urllib.request
import zlib
from pathlib import Path

QUI = Path(__file__).parent
SERVER = "http://127.0.0.1:8188"
# La cartella delle immagini di ComfyUI, fuori dal repository.
IMMAGINI = Path(os.environ.get("PIXELART_AI_IMMAGINI", Path.home() / "Downloads" / "PixelArt-AI" / "immagini"))


def flusso(positivo, negativo, seme, passi, prefisso):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": "pixel-art-xl.safetensors", "strength_model": 1.0,
                                                     "strength_clip": 1.0, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl-vae-fp16-fix.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": negativo, "clip": ["2", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"seed": seme, "steps": passi, "cfg": 7.0,
                                                   "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0,
                                                   "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0],
                                                   "latent_image": ["6", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefisso, "images": ["8", 0]}},
    }


def chiedi(percorso, dati=None):
    corpo = json.dumps(dati).encode() if dati is not None else None
    richiesta = urllib.request.Request(SERVER + percorso, corpo, {"Content-Type": "application/json"})
    with urllib.request.urlopen(richiesta) as risposta:
        return json.load(risposta)


def genera(positivo, negativo, seme, passi, prefisso):
    lavoro = chiedi("/prompt", {"prompt": flusso(positivo, negativo, seme, passi, prefisso)})["prompt_id"]
    while True:
        storia = chiedi(f"/history/{lavoro}")
        if lavoro in storia:
            if storia[lavoro]["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(storia[lavoro]["status"], indent=2))
            return
        time.sleep(0.5)


def seme_di(mob, candidato):
    return zlib.crc32(mob.encode()) + candidato * 1000


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--prompt", type=Path, default=QUI / "mob-prompts.json")
    p.add_argument("--quanti", type=int, default=3, help="candidati per mob")
    p.add_argument("--passi", type=int, default=20)
    p.add_argument("--solo", help="id separati da virgole")
    p.add_argument("--cartella", default="mob", help="sottocartella delle immagini (i tile stanno in tile)")
    args = p.parse_args()

    dati = json.loads(args.prompt.read_text(encoding="utf-8"))
    mob = dati["mob"]
    scelti = args.solo.split(",") if args.solo else list(mob)
    lavori = [(nome, c) for nome in scelti for c in range(args.quanti)]
    fatti = 0
    inizio = time.time()
    for nome, candidato in lavori:
        seme = seme_di(nome, candidato)
        prefisso = f"{args.cartella}/{nome}/{seme}"
        if not list((IMMAGINI / args.cartella / nome).glob(f"{seme}_*.png")):
            voce = mob[nome]
            # Gli oggetti hanno il loro stile: con "enemy sprite" il modello ci mette sempre una persona.
            oggetto = voce.get("tipo") == "oggetto"
            stile = dati["stile_oggetto"] if oggetto else dati["stile_lato"] if voce.get("tipo") == "lato" else dati["stile"]
            positivo = stile.format(prompt=voce["prompt"], sfondo=voce.get("sfondo", dati["sfondo"]))
            negativo = ", ".join(filter(None, [dati["negativo"], dati["negativo_oggetto"] if oggetto else "", voce.get("evita")]))
            genera(positivo, negativo, seme, args.passi, prefisso)
        fatti += 1
        print(f"{fatti}/{len(lavori)} {nome} #{candidato} ({time.time() - inizio:.0f} s)", flush=True)
    print("Fatto.", flush=True)


if __name__ == "__main__":
    main()
