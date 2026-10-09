# AXON Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести макет `design/AXON_Landing_v2.dc.html` в статический сайт на Astro (EN/UA/RU) с формой заявок в Telegram + email, готовый к деплою на Vercel.

**Architecture:** Astro собирает три статические страницы из одного компонента `Landing.astro` и трёх словарей. Интерактив — один ванильный TS-бандл `src/scripts/main.ts`. Заявки обрабатывает Vercel Function `api/lead.ts`, логика которой (`src/lib/lead.ts`) — чистая функция, тестируемая без сети.

**Tech Stack:** Astro 7, TypeScript strict, @astrojs/sitemap, @fontsource-variable/onest, @fontsource/jetbrains-mono, Vitest, @playwright/test (Chromium в `/opt/pw-browsers`).

**Spec:** `docs/superpowers/specs/2026-10-09-axon-landing-design.md`

## Global Constraints

- Визуально и поведенчески 1:1 с макетом v2; отличия — только раздел 9 спецификации.
- Все значения стилей переносятся из инлайн-стилей и `renderVals()` макета без округлений.
- Тексты — дословно из объекта `L` макета; новые строки только `form.sending`, `form.error` (×3 языка).
- Точки перелома: меню 1040 px; кейсы 6 кол. ≥1100, 2 кол. ≥720, иначе 1.
- Ключи localStorage: `axon_lang`, `axon_theme2`. Любой доступ к localStorage — в try/catch.
- `<html lang>`: `en`, `uk`, `ru`; URL: `/`, `/ua/`, `/ru/`.
- Нет внешних запросов при загрузке страницы (шрифты/картинки локальные).
- JS-бандл ≤ 10 КБ gzip.
- Переменные окружения: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`, `SITE_URL` (по умолчанию `https://axon-website.vercel.app`).
- Playwright запускает Chromium из `/opt/pw-browsers/chromium` (без `playwright install`).

## Review Focus

1. Переход на EN с `/ru/` при сохранённом `axon_lang=ru` — клик по «EN» должен сначала записать `en`, иначе `/` вернёт обратно на `/ru/` (петля). Тест — Task 6.
2. Двойной клик «Отправить» — должен уйти ровно один запрос (кнопка disabled на время отправки). Тест — Task 7.
3. Поля с `<b>`, `&`, `<script>` — в Telegram (HTML parse_mode) и в письме экранируются. Тест — Task 4.
4. Недоступный localStorage (приватный режим Safari) или мусор в `axon_theme2` — страница работает, тема падает в системную/светлую. Тест — Task 6.
5. Сообщение длиннее 2000 символов — textarea `maxlength="2000"`, сервер отвечает 400. Тест — Task 3/7.

---

### Task 1: Каркас проекта, токены, layout, тестовая инфраструктура

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Landing.astro`
- Create: `src/pages/index.astro`, `src/pages/ua/index.astro`, `src/pages/ru/index.astro`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `Base.astro` props `{ lang: Lang; title: string; description: string; path: '/' | '/ua/' | '/ru/' }`; `Landing.astro` props `{ lang: Lang }`; `type Lang = 'en' | 'ua' | 'ru'` (временно в `src/i18n/index.ts`).
- Scripts: `dev`, `build`, `preview`, `check` (`astro check`), `test` (`vitest run`), `e2e` (`playwright test`).

- [ ] **Step 1:** `tokens.css` — `:root, [data-theme=light]` = `THEMES.light`, `[data-theme=dark]` = `THEMES.dark` (12 переменных из макета, строка 454–455). `global.css` — базовые правила из `<style>` макета (строки 15–22) + `:focus-visible` (2px `--acc`, offset 2px) + `@media (prefers-reduced-motion: reduce)`.
- [ ] **Step 2:** `Base.astro`: `<html lang={lang==='ua'?'uk':lang} data-theme="light">`, импорт шрифтов (`@fontsource-variable/onest`, `@fontsource/jetbrains-mono/400.css`, `/500.css`), инлайн-скрипт темы (`is:inline`): stored ∈ {light,dark} → иначе `matchMedia('(prefers-color-scheme: dark)')` → `light`; ставит `data-theme` и `style.colorScheme`.
- [ ] **Step 3:** Smoke-тест: для `/`, `/ua/`, `/ru/` — статус 200, `html[lang]` = `en|uk|ru`.
- [ ] **Step 4:** `npm run build && npm run e2e -- smoke` → PASS. `npm run check` → 0 errors.
- [ ] **Step 5:** Commit `feat: scaffold Astro project with theme tokens and layout`.

### Task 2: Словари и данные

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/ua.ts`, `src/i18n/ru.ts`, `src/i18n/index.ts`
- Create: `src/data/tiers.ts`, `src/data/cases.ts`, `src/data/services.ts`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces: `type Dict` (выведен из `en` через `typeof en`, с `string` вместо литералов); `getDict(lang: Lang): Dict`; `LANGS: Lang[] = ['en','ua','ru']`; `langPath(lang): string`.
- Produces: `PRICES`, `TIER_NAMES`, `TIMES` (tiers.ts); `CASE_META: CaseMeta[]` (cases.ts, поля как в макете; `img`/`gallery[].src` — ключи картинок, не пути); `SVC_PRICES: (string|null)[][]` (services.ts); `NAV_HREFS`.

