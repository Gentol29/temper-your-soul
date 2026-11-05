# Rifugio del menu

Cortile e strutture dello sfondo del menu principale. **Generati con l'IA, da approvare:** l'eccezione del proprietario in `docs/vfx-pixellab.md` copre solo effetti e icone, non questi sfondi.

## Provenienza

- **Riferimento:** due tavole fornite dall'utente il 3 novembre 2026, prodotte con un generatore di immagini. Non sono nel repository.
- **Modello:** ComfyUI in locale con SDXL base 1.0, VAE fp16-fix e LoRA Pixel Art XL. Nessun credito a pagamento. Le licenze del modello e della LoRA vanno verificate prima di una pubblicazione.
- **Scena di partenza:** ricreazione della tavola del cortile con il modello (image-to-image, intensità 0,42, LoRA 0,8, seme 29).

## File

| File | Che cos'è |
| --- | --- |
| `courtyard.png` | Fondale 1024 x 576: la scena rimpicciolita al centro, dintorni disegnati dal modello (intensità 0,62), poi edifici tolti e ridisegnati dal modello |
| `cathedral.png`, `storage.png`, `forge.png`, `merchant.png`, `gate.png`, `wall_west.png`, `wall_east.png` | Una struttura per file, con trasparenza, ripulita dal modello (intensità 0,22) su fondo verde e poi scontornata |

Posizioni, fiamme e ordine dei pezzi stanno in `src/features/presentation/menu-layout.ts`: per spostare una struttura basta cambiare lì i numeri.

Gli script di preparazione e i semi scelti stanno negli strumenti esterni (`arte/menu/`, vedi README · Strumenti esterni).
