"""Rende un personaggio 3D in 8 direzioni con camera ISOMETRICA (proiezione ortografica, elevazione 30 gradi = 2:1).

Gira dentro Blender, senza interfaccia (nessuna GPU necessaria: usa il motore Workbench):

  blender -b -P tools/arte/blender/iso_8_direzioni.py -- --out D:\\PixelArt-AI\\immagini\\blender\\scheletro64 --lato 64 --scala 2.25
  blender -b -P tools/arte/blender/iso_8_direzioni.py -- --out ... --lato 64 --scala 2.25 --animazione camminata

Opzioni dopo il doppio trattino:
  --out CARTELLA      dove scrivere i PNG (obbligatoria)
  --nome scheletro    prefisso dei file e personaggio da costruire (per ora solo "scheletro")
  --lato 96           lato del fotogramma in pixel (nessun antialiasing: un pixel renderizzato = un pixel di sprite)
  --scala 2.1         altezza/larghezza inquadrata in metri (ortho_scale); lato/scala = pixel per metro
  --elevazione 30     angolo della camera sul piano (30 = 2:1, 35.264 = isometrica "vera")
  --solo S,E          rende solo alcune direzioni
  --animazione camminata   rende un ciclo invece della posa ferma: file <nome>_camminata_<DIR>_<n>.png
  --fotogrammi 8      fotogrammi del ciclo (il ciclo e' chiuso: l'ultimo precede il primo)

Direzioni sullo schermo: S guarda la camera, poi SE, E, NE, N, NW, W, SW (senso antiorario visto dall'alto).
Il personaggio si costruisce rivolto verso -Y (la camera sta a -Y) e ruota attorno a Z.
Forme, colori e ampiezze del passo sono PROVVISORI. Contorno e palette: foglio_8_direzioni.py / foglio_animazione.py.
"""
import math
import sys

import bpy

# Ordine delle direzioni e rotazione del personaggio attorno a Z (gradi).
DIREZIONI = [("S", 0), ("SE", 45), ("E", 90), ("NE", 135), ("N", 180), ("NW", 225), ("W", 270), ("SW", 315)]

# Colori di base (sRGB 0..1); le sfumature le dà l'illuminazione, la palette finale la fissa foglio_8_direzioni.py.
COLORI = {
    "osso": (0.78, 0.72, 0.58),
    "osso_scuro": (0.45, 0.40, 0.32),
    "cremisi": (0.55, 0.04, 0.07),
    "acciaio": (0.40, 0.40, 0.44),
    "ferro_scuro": (0.16, 0.16, 0.19),
    "occhi": (1.00, 0.15, 0.10),
    "vuoto": (0.05, 0.04, 0.05),
    "legno": (0.30, 0.17, 0.08),
    "brace": (0.95, 0.45, 0.06),
    "cenere": (0.62, 0.52, 0.42),
}

# Ampiezze della camminata (provvisorie, regolabili).
PASSO = {
    "anca": math.radians(28),       # oscillazione della coscia avanti/indietro
    "ginocchio": math.radians(42),  # piegatura del ginocchio durante lo slancio in avanti
    "braccio_scudo": math.radians(12),
    "braccio_spada": math.radians(6),  # la spada resta alzata: oscilla poco
    "rimbalzo": 0.02,               # metri di salita/discesa del corpo
}


def argomenti():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    a = {"out": None, "nome": "scheletro", "lato": 96, "scala": 2.1, "elevazione": 30.0, "solo": None,
         "animazione": None, "fotogrammi": 8}
    i = 0
    while i < len(argv):
        chiave = argv[i].lstrip("-")
        if chiave not in a or i + 1 >= len(argv):
            raise SystemExit(f"Argomento non valido: {argv[i]}")
        a[chiave] = argv[i + 1]
        i += 2
    if not a["out"]:
        raise SystemExit("Manca --out CARTELLA")
    a["lato"], a["scala"], a["elevazione"] = int(a["lato"]), float(a["scala"]), float(a["elevazione"])
    a["fotogrammi"] = int(a["fotogrammi"])
    if a["animazione"] not in (None, "camminata", "attacco", "colpo", "morte"):
        raise SystemExit("Animazioni disponibili: camminata, attacco, colpo, morte")
    return a


_materiali = {}


def materiale(nome):
    """Un materiale per colore; Workbench legge il colore di visualizzazione (diffuse_color)."""
    if nome not in _materiali:
        m = bpy.data.materials.new(nome)
        m.diffuse_color = (*COLORI[nome], 1.0)
        _materiali[nome] = m
    return _materiali[nome]


