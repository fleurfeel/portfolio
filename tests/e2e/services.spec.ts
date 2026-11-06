import { expect, test } from '@playwright/test';

/** Прокрутить так, чтобы верх первой строки был на доле f высоты экрана сверху. */
async function scrollRow(page: import('@playwright/test').Page, f: number) {
  await page.evaluate(async (f) => {
    document.documentElement.style.scrollSnapType = 'none';
    const r = document.querySelector('.services__row')!.getBoundingClientRect();
    scrollTo(0, r.top + scrollY - innerHeight * f);
    // анимация по скроллу обновляется со следующим кадром
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, f);
}

/** Сдвиг первого тега: none или единичная матрица — тег на своём месте. */
const firstTagTransform = (page: import('@playwright/test').Page) =>
  page
    .locator('.services__tag')
    .first()
    .evaluate((el) => {
      const t = getComputedStyle(el).transform;
      return t === 'matrix(1, 0, 0, 1, 0, 0)' ? 'none' : t;
    });

test.describe('услуги и стоимость', () => {
  test('четыре услуги с ценой и сроком, ссылка «Услуги» ведёт сюда', async ({ page }) => {
    await page.goto('/');
    const services = page.locator('#services');
    await expect(services.getByRole('heading', { level: 2 })).toHaveText('Услуги и стоимость');
    await expect(services.locator('.services__row')).toHaveCount(4);
    await expect(services.getByText('от 50.000 рублей')).toBeAttached();
    await expect(services.getByText('после обсуждения')).toBeAttached();
    await expect(page.locator('a[href="#services"]').first()).toBeAttached();
  });

  test('у каждой услуги теги, описание, срок, цена и кнопка', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('.services__row');
    for (let i = 0; i < 4; i++) {
      const row = rows.nth(i);
      expect(await row.locator('.services__tag').count()).toBeGreaterThanOrEqual(3);
      await expect(row.locator('.services__text')).not.toBeEmpty();
      await expect(row.locator('.services__term')).toContainText('Срок');
      await expect(row.getByRole('button', { name: 'Оставить заявку', exact: true })).toBeAttached();
    }
  });

  test('десктоп: название, теги и цена идут тремя колонками, описание под тегами', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'три колонки — на ноутбуке и десктопе');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const box = (s: string) => page.locator('.services__row').first().locator(s).boundingBox();
    const [name, tags, text, side] = await Promise.all(['.services__name-wrap', '.services__tags', '.services__text', '.services__side'].map(box));
    expect(tags!.x).toBeGreaterThan(name!.x + name!.width);
    expect(side!.x).toBeGreaterThan(text!.x + text!.width);
    expect(text!.x).toBe(tags!.x);
    expect(text!.y).toBeGreaterThan(tags!.y + tags!.height);
  });

  test('теги раздаются по скроллу и встают на места', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'networkidle' });

    await scrollRow(page, 0.98);
    expect(await firstTagTransform(page)).not.toBe('none');

    await scrollRow(page, 0.3);
    expect(await firstTagTransform(page)).toBe('none');
  });

  test('телефон: строки в один столбец, страница не скроллится по горизонтали', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'один столбец — на телефоне');
    await page.goto('/');
    const row = page.locator('.services__row').first();
    const tags = await row.locator('.services__tags').boundingBox();
    const text = await row.locator('.services__text').boundingBox();
    const side = await row.locator('.services__side').boundingBox();
    expect(text!.y).toBeGreaterThan(tags!.y);
    expect(side!.y).toBeGreaterThan(text!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('prefers-reduced-motion: всё сразу на местах', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await scrollRow(page, 0.98);
    expect(await firstTagTransform(page)).toBe('none');
  });

  test('кнопка в строке открывает заявку с выбранной услугой; заявка уходит на /api/lead', async ({ page }) => {
    let sent: Record<string, string> | null = null;
    await page.route('**/api/lead', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const row = page.locator('.services__row').first();
    // остров формы подключается в простое браузера — ждём, пока кнопка начнёт открывать окно
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await row.getByRole('button', { name: 'Оставить заявку' }).click();
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
      await page.locator('.services__row').last().getByRole('button', { name: 'Оставить заявку' }).click();
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
