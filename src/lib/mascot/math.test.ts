import { describe, expect, it } from 'vitest';
import {
  MASCOT_POSTER_BOUNDS,
  clampPixelRatio,
  damp,
  envelope,
  fitCamera,
  isSoftwareRenderer,
  orbitPosition,
  posterTarget,
  shouldTrackCursor,
} from './math';

const DEG = Math.PI / 180;

describe('fitCamera', () => {
  // Обратная проекция: где на экране окажется точка мира (x, y, 0)
  function project(cam: ReturnType<typeof fitCamera>, x: number, y: number, w: number, h: number, fov: number) {
    const visH = 2 * cam.distance * Math.tan((fov * DEG) / 2);
    const k = visH / h; // мировых единиц на пиксель
    return { px: w / 2 + (x - cam.x) / k, py: h / 2 - (y - cam.y) / k };
  }

  it('ставит ступни (y=0) и макушку (y=H) на заданные пиксели', () => {
    const cam = fitCamera({ width: 1440, height: 830, top: 211, bottom: 756, centerX: 720 }, 0.98, 28);
    const feet = project(cam, 0, 0, 1440, 830, 28);
    const head = project(cam, 0, 0.98, 1440, 830, 28);
    expect(feet.py).toBeCloseTo(756, 6);
    expect(head.py).toBeCloseTo(211, 6);
    expect(feet.px).toBeCloseTo(720, 6);
  });

  it('сдвигает камеру по X, если маскот не по центру канваса', () => {
    const cam = fitCamera({ width: 400, height: 800, top: 100, bottom: 500, centerX: 100 }, 1, 28);
    expect(project(cam, 0, 0, 400, 800, 28).px).toBeCloseTo(100, 6);
    expect(cam.x).toBeGreaterThan(0);
  });

  it('чем меньше маскот на экране, тем дальше камера', () => {
    const near = fitCamera({ width: 1000, height: 1000, top: 0, bottom: 800, centerX: 500 }, 1, 28);
    const far = fitCamera({ width: 1000, height: 1000, top: 0, bottom: 400, centerX: 500 }, 1, 28);
    expect(far.distance).toBeCloseTo(near.distance * 2, 6);
  });
});

describe('posterTarget', () => {
  it('переводит рамку PNG-постера в рамку видимого маскота', () => {
    const t = posterTarget({ left: 470, top: 161, width: 499, height: 669 });
    expect(t.top).toBeCloseTo(161 + 669 * MASCOT_POSTER_BOUNDS.top, 6);
    expect(t.bottom).toBeCloseTo(161 + 669 * MASCOT_POSTER_BOUNDS.bottom, 6);
    expect(t.centerX).toBeCloseTo(470 + 499 * MASCOT_POSTER_BOUNDS.centerX, 6);
  });

  it('ступни на рендере совпадают с низом заголовков в макете (756 px на ноутбуке)', () => {
    expect(posterTarget({ left: 470, top: 161, width: 499, height: 669 }).bottom).toBeCloseTo(756, 0);
  });
});

describe('orbitPosition', () => {
  const base = { count: 8, angle: 0, radius: 1, centerY: 0.8, tilt: 0.28 };

  it('раскладывает логотипы равномерно по кругу', () => {
    const angles = Array.from({ length: 8 }, (_, i) => {
      const p = orbitPosition({ ...base, index: i });
      return Math.atan2(p.z / (1 - base.tilt * 0.3), p.x);
    });
    const steps = angles.slice(1).map((a, i) => (a - angles[i]! + 2 * Math.PI) % (2 * Math.PI));
    for (const s of steps) expect(s).toBeCloseTo((2 * Math.PI) / 8, 6);
  });

  it('без наклона орбита лежит на высоте centerY', () => {
    for (let i = 0; i < 8; i++) expect(orbitPosition({ ...base, tilt: 0, index: i }).y).toBeCloseTo(0.8, 6);
  });

  it('с наклоном дальняя сторона орбиты выше ближней', () => {
    const front = orbitPosition({ ...base, index: 0, angle: Math.PI / 2 }); // z > 0 — к камере
    const back = orbitPosition({ ...base, index: 0, angle: -Math.PI / 2 });
    expect(front.z).toBeGreaterThan(0);
    expect(back.y).toBeGreaterThan(front.y);
  });

  it('поворот орбиты на угол сдвигает все логотипы', () => {
    const a = orbitPosition({ ...base, index: 1, angle: 0 });
    const b = orbitPosition({ ...base, index: 0, angle: (2 * Math.PI) / 8 });
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
  });
});

describe('envelope', () => {
  it('0 на краях, 1 в середине жеста', () => {
    expect(envelope(0)).toBeCloseTo(0, 6);
    expect(envelope(1)).toBeCloseTo(0, 6);
    expect(envelope(0.5)).toBeCloseTo(1, 6);
  });

  it('за пределами [0, 1] — 0', () => {
    expect(envelope(-0.2)).toBe(0);
    expect(envelope(1.2)).toBe(0);
  });
});

describe('damp', () => {
  it('движется к цели, но не перескакивает её', () => {
    expect(damp(0, 1, 4, 0.1)).toBeCloseTo(0.4, 6);
    expect(damp(0, 1, 4, 1)).toBe(1);
  });
});

describe('clampPixelRatio', () => {
  it('не выше 2 и не ниже 1', () => {
    expect(clampPixelRatio(3)).toBe(2);
    expect(clampPixelRatio(1.5)).toBe(1.5);
    expect(clampPixelRatio(0.5)).toBe(1);
    expect(clampPixelRatio(Number.NaN)).toBe(1);
  });
});

describe('shouldTrackCursor', () => {
  it('следит за курсором только с мышью и без prefers-reduced-motion', () => {
    expect(shouldTrackCursor({ canHover: true, reducedMotion: false })).toBe(true);
    expect(shouldTrackCursor({ canHover: false, reducedMotion: false })).toBe(false);
    expect(shouldTrackCursor({ canHover: true, reducedMotion: true })).toBe(false);
  });
});

describe('isSoftwareRenderer', () => {
  it.each(['Google SwiftShader', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver', 'Software Rasterizer'])(
    'программный: %s',
    (name) => expect(isSoftwareRenderer(name)).toBe(true),
  );

  it.each(['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Apple M2', 'Adreno (TM) 740', 'Mali-G78'])(
    'аппаратный: %s',
    (name) => expect(isSoftwareRenderer(name)).toBe(false),
  );
});
