import { expect, test } from '@playwright/test';

test.describe('манифест', () => {
  test('когда секция встала на экран, весь текст виден', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const section = page.locator('section.manifesto');
    await expect(section).toContainText('а не просто красивее.');
    await page.evaluate(() => {
      document.documentElement.style.scrollSnapType = 'none';
      const top = document.querySelector('.manifesto')!.getBoundingClientRect().top + scrollY;
      scrollTo(0, top);
    });
    await expect(section.locator('.manifesto__word').last()).toHaveCSS('opacity', '1');
  });
});
