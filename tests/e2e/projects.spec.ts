import { expect, test } from '@playwright/test';

const SLUGS = ['catamarango', 'yufu-pro', 'lernium', 'beslimshop', 'abeona', 'territoriya-resheniy'];

const STEP = 0.6; // src/lib/stage/math.ts → STAGE.step
const TRANSITION = 1.2; // STAGE.transition

test.describe('избранные проекты', () => {
  test('карточки кейсов с обложками ведут на страницы кейсов', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('[data-card] a');
    await expect(cards).toHaveCount(SLUGS.length);
    for (const [i, slug] of SLUGS.entries()) {
      await expect(cards.nth(i)).toHaveAttribute('href', `/projects/${slug}`);
      await expect(cards.nth(i).locator('img')).toHaveCount(1);
    }
  });

  test('скролл листает кейсы и меняет счётчик', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-stage]')?.hasAttribute('data-fx'));
    await page.evaluate(
      ([t, s]) => {
        document.documentElement.style.scrollSnapType = 'none';
        scrollTo(0, (t + s * 3) * innerHeight);
      },
      [TRANSITION, STEP],
    );
    await expect(page.locator('[data-info][data-active] .projects__name')).toBeVisible();
    await expect(page.locator('[data-info][data-active]')).toHaveAttribute('data-info', '3');
  });

  test('«Посмотреть полностью» открывает кейс', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'кнопка только на ноутбуке и десктопе');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-stage]')?.hasAttribute('data-fx'));
    await page.evaluate((t) => {
      document.documentElement.style.scrollSnapType = 'none';
      scrollTo(0, t * innerHeight);
    }, TRANSITION);
    await page.locator('[data-info][data-active] .projects__cta').click();
    await expect(page).toHaveURL(/\/projects\/catamarango$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CatamaranGo');
  });
});
