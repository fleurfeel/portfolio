import { expect, test } from '@playwright/test';

/** Прокрутить так, чтобы верх сетки карточек был на доле f высоты экрана сверху. */
async function scrollGrid(page: import('@playwright/test').Page, f: number) {
  await page.evaluate(async (f) => {
    document.documentElement.style.scrollSnapType = 'none';
    const g = document.querySelector('.services__grid')!.getBoundingClientRect();
    scrollTo(0, g.top + scrollY - innerHeight * f);
    // анимация по скроллу обновляется со следующим кадром
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, f);
}

/** Сдвиг первой карточки: none или единичная матрица — карточка на своём месте. */
const firstCardTransform = (page: import('@playwright/test').Page) =>
  page
    .locator('.services__card')
    .first()
    .evaluate((el) => {
      const t = getComputedStyle(el).transform;
      return t === 'matrix(1, 0, 0, 1, 0, 0)' ? 'none' : t;
    });

test.describe('услуги и стоимость', () => {
  test('четыре карточки с ценой и сроком, ссылка «Услуги» ведёт сюда', async ({ page }) => {
    await page.goto('/');
    const services = page.locator('#services');
    await expect(services.getByRole('heading', { level: 2 })).toHaveText('Услуги и стоимость');
    await expect(services.locator('.services__card')).toHaveCount(4);
    await expect(services.getByText('от 50.000 рублей')).toBeAttached();
    await expect(services.getByText('после обсуждения')).toBeAttached();
    await expect(page.locator('a[href="#services"]').first()).toBeAttached();
  });

  test('десктоп: карточки раздаются из колоды по скроллу и встают в один ряд', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'раздача — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });

    await scrollGrid(page, 0.8);
    expect(await firstCardTransform(page)).not.toBe('none');

    await scrollGrid(page, 0.2);
    expect(await firstCardTransform(page)).toBe('none');
    const tops = await page.locator('.services__card').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test('телефон: карточки листаются вбок, страница не скроллится по горизонтали', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'карусель — на телефоне');
    await page.goto('/');
    const grid = page.locator('.services__grid');
    const { scroll, client, snap } = await grid.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
      snap: getComputedStyle(el).scrollSnapType,
    }));
    expect(scroll).toBeGreaterThan(client * 2);
    expect(snap).toContain('x');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('prefers-reduced-motion: карточки сразу на местах', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'раздача — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await scrollGrid(page, 0.8);
    expect(await firstCardTransform(page)).toBe('none');
  });
});
