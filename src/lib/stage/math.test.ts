import { describe, expect, it } from 'vitest';
import {
  CARDS_DESKTOP,
  CARDS_MOBILE,
  STAGE,
  cardPose,
  formatCounter,
  stageHeight,
  stageProgress,
  transitionState,
  lerpFit,
  aboutTransitionState,
  partLine,
  sceneState,
  infoVisibility,
  headProgress,
  flightProgress,
  snapToStep,
} from './math';

describe('stageProgress', () => {
  const vh = 1000;
  const n = 7;

  it('0 вверху сцены', () => {
    expect(stageProgress(0, vh, n)).toEqual({ t: 0, active: 0, u: 0 });
  });

  it('переход занимает первые STAGE.transition экранов', () => {
    expect(stageProgress(STAGE.transition * vh * 0.5, vh, n).t).toBeCloseTo(0.5, 6);
    expect(stageProgress(STAGE.transition * vh, vh, n)).toEqual({ t: 1, active: 0, u: 0 });
  });

  it('после перехода каждый STAGE.step экрана — следующий кейс', () => {
    const start = STAGE.transition * vh;
    expect(stageProgress(start + STAGE.step * vh * 2.5, vh, n).active).toBeCloseTo(2.5, 6);
  });

  it('не выходит за пределы', () => {
    expect(stageProgress(-500, vh, n)).toEqual({ t: 0, active: 0, u: 0 });
    expect(stageProgress(1e6, vh, n)).toEqual({ t: 1, active: n - 1, u: 1 });
  });

  it('после паузы на последнем кейсе — переход к «Обо мне» (u)', () => {
    const start = (STAGE.transition + STAGE.step * (n - 1) + STAGE.hold) * vh;
    expect(stageProgress(start, vh, n).u).toBe(0);
    expect(stageProgress(start + STAGE.about * vh * 0.5, vh, n).u).toBeCloseTo(0.5, 6);
    expect(stageProgress(start + STAGE.about * vh * 0.5, vh, n).active).toBe(n - 1);
  });

  it('высота сцены вмещает экран, оба перехода, все кейсы и паузу', () => {
    expect(stageHeight(vh, n)).toBeCloseTo(vh * (1 + STAGE.transition + STAGE.step * (n - 1) + STAGE.hold + STAGE.about), 6);
  });
});

describe('transitionState', () => {
  it('t=0 — виден первый экран, без блюра, маскот на месте, логотипы на орбите', () => {
    expect(transitionState(0, false)).toMatchObject({
      phase: 'hero',
      heroOpacity: 1,
      heroBlur: 0,
      projectsOpacity: 0,
      mascotMix: 0,
      logos: 1,
      pointing: 0,
    });
  });

  it('t=1 — виден экран проектов без блюра, маскот слева и показывает рукой, логотипов нет', () => {
    expect(transitionState(1, false)).toMatchObject({
      phase: 'projects',
      heroOpacity: 0,
      projectsOpacity: 1,
      projectsBlur: 0,
      mascotMix: 1,
      logos: 0,
      pointing: 1,
    });
  });

  it('без приближения: в состоянии нет масштаба слоёв', () => {
    const s = transitionState(0.3, false);
    expect(s).not.toHaveProperty('heroScale');
    expect(s).not.toHaveProperty('projectsScale');
  });

  it('первый экран уходит в туман, экран проектов из него проявляется', () => {
    const hero = [0.1, 0.25, 0.45].map((t) => transitionState(t, false));
    expect(hero[0]!.heroBlur).toBeLessThan(hero[1]!.heroBlur);
    expect(hero[1]!.heroBlur).toBeLessThan(hero[2]!.heroBlur);
    expect(hero[2]!.heroOpacity).toBeLessThan(hero[0]!.heroOpacity);
    const projects = [0.55, 0.75, 0.95].map((t) => transitionState(t, false));
    expect(projects[0]!.projectsBlur).toBeGreaterThan(projects[1]!.projectsBlur);
    expect(projects[1]!.projectsBlur).toBeGreaterThan(projects[2]!.projectsBlur);
    for (const s of [...hero, ...projects]) {
      expect(s.heroBlur).toBeLessThanOrEqual(STAGE.maxBlur);
      expect(s.projectsBlur).toBeLessThanOrEqual(STAGE.maxBlur);
    }
  });

  it('маскот переезжает плавно и только вперёд', () => {
    const mix = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => transitionState(t, false).mascotMix);
    for (let i = 1; i < mix.length; i++) expect(mix[i]).toBeGreaterThanOrEqual(mix[i - 1]!);
    expect(mix[2]).toBeGreaterThan(0);
    expect(mix[3]).toBeLessThan(1);
  });

  it('prefers-reduced-motion: без блюра, маскот переставляется без движения', () => {
    for (const t of [0, 0.2, 0.5, 0.7, 1]) {
      const s = transitionState(t, true);
      expect(s.heroBlur).toBe(0);
      expect(s.projectsBlur).toBe(0);
      expect([0, 1]).toContain(s.mascotMix);
    }
    expect(transitionState(0.2, true).heroOpacity).toBe(1);
    expect(transitionState(0.8, true).projectsOpacity).toBe(1);
  });
});

