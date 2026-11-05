# Fogli direzionali da modelli 3D

Figure modellate in 3D e rese con Blender 5.1 (motore EEVEE), senza servizi esterni durante il gioco.

## Regina serpente (`serpent_queen.png`)

- Modello: «Serpent Queen» generato con IA su Meshy (texture Meshy), scaricato tramite Tripo il 5 novembre 2026. **Licenza del piano Meshy da verificare con il proprietario** prima della pubblicazione: il credito in `art-credits.ts` usa la licenza «Modello-IA-da-verificare».
- Foglio 768 × 1024 px: celle 128 × 128, **8 righe** (una per direzione: S, SE, E, NE, N, NW, W, SW, come i servitori) e **6 colonne** (fotogrammi in anello).
- Resa: camera ortografica 2:1 (elevazione 30°), modello ruotato di 45° a riga, luci fisse. Piedi (perno del modello) nel punto (64, 104) della cella.
- Animazione calcolata sulla mesh, senza scheletro: ondeggiamento laterale e avanti/indietro che cresce con l'altezza (base ferma), torsione di 4,5° sull'asse verticale e respiro del busto del 2,2 %.
- Hi-bit: riduzione da 768 a 124 px con media a blocchi, inquadratura comune a tutte le celle, palette condivisa di 32 colori (k-means, seme fisso), tono scurito il 5 novembre 2026 per stare nella palude (luce massima del corpo 0,58, rossi fino a 0,78), alfa binaria, contorno esterno di 1 px `#111014` (`SHADOW_INK`).
- Gli script (render, animazione, riduzione) restano nella cartella di lavoro esterna di chi li usa, non nel repository.
