import { AVATAR_POSTER_BOUNDS, MASCOT_POSTER_BOUNDS, type PosterBounds, type Rect } from '../mascot/math';

/**
 * Рамка элемента относительно root по offset* — без учёта transform предков.
 * Слои сцены масштабируются при пролёте, а 3D должен знать их «покоящуюся» раскладку.
 */
export function offsetRect(el: HTMLElement, root: HTMLElement): Rect {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: el.offsetWidth, height: el.offsetHeight };
}

/** Видимый (не display:none) постер из нескольких — у мобильной и десктопной раскладки они разные. */
export function visiblePoster(scope: ParentNode, name: string) {
  return [...scope.querySelectorAll<HTMLElement>(`[data-mascot-poster="${name}"]`)].find((el) => el.offsetParent !== null) ?? null;
}

export function posterBounds(el: HTMLElement): PosterBounds {
  return el.dataset.bounds === 'avatar' ? AVATAR_POSTER_BOUNDS : MASCOT_POSTER_BOUNDS;
}