class Pivot:
    """Un'articolazione: oggetto vuoto + posizione nel mondo, cosi' le parti si descrivono in coordinate del mondo."""

    def __init__(self, nome, pos, padre=None):
        self.pos = pos
        self.obj = bpy.data.objects.new(nome, None)
        bpy.context.scene.collection.objects.link(self.obj)
        if padre:
            self.obj.parent = padre.obj
            self.obj.location = tuple(pos[i] - padre.pos[i] for i in range(3))
        else:
            self.obj.location = pos

    def parte(self, tipo, pos, dim, colore, rot=(0, 0, 0)):
        """Crea una forma con dimensioni complete in metri; pos e' nel mondo (posa a riposo)."""
        if tipo == "cubo":
            bpy.ops.mesh.primitive_cube_add(size=1)
        elif tipo == "sfera":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, segments=14, ring_count=8)
        else:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=1, vertices=10)
        o = bpy.context.active_object
        o.scale = dim
        o.rotation_euler = tuple(math.radians(r) for r in rot)
        o.data.materials.append(materiale(colore))
        o.parent = self.obj
        o.location = tuple(pos[i] - self.pos[i] for i in range(3))
        return o


def scheletro(radice):
    """Scheletro guerriero con spada e scudo, rivolto verso -Y. Destra del personaggio = -X. Alto circa 1,85 m.

    Ritorna le articolazioni da muovere per l'animazione."""
    radice = Pivot("radice_corpo", (0, 0, 0), radice)
    T = Pivot("busto", (0, 0, 0.90), radice)  # torso, testa e braccia: si piega attorno al bacino
    # Bacino, perizoma cremisi, colonna, costole
    T.parte("cubo", (0, 0, 0.95), (0.28, 0.18, 0.14), "osso_scuro")
    T.parte("cubo", (0, 0, 0.88), (0.30, 0.20, 0.12), "cremisi")
    T.parte("cubo", (0, -0.11, 0.80), (0.14, 0.03, 0.22), "cremisi")  # lembo davanti
    T.parte("cilindro", (0, 0.03, 1.12), (0.07, 0.07, 0.30), "osso_scuro")
    for z, w in ((1.12, 0.32), (1.22, 0.30), (1.32, 0.26)):
        T.parte("cubo", (0, -0.01, z), (w, 0.18, 0.045), "osso")
    T.parte("cubo", (0, -0.03, 1.22), (0.20, 0.12, 0.30), "brace")  # nucleo ardente: si vede tra le costole
    # Spalle di acciaio, sciarpa cremisi con coda dietro
    for x in (-0.22, 0.22):
        T.parte("sfera", (x, 0, 1.40), (0.20, 0.20, 0.13), "acciaio")
    T.parte("cubo", (0, 0, 1.47), (0.30, 0.22, 0.08), "cremisi")
    T.parte("cubo", (0.08, 0.12, 1.33), (0.07, 0.03, 0.30), "cremisi")
    # Testa grande e leggibile, occhi che sporgono
    T.parte("cilindro", (0, 0, 1.53), (0.06, 0.06, 0.08), "osso_scuro")
    T.parte("sfera", (0, 0, 1.70), (0.30, 0.32, 0.32), "cenere")  # teschio: cenere calda, resta riconoscibile
    T.parte("cubo", (0, -0.05, 1.56), (0.18, 0.20, 0.07), "cenere")  # mandibola
    for x in (-0.07, 0.07):
        T.parte("sfera", (x, -0.14, 1.71), (0.08, 0.05, 0.09), "vuoto")
        T.parte("sfera", (x, -0.158, 1.71), (0.045, 0.03, 0.045), "occhi")

    rig = {"corpo": radice, "busto": T}
    # Gambe: anca -> ginocchio. sinistra = +X, destra = -X
    for lato, x in (("s", 0.11), ("d", -0.11)):
        anca = Pivot(f"anca_{lato}", (x, 0, 0.88), radice)
        anca.parte("cilindro", (x, 0, 0.73), (0.09, 0.09, 0.40), "osso")  # coscia
        ginocchio = Pivot(f"ginocchio_{lato}", (x, 0, 0.52), anca)
        ginocchio.parte("sfera", (x, 0, 0.52), (0.12, 0.12, 0.12), "brace")  # ginocchio incandescente
        ginocchio.parte("cilindro", (x, 0, 0.30), (0.08, 0.08, 0.42), "osso")  # stinco
        caviglia = Pivot(f"caviglia_{lato}", (x, 0, 0.09), ginocchio)  # tiene il piede orizzontale (colpo, morte)
        caviglia.parte("cubo", (x, -0.06, 0.04), (0.12, 0.24, 0.08), "osso_scuro")  # piede
        rig[f"anca_{lato}"], rig[f"ginocchio_{lato}"], rig[f"caviglia_{lato}"] = anca, ginocchio, caviglia
    # Braccio destro (-X) con spada alzata
    s = Pivot("spalla_d", (-0.27, 0, 1.40), T)
    s.parte("cilindro", (-0.27, 0, 1.25), (0.06, 0.06, 0.28), "osso")
    g = Pivot("gomito_d", (-0.27, 0, 1.12), s)  # avambraccio, mano e spada ruotano attorno al gomito
    g.parte("cilindro", (-0.27, -0.14, 1.12), (0.06, 0.06, 0.28), "osso", rot=(70, 0, 0))
    g.parte("sfera", (-0.27, -0.27, 1.07), (0.09, 0.09, 0.09), "osso")
    g.parte("cilindro", (-0.27, -0.27, 1.07), (0.035, 0.035, 0.16), "legno")  # impugnatura
    g.parte("cubo", (-0.27, -0.27, 1.17), (0.20, 0.05, 0.035), "ferro_scuro")  # guardia
    g.parte("cubo", (-0.27, -0.27, 1.47), (0.09, 0.03, 0.58), "acciaio")  # lama (resta dentro l'inquadratura)
    g.parte("cubo", (-0.27, -0.27, 1.45), (0.03, 0.045, 0.52), "brace")  # filo incandescente della lama
    rig["spalla_d"], rig["gomito_d"] = s, g
    # Braccio sinistro (+X) con scudo
    s = Pivot("spalla_s", (0.27, 0, 1.40), T)
    s.parte("cilindro", (0.27, 0, 1.25), (0.06, 0.06, 0.28), "osso")
    s.parte("cilindro", (0.27, -0.12, 1.12), (0.06, 0.06, 0.26), "osso", rot=(60, 0, 0))
    s.parte("cilindro", (0.32, -0.24, 1.08), (0.40, 0.56, 0.06), "acciaio", rot=(90, 0, 0))  # scudo
    s.parte("sfera", (0.32, -0.28, 1.08), (0.14, 0.06, 0.14), "brace")  # borchia incandescente
    rig["spalla_s"] = s
    return rig


