// Renders the original design (design/AXON_Landing_v2.dc.html) and the built site side by side.
// Usage: npm run build && npx astro preview & npm run visual -- [--widths 390,1440] [--themes light] [--lang en] [--open faq0,svc2,tier1,case0]
// Output: tests/visual/out/<lang>-<width>-<theme>-<n>.png (design left, site right) + diff summary.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'tests/visual/out');
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const widths = arg('widths', '390,768,1280,1440').split(',').map(Number);
const themes = arg('themes', 'light,dark').split(',');
const lang = arg('lang', 'en');
const siteUrl = arg('site', 'http://localhost:4321') + (lang === 'en' ? '/' : `/${lang}/`);
const CHUNK = 1600;

const nm = (p) => path.join(root, 'node_modules', p);
const fontCss = `
@font-face{font-family:'Onest';font-weight:100 900;font-display:swap;src:url(http://design.local/fonts/onest-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Onest';font-weight:100 900;font-display:swap;src:url(http://design.local/fonts/onest-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Onest';font-weight:100 900;font-display:swap;src:url(http://design.local/fonts/onest-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'JetBrains Mono';font-weight:400;src:url(http://design.local/fonts/jbm-latin-400.woff2) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:'JetBrains Mono';font-weight:500;src:url(http://design.local/fonts/jbm-latin-500.woff2) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:'JetBrains Mono';font-weight:400;src:url(http://design.local/fonts/jbm-cyrillic-400.woff2) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'JetBrains Mono';font-weight:500;src:url(http://design.local/fonts/jbm-cyrillic-500.woff2) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}`;
const fontFiles = {
  'onest-latin.woff2': 'onest-latin.woff2',
  'onest-cyrillic.woff2': 'onest-cyrillic.woff2',
  'onest-latin-ext.woff2': 'onest-latin-ext.woff2',
  'jbm-latin-400.woff2': 'jetbrains-mono-latin-400.woff2',
  'jbm-latin-500.woff2': 'jetbrains-mono-latin-500.woff2',
  'jbm-cyrillic-400.woff2': 'jetbrains-mono-cyrillic-400.woff2',
  'jbm-cyrillic-500.woff2': 'jetbrains-mono-cyrillic-500.woff2',
};
const assetFile = (name) => {
  const base = name.replace(/\.\w+$/, '');
  for (const dir of ['design/assets', 'src/assets/images']) {
    const hit = fs.readdirSync(path.join(root, dir)).find((f) => f.replace(/\.\w+$/, '') === base);
    if (hit) return path.join(root, dir, hit);
  }
  return null;
};

export async function routeDesign(page) {
  await page.route('**/*', (r) => {
    const url = new URL(r.request().url());
    const file = (p, type) => r.fulfill({ path: p, contentType: type });
    if (url.host === 'unpkg.com') {
      if (url.pathname.includes('/react@')) return file(nm('react/umd/react.production.min.js'), 'text/javascript');
      if (url.pathname.includes('/react-dom@')) return file(nm('react-dom/umd/react-dom.production.min.js'), 'text/javascript');
      if (url.pathname.includes('@babel/standalone')) return file(nm('@babel/standalone/babel.min.js'), 'text/javascript');
    }
    if (url.host === 'fonts.googleapis.com') return r.fulfill({ body: fontCss, contentType: 'text/css' });
    if (url.host === 'strategy-cascade-framework.lovable.app') return file(assetFile('network-diagram'), 'image/svg+xml');
    if (url.host !== 'design.local') return r.abort();
    if (url.pathname === '/') return file(path.join(root, 'design/AXON_Landing_v2.dc.html'), 'text/html');
    if (url.pathname === '/support.js') return file(path.join(root, 'design/support.js'), 'text/javascript');
    if (url.pathname.startsWith('/fonts/')) return file(path.join(root, 'src/assets/fonts', fontFiles[path.basename(url.pathname)]), 'font/woff2');
    if (url.pathname.startsWith('/assets/')) {
      const p = assetFile(path.basename(url.pathname));
      return p ? file(p) : r.fulfill({ status: 404 });
    }
    return r.fulfill({ status: 404 });
  });
}

