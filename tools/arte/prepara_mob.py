"""Riduce gli originali di genera_mob.py a sprite del gioco: matrici di caratteri con la loro tavolozza.

Uso, con il Python della cartella del generatore:
  python tools/arte/prepara_mob.py --anteprime cartella [--gruppo crypt_]   # strisce, animazioni e controlli dei candidati
  python tools/arte/prepara_mob.py --scrivi                                 # sprite scelti (mob-moti.json), per il gioco

Per ogni originale: griglia vera di Pixel Art XL (celle da 8 pixel), sfondo e ombra a terra tolti, figura ritagliata e
ridotta alla stessa area dello sprite disegnato a mano (cosi' l'ingombro nel mondo non cambia), tavolozza limitata.

Il modello non sa ripetere la stessa figura in due immagini, quindi l'animazione non viene da lui: i quattro fotogrammi
nascono dall'unico disegno. Le parti del corpo (gambe, braccia, ali, fiamma, coda) si spostano rigide di pixel interi,
cosi' il dettaglio interno non trema; campionando all'indietro la figura si stira invece di strapparsi; il contorno si
rifa' su ogni fotogramma. Chi ruota (spada, fiocco) si riduce di nuovo dall'originale ruotato.

`controlla` misura ogni sprite e segnala cio' che non va. Nessun difetto non vuol dire bello, vuol dire misurabile: il
giudizio finale resta a chi guarda l'animazione.
"""
import argparse
import colorsys
import hashlib
import json
import os
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

QUI = Path(__file__).parent
RADICE = QUI.parent.parent
# La cartella delle immagini di ComfyUI, fuori dal repository.
IMMAGINI = Path(os.environ.get("PIXELART_AI_IMMAGINI", Path.home() / "Downloads" / "PixelArt-AI" / "immagini"))
USCITA = RADICE / "src/features/presentation/minion-art/generated-sprites.ts"
CELLA = 8
SPAZIO = 8
SIMBOLI = "abcdefghijklmnopqrstuvwxyz"
VUOTO = -1
# Le tinte di ogni dungeon, in gradi: caldi per brace e rame, viola per l'Ordine, verdi per la palude, azzurri per il gelo.
GAMMA = {"crypt": ((0, 55), (255, 360)), "swamp": ((0, 55), (55, 175), (255, 330)), "forge": ((0, 60), (255, 300)), "glacier": ((0, 55), (170, 300))}
PAVIMENTO = {"crypt": "#2b2a33", "swamp": "#2c3226", "forge": "#2e2622", "glacier": "#39485a"}


# --- Dall'originale alla figura ------------------------------------------------------------------------------------


def griglia(percorso):
    """Ogni cella della griglia diventa il suo colore mediano, che ignora le sfumature dei bordi."""
    a = np.asarray(Image.open(percorso).convert("RGB"))
    alt, larg = a.shape[0] // CELLA, a.shape[1] // CELLA
    blocchi = a[: alt * CELLA, : larg * CELLA].reshape(alt, CELLA, larg, CELLA, 3).transpose(0, 2, 1, 3, 4)
    return np.median(blocchi.reshape(alt, larg, -1, 3), axis=2).astype(np.float32)


def allaga(semi, ammessi):
    """Riempie a partire dai semi attraverso le celle ammesse (quattro direzioni)."""
    pieno = semi.copy()
    alt, larg = pieno.shape
    pila = list(zip(*np.nonzero(pieno)))
    while pila:
        y, x = pila.pop()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < alt and 0 <= nx < larg and ammessi[ny, nx] and not pieno[ny, nx]:
                pieno[ny, nx] = True
                pila.append((ny, nx))
    return pieno


def vicini_di(maschera):
    v = np.zeros_like(maschera)
    v[1:] |= maschera[:-1]
    v[:-1] |= maschera[1:]
    v[:, 1:] |= maschera[:, :-1]
    v[:, :-1] |= maschera[:, 1:]
    return v


def pezzi(figura):
    """Pezzi connessi della maschera, dal piu' grande, come liste di celle."""
    visti = np.zeros_like(figura)
    risultato = []
    alt, larg = figura.shape
    for y0, x0 in zip(*np.nonzero(figura)):
        if visti[y0, x0]:
            continue
        pila, celle = [(y0, x0)], []
        visti[y0, x0] = True
        while pila:
            y, x = pila.pop()
            celle.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < alt and 0 <= nx < larg and figura[ny, nx] and not visti[ny, nx]:
                    visti[ny, nx] = True
                    pila.append((ny, nx))
        risultato.append(celle)
    return sorted(risultato, key=len, reverse=True)


def togli_sfondo(a, tolleranza=38.0, buchi=False, ombra=0.62):
    """Maschera della figura. Il colore di sfondo si legge dal bordo e si toglie solo cio' che tocca il bordo: il
    contorno scuro protegge l'interno, anche quando il soggetto (un orso bianco) ha il colore dello sfondo. Dal fondo
    si scende poi nell'ombra a terra, grigia e in basso. Con `buchi` si tolgono anche le zone chiuse praticamente
    identiche allo sfondo (fra le gambe, dentro un anello). Restituisce anche la quota di figura tolta dai buchi."""
    bordo = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    sfondo = np.median(bordo, axis=0)
    distanza = np.sqrt(((a - sfondo) ** 2).sum(axis=2))
    simile = distanza < tolleranza
    semi = np.zeros_like(simile)
    semi[0], semi[-1], semi[:, 0], semi[:, -1] = simile[0], simile[-1], simile[:, 0], simile[:, -1]
    fondo = allaga(semi, simile)
    if not fondo.any():
        return np.zeros_like(fondo), 0.0
    righe = np.nonzero((~fondo).any(axis=1))[0]
    # Da quale quota si cerca l'ombra: una figura grigia (una statua) si perderebbe gambe e piedi, e la vuole molto bassa.
    if len(righe) and ombra is not None:
        soglia = righe[0] + (righe[-1] - righe[0]) * ombra
        croma = a.max(axis=2) - a.min(axis=2)
        luce_cella = a.mean(axis=2)
        ombra = (croma < 26) & (luce_cella > 55) & (luce_cella < 228)
        ombra[: int(soglia)] = False
        fondo = allaga(fondo, fondo | ombra)
    persa = 0.0
    if buchi:
        prima = int((~fondo).sum())
        for celle in pezzi((distanza < tolleranza * 0.32) & ~fondo):
            if len(celle) >= 3:
                for y, x in celle:
                    fondo[y, x] = True
        persa = (prima - int((~fondo).sum())) / max(1, prima)
    figura = ~fondo
    # L'alone: una cella di bordo un po' tinta dello sfondo sta a meta' strada, e tocca il fuori.
    figura &= ~(vicini_di(fondo) & (distanza < tolleranza * 1.8))
    return figura, persa


