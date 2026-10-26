import { expect, test } from '@playwright/test';

/** Прокрутить так, чтобы верх манифеста был на доле f высоты экрана от низа (0 — только показался, 1 — встал наверх). */
async function scrollManifesto(page: import('@playwright/test').Page, f: number) {
  await page.evaluate((f) => {
    document.documentElement.style.scrollSnapType = 'none';
    const top = document.querySelector('.manifesto')!.getBoundingClientRect().top + scrollY;
    scrollTo(0, top - innerHeight * (1 - f));
  }, f);
}

test.describe('манифест', () => {
  test('слова проявляются по мере въезда секции (проверка на продакшен-сборке)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });
    const words = page.locator('.manifesto__word');
    await expect(page.locator('section.manifesto')).toContainText('а не просто красивее.');

    await scrollManifesto(page, 0.3);
    // последнее слово ещё не перевернулось
    await expect.poll(() => words.last().evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.5);

    await scrollManifesto(page, 1);
    await expect(words.last()).toHaveCSS('opacity', '1');
  });

  test('prefers-reduced-motion: текст виден сразу', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await scrollManifesto(page, 0.3);
    await expect(page.locator('.manifesto__word').last()).toHaveCSS('opacity', '1');
  });
});
