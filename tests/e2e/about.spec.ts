import { expect, test } from '@playwright/test';

test.describe('обо мне', () => {
  test('есть заголовок, образование, 4 места работы и ссылка на резюме', async ({ page }) => {
    await page.goto('/');
    const about = page.locator('section[aria-labelledby="about-title"]');
    await expect(about.getByRole('heading', { level: 2 })).toHaveText(/Обо мне/i);
    await expect(about.locator('.about__edu-item')).toHaveCount(3);
    await expect(about.locator('.about__job')).toHaveCount(4);
    await expect(about.locator('.about__cta')).toHaveAttribute('href', '/resume.pdf');
  });

  test('резюме отдаётся как PDF', async ({ request }) => {
    const res = await request.get('/resume.pdf');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  });

  test('пункт меню «Обо мне» ведёт к секции и она видна', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'на мобильном пункт в бургер-меню');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-stage]')?.hasAttribute('data-fx'));
    await page.evaluate(() => (document.documentElement.style.scrollSnapType = 'none'));
    await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Обо мне' }).click();
    await expect(page.locator('[data-layer="about"]')).toHaveCSS('opacity', '1', { timeout: 10_000 });
  });
});
