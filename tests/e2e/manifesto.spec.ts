import { expect, test } from '@playwright/test';

/** Прокрутить так, чтобы верх манифеста был на доле f высоты экрана от низа (0 — только показался, 1 — встал наверх). */
async function scrollManifesto(page: import('@playwright/test').Page, f: number) {
  await page.evaluate((f) => {
    document.documentElement.style.scrollSnapType = 'none';
    const top = document.querySelector('.manifesto')!.getBoundingClientRect().top + scrollY;
    scrollTo(0, top - innerHeight * (1 - f));
  }, f);
}

const lastWordOpacity = (page: import('@playwright/test').Page) =>
  page.locator('.manifesto__word').last().evaluate((el) => Number(getComputedStyle(el).opacity));

test.describe('манифест', () => {
  test('слова переворачиваются, когда секция поднялась на треть экрана, и проигрываются снова', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-manifesto]')?.hasAttribute('data-reveal'));
    await expect(page.locator('section.manifesto')).toContainText('а не просто красивее.');

    await scrollManifesto(page, 0.15);
    await expect(page.locator('[data-manifesto]')).toHaveAttribute('data-reveal', '');
    expect(await lastWordOpacity(page)).toBe(0);

    await scrollManifesto(page, 0.6);
    await expect(page.locator('[data-manifesto]')).toHaveAttribute('data-reveal', 'in');
    await expect.poll(() => lastWordOpacity(page), { timeout: 5000 }).toBe(1);

    // назад за экран — сброс, чтобы при следующем заходе сыграть снова
    await scrollManifesto(page, -0.2);
    await expect(page.locator('[data-manifesto]')).toHaveAttribute('data-reveal', '');
  });

  test('prefers-reduced-motion: текст виден сразу', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await scrollManifesto(page, 0.15);
    await expect(page.locator('.manifesto__word').last()).toHaveCSS('opacity', '1');
  });
});
