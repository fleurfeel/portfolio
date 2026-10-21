// Чистая математика 3D-маскота: без three.js и DOM, чтобы покрывать тестами.

export interface PosterBounds {
  /** макушка, ступни, глаза — доли высоты картинки; центр — доля ширины */
  top: number;
  bottom: number;
  eye: number;
  centerX: number;
}

/**
 * Где на PNG-постере (src/assets/hero/mascot.png, 1792×2400) находится сам маскот —
 * замерено по альфа-каналу. Ступни (bottom) в макете первого экрана стоят ровно на линии низа заголовков.
 */
export const MASCOT_POSTER_BOUNDS: PosterBounds = { top: 182 / 2400, bottom: 2135 / 2400, eye: 0.48, centerX: (47 + 1725) / 2 / 1792 };

/** Рендер для экрана проектов (src/assets/hero/avatar.png, 1215×1295). */
export const AVATAR_POSTER_BOUNDS: PosterBounds = { top: 14 / 1295, bottom: 1255 / 1295, eye: 0.494, centerX: (64 + 1141) / 2 / 1215 };

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Целевая рамка маскота на экране (в px канваса) по рамке PNG-постера. */
export function posterTarget(poster: Rect, bounds: PosterBounds = MASCOT_POSTER_BOUNDS) {
  return {
    top: poster.top + poster.height * bounds.top,
    bottom: poster.top + poster.height * bounds.bottom,
    eyeY: poster.top + poster.height * bounds.eye,
    centerX: poster.left + poster.width * bounds.centerX,
  };
}

/** Высота глаз 3D-модели от ступней при росте H — та же доля роста, что на постере. */
export function eyeHeight(modelHeight: number, bounds: PosterBounds = MASCOT_POSTER_BOUNDS) {
  return (modelHeight * (bounds.bottom - bounds.eye)) / (bounds.bottom - bounds.top);
}

export interface FitTarget {
  /** размер канваса, px */
  width: number;
  height: number;
  /** где должны оказаться макушка, ступни и центр маскота, px */
  top: number;
  bottom: number;
  centerX: number;
}

/**
 * Камера смотрит строго вдоль −Z (без поворота), поэтому кадрирование — это
 * расстояние (масштаб) и сдвиг по X/Y. Модель стоит ступнями на y=0, рост — modelHeight.
 */
export function fitCamera(target: FitTarget, modelHeight: number, fovDeg: number) {
  const pxHeight = Math.max(1, target.bottom - target.top);
  const visibleHeight = (modelHeight * target.height) / pxHeight;
  const k = visibleHeight / target.height; // мировых единиц на пиксель
  return {
    distance: visibleHeight / 2 / Math.tan((fovDeg * Math.PI) / 360),
    x: (target.width / 2 - target.centerX) * k,
    y: (target.bottom - target.height / 2) * k,
  };
}

export interface OrbitParams {
  index: number;
  count: number;
  /** текущий поворот орбиты, рад */
  angle: number;
  radius: number;
  centerY: number;
  /** наклон кольца: дальняя сторона выше ближней */
  tilt: number;
}

/** Позиция логотипа на наклонённом кольце вокруг головы (как в прототипе). */
export function orbitPosition({ index, count, angle, radius, centerY, tilt }: OrbitParams) {
  const theta = (index / count) * Math.PI * 2 + angle;
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  return { x, y: centerY - z * tilt, z: z * (1 - tilt * 0.3) };
}

/** Огибающая жеста: плавный вход и выход, 1 в середине. u — прогресс 0…1. */
export function envelope(u: number) {
  if (u <= 0 || u >= 1) return 0;
  return Math.sin((Math.min(1, u * 3.5, (1 - u) * 3.5) * Math.PI) / 2);
}

/** Экспоненциальное сглаживание к цели, не перескакивая её. */
export function damp(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * Math.min(1, rate * dt);
}

export function clampPixelRatio(dpr: number) {
  if (!Number.isFinite(dpr)) return 1;
  return Math.min(2, Math.max(1, dpr));
}

/** Сглаживание (MSAA) — только при pixelRatio < 1,5: на плотных экранах лесенки не видно, а буфер огромный. */
export function shouldAntialias(dpr: number) {
  return clampPixelRatio(dpr) < 1.5;
}

export function shouldTrackCursor({ canHover, reducedMotion }: { canHover: boolean; reducedMotion: boolean }) {
  return canHover && !reducedMotion;
}

/** Программный WebGL (SwiftShader, llvmpipe…) — 3D не запускаем, остаётся постер. */
export function isSoftwareRenderer(renderer: string) {
  return /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer);
}
