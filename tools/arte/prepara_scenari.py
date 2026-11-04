#!/usr/bin/env python3
"""Prepara le scenografie dei dungeon dalle immagini di genera_scenari.py (progetto in scenari-progetto.json).

Uso: python prepara_scenari.py [--anteprime cartella] [--solo temi] [--scrivi]

Tutto a un pixel per unita' di mondo, come personaggio, boss e mob. Tre famiglie:
- superfici che ripetono (pavimenti, cime, fondi dei pozzi, assi): 128 pixel per lato, generate con il padding circolare,
  ridotte alla griglia del modello e portate sulle rampe del tema, cosi' i colori a terra restano controllati contro i
  colpi nemici. Scrive `src/assets/art/tiles-ia/` e `themes/tile-atlas-ia.ts`;
- facciate: i moduli del muro in alto, con le lesene che coprono i giunti;
- oggetti (colonne, statue, arredi, ripari): la stessa riduzione dei mob, con il contorno scuro.
Facciate e oggetti stanno in `src/assets/art/scenari/` e `themes/scenery-atlas.ts`.

I pezzi che devono combaciare e non sono superfici (orli dei pozzi, ringhiere, cancelli) li compone lo script dalle texture.
Le immagini originali restano fuori dal progetto. Requisiti: Python 3, Pillow e numpy.
"""
import argparse
import json
import math
import os
import random
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import prepara_mob as pm  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
QUI = Path(__file__).resolve().parent
ROOT = QUI.parent.parent
IMMAGINI = Path(os.environ.get("PIXELART_AI_IMMAGINI", Path.home() / "Downloads" / "PixelArt-AI" / "immagini")) / "scenari"
OUT_TILE = ROOT / "src" / "assets" / "art" / "tiles-ia"
OUT_SCENE = ROOT / "src" / "assets" / "art" / "scenari"
OUT_TILE_TS = ROOT / "src" / "features" / "presentation" / "themes" / "tile-atlas-ia.ts"
OUT_SCENE_TS = ROOT / "src" / "features" / "presentation" / "themes" / "scenery-atlas.ts"
ATLANTE_CLASSICO = ROOT / "src" / "features" / "presentation" / "themes" / "tile-atlas.ts"
LATO = 32
LARGHEZZA_ATLANTE = 1024


def rampe_classiche():
    testo = ATLANTE_CLASSICO.read_text(encoding="utf-8")
    rampe = {}
    for blocco in re.finditer(r"^  (\w+): \{\n    url:.*?^    colors: \{\n(.*?)^    \},", testo, re.S | re.M):
        rampe[blocco[1]] = {m[1]: re.findall(r"'(#\w+)'", m[2]) for m in re.finditer(r"(\w+): \[(.*?)\]", blocco[2])}
    return rampe


RAMPE = rampe_classiche()


