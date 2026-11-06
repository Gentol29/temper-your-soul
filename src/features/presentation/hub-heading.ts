import type { HubPlayer } from '../network/hub-protocol';
import type { ScreenHeading } from './sprite-view';

/** Sotto questo spostamento (px) fra due disegni un compagno non cambia direzione: niente tremolio da fermo. Provvisorio. */
export const PEER_HEADING_MIN_STEP = 0.5;

export interface PeerTrack { readonly x: number; readonly y: number; readonly heading: ScreenHeading }

/**
 * La direzione di un compagno nel rifugio dal suo spostamento sullo schermo: il protocollo invia solo il verso
 * (`facing`), le otto viste si ricavano qui senza cambiare cio' che passa in rete. Solo aspetto.
 */
export function peerHeading(previous: PeerTrack | undefined, peer: Pick<HubPlayer, 'x' | 'y' | 'facing'>): PeerTrack {
  const fallback: ScreenHeading = previous?.heading ?? { x: peer.facing < 0 ? -1 : 1, y: 1 };
  if (previous === undefined) return { x: peer.x, y: peer.y, heading: fallback };
  const dx = peer.x - previous.x, dy = peer.y - previous.y;
  if (Math.hypot(dx, dy) < PEER_HEADING_MIN_STEP) return { x: previous.x, y: previous.y, heading: fallback };
  return { x: peer.x, y: peer.y, heading: { x: dx, y: dy } };
}