def solo_maggiore(figura):
    """Solo il pezzo connesso piu' grande della maschera."""
    tutti = pezzi(figura)
    pulita = np.zeros_like(figura)
    for y, x in tutti[0] if tutti else []:
        pulita[y, x] = True
    return pulita


def isola(figura):
    """Tiene il pezzo piu' grande e quelli non trascurabili; toglie schizzi e sporco. Quanto pesa il pezzo maggiore dice
    se il modello ha disegnato un soggetto solo."""
    tutti = pezzi(figura)
    pulita = np.zeros_like(figura)
    if not tutti:
        return pulita, 0.0
    for celle in tutti:
        if len(celle) >= max(6, len(tutti[0]) * 0.04):
            for y, x in celle:
                pulita[y, x] = True
    return pulita, len(tutti[0]) / max(1, int(pulita.sum()))


def misura_finale(larg, alt, bersaglio_l, bersaglio_a):
    """Stessa area dello sprite a mano, senza superare troppo il suo lato maggiore."""
    fattore = (bersaglio_l * bersaglio_a / max(1, larg * alt)) ** 0.5
    limite = max(bersaglio_l, bersaglio_a) * 1.15
    fattore = min(fattore, limite / max(larg, alt))
    return max(4, round(larg * fattore)), max(4, round(alt * fattore))


LUCE = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
# Quante celle servono perche' un segno sopravviva alla riduzione, e quanto deve staccarsi dal colore mediano.
SEGNO_SCURO, SEGNO_CHIARO, SEGNO_STACCO = 0.3, 0.28, 40.0


def campiona(a, figura, cx, cy, passo, larg, alt):
    """Ridipinge la figura su una griglia larg x alt centrata in (cx, cy), `passo` celle per pixel. Per ogni pixel il
    colore mediano delle celle coperte, se sono per lo piu' figura. Con la sola mediana occhi, mani, zampe sottili e
    contorni fra le gambe spariscono: se una parte delle celle e' molto piu' scura o molto piu' chiara delle altre,
    vince quella (scuro prima del chiaro, perche' separa le forme). Provate la moda (puntini) e la media (impastata)."""
    colori = np.zeros((alt, larg, 3), dtype=np.float32)
    piena = np.zeros((alt, larg), dtype=bool)
    limite_y, limite_x = figura.shape
    for j in range(alt):
        ya = max(0, int(math.floor(cy + (j - alt / 2) * passo)))
        yb = min(limite_y, max(ya + 1, int(math.ceil(cy + (j + 1 - alt / 2) * passo))))
        for i in range(larg):
            xa = max(0, int(math.floor(cx + (i - larg / 2) * passo)))
            xb = min(limite_x, max(xa + 1, int(math.ceil(cx + (i + 1 - larg / 2) * passo))))
            if ya >= yb or xa >= xb:
                continue
            maschera = figura[ya:yb, xa:xb]
            if maschera.size and maschera.mean() >= 0.45:
                piena[j, i] = True
                celle = a[ya:yb, xa:xb][maschera]
                mediana = np.median(celle, axis=0)
                luce = celle @ LUCE
                centro = float(mediana @ LUCE)
                scure = luce < centro - SEGNO_STACCO
                chiare = luce > centro + SEGNO_STACCO
                if scure.mean() >= SEGNO_SCURO:
                    colori[j, i] = np.median(celle[scure], axis=0)
                elif chiare.mean() >= SEGNO_CHIARO:
                    colori[j, i] = np.median(celle[chiare], axis=0)
                else:
                    colori[j, i] = mediana
    return colori, piena


def limita_palette(colori, piena, massimo):
    """Tavolozza piccola sui soli pixel della figura, senza colori quasi uguali (sprecherebbero la tavolozza). Restituisce
    gli indici e i colori ordinati dal piu' scuro."""
    pixel = colori[piena].astype(np.uint8)
    img = Image.fromarray(pixel.reshape(-1, 1, 3), "RGB")
    quant = img.quantize(colors=min(massimo, max(2, len(pixel))), method=Image.Quantize.MEDIANCUT, kmeans=8,
                         dither=Image.Dither.NONE)
    tavola = np.array(quant.getpalette()[: 3 * (int(np.asarray(quant).max()) + 1)], dtype=np.int32).reshape(-1, 3)
    indici = np.asarray(quant).reshape(-1).astype(np.int32)
    for i in range(len(tavola)):
        if not (indici == i).any():
            continue
        for j in range(i + 1, len(tavola)):
            if np.sqrt(((tavola[i] - tavola[j]) ** 2).sum()) < 14:
                indici[indici == j] = i
    usati = np.unique(indici)
    tavola = tavola[usati]
    indici = np.searchsorted(usati, indici)
    ordine = np.argsort(tavola @ np.array([299, 587, 114]))
    rango = np.zeros(len(ordine), dtype=np.int32)
    rango[ordine] = np.arange(len(ordine))
    matrice = np.full(piena.shape, VUOTO, dtype=np.int32)
    matrice[piena] = rango[indici]
    return matrice, tavola[ordine]


def gradua(matrice, tavola, tetto=0.45):
    """Saturazione comune: se la figura e' molto piu' satura del resto del gioco si abbassa tutta, senza cambiarle tinta."""
    usati = matrice[matrice > VUOTO]
    if usati.size == 0:
        return tavola
    hsv = [colorsys.rgb_to_hsv(*(c / 255.0)) for c in tavola]
    media = float(np.mean([hsv[i][1] for i in usati]))
    if media <= tetto:
        return tavola
    fattore = tetto / media
    # Le luci restano accese: un fuoco spento non si legge piu' come fuoco.
    return np.array([[round(v * 255) for v in colorsys.hsv_to_rgb(h, s * (1.0 if v0 > 0.8 else fattore), v0)] for h, s, v0 in hsv], dtype=np.int32)


def ritinta(tavola, regole):
    """Riporta sulla gamma del dungeon i colori che il modello ha sbagliato, senza toccare il disegno: una campana verde
    torna bronzo, un occhio blu torna brace. Ogni regola sposta su una tinta i colori dentro un intervallo di gradi."""
    nuova = []
    for colore in tavola:
        h, sat, v = colorsys.rgb_to_hsv(*(colore / 255.0))
        gradi = h * 360
        for regola in regole:
            basso, alto = regola["da"]
            dentro = basso <= gradi <= alto if basso <= alto else gradi >= basso or gradi <= alto
            if dentro and sat >= regola.get("oltre", 0.15) and v <= regola.get("fino_a", 1.0):
                h, sat = regola["a"] / 360.0, min(1.0, sat * regola.get("sat", 1.0))
                break
        nuova.append([round(c * 255) for c in colorsys.hsv_to_rgb(h, sat, v)])
    return np.array(nuova, dtype=np.int32)


