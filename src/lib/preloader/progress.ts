// Прогресс прелоадера: без DOM, покрыт тестами.

/** Вес этапов загрузки (в сумме 1): код сцены, скачивание моделей по байтам, подготовка GPU. */
export const PHASES = { code: 0.1, models: 0.7, init: 0.2 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function bytesFraction(loaded: readonly number[], totals: readonly number[]) {
  const total = totals.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const done = loaded.reduce((a, b, i) => a + Math.min(b, totals[i] ?? b), 0);
  return clamp01(done / total);
}

export function overallProgress(p: { code: number; models: number; init: number }) {
  return PHASES.code * clamp01(p.code) + PHASES.models * clamp01(p.models) + PHASES.init * clamp01(p.init);
}

/** Плавное догоняние реального прогресса: без рывков и без движения назад. */
export function approach(shown: number, target: number, dt: number, rate = 6) {
  if (target <= shown) return shown;
  return shown + (target - shown) * Math.min(1, rate * dt);
}

export function percentLabel(progress: number) {
  return `${Math.floor(clamp01(progress) * 100 + 1e-9)}%`;
}
