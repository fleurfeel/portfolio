import { expect, test } from '@playwright/test';

test.describe('прелоадер', () => {
  test('виден сразу и уходит, после этого страница скроллится', async ({ page }) => {
    await page.goto('/');
    const preloader = page.locator('[data-preloader]');
    await expect(preloader).toHaveAttribute('role', 'progressbar');
    // в headless без аппаратного WebGL 3D не грузится — прелоадер сразу открывает страницу с постером
    await expect(preloader).toBeHidden({ timeout: 20_000 });
    await expect(preloader).toHaveAttribute('aria-valuenow', '100');
    const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    expect(overflow).not.toBe('hidden');
    await expect(page.locator('[data-mascot-poster="hero"]')).toBeVisible();
  });

  test('без JS прелоадера нет', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await ctx.close();
  });
});