def pulisci(m, tavola, soglia=70.0):
    """Toglie i puntini: un pixel diverso da tutti i vicini prende il colore piu' simile fra quelli attorno, a meno che
    non sia un segno forte (un occhio, un dente) con molto stacco da tutti."""
    n = m.copy()
    alt, larg = m.shape
    for y in range(1, alt - 1):
        for x in range(1, larg - 1):
            v = m[y, x]
            attorno = [m[y - 1, x], m[y + 1, x], m[y, x - 1], m[y, x + 1]]
            if v < 0 or min(attorno) < 0 or v in attorno:
                continue
            distanze = [float(np.sqrt(((tavola[v] - tavola[q]) ** 2).sum())) for q in attorno]
            if min(distanze) < soglia:
                n[y, x] = attorno[int(np.argmin(distanze))]
    return n


def sul_tavola(colori, piena, tavola):
    """Riporta colori qualsiasi sulla tavolozza data (i fotogrammi ruotati devono usare gli stessi colori del primo)."""
    matrice = np.full(piena.shape, VUOTO, dtype=np.int32)
    ys, xs = np.nonzero(piena)
    for y, x in zip(ys, xs):
        matrice[y, x] = int(np.argmin(((tavola - colori[y, x]) ** 2).sum(axis=1)))
    return matrice


# --- I movimenti ----------------------------------------------------------------------------------------------------


class Corpo:
    """Le misure della figura, da cui dipende ogni movimento."""

    def __init__(self, m):
        piena = m > VUOTO
        righe = np.nonzero(piena.any(axis=1))[0]
        colonne = np.nonzero(piena.any(axis=0))[0]
        self.r0, self.r1 = int(righe[0]), int(righe[-1])
        self.c0, self.c1 = int(colonne[0]), int(colonne[-1])
        self.H = self.r1 - self.r0 + 1
        self.W = self.c1 - self.c0 + 1
        self.cx = float(np.nonzero(piena)[1].mean())
        self.cy = float(np.nonzero(piena)[0].mean())


def morsetto(v, basso=0.0, alto=1.0):
    return max(basso, min(alto, v))


def deforma(m, campo):
    """Sposta i pixel secondo `campo(x, y) -> (dx, dy)`, dato nel punto d'arrivo: ogni pixel d'arrivo cerca da dove viene.
    Con spostamenti interi per parte il dettaglio resta identico dentro ogni parte, e fra due parti la figura si stira
    invece di strapparsi."""
    alt, larg = m.shape
    nuova = np.full(m.shape, VUOTO, dtype=np.int32)
    for y in range(alt):
        for x in range(larg):
            dx, dy = campo(x, y)
            sx, sy = int(round(x - dx)), int(round(y - dy))
            if 0 <= sx < larg and 0 <= sy < alt:
                nuova[y, x] = m[sy, sx]
    return nuova


