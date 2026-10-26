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