def posa(rig, fase):
    """Imposta la posa. fase = None: a riposo. fase in radianti: ciclo di camminata (un passo completo = 2 pi).

    In Blender una rotazione positiva attorno a X porta i punti sotto il perno verso +Y, cioe' all'indietro
    (il personaggio guarda -Y): coscia indietro = angolo positivo."""
    for p in rig.values():
        p.obj.rotation_euler = (0, 0, 0)
    rig["corpo"].obj.location = (0, 0, 0)
    if fase is None:
        return
    seno = math.sin(fase)
    # Gamba sinistra e destra in opposizione di fase.
    for lato, f in (("s", fase), ("d", fase + math.pi)):
        rig[f"anca_{lato}"].obj.rotation_euler = (PASSO["anca"] * math.sin(f), 0, 0)
        # Il ginocchio si piega mentre la gamba va in avanti (coscia che si muove verso angoli negativi).
        rig[f"ginocchio_{lato}"].obj.rotation_euler = (PASSO["ginocchio"] * max(0.0, -math.cos(f)), 0, 0)
    # Le braccia oscillano in opposizione alla gamba dello stesso lato.
    rig["spalla_s"].obj.rotation_euler = (-PASSO["braccio_scudo"] * seno, 0, 0)
    rig["spalla_d"].obj.rotation_euler = (PASSO["braccio_spada"] * seno, 0, 0)
    # Corpo piu' alto quando le gambe sono in verticale, piu' basso a passo completo.
    rig["corpo"].obj.location = (0, 0, PASSO["rimbalzo"] * (1 - abs(seno)))


# Attacco: fendente dall'alto con la spada, 8 chiavi. Angoli in gradi attorno a X (negativo = braccio che sale in avanti),
# passo = rotazione della coscia sinistra (affondo; la destra fa il contrario, meta' ampiezza),
# avanti/giu' in metri = spostamento del corpo. Valori PROVVISORI.
ATTACCO = [
    # spalla, gomito, passo, avanti, giu'
    (0, 0, 0, 0.00, 0.00),      # 0 guardia
    (-50, -10, 0, 0.00, 0.00),  # 1 inizio carica
    (-100, 20, 6, 0.00, 0.01),  # 2 carica: lama dietro la spalla
    (-105, 25, 8, 0.00, 0.02),  # 3 tenuta
    (-30, 65, -14, 0.06, 0.03),  # 4 colpo veloce (braccio piu' basso: la lama non esce dall'inquadratura)
    (10, 90, -26, 0.12, 0.04),  # 5 impatto: lama in avanti
    (20, 95, -26, 0.12, 0.04),  # 6 seguito
    (8, 45, -12, 0.05, 0.02),   # 7 ritorno
]


