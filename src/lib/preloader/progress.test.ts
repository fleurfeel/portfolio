import { describe, expect, it } from 'vitest';
import { PHASES, approach, bytesFraction, overallProgress, percentLabel } from './progress';

describe('bytesFraction', () => {
  it('доля скачанных байт по всем файлам', () => {
    expect(bytesFraction([50, 0], [100, 100])).toBeCloseTo(0.25, 6);
    expect(bytesFraction([100, 100], [100, 100])).toBe(1);
  });

  it('без файлов — 0, лишние байты не дают больше 1', () => {
    expect(bytesFraction([], [])).toBe(0);
    expect(bytesFraction([150], [100])).toBe(1);
  });
});

describe('overallProgress', () => {
  it('этапы идут по порядку и в сумме дают 1', () => {
    const total = PHASES.code + PHASES.models + PHASES.init;
    expect(total).toBeCloseTo(1, 6);
    expect(overallProgress({ code: 0, models: 0, init: 0 })).toBe(0);
    expect(overallProgress({ code: 1, models: 0, init: 0 })).toBeCloseTo(PHASES.code, 6);
    expect(overallProgress({ code: 1, models: 1, init: 1 })).toBeCloseTo(1, 6);
  });

  it('половина моделей — середина своего этапа', () => {
    expect(overallProgress({ code: 1, models: 0.5, init: 0 })).toBeCloseTo(PHASES.code + PHASES.models / 2, 6);
  });

  it('значения вне 0…1 обрезаются', () => {
    expect(overallProgress({ code: 2, models: -1, init: 0 })).toBeCloseTo(PHASES.code, 6);
  });
});

describe('approach', () => {
  it('отображаемый прогресс догоняет реальный, но не перескакивает', () => {
    const next = approach(0.2, 0.6, 0.016);
    expect(next).toBeGreaterThan(0.2);
    expect(next).toBeLessThanOrEqual(0.6);
  });

  it('никогда не идёт назад', () => {
    expect(approach(0.5, 0.3, 0.016)).toBe(0.5);
  });

  it('за долгий кадр доходит до цели', () => {
    expect(approach(0, 1, 10)).toBe(1);
  });
});

describe('percentLabel', () => {
  it('целые проценты от 0 до 100', () => {
    expect(percentLabel(0)).toBe('0%');
    expect(percentLabel(0.426)).toBe('42%');
    expect(percentLabel(0.999)).toBe('99%');
    expect(percentLabel(1)).toBe('100%');
    expect(percentLabel(1.5)).toBe('100%');
  });
});