def bipede(m, c, voce):
    """Di fronte. Un piede si alza mentre l'altro resta a terra, il peso si sposta sul piede fermo, il corpo sale di un
    pixel, il braccio opposto al piede alzato va avanti. Come il passo corretto del personaggio: il piede avanza
    sollevato."""
    alza = max(1, round(c.H * 0.08))
    anca = c.r0 + 0.60 * c.H
    ginocchio = c.r0 + 0.80 * c.H
    # Con la testa grande le spalle sono piu' in basso: la testa non deve muoversi come un braccio.
    spalla = c.r0 + voce.get("spalla", 0.28) * c.H
    # Il braccio si muove intero fino alla punta della mano, altrimenti la mano si sdoppia.
    fine_braccio = c.r0 + voce.get("mani", 0.72) * c.H
    spalle = c.W * voce.get("spalle", 0.30)
    # Quello che sta oltre i fianchi e' cio' che il braccio regge: non deve restare indietro quando il braccio va avanti.
    oltre = c.W * voce.get("oltre", 0.40)

    def campo(lato):
        def f(x, y):
            if (spalla <= y < fine_braccio and abs(x - c.cx) > spalle) or abs(x - c.cx) > oltre:
                return -lato, -1 + (1 if (x - c.cx) * lato > 0 else -1)
            if y < anca:
                return -lato, -1
            if (x - c.cx) * lato > 0:
                return 0, -alza if y >= ginocchio else -max(1, alza // 2)
            return 0, 0
        return f

    return [m, deforma(m, campo(1)), m, deforma(m, campo(-1))]


def veste(m, c, voce):
    """Chi non ha gambe a vista (tonache, veli): l'orlo ondeggia a fasce, il busto respira di un pixel."""
    ampiezza = max(1, round(c.W * 0.07))
    vita = c.r0 + 0.5 * c.H

    parte = voce.get("parte")

    def campo(fase):
        def f(x, y):
            if parte and c.c0 + parte[0] * c.W <= x <= c.c0 + parte[2] * c.W and c.r0 + parte[1] * c.H <= y <= c.r0 + parte[3] * c.H:
                return 2 * fase, 0
            if y < vita:
                return 0, -1 if fase else 0
            t = morsetto((y - vita) / max(1.0, c.r1 - vita))
            return round(ampiezza * t * t + 0.25) * fase, 0
        return f

    return [m, deforma(m, campo(1)), m, deforma(m, campo(-1))]


def quadrupede(m, c, voce):
    """Di profilo: quattro blocchi di zampe, alzati a coppie alterne; il corpo sale di un pixel e la testa accenna."""
    alza = max(1, round(c.H * 0.14))
    ventre = c.r0 + 0.58 * c.H
    quarto = max(1.0, c.W / 4)

    def campo(coppia):
        def f(x, y):
            blocco = int((x - c.c0) / quarto)
            if y >= ventre:
                return (0, -alza) if blocco % 2 == coppia else (0, 0)
            return 0, -1
        return f

    return [m, deforma(m, campo(0)), m, deforma(m, campo(1))]


def ali(m, c, voce):
    """Di fronte: tre fasce per ala, su, a meta', giu', a meta'. Agli estremi le punte si avvicinano al corpo, perche'
    un'ala alzata si vede di scorcio, e il corpo fa il contrario di poco, come chi si tiene in aria."""
    ampiezza = max(2, round(c.W * 0.11))
    # Con le zampe sotto il corpo (gli insetti) il tronco e' piu' largo: le zampe non devono battere come ali.
    tronco = c.W * voce.get("tronco", 0.16)

    def campo(fase):
        def f(x, y):
            d = morsetto((abs(x - c.cx) - tronco) / max(1.0, c.W / 2 - tronco))
            if d <= 0:
                return 0, -fase
            fascia = 0.34 if d < 0.34 else 0.67 if d < 0.67 else 1.0
            verso = 1 if x > c.cx else -1
            return -verso * (1 if fascia == 1.0 and fase else 0), round(ampiezza * fascia) * fase
        return f

    return [m, deforma(m, campo(-1)), m, deforma(m, campo(1))]


def striscia(m, c, voce):
    """Un'onda che corre lungo il corpo e cresce verso la coda: la testa quasi ferma, la coda frusta."""
    ampiezza = max(1, round(min(c.W, c.H) * 0.20))
    testa = voce.get("testa") or ("destra" if c.W >= c.H else "su")
    lungo = testa in ("destra", "sinistra")

    def campo(fase):
        def f(x, y):
            if lungo:
                t = morsetto((x - c.c0) / max(1, c.W))
                t = 1 - t if testa == "destra" else t
                return 0, ampiezza * t ** 1.3 * math.sin(2 * math.pi * 1.1 * t + fase)
            t = morsetto((y - c.r0) / max(1, c.H))
            t = 1 - t if testa == "giu" else t
            return ampiezza * t ** 1.3 * math.sin(2 * math.pi * 1.1 * t + fase), 0
        return f

    return [deforma(m, campo(f)) for f in (0.0, math.pi / 2, math.pi, 3 * math.pi / 2)]


def schiaccia(c, quanto, largo, cucitura=0.62):
    """La parte alta scende di `quanto` righe e i fianchi si allargano: occhi e piedi restano identici."""
    pancia = c.r0 + cucitura * c.H
    fianco = c.W * 0.26
    spalle = c.r0 + 0.4 * c.H

    def f(x, y):
        dx = (1 if x > c.cx else -1) * largo if abs(x - c.cx) > fianco and y >= spalle else 0
        return dx, quanto if y < pancia else 0
    return f


def rimbalzo(m, c, voce):
    """Chi salta o rimbalza: anticipo schiacciato, stacco in aria un po' allungato, atterraggio. Un salto vero, non un
    respiro: la base lascia il suolo."""
    forza = min(2, max(1, round(c.H * 0.08)))
    stacco = min(4, max(2, round(c.H * 0.12)))
    pancia = c.r0 + 0.62 * c.H

    def in_aria(x, y):
        return 0, -stacco - (1 if y < pancia else 0)

    return [m, deforma(m, schiaccia(c, forza, 1)), deforma(m, in_aria), deforma(m, schiaccia(c, max(1, forza // 2), 1))]


def respiro(m, c, voce):
    """Chi sta fermo (nidi, torrette): la parte alta cala di poco e torna, senza toccare il dettaglio."""
    cucitura = voce.get("cucitura", 0.62)
    return [m, deforma(m, schiaccia(c, 1, 0, cucitura)), deforma(m, schiaccia(c, 2, 0, cucitura)), deforma(m, schiaccia(c, 1, 0, cucitura))]


def fiamma(m, c, voce):
    """Guizza solo la parte alta indicata da `fiamma_da`; il resto del corpo resta fermo."""
    soglia = c.r0 + voce.get("fiamma_da", 0.38) * c.H
    ampiezza = max(1, round(c.W * 0.14))

    def campo(fase, sale):
        def f(x, y):
            if y >= soglia:
                return 0, 0
            t = (soglia - y) / max(1.0, soglia - c.r0)
            return round(ampiezza * t ** 1.5) * fase, -sale if t > 0.4 else 0
        return f

    return [m, deforma(m, campo(1, 0)), deforma(m, campo(0, 1)), deforma(m, campo(-1, 0))]


def sobbalzo(m, c, voce):
    """Un oggetto rigido: tutto intero, su e giu' di un pixel. Il dettaglio non cambia."""
    def campo(dy):
        return lambda x, y: (0, dy)
    return [m, deforma(m, campo(-1)), m, deforma(m, campo(1))]


MOTI = {"bipede": bipede, "veste": veste, "quadrupede": quadrupede, "ali": ali, "striscia": striscia,
        "rimbalzo": rimbalzo, "respiro": respiro, "fiamma": fiamma, "sobbalzo": sobbalzo}
# Questi non deformano il disegno: si riducono di nuovo dall'originale ruotato. Angoli in gradi per fotogramma.
ROTAZIONI = {"dondolo": (0, 6, 0, -6), "rotazione": (0, 22.5, 45, 67.5), "oscilla": (0, 7, 0, -7)}

# Chi cammina ha il ciclo legato alla velocita' (un piede a terra non deve scivolare); gli altri hanno un ritmo proprio.
RITMO_FISSO = {"ali": 12, "rimbalzo": 8, "respiro": 4, "fiamma": 10, "oscilla": 6, "dondolo": 5, "rotazione": 10}


# Solo chi sta in aria ondeggia nel gioco: a terra i piedi devono restare fermi.
FLUTTUANO = {"ali", "dondolo", "rotazione"}

# Per questi i fotogrammi sono un passo: da fermi restano sul primo.
CAMMINANO = {"bipede", "veste", "quadrupede", "striscia", "rimbalzo"}


def ritmo(moto, voce, c):
    if moto in RITMO_FISSO:
        return RITMO_FISSO[moto]
    velocita = voce.get("velocita") or 90
    passo = c.W if moto == "striscia" else c.H * 1.4
    return int(morsetto(round(4 * velocita / max(1, passo)), 5, 16))


def lancio(m, c):
    """Posa di lancio dei luogotenenti: la parte alta si alza e si sporge, la base resta a terra."""
    meta = c.r0 + c.H * 0.55
    alza = max(2, round(c.H * 0.07))

    def f(x, y):
        return (max(1, round(c.W * 0.05)), -alza) if y < meta else (0, 0)
    return deforma(m, f)


def senza_frammenti(matrice):
    """Toglie i pezzetti rimasti staccati dopo uno spostamento: una parte del corpo non vola via da sola."""
    tutti = pezzi(matrice > VUOTO)
    if len(tutti) < 2:
        return matrice
    nuova = matrice.copy()
    for celle in tutti:
        if len(celle) < max(4, len(tutti[0]) * 0.02):
            for y, x in celle:
                nuova[y, x] = VUOTO
    return nuova


def con_contorno(matrice):
    """Il contorno di un pixel attorno alla figura, rifatto su ogni fotogramma perche' resti chiuso. Indice 0."""
    nuova = np.where(matrice > VUOTO, matrice + 1, VUOTO)
    contorno = vicini_di(nuova > VUOTO) & (nuova == VUOTO)
    nuova[contorno] = 0
    return nuova


def metti_occhi(m, tavola, occhi):
    """Ritocco per i mob piccoli, se gli occhi del modello non sopravvivono: due macchie del colore indicato, in frazioni
    del riquadro della figura. Stanno nel disegno di partenza, quindi si muovono con la testa."""
    c = Corpo(m)
    colore = np.array(hex_rgb(occhi["colore"]), dtype=np.int32)
    tavola = np.vstack([tavola, colore])
    indice = len(tavola) - 1
    n = m.copy()
    lato = occhi.get("lato", 2)
    for fx, fy in occhi["punti"]:
        x, y = round(c.c0 + fx * (c.W - 1)), round(c.r0 + fy * (c.H - 1))
        n[y:y + lato, x:x + lato] = np.where(n[y:y + lato, x:x + lato] > VUOTO, indice, n[y:y + lato, x:x + lato])
    return n, tavola


def sprite(percorso, voce):
    """Dall'originale allo sprite: fotogrammi, tavolozza, ritmo e misure, o None se non si riconosce una figura."""
    a = griglia(percorso)
    if voce.get("ruota"):
        # Per le figure che il modello non sa disegnare di traverso (una spada orizzontale): quarti di giro.
        a = np.rot90(a, k=voce["ruota"] // 90).astype(np.float32)
    figura, persa = togli_sfondo(a, buchi=bool(voce.get("buchi")))
    figura, quota = isola(figura)
    if voce.get("un_pezzo"):
        # Un oggetto solo: i frammenti attorno al soggetto principale sono scarti del modello.
        figura = solo_maggiore(figura)
    if voce.get("taglia_fondo"):
        # Quello che il modello ha messo a terra sotto la figura e che non e' sfondo (un'ombra chiara, un vaso).
        righe = np.nonzero(figura.any(axis=1))[0]
        figura[righe[-1] + 1 - round(len(righe) * voce["taglia_fondo"]):] = False
    if figura.sum() < 200:
        return None
    ys, xs = np.nonzero(figura)
    tocca = bool(ys.min() == 0 or xs.min() == 0 or ys.max() == figura.shape[0] - 1 or xs.max() == figura.shape[1] - 1)
    larg0, alt0 = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    larg, alt = misura_finale(larg0, alt0, voce["larghezza"], voce["altezza"])
    if max(larg, alt) < 26:
        # Occhi e zampe non stanno in meno di tanto: il disegno cresce, l'ingombro di gioco resta il raggio di colpo.
        fattore = 26 / max(larg, alt)
        larg, alt = round(larg * fattore), round(alt * fattore)
    larg, alt = max(4, larg - 2), max(4, alt - 2)
    passo = larg0 / larg
    cx, cy = (xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2
    colori, piena = campiona(a, figura, cx, cy, passo, larg + SPAZIO * 2, alt + SPAZIO * 2)
    if not piena.any():
        return None
    massimo = voce.get("colori") or (8 if max(larg, alt) <= 20 else 12 if max(larg, alt) <= 36 else 16)
    base, tavola = limita_palette(colori, piena, massimo)
    # I fotogrammi ruotati vengono dall'originale: si riportano su questi colori, prima di tinte e saturazione, cosi' gli
    # indici valgono anche per la tavolozza finale e il colore non cambia da un fotogramma all'altro.
    tavola_grezza = tavola.copy()
    # Sui mob piccoli un pixel solo puo' essere un occhio: non si pulisce.
    if max(larg, alt) > 20:
        base = pulisci(base, tavola)
    tavola = gradua(base, tavola)
    if voce.get("tinte"):
        tavola = ritinta(tavola, voce["tinte"])
    if voce.get("bianco_a"):
        # Lo sfondo rimasto chiuso dentro la figura, dove togliere i buchi mangerebbe anche il resto.
        tavola = tavola.copy()
        tavola[tavola.min(axis=1) > 215] = [int(voce["bianco_a"][i:i + 2], 16) for i in (1, 3, 5)]
    if voce.get("occhi"):
        base, tavola = metti_occhi(base, tavola, voce["occhi"])
    moto = voce.get("moto") or "respiro"
    c = Corpo(base)
    if moto in ROTAZIONI:
        fotogrammi = []
        for angolo in voce.get("angoli") or ROTAZIONI[moto]:
            if angolo == 0:
                fotogrammi.append(base)
                continue
            # Chi e' appeso (una campana) gira attorno alla cima; gli altri attorno al centro.
            centro = (float(cx), float(ys.min())) if moto == "oscilla" else (float(cx), float(cy))
            ruotata = np.asarray(Image.fromarray(a.astype(np.uint8), "RGB").rotate(angolo, Image.Resampling.NEAREST, center=centro))
            maschera = np.asarray(Image.fromarray(figura.astype(np.uint8) * 255).rotate(angolo, Image.Resampling.NEAREST, center=centro)) > 127
            altri, piena_r = campiona(ruotata.astype(np.float32), maschera, cx, cy, passo, larg + SPAZIO * 2, alt + SPAZIO * 2)
            ruotato = sul_tavola(altri, piena_r, tavola_grezza)
            fotogrammi.append(pulisci(ruotato, tavola_grezza) if max(larg, alt) > 20 else ruotato)
    else:
        fotogrammi = list(MOTI[moto](base, c, voce))
    if voce.get("luogotenente"):
        fotogrammi.append(lancio(base, c))
    fotogrammi = [con_contorno(senza_frammenti(f)) for f in fotogrammi]
    piene = np.any([f > VUOTO for f in fotogrammi], axis=0)
    righe = np.nonzero(piene.any(axis=1))[0]
    colonne = np.nonzero(piene.any(axis=0))[0]
    fotogrammi = [f[righe[0]:righe[-1] + 1, colonne[0]:colonne[-1] + 1] for f in fotogrammi]
    # Gli sprite di profilo guardano tutti a destra: e' il gioco a specchiarli secondo il verso di marcia.
    if voce.get("specchia"):
        fotogrammi = [f[:, ::-1] for f in fotogrammi]
    scuro = np.clip((tavola[0] * 0.45).astype(np.int32), 0, 255)
    luce_originale = float((a[figura] @ np.array([0.299, 0.587, 0.114])).mean() / 255.0)
    return {"fotogrammi": fotogrammi, "tavola": np.vstack([scuro, tavola]), "fps": ritmo(moto, voce, c), "moto": moto,
            "note": {"quota": round(float(quota), 2), "copertura": round(float(figura.mean()), 3), "tocca_bordo": tocca,
                     "luce_originale": round(luce_originale, 3), "persa_buchi": round(float(persa), 3)}}


# --- I controlli -------------------------------------------------------------------------------------------------


def luce(rgb):
    return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255.0


def hex_rgb(colore):
    return tuple(int(colore[i:i + 2], 16) for i in (1, 3, 5))


def isolati(m):
    """Quota di pixel interni molto diversi da tutti e quattro i vicini: il rumore che si vede come puntini."""
    alt, larg = m.shape
    conta = interni = 0
    for y in range(1, alt - 1):
        for x in range(1, larg - 1):
            v = m[y, x]
            attorno = [m[y - 1, x], m[y + 1, x], m[y, x - 1], m[y, x + 1]]
            if v < 1 or min(attorno) < 1:
                continue
            interni += 1
            conta += all(abs(int(q) - int(v)) > 1 for q in attorno)
    return conta / max(1, interni)


def tremolio(a, b, lato=5, raggio=2):
    """Quanto cambia il dettaglio fra due fotogrammi oltre al suo spostamento: blocchi della figura confrontati con il
    posto migliore nei dintorni. Basso = le parti si muovono intere; alto = la trama ribolle."""
    alt, larg = a.shape
    residui = []
    for y in range(0, alt - lato + 1, lato):
        for x in range(0, larg - lato + 1, lato):
            blocco = a[y:y + lato, x:x + lato]
            if (blocco > 0).sum() < lato * lato * 0.6:
                continue
            migliore = 1.0
            for dy in range(-raggio, raggio + 1):
                for dx in range(-raggio, raggio + 1):
                    ya, xa = y + dy, x + dx
                    if ya < 0 or xa < 0 or ya + lato > alt or xa + lato > larg:
                        continue
                    migliore = min(migliore, float((blocco != b[ya:ya + lato, xa:xa + lato]).mean()))
            residui.append(migliore)
    return float(np.mean(residui)) if residui else 0.0


# Spostamento del bordo in un passo (circa 2 = un pixel) ammesso per ogni moto: sotto non si vede, sopra e' a scatti.
PASSI = {"bipede": (0.3, 1.4), "veste": (0.15, 1.2), "quadrupede": (0.3, 1.5), "ali": (0.4, 1.9), "striscia": (0.25, 1.7),
         "rimbalzo": (0.3, 4.5), "respiro": (0.04, 1.2), "fiamma": (0.08, 1.4), "oscilla": (0.15, 2.2),
         "dondolo": (0.3, 2.0), "rotazione": (0.3, 3.0)}


def controlla(esito, voce, nome):
    """Misure e difetti di uno sprite, come frasi."""
    fotogrammi, tavola, moto = esito["fotogrammi"], esito["tavola"], esito["moto"]
    difetti = []
    ciclo = fotogrammi[:4]
    primo = ciclo[0]
    corpo = primo > 0
    aree = [int((f > VUOTO).sum()) for f in ciclo]
    pezzi_0 = len(pezzi(corpo))
    righe_c = np.nonzero(corpo.any(axis=1))[0]
    colonne_c = np.nonzero(corpo.any(axis=0))[0]
    alt_c, larg_c = int(righe_c[-1] - righe_c[0] + 1), int(colonne_c[-1] - colonne_c[0] + 1)

    # 1. La figura.
    note = esito["note"]
    if note["quota"] < 0.85:
        difetti.append(f"piu' soggetti: il pezzo maggiore e' il {note['quota']:.0%}")
    if note["tocca_bordo"]:
        difetti.append("la figura tocca il bordo dell'originale: e' tagliata")
    if note["copertura"] < 0.025:
        difetti.append("figura troppo piccola nell'originale: la riduzione perde dettaglio")
    if note["persa_buchi"] > 0.05:
        difetti.append(f"togliere i buchi ha mangiato il {note['persa_buchi']:.0%} della figura")
    rapporto = aree[0] / max(1, voce["larghezza"] * voce["altezza"])
    if not 0.30 <= rapporto <= 1.25:
        difetti.append(f"ingombro lontano dallo sprite a mano: {rapporto:.2f} dell'area")
    raggio = voce.get("raggio")
    if raggio and min(larg_c, alt_c) < raggio * 0.8:
        difetti.append(f"piu' sottile del suo raggio di colpo: {min(larg_c, alt_c)} px con raggio {raggio}")
    piena = primo > VUOTO
    fuori = np.zeros_like(piena)
    fuori[0], fuori[-1], fuori[:, 0], fuori[:, -1] = ~piena[0], ~piena[-1], ~piena[:, 0], ~piena[:, -1]
    fuori = allaga(fuori, ~piena)
    forati = int((~piena & ~fuori).sum())
    if forati > aree[0] * 0.08:
        difetti.append(f"buchi dentro la figura: {forati / aree[0]:.0%} dell'area")
    rumore = isolati(primo)
    if rumore > 0.10 and aree[0] >= 120:
        difetti.append(f"sprite rumoroso: {rumore:.0%} di pixel isolati")
    # Una macchia a terra: un colore tutto nella fascia bassa, con un'area non trascurabile.
    fascia = righe_c[0] + int(alt_c * 0.72)
    for indice in range(1, len(tavola)):
        pixel = primo == indice
        quanti = int(pixel.sum())
        if quanti > corpo.sum() * 0.08 and int(pixel[fascia:].sum()) / quanti > 0.92:
            difetti.append("possibile macchia a terra: un colore sta tutto sulla base")
            break

    # 2. Il colore, rispetto al progetto, all'originale e al pavimento.
    usati = primo[corpo]
    medio = tavola[usati].mean(axis=0) if usati.size else tavola[-1]
    scarto_luce = luce(medio) - note["luce_originale"]
    if abs(scarto_luce) > 0.08:
        difetti.append(f"la riduzione ha cambiato la luminosita': {scarto_luce:+.2f} rispetto all'originale")
    if voce.get("colore_mano"):
        h1, s1, v1 = colorsys.rgb_to_hsv(*[c / 255 for c in medio])
        h2, s2, v2 = colorsys.rgb_to_hsv(*[c / 255 for c in hex_rgb(voce["colore_mano"])])
        scarto = min(abs(h1 - h2), 1 - abs(h1 - h2))
        if s1 > 0.22 and s2 > 0.22 and scarto > 0.12:
            difetti.append(f"tinta lontana dal progetto: {scarto * 360:.0f} gradi")
        if abs(v1 - v2) > 0.45:
            difetti.append(f"luminosita' lontana dal progetto: {v1:.2f} contro {v2:.2f}")
    pavimento = PAVIMENTO.get(nome.split("_")[0])
    if pavimento:
        anello = corpo & vicini_di(primo == 0)
        stacco = np.abs(np.array([luce(c) for c in tavola])[primo[anello]] - luce(hex_rgb(pavimento)))
        quota_stacco = float((stacco >= 0.12).mean()) if stacco.size else 0.0
        if quota_stacco < 0.20:
            difetti.append(f"si perde sul pavimento: solo il {quota_stacco:.0%} del bordo interno si stacca")
    gamma = GAMMA.get(nome.split("_")[0])
    if gamma and usati.size:
        fuori_gamma = 0
        for indice in usati:
            h, sat, v = colorsys.rgb_to_hsv(*(tavola[indice] / 255.0))
            if sat > 0.3 and v > 0.25 and not any(basso <= h * 360 <= alto for basso, alto in gamma):
                fuori_gamma += 1
        if fuori_gamma > usati.size * 0.06:
            difetti.append(f"tinte fuori gamma per il dungeon: {fuori_gamma / usati.size:.0%} dei pixel")
    distanze = [float(np.sqrt(((tavola[i] - tavola[j]) ** 2).sum())) for i in range(1, len(tavola)) for j in range(i + 1, len(tavola))]
    if distanze and min(distanze) < 12:
        difetti.append(f"colori quasi uguali in tavolozza: distanza {min(distanze):.0f}")
    if len(tavola) > 18:
        difetti.append(f"troppi colori: {len(tavola)}")

    # 3. Il movimento.
    limite_massa = 0.24 if moto in ("rimbalzo", "rotazione", "ali") else 0.15
    variazione = (max(aree) - min(aree)) / max(1, aree[0])
    if variazione > limite_massa:
        difetti.append(f"la massa cambia troppo fra i fotogrammi: {variazione:.0%}")
    for i, f in enumerate(ciclo):
        if len(pezzi(f > 0)) > pezzi_0:
            difetti.append(f"fotogramma {i}: la figura si spezza")
    passi, tremiti = [], []
    for i in range(4):
        a, b = ciclo[i] > VUOTO, ciclo[(i + 1) % 4] > VUOTO
        perimetro = max(1, int((a & vicini_di(~a)).sum()))
        passi.append(float((a != b).sum()) / perimetro)
        # Chi salta si sposta di molti pixel tutto intero: non e' tremolio.
        tremiti.append(tremolio(ciclo[i], ciclo[(i + 1) % 4], raggio=7 if moto == "rimbalzo" else 2))
    basso, alto = PASSI.get(moto, (0.1, 3.0))
    if max(passi) < basso:
        difetti.append(f"movimento quasi invisibile: {max(passi):.2f} (minimo {basso})")
    if max(passi) > alto:
        difetti.append(f"movimento a scatti: {max(passi):.2f} (massimo {alto})")
    if max(tremiti) > 0.18 and moto not in ROTAZIONI:
        difetti.append(f"il dettaglio trema: {max(tremiti):.0%} dei blocchi cambia oltre allo spostamento")
    if moto == "bipede":
        fondi = {int(np.nonzero((f > VUOTO).any(axis=1))[0][-1]) for f in ciclo}
        if len(fondi) > 1:
            difetti.append(f"i piedi non restano a terra: base su righe {sorted(fondi)}")
        striscia_piedi = corpo[righe_c[-1] - max(1, int(alt_c * 0.12)):righe_c[-1] + 1].any(axis=0)
        tratti = len(pezzi(striscia_piedi[np.newaxis, :]))
        if tratti < 2:
            difetti.append("gambe non separate: il passo non si vede bene")
    centri = [float(np.nonzero(f > VUOTO)[0].mean()) for f in ciclo]
    limite_centro = max(4.0, alt_c * 0.2) if moto == "rimbalzo" else max(2.5, alt_c * 0.12)
    if max(centri) - min(centri) > limite_centro:
        difetti.append(f"il centro del corpo salta di {max(centri) - min(centri):.1f} px")
    return {"area": aree[0], "misura": f"{primo.shape[1]}x{primo.shape[0]}", "colori": len(tavola), "fps": esito["fps"], "moto": moto,
            "isolati": round(rumore, 3), "passi": [round(p, 2) for p in passi], "tremolio": round(max(tremiti), 3), "difetti": difetti}


# --- Anteprime ---------------------------------------------------------------------------------------------------


def come_immagine(matrice, tavola, ingrandimento=1):
    alt, larg = matrice.shape
    rgba = np.zeros((alt, larg, 4), dtype=np.uint8)
    piena = matrice > VUOTO
    rgba[piena, :3] = tavola[matrice[piena]]
    rgba[piena, 3] = 255
    img = Image.fromarray(rgba, "RGBA")
    return img.resize((larg * ingrandimento, alt * ingrandimento), Image.Resampling.NEAREST)


def candidati(nome):
    return sorted((IMMAGINI / "mob" / nome).glob("*.png"), key=lambda p: p.name)


def anteprime(misure, cartella, gruppo, ingrandimento):
    """Per ogni candidato: originale, i fotogrammi in striscia e i difetti misurati; poi un'animazione di tutti al loro
    ritmo, sul colore del pavimento. In alto l'impronta del codice che le ha fatte, per non giudicare strisce vecchie."""
    cartella.mkdir(parents=True, exist_ok=True)
    impronta = hashlib.md5(Path(__file__).read_bytes()).hexdigest()[:8]
    tutti = [n for n in misure if not gruppo or n.startswith(gruppo)]
    voci = []
    for nome in tutti:
        for indice, percorso in enumerate(candidati(nome)):
            esito = sprite(percorso, misure[nome])
            if esito is None:
                voci.append((nome, indice, percorso, None, {"difetti": ["nessuna figura riconosciuta"]}))
                continue
            voci.append((nome, indice, percorso, esito, controlla(esito, misure[nome], nome)))
    if not voci:
        return
    largo_cella = 70 * ingrandimento
    alto_riga = 70 * ingrandimento + 38
    foglio = Image.new("RGB", (160 + 5 * largo_cella + 420, 26 + alto_riga * len(voci)), "#26242c")
    d = ImageDraw.Draw(foglio)
    d.text((6, 4), f"codice {impronta}", fill="#9a9488")
    for r, (nome, indice, percorso, esito, esame) in enumerate(voci):
        y = 24 + alto_riga * r
        fondo = PAVIMENTO.get(nome.split("_")[0], "#2a2830")
        d.rectangle((0, y - 4, foglio.width, y - 4), fill="#3c3844")
        d.text((6, y), f"{nome} #{indice}", fill="#f0dfa8")
        foglio.paste(Image.open(percorso).convert("RGB").resize((148, 148), Image.Resampling.LANCZOS), (6, y + 16))
        if esito is None:
            d.text((160, y + 16), esame["difetti"][0], fill="#f07868")
            continue
        d.text((160, y), f"{esame['misura']} px  {esame['colori']} colori  {esame['moto']} {esame['fps']} fps  passi {esame['passi']}  tremolio {esame['tremolio']}", fill="#b0a890")
        for i, f in enumerate(esito["fotogrammi"][:5]):
            x = 160 + i * largo_cella
            d.rectangle((x, y + 16, x + largo_cella - 4, y + alto_riga - 8), fill=fondo)
            img = come_immagine(f, esito["tavola"], ingrandimento)
            foglio.paste(img, (x + 2, y + 18), img)
        testo = "\n".join(esame["difetti"]) if esame["difetti"] else "nessun difetto misurato"
        d.multiline_text((160 + 5 * largo_cella + 6, y + 16), testo, fill="#f07868" if esame["difetti"] else "#8fd08a")
    destinazione = cartella / f"strisce-{gruppo or 'tutti'}.png"
    foglio.save(destinazione)
    print(destinazione)

    # L'animazione: una griglia con tutti i candidati, ciascuno al suo ritmo, sul suo pavimento. Ciclo di 2 s a 24 fps.
    colonne = 4
    buoni = [v for v in voci if v[3] is not None]
    righe = math.ceil(len(buoni) / colonne)
    lato = 64 * ingrandimento
    quadri = []
    for t in range(48):
        quadro = Image.new("RGB", (colonne * lato, righe * (lato + 14)), "#26242c")
        d2 = ImageDraw.Draw(quadro)
        for i, (nome, indice, _, esito, _) in enumerate(buoni):
            x, y = (i % colonne) * lato, (i // colonne) * (lato + 14)
            d2.rectangle((x + 1, y + 13, x + lato - 2, y + lato + 12), fill=PAVIMENTO.get(nome.split("_")[0], "#2a2830"))
            d2.text((x + 3, y), f"{nome} #{indice}", fill="#e8dcc0")
            f = esito["fotogrammi"][int(t / 24 * esito["fps"]) % 4]
            img = come_immagine(f, esito["tavola"], ingrandimento)
            quadro.paste(img, (x + (lato - img.width) // 2, y + 13 + lato - img.height - 4), img)
        quadri.append(quadro.convert("P", palette=Image.Palette.ADAPTIVE, colors=255))
    animazione = cartella / f"animazione-{gruppo or 'tutti'}.gif"
    quadri[0].save(animazione, save_all=True, append_images=quadri[1:], duration=42, loop=0, disposal=2)
    print(animazione)
    riassunto = {f"{n}#{i}": e for n, i, _, _, e in voci}
    (cartella / f"controlli-{gruppo or 'tutti'}.json").write_text(json.dumps(riassunto, indent=1, ensure_ascii=False), encoding="utf-8")


def scrivi(misure):
    """Scrive gli sprite di chi ha una `scelta` in mob-moti.json. Gli altri restano quelli a mano."""
    righe = ["/*", " * Generato da tools/arte/prepara_mob.py: non modificare a mano.",
             " * Sprite dei mob dal generatore locale (SDXL 1.0 e Pixel Art XL); quattro fotogrammi ricavati da un solo disegno.",
             " */", "", "export interface GeneratedSprite {", "  readonly frames: readonly (readonly string[])[];",
             "  readonly palette: Readonly<Record<string, string>>;", "  readonly fps: number;", "  readonly walks: boolean;", "  readonly faces: boolean;", "  readonly bob: boolean;", "}", "",
             "export const GENERATED_SPRITES: Readonly<Record<string, GeneratedSprite>> = {"]
    quanti = 0
    for nome, voce in misure.items():
        if "scelta" not in voce:
            continue
        esito = sprite(candidati(nome)[voce["scelta"]], voce)
        tavola = ", ".join(f"{SIMBOLI[i]}: '#{int(c[0]):02x}{int(c[1]):02x}{int(c[2]):02x}'" for i, c in enumerate(esito["tavola"]))
        righe.append(f"  {nome}: {{")
        righe.append("    frames: [")
        for f in esito["fotogrammi"][:4]:
            testo = ["".join("." if v < 0 else SIMBOLI[v] for v in riga) for riga in f]
            righe.append("      [" + ", ".join(f"'{r}'" for r in testo) + "],")
        righe.append("    ],")
        righe.append(f"    palette: {{ {tavola} }},")
        cammina = "true" if esito["moto"] in CAMMINANO else "false"
        fluttua = "true" if voce.get("fluttua", esito["moto"] in FLUTTUANO) else "false"
        righe.append(f"    fps: {esito['fps']},")
        righe.append(f"    walks: {cammina},")
        righe.append(f"    faces: {'true' if voce.get('lato') else 'false'},")
        righe.append(f"    bob: {fluttua},")
        righe.append("  },")
        quanti += 1
    righe += ["};", ""]
    USCITA.write_text("\n".join(righe), encoding="utf-8", newline="\n")
    print(f"Scritti {quanti} sprite, {USCITA.stat().st_size // 1024} KB")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scrivi", action="store_true", help="scrive gli sprite scelti per il gioco")
    p.add_argument("--misure", type=Path, default=QUI / "mob-misure.json")
    p.add_argument("--anteprime", type=Path, help="cartella di strisce, animazioni e controlli")
    p.add_argument("--gruppo", default="", help="prefisso degli id, per le anteprime")
    p.add_argument("--solo", help="id separati da virgole, per le anteprime")
    p.add_argument("--ingrandimento", type=int, default=3)
    args = p.parse_args()
    misure = json.loads(args.misure.read_text(encoding="utf-8"))
    if args.solo:
        misure = {n: misure[n] for n in args.solo.split(",")}
    if args.anteprime:
        anteprime(misure, args.anteprime, args.gruppo, args.ingrandimento)
    if args.scrivi:
        scrivi(misure)


if __name__ == "__main__":
    main()
