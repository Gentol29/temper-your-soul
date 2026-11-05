// File generato da tools/arte/prepara_hub_iso.py: non modificarlo a mano, rilancia lo script.

import type { HubIsoBuilding } from '../character/hub-iso-map';

/** Uno sprite di edificio dell'HUB isometrico (pixel). */
export interface HubIsoSprite {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

/** Gli edifici dell'HUB, generati in locale con SDXL 1.0 e Pixel Art XL. */
export const HUB_ISO_SPRITES: Readonly<Record<HubIsoBuilding['id'], HubIsoSprite>> = {
  portal: { url: new URL('../../assets/art/hub-iso/portal.png', import.meta.url).href, width: 45, height: 94 },
  forge: { url: new URL('../../assets/art/hub-iso/forge.png', import.meta.url).href, width: 53, height: 94 },
  storage: { url: new URL('../../assets/art/hub-iso/storage.png', import.meta.url).href, width: 76, height: 87 },
  merchant: { url: new URL('../../assets/art/hub-iso/merchant.png', import.meta.url).href, width: 47, height: 57 },
};
