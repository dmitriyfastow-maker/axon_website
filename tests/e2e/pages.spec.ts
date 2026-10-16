import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', lang: 'en', h1: 'We build digital assets', title: 'AXON — We build digital assets' },
  { path: '/ua/', lang: 'uk', h1: 'Ми створюємо цифрові активи', title: 'AXON — Ми створюємо цифрові активи' },
  { path: '/ru/', lang: 'ru', h1: 'Мы создаём цифровые активы', title: 'AXON — Мы создаём цифровые активы' },
];

for (const p of pages) {
  test(`${p.path} renders in ${p.lang}`, async ({ page }) => {
    await page.goto(p.path);
    await expect(page.locator('html')).toHaveAttribute('lang', p.lang);
    await expect(page.locator('h1')).toHaveText(p.h1);
    await expect(page).toHaveTitle(p.title);
  });
}

test('nav links point at sections that exist', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('.nav-desktop a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(['#method', '#cases', '#pricing', '#services', '/partners/']);
  for (const h of hrefs) await expect(page.locator(h!)).toHaveCount(1);
});

test('hero cascade shows tier timelines', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-hero-tier] .step-time')).toHaveText(['30–60 days', '3–6 months', '12 months']);
});

test('no horizontal scroll at 360px and no external requests', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4321')) external.push(r.url());
  });
  await page.setViewportSize({ width: 360, height: 800 });
  for (const p of pages) {
    await page.goto(p.path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, p.path).toBeLessThanOrEqual(0);
  }
  expect(external).toEqual([]);
});

test('SEO metadata on /ru/', async ({ page }) => {
  await page.goto('/ru/');
  const site = 'https://axon-website.vercel.app';
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /^Фундаментальная стратегия/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `${site}/ru/`);
  const alts = await page.locator('link[rel=alternate]').evaluateAll((ls) => ls.map((l) => `${l.getAttribute('hreflang')} ${l.getAttribute('href')}`));
  expect(alts).toEqual([`en ${site}/`, `uk ${site}/ua/`, `ru ${site}/ru/`, `x-default ${site}/`]);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ru_RU');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${site}/og-image.png`);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld['@type']).toBe('ProfessionalService');
});

test('404 page links to all languages', async ({ page }) => {
  const res = await page.goto('/does-not-exist');
  expect(res?.status()).toBe(404);
  expect(await page.locator('main nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['/', '/ua/', '/ru/']);
});
