import { menuLayoutFor } from './menu-layout';
import { RefugeArtwork } from './refuge-artwork';
export const MENU_SCENE = { width: 1024, height: 576 } as const;
const MENU_FRAME = MENU_SCENE;
export type MenuSceneFocus = 'portal' | 'storage' | 'forge' | 'merchant' | 'gate' | 'hero';
/** La vista copre la finestra mostrando al massimo `MENU_FRAME`; il canvas la ingrandisce con pixel netti, come il rifugio. */
export function menuSceneView(width: number, height: number): { readonly scale: number; readonly width: number; readonly height: number; readonly x: number; readonly y: number } {
  const scale = Math.max(width / MENU_FRAME.width, height / MENU_FRAME.height);
  const viewWidth = Math.ceil(width / scale), viewHeight = Math.ceil(height / scale);
  return { scale, width: viewWidth, height: viewHeight, x: Math.round((MENU_SCENE.width - viewWidth) / 2), y: Math.round((MENU_SCENE.height - viewHeight) / 2) };
}


/** Il menu guarda da lontano la stessa mappa in cui si entra. Il personaggio appare solo all'ingresso. */
export class MenuScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly artwork = new RefugeArtwork();
  focus: MenuSceneFocus | null = null;
  constructor(private readonly canvas: HTMLCanvasElement) { this.ctx = canvas.getContext('2d')!; }
  draw(time: number, calm: boolean): void {
    const view = menuSceneView(window.innerWidth, window.innerHeight);
    if (this.canvas.width !== view.width || this.canvas.height !== view.height) { this.canvas.width = view.width; this.canvas.height = view.height; }
    const c = this.ctx; c.save(); c.translate(-view.x, -view.y);
    this.artwork.draw(c, calm ? 2.5 : time, menuLayoutFor(view.width, view.height), [], this.focus);
    c.restore();
  }
}
