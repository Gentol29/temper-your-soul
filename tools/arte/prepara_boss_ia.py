"""Costruisce i fogli di sprite di boss e luogotenenti dagli originali del generatore locale (genera_mob.py).

Uso, con il Python della cartella del generatore:
  python tools/arte/prepara_boss_ia.py --candidati cartella [--solo guardian,toad_king]   # confronto dei candidati
  python tools/arte/prepara_boss_ia.py --prove cartella                                    # animazioni dei prescelti
  python tools/arte/prepara_boss_ia.py --scrivi                                            # PNG e geometria per il gioco

Stesso formato dei fogli di prepara_boss.py: una riga per animazione (camminata, attacco, le stesse in furia,
trasformazione, morte), quindi il gioco li disegna con lo stesso codice. Il modello fa un solo disegno per figura: tutte
le animazioni nascono da quello, con le parti del corpo spostate rigide di pixel interi (vedi prepara_mob.py). La furia
e' la stessa figura ricolorata su una rampa propria; la trasformazione passa da un colore all'altro a retino; la morte
schiaccia la figura e la sbriciola fino alle macerie.

Misure, moto, rampa della furia e candidato scelto stanno in boss-progetto.json. Scale sempre 1: un pixel del foglio e'
un'unita' di mondo, come il personaggio e i mob.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import prepara_mob as pm
from prepara_mob import VUOTO, Corpo, deforma, morsetto

QUI = Path(__file__).parent
RADICE = QUI.parent.parent
PROGETTO = QUI / "boss-progetto.json"
USCITA_PNG = RADICE / "src/assets/art/boss-ia"
USCITA_TS = RADICE / "src/features/presentation/boss-art/boss-ia-layout.ts"
SPAZIO = 24
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16.0


# --- I moti, per fase: fase in radianti, tutti gli spostamenti interi per parte --------------------------------------


def fianco(x, c):
    return 1 if x > c.cx else -1


def in_arma(x, y, c, voce):
    """Vero per i pixel di un'arma tenuta di lato (`arma`: lato e quota da cui comincia): una spada o una vanga si muove
    tutta intera con il braccio, altrimenti le fasce del corpo la spezzerebbero."""
    for arma in voce.get("arma", ()):
        if (x - c.cx) * arma["lato"] > 0 and abs(x - c.cx) > c.W * arma.get("oltre", voce.get("spalle", 0.30)) and y >= c.r0 + arma.get("da", 0.0) * c.H:
            return True
    return False


def bipede(m, c, voce, fase):
    """Un piede si alza mentre l'altro e' a terra; il peso passa sul piede fermo; le braccia vanno contro le gambe."""
    s = math.sin(fase)
    alza = max(1, round(c.H * 0.08))
    peso = max(1, round(c.W * 0.04))
    sale = max(1, round(c.H * 0.025))
    braccio = max(1, round(c.H * 0.045))
    anca = c.r0 + voce.get("anca", 0.60) * c.H
    ginocchio = anca + (c.r1 - anca) * 0.5
    spalla = c.r0 + voce.get("spalla", 0.28) * c.H
    fine = anca + c.H * 0.08
    spalle = c.W * voce.get("spalle", 0.30)
    dx0, dy0 = round(-peso * s), round(-sale * abs(s))

    def f(x, y):
        lato = fianco(x, c)
        if in_arma(x, y, c, voce) or (spalla <= y < fine and abs(x - c.cx) > spalle):
            return dx0, dy0 + round(braccio * s * lato)
        if y < anca:
            return dx0, dy0
        solleva = round(alza * max(0.0, s * lato))
        return 0, -solleva if y >= ginocchio else -(solleva // 2)
    return deforma(m, f)


def fluttua(m, c, voce, fase):
    """Chi non tocca terra (maghi, spettri): sale e scende intero, l'orlo ondeggia in ritardo sul corpo."""
    s = math.sin(fase)
    su = round(max(2, c.H * 0.03) * s)
    orlo = max(1, round(c.W * 0.07))
    vita = c.r0 + 0.5 * c.H

    def f(x, y):
        if y < vita or in_arma(x, y, c, voce):
            return 0, su
        t = morsetto((y - vita) / max(1.0, c.r1 - vita))
        return round(orlo * t * t * math.sin(fase - 1.2)), su
    return deforma(m, f)


def pianta(m, c, voce, fase):
    """Radicata (la madre delle spore): il capo oscilla dalla base, le radici si contorcono con un'onda."""
    s = math.sin(fase)
    ampiezza = max(2, round(c.W * 0.05))
    radici = c.r0 + 0.74 * c.H
    onda = max(1, round(c.H * 0.025))

    def f(x, y):
        if y >= radici:
            return 0, round(onda * math.sin(2 * math.pi * (x - c.c0) / max(1, c.W) * 2 + fase))
        t = morsetto((radici - y) / max(1.0, radici - c.r0))
        return round(ampiezza * t * t * s), round(-1 * abs(s) * t)
    return deforma(m, f)


