// Чистая математика 3D-маскота: без three.js и DOM, чтобы покрывать тестами.

/**
 * Где на PNG-постере (src/assets/hero/mascot.png, 1792×2400) находится сам маскот —
 * доли от размеров картинки, замерены по альфа-каналу. Ступни (bottom) в макете
 * стоят ровно на линии низа заголовков.
 */
export const MASCOT_POSTER_BOUNDS = { top: 182 / 2400, bottom: 2135 / 2400, centerX: (47 + 1725) / 2 / 1792 } as const;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Целевая рамка маскота на экране (в px канваса) по рамке PNG-постера. */
export function posterTarget(poster: Rect) {
  return {
    top: poster.top + poster.height * MASCOT_POSTER_BOUNDS.top,
    bottom: poster.top + poster.height * MASCOT_POSTER_BOUNDS.bottom,
    centerX: poster.left + poster.width * MASCOT_POSTER_BOUNDS.centerX,
  };
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

export function shouldTrackCursor({ canHover, reducedMotion }: { canHover: boolean; reducedMotion: boolean }) {
  return canHover && !reducedMotion;
}

/** Программный WebGL (SwiftShader, llvmpipe…) — 3D не запускаем, остаётся постер. */
export function isSoftwareRenderer(renderer: string) {
  return /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer);
}
