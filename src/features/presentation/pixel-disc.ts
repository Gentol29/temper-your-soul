/** Righe intere con il centro del pixel dentro il cerchio di collisione del mondo. */
export function rasterDisc(cx: number, cy: number, radius: number, row: (x: number, y: number, width: number) => void): void {
  for (let y = Math.ceil(cy - radius - 0.5); y < cy + radius - 0.5; y++) {
    const half = Math.sqrt(Math.max(0, radius * radius - (y + 0.5 - cy) ** 2));
    const left = Math.floor(cx - half - 0.5) + 1;
    const right = Math.ceil(cx + half - 0.5);
    if (right > left) row(left, y, right - left);
  }
}