- [ ] **Step 1: Тест**
```ts
test('all dictionaries share the en shape', () => { for (const l of ['ua','ru']) expect(shape(getDict(l))).toEqual(shape(getDict('en'))) })
test('counts match design', () => { const t = getDict('en'); expect([t.cases.length, t.tiers.length, t.cat.items.length, t.faq.length, t.ref.why.length]).toEqual([8,3,8,5,4]) })
test('service rows align with prices', () => getDict('en').cat.items.forEach((it,i) => expect(SVC_PRICES[i].length).toBeGreaterThanOrEqual(it.rows.length)))
test('new strings exist', () => LANGS.forEach(l => { expect(getDict(l).form.sending).toBeTruthy(); expect(getDict(l).form.error).toBeTruthy() }))
```
`shape()` — рекурсивно заменяет строки на `'s'`, массивы — на массив форм элементов.
- [ ] **Step 2:** Run `npx vitest run tests/unit/i18n.test.ts` → FAIL (модули не существуют).
- [ ] **Step 3:** Перенести `L.en/ua/ru` и константы дословно (скриптом-извлечением из `design/AXON_Landing_v2.dc.html`, затем `as const`-объекты). Добавить `form.sending`: EN `Sending…`, UA `Надсилаємо…`, RU `Отправляем…`; `form.error`: EN `Couldn't send. Please try again.`, UA `Не вдалося надіслати. Спробуйте ще раз.`, RU `Не удалось отправить. Попробуйте ещё раз.`
- [ ] **Step 4:** Тесты → PASS.
- [ ] **Step 5:** Commit `feat: port design copy and data`.

### Task 3: Общая валидация

**Files:** Create `src/lib/validate.ts`; Test `tests/unit/validate.test.ts`

**Interfaces:**
- Produces: `type LeadInput = { mode: 'request'|'question'; name: string; contact: string; interest: string; message: string; lang: Lang }`; `INTERESTS = ['Foundation','Growth','Scale','single','any'] as const`; `validateLead(x: unknown): { ok: true; value: LeadInput } | { ok: false; errors: Partial<Record<keyof LeadInput, true>> }`; `isValidContact(s: string): boolean`; `LIMITS = { name: 100, contact: 100, message: 2000 }`.

- [ ] **Step 1: Тест** — `isValidContact`: true для `@axon_team`, `+971 50 123 4567`, `(050) 123-45-67`, `a@b.co`; false для `@ab`, `12345`, `mail@`, `''`. `validateLead`: пустое имя → errors.name; имя `'  '` → errors.name; message 2001 символ → errors.message; interest `'Gold'` → errors.interest; interest `''` → ok; trim применяется к name/contact; mode `'x'` → errors.mode.
- [ ] **Step 2:** FAIL → **Step 3:** реализовать (регэкспы из спецификации §7) → **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: shared lead validation`.

### Task 4: Обработка заявки и функция Vercel

**Files:** Create `src/lib/lead.ts`, `api/lead.ts`, `.env.example`; Test `tests/unit/lead.test.ts`

**Interfaces:**
- Consumes: `validateLead`, `LeadInput` (Task 3).
- Produces: `type LeadEnv = Partial<Record<'TELEGRAM_BOT_TOKEN'|'TELEGRAM_CHAT_ID'|'RESEND_API_KEY'|'LEAD_EMAIL_TO'|'LEAD_EMAIL_FROM', string>>`; `handleLead(body: unknown, env: LeadEnv, fetchFn: typeof fetch, now?: number): Promise<{ status: number; body: { ok: boolean; errors?: object } }>`; `escapeHtml(s: string): string`. `api/lead.ts`: `export async function POST(req: Request): Promise<Response>` (не-JSON → 400) и `GET` → 405.

- [ ] **Step 1: Тесты** (fetch — `vi.fn`):
  - honeypot `website:'x'` → 200, fetch не вызван;
  - `startedAt = now - 1500` → 200, fetch не вызван;
  - невалидный contact → 400, `errors.contact`;
  - оба канала заданы и ок → 200, fetch вызван 2 раза: URL `https://api.telegram.org/bot<T>/sendMessage` с `chat_id`, `parse_mode:'HTML'`; `https://api.resend.com/emails` с `Authorization: Bearer <K>`, `reply_to` при email-контакте и без него для `@handle`;
  - telegram 500, resend 200 → 200; оба 500 → 502; fetch бросает → считается сбоем;
  - только Telegram в env → 200, 1 вызов; пустой env → 500;
  - имя `<b>A&B</b>` → в тексте Telegram и HTML письма `&lt;b&gt;A&amp;B&lt;/b&gt;`.