describe('aboutTransitionState', () => {
  it('u=0 — на экране проекты, «Обо мне» скрыт', () => {
    expect(aboutTransitionState(0, false)).toMatchObject({ projectsOpacity: 1, projectsBlur: 0, aboutOpacity: 0, aboutMix: 0 });
  });

  it('u=1 — «Обо мне» резкий, проекты скрыты, маскот в центре', () => {
    expect(aboutTransitionState(1, false)).toMatchObject({ projectsOpacity: 0, aboutOpacity: 1, aboutBlur: 0, aboutMix: 1 });
  });

  it('проекты уходят в туман, «Обо мне» проявляется', () => {
    expect(aboutTransitionState(0.2, false).projectsBlur).toBeLessThan(aboutTransitionState(0.45, false).projectsBlur);
    expect(aboutTransitionState(0.6, false).aboutBlur).toBeGreaterThan(aboutTransitionState(0.9, false).aboutBlur);
  });

  it('prefers-reduced-motion: без блюра, маскот переставляется', () => {
    for (const u of [0, 0.3, 0.6, 1]) {
      const s = aboutTransitionState(u, true);
      expect(s.projectsBlur).toBe(0);
      expect(s.aboutBlur).toBe(0);
      expect([0, 1]).toContain(s.aboutMix);
    }
  });
});

describe('sceneState', () => {
  it('в начале — первый экран', () => {
    expect(sceneState(0, 0, false)).toMatchObject({ phase: 'hero', heroOpacity: 1, projectsOpacity: 0, aboutOpacity: 0 });
  });

  it('между переходами — проекты, маскот показывает рукой', () => {
    expect(sceneState(1, 0, false)).toMatchObject({ phase: 'projects', heroOpacity: 0, projectsOpacity: 1, aboutOpacity: 0, pointing: 1 });
  });

  it('в конце — «Обо мне», рука опущена, проекты скрыты', () => {
    expect(sceneState(1, 1, false)).toMatchObject({ phase: 'about', projectsOpacity: 0, aboutOpacity: 1, aboutMix: 1, pointing: 0 });
  });

  it('во время перехода к «Обо мне» рука плавно опускается', () => {
    const p = sceneState(1, 0.5, false).pointing;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('infoVisibility', () => {
  it('карусель стоит на кейсе — текст резкий и виден', () => {
    for (const a of [0, 1, 3, 5]) expect(infoVisibility(a)).toEqual({ opacity: 1, blur: 0 });
  });

  it('карточки едут между кейсами — текст растворяется и размывается', () => {
    const mid = infoVisibility(2.5);
    expect(mid.opacity).toBe(0);
    expect(mid.blur).toBeGreaterThan(0);
  });

  it('у остановки — почти полностью резкий', () => {
    const near = infoVisibility(3.05);
    expect(near.opacity).toBe(1);
    const leaving = infoVisibility(3.25);
    expect(leaving.opacity).toBeGreaterThan(0);
    expect(leaving.opacity).toBeLessThan(1);
  });
});

describe('headProgress', () => {
  const vh = 1000;
  it('пока манифест показался меньше чем на треть экрана — тело целиком', () => {
    expect(headProgress(vh, vh)).toBe(0);
    expect(headProgress(vh * 0.7, vh)).toBe(0);
  });

  it('голова — только когда манифест встал на экран целиком', () => {
    expect(headProgress(vh * 0.15, vh)).toBeLessThan(1);
    expect(headProgress(0, vh)).toBe(1);
    expect(headProgress(-vh, vh)).toBe(1);
  });

  it('плавно и только вперёд', () => {
    const v = [0.6, 0.45, 0.3, 0.15].map((f) => headProgress(vh * f, vh));
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]!);
  });
});

describe('flightProgress', () => {
  const vh = 1000;
  it('цель ещё под экраном — 0', () => {
    expect(flightProgress(vh, vh)).toBe(0);
    expect(flightProgress(vh * 1.5, vh)).toBe(0);
  });

  it('цель почти встала на экран — 1', () => {
    expect(flightProgress(vh * 0.15, vh)).toBe(1);
    expect(flightProgress(-vh, vh)).toBe(1);
  });

  it('плавно и только вперёд', () => {
    const v = [0.9, 0.7, 0.5, 0.3].map((f) => flightProgress(vh * f, vh));
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]!);
  });
});

