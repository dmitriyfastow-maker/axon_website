import { chromium } from 'playwright';
const [url, out, js, w, h] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: +(w||1400), height: +(h||900) } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(url, { waitUntil: 'networkidle' });
if (js) { const r = await p.evaluate(`(async()=>{${js}})()`); if (r) console.log(r); }
await p.waitForTimeout(1200);
await p.screenshot({ path: out });
await b.close();
