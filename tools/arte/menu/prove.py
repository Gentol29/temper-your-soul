"""Prove di ricreazione delle immagini di riferimento con il modello locale (img2img).

Uso: python prove.py serie.json cartella_uscita
Ogni voce di serie.json: {"nome", "sorgente", "riquadro"?, "prompt", "larghezza", "altezza", "denoise": [...], "lora": [...], "semi": [...]}.
Accoda sul ComfyUI gia' avviato, un lavoro alla volta, cosi' convive con le altre sessioni.
"""
import io
import json
import os
import sys
import time
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

SERVER = "http://127.0.0.1:8188"
# La cartella in cui ComfyUI salva le uscite: va indicata, cambia da macchina a macchina.
CARTELLA_COMFY = Path(os.environ.get("COMFY_USCITA", "immagini"))
NEGATIVO = ("3d render, realistic, photo, blurry, smooth gradient, painting, text, letters, watermark, signature, logo, "
            "user interface, sprite sheet, grid, collage, bright daylight, cartoon")


def chiedi(percorso, dati=None):
    corpo = json.dumps(dati).encode() if dati is not None else None
    richiesta = urllib.request.Request(SERVER + percorso, corpo, {"Content-Type": "application/json"})
    with urllib.request.urlopen(richiesta, timeout=60) as risposta:
        return json.load(risposta)


def carica(img, nome):
    buffer = io.BytesIO()
    img.save(buffer, "PNG")
    confine = uuid.uuid4().hex
    corpo = b"".join([
        f'--{confine}\r\nContent-Disposition: form-data; name="image"; filename="{nome}"\r\nContent-Type: image/png\r\n\r\n'.encode(),
        buffer.getvalue(),
        f'\r\n--{confine}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{confine}--\r\n'.encode(),
    ])
    richiesta = urllib.request.Request(SERVER + "/upload/image", corpo, {"Content-Type": f"multipart/form-data; boundary={confine}"})
    with urllib.request.urlopen(richiesta, timeout=60) as risposta:
        return json.load(risposta)["name"]


def flusso(immagine, prompt, seme, denoise, lora, prefisso):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": "pixel-art-xl.safetensors", "strength_model": lora, "strength_clip": lora, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl-vae-fp16-fix.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": f"pixel art, {prompt}", "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVO, "clip": ["2", 1]}},
        "6": {"class_type": "LoadImage", "inputs": {"image": immagine}},
        "7": {"class_type": "VAEEncode", "inputs": {"pixels": ["6", 0], "vae": ["3", 0]}},
        "8": {"class_type": "KSampler", "inputs": {"seed": seme, "steps": 30, "cfg": 6.0, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": denoise, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["7", 0]}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefisso, "images": ["9", 0]}},
    }


def attendi(id_lavoro):
    while True:
        storia = chiedi(f"/history/{id_lavoro}")
        if id_lavoro in storia:
            esito = storia[id_lavoro]
            if esito["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(esito["status"])[:600])
            return esito["outputs"]["10"]["images"][0]
        time.sleep(1)


def main():
    serie = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    uscita = Path(sys.argv[2])
    uscita.mkdir(parents=True, exist_ok=True)
    for voce in serie:
        sorgente = Image.open(voce["sorgente"]).convert("RGB")
        if "riquadro" in voce:
            sorgente = sorgente.crop(tuple(voce["riquadro"]))
        larghezza, altezza = voce["larghezza"], voce["altezza"]
        # Stesso taglio, poi la misura nativa del modello: il riferimento non si deforma.
        rapporto = larghezza / altezza
        w, h = sorgente.size
        if w / h > rapporto:
            nuova = int(h * rapporto)
            sorgente = sorgente.crop(((w - nuova) // 2, 0, (w + nuova) // 2, h))
        else:
            nuova = int(w / rapporto)
            sorgente = sorgente.crop((0, (h - nuova) // 2, w, (h + nuova) // 2))
        sorgente = sorgente.resize((larghezza, altezza), Image.Resampling.LANCZOS)
        sorgente.save(uscita / f"{voce['nome']}__sorgente.png")
        nome_caricato = carica(sorgente, f"menu_{voce['nome']}.png")
        for denoise in voce["denoise"]:
            for lora in voce["lora"]:
                for seme in voce["semi"]:
                    etichetta = f"{voce['nome']}__d{int(denoise * 100)}_l{int(lora * 100)}_s{seme}"
                    if (uscita / f"{etichetta}.png").exists():
                        continue
                    inizio = time.time()
                    id_lavoro = chiedi("/prompt", {"prompt": flusso(nome_caricato, voce["prompt"], seme, denoise, lora, "menu_prove/" + etichetta)})["prompt_id"]
                    uscito = attendi(id_lavoro)
                    file = CARTELLA_COMFY / uscito.get("subfolder", "") / uscito["filename"]
                    Image.open(file).save(uscita / f"{etichetta}.png")
                    print(f"{etichetta} {time.time() - inizio:.0f}s", flush=True)
    print("FINE", flush=True)


if __name__ == "__main__":
    main()
