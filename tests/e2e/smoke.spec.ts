import { expect, test } from '@playwright/test';

// Все страницы сайта. Новые страницы добавлять сюда.
const pages = ['/'];

for (const path of pages) {
  test.describe(`страница ${path}`, () => {
    test('открывается, lang="ru", есть title', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(page).toHaveTitle(/.+/);
    });

    test('нет ошибок в консоли', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('requestfailed', (req) => errors.push(`${req.failure()?.errorText}: ${req.url()}`));

      await page.goto(path, { waitUntil: 'networkidle' });
      expect(errors).toEqual([]);
    });

    test('нет горизонтального скролла на 375px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test('шрифт Jura загружается', async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const faces = await page.evaluate(async () => {
        const loaded = await document.fonts.load('16px Jura', 'Привет, Hello');
        return loaded.map((f) => f.family);
      });
      expect(faces).toContain('Jura');
    });
  });
}
