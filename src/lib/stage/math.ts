// Чистая математика сцены «первый экран → проекты → обо мне»: без DOM и three.js, покрыта тестами.

/** Длины участков скролла в экранах (100svh). */
export const STAGE = {
  /** переход «туман»: первый экран растворяется, маскот переезжает, проекты проявляются */
  transition: 1.2,
  /** прокрутка на один кейс */
  step: 0.6,
  /** пауза на последнем кейсе перед переходом к «Обо мне» */
  hold: 0.4,
  /** переход «туман» к «Обо мне»: маскот переходит в центр */
  about: 1,
  /** блюр экранов в середине перехода, px */
  maxBlur: 14,
} as const;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** Где начинается переход к «Обо мне», в экранах от начала сцены. */
export const aboutStart = (count: number) => STAGE.transition + STAGE.step * Math.max(0, count - 1) + STAGE.hold;

/**
 * Где мы в сцене: t — переход к проектам 0…1, active — дробный индекс активного кейса,
 * u — переход к «Обо мне» 0…1.
 */
export function stageProgress(scrolled: number, viewport: number, count: number) {
  const s = Math.max(0, scrolled / viewport);
  return {
    t: clamp(s / STAGE.transition),
    active: clamp((s - STAGE.transition) / STAGE.step, 0, Math.max(0, count - 1)),
    u: clamp((s - aboutStart(count)) / STAGE.about),
  };
}

/** Полная высота сцены (sticky-экран + длина скролла). */
export function stageHeight(viewport: number, count: number) {
  return viewport * (1 + aboutStart(count) + STAGE.about);
}

export interface TransitionState {
  phase: 'hero' | 'projects';
  heroOpacity: number;
  /** px */
  heroBlur: number;
  projectsOpacity: number;
  /** px */
  projectsBlur: number;
  /** 0 — маскот на месте первого экрана, 1 — на экране проектов */
  mascotMix: number;
  /** 1 — логотипы на орбите, 0 — втянулись в кудри */
  logos: number;
  /** 0…1 — насколько поднята рука в сторону проектов */
  pointing: number;
}

/**
 * Переход «туман» без приближения: первый экран размывается и растворяется в цвет фона,
 * маскот остаётся резким и переезжает на своё место на экране проектов,
 * а экран проектов проявляется из размытия.
 */
export function transitionState(t: number, reducedMotion: boolean): TransitionState {
  const phase = t < 0.5 ? 'hero' : 'projects';
  const pointing = smoothstep(0.6, 1, t);

  if (reducedMotion) {
    return {
      phase,
      heroOpacity: 1 - smoothstep(0.35, 0.5, t),
      heroBlur: 0,
      projectsOpacity: smoothstep(0.5, 0.65, t),
      projectsBlur: 0,
      mascotMix: phase === 'hero' ? 0 : 1,
      logos: phase === 'hero' ? 1 : 0,
      pointing,
    };
  }

  return {
    phase,
    heroOpacity: 1 - smoothstep(0.05, 0.5, t),
    heroBlur: STAGE.maxBlur * smoothstep(0, 0.5, t),
    projectsOpacity: smoothstep(0.45, 0.9, t),
    projectsBlur: STAGE.maxBlur * (1 - smoothstep(0.45, 1, t)),
    mascotMix: smoothstep(0.1, 0.9, t),
    logos: 1 - smoothstep(0, 0.4, t),
    pointing,
  };
}

/** Переход «туман» от проектов к «Обо мне»: та же механика, маскот переходит в центр экрана. */
export function aboutTransitionState(u: number, reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      projectsOpacity: 1 - smoothstep(0.35, 0.5, u),
      projectsBlur: 0,
      aboutOpacity: smoothstep(0.5, 0.65, u),
      aboutBlur: 0,
      aboutMix: u < 0.5 ? 0 : 1,
    };
  }
  return {
    projectsOpacity: 1 - smoothstep(0.05, 0.5, u),
    projectsBlur: STAGE.maxBlur * smoothstep(0, 0.5, u),
    aboutOpacity: smoothstep(0.45, 0.9, u),
    aboutBlur: STAGE.maxBlur * (1 - smoothstep(0.45, 1, u)),
    aboutMix: smoothstep(0.1, 0.9, u),
  };
}

export interface SceneState {
  phase: 'hero' | 'projects' | 'about';
  heroOpacity: number;
  heroBlur: number;
  projectsOpacity: number;
  projectsBlur: number;
  aboutOpacity: number;
  aboutBlur: number;
  /** маскот: 0 — первый экран, 1 — проекты */
  mascotMix: number;
  /** маскот: 0 — где был, 1 — центр «Обо мне» */
  aboutMix: number;
  logos: number;
  pointing: number;
}

/** Всё состояние сцены по двум переходам: что видно, что размыто и где маскот. */
export function sceneState(t: number, u: number, reducedMotion: boolean): SceneState {
  const a = transitionState(t, reducedMotion);
  const b = aboutTransitionState(u, reducedMotion);
  return {
    phase: u >= 0.5 ? 'about' : a.phase,
    heroOpacity: a.heroOpacity,
    heroBlur: a.heroBlur,
    projectsOpacity: Math.min(a.projectsOpacity, b.projectsOpacity),
    projectsBlur: Math.max(a.projectsBlur, b.projectsBlur),
    aboutOpacity: b.aboutOpacity,
    aboutBlur: b.aboutBlur,
    mascotMix: a.mascotMix,
    aboutMix: b.aboutMix,
    logos: a.logos,
    // к «Обо мне» рука опускается
    pointing: a.pointing * (1 - smoothstep(0, 0.6, u)),
  };
}

export interface CameraFit {
  distance: number;
  x: number;
  y: number;
}

/** Кадр камеры между первым экраном (m=0) и экраном проектов (m=1). */
export function lerpFit(a: CameraFit, b: CameraFit, m: number): CameraFit {
  return { distance: a.distance + (b.distance - a.distance) * m, x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m };
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
  /** глубина резкости: блюр по удалённости от активной, px */
  blur: readonly number[];
}

/** Ноутбук 1440 (на десктопе 1920 всё ×1,5): каждая следующая ×0,7, дуга уходит вправо. */
export const CARDS_DESKTOP: CardTable = {
  scale: [1, 0.7, 0.49, 0.343, 0.24],
  x: [0, 57.2, 109.4, 181.5, 270],
  yUp: [0, 182, 313, 408.5, 490],
  yDown: [0, 182, 313, 408.5, 490],
  opacity: [1, 1, 1, 1, 0],
  blur: [0, 3, 5, 7, 8],
};

/** Телефон 393: соседи выглядывают справа, вниз отступ больше — под карточкой текст; вторая сверху уходит за край. */
export const CARDS_MOBILE: CardTable = {
  scale: [1, 0.465, 0.326, 0.228],
  x: [0, 180, 107, 107],
  yUp: [0, 220, 480, 600],
  yDown: [0, 338, 464, 600],
  opacity: [1, 1, 1, 0],
  blur: [0, 2.5, 4, 5],
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
    blur: sample(table.blur, a),
  };
}

export function formatCounter(index: number, count: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(index + 1)}/${pad(count)}`;
}