def volo(m, c, voce, fase):
    """Ali aperte (il doccione): l'ala si piega sempre di piu' verso la punta, di scorcio agli estremi; il corpo fa il contrario."""
    s = math.sin(fase)
    ampiezza = max(2, round(c.W * 0.07))
    tronco = c.W * voce.get("tronco", 0.22)

    def f(x, y):
        d = morsetto((abs(x - c.cx) - tronco) / max(1.0, c.W / 2 - tronco))
        if d <= 0:
            return 0, round(-1.5 * s)
        # Salti di un pixel alla volta lungo l'ala: a salti maggiori le punte sottili si staccherebbero.
        scorcio = 1 if d > 0.8 and abs(s) > 0.7 else 0
        return -fianco(x, c) * scorcio, round(ampiezza * d * s)
    return deforma(m, f)


def balzo(m, c, voce, fase):
    """Chi avanza a salti (il rospo re): anticipo schiacciato, stacco allungato, volo, atterraggio."""
    t = ((fase + math.pi / 8) % (2 * math.pi)) / (2 * math.pi)
    pancia = c.r0 + 0.62 * c.H
    alto = max(3, round(c.H * 0.16))
    if t < 0.25:
        quanto = round(max(1, c.H * 0.08) * math.sin(t / 0.25 * math.pi))
        return deforma(m, lambda x, y: ((fianco(x, c) if abs(x - c.cx) > c.W * 0.26 and quanto else 0), quanto if y < pancia else 0))
    if t < 0.75:
        su = round(alto * math.sin((t - 0.25) / 0.5 * math.pi))
        return deforma(m, lambda x, y: (0, -su - (1 if y < pancia and su else 0)))
    quanto = round(max(1, c.H * 0.05) * math.sin((t - 0.75) / 0.25 * math.pi))
    return deforma(m, lambda x, y: ((fianco(x, c) if abs(x - c.cx) > c.W * 0.26 and quanto else 0), quanto if y < pancia else 0))


def zampe(m, c, voce, fase):
    """Molte zampe di fronte (la regina): tre blocchi per lato, alzati a turno; il corpo e' un blocco solo e ondeggia di poco."""
    ventre = c.r0 + voce.get("anca", 0.55) * c.H
    alza = max(1, round(c.H * 0.045))
    sesto = max(1.0, c.W / 6)
    corpo = c.W * voce.get("corpo", 0.18)
    s = math.sin(fase)

    def f(x, y):
        if y < ventre or abs(x - c.cx) < corpo:
            return round(s), 0
        blocco = int((x - c.c0) / sesto)
        passo = math.sin(fase + blocco * math.pi)
        return 0, -round(alza * max(0.0, passo))
    return deforma(m, f)


MOTI = {"bipede": bipede, "fluttua": fluttua, "pianta": pianta, "volo": volo, "balzo": balzo, "zampe": zampe}


def impugnatura(c, voce, arma):
    """Dove la mano stringe l'arma: l'arma gira attorno a questo punto invece di scorrere."""
    return c.cx + arma["lato"] * c.W * arma.get("oltre", voce.get("spalle", 0.30)), c.r0 + voce.get("mani", 0.62) * c.H


def spostamento_arma(x, y, c, voce, angolo):
    """Quanto si sposta un pixel dell'arma se gira di `angolo` attorno alla mano."""
    for arma in voce.get("arma", ()):
        if (x - c.cx) * arma["lato"] > 0:
            mx, my = impugnatura(c, voce, arma)
            return -(y - my) * angolo * arma["lato"], (x - mx) * angolo * arma["lato"]
    return 0.0, 0.0


def con_arma(m, c, voce, corpo, arma):
    """Corpo e arma separati. Controllare l'arma nel punto d'arrivo la tagliava lungo il bordo della sua zona: lame e sfere
    si sfaldavano. Qui si guarda da dove viene ogni pixel, cosi' l'arma resta intera a qualunque angolo."""
    alt, larg = m.shape
    senza = m.copy()
    for y in range(alt):
        for x in range(larg):
            if senza[y, x] != pm.VUOTO and in_arma(x, y, c, voce):
                senza[y, x] = pm.VUOTO
    nuova = pm.deforma(senza, corpo)
    for y in range(alt):
        for x in range(larg):
            dx, dy = arma(x, y)
            sx, sy = int(round(x - dx)), int(round(y - dy))
            if 0 <= sx < larg and 0 <= sy < alt and m[sy, sx] != pm.VUOTO and in_arma(sx, sy, c, voce):
                nuova[y, x] = m[sy, sx]
    return nuova


def colpo(m, c, voce, peso):
    """Attacco di forza. `peso` > 0 carica (indietro e in alto, braccia su), < 0 scarica (avanti e in basso). Le braccia si
    muovono intere fino alla punta delle mani, attaccate alla spalla da una rampa; l'arma descrive un arco."""
    spalla = c.r0 + voce.get("spalla", 0.28) * c.H
    anca = c.r0 + voce.get("anca", 0.60) * c.H
    mani = c.r0 + voce.get("mani", 0.78) * c.H
    spalle = c.W * voce.get("spalle", 0.30)
    corpo_y = round(-max(2, c.H * 0.05) * peso)
    braccia_y = -max(3, c.H * 0.10) * peso
    inclina = round(-max(1, c.W * 0.04) * peso)
    rampa = max(1.0, c.H * 0.10)

    def arma(x, y):
        ax, ay = spostamento_arma(x, y, c, voce, 0.13 * peso)
        return round(inclina * 0.6 + ax), round(corpo_y + braccia_y + ay)

    def f(x, y):
        fuori = abs(x - c.cx) > spalle
        if y >= anca and not (y < mani and fuori):
            return 0, 0
        t = morsetto((anca - y) / max(1.0, anca - c.r0))
        dx = round(inclina * t)
        if y >= spalla and fuori:
            return dx, round(corpo_y + braccia_y * morsetto((y - spalla) / rampa))
        return dx, corpo_y
    return con_arma(m, c, voce, f, arma)


