import { expect, test } from '@playwright/test';

test.describe('страница кейса', () => {
  test('CatamaranGo: факты, разделы разбора с экранами и подписями', async ({ page }) => {
    await page.goto('/projects/catamarango');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CatamaranGo');
    await expect(page.locator('.case__facts dt')).toHaveCount(4);

    const sections = page.locator('.case__section');
    await expect(sections).toHaveCount(9);
    await expect(sections.locator('h2').first()).toHaveText('Задача');
    await expect(page.getByRole('heading', { name: 'Подбор шкипера' })).toBeAttached();

    // у каждого экрана есть описание для скринридера
    const shots = page.locator('.case__shot img');
    expect(await shots.count()).toBeGreaterThanOrEqual(20);

    // экраны показываются целиком: рамка не обрезает картинку и не растягивает её крупнее макета
    const fits = await page.locator('.case__shot').evaluateAll((els) =>
      els.map((el) => {
        const img = el.querySelector('img')!;
        const frame = el.querySelector('.case__shot-frame')!;
        const style = getComputedStyle(img);
        return style.objectFit !== 'cover' && Math.abs(frame.scrollHeight - img.clientHeight) <= 1 && img.clientWidth <= parseFloat(getComputedStyle(el).getPropertyValue('--natural')) + 1;
      }),
    );
    expect(fits.every(Boolean)).toBe(true);
    for (const alt of await shots.evaluateAll((els) => els.map((el) => el.getAttribute('alt')))) expect(alt).toBeTruthy();

    // картинки подгружаются, страница не скроллится вбок
    await shots.first().scrollIntoViewIfNeeded();
    await expect.poll(() => shots.first().evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test('«Территория решений»: разбор из восьми разделов с экранами', async ({ page }) => {
    await page.goto('/projects/territoriya-resheniy');
    await expect(page.locator('.case__section')).toHaveCount(8);
    await expect(page.getByRole('heading', { name: 'Визуальный язык' })).toBeAttached();
    expect(await page.locator('.case__shot img').count()).toBeGreaterThanOrEqual(9);
  });

  test('Abeona: разбор из девяти разделов с экранами', async ({ page }) => {
    await page.goto('/projects/abeona');
    await expect(page.locator('.case__section')).toHaveCount(9);
    await expect(page.getByRole('heading', { name: 'Карта навыков' })).toBeAttached();
    expect(await page.locator('.case__shot img').count()).toBe(10);
  });

  test('BeSlimShop: разбор из восьми разделов, мобильные экраны листаются в рамке', async ({ page }) => {
    await page.goto('/projects/beslimshop');
    await expect(page.locator('.case__section')).toHaveCount(8);
    await expect(page.getByRole('heading', { name: 'Доверие' })).toBeAttached();
    const phone = page.locator('.case__media--phones .case__shot-frame').first();
    const { scroll, client } = await phone.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(scroll).toBeGreaterThan(client);
  });

  test('кейс без разбора показывает только шапку', async ({ page }) => {
    await page.goto('/projects/lernium');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.case__section')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Следующий проект' })).toBeVisible();
  });
});
