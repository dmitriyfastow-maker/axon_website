// Thumbnails for the examples gallery: a browser frame + a phone on a gradient, 1200x750, EN/RU/UA.
// Usage: node scripts/make-thumbs.mjs eco-shop client-app   (serves ./public on :4599 itself)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
}).listen(4599);

const slugs = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
for (const slug of slugs) for (const lang of ['en', 'ru', 'ua']) {
  const url = `http://localhost:4599/examples/${slug}/?lang=${lang}&shot=1`;
  const shot = async (w, h, mobile) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: lang === 'ua' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US' });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(3200);
    const b = await p.screenshot({ type: 'jpeg', quality: 88 });
    await ctx.close();
    return 'data:image/jpeg;base64,' + b.toString('base64');
  };
  const desk = await shot(1440, 900, false), mob = await shot(390, 844, true);
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(`<body style="margin:0;width:1200px;height:750px;overflow:hidden;background:linear-gradient(135deg,#ff7a45,#ff4f2e 45%,#9b5cff);font-family:system-ui">
  <div style="position:absolute;left:68px;top:68px;width:960px;height:615px;border-radius:18px;overflow:hidden;background:#f2f2f2;box-shadow:0 40px 80px -30px rgba(0,0,0,.5)">
    <div style="height:30px;display:flex;gap:7px;align-items:center;padding-left:14px"><i style="width:10px;height:10px;border-radius:50%;background:#ddd"></i><i style="width:10px;height:10px;border-radius:50%;background:#ddd"></i><i style="width:10px;height:10px;border-radius:50%;background:#ddd"></i></div>
    <img src="${desk}" style="width:960px;display:block">
  </div>
  <div style="position:absolute;right:52px;top:222px;width:243px;height:484px;border-radius:38px;background:#111;padding:9px;box-shadow:0 40px 80px -20px rgba(0,0,0,.6)">
    <div style="width:100%;height:100%;border-radius:30px;overflow:hidden"><img src="${mob}" style="width:100%;display:block"></div>
  </div></body>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `public/examples/thumbs/${slug}-${lang}.jpg`, type: 'jpeg', quality: 84 });
  await ctx.close();
  console.log('ok', slug, lang);
}
await browser.close();
srv.close();
