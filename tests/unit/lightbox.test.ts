import { describe, expect, it } from 'vitest';
import { flipFrom, largestSource, lightboxLayout } from '../../src/lib/case/lightbox';

describe('largestSource', () => {
  it('берёт самый широкий вариант из srcset', () => {
    expect(largestSource('/a-400.webp 400w, /a-1440.webp 1440w, /a-1000.webp 1000w', '/a.webp')).toBe('/a-1440.webp');
  });

  it('без srcset — исходный адрес', () => {
    expect(largestSource('', '/a.webp')).toBe('/a.webp');
  });
});

describe('lightboxLayout', () => {
  const viewport = { width: 1440, height: 900 };

  it('широкий экран вписывается целиком и стоит по центру', () => {
    const l = lightboxLayout({ width: 1440, height: 821 }, viewport, 32);
    expect(l.mode).toBe('fit');
    // упирается в ширину окна за вычетом полей
    expect(l.width).toBeCloseTo(1376, 5);
    expect(l.height).toBeCloseTo(821 * (1376 / 1440), 5);
    expect(l.left).toBeCloseTo(32, 5);
    expect(l.top).toBeCloseTo((900 - l.height) / 2, 5);
  });

  it('не увеличивает мелкий блок больше его размера в макете', () => {
    const l = lightboxLayout({ width: 490, height: 487 }, viewport, 32);
    expect(l.width).toBe(490);
    expect(l.height).toBe(487);
    expect(l.top).toBeCloseTo((900 - 487) / 2, 5);
  });

  it('длинная страница — по ширине, листается вниз от верхнего края', () => {
    const l = lightboxLayout({ width: 1440, height: 11050 }, viewport, 32);
    expect(l.mode).toBe('scroll');
    expect(l.width).toBe(1440 - 64);
    expect(l.height).toBeCloseTo(11050 * ((1440 - 64) / 1440), 5);
    expect(l.top).toBe(32);
    expect(l.left).toBe(32);
  });

  it('на телефоне длинная страница — во всю ширину экрана', () => {
    const l = lightboxLayout({ width: 1440, height: 5405 }, { width: 375, height: 812 }, 0);
    expect(l.mode).toBe('scroll');
    expect(l.width).toBe(375);
    expect(l.left).toBe(0);
  });
});

describe('flipFrom', () => {
  it('сдвиг и масштаб, которые ставят картинку из итоговой рамки обратно на миниатюру', () => {
    const t = flipFrom({ left: 100, top: 200, width: 300, height: 150 }, { left: 0, top: 0, width: 1200, height: 600 });
    expect(t.scale).toBeCloseTo(0.25, 5);
    expect(t.x).toBe(100);
    expect(t.y).toBe(200);
  });
});