// Clicks that put both pages into the same expanded state.
async function expand(page, which, isDesign) {
  for (const key of which) {
    const [kind, n] = [key.replace(/\d+$/, ''), Number(key.match(/\d+$/)?.[0] ?? 0)];
    if (isDesign) {
      const texts = await page.evaluate(([kind, n]) => {
        const btn = {
          tier: () => document.querySelectorAll('#pricing article button')[n * 2],
          case: () => document.querySelectorAll('#cases article button')[n],
          svc: () => document.querySelectorAll('#services button')[n],
          faq: () => document.querySelectorAll('section:not([id]) button')[n],
        }[kind]?.();
        btn?.click();
        return !!btn;
      }, [kind, n]);
      if (!texts) console.warn('design: no button for', key);
    } else {
      const sel = { tier: `[data-tier-btn="${n}"]`, case: `#cases [data-acc-btn] >> nth=${n}`, svc: `#services [data-acc-btn] >> nth=${n}`, faq: `.faq [data-acc-btn] >> nth=${n}` }[kind];
      await page.locator(sel).click();
    }
    await page.waitForTimeout(150);
  }
}

async function shoot(browser, url, width, theme, isDesign, opens) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(([theme, lang]) => {
    localStorage.setItem('axon_theme2', theme);
    localStorage.setItem('axon_lang', lang);
  }, [theme, lang]);
  const page = await ctx.newPage();
  if (isDesign) await routeDesign(page);
  await page.goto(url, { waitUntil: 'networkidle' });
  if (isDesign) await page.waitForSelector('#top h1', { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*{transition:none!important;animation:none!important;scroll-behavior:auto!important}' });
  // Close the FAQ/services defaults first so both sides start from the same state, then open the requested ones.
  if (opens.length) await expand(page, opens, isDesign);
  // Lazy images: scroll through the page.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  const buf = await page.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) await main();

async function main() {
fs.mkdirSync(out, { recursive: true });
const opens = (arg('open', '') || '').split(',').filter(Boolean);
const browser = await chromium.launch();
for (const width of widths) {
  for (const theme of themes) {
    const [a, b] = await Promise.all([
      shoot(browser, 'http://design.local/', width, theme, true, opens),
      shoot(browser, siteUrl, width, theme, false, opens),
    ]);
    const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
    const h = Math.max(ma.height, mb.height);
    const tag = `${lang}-${width}-${theme}${opens.length ? '-' + opens.join('_') : ''}`;
    // Pixel diff over the common area; differing rows are reported as y-ranges.
    const common = Math.min(ma.height, mb.height);
    const raw = (buf) => sharp(buf).extract({ left: 0, top: 0, width, height: common }).removeAlpha().raw().toBuffer();
    const [ra, rb] = await Promise.all([raw(a), raw(b)]);
    let diff = 0;
    const rows = [];
    for (let y = 0; y < common; y++) {
      let rowDiff = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        if (Math.abs(ra[i] - rb[i]) + Math.abs(ra[i + 1] - rb[i + 1]) + Math.abs(ra[i + 2] - rb[i + 2]) > 48) rowDiff++;
      }
      diff += rowDiff;
      if (rowDiff) rows.push(y);
    }
    const ranges = [];
    for (const y of rows) {
      const last = ranges.at(-1);
      if (last && y - last[1] <= 8) last[1] = y;
      else ranges.push([y, y]);
    }
    console.log(`${tag}: design ${ma.height}px, site ${mb.height}px (Δ ${mb.height - ma.height}); differing pixels ${(100 * diff / (width * common)).toFixed(3)}%; rows ${ranges.slice(0, 12).map(([s, e]) => s + '-' + e).join(', ')}${ranges.length > 12 ? ' …' : ''}`);
    for (let y = 0, n = 0; y < h; y += CHUNK, n++) {
      const part = async (buf, meta) => {
        const ch = Math.max(0, Math.min(CHUNK, meta.height - y));
        const base = sharp({ create: { width, height: CHUNK, channels: 3, background: '#ff00ff' } });
        if (!ch) return base.png().toBuffer();
        const crop = await sharp(buf).extract({ left: 0, top: y, width, height: ch }).toBuffer();
        return base.composite([{ input: crop, top: 0, left: 0 }]).png().toBuffer();
      };
      const [pa, pb] = await Promise.all([part(a, ma), part(b, mb)]);
      await sharp({ create: { width: width * 2 + 16, height: CHUNK, channels: 3, background: '#ff0000' } })
        .composite([{ input: pa, left: 0, top: 0 }, { input: pb, left: width + 16, top: 0 }])
        .png()
        .toFile(path.join(out, `${tag}-${String(n).padStart(2, '0')}.png`));
    }
  }
}
await browser.close();
}