def posa_attacco(rig, i, n):
    """Interpola le chiavi di ATTACCO sui n fotogrammi richiesti (con n = 8 sono esattamente le chiavi)."""
    k = i * (len(ATTACCO) - 1) / max(1, n - 1)
    a, b = int(k), min(int(k) + 1, len(ATTACCO) - 1)
    t = k - a
    v = [ATTACCO[a][j] + (ATTACCO[b][j] - ATTACCO[a][j]) * t for j in range(5)]
    for p in rig.values():
        p.obj.rotation_euler = (0, 0, 0)
    rig["spalla_d"].obj.rotation_euler = (math.radians(v[0]), 0, 0)
    rig["gomito_d"].obj.rotation_euler = (math.radians(v[1]), 0, 0)
    rig["anca_s"].obj.rotation_euler = (math.radians(v[2]), 0, 0)
    rig["anca_d"].obj.rotation_euler = (math.radians(-v[2] / 2), 0, 0)
    rig["ginocchio_d"].obj.rotation_euler = (math.radians(max(0.0, -v[2]) * 1.2), 0, 0)  # gamba dietro: ginocchio piegato
    rig["corpo"].obj.location = (0, -v[3], -v[4])


# Colpo subito e morte: chiavi con tutti i giunti. Angoli in gradi attorno a X (spalla/anca: negativo = in avanti;
# ginocchio: positivo = piegato; rot = inclinazione di tutto il corpo, negativo = all'indietro), y in metri (positivo =
# all'indietro), z in metri. Giunti non indicati = 0. Valori PROVVISORI.
ANIM_CHIAVI = {
    "colpo": [
        {},
        {"y": 0.06, "z": -0.03, "spalla_d": -30, "gomito_d": -15, "spalla_s": 25, "ginocchio_s": 12, "ginocchio_d": 12},
        {"y": 0.12, "z": -0.06, "rot": -8, "spalla_d": -45, "gomito_d": -25, "spalla_s": 35, "anca_s": 8, "anca_d": -8,
         "ginocchio_s": 20, "ginocchio_d": 20},
        {"y": 0.10, "z": -0.05, "rot": -6, "spalla_d": -35, "spalla_s": 28, "ginocchio_s": 15, "ginocchio_d": 15},
        {"y": 0.04, "z": -0.02, "spalla_d": -12, "spalla_s": 10, "ginocchio_s": 6, "ginocchio_d": 6},
        {},
    ],
    "morte": [
        {},
        {"y": 0.05, "z": -0.03, "spalla_d": -25, "spalla_s": 20, "ginocchio_s": 15, "ginocchio_d": 15},
        {"y": 0.08, "z": -0.14, "anca_s": -25, "anca_d": -25, "ginocchio_s": 50, "ginocchio_d": 50,
         "spalla_d": -10, "spalla_s": 15},
        {"y": -0.12, "z": -0.50, "ginocchio_s": 85, "ginocchio_d": 85, "spalla_d": 15, "gomito_d": 35, "spalla_s": 10},
        {"y": -0.12, "z": -0.50, "busto": 12, "ginocchio_s": 88, "ginocchio_d": 88, "spalla_d": 25, "gomito_d": 40,
         "spalla_s": 20},
        {"y": -0.12, "z": -0.54, "busto": 35, "ginocchio_s": 92, "ginocchio_d": 92, "spalla_d": 35, "gomito_d": 45,
         "spalla_s": 28},
        {"y": -0.12, "z": -0.58, "busto": 58, "ginocchio_s": 96, "ginocchio_d": 96, "spalla_d": 40, "gomito_d": 50,
         "spalla_s": 32},
        {"y": -0.12, "z": -0.60, "busto": 72, "ginocchio_s": 100, "ginocchio_d": 100, "spalla_d": 45, "gomito_d": 55,
         "spalla_s": 36},
    ],
}