describe('snapToStep', () => {
  const step = 500;
  const n = 5;

  it('ближайший шаг: недокрутил или перекрутил — всё равно на шаг', () => {
    expect(snapToStep(480, step, n)).toBe(500);
    expect(snapToStep(740, step, n)).toBe(500);
    expect(snapToStep(760, step, n)).toBe(1000);
    expect(snapToStep(10, step, n)).toBe(0);
  });

  it('уже на шаге — ничего не делаем', () => {
    expect(snapToStep(1000, step, n)).toBeNull();
    expect(snapToStep(1001, step, n)).toBeNull();
  });

  it('вне закреплённого экрана — не трогаем прокрутку', () => {
    expect(snapToStep(-300, step, n)).toBeNull();
    expect(snapToStep(step * (n - 1) + 300, step, n)).toBeNull();
  });

  it('у краёв доводит к первому и последнему шагу', () => {
    expect(snapToStep(-100, step, n)).toBe(0);
    expect(snapToStep(step * (n - 1) + 100, step, n)).toBe(step * (n - 1));
  });
});

describe('lerpFit', () => {
  it('смешивает кадры камеры первого экрана и проектов', () => {
    const a = { distance: 2, x: 0, y: 1 };
    const b = { distance: 6, x: 2, y: -1 };
    expect(lerpFit(a, b, 0)).toEqual(a);
    expect(lerpFit(a, b, 1)).toEqual(b);
    expect(lerpFit(a, b, 0.5)).toEqual({ distance: 4, x: 1, y: 0 });
  });
});

describe('cardPose', () => {
  it('активная карточка — в центре, в полный размер', () => {
    expect(cardPose(0, CARDS_DESKTOP)).toEqual({ x: 0, y: 0, scale: 1, opacity: 1, blur: 0 });
  });

  it('соседи — как в макете ноутбука: ×0,7 и ±182 px по вертикали', () => {
    const below = cardPose(1, CARDS_DESKTOP);
    const above = cardPose(-1, CARDS_DESKTOP);
    expect(below.scale).toBeCloseTo(0.7, 6);
    expect(below.y).toBeCloseTo(182, 6);
    expect(above.y).toBeCloseTo(-182, 6);
    expect(above.x).toBeCloseTo(below.x, 6);
    expect(below.x).toBeGreaterThan(0); // дуга уходит вправо
  });

  it('между позициями — плавно', () => {
    const p = cardPose(0.5, CARDS_DESKTOP);
    expect(p.scale).toBeCloseTo(0.85, 6);
    expect(p.y).toBeCloseTo(91, 6);
  });

  it('активная карточка резкая, остальные размываются тем сильнее, чем дальше', () => {
    expect(cardPose(0, CARDS_DESKTOP).blur).toBe(0);
    const b = [0.5, 1, 2, 3].map((d) => cardPose(d, CARDS_DESKTOP).blur);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1]!);
    expect(cardPose(-1, CARDS_MOBILE).blur).toBeGreaterThan(0);
  });

  it('далёкие карточки исчезают', () => {
    expect(cardPose(4, CARDS_DESKTOP).opacity).toBe(0);
    expect(cardPose(-10, CARDS_DESKTOP).opacity).toBe(0);
  });

  it('на мобильном вверх и вниз — разные отступы (под карточкой текст)', () => {
    expect(cardPose(-1, CARDS_MOBILE).y).toBeCloseTo(-220, 6);
    expect(cardPose(1, CARDS_MOBILE).y).toBeCloseTo(338, 6);
  });
});

describe('formatCounter', () => {
  it('01/07', () => {
    expect(formatCounter(0, 7)).toBe('01/07');
    expect(formatCounter(6, 7)).toBe('07/07');
    expect(formatCounter(9, 12)).toBe('10/12');
  });
});

describe('partLine', () => {
  // строка: слова по 100 px через 20 px, голова в центре второго слова (x = 170)
  const line = [
    { left: 0, width: 100 },
    { left: 120, width: 100 },
    { left: 240, width: 100 },
  ];

  it('голова не задевает строку — слова на месте', () => {
    expect(partLine(line, 170, 0)).toEqual([0, 0, 0]);
  });

  it('слова расходятся от головы в обе стороны', () => {
    const [a, b, c] = partLine(line, 150, 60);
    expect(a).toBeLessThan(0);
    expect(b).toBeGreaterThan(0);
    expect(c).toBeGreaterThan(0);
  });

  it('проём под головой свободен', () => {
    const cx = 150;
    const half = 60;
    const shifts = partLine(line, cx, half);
    line.forEach((w, i) => {
      const left = w.left + shifts[i]!;
      const right = left + w.width;
      expect(right <= cx - half + 1e-9 || left >= cx + half - 1e-9).toBe(true);
    });
  });

  it('слова с одной стороны едут вместе — не налезают друг на друга', () => {
    const [, b, c] = partLine(line, 150, 60);
    expect(b).toBeCloseTo(c!, 9);
  });

  it('если проём и так свободен, ничего не двигаем', () => {
    expect(partLine(line, 110, 8)).toEqual([0, 0, 0]);
  });
});
