import { expect, test } from '@playwright/test';

/** Прокрутить так, чтобы верх сетки карточек был на доле f высоты экрана сверху. */
async function scrollGrid(page: import('@playwright/test').Page, f: number) {
  await page.evaluate(async (f) => {
    document.documentElement.style.scrollSnapType = 'none';
    const g = document.querySelector('.services__grid')!.getBoundingClientRect();
    scrollTo(0, g.top + scrollY - innerHeight * f);
    // анимация по скроллу обновляется со следующим кадром
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, f);
}

/** Сдвиг первой карточки: none или единичная матрица — карточка на своём месте. */
const firstCardTransform = (page: import('@playwright/test').Page) =>
  page
    .locator('.services__card')
    .first()
    .evaluate((el) => {
      const t = getComputedStyle(el).transform;
      return t === 'matrix(1, 0, 0, 1, 0, 0)' ? 'none' : t;
    });

test.describe('услуги и стоимость', () => {
  test('четыре карточки с ценой и сроком, ссылка «Услуги» ведёт сюда', async ({ page }) => {
    await page.goto('/');
    const services = page.locator('#services');
    await expect(services.getByRole('heading', { level: 2 })).toHaveText('Услуги и стоимость');
    await expect(services.locator('.services__card')).toHaveCount(4);
    await expect(services.getByText('от 50.000 рублей')).toBeAttached();
    await expect(services.getByText('после обсуждения')).toBeAttached();
    await expect(page.locator('a[href="#services"]').first()).toBeAttached();
  });

  test('десктоп: карточки раздаются из колоды по скроллу и встают в один ряд', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'раздача — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });

    await scrollGrid(page, 0.8);
    expect(await firstCardTransform(page)).not.toBe('none');

    await scrollGrid(page, 0.2);
    expect(await firstCardTransform(page)).toBe('none');
    const tops = await page.locator('.services__card').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test('телефон: карточки листаются вбок, страница не скроллится по горизонтали', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'карусель — на телефоне');
    await page.goto('/');
    const grid = page.locator('.services__grid');
    const { scroll, client, snap } = await grid.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
      snap: getComputedStyle(el).scrollSnapType,
    }));
    expect(scroll).toBeGreaterThan(client * 2);
    expect(snap).toContain('x');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('prefers-reduced-motion: карточки сразу на местах', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'раздача — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await scrollGrid(page, 0.8);
    expect(await firstCardTransform(page)).toBe('none');
  });

  test('кнопка в карточке открывает заявку с выбранной услугой; заявка уходит на /api/lead', async ({ page }) => {
    let sent: Record<string, string> | null = null;
    await page.route('**/api/lead', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const card = page.locator('.services__card').first();
    // остров формы подключается в простое браузера — ждём, пока кнопка начнёт открывать окно
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await card.getByRole('button', { name: 'Оставить заявку' }).click();
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(dialog.getByLabel('Услуга')).toHaveValue('Лендинг');

    // пусто — подсказки у полей, на сервер ничего не уходит
    await dialog.getByRole('button', { name: 'Отправить' }).click();
    await expect(dialog.getByText('Напишите, как к вам обращаться')).toBeVisible();
    expect(sent).toBeNull();

    await dialog.getByLabel('Имя').fill('Анна');
    await dialog.getByLabel('Как с вами связаться').fill('@anna');
    // без галочки согласия на обработку данных заявка не уходит
    await dialog.getByRole('button', { name: 'Отправить' }).click();
    await expect(dialog.getByText('Без согласия не смогу принять заявку')).toBeVisible();
    expect(sent).toBeNull();

    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Отправить' }).click();
    await expect(dialog.getByText('Заявка отправлена')).toBeVisible();
    expect(sent).toMatchObject({ service: 'Лендинг', name: 'Анна', contact: '@anna', consent: true });

    await dialog.getByRole('button', { name: 'Хорошо' }).click();
    await expect(dialog).toBeHidden();
  });

  test('сервер не ответил — сообщение об ошибке, данные в форме остаются', async ({ page }) => {
    await page.route('**/api/lead', (route) => route.fulfill({ status: 502, json: { ok: false } }));
    await page.goto('/', { waitUntil: 'networkidle' });
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await page.locator('.services__card').last().getByRole('button', { name: 'Оставить заявку' }).click();
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await dialog.getByLabel('Имя').fill('Анна');
    await dialog.getByLabel('Как с вами связаться').fill('+7 900 000-00-00');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Отправить' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Не получилось отправить');
    await expect(dialog.getByLabel('Имя')).toHaveValue('Анна');
  });
});
