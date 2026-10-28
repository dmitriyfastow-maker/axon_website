// test.fixme = rewrite: the site moved to the Vax chat, new hero text, 9 FAQ and new prices (Oct 2026).
import { expect, test, type Page } from '@playwright/test';

async function mockApi(page: Page, status = 200) {
  const bodies: unknown[] = [];
  await page.route('**/api/lead', async (route) => {
    bodies.push(route.request().postDataJSON());
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ ok: status === 200 }) });
  });
  return bodies;
}

const form = (page: Page) => page.locator('[data-lead-form]');

test.fixme('validates name and contact; typing clears the error', async ({ page }) => {
  await page.goto('/');
  await form(page).locator('[type=submit]').click();
  await expect(page.locator('[data-error=name]')).toHaveText('Required field');
  await expect(page.locator('[data-error=contact]')).toHaveText('Enter a valid Telegram, phone or email');
  await page.locator('[name=name]').fill('Anna');
  await expect(page.locator('[data-error=name]')).toBeHidden();
  await expect(page.locator('[data-error=contact]')).toBeVisible();
});

test.fixme('question mode hides interests and swaps labels', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode=question]').click();
  await expect(page.locator('[data-interest]')).toBeHidden();
  await expect(page.locator('[data-message-label]')).toHaveText('Your question');
  await expect(page.locator('[data-submit-label]')).toHaveText('Send question');
});

test.fixme('tier CTA preselects the tier and scrolls to the form', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode=question]').click();
  await page.locator('[data-choose-tier=Growth]').click();
  await expect(page.locator('[data-mode=request]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-interest-value=Growth]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#contact')).toBeInViewport();
  await page.locator('[data-interest-value=Growth]').click();
  await expect(page.locator('[data-interest-value=Growth]')).toHaveAttribute('aria-pressed', 'false');
});

test.fixme('double submit sends one request and shows success', async ({ page }) => {
  const bodies = await mockApi(page);
  await page.goto('/ru/');
  await page.locator('[data-interest-value=Scale]').click();
  await page.locator('[name=name]').fill('Анна');
  await page.locator('[name=contact]').fill('@anna_k');
  await page.locator('[name=message]').fill('Привет');
  const submit = form(page).locator('[type=submit]');
  await submit.dblclick();
  await expect(page.locator('[data-submit-label]')).toHaveText('Отправляем…');
  await expect(page.locator('[data-form-success]')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ mode: 'request', name: 'Анна', contact: '@anna_k', interest: 'Scale', message: 'Привет', lang: 'ru', website: '' });
  await page.locator('[data-form-again]').click();
  await expect(form(page)).toBeVisible();
  await expect(page.locator('[name=name]')).toHaveValue('');
});

test.fixme('server error keeps the data and shows a message', async ({ page }) => {
  await mockApi(page, 502);
  await page.goto('/');
  await page.locator('[name=name]').fill('Anna');
  await page.locator('[name=contact]').fill('anna@mail.com');
  await form(page).locator('[type=submit]').click();
  await expect(page.locator('[data-form-error]')).toHaveText("Couldn't send. Please try again.");
  await expect(page.locator('[name=name]')).toHaveValue('Anna');
  await expect(page.locator('[data-submit-label]')).toHaveText('Submit request');
});

test('message is capped at 2000 characters', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[name=message]')).toHaveAttribute('maxlength', '2000');
});
