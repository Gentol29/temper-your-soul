"""Genera candidati di sprite ISOMETRICI con il generatore locale (ComfyUI gia' avviato, SDXL + Pixel Art XL).

Nessun token e nessun credito: tutto gira sulla GPU di questo PC. Si possono generare quanti candidati si vuole.

Uso, con il Python incluso in ComfyUI (vedi tools/arte/comfyui/LEGGIMI.md):
  python tools/arte/genera_isometrico.py --quanti 8
  python tools/arte/genera_isometrico.py --solo iso_scheletro,iso_forziere_ossa --quanti 16
  python tools/arte/genera_isometrico.py --controlla        # verifica solo che ComfyUI risponda

Solo libreria standard. I prompt stanno in isometrico-prompts.json. Stessa voce e stesso numero di candidato danno lo
stesso seme, quindi un candidato gia' generato non si rifa'. Gli originali restano fuori dal repository
(PIXELART_AI_IMMAGINI/isometrico/<id>/); la riduzione a pixel e' prepara_mob.py.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import zlib
from pathlib import Path

QUI = Path(__file__).parent
SERVER = os.environ.get("COMFY_SERVER", "http://127.0.0.1:8188")
IMMAGINI = Path(os.environ.get("PIXELART_AI_IMMAGINI", Path.home() / "Downloads" / "PixelArt-AI" / "immagini"))

# Stessi modelli degli altri generatori del progetto (genera_mob.py), cosi' lo stile resta coerente.
CHECKPOINT = "sd_xl_base_1.0.safetensors"
LORA = "pixel-art-xl.safetensors"
VAE = "sdxl-vae-fp16-fix.safetensors"


def flusso(positivo, negativo, seme, passi, prefisso, lato):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA, "strength_model": 1.0,
                                                     "strength_clip": 1.0, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": negativo, "clip": ["2", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": lato, "height": lato, "batch_size": 1}},
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


def controlla():
    """Verifica che ComfyUI risponda e che i tre modelli siano visibili."""
    try:
        info = chiedi("/object_info")
    except (urllib.error.URLError, OSError) as errore:
        sys.exit(f"ComfyUI non risponde su {SERVER}: avvia avvia-comfyui.bat ({errore})")
    mancano = []
    for nodo, campo, nome in (("CheckpointLoaderSimple", "ckpt_name", CHECKPOINT),
                              ("LoraLoader", "lora_name", LORA), ("VAELoader", "vae_name", VAE)):
        if nome not in info[nodo]["input"]["required"][campo][0]:
            mancano.append(nome)
    if mancano:
        sys.exit("Modelli non trovati da ComfyUI: " + ", ".join(mancano))
    print("ComfyUI risponde e i modelli ci sono.")


def genera(positivo, negativo, seme, passi, prefisso, lato):
    lavoro = chiedi("/prompt", {"prompt": flusso(positivo, negativo, seme, passi, prefisso, lato)})["prompt_id"]
    while True:
        storia = chiedi(f"/history/{lavoro}")
        if lavoro in storia:
            if storia[lavoro]["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(storia[lavoro]["status"], indent=2))
            return
        time.sleep(0.5)


def seme_di(voce, candidato):
    return zlib.crc32(voce.encode()) + candidato * 1000


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--prompt", type=Path, default=QUI / "isometrico-prompts.json")
    p.add_argument("--quanti", type=int, default=4, help="candidati per voce")
    p.add_argument("--passi", type=int, default=20)
    p.add_argument("--lato", type=int, default=1024, help="lato in pixel (SDXL rende meglio a 1024; con 8 GB di VRAM non salire)")
    p.add_argument("--solo", help="id separati da virgole")
    p.add_argument("--cartella", default="isometrico", help="sottocartella delle immagini")
    p.add_argument("--controlla", action="store_true", help="verifica ComfyUI e modelli, poi esce")
    args = p.parse_args()

    if args.controlla:
        controlla()
        return

    dati = json.loads(args.prompt.read_text(encoding="utf-8"))
    voci = dati["voci"]
    scelti = args.solo.split(",") if args.solo else list(voci)
    ignoti = [n for n in scelti if n not in voci]
    if ignoti:
        sys.exit("Id sconosciuti: " + ", ".join(ignoti))
    lavori = [(nome, c) for nome in scelti for c in range(args.quanti)]
    fatti = 0
    inizio = time.time()
    for nome, candidato in lavori:
        seme = seme_di(nome, candidato)
        prefisso = f"{args.cartella}/{nome}/{seme}"
        if not list((IMMAGINI / args.cartella / nome).glob(f"{seme}_*.png")):
            voce = voci[nome]
            positivo = dati["stile"].format(prompt=voce["prompt"], sfondo=voce.get("sfondo", dati["sfondo"]))
            negativo = ", ".join(filter(None, [dati["negativo"], voce.get("evita")]))
            genera(positivo, negativo, seme, args.passi, prefisso, args.lato)
        fatti += 1
        print(f"{fatti}/{len(lavori)} {nome} #{candidato} ({time.time() - inizio:.0f} s)", flush=True)
    print(f"Fatto. Immagini in {IMMAGINI / args.cartella}", flush=True)


if __name__ == "__main__":
    main()
