import { expect, test } from '@playwright/test';

const expanded = (loc: import('@playwright/test').Locator) => loc.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-expanded')));

test('FAQ is exclusive and starts with the first answer open', async ({ page }) => {
  await page.goto('/');
  const btns = page.locator('[data-acc-group="faq"] [data-acc-btn]');
  expect(await expanded(btns)).toEqual(['true', 'false', 'false', 'false', 'false']);
  await expect(page.locator('#faq-panel-0')).toBeVisible();
  await btns.nth(1).click();
  expect(await expanded(btns)).toEqual(['false', 'true', 'false', 'false', 'false']);
  await expect(page.locator('#faq-panel-0')).toBeHidden();
  await btns.nth(1).click();
  await expect(page.locator('#faq-panel-1')).toBeHidden();
});

test('services: Web Development open by default with design prices', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#svc-panel-2')).toBeVisible();
  await expect(page.locator('#svc-panel-2 .p')).toHaveText(['$1,000 – $5,000', '$2,000 – $10,000', '$3,000 – $20,000', 'Custom quote']);
  await expect(page.locator('#svc-panel-0')).toBeHidden();
});

test('tier details open independently; hero card opens its tier', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-tier-btn="0"]').click();
  await page.locator('[data-tier-btn="1"]').click();
  await expect(page.locator('#tier-panel-0')).toBeVisible();
  await expect(page.locator('#tier-panel-1')).toBeVisible();
  await page.locator('[data-hero-tier="2"]').click();
  await expect(page.locator('#tier-panel-2')).toBeVisible();
});

test('case filter shows matching tiers and closes an open case', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('[data-case-tier]');
  await page.locator('#cases [data-acc-btn]').first().click();
  await expect(page.locator('#case-panel-0')).toBeVisible();
  await page.locator('[data-case-filter="2"]').click();
  await expect(cards.locator('visible=true')).toHaveCount(4);
  await expect(page.locator('#case-panel-0')).toBeHidden();
  await page.locator('[data-case-filter="1"]').click();
  await expect(cards.locator('visible=true')).toHaveCount(3);
  await expect(page.locator('[data-case-filter="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-case-filter="-1"]').click();
  await expect(cards.locator('visible=true')).toHaveCount(8);
});

test('case grid: real cases span 3 of 6 columns at 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const [a, b] = await page.locator('[data-case-tier]').evaluateAll((els) => els.slice(1, 3).map((e) => e.getBoundingClientRect().width));
  expect(Math.round(a / b * 10) / 10).toBe(1.5);
});

test('mobile menu opens, closes on link and Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  const menu = page.locator('[data-menu]');
  const toggle = page.locator('[data-menu-toggle]');
  await expect(page.locator('.nav-desktop')).toBeHidden();
  await toggle.click();
  await expect(menu).toBeVisible();
  await menu.getByRole('link', { name: 'Cases' }).click();
  await expect(menu).toBeHidden();
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('theme toggles and persists; invalid stored value falls back', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-theme-toggle]').click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => localStorage.setItem('axon_theme2', 'blue'));
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('system dark scheme is used when nothing is stored', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('page works when localStorage throws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    Storage.prototype.setItem = () => { throw new Error('denied'); };
  });
  await page.goto('/');
  await page.locator('[data-theme-toggle]').click();
  await page.locator('[data-acc-group="faq"] [data-acc-btn]').nth(2).click();
  await expect(page.locator('#faq-panel-2')).toBeVisible();
  expect(errors).toEqual([]);
});

test('stored language redirects / and switching back to EN sticks', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-lang-link="ru"]').click();
  await expect(page).toHaveURL(/\/ru\/$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/ru\/$/);
  await page.locator('[data-lang-link="en"]').click();
  await expect(page).toHaveURL(/4321\/$/);
  await page.reload();
  await expect(page).toHaveURL(/4321\/$/);
  await expect(page.locator('h1')).toHaveText('We build digital assets');
});

test('accordions are open without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#faq-panel-3')).toBeVisible();
  await expect(page.locator('#tier-panel-0')).toBeVisible();
  await ctx.close();
});