- [ ] **Step 2:** FAIL → **Step 3:** реализовать; текст Telegram: `🟡 <b>{Request|Question}</b> · {interest||—} · {LANG}\n👤 {name}\n📞 {contact}\n💬 {message||—}`; тема письма `AXON — new {request|question}: {name}` → **Step 4:** PASS.
- [ ] **Step 5:** `.env.example` с шестью переменными и комментариями. Commit `feat: lead endpoint with Telegram and email delivery`.

### Task 5: Статические секции и изображения

**Files:**
- Create: `src/components/{Header,Hero,Method,Why,Session,Referral,Footer}.astro`
- Create: `src/assets/images/{aipro-cover.webp,aipro-laptop.webp,aipro-logo.png,tricho-cover.webp,tricho-laptop.png}` (копии из `design/assets/`), `src/assets/images/tricho-logo.svg`, `src/assets/images/network-diagram.svg`
- Modify: `src/components/Landing.astro`
- Test: `tests/e2e/sections.spec.ts`

**Interfaces:**
- Consumes: `getDict`, `NAV_HREFS`, `TIMES`, `TIER_NAMES`.
- Produces: разметка с id `top, method, cases, pricing, referral, services, contact`; data-атрибуты для скриптов: `[data-menu-toggle]`, `[data-menu]`, `[data-theme-toggle]`, `[data-lang-link="en|ua|ru"]`, `[data-hero-tier="0|1|2"]`.

- [ ] **Step 1: Тест**: на каждой странице h1 = `t.h1`; 5 пунктов nav с href из `NAV_HREFS`; 3 карточки hero с текстами `30–60 days` / `3–6 months` / `12 months` (EN); на 360px `scrollWidth <= clientWidth`; ни одного запроса к внешним хостам (`page.on('request')`).
- [ ] **Step 2:** FAIL → **Step 3:** свёрстать секции по строкам макета 28–124, 217–237, 294–332, 438–448 (стили 1:1; `cascadeStyles` → `.cascade--0/1/2`); network-diagram/tricho-logo SVG — заглушки по §4 спецификации → **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: static landing sections`.

### Task 6: Интерактивные секции и скрипты

**Files:**
- Create: `src/components/{Pricing,Cases,CaseCard,Services,Faq}.astro`
- Create: `src/scripts/{main,theme,menu,accordion,cases-filter,lang}.ts`
- Test: `tests/e2e/interactions.spec.ts`

**Interfaces:**
- Produces: аккордеон — `[data-acc-group="faq|services|cases"]` (эксклюзивный) или `[data-acc-group="tiers"][data-acc-independent]`; кнопка `[data-acc-btn]` с `aria-expanded`, `aria-controls`; знак `[data-acc-sign]`. Экспорт `openTier(i: number): void` (для hero и Task 7). Фильтр — `[data-case-filter="-1|0|1|2"]`, карточка `[data-case-tier]`.
- Без JS: панели без `hidden`; `main.ts` при старте приводит их к состояниям по умолчанию (FAQ #0 и услуга #2 открыты).

- [ ] **Step 1: Тест**: FAQ — по умолчанию открыт 1-й, клик по 2-му закрывает 1-й; услуги — «Web Development» открыт, 4 строки с ценами `$1,000 – $5,000` … `Custom quote`; тарифы — «Details» Foundation и Growth открыты одновременно; клик по hero-карточке Growth → детали Growth раскрыты; фильтр Growth → видны только карточки tier 2 (4 шт.), открытый кейс закрывается; на 1280px карточка TrichoTech занимает 3 колонки из 6; на 390px меню: ≡ открывает, клик по ссылке и Esc закрывают; тема: клик → `data-theme=dark`, после reload сохраняется; `axon_theme2='blue'` → light; localStorage бросает исключение (`addInitScript` переопределяет `Storage.prototype.getItem`) → страница рендерится без ошибок в консоли; язык: `axon_lang=ru` и открыть `/` → URL `/ru/`; на `/ru/` клик «EN» → URL `/` и остаётся `/`.
- [ ] **Step 2:** FAIL → **Step 3:** секции по строкам макета 126–215, 239–292, 334–384; стили кейсов из `renderVals()` (строки 796–819) → CSS с переменными палитры; скрипты по §6 спецификации → **Step 4:** PASS.
- [ ] **Step 5:** Проверить размер: `gzip -c dist/_astro/*.js | wc -c` ≤ 10240. Commit `feat: interactive sections`.

### Task 7: Форма заявки

**Files:** Create `src/components/Contact.astro`, `src/scripts/contact-form.ts`; Modify `src/scripts/main.ts`, `src/components/Pricing.astro`; Test `tests/e2e/contact.spec.ts`

**Interfaces:**
- Consumes: `validateLead`, `isValidContact`, `LIMITS` (Task 3); `POST /api/lead` (Task 4); тарифные кнопки `[data-choose-tier="Foundation|Growth|Scale"]`.
- Отправляет JSON `{...LeadInput, website, startedAt}`.

- [ ] **Step 1: Тест** (`page.route('**/api/lead')`): пустая форма → ошибки «Required field» и «Enter a valid Telegram, phone or email»; ввод в поле снимает его ошибку; режим «Ask a question» скрывает чипы и меняет label/кнопку на `Your question` / `Send question`; клик «Move to Growth» → форма в режиме request, чип Growth выбран, `#contact` в viewport; повторный клик по выбранному чипу снимает выбор; двойной клик отправки → 1 запрос, кнопка показывает `Sending…`; ответ 200 → экран успеха, «Send another» возвращает пустую форму; ответ 502 → текст `form.error`, поля сохранены; textarea имеет `maxlength="2000"`.
- [ ] **Step 2:** FAIL → **Step 3:** разметка по строкам макета 386–436 (стили `modes`, `interestOpts`, `inputStyle` из 712–714, 845–851) → **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: contact form wired to lead endpoint`.

### Task 8: SEO, 404, заголовки, деплой-конфиг

**Files:** Modify `src/layouts/Base.astro`, `astro.config.mjs`; Create `src/pages/404.astro`, `public/robots.txt`, `public/favicon.svg`, `public/og-image.png`, `vercel.json`, `scripts/make-og.mjs`; Test `tests/e2e/seo.spec.ts`

- [ ] **Step 1: Тест**: на `/ru/` — `title` = `AXON — Мы создаём цифровые активы`, `meta[name=description]` = `t.sub`, `link[rel=canonical]` = `${SITE_URL}/ru/`, 4 `hreflang` (en, uk, ru, x-default), `og:image` абсолютный, `og:locale=ru_RU`, JSON-LD парсится и `@type=ProfessionalService`; `/nope` → 404-страница со ссылками на 3 языка; `dist/sitemap-index.xml` существует.
- [ ] **Step 2:** FAIL → **Step 3:** реализовать по §8; `og-image.png` генерируется `scripts/make-og.mjs` (Playwright скриншот HTML 1200×630) и коммитится; favicon — «A.» Onest 800, `#17150F` + точка `#E4A93F` → **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: SEO metadata, 404 and Vercel config`.

