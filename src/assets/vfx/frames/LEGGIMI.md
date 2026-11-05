# Fogli a fotogrammi degli effetti

- `<id>.png` delle skill delle tre classi: 12 fotogrammi quadrati, geometria e parametri in `manifest.json`
  (Z-Image Turbo in locale, img2img sulle pose che il gioco disegnava nel codice). Credito `local-zimage-vfx`.
- `meteor-impact.png`: impatto isometrico della meteora, 16 fotogrammi 192x160 a 20 fps, punto d'impatto (96, 118),
  ellisse del danno 2:1 per raggio 66 (geometria in `vfx/meteor-impact.ts`). SDXL 1.0 + Pixel Art XL in locale,
  img2img (intensita' 0,55, seme 4242, 28 passi) su pose disegnate con i 12 principi dell'animazione; riduzione alla
  palette delle pose; l'onda d'urto davanti e' ritagliata all'area di danno. Approvato dall'utente il 5 novembre 2026.
  Credito `local-sdxl-meteor`.

Gli script che producono questi fogli stanno fuori dal repository (README · Strumenti esterni). Non modificare a mano.
