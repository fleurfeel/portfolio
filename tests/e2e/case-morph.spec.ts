import { expect, test, type Page } from '@playwright/test';

// Морф «карточка → шапка кейса»: нативный переход между страницами (View Transitions).
// На новой странице записываем, был ли переход и какие слои в нём анимировались.
async function recordTransition(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt?: Promise<string[] | null> };
    w.__vt = new Promise((resolve) => {
      addEventListener('pagereveal', (e) => {
        const vt = (e as unknown as { viewTransition: { ready: Promise<void> } | null }).viewTransition;
        if (!vt) return resolve(null);
        const layers = () => document.getAnimations().map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? '');
        vt.ready.then(() => resolve(layers()), () => resolve(null));
      });
    });
  });
}
/** Слои перехода на только что открытой странице; null — перехода не было. */
const transition = (page: Page) => page.evaluate(() => (window as unknown as { __vt: Promise<string[] | null> }).__vt);

test.describe('морф карточки кейса в шапку', () => {
  // под нагрузкой (все тесты идут параллельно) браузер иногда пропускает переход — это его право, даём повторы
  test.describe.configure({ retries: 2 });

  // в мобильной эмуляции Playwright размер окна новой страницы на первом кадре другой, и браузер пропускает переход
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'переход между страницами проверяем на десктопе');
  });

  test('главная: обложка нажатой карточки переезжает в шапку кейса, остальные карточки без имени', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordTransition(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-stage]')?.hasAttribute('data-fx'));
    await page.evaluate(() => {
      document.documentElement.style.scrollSnapType = 'none';
      scrollTo(0, innerHeight * 1.2);
    });
    // до нажатия имён нет: иначе карточки мелькали бы при любом уходе с главной
    expect(await page.locator('[data-cover]').evaluateAll((els) => els.filter((el) => (el as HTMLElement).style.viewTransitionName).length)).toBe(0);

    await page.locator('[data-card="0"] a').click();
    await page.waitForURL('**/projects/catamarango');
    const layers = (await transition(page)) ?? [];
    expect(layers).toContain('::view-transition-old(case-catamarango)');
    expect(layers).toContain('::view-transition-new(case-catamarango)');
    expect(layers.filter((l) => l.includes('(case-') && !l.includes('catamarango'))).toEqual([]);
  });

  test('кнопка «Посмотреть полностью» морфит обложку активного кейса', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordTransition(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-stage]')?.hasAttribute('data-fx'));
    await page.evaluate(() => {
      document.documentElement.style.scrollSnapType = 'none';
      scrollTo(0, innerHeight * 1.2);
    });
    await page.locator('[data-info][data-active] .projects__cta').click();
    await page.waitForURL('**/projects/catamarango');
    expect(await transition(page)).toContain('::view-transition-old(case-catamarango)');
  });

  test('все проекты: карточка вырастает в шапку и сворачивается обратно', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordTransition(page);
    await page.goto('/projects');
    await page.locator('a[href="/projects/lernium"]').click();
    await page.waitForURL('**/projects/lernium');
    let layers = await transition(page);
    expect(layers).toContain('::view-transition-old(case-lernium)');
    expect(layers).toContain('::view-transition-new(case-lernium)');

    // ждём конца первого перехода: новый во время идущего браузер пропускает
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: 'Все проекты' }).click();
    await page.waitForURL('**/projects');
    layers = await transition(page);
    expect(layers).toContain('::view-transition-old(case-lernium)');
    expect(layers).toContain('::view-transition-new(case-lernium)');
  });

  test('prefers-reduced-motion: обычный переход без анимации', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordTransition(page);
    await page.goto('/projects');
    await page.locator('a[href="/projects/lernium"]').click();
    await page.waitForURL('**/projects/lernium');
    expect(await transition(page)).toBeNull();
  });
});