def hexrgb(valore):
    valore = valore.lstrip("#")
    return np.array([int(valore[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.int32)


def rgbhex(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


def espandi(rampa):
    """Fra due gradini della rampa ne mette uno a meta': piu' sfumature, ma gli estremi e i colori di partenza restano."""
    uscita = []
    for a, b in zip(rampa, rampa[1:]):
        uscita.append(a)
        uscita.append(rgbhex((hexrgb(a) + hexrgb(b)) // 2))
    uscita.append(rampa[-1])
    # Senza doppioni: due rampe vicine fanno lo stesso colore.
    return list(dict.fromkeys(uscita))


def percorso(nome, candidato):
    return sorted((IMMAGINI / nome).glob("*.png"))[candidato]


# --- Superfici ----------------------------------------------------------------------------------------------------


def luminosita(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def superficie(nome, candidato, gradi, basso=2.0, alto=98.0, curva=1.0):
    """Indici sui gradini di una rampa: la luminosita' dell'immagine stesa fra due percentili."""
    a = pm.griglia(percorso(nome, candidato))
    l = luminosita(a)
    lo, hi = np.percentile(l, [basso, alto])
    t = np.clip((l - lo) / max(1.0, hi - lo), 0, 1) ** curva
    return np.round(t * (gradi - 1)).astype(np.int32)


def colora(indici, rampa):
    tavola = np.array([hexrgb(c) for c in rampa], dtype=np.uint8)
    return np.dstack([tavola[indici], np.full(indici.shape, 255, dtype=np.uint8)])


def a_immagine(rgba):
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def libero(nome, candidato, colori=32, luce=1.0, saturazione=1.0):
    """Un'immagine a griglia con i suoi colori (facciate, tappeti): tavolozza limitata, senza retino."""
    a = pm.griglia(percorso(nome, candidato))
    if saturazione != 1.0:
        g = luminosita(a)[..., None]
        a = g + (a - g) * saturazione
    a = np.clip(a * luce, 0, 255).astype(np.uint8)
    im = Image.fromarray(a, "RGB").quantize(colors=colori, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE)
    return im.convert("RGBA")


# --- Orli dei pozzi ---------------------------------------------------------------------------------------------------


def orlo_periodico(seme, minimo, massimo, periodo=LATO):
    rng = random.Random(seme)
    fasi = [rng.random() * math.tau for _ in range(3)]
    valori = []
    for k in range(periodo):
        s = 0.5 + 0.28 * math.sin(math.tau * k / periodo + fasi[0]) + 0.17 * math.sin(math.tau * 2 * k / periodo + fasi[1]) + 0.1 * math.sin(math.tau * 5 * k / periodo + fasi[2])
        valori.append(minimo + round(max(0.0, min(1.0, s)) * (massimo - minimo)))
    return valori


def orli_pozzo(roccia, rampa, parete=14, lato=(4, 7), alto=(5, 9)):
    """I nove pezzi attorno al fondo: roccia con il labbro chiaro, la parete lontana che scende nel buio, il centro vuoto."""
    tavola = np.array([hexrgb(c) for c in rampa], dtype=np.int32)
    gradi = len(rampa)
    su, giu, sx, dx = orlo_periodico(1, *alto), orlo_periodico(2, *lato), orlo_periodico(3, *lato), orlo_periodico(4, *lato)
    pezzi = []
    for r in range(3):
        for c in range(3):
            t = np.zeros((LATO, LATO, 4), dtype=np.uint8)
            for py in range(LATO):
                for px in range(LATO):
                    d = [999]
                    if r == 0:
                        d.append(py - su[px])
                    if r == 2:
                        d.append(LATO - 1 - py - giu[px])
                    if c == 0:
                        d.append(px - sx[py])
                    if c == 2:
                        d.append(LATO - 1 - px - dx[py])
                    dentro = min(d)
                    grana = int(roccia[(py + r * LATO) % roccia.shape[0], (px + c * LATO) % roccia.shape[1]])
                    if dentro < 0:
                        # Roccia dell'orlo, con il filo chiaro verso il vuoto.
                        k = gradi - 1 if dentro == -1 else max(gradi // 2, min(gradi - 2, gradi // 2 + grana * (gradi // 2) // max(1, roccia.max())))
                        t[py, px] = (*tavola[k], 255)
                    elif dentro == 0:
                        t[py, px] = (*tavola[1], 255)
                    elif r == 0 and py - su[px] <= parete:
                        # La parete lontana, in vista a tre quarti: scende nel buio a bande, con la grana della roccia.
                        q = (py - su[px]) / parete
                        k = max(0, round((gradi // 2 - 1) * (1 - q) + (grana / max(1, roccia.max()) - 0.5) * 2))
                        if q > 0.65 and (px + py) % 2:
                            continue
                        t[py, px] = (*tavola[min(k, gradi - 1)], 255)
            pezzi.append(t)
    return pezzi


def ringhiere(assi, rampa):
    """Corrimano orizzontale, verticale e palo, ricavati dalla grana del ponte."""
    tavola = np.array([hexrgb(c) for c in rampa], dtype=np.uint8)
    n = len(rampa)
    r = np.zeros((6, 64, 4), dtype=np.uint8)
    for x in range(64):
        g = int(assi[7, x % assi.shape[1]])
        for y, k in enumerate((0, n - 1, max(2, g), max(1, g - 1), 2, 0)):
            r[y, x] = (*tavola[min(k, n - 1)], 255)
    palo = np.zeros((12, 10, 4), dtype=np.uint8)
    for y in range(12):
        for x in range(10):
            if x in (0, 9) or y in (0, 11):
                k = 0
            elif y == 1 or x == 1:
                k = n - 1
            elif y >= 9 or x == 8:
                k = 2
            else:
                k = n // 2 + int(assi[y * 3 % assi.shape[0], x * 3 % assi.shape[1]]) * (n // 2 - 1) // max(1, int(assi.max()))
            palo[y, x] = (*tavola[min(k, n - 1)], 255)
    return r, np.rot90(r), palo


# --- Oggetti -------------------------------------------------------------------------------------------------------


def oggetto(nome, candidato, largo=None, alto=None, colori=24, buchi=False, specchia=False, luce=1.0, taglia_fondo=None, sparso=False, morbido=False):
    """Un oggetto come i mob: stessa riduzione, stesso contorno scuro. `largo` o `alto` fissano la misura, il resto segue."""
    p = percorso(nome, candidato)
    a = pm.griglia(p)
    figura, _ = pm.togli_sfondo(a, buchi=buchi)
    figura, _ = pm.isola(figura)
    if not sparso:
        figura = pm.solo_maggiore(figura)
    ys, xs = np.nonzero(figura)
    w0, h0 = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    if largo is None and alto is None:
        largo = w0
    k = (largo / w0) if largo is not None else (alto / h0)
    # Mai oltre la griglia del modello: ingrandire farebbe pixel doppi.
    k = min(k, 1.0)
    voce = {"larghezza": max(4, round(w0 * k)) + 2, "altezza": max(4, round(h0 * k)) + 2, "moto": "respiro", "buchi": buchi, "colori": colori, "un_pezzo": not sparso}
    if taglia_fondo:
        voce["taglia_fondo"] = taglia_fondo
    e = pm.sprite(p, voce)
    f = e["fotogrammi"][0]
    if specchia:
        f = f[:, ::-1]
    tavola = np.clip(np.array(e["tavola"], dtype=np.float32) * luce, 0, 255).astype(np.int32)
    im = pm.come_immagine(f, tavola, 1)
    if morbido:
        # Cio' che sta a terra, piatto (neve, muschio), non ha il contorno scuro: toglierlo lo fa stare sul pavimento.
        a = np.asarray(im).copy()
        pieno = a[..., 3] > 0
        dentro = pieno.copy()
        dentro[1:] &= pieno[:-1]
        dentro[:-1] &= pieno[1:]
        dentro[:, 1:] &= pieno[:, :-1]
        dentro[:, :-1] &= pieno[:, 1:]
        a[~dentro, 3] = 0
        im = Image.fromarray(a, "RGBA")
    return im


# --- Atlanti -----------------------------------------------------------------------------------------------------------


def impacchetta(voci, larghezza=LARGHEZZA_ATLANTE):
    """Scaffali: i pezzi piu' alti per primi."""
    ordine = sorted(voci, key=lambda v: -v[1].height)
    x = y = scaffale = 0
    messi = []
    for nome, im, extra in ordine:
        if x + im.width > larghezza:
            x, y, scaffale = 0, y + scaffale, 0
        messi.append((nome, im, x, y, extra))
        x += im.width
        scaffale = max(scaffale, im.height)
    atlante = Image.new("RGBA", (larghezza, y + scaffale), (0, 0, 0, 0))
    uscita = {}
    for nome, im, px, py, extra in messi:
        atlante.paste(im, (px, py))
        uscita.setdefault(nome, []).append({"x": px, "y": py, "w": im.width, "h": im.height, **(extra or {})})
    return atlante, uscita


def costruisci_tile(tema, progetto):
    """Le superfici: griglie da 128 pixel su un foglio, piu' orli, ringhiere e ripari."""
    r = RAMPE[tema]
    griglie = []
    colori = {}
    pezzi = []

    def griglia(materiale, voce, candidato, rampa, **opzioni):
        rampa = espandi(rampa)
        ind = superficie(voce, candidato, len(rampa), **opzioni)
        griglie.append((materiale, a_immagine(colora(ind, rampa))))
        colori[materiale] = rampa
        return ind

    # Pavimento: la stessa forma nei toni del tema.
    voce, cand = progetto["pavimento"]
    griglia("floor", voce, cand, r["floor"], **progetto.get("pavimento_opzioni", {}))
    for tono in ("floorWorn", "floorDark"):
        if tono in r:
            griglia(tono, voce, cand, r[tono], **progetto.get("pavimento_opzioni", {}))
    if "acqua" in progetto:
        griglia("water", *progetto["acqua"], progetto["rampa_acqua"])
    roccia = griglia("cap", *progetto["cima"], r["cap"])
    griglia("wall", *progetto["cima"], progetto["rampa_muro"])
    rampa_pozzo = espandi(r["chasm"])
    n = len(rampa_pozzo)
    voce_fondo, cand_fondo = progetto["fondo"]
    fondo = superficie(voce_fondo, cand_fondo, progetto.get("gradi_fondo", n // 2 + 1), **progetto.get("fondo_opzioni", {}))
    griglie.append(("chasmBed", a_immagine(colora(fondo + progetto.get("primo_gradino_fondo", 0), rampa_pozzo))))
    colori["chasmBed"] = rampa_pozzo
    colori["chasm"] = rampa_pozzo + [c for c in progetto.get("rampa_orlo", []) if c not in rampa_pozzo]
    for k, piece in enumerate(orli_pozzo(roccia, progetto.get("rampa_orlo", rampa_pozzo), **progetto.get("orlo_opzioni", {}))):
        pezzi.append(("chasm", a_immagine(piece), {"ordine": k}))
    rampa_ponte = espandi(r["bridgeEW"])
    assi = superficie(*progetto["ponte"], len(rampa_ponte))
    griglie.append(("bridgeNS", a_immagine(colora(assi, rampa_ponte))))
    griglie.append(("bridgeEW", a_immagine(colora(np.rot90(assi), rampa_ponte))))
    colori["bridgeNS"] = rampa_ponte
    colori["bridgeEW"] = rampa_ponte
    orizz, vert, palo = ringhiere(assi, rampa_ponte)
    pezzi.append(("railEW", a_immagine(orizz), None))
    pezzi.append(("railNS", a_immagine(vert), None))
    pezzi.append(("post", a_immagine(palo), None))
    if "tappeto" in progetto:
        griglie.append(("carpet", libero(*progetto["tappeto"][:2], colori=14, luce=progetto["tappeto"][2], saturazione=progetto["tappeto"][3])))
        # Tutti i colori del tappeto vanno confrontati con i colpi nemici.
        usati = griglie[-1][1].convert("RGB").getcolors(256)
        colori["carpet"] = [rgbhex(c) for _, c in sorted(usati, key=lambda v: sum(v[1]))]
    for ripara in progetto["ripari"]:
        pezzi.append(("cover", oggetto(*ripara[:2], **ripara[2]), None))
    # Le griglie in testa, a righe; sotto, gli altri pezzi.
    altezza = 0
    x = 0
    posti = {}
    for materiale, im in griglie:
        if x + im.width > LARGHEZZA_ATLANTE:
            x = 0
            altezza += 128
        posti[materiale] = (x, altezza, im)
        x += im.width
    altezza += 128
    atlante_pezzi, rett = impacchetta(pezzi)
    atlante = Image.new("RGBA", (LARGHEZZA_ATLANTE, altezza + atlante_pezzi.height), (0, 0, 0, 0))
    griglie_ts = {}
    for materiale, (gx, gy, im) in posti.items():
        atlante.paste(im, (gx, gy))
        griglie_ts[materiale] = {"x": gx, "y": gy, "cells": im.width // LATO, "size": LATO}
    atlante.paste(atlante_pezzi, (0, altezza))
    for lista in rett.values():
        for voce_r in lista:
            voce_r["y"] += altezza
    rett["chasm"] = sorted(rett["chasm"], key=lambda v: v.pop("ordine"))
    for materiale, lista in rett.items():
        if materiale != "chasm":
            lista.sort(key=lambda v: (v["y"], v["x"]))
    return atlante, griglie_ts, rett, colori


def apertura(im):
    """Il vano di un portale: dal centro della base si sale finche' c'e' vuoto, poi ci si allarga a meta' altezza."""
    a = np.asarray(im)[..., 3] > 0
    alt, larg = a.shape
    cx = larg // 2
    fondo = alt - 1
    while fondo > 0 and a[fondo, cx]:
        fondo -= 1
    cima = fondo
    while cima > 0 and not a[cima - 1, cx]:
        cima -= 1
    meta = (cima + fondo) // 2
    x0 = x1 = cx
    while x0 > 0 and not a[meta, x0 - 1]:
        x0 -= 1
    while x1 < larg - 1 and not a[meta, x1 + 1]:
        x1 += 1
    return {"x": int(x0), "y": int(cima), "w": int(x1 - x0 + 1), "h": int(alt - cima)}


def costruisci_scene(tema, progetto):
    voci = []
    for ruolo, lista in progetto["scene"].items():
        for voce in lista:
            nome, cand = voce[0], voce[1]
            opzioni = dict(voce[2]) if len(voce) > 2 else {}
            luce_sorgente = opzioni.pop("sorgente", None)
            if ruolo == "facade":
                im = libero(nome, cand, colori=opzioni.get("colori", 32), luce=opzioni.get("luce", 1.0), saturazione=opzioni.get("saturazione", 1.0))
                taglia = opzioni.get("taglia")
                if taglia:
                    im = im.crop((0, im.height - taglia, im.width, im.height))
            else:
                im = oggetto(nome, cand, **opzioni)
            if luce_sorgente:
                luce_sorgente = {**luce_sorgente, "x": round(luce_sorgente["x"] * im.width), "y": round(luce_sorgente["y"] * im.height)}
            extra = {"light": luce_sorgente} if luce_sorgente else {}
            if ruolo == "gate":
                extra["hole"] = apertura(im)
            voci.append((ruolo, im, extra or None))
    atlante, rett = impacchetta(voci)
    return atlante, rett


# --- Uscita -----------------------------------------------------------------------------------------------------------


def ts_rect(r):
    testo = f"{{ x: {r['x']}, y: {r['y']}, w: {r['w']}, h: {r['h']}"
    if r.get("hole"):
        b = r["hole"]
        testo += f", hole: {{ x: {b['x']}, y: {b['y']}, w: {b['w']}, h: {b['h']} }}"
    if r.get("light"):
        l = r["light"]
        testo += f", light: {{ x: {l['x']}, y: {l['y']}, color: '{l['color']}', radius: {l['radius']}, intensity: {l['intensity']} }}"
    return testo + " }"


def scrivi(progetto, solo=None):
    OUT_TILE.mkdir(parents=True, exist_ok=True)
    OUT_SCENE.mkdir(parents=True, exist_ok=True)
    blocchi_tile, blocchi_scene = [], []
    totale = 0
    for tema, p in progetto.items():
        atlante, griglie, rett, colori = costruisci_tile(tema, p)
        atlante.save(OUT_TILE / f"{tema}.png", optimize=True)
        totale += (OUT_TILE / f"{tema}.png").stat().st_size
        print(f"tile {tema} {atlante.size} {(OUT_TILE / f'{tema}.png').stat().st_size // 1024} KB", {k: len(v) for k, v in rett.items()})
        righe = [f"  {tema}: {{",
                 f"    url: new URL('../../../assets/art/tiles-ia/{tema}.png', import.meta.url).href,",
                 f"    width: {atlante.width},",
                 f"    height: {atlante.height},",
                 "    scale: 1,",
                 "    grids: {"]
        for nome, g in griglie.items():
            righe.append(f"      {nome}: {{ x: {g['x']}, y: {g['y']}, cells: {g['cells']}, size: {g['size']} }},")
        righe += ["    },", "    tiles: {"]
        for nome, lista in rett.items():
            righe.append(f"      {nome}: [" + ", ".join(ts_rect(r) for r in lista) + "],")
        righe += ["    },", "    colors: {"]
        for nome, rampa in colori.items():
            righe.append(f"      {nome}: [" + ", ".join(repr(c) for c in rampa) + "],")
        righe += ["    },", "  },"]
        blocchi_tile.append("\n".join(righe))

        scena, pezzi = costruisci_scene(tema, p)
        scena.save(OUT_SCENE / f"{tema}.png", optimize=True)
        totale += (OUT_SCENE / f"{tema}.png").stat().st_size
        print(f"scene {tema} {scena.size} {(OUT_SCENE / f'{tema}.png').stat().st_size // 1024} KB", {k: len(v) for k, v in pezzi.items()})
        righe = [f"  {tema}: {{",
                 f"    url: new URL('../../../assets/art/scenari/{tema}.png', import.meta.url).href,",
                 "    pieces: {"]
        for nome, lista in pezzi.items():
            righe.append(f"      {nome}: [" + ", ".join(ts_rect(r) for r in lista) + "],")
        righe += ["    },", "  },"]
        blocchi_scene.append("\n".join(righe))
    print("totale", totale // 1024, "KB")
    testa = """// File generato da tools/arte/prepara_scenari.py: non modificarlo a mano, rilancia lo script.

import type { ArenaThemeId } from '../../arena/arena';
import type { TileAtlasLayout } from './tile-atlas';

/** I fogli dei tile generati in locale, a un pixel per unita' di mondo: griglie che ripetono e pezzi. */
export const TILE_ATLASES_IA: Readonly<Record<ArenaThemeId, TileAtlasLayout>> = {
"""
    OUT_TILE_TS.write_text(testa + "\n".join(blocchi_tile) + "\n};\n", encoding="utf-8", newline="\n")
    testa = """// File generato da tools/arte/prepara_scenari.py: non modificarlo a mano, rilancia lo script.

import type { ArenaThemeId } from '../../arena/arena';

/** Luce di un pezzo, rispetto al suo angolo alto a sinistra. */
export interface SceneryLight {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly radius: number;
  readonly intensity: number;
}

/** Un pezzo del foglio delle scenografie. */
export interface SceneryPiece {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly light?: SceneryLight;
  /** Il vano di un portale, rispetto all'angolo alto a sinistra. */
  readonly hole?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

/** Il foglio delle scenografie di un tema: facciate, lesene, pilastri, arredi a terra e appesi. */
export interface SceneryAtlas {
  readonly url: string;
  readonly pieces: Readonly<Record<string, readonly SceneryPiece[]>>;
}

export const SCENERY_ATLASES: Readonly<Record<ArenaThemeId, SceneryAtlas>> = {
"""
    OUT_SCENE_TS.write_text(testa + "\n".join(blocchi_scene) + "\n};\n", encoding="utf-8", newline="\n")
    print("scritti gli atlanti")


def anteprime(progetto, cartella, solo):
    cartella.mkdir(parents=True, exist_ok=True)
    for tema, p in progetto.items():
        if solo and tema not in solo:
            continue
        atlante, griglie, rett, _ = costruisci_tile(tema, p)
        fondo = Image.new("RGB", atlante.size, "#8a8a90")
        fondo.paste(atlante, (0, 0), atlante)
        fondo.save(cartella / f"{tema}-tile.png")
        scena, _ = costruisci_scene(tema, p)
        fondo = Image.new("RGB", scena.size, "#8a8a90")
        fondo.paste(scena, (0, 0), scena)
        fondo.save(cartella / f"{tema}-scene.png")
        print(tema, atlante.size, scena.size)


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--progetto", type=Path, default=QUI / "scenari-progetto.json")
    a.add_argument("--anteprime", type=Path)
    a.add_argument("--solo", help="temi separati da virgole, per le anteprime")
    a.add_argument("--scrivi", action="store_true")
    args = a.parse_args()
    progetto = json.loads(args.progetto.read_text(encoding="utf-8"))
    if args.anteprime:
        anteprime(progetto, args.anteprime, args.solo.split(",") if args.solo else None)
    if args.scrivi:
        scrivi(progetto)


if __name__ == "__main__":
    main()
