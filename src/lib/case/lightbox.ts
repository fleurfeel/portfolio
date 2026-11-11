// Просмотр экрана кейса на весь экран: какой файл открыть, где и какого размера показать, откуда лететь.

export interface Size {
  width: number;
  height: number;
}

export interface Box extends Size {
  left: number;
  top: number;
}

/** Самый широкий вариант из srcset; без srcset — исходный адрес. */
export function largestSource(srcset: string, fallback: string): string {
  let best = fallback;
  let bestWidth = 0;
  for (const part of srcset.split(',')) {
    const [url, descriptor] = part.trim().split(/\s+/);
    const width = parseInt(descriptor ?? '', 10);
    if (url && width > bestWidth) {
      best = url;
      bestWidth = width;
    }
  }
  return best;
}

/** Длинная страница: вписанная в высоту, она стала бы меньше этой доли своей ширины — тогда листаем. */
const SCROLL_WHEN_NARROWER_THAN = 0.75;

/**
 * Где показать экран. natural — размер в макете (CSS-пиксели), крупнее него не показываем.
 * fit — целиком по центру окна; scroll — длинная страница: по ширине окна, сверху, дальше листается.
 */
export function lightboxLayout(natural: Size, viewport: Size, pad: number): Box & { mode: 'fit' | 'scroll' } {
  const maxWidth = viewport.width - pad * 2;
  const maxHeight = viewport.height - pad * 2;
  const widthFit = Math.min(1, maxWidth / natural.width);
  const heightFit = Math.min(widthFit, maxHeight / natural.height);

  if (natural.width * heightFit < natural.width * widthFit * SCROLL_WHEN_NARROWER_THAN) {
    const width = natural.width * widthFit;
    return { mode: 'scroll', width, height: natural.height * widthFit, left: (viewport.width - width) / 2, top: pad };
  }

  const width = natural.width * heightFit;
  const height = natural.height * heightFit;
  return { mode: 'fit', width, height, left: (viewport.width - width) / 2, top: (viewport.height - height) / 2 };
}

/** Сдвиг и масштаб (от левого верхнего угла), которые ставят картинку из итоговой рамки на место миниатюры. */
export function flipFrom(thumb: Box, target: Box) {
  return { x: thumb.left - target.left, y: thumb.top - target.top, scale: thumb.width / target.width };
}
