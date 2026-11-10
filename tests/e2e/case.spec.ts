import { expect, test } from '@playwright/test';

test.describe('страница кейса', () => {
  test('CatamaranGo: факты, разделы разбора с экранами и подписями', async ({ page }) => {
    await page.goto('/projects/catamarango');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CatamaranGo');
    await expect(page.locator('.case__facts dt')).toHaveCount(4);

    const sections = page.locator('.case__section');
    await expect(sections).toHaveCount(7);
    await expect(sections.locator('h2').first()).toHaveText('Задача');
    await expect(page.getByRole('heading', { name: 'Подбор шкипера' })).toBeAttached();

    // у каждого экрана есть описание для скринридера
    const shots = page.locator('.case__shot img');
    expect(await shots.count()).toBeGreaterThanOrEqual(12);
    for (const alt of await shots.evaluateAll((els) => els.map((el) => el.getAttribute('alt')))) expect(alt).toBeTruthy();

    // картинки подгружаются, страница не скроллится вбок
    await shots.first().scrollIntoViewIfNeeded();
    await expect.poll(() => shots.first().evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test('кейс без разбора показывает только шапку', async ({ page }) => {
    await page.goto('/projects/lernium');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.case__section')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Следующий проект' })).toBeVisible();
  });
});
