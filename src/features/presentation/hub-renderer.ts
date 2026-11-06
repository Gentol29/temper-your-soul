import type { HubPlayer } from '../network/hub-protocol';
import type { HubState } from '../character/hub-state';
import type { CharacterAppearance } from '../character/appearance';
import { drawGameCharacter } from './game-character-preview';
import { RefugeArtwork, type RefugeActor } from './refuge-artwork';
import { REFUGE_LAYOUT } from './menu-layout';
import { hubArrivalFrame, hubView, drawHubArrival } from './hub-arrival';
import { HUB_ACTOR_FEET_OFFSET, hubCanvasDisplay } from './hub-projection';
import { peerHeading, type PeerTrack } from './hub-heading';

/** La mappa usa gli stessi PNG e la stessa profondità dello sfondo del menu. */
export class HubRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly artwork = new RefugeArtwork();
  private readonly peerTracks = new Map<string, PeerTrack>();
  scale = 2;
  camera = { x: 0, y: 0 };
  constructor(private readonly canvas: HTMLCanvasElement) { this.ctx = canvas.getContext('2d')!; }

  draw(state: HubState, appearance: CharacterAppearance, time: number, peers: readonly HubPlayer[] = [], arrivalElapsed = Infinity, calm = false): void {
    const arrival = hubArrivalFrame(arrivalElapsed, calm);
    const view = hubView(window.innerWidth, window.innerHeight, state.position.x, state.position.y, arrival.zoom);
    this.scale = view.scale; this.camera = { x: view.x, y: view.y };
    if (this.canvas.width !== view.width || this.canvas.height !== view.height) { this.canvas.width = view.width; this.canvas.height = view.height; }
    const display = hubCanvasDisplay(view.width, view.height, view.scale);
    this.canvas.style.width = `${display.width}px`; this.canvas.style.height = `${display.height}px`;
    const c = this.ctx, t = calm ? 2.5 : time;
    c.clearRect(0, 0, view.width, view.height);
    c.save(); c.imageSmoothingEnabled = false; c.translate(-view.x, -view.y);
    const hero = () => {
      c.fillStyle = '#08070a99'; c.fillRect(Math.round(state.position.x - 12), Math.round(state.position.y - 3), 24, 5);
      drawGameCharacter(c, appearance, state.position.x, state.position.y - HUB_ACTOR_FEET_OFFSET, time, state.moving, state.heading);
    };
    const present = new Set(peers.map(peer => peer.id));
    for (const id of this.peerTracks.keys()) if (!present.has(id)) this.peerTracks.delete(id);
    const actors: RefugeActor[] = [
      { y: state.position.y, draw: () => drawHubArrival(c, state.position.x, state.position.y - HUB_ACTOR_FEET_OFFSET, arrival.reveal, arrivalElapsed, hero) },
      ...peers.map(peer => {
        const track = peerHeading(this.peerTracks.get(peer.id), peer);
        this.peerTracks.set(peer.id, track);
        return { y: peer.y, draw: () => {
          c.fillStyle = '#08070a99'; c.fillRect(Math.round(peer.x - 12), Math.round(peer.y - 3), 24, 5);
          drawGameCharacter(c, peer.appearance, peer.x, peer.y - HUB_ACTOR_FEET_OFFSET, time, peer.moving, track.heading);
        } };
      }),
    ];
    this.artwork.draw(c, t, REFUGE_LAYOUT, actors);
    c.restore();
  }
  screenPoint(x: number, y: number): { x: number; y: number } { return { x: (x - this.camera.x) * this.scale, y: (y - this.camera.y) * this.scale }; }
}
