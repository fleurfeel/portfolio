import { expect, test } from '@playwright/test';

test.describe('футер и документы', () => {
  test('копирайт и ссылки на документы; документы открываются', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toContainText('© 2026 Пашковский Руслан');

    await footer.getByRole('link', { name: 'Политика обработки персональных данных' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Политика обработки персональных данных');
    await expect(page.getByText('fleurfeel7@gmail.com').first()).toBeVisible();

    await page.getByRole('link', { name: /Согласие на обработку персональных данных/ }).first().click();
    await expect(page).toHaveURL(/\/consent$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Согласие на обработку персональных данных');
  });
});
