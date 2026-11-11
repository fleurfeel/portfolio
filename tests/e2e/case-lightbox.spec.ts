import { expect, test } from '@playwright/test';

test.describe('просмотр экранов кейса во весь экран', () => {
  test('экран открывается по нажатию, стрелки листают, Esc закрывает и возвращает фокус', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects/territoriya-resheniy', { waitUntil: 'networkidle' });
    const shots = page.locator('[data-zoom]');
    const total = await shots.count();
    expect(total).toBeGreaterThan(3);

    const dialog = page.getByRole('dialog', { name: 'Просмотр экрана' });
    // остров подключается в простое браузера — ждём, пока нажатие начнёт открывать просмотр
    await expect(async () => {
      await shots.nth(1).click();
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(dialog.locator('.lightbox__count')).toHaveText(`2 / ${total}`);
    const img = dialog.locator('.lightbox__img');
    await expect(img).toHaveAttribute('alt', (await shots.nth(1).locator('img').getAttribute('alt'))!);

    // страница под просмотром не прокручивается
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');

    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('.lightbox__count')).toHaveText(`3 / ${total}`);
    await dialog.getByRole('button', { name: 'Предыдущий экран' }).click();
    await expect(dialog.locator('.lightbox__count')).toHaveText(`2 / ${total}`);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    await expect(shots.nth(1)).toBeFocused();
  });

  test('длинная страница открывается по ширине окна и листается', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects/territoriya-resheniy', { waitUntil: 'networkidle' });
    const longShot = page.getByRole('button', { name: /десктопная версия/ });
    const dialog = page.getByRole('dialog', { name: 'Просмотр экрана' });
    await expect(async () => {
      await longShot.click();
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    const stage = dialog.locator('.lightbox__stage');
    const { scroll, client } = await stage.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(scroll).toBeGreaterThan(client * 3);
    // крестик закрывает
    await dialog.getByRole('button', { name: 'Закрыть' }).click();
    await expect(dialog).toBeHidden();
  });
});
