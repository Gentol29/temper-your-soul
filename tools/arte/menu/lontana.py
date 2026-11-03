"""Scena lontana e coerente: la scena scelta, rimpicciolita al centro; il modello disegna tutto cio' che sta attorno
nella stessa grana. La generazione lavora a 1536 x 864; componi.py riduce il fondale a 1024 x 576.

Uso: python lontana.py scena_1280x864.png cartella_uscita [solo-bozza]
"""
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
import prove  # noqa: E402

GENERA = (1536, 864)
RIDUZIONE = 0.75
LARGO, ALTO = int(1280 * RIDUZIONE), int(864 * RIDUZIONE)
X0, Y0 = (GENERA[0] - LARGO) // 2, (GENERA[1] - ALTO) // 2 + 40
PROMPT = ("wide view from far above of a ruined gothic citadel at dusk, the courtyard in the middle, surrounded by crumbling stone walls, "
          "broken arches, spires, towers, ruined rooftops and rubble fading into grey fog, hi-bit detailed pixel art, fine small pixels, "
          "dark fantasy, charcoal, slate and brown stone with faint crimson banners and small warm candle lights")
PROVE_SERIE = [(0.5, 21), (0.5, 22), (0.62, 21), (0.62, 22), (0.72, 21), (0.72, 22)]


def bozza(percorso):
    scena = Image.open(percorso).convert("RGB").resize((LARGO, ALTO), Image.Resampling.LANCZOS)
    a = np.asarray(scena)
    # Attorno, la scena riflessa e velata: dà al modello forme e toni da cui partire, senza cielo piatto.
    sopra, sotto = Y0, GENERA[1] - Y0 - ALTO
    sx, dx = X0, GENERA[0] - X0 - LARGO
    tela = np.pad(a, ((sopra, sotto), (sx, dx), (0, 0)), mode="reflect").astype(np.float32)
    yy, xx = np.indices(tela.shape[:2])
    fuori = np.hypot(np.maximum(np.maximum(X0 - xx, xx - (X0 + LARGO)), 0), np.maximum(np.maximum(Y0 - yy, yy - (Y0 + ALTO)), 0))
    velo = np.clip(fuori / 300, 0, 0.55)[..., None]
    tela = tela * (1 - velo) + np.array([52, 49, 55], dtype=np.float32) * velo
    img = Image.fromarray(tela.astype(np.uint8), "RGB").convert("RGBA")
    # Resta intatto l'interno della scena; il bordo si fonde.
    tieni = Image.new("L", GENERA, 0)
    ImageDraw.Draw(tieni).rectangle((X0 + 24, Y0 + 12, X0 + LARGO - 24, Y0 + ALTO - 12), fill=255)
    img.putalpha(tieni.filter(ImageFilter.GaussianBlur(14)))
    return img


def flusso(immagine, seme, denoise, prefisso):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"lora_name": "pixel-art-xl.safetensors", "strength_model": 0.8, "strength_clip": 0.8, "model": ["1", 0], "clip": ["1", 1]}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl-vae-fp16-fix.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": f"pixel art, {PROMPT}", "clip": ["2", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": prove.NEGATIVO + ", big blocky pixels, flat background, empty sky", "clip": ["2", 1]}},
        "6": {"class_type": "LoadImage", "inputs": {"image": immagine}},
        "7": {"class_type": "VAEEncode", "inputs": {"pixels": ["6", 0], "vae": ["3", 0]}},
        "11": {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["7", 0], "mask": ["6", 1]}},
        "8": {"class_type": "KSampler", "inputs": {"seed": seme, "steps": 30, "cfg": 6.0, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": denoise, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["11", 0]}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefisso, "images": ["9", 0]}},
    }


def main():
    uscita = Path(sys.argv[2])
    uscita.mkdir(parents=True, exist_ok=True)
    img = bozza(sys.argv[1])
    img.save(uscita / "bozza.png")
    if len(sys.argv) > 3:
        return
    nome = prove.carica(img, "menu_lontana.png")
    for denoise, seme in PROVE_SERIE:
        etichetta = f"lontana_d{int(denoise * 100)}_s{seme}"
        if (uscita / f"{etichetta}.png").exists():
            continue
        inizio = time.time()
        id_lavoro = prove.chiedi("/prompt", {"prompt": flusso(nome, seme, denoise, "menu_prove/" + etichetta)})["prompt_id"]
        uscito = prove.attendi(id_lavoro)
        file = prove.CARTELLA_COMFY / uscito.get("subfolder", "") / uscito["filename"]
        Image.open(file).convert("RGB").save(uscita / f"{etichetta}.png")
        print(f"{etichetta} {time.time() - inizio:.0f}s", flush=True)
    print("FINE", flush=True)


if __name__ == "__main__":
    main()
