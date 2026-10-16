import { expect, test } from '@playwright/test';

test.describe('первый экран', () => {
  test('постер маскота виден сразу, логотипы поверх него', async ({ page }) => {
    await page.goto('/');
    const poster = page.locator('[data-mascot-poster="hero"]');
    await expect(poster).toBeVisible();
    expect(await poster.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\.(avif|webp)/);
  });

  test('h1 содержит имя и роль', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Пашковский Руслан\s*—\s*Продуктовый\s*дизайнер/i);
  });

  test('мобильное меню открывается и закрывается по ссылке', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'бургер только на мобильной раскладке');
    await page.goto('/', { waitUntil: 'networkidle' });
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Меню' }).click();
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: 'Обо мне' }).click();
    await expect(menu).toBeHidden();
  });

  test('на десктопе навигация и «Связаться со мной» видны, бургера нет', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'только десктоп');
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Связаться со мной' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Меню' })).toBeHidden();
  });
});
