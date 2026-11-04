/** Taratura visuale provvisoria dell'ingresso, in secondi. Nessuna modifica alla simulazione. */
export const HUB_ARRIVAL = { zoomSeconds: 1.1, revealAt: 0.55, revealSeconds: 0.7, settleSeconds: 0.25, zoom: 1.6 } as const;
export const HUB_ARRIVAL_SECONDS = HUB_ARRIVAL.revealAt + HUB_ARRIVAL.revealSeconds + HUB_ARRIVAL.settleSeconds;
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const ease = (value: number): number => value * value * (3 - 2 * value);

export function hubArrivalFrame(elapsed: number, calm = false): { readonly zoom: number; readonly reveal: number; readonly active: boolean } {
  if (calm) return { zoom: 1, reveal: 1, active: false };
  return {
    zoom: ease(clamp(elapsed / HUB_ARRIVAL.zoomSeconds)),
    reveal: clamp((elapsed - HUB_ARRIVAL.revealAt) / HUB_ARRIVAL.revealSeconds),
    active: elapsed < HUB_ARRIVAL_SECONDS,
  };
}

/** Pixel interi alla fine dello zoom; al primo fotogramma la vista coincide con quella del menu. */
export function hubView(width: number, height: number, x: number, y: number, zoom: number): { readonly scale: number; readonly width: number; readonly height: number; readonly x: number; readonly y: number } {
  const fit = Math.max(width / 1024, height / 576);
  const close = Math.max(2, Math.ceil(fit * HUB_ARRIVAL.zoom));
  const scale = fit + (close - fit) * zoom;
  const w = Math.ceil(width / scale), h = Math.ceil(height / scale);
  const centerX = 512 + (x - 512) * zoom, centerY = 288 + (y - 288) * zoom;
  return { scale, width: w, height: h,
    x: Math.round(Math.max(0, Math.min(1024 - w, centerX - w / 2))),
    y: Math.round(Math.max(0, Math.min(576 - h, centerY - h / 2))),
  };
}

/** Materializzazione a righe intere, anello di rune e braci: solo il personaggio locale viene rivelato. */
export function drawHubArrival(c: CanvasRenderingContext2D, x: number, y: number, reveal: number, elapsed: number, draw: () => void): void {
  if (reveal >= 1) { draw(); return; }
  if (reveal <= 0) return;
  c.save();
  const pulse = Math.sin(reveal * Math.PI);
  c.fillStyle = '#d9423a';
  c.globalAlpha = pulse;
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI / 10 + elapsed * 0.5;
    c.fillRect(Math.round(x + Math.cos(angle) * (22 + pulse * 7)), Math.round(y + 11 + Math.sin(angle) * 9), 2, 2);
  }
  c.fillStyle = '#ffd77a';
  for (let i = 0; i < 12; i++) {
    const rise = (elapsed * 24 + i * 7) % 48;
    c.fillRect(Math.round(x - 18 + (i * 13) % 36), Math.round(y + 12 - rise), 1, 2);
  }
  c.globalAlpha = 1;
  const line = Math.round(y + 15 - reveal * 70);
  c.beginPath(); c.rect(x - 48, line, 96, 80); c.clip();
  draw();
  c.fillStyle = '#ffb16b'; c.globalAlpha = pulse * 0.5;
  c.fillRect(Math.round(x - 10), line, 20, 2);
  c.restore();
}