### Task 9: Сверка с макетом

**Files:** Create `tests/visual/compare.ts`; Modify компоненты по найденным расхождениям

- [ ] **Step 1:** devDependencies `react@18.3.1`, `react-dom@18.3.1`, `@babel/standalone@7.29.0`. Скрипт: статический сервер для `design/` (макет ждёт `assets/tricho-cover.png` и т. п. — маршрутизировать `assets/*` на файлы из `design/assets/` по имени без расширения), `page.route('https://unpkg.com/**')` → файлы из `node_modules`, `page.route('https://fonts.*/**')` → abort (шрифты подставляются через `@fontsource` CSS-инъекцией). Снимки full-page макета и `dist` для 390/768/1280/1440 × light/dark (тема макета — `localStorage.axon_theme2`) в `tests/visual/out/{w}-{theme}-{design|site}.png`.
- [ ] **Step 2:** Запустить `npx tsx tests/visual/compare.ts`; сравнить пары визуально, по секциям. Также с раскрытыми: FAQ #1, услуга #3, тариф Growth, кейс TrichoTech.
- [ ] **Step 3:** Исправить расхождения; повторить до совпадения. Неустранимые — дописать в §9 спецификации.
- [ ] **Step 4:** Commit `test: visual comparison against design; fix discrepancies`.

### Task 10: CI и README

**Files:** Create `.github/workflows/ci.yml`, `README.md`

- [ ] **Step 1:** `ci.yml` (push/PR): Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`, `npm test`, `npm run build`, `npm run e2e`.
- [ ] **Step 2:** README (RU): что это; `npm i`, `npm run dev`; тесты; переменные окружения с инструкциями (BotFather → токен; chat id через `getUpdates`; Resend → API key, подтверждение домена, `LEAD_EMAIL_FROM`); деплой на Vercel (Import → Astro → env → Deploy), домен и `SITE_URL`; как заменить заглушки `tricho-logo.svg` и `network-diagram.svg`.
- [ ] **Step 3:** Полный прогон `npm run check && npm test && npm run build && npm run e2e` → всё PASS.
- [ ] **Step 4:** Commit `chore: CI and README`; push.
