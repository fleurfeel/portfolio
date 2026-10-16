// Чистая математика сцены «первый экран → проекты»: без DOM и three.js, покрыта тестами.

/** Длины участков скролла в экранах (100svh). */
export const STAGE = {
  /** пролёт сквозь маскота */
  transition: 1.2,
  /** прокрутка на один кейс */
  step: 0.6,
  /** пауза на последнем кейсе перед выходом из сцены */
  hold: 0.4,
  /** блюр в самой глубокой точке пролёта, px */
  maxBlur: 18,
  /** во сколько раз «приближается» первый экран перед сменой */
  maxZoom: 8,
} as const;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** Где мы в сцене: t — пролёт 0…1, active — дробный индекс активного кейса. */
export function stageProgress(scrolled: number, viewport: number, count: number) {
  const s = Math.max(0, scrolled / viewport);
  return {
    t: clamp(s / STAGE.transition),
    active: clamp((s - STAGE.transition) / STAGE.step, 0, Math.max(0, count - 1)),
  };
}

/** Полная высота сцены (sticky-экран + длина скролла). */
export function stageHeight(viewport: number, count: number) {
  return viewport * (1 + STAGE.transition + STAGE.step * Math.max(0, count - 1) + STAGE.hold);
}

export interface TransitionState {
  phase: 'hero' | 'projects';
  heroScale: number;
  heroOpacity: number;
  projectsScale: number;
  projectsOpacity: number;
  /** px, общий для DOM-слоёв и канваса */
  blur: number;
  /** 0…1 — насколько поднята рука в сторону проектов */
  pointing: number;
}

/**
 * Пролёт: первая половина — первый экран растёт вокруг глаз маскота и размывается
 * (камера летит сквозь голову), вторая — экран проектов «подлетает» из размытия.
 */
export function transitionState(t: number, reducedMotion: boolean): TransitionState {
  const phase = t < 0.5 ? 'hero' : 'projects';
  const v = clamp((t - 0.5) / 0.5);
  const pointing = phase === 'projects' ? smoothstep(0.3, 1, v) : 0;

  if (reducedMotion) {
    return {
      phase,
      heroScale: 1,
      heroOpacity: phase === 'hero' ? 1 - smoothstep(0.35, 0.5, t) : 0,
      projectsScale: 1,
      projectsOpacity: phase === 'projects' ? smoothstep(0.5, 0.65, t) : 0,
      blur: 0,
      pointing,
    };
  }

  if (phase === 'hero') {
    const u = t / 0.5;
    return {
      phase,
      heroScale: 1 + (STAGE.maxZoom - 1) * u * u * u,
      heroOpacity: 1 - smoothstep(0.6, 1, u),
      projectsScale: 0.85,
      projectsOpacity: 0,
      blur: STAGE.maxBlur * u,
      pointing,
    };
  }

  const easeOut = 1 - (1 - v) * (1 - v);
  return {
    phase,
    heroScale: STAGE.maxZoom,
    heroOpacity: 0,
    projectsScale: 0.85 + 0.15 * easeOut,
    projectsOpacity: smoothstep(0, 0.5, v),
    blur: STAGE.maxBlur * (1 - v),
    pointing,
  };
}

/**
 * Позиции карточек на дуге по смещению от активной: 0, 1, 2, 3… (в px макета).
 * yUp/yDown — модули отступов вверх/вниз.
 */
export interface CardTable {
  scale: readonly number[];
  x: readonly number[];
  yUp: readonly number[];
  yDown: readonly number[];
  opacity: readonly number[];
}

/** Ноутбук 1440 (на десктопе 1920 всё ×1,5): каждая следующая ×0,7, дуга уходит вправо. */
export const CARDS_DESKTOP: CardTable = {
  scale: [1, 0.7, 0.49, 0.343, 0.24],
  x: [0, 57.2, 109.4, 181.5, 270],
  yUp: [0, 182, 313, 408.5, 490],
  yDown: [0, 182, 313, 408.5, 490],
  opacity: [1, 1, 1, 1, 0],
};

/** Телефон 393: соседи выглядывают справа, вниз отступ больше — под карточкой текст; вторая сверху уходит за край. */
export const CARDS_MOBILE: CardTable = {
  scale: [1, 0.465, 0.326, 0.228],
  x: [0, 180, 107, 107],
  yUp: [0, 220, 480, 600],
  yDown: [0, 338, 464, 600],
  opacity: [1, 1, 1, 0],
};

const sample = (values: readonly number[], at: number) => {
  const last = values.length - 1;
  if (at >= last) return values[last]!;
  const i = Math.floor(at);
  const f = at - i;
  return values[i]! + (values[i + 1]! - values[i]!) * f;
};

export function cardPose(offset: number, table: CardTable) {
  const a = Math.abs(offset);
  const y = sample(offset < 0 ? table.yUp : table.yDown, a);
  return {
    x: sample(table.x, a),
    y: offset < 0 ? -y : y,
    scale: sample(table.scale, a),
    opacity: sample(table.opacity, a),
  };
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Камера, при которой сцена выглядит увеличенной в s раз вокруг точки focus:
 * для объектов в плоскости точки это то же, что CSS scale с transform-origin в ней.
 */
export function zoomCamera(camera: Vec3, focus: Vec3, s: number): Vec3 {
  return {
    x: focus.x + (camera.x - focus.x) / s,
    y: focus.y + (camera.y - focus.y) / s,
    z: focus.z + (camera.z - focus.z) / s,
  };
}

export function formatCounter(index: number, count: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(index + 1)}/${pad(count)}`;
}
