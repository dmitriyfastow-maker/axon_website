// Renders public/og-image.png (1200×630) with the site fonts. Run: npm run og
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, 'src/assets/fonts', f)).toString('base64')}`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:Onest;font-weight:100 900;src:url(${font('onest-latin.woff2')})}
@font-face{font-family:'JetBrains Mono';src:url(${font('jetbrains-mono-latin-500.woff2')})}
body{margin:0;width:1200px;height:630px;background:#17150F;color:#F5F2EC;font-family:Onest;display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px;box-sizing:border-box}
.logo{font-weight:800;font-size:44px;letter-spacing:-.03em}.logo span{color:#E4A93F}
.eyebrow{font-family:'JetBrains Mono';font-size:18px;letter-spacing:.2em;text-transform:uppercase;color:#E8B65A;margin-bottom:24px}
h1{margin:0;font-size:104px;line-height:.98;letter-spacing:-.045em;font-weight:700;max-width:900px}
.foot{display:flex;justify-content:space-between;font-size:22px;color:#A9A398}
.dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#E4A93F;margin-right:12px}
</style></head><body>
<div class="logo">AXON<span>.</span></div>
<div><div class="eyebrow"><span class="dot"></span>Strategic partner for your growth</div><h1>We build digital assets</h1></div>
<div class="foot"><span>Strategy → launch → scale</span><span>London · Dubai · New York</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, 'public/og-image.png') });
await browser.close();
console.log('public/og-image.png written');
