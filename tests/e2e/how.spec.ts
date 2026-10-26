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

  test('десктоп: обе ветки рядом, переключателя нет; ряд вдали от центра приглушён', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'две колонки — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });
    const how = page.locator('[data-how]');
    await expect(how.locator('.how__switch')).toBeHidden();
    await expect(how.getByText('Бриф', { exact: true })).toBeVisible();
    await expect(how.getByText('Погружение в продукт')).toBeVisible();

    // первый ряд в центре экрана — резкий, последний (ниже экрана) — приглушён
    await page.evaluate(() => {
      document.documentElement.style.scrollSnapType = 'none';
      const step = document.querySelector('.how__step')!;
      const r = step.getBoundingClientRect();
      scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2);
    });
    const opacity = (i: number) => how.locator('.how__step').nth(i).evaluate((el) => Number(getComputedStyle(el).opacity));
    await expect.poll(() => opacity(0)).toBeGreaterThan(0.9);
    await expect.poll(() => opacity(4)).toBeLessThan(0.5);
  });
});
