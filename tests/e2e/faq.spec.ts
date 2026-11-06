import { expect, test } from '@playwright/test';

test.describe('частые вопросы', () => {
  test('пять вопросов, открыт первый; открытие другого закрывает предыдущий', async ({ page }) => {
    await page.goto('/');
    const faq = page.locator('#faq');
    await expect(faq.getByRole('heading', { level: 2 })).toHaveText('Частые вопросы');
    const items = faq.locator('details');
    await expect(items).toHaveCount(5);
    await expect(items.first()).toHaveAttribute('open', '');
    await expect(faq.getByText('Предоплата 50%')).toBeVisible();

    await faq.getByText('Сколько правок входит в стоимость?').click();
    await expect(items.nth(1)).toHaveAttribute('open', '');
    await expect(items.first()).not.toHaveAttribute('open', '');
    await expect(faq.getByText('Предоплата 50%')).toBeHidden();
  });

  test('«Задать вопрос» открывает форму заявки', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await page.locator('#faq').getByRole('button', { name: 'Задать вопрос' }).click();
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(dialog.getByLabel('Услуга')).toHaveValue('');
  });

  test('ответ разъезжается плавно, а не рывком', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const item = page.locator('#faq details').nth(1);
    const closed = await item.evaluate((el) => el.getBoundingClientRect().height);
    // записываем высоту каждый кадр: под нагрузкой одна проба в фиксированный момент может попасть в начало перехода
    const heights = await item.evaluate(async (el) => {
      el.querySelector('summary')!.click();
      const seen: number[] = [];
      const start = performance.now();
      while (performance.now() - start < 900) {
        seen.push(el.getBoundingClientRect().height);
        await new Promise((r) => requestAnimationFrame(r));
      }
      return seen;
    });
    const end = heights.at(-1)!;
    expect(end).toBeGreaterThan(closed + 30);
    expect(heights.some((h) => h > closed + 5 && h < end - 5)).toBe(true);
  });
});
