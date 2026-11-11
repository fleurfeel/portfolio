import { expect, test } from '@playwright/test';

test.describe('все проекты', () => {
  test('список по умолчанию, переключатель показывает сетку', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Работы');
    const list = page.getByRole('list', { name: 'Проекты списком' });
    const grid = page.getByRole('list', { name: 'Проекты сеткой' });
    await expect(list).toBeVisible();
    await expect(grid).toBeHidden();
    await expect(list.getByRole('link')).toHaveCount(7);

    await page.getByText('Сетка', { exact: true }).click();
    await expect(grid).toBeVisible();
    await expect(list).toBeHidden();
    await expect(grid.getByRole('link')).toHaveCount(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test('десктоп: при наведении строка проявляет обложку, остальные гаснут', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'наведение — на десктопе');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects');
    const rows = page.locator('.work__row');
    const thumb = rows.nth(1).locator('.work__thumb');
    await expect(thumb).toHaveCSS('opacity', '0');
    await rows.nth(1).hover();
    await expect(thumb).toHaveCSS('opacity', '1');
    await expect(page.locator('.work__item').first()).toHaveCSS('opacity', '0.28');
  });

  test('телефон: обложки видны прямо в строках', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'обложки в строках — на телефоне');
    await page.goto('/projects');
    await expect(page.locator('.work__row .work__thumb').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});