def posa_chiavi(rig, chiavi, i, n):
    """Interpola le chiavi sui n fotogrammi richiesti (con n = numero di chiavi sono esattamente le chiavi)."""
    k = i * (len(chiavi) - 1) / max(1, n - 1)
    a, b = int(k), min(int(k) + 1, len(chiavi) - 1)
    t = k - a

    def val(nome):
        x, y = chiavi[a].get(nome, 0.0), chiavi[b].get(nome, 0.0)
        return x + (y - x) * t

    for p in rig.values():
        p.obj.rotation_euler = (0, 0, 0)
    for nome in ("busto", "spalla_d", "gomito_d", "spalla_s", "anca_s", "anca_d", "ginocchio_s", "ginocchio_d"):
        rig[nome].obj.rotation_euler = (math.radians(val(nome)), 0, 0)
    for lato in ("s", "d"):  # il piede resta piatto: annulla la rotazione di anca e ginocchio
        rig[f"caviglia_{lato}"].obj.rotation_euler = (-math.radians(val(f"anca_{lato}") + val(f"ginocchio_{lato}")), 0, 0)
    rig["corpo"].obj.rotation_euler = (math.radians(val("rot")), 0, 0)
    rig["corpo"].obj.location = (0, val("y"), val("z"))


def prepara_scena(a):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "BLENDER_WORKBENCH"
    s.render.film_transparent = True
    s.render.resolution_x = s.render.resolution_y = a["lato"]
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    s.view_settings.view_transform = "Standard"  # niente filmic: i colori restano quelli scelti
    s.display.render_aa = "OFF"  # nessun antialiasing: bordi netti da pixel art
    sh = s.display.shading
    sh.light = "STUDIO"
    sh.color_type = "MATERIAL"
    sh.show_object_outline = False  # il contorno si fa in Pillow, a un pixel esatto
    sh.show_cavity = False
    sh.show_shadows = False
    sh.show_specular_highlight = False

    # Camera ortografica fissa a -Y: la direzione del personaggio la decide la rotazione di Z.
    e = math.radians(a["elevazione"])
    d = 12.0
    centro = (0, 0, 0.88)
    cam_dati = bpy.data.cameras.new("cam")
    cam_dati.type = "ORTHO"
    cam_dati.ortho_scale = a["scala"]
    cam = bpy.data.objects.new("cam", cam_dati)
    s.collection.objects.link(cam)
    cam.location = (centro[0], centro[1] - d * math.cos(e), centro[2] + d * math.sin(e))
    cam.rotation_euler = (math.radians(90) - e, 0, 0)
    s.camera = cam
    return s


def renderizza(s, percorso):
    """Due passate senza sfumature, per la resa Hi-bit fatta dopo in Pillow:
    1. <percorso>: colori piatti dei materiali (nessuna illuminazione);
    2. <percorso>_luce.png: solo la luce su una superficie grigia uniforme (serve a scegliere i toni a gradini)."""
    sh = s.display.shading
    sh.light, sh.color_type = "FLAT", "MATERIAL"
    s.render.filepath = percorso
    bpy.ops.render.render(write_still=True)
    sh.light, sh.color_type = "STUDIO", "SINGLE"
    sh.single_color = (0.8, 0.8, 0.8)
    s.render.filepath = percorso[:-4] + "_luce.png"
    bpy.ops.render.render(write_still=True)


def main():
    a = argomenti()
    s = prepara_scena(a)
    radice = Pivot("radice", (0, 0, 0))
    if a["nome"] != "scheletro":
        raise SystemExit("Per ora esiste solo il personaggio 'scheletro'")
    rig = scheletro(radice)
    scelte = a["solo"].split(",") if a["solo"] else [n for n, _ in DIREZIONI]
    for nome, gradi in DIREZIONI:
        if nome not in scelte:
            continue
        radice.obj.rotation_euler = (0, 0, math.radians(gradi))
        if a["animazione"]:
            for i in range(a["fotogrammi"]):
                if a["animazione"] == "camminata":
                    posa(rig, 2 * math.pi * i / a["fotogrammi"])
                elif a["animazione"] == "attacco":
                    posa_attacco(rig, i, a["fotogrammi"])
                else:
                    posa_chiavi(rig, ANIM_CHIAVI[a["animazione"]], i, a["fotogrammi"])
                renderizza(s, f"{a['out']}\\{a['nome']}_{a['animazione']}_{nome}_{i}.png")
            print(f"Reso {nome}: {a['fotogrammi']} fotogrammi", flush=True)
        else:
            posa(rig, None)
            renderizza(s, f"{a['out']}\\{a['nome']}_{nome}.png")
            print(f"Reso {nome} ({gradi} gradi)", flush=True)


main()
