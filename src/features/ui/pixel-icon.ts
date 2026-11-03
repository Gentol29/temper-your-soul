import type { ItemSprite } from '../presentation/item-sprites';

/** Pixel interi senza sfumature, riutilizzati nei pulsanti e negli slot. */
export function renderPixelIcon(sprite: ItemSprite): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const size=sprite.size??16;
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'pixel-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const fallback = document.createElementNS(ns, 'g');
  svg.append(fallback);
  sprite.pixels.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === '.') return;
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', '1');
    rect.setAttribute('height', '1');
    rect.setAttribute('fill', sprite.palette[pixel]);
    fallback.append(rect);
  }));
  if (sprite.image) {
    const image = document.createElementNS(ns, 'image');
    image.setAttribute('href', sprite.image);
    image.setAttribute('width', String(size)); image.setAttribute('height', String(size));
    image.style.imageRendering = 'pixelated';
    image.addEventListener('load', () => fallback.setAttribute('display', 'none'));
    image.addEventListener('error', () => image.remove());
    svg.append(image);
  }
  return svg;
}
