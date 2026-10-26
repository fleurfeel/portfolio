import { expect, test } from '@playwright/test';

test.describe('частые вопросы', () => {
  test('пять вопросов, открыт первый; открытие другого закрывает предыдущий', async ({ page }) => {
    await page.goto('/');
    const faq = page.locator('#faq');
    await expect(faq.getByRole('heading', { level: 2 })).toHaveText('Частые вопросы');
    const items = faq.locator('details');
    await expect(items).toHaveCount(5);
    await expect(items.first()).toHaveAttribute('open', '');
    await expect(faq.getByText('Предоплата 50%')).toBeVisible();

    await faq.getByText('Сколько правок входит в стоимость?').click();
    await expect(items.nth(1)).toHaveAttribute('open', '');
    await expect(items.first()).not.toHaveAttribute('open', '');
    await expect(faq.getByText('Предоплата 50%')).toBeHidden();
  });

  test('«Задать вопрос» открывает форму заявки', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await page.locator('#faq').getByRole('button', { name: 'Задать вопрос' }).click();
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(dialog.getByLabel('Услуга')).toHaveValue('');
  });
});
