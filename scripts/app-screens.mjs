// Phone screens of the client-app demo for the store-listing mock on the home page (13.11).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const b = await chromium.launch({ channel: 'chrome' });
for (const lang of ['en', 'ru', 'ua']) {
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:4321/examples/client-app/?lang=${lang}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(6500); // the push banner hides again
  const views = ['home', 'book', 'bonus'];
  for (let i = 0; i < 3; i++) {
    await p.evaluate((v) => { document.querySelectorAll('[data-tabs] button')[{ home: 0, book: 1, bonus: 2 }[v]].click(); if (v === 'book') document.querySelector('[data-slots] .chip:not(:disabled)')?.click(); }, views[i]);
    await p.waitForTimeout(1600);
    const f = `public/examples/thumbs/app-scr${i + 1}-${lang}`;
    await p.locator('.scr').screenshot({ path: f + '.png' });
    execSync(`cwebp -quiet -q 80 -resize 260 0 ${f}.png -o ${f}.webp && rm ${f}.png`);
  }
  await p.close();
}
await b.close();
