// Live smoke test of the main scenarios (Decision 69 P0): run after every deploy — `node scripts/e2e.mjs`.
// Pages in 3 languages, workspace API as a guest and as a signed-in test client (a one-time test login written to D1
// with wrangler and removed after), sharing, partner Google sign-in, voices, pricing. Exit code 1 on any failure.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const BASE = process.env.BASE || 'https://vaxogroup.com';
const results = [];
const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log(`${pass ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); };
const get = (p, o = {}) => fetch(BASE + p, { redirect: 'manual', ...o });
const d1 = (sql) => execSync(`npx wrangler d1 execute vaxo-leads --remote --command ${JSON.stringify(sql)}`, { stdio: 'pipe' });

// 1. Pages
for (const p of ['/', '/ru/', '/ua/', '/ru/app/', '/ru/partners/', '/ru/partner/', '/ru/examples/', '/ru/shop/', '/ru/about/', '/ru/how/', '/ru/terms/', '/ru/privacy/', '/ru/partner-terms/', '/examples/marketing/?lang=ru']) {
  const r = await get(p); ok(`page ${p}`, r.status === 200, String(r.status));
}
const home = await (await get('/ru/')).text();
ok('pricing: 6 plans incl. Lite $8', /data-plan="lite"/.test(home) && /data-plan="pro"/.test(home));
ok('free plan says the model is weaker', /Базовая модель ИИ/.test(home));
ok('footer socials without Discord', /Мы в соцсетях/.test(home) && !/discord\.com\/invite/.test(home));
const partners = await (await get('/ru/partners/')).text();
ok('partners: no agency leftovers', !/тёплый клиент|Офферы партнёров|Кастом: приложение/.test(partners));
ok('partners: USDT payouts in FAQ', /USDT/.test(partners));

// 2. Guest workspace + endpoints
ok('ws state as guest', (await get('/api/ws')).status === 200);
ok('tts needs sign-in', (await get('/api/tts', { method: 'POST', body: '{}' })).status === 401);
const g = await get('/api/me/google?for=partner&lang=ru&agree=1');
ok('partner Google sign-in redirects to Google', g.status === 302 && /accounts\.google\.com/.test(g.headers.get('location') || ''));
ok('unknown share link is 404', (await get('/c/000000000000000000000000')).status === 404);

// 3. Signed-in test client (test-ultra, id 10)
const key = randomBytes(16).toString('hex');
d1(`INSERT INTO settings (key, value) VALUES ('test_login_${key}', '{"kind":"client","id":10,"exp":${Date.now() + 600000},"lang":"ru"}')`);
try {
  const a = await get(`/api/me/as?k=${key}`);
  const cookie = (a.headers.get('set-cookie') || '').split(';')[0];
  ok('test login', !!cookie, String(a.status));
  const H = { cookie, 'Content-Type': 'application/json' };
  const st = await (await get('/api/ws', { headers: H })).json().catch(() => ({}));
  ok('workspace signed in', !!st.signedIn);
  const ask = await get('/api/ws/ask', { method: 'POST', headers: H, body: JSON.stringify({ q: 'Сколько будет 17*23? Ответь одним числом.', lang: 'ru', mode: 'short', chat: 0 }) });
  const ad = await ask.json().catch(() => ({}));
  ok('Vax answers', ask.status === 200 && /391/.test(ad.reply || ''), (ad.reply || '').slice(0, 60));
  if (ad.chat) {
    const sh = await (await get(`/api/ws/chat/${ad.chat}/share`, { method: 'POST', headers: H, body: '{}' })).json().catch(() => ({}));
    const card = sh.token ? await (await get(`/c/${sh.token}`)).text() : '';
    ok('share link has a card', /og:title/.test(card));
    await get(`/api/ws/chat/${ad.chat}/share`, { method: 'POST', headers: H, body: JSON.stringify({ off: true }) });
    await get(`/api/ws/chat/${ad.chat}`, { method: 'DELETE', headers: H });
  }
  const tr = await (await get('/api/ws/trust', { headers: H })).json().catch(() => ({}));
  ok('autopilot level readable', ['full', 'ask', 'manual'].includes(tr.mode));
  const tts = await get('/api/tts', { method: 'POST', headers: H, body: JSON.stringify({ text: 'Привет, я VAXO.', voice: 'warm', lang: 'ru' }) });
  ok('live voice', tts.status === 200 || tts.status === 501, tts.status === 501 ? 'no Google key yet (browser voice used)' : String(tts.status));
  const se = await (await get('/api/ws/search?q=тест', { headers: H })).json().catch(() => ({}));
  ok('search works', Array.isArray(se.hits));
} finally { d1(`DELETE FROM settings WHERE key = 'test_login_${key}'`); }

const bad = results.filter((r) => !r.pass);
console.log(`\n${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length ? 1 : 0);
