import { expect, test } from '@playwright/test';

test.describe('как я работаю', () => {
  test('телефон: переключатель показывает одну ветку', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'переключатель только на телефоне');
    await page.goto('/');
    const how = page.locator('[data-how]');
    await expect(how.getByRole('radio', { name: 'для заказчика' })).toBeChecked();
    await expect(how.getByText('Бриф', { exact: true })).toBeVisible();
    await expect(how.getByText('Погружение в продукт')).toBeHidden();

    await how.locator('label[for="how-employer"]').click();
    await expect(how.getByRole('radio', { name: 'для работодателя' })).toBeChecked();
    await expect(how.getByText('Погружение в продукт')).toBeVisible();
    await expect(how.getByText('Бриф', { exact: true })).toBeHidden();
  });

  test('телефон: голова-прогресс держится по центру экрана, линия заполняется по скроллу', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'шкала прогресса — на телефоне');
    await page.goto('/', { waitUntil: 'networkidle' });
    const at = async (f: number) => {
      await page.evaluate((f) => {
        document.documentElement.style.scrollSnapType = 'none';
        const w = document.querySelector('.how__track--client .how__window')!.getBoundingClientRect();
        scrollTo(0, w.top + scrollY + w.height * f - innerHeight / 2);
      }, f);
      return page.evaluate(() => {
        const head = document.querySelector('.how__track--client .how__rail-head')!.getBoundingClientRect();
        const m = new DOMMatrix(getComputedStyle(document.querySelector('.how__track--client .how__rail-fill')!).transform);
        return { headCenter: head.top + head.height / 2, vh: innerHeight, fill: m.d };
      });
    };
    const a = await at(0.3);
    const b = await at(0.7);
    expect(Math.abs(a.headCenter - a.vh / 2)).toBeLessThan(4);
    expect(Math.abs(b.headCenter - b.vh / 2)).toBeLessThan(4);
    expect(b.fill).toBeGreaterThan(a.fill + 0.2);
  });

  test('десктоп: обе ветки рядом, переключателя нет; шаги листаются на закреплённом экране', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'две колонки — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });
    const how = page.locator('[data-how]');
    await expect(how.locator('.how__switch')).toBeHidden();
    await expect(how.getByText('Бриф', { exact: true })).toBeVisible();
    await expect(how.getByText('Погружение в продукт')).toBeVisible();

    // закреплённый экран: прокрутка на 2 шага вперёд — резкий 3-й ряд, первый приглушён, экран стоит на месте
    await page.evaluate(() => {
      document.documentElement.style.scrollSnapType = 'none';
      const top = document.querySelector('.how')!.getBoundingClientRect().top + scrollY;
      scrollTo(0, top + innerHeight * 0.6 * 2);
    });
    const opacity = (i: number) => how.locator('.how__step').nth(i).evaluate((el) => Number(getComputedStyle(el).opacity));
    await expect.poll(() => opacity(2)).toBeGreaterThan(0.9);
    await expect.poll(() => opacity(0)).toBeLessThan(0.5);
    expect(await page.locator('.how__pin').evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0);
  });
});
