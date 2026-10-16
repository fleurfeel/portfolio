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
  zoomCamera,
} from './math';

describe('stageProgress', () => {
  const vh = 1000;
  const n = 7;

  it('0 вверху сцены', () => {
    expect(stageProgress(0, vh, n)).toEqual({ t: 0, active: 0 });
  });

  it('переход занимает первые STAGE.transition экранов', () => {
    expect(stageProgress(STAGE.transition * vh * 0.5, vh, n).t).toBeCloseTo(0.5, 6);
    expect(stageProgress(STAGE.transition * vh, vh, n)).toEqual({ t: 1, active: 0 });
  });

  it('после перехода каждый STAGE.step экрана — следующий кейс', () => {
    const start = STAGE.transition * vh;
    expect(stageProgress(start + STAGE.step * vh * 2.5, vh, n).active).toBeCloseTo(2.5, 6);
  });

  it('не выходит за пределы', () => {
    expect(stageProgress(-500, vh, n)).toEqual({ t: 0, active: 0 });
    expect(stageProgress(1e6, vh, n)).toEqual({ t: 1, active: n - 1 });
  });

  it('высота сцены вмещает экран, переход, все кейсы и паузу в конце', () => {
    expect(stageHeight(vh, n)).toBeCloseTo(vh * (1 + STAGE.transition + STAGE.step * (n - 1) + STAGE.hold), 6);
  });
});

describe('transitionState', () => {
  it('t=0 — виден только первый экран, без блюра', () => {
    const s = transitionState(0, false);
    expect(s).toMatchObject({ phase: 'hero', heroOpacity: 1, heroScale: 1, blur: 0, projectsOpacity: 0, pointing: 0 });
  });

  it('t=1 — виден только экран проектов, рука поднята', () => {
    const s = transitionState(1, false);
    expect(s).toMatchObject({ phase: 'projects', heroOpacity: 0, projectsOpacity: 1, projectsScale: 1, blur: 0, pointing: 1 });
  });

  it('пролёт: первый экран растёт и размывается, максимум блюра в середине', () => {
    const a = transitionState(0.25, false);
    const mid = transitionState(0.49, false);
    expect(a.heroScale).toBeGreaterThan(1);
    expect(mid.heroScale).toBeGreaterThan(a.heroScale);
    expect(mid.blur).toBeGreaterThan(a.blur);
    expect(mid.blur).toBeLessThanOrEqual(STAGE.maxBlur);
  });

  it('после середины экран проектов приближается (масштаб растёт к 1)', () => {
    const a = transitionState(0.6, false);
    const b = transitionState(0.9, false);
    expect(a.phase).toBe('projects');
    expect(a.projectsScale).toBeLessThan(b.projectsScale);
    expect(b.projectsScale).toBeLessThanOrEqual(1);
  });

  it('prefers-reduced-motion: без масштаба и блюра, только смена прозрачности', () => {
    for (const t of [0, 0.2, 0.5, 0.7, 1]) {
      const s = transitionState(t, true);
      expect(s.heroScale).toBe(1);
      expect(s.projectsScale).toBe(1);
      expect(s.blur).toBe(0);
    }
    expect(transitionState(0.2, true).heroOpacity).toBe(1);
    expect(transitionState(0.8, true).projectsOpacity).toBe(1);
  });
});

describe('cardPose', () => {
  it('активная карточка — в центре, в полный размер', () => {
    expect(cardPose(0, CARDS_DESKTOP)).toEqual({ x: 0, y: 0, scale: 1, opacity: 1 });
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

  it('далёкие карточки исчезают', () => {
    expect(cardPose(4, CARDS_DESKTOP).opacity).toBe(0);
    expect(cardPose(-10, CARDS_DESKTOP).opacity).toBe(0);
  });

  it('на мобильном вверх и вниз — разные отступы (под карточкой текст)', () => {
    expect(cardPose(-1, CARDS_MOBILE).y).toBeCloseTo(-220, 6);
    expect(cardPose(1, CARDS_MOBILE).y).toBeCloseTo(338, 6);
  });
});

describe('zoomCamera', () => {
  it('при масштабе 1 — исходная камера', () => {
    expect(zoomCamera({ x: 1, y: 2, z: 10 }, { x: 0, y: 0.5, z: 0 }, 1)).toEqual({ x: 1, y: 2, z: 10 });
  });

  it('при масштабе s камера в s раз ближе к точке, точка остаётся на месте экрана', () => {
    const c = zoomCamera({ x: 1, y: 2, z: 10 }, { x: 0, y: 0.5, z: 0 }, 4);
    expect(c.z).toBeCloseTo(2.5, 6);
    expect(c.x).toBeCloseTo(0.25, 6);
    expect(c.y).toBeCloseTo(0.5 + 1.5 / 4, 6);
  });
});

describe('formatCounter', () => {
  it('01/07', () => {
    expect(formatCounter(0, 7)).toBe('01/07');
    expect(formatCounter(6, 7)).toBe('07/07');
    expect(formatCounter(9, 12)).toBe('10/12');
  });
});
