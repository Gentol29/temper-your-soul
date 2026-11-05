# Provenienza delle skill PixiJS

Skill ufficiali del team PixiJS, copiate senza modifiche da https://github.com/pixijs/pixijs-skills (commit
`83760c6f53462ca9cecd68055041f5a8c94758ce`, 1 ottobre 2026), licenza MIT (`LICENSE` in questa cartella). Riguardano
PixiJS v8; nel progetto si usa la 8.22.0 (`package.json`).

Incluse le 16 skill utili allo strato WebGL del gioco: `pixijs` (instradamento), application, core-concepts,
custom-rendering, performance, migration-v8, scene-core-concepts, scene-container, scene-sprite, scene-mesh,
scene-particle-container, filters, blend-modes, math, color, ticker. Escluse perche' il gioco non le usa: accessibility,
assets, create, environments, events, html-source, scene-dom-container, scene-gif, scene-graphics, scene-text (se `pixijs`
rimanda a una di queste, la si legge nel repository originale). Per aggiornarle si ricopia dal repository una versione
nuova, si aggiorna il commit qui sopra e si controlla che le API citate corrispondano alla versione di `package.json`.
Le regole del progetto (CLAUDE.md, AGENTS.md) prevalgono: PixiJS solo in `src/features/presentation/`.