def incanto(m, c, voce, peso):
    """Attacco di magia: la figura si alza e apre le braccia. Testa e cappuccio stanno sopra le spalle e non si muovono come
    braccia; le maniche salgono con una rampa, e l'arma descrive un arco."""
    spalla = c.r0 + voce.get("spalla", 0.28) * c.H
    meta = c.r0 + voce.get("mani", 0.70) * c.H
    spalle = c.W * voce.get("spalle", 0.30)
    su = round(max(2, c.H * 0.05) * peso)
    apre = round(max(1, c.W * 0.05) * peso)
    braccia_y = -max(2, c.H * 0.07) * peso
    rampa = max(1.0, (meta - spalla) * 0.4)

    def arma(x, y):
        ax, ay = spostamento_arma(x, y, c, voce, 0.07 * peso)
        return round(fianco(x, c) * apre + ax), round(-su + braccia_y + ay)

    def f(x, y):
        if spalla <= y < meta and abs(x - c.cx) > spalle:
            sale = morsetto((y - spalla) / rampa) * morsetto((meta - y) / rampa)
            return fianco(x, c) * round(apre * sale), round(-su + braccia_y * sale)
        return 0, -su if y < meta else -(su // 2)
    return con_arma(m, c, voce, f, arma)


def gonfia(m, c, voce, peso):
    """Attacco di chi non ha braccia (funghi, rospi, regine): la parte alta si alza e si allarga stirandosi, la base resta."""
    base = c.r0 + voce.get("anca", 0.62) * c.H
    su = max(2, c.H * 0.07) * peso
    largo = round(max(1, c.W * 0.04) * peso)
    centro = c.W * 0.12

    def f(x, y):
        if y >= base:
            return 0, 0
        t = (base - y) / max(1.0, base - c.r0)
        return (fianco(x, c) * largo if abs(x - c.cx) > centro else 0), round(-su * t)
    return deforma(m, f)


ATTACCHI = {"colpo": (colpo, (0.0, 0.6, 1.0, -0.8, -0.5, 0.0)), "incanto": (incanto, (0.0, 0.5, 1.0, 1.0, 0.5, 0.0)),
            "gonfia": (gonfia, (0.0, 0.5, 1.0, 1.0, 0.5, 0.0))}


# --- Dal disegno alle animazioni ----------------------------------------------------------------------------------


def schiaccia_morte(m, c, t, seme):
    """Il crollo: la figura si abbassa sui piedi e si allarga, e si sgretola dai bordi verso l'interno e dall'alto. A blocchi
    di tre pixel, diversi per ogni figura; i buchi rimasti chiusi dentro diventano crepe scure, non finestre sul pavimento."""
    altezza = 1.0 - 0.74 * t ** 1.3
    larghezza = 1.0 + 0.30 * t
    alt, larg = m.shape
    rumore = np.random.RandomState(seme).rand(alt // 3 + 1, larg // 3 + 1)
    # Quanto e' lontano dal bordo ogni pixel del disegno, fino a un massimo: il cuore cede per ultimo.
    dentro = m > VUOTO
    profondita = np.zeros(m.shape, dtype=np.float32)
    strato = dentro.copy()
    for _ in range(8):
        strato = strato & ~pm.vicini_di(~strato)
        profondita += strato
    nuova = np.full(m.shape, VUOTO, dtype=np.int32)
    for y in range(alt):
        for x in range(larg):
            sy = c.r1 - (c.r1 - y) / altezza
            sx = c.cx + (x - c.cx) / larghezza
            ix, iy = int(round(sx)), int(round(sy))
            if 0 <= ix < larg and 0 <= iy < alt and m[iy, ix] > VUOTO:
                quota = morsetto((c.r1 - y) / max(1.0, c.H * altezza))
                cuore = 1.0 - 0.7 * profondita[iy, ix] / 8.0
                if rumore[y // 3, x // 3] >= t * (0.2 + 0.8 * quota) * cuore:
                    nuova[y, x] = m[iy, ix]
    vuoti = nuova == VUOTO
    fuori = np.zeros_like(vuoti)
    fuori[0], fuori[-1], fuori[:, 0], fuori[:, -1] = vuoti[0], vuoti[-1], vuoti[:, 0], vuoti[:, -1]
    fuori = pm.allaga(fuori, vuoti)
    nuova[vuoti & ~fuori] = 0
    return nuova


def rampa_furia(tavola, rampa, forza):
    """La stessa figura sulla rampa della furia: ogni colore prende il gradino della sua luminosita', per non cambiare il
    disegno. Le ombre restano ombre e le luci diventano braci. Gli accenti saturi (un nucleo acceso, una corona, una
    visiera) restano quasi come sono: sono cio' che si riconosce, e una furia sbiadita non fa paura."""
    luci = np.array([pm.luce(c) for c in tavola])
    basso, alto = luci.min(), max(luci.max(), luci.min() + 1e-3)
    gradini = [np.array(pm.hex_rgb(c), dtype=np.float32) for c in rampa]
    nuova = []
    for colore, l in zip(tavola, luci):
        x = (l - basso) / (alto - basso) * (len(gradini) - 1)
        i = min(int(x), len(gradini) - 2)
        bersaglio = gradini[i] + (gradini[i + 1] - gradini[i]) * (x - i)
        massimo, minimo = float(colore.max()), float(colore.min())
        saturo = (massimo - minimo) / max(1.0, massimo)
        quanto = forza * (1.0 - 0.75 * morsetto((saturo - 0.45) / 0.35))
        nuova.append(np.clip(colore * (1 - quanto) + bersaglio * quanto, 0, 255))
    return np.array(nuova, dtype=np.int32)


def scurisci(tavola, quanto):
    return np.clip(tavola * (1 - quanto), 0, 255).astype(np.int32)


def schiarisci(tavola, quanto):
    """Le parti luminose si accendono e le ombre restano ombre: una luce uniforme sbiadirebbe la figura come un fantasma."""
    luci = np.array([[pm.luce(c)] for c in tavola], dtype=np.float32)
    return np.clip(tavola + (255 - tavola) * quanto * luci ** 2, 0, 255).astype(np.int32)


def senza_frammenti(matrice):
    """Toglie i pezzetti rimasti staccati dopo uno spostamento: una parte del corpo non vola via da sola."""
    tutti = pm.pezzi(matrice > VUOTO)
    if len(tutti) < 2:
        return matrice
    nuova = matrice.copy()
    for celle in tutti:
        if len(celle) < max(6, len(tutti[0]) * 0.012):
            for y, x in celle:
                nuova[y, x] = VUOTO
    return nuova


def come_rgba(matrice, tavola):
    alt, larg = matrice.shape
    rgba = np.zeros((alt, larg, 4), dtype=np.uint8)
    piena = matrice > VUOTO
    rgba[piena, :3] = tavola[matrice[piena]]
    rgba[piena, 3] = 255
    return rgba


def a_retino(a, b, p):
    """Da un colore all'altro con un retino regolare: il passaggio di fase si legge senza colori nuovi."""
    alt, larg = a.shape[:2]
    soglia = np.fromfunction(lambda y, x: BAYER[y.astype(int) % 4, x.astype(int) % 4], (alt, larg))
    return np.where((soglia < p)[..., None], b, a)


def disegno(percorso, voce):
    """Dall'originale al disegno di partenza: matrice di indici su uno spazio largo e tavolozza, con le misure."""
    a = pm.griglia(percorso)
    figura, persa = pm.togli_sfondo(a, buchi=bool(voce.get("buchi")), ombra=voce.get("ombra", 0.62))
    figura, quota = pm.isola(figura)
    if figura.sum() < 300:
        return None
    ys, xs = np.nonzero(figura)
    if voce.get("taglia_fondo"):
        # Una pozza dipinta sotto la figura: non e' colore d'ombra, quindi va tagliata a mano.
        figura[int(ys.max() - (ys.max() - ys.min() + 1) * voce["taglia_fondo"]) + 1:] = False
        ys, xs = np.nonzero(figura)
    tocca = bool(ys.min() == 0 or xs.min() == 0 or ys.max() == figura.shape[0] - 1 or xs.max() == figura.shape[1] - 1)
    larg0, alt0 = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    larg, alt = pm.misura_finale(larg0, alt0, voce["larghezza"], voce["altezza"])
    larg, alt = max(8, larg - 2), max(8, alt - 2)
    passo = larg0 / larg
    cx, cy = (xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2
    colori, piena = pm.campiona(a, figura, cx, cy, passo, larg + SPAZIO * 2, alt + SPAZIO * 2)
    if not piena.any():
        return None
    base, tavola = pm.limita_palette(colori, piena, 24)
    base = pm.pulisci(base, tavola, soglia=60.0)
    tavola = pm.gradua(base, tavola, tetto=0.5)
    if voce.get("occhi"):
        base, tavola = pm.metti_occhi(base, tavola, voce["occhi"])
    luce_originale = float((a[figura] @ np.array([0.299, 0.587, 0.114])).mean() / 255.0)
    return {"base": base, "tavola": tavola, "note": {"quota": round(float(quota), 2), "copertura": round(float(figura.mean()), 3),
                                                     "tocca_bordo": tocca, "persa_buchi": round(float(persa), 3), "luce_originale": round(luce_originale, 3)}}


def costruisci(percorso, voce):
    """Tutte le animazioni: dizionario clip -> elenco di fotogrammi RGBA, stessa misura, stessi perni."""
    d = disegno(percorso, voce)
    if d is None:
        return None
    base, tavola = d["base"], d["tavola"]
    c = Corpo(base)
    calma = np.vstack([np.clip((tavola[0] * 0.45).astype(np.int32), 0, 255), tavola])
    furia = rampa_furia(calma[1:], voce["furia"], voce.get("forza_furia", 0.72))
    furia = np.vstack([np.clip((furia[0] * 0.45).astype(np.int32), 0, 255), furia])

    moto = MOTI[voce["moto"]]
    n_passi = voce.get("passi", 8)
    passi = [pm.con_contorno(senza_frammenti(moto(base, c, voce, 2 * math.pi * i / n_passi))) for i in range(n_passi)]
    funzione, pesi = ATTACCHI[voce.get("attacco", "colpo")]
    colpi = [pm.con_contorno(senza_frammenti(funzione(base, c, voce, p))) for p in pesi]
    # Il lampo della carica sta nei colori, non nella figura: nei fotogrammi di massimo si accendono le luci.
    lampo = {2: 0.35, 3: 0.55}
    clip = {
        "walk": [come_rgba(f, calma) for f in passi],
        "attack": [come_rgba(f, schiarisci(calma, lampo.get(i, 0))) for i, f in enumerate(colpi)],
        "rageWalk": [come_rgba(f, furia) for f in passi],
        "rageAttack": [come_rgba(f, schiarisci(furia, lampo.get(i, 0))) for i, f in enumerate(colpi)],
    }
    # La trasformazione: trema, si gonfia e passa alla furia a retino, con un lampo a meta'.
    trasformazione = []
    for i in range(7):
        p = i / 6
        verso = 1 if i % 2 else -1
        scossa = 0 if i in (0, 6) else verso * (1 + (i // 2))
        gonfia = round(math.sin(p * math.pi) * max(1, c.H * 0.04))
        f = pm.con_contorno(deforma(base, lambda x, y: (scossa, -gonfia if y < c.r0 + 0.6 * c.H else 0)))
        forte = 0.45 * math.sin(p * math.pi) ** 2
        trasformazione.append(a_retino(come_rgba(f, schiarisci(calma, forte)), come_rgba(f, schiarisci(furia, forte)), p))
    clip["transform"] = trasformazione
    # La morte: lampo, crollo, macerie. Si muore in furia, se si e' arrivati in furia; i colori si spengono.
    morte = []
    for i in range(9):
        t = i / 8
        f = pm.con_contorno(schiaccia_morte(base, c, t, voce["seme_morte"]))
        morte.append(come_rgba(f, scurisci(furia, 0.45 * t)))
    clip["death"] = morte

    tutti = [f for fotogrammi in clip.values() for f in fotogrammi]
    piene = np.any([f[..., 3] > 0 for f in tutti], axis=0)
    righe = np.nonzero(piene.any(axis=1))[0]
    colonne = np.nonzero(piene.any(axis=0))[0]
    y0, y1, x0, x1 = righe[0], righe[-1] + 1, colonne[0], colonne[-1] + 1
    clip = {nome: [f[y0:y1, x0:x1] for f in fotogrammi] for nome, fotogrammi in clip.items()}
    primo = clip["walk"][0][..., 3] > 0
    fondo = int(np.nonzero(primo.any(axis=1))[0][-1]) + 1
    piedi = primo[max(0, fondo - max(3, int(primo.shape[0] * 0.15))):fondo]
    xs = np.nonzero(piedi)[1]
    fps = voce.get("fps") or int(morsetto(round(n_passi * voce.get("velocita", 90) / max(1, c.H * 1.4)), 5, 12))
    return {"clip": clip, "note": d["note"], "piedi": (int(np.median(xs)), fondo), "cella": (int(x1 - x0), int(y1 - y0)),
            "fps": fps, "tavola": calma, "matrici": passi, "colpi": colpi, "base": base, "furia": furia}


# --- I controlli -----------------------------------------------------------------------------------------------------


def controlla(esito, voce, nome):
    """Misure e difetti di un foglio. Un difetto e' una frase; nessun difetto non vuol dire bello."""
    difetti = []
    note, clip = esito["note"], esito["clip"]
    passi = esito["matrici"]
    primo = passi[0]
    corpo = primo > 0
    tavola = esito["tavola"]
    area = int((primo > VUOTO).sum())
    righe = np.nonzero(corpo.any(axis=1))[0]
    colonne = np.nonzero(corpo.any(axis=0))[0]
    alto, largo = int(righe[-1] - righe[0] + 1), int(colonne[-1] - colonne[0] + 1)

    # 1. La figura.
    if note["quota"] < 0.85:
        difetti.append(f"piu' soggetti: il pezzo maggiore e' il {note['quota']:.0%}")
    if note["tocca_bordo"]:
        difetti.append("la figura tocca il bordo dell'originale: e' tagliata")
    if note["copertura"] < 0.04:
        difetti.append("figura troppo piccola nell'originale")
    if note["persa_buchi"] > 0.05:
        difetti.append(f"togliere i buchi ha mangiato il {note['persa_buchi']:.0%} della figura")
    bersaglio = voce["larghezza"] * voce["altezza"]
    if not 0.35 <= area / bersaglio <= 1.25:
        difetti.append(f"ingombro lontano dal progetto: {area / bersaglio:.2f} dell'area")
    raggio = voce.get("raggio")
    if raggio and largo < raggio * 1.3:
        difetti.append(f"piu' stretto del cerchio di colpo: {largo} px con raggio {raggio}")
    if pm.isolati(primo) > 0.12:
        difetti.append(f"rumoroso: {pm.isolati(primo):.0%} di pixel isolati")
    fascia = righe[0] + int(alto * 0.74)
    for indice in range(1, len(tavola)):
        pixel = primo == indice
        quanti = int(pixel.sum())
        if quanti > corpo.sum() * 0.07 and int(pixel[fascia:].sum()) / quanti > 0.92:
            difetti.append("possibile macchia a terra: un colore sta tutto sulla base")
            break
    fuori = np.zeros_like(primo > VUOTO)
    piena = primo > VUOTO
    fuori[0], fuori[-1], fuori[:, 0], fuori[:, -1] = ~piena[0], ~piena[-1], ~piena[:, 0], ~piena[:, -1]
    fuori = pm.allaga(fuori, ~piena)
    if (~piena & ~fuori).sum() > area * 0.08:
        difetti.append(f"buchi dentro la figura: {(~piena & ~fuori).sum() / area:.0%}")

    # 2. Il colore.
    usati = primo[corpo]
    medio = tavola[usati].mean(axis=0)
    scarto = pm.luce(medio) - note["luce_originale"]
    if abs(scarto) > 0.08:
        difetti.append(f"la riduzione ha cambiato la luminosita': {scarto:+.2f}")
    pavimento = pm.PAVIMENTO.get(voce.get("dungeon"))
    if pavimento:
        anello = corpo & pm.vicini_di(primo == 0)
        stacco = np.abs(np.array([pm.luce(c) for c in tavola])[primo[anello]] - pm.luce(pm.hex_rgb(pavimento)))
        quota = float((stacco >= 0.12).mean())
        if quota < 0.20:
            difetti.append(f"si perde sul pavimento: si stacca solo il {quota:.0%} del bordo interno")
    furia_media = esito["furia"][usati].mean(axis=0)
    if np.sqrt(((furia_media - medio) ** 2).sum()) < 16:
        difetti.append("la furia si distingue poco dalla calma")
    croma = lambda t: float(np.mean([(int(t[i].max()) - int(t[i].min())) / max(1, int(t[i].max())) for i in usati]))
    if croma(esito["furia"]) < croma(tavola) * 0.75:
        difetti.append(f"la furia sbiadisce: croma {croma(esito['furia']):.2f} contro {croma(tavola):.2f}")

    # 3. Il movimento.
    aree = [int((f > VUOTO).sum()) for f in passi]
    if (max(aree) - min(aree)) / area > 0.14:
        difetti.append(f"la massa cambia troppo camminando: {(max(aree) - min(aree)) / area:.0%}")
    base_pezzi = len(pm.pezzi(corpo))
    for i, f in enumerate(passi):
        if len(pm.pezzi(f > 0)) > base_pezzi:
            difetti.append(f"camminata {i}: la figura si spezza")
            break
    for i, f in enumerate(esito["colpi"]):
        if len(pm.pezzi(f > 0)) > base_pezzi:
            difetti.append(f"attacco {i}: la figura si spezza")
            break
    if voce["moto"] == "bipede":
        # A ogni passo un lato solo si solleva: l'altro deve restare sulla sua riga di partenza.
        centro = int(round(Corpo(primo).cx))
        fondo_lato = lambda f, sinistra: int(np.nonzero((f[:, :centro] if sinistra else f[:, centro:]) > VUOTO)[0].max())
        fermi_sx, fermi_dx = fondo_lato(primo, True), fondo_lato(primo, False)
        for i, f in enumerate(passi):
            if fondo_lato(f, True) != fermi_sx and fondo_lato(f, False) != fermi_dx:
                difetti.append(f"camminata {i}: nessun piede resta a terra")
                break
        striscia = corpo[righe[-1] - max(1, int(alto * 0.10)):righe[-1] + 1].any(axis=0)
        if len(pm.pezzi(striscia[np.newaxis, :])) < 2:
            difetti.append("gambe non separate: il passo si vede poco")
    salta = voce["moto"] == "balzo"
    tremiti = [pm.tremolio(passi[i], passi[(i + 1) % len(passi)], raggio=12 if salta else 4) for i in range(len(passi))]
    if max(tremiti) > 0.2:
        difetti.append(f"il dettaglio trema: {max(tremiti):.0%}")
    scatti = []
    for i in range(len(passi)):
        a, b = passi[i] > VUOTO, passi[(i + 1) % len(passi)] > VUOTO
        scatti.append(float((a != b).sum()) / max(1, int((a & pm.vicini_di(~a)).sum())))
    if max(scatti) < 0.25:
        difetti.append(f"camminata quasi invisibile: {max(scatti):.2f}")
    if max(scatti) > (6.0 if salta else 2.4):
        difetti.append(f"camminata a scatti: {max(scatti):.2f}")
    colpo_massimo = max(float(((esito["colpi"][0] > VUOTO) != (f > VUOTO)).sum()) / area for f in esito["colpi"])
    if colpo_massimo < 0.08:
        difetti.append(f"l'attacco si vede poco: {colpo_massimo:.0%}")
    finale = int((clip["death"][-1][..., 3] > 0).sum())
    if finale > area * 0.7:
        difetti.append(f"la morte non crolla: resta il {finale / area:.0%}")
    if finale < area * 0.08:
        difetti.append(f"la morte non lascia macerie: resta il {finale / area:.0%}")
    return {"area": area, "misura": f"{largo}x{alto}", "cella": esito["cella"], "colori": len(tavola), "fps": esito["fps"], "scatti": [round(s, 2) for s in scatti],
            "tremolio": round(max(tremiti), 3), "difetti": difetti}


# --- Fogli, confronti, animazioni -------------------------------------------------------------------------------------


ORDINE = ("walk", "attack", "rageWalk", "rageAttack", "transform", "death")


def foglio(esito):
    w, h = esito["cella"]
    colonne = max(len(f) for f in esito["clip"].values())
    tela = Image.new("RGBA", (colonne * w, len(ORDINE) * h), (0, 0, 0, 0))
    for r, nome in enumerate(ORDINE):
        for c, f in enumerate(esito["clip"][nome]):
            tela.paste(Image.fromarray(f, "RGBA"), (c * w, r * h))
    return tela


def candidati(progetto, cartella, solo):
    """Una riga per candidato: originale, camminata, attacco, furia, morte, e i difetti misurati."""
    cartella.mkdir(parents=True, exist_ok=True)
    impronta = hashlib.md5(Path(__file__).read_bytes()).hexdigest()[:8]
    for nome in solo or progetto:
        voce = progetto[nome]
        file = pm.candidati(nome)
        riga_alta = 190
        tela = Image.new("RGB", (1650, 22 + riga_alta * max(1, len(file))), "#1c1a20")
        d = ImageDraw.Draw(tela)
        d.text((6, 4), f"{nome}  codice {impronta}", fill="#9a9488")
        fondo = pm.PAVIMENTO.get(voce.get("dungeon"), "#2a2830")
        for r, percorso in enumerate(file):
            y = 22 + r * riga_alta
            tela.paste(Image.open(percorso).convert("RGB").resize((150, 150), Image.Resampling.LANCZOS), (6, y + 18))
            d.text((6, y + 2), f"#{r} {percorso.stem[:12]}", fill="#f0dfa8")
            esito = costruisci(percorso, voce)
            if esito is None:
                d.text((170, y + 20), "nessuna figura riconosciuta", fill="#f07868")
                continue
            esame = controlla(esito, voce, nome)
            d.text((170, y + 2), f"{esame['misura']}  cella {esame['cella']}  {esame['colori']} col  {esame['fps']} fps  trem {esame['tremolio']}", fill="#b0a890")
            x = 170
            mostra = [esito["clip"]["walk"][0], esito["clip"]["walk"][2], esito["clip"]["attack"][2], esito["clip"]["attack"][3],
                      esito["clip"]["rageWalk"][0], esito["clip"]["death"][-1]]
            for f in mostra:
                d.rectangle((x, y + 18, x + 148, y + riga_alta - 8), fill=fondo)
                img = Image.fromarray(f, "RGBA")
                k = 1 if img.width > 72 or img.height > 84 else 2 if img.width <= 72 else 1
                img = img.resize((img.width * k, img.height * k), Image.Resampling.NEAREST)
                tela.paste(img, (x + max(0, (148 - img.width) // 2), y + riga_alta - 12 - img.height), img)
                x += 152
            testo = "\n".join(esame["difetti"]) or "nessun difetto misurato"
            d.multiline_text((x + 6, y + 18), testo, fill="#f07868" if esame["difetti"] else "#8fd08a")
        destinazione = cartella / f"candidati-{nome}.png"
        tela.save(destinazione)
        print(destinazione)


def scelta(nome, voce):
    file = pm.candidati(nome)
    return file[voce.get("scelta", 0)]


def prove(progetto, cartella, solo):
    """Un'animazione per il giudizio: tutti i prescelti che ripetono camminata, attacco, furia, trasformazione, morte."""
    cartella.mkdir(parents=True, exist_ok=True)
    nomi = solo or list(progetto)
    esiti = [(n, costruisci(scelta(n, progetto[n]), progetto[n])) for n in nomi]
    resoconto = {n: controlla(e, progetto[n], n) for n, e in esiti}
    (cartella / "controlli-boss.json").write_text(json.dumps(resoconto, indent=1, ensure_ascii=False), encoding="utf-8")
    for n, e in resoconto.items():
        print(n, e["misura"], "area", e["area"], e["fps"], "fps  trem", e["tremolio"], "|", "; ".join(e["difetti"]) or "ok")
    # La gerarchia: un boss non deve essere piu' piccolo di un mini boss del suo dungeon.
    if not solo:
        for n, e in resoconto.items():
            if progetto[n].get("boss"):
                maggiori = [m for m, v in resoconto.items() if not progetto[m].get("boss") and progetto[m]["dungeon"] == progetto[n]["dungeon"] and v["area"] >= e["area"]]
                if maggiori:
                    print(f"GERARCHIA: {n} ({e['area']}) non supera {maggiori}")
    colonne = 4
    lato_l, lato_a = 190, 170
    righe = math.ceil(len(esiti) / colonne)
    durate = (("walk", 2.0), ("attack", 0.8), ("rageWalk", 1.6), ("rageAttack", 0.8), ("transform", 1.0), ("death", 1.4))
    totale = sum(s for _, s in durate)
    passo = 1 / 14
    quadri = []
    for q in range(int(totale / passo)):
        t = q * passo
        tela = Image.new("RGB", (colonne * lato_l, righe * lato_a), "#1c1a20")
        d = ImageDraw.Draw(tela)
        fase, inizio = durate[-1][0], totale - durate[-1][1]
        accumulo = 0.0
        for nome_clip, secondi in durate:
            if t < accumulo + secondi:
                fase, inizio = nome_clip, accumulo
                break
            accumulo += secondi
        secondi = dict(durate)[fase]
        for i, (nome, esito) in enumerate(esiti):
            x, y = (i % colonne) * lato_l, (i // colonne) * lato_a
            d.rectangle((x + 2, y + 16, x + lato_l - 3, y + lato_a - 3), fill=pm.PAVIMENTO.get(progetto[nome].get("dungeon"), "#2a2830"))
            d.text((x + 4, y + 2), f"{nome}  {fase}", fill="#f0dfa8")
            fotogrammi = esito["clip"][fase]
            if fase in ("walk", "rageWalk"):
                indice = int((t - inizio) * esito["fps"]) % len(fotogrammi)
            else:
                indice = min(len(fotogrammi) - 1, int((t - inizio) / secondi * len(fotogrammi)))
            img = Image.fromarray(fotogrammi[indice], "RGBA")
            piedi_x, piedi_y = esito["piedi"]
            tela.paste(img, (x + lato_l // 2 - piedi_x, y + lato_a - 12 - piedi_y), img)
        quadri.append(tela.convert("P", palette=Image.Palette.ADAPTIVE, colors=255))
    uscita = cartella / "boss-animazione.gif"
    quadri[0].save(uscita, save_all=True, append_images=quadri[1:], duration=int(1000 * passo), loop=0, disposal=2)
    print(uscita)
    # Tutti i fotogrammi di un foglio, per i dettagli.
    for nome, esito in esiti:
        foglio(esito).save(cartella / f"foglio-{nome}.png")


def scrivi(progetto):
    USCITA_PNG.mkdir(parents=True, exist_ok=True)
    righe = ["// File generato da tools/arte/prepara_boss_ia.py: non modificarlo a mano, rilancia lo script.", "",
             "import type { SheetLayout } from './boss-sheet';", "",
             "/** Foglio di un boss o luogotenente fatto con il generatore locale: geometria, ritmo e posizione nel mondo. */",
             "export interface BossIaSheet {",
             "  readonly layout: SheetLayout;",
             "  readonly walkFps: number;",
             "  readonly feetY: number;",
             "  readonly portraitScale: number;",
             "}", "",
             "export const BOSS_IA_SHEETS: Readonly<Record<string, BossIaSheet>> = {"]
    totale = 0
    for nome, voce in progetto.items():
        esito = costruisci(scelta(nome, voce), voce)
        percorso = USCITA_PNG / f"{nome}.png"
        foglio(esito).quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(percorso, optimize=True)
        totale += percorso.stat().st_size
        w, h = esito["cella"]
        clip = ", ".join(f"{c}: {{ row: {r}, frames: {len(esito['clip'][c])} }}" for r, c in enumerate(ORDINE))
        # Nella vignetta della scelta del dungeon la figura sta sotto i 225 pixel (i piedi sono a 228), con ingrandimento intero.
        figura = np.nonzero((esito["clip"]["walk"][0][..., 3] > 0).any(axis=1))[0]
        vignetta = max(1, 225 // int(figura[-1] - figura[0] + 1))
        righe += [f"  {nome}: {{",
                  "    layout: {",
                  f"      url: new URL('../../../assets/art/boss-ia/{nome}.png', import.meta.url).href,",
                  f"      cell: {{ width: {w}, height: {h} }},",
                  f"      feet: {{ x: {esito['piedi'][0]}, y: {esito['piedi'][1]} }},",
                  f"      clips: {{ {clip} }},",
                  "    },",
                  f"    walkFps: {esito['fps']},",
                  f"    feetY: {voce['piedi_mondo']},",
                  f"    portraitScale: {vignetta},",
                  "  },"]
    righe += ["};", ""]
    USCITA_TS.write_text("\n".join(righe), encoding="utf-8", newline="\n")
    print(f"Scritti {len(progetto)} fogli, {totale // 1024} KB")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--candidati", type=Path)
    p.add_argument("--prove", type=Path)
    p.add_argument("--solo")
    p.add_argument("--scrivi", action="store_true")
    args = p.parse_args()
    progetto = json.loads(PROGETTO.read_text(encoding="utf-8"))
    solo = args.solo.split(",") if args.solo else None
    if args.candidati:
        candidati(progetto, args.candidati, solo)
    if args.prove:
        prove(progetto, args.prove, solo)
    if args.scrivi:
        scrivi(progetto)


if __name__ == "__main__":
    main()
