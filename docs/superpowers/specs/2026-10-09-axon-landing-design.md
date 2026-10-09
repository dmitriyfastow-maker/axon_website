# AXON Landing — спецификация

Дата: 2026-10-09 · Источник дизайна: `AXON_Landing_v2.dc.html` (макет-прототип, React-подобный DSL)

## 1. Цель и критерии готовности

Перенести лендинг студии AXON из макета v2 в чистый продакшн-код в репозитории `axon_website`
и подготовить его к публикации на Vercel.

**Главное требование: визуальное и поведенческое соответствие макету v2 — 1:1.**
Тексты (EN/UA/RU), цены, цвета, шрифты, размеры, отступы, скругления, порядок блоков,
точки перелома и поведение интерактива переносятся без изменений. Отступления от макета —
только перечисленные в разделе 9.

Готово, когда:
- `npm run build` собирает статический сайт без ошибок, `npm test` и e2e-тесты зелёные;
- страницы `/`, `/ua/`, `/ru/` визуально совпадают с макетом на ширинах 390, 768, 1280, 1440 px
  в светлой и тёмной теме (сверка скриншотов: макет vs сайт);
- нет горизонтальной прокрутки на ширине 360 px;
- форма доставляет заявку в Telegram и на email (при заданных переменных окружения);
- Lighthouse (mobile) ≥ 95 по Performance, Accessibility, Best Practices, SEO.

## 2. Стек

- **Astro 7** (статическая сборка, `output: 'static'`), TypeScript strict.
- Без UI-фреймворка: интерактив — ванильный TS-модуль(и), собираемый Astro/Vite.
- Шрифты — self-hosted через `@fontsource-variable/onest` и `@fontsource/jetbrains-mono`
  (подмножества latin + cyrillic, веса как в макете: Onest 400–800, JetBrains Mono 400/500).
- Изображения — `astro:assets` (`<Picture>`, AVIF + WebP, адаптивные `srcset`).
- Sitemap — `@astrojs/sitemap` с i18n.
- Серверная часть — одна Vercel Function `api/lead.ts` (web-сигнатура `POST(request: Request)`).
- Тесты — Vitest (юнит), Playwright с предустановленным Chromium (e2e + скриншоты).

## 3. Структура проекта

```
axon_website/
├─ astro.config.mjs        # site (из SITE_URL), i18n, sitemap
├─ vercel.json             # заголовки безопасности и кэша
├─ package.json  tsconfig.json  .env.example  README.md
├─ api/lead.ts             # тонкая обёртка: Request → handleLead() → Response
├─ public/  favicon.svg  og-image.png  robots.txt
├─ src/
│  ├─ assets/images/       # исходники картинок (оптимизирует astro:assets)
│  ├─ i18n/  en.ts ua.ts ru.ts index.ts   # словари 1:1 из макета + тип Dict
│  ├─ data/  tiers.ts cases.ts services.ts themes.ts   # не зависящее от языка
│  ├─ lib/   validate.ts lead.ts          # общая валидация; логика отправки заявки
│  ├─ layouts/Base.astro                  # <head>, SEO, тема до отрисовки
│  ├─ components/ Header Hero Method Why Cases CaseCard Session Pricing
│  │              Referral Services Faq Contact Footer Landing (.astro)
│  ├─ pages/ index.astro  ua/index.astro  ru/index.astro  404.astro
│  ├─ styles/ tokens.css global.css
│  └─ scripts/ theme.ts menu.ts accordion.ts cases-filter.ts contact-form.ts main.ts
└─ tests/ unit/*.test.ts  e2e/*.spec.ts
```

`Landing.astro` собирает все секции; три страницы отличаются только словарём и `lang`.

## 4. Контент и данные

- Словари `en/ua/ru` — дословный перенос объекта `L` из макета (поля `nav`, `eyebrow`, `h1`, …, `form`).
  Ключ языка в коде `ua`, атрибут `<html lang>` — `uk` (как в макете).
- `data/` — константы макета без изменений: `PRICES`, `TIER_NAMES`, `TIMES`, `CASE_META`
  (палитры, метрики, бары, флаг `real`, стек), `SVC_PRICES`, `THEMES`, `NAV_HREFS`.
- Изображения:
  - `aipro-cover`, `aipro-laptop`, `aipro-logo`, `tricho-cover`, `tricho-laptop` — присланы пользователем;
  - `tricho-logo` — **заглушка**: SVG, знак «T» + надпись «TrichoTech» на фоне `#173F4F`;
  - `network-diagram` (секция «Партнёрам») — исходник на `lovable.app` недоступен из среды сборки,
    поэтому **заглушка**: SVG-схема сети (узлы и связи) в цветах бренда на тёмном фоне `#0B0B0B`,
    квадрат 1:1. Заменяется одним файлом, когда пришлют оригинал.

## 5. Визуальная система (1:1 с макетом)

- Токены темы — ровно значения `THEMES.light` / `THEMES.dark` из макета
  (`--bg --surf --surf2 --ink --mut --line --acc --accText --deep --deepInk --deepMut --deepLine`).
- Каждое инлайн-стилевое значение макета переносится в CSS компонента без округлений:
  `clamp()`-размеры, `letter-spacing`, `line-height`, `padding`, `gap`, `border-radius`,
  `max-width` контейнеров (1280 / 900 px), `grid-template-columns` с `auto-fit/minmax`.
- Стили, которые макет вычислял в JS (`cascadeStyles`, `cardStyle`, `priceBox`, `btnStyle`, `pill`,
  стили кейсов `coverStyle/monoStyle/cardStyle/chipStyle/badgeStyle/wordStyle`, бары) — переносятся
  в CSS-классы/модификаторы; палитры кейсов — через CSS-переменные на карточке (`--c-bg`, `--c-ink`, `--c-acc`, `--c-chip`).
- Hover-эффекты (`style-hover` в макете) — в `:hover`.
- Точки перелома: меню/навигация — 1040 px (`isMobile = w < 1040`);
  сетка кейсов — ≥ 1100 px: 6 колонок (реальный кейс span 3, остальные span 2),
  ≥ 720 px: 2 колонки (реальный span 2), меньше — 1 колонка;
  обложка реального кейса 16/9 при > 1 колонке, иначе 16/10.
- Шапка: sticky, 72 px, `backdrop-filter: blur(16px)`, фон `color-mix(... 82%, transparent)`;
  якоря с `scroll-margin-top: 88px`.

## 6. Интерактив и тема

- **Тема**: инлайн-скрипт в `<head>` ставит `data-theme` до отрисовки: `localStorage['axon_theme2']` →
  `prefers-color-scheme` → `light`. Кнопка ☾/☀ переключает и сохраняет. `color-scheme` синхронизируется.
- **Язык**: ссылки `/`, `/ua/`, `/ru/`, активная — pill-стиль макета. Выбор сохраняется в
  `localStorage['axon_lang']`; на `/` при сохранённом `ua`/`ru` — `location.replace` на нужную версию.
- **Аккордеоны** (`<button aria-expanded aria-controls>` + панель):
  FAQ и услуги и кейсы — в группе открыт максимум один; по умолчанию открыты FAQ #1 и услуга #3
  («Web Development»); кейсы закрыты. Детали тарифов — независимы, по умолчанию закрыты.
  Знак `+`/`−` как в макете. Без JS панели открыты.
- **Карточки первого экрана** — ссылки на `#pricing`; клик раскрывает детали соответствующего тарифа.
- **Фильтр кейсов** — Все/Foundation/Growth/Scale, `aria-pressed`; смена фильтра закрывает открытый кейс.
- **Кнопки тарифов** — режим формы «заявка», выбор интереса = имя тарифа, прокрутка к `#contact`.
- **Мобильное меню** (< 1040 px): ≡/×, закрывается по ссылке и Esc; содержит CTA «Стратегическая сессия».
- Видимый `:focus-visible`, `prefers-reduced-motion` отключает плавную прокрутку и transition.

## 7. Форма и `api/lead`

**Клиент** (`contact-form.ts`):
- режимы `request` / `question` (как в макете: в `question` скрыты чипы интереса, меняются подписи);
- поля `name`, `contact`, `interest` (Foundation / Growth / Scale / single / any, повторный клик снимает выбор), `message`;
- скрытое поле-ловушка `website` и метка времени показа формы `startedAt`;
- валидация — общий модуль `src/lib/validate.ts` (те же правила на сервере):
  - `name`: непустой после trim, ≤ 100;
  - `contact`: `^@\w{3,}$` | `^\+?[\d\s()-]{7,}$` | `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤ 100;
  - `message` ≤ 2000; `interest` ∈ допустимых значений или пусто; `mode` ∈ {request, question}; `lang` ∈ {en, ua, ru};
- состояния: idle → sending (кнопка disabled, текст `form.sending`) → success (экран макета + «Отправить ещё») | error (`form.error`, данные сохраняются).

**Сервер** (`src/lib/lead.ts`, `handleLead(body, env, fetchFn) → { status, body }`):
- не JSON / не POST → 400 / 405;
- заполнена ловушка или `now - startedAt < 2000 мс` → 200 `{ok:true}` без отправки;
- невалидно → 400 `{ok:false, errors}`;
- отправка параллельно (`Promise.allSettled`):
  - Telegram: `POST https://api.telegram.org/bot<TOKEN>/sendMessage`, `parse_mode: HTML`, все значения экранированы;
  - Email: `POST https://api.resend.com/emails` (`from` = `LEAD_EMAIL_FROM`, `to` = `LEAD_EMAIL_TO`,
    `reply_to` = контакт, если это email; текст + HTML с экранированием);
- канал без переменных окружения пропускается; ни одного настроенного канала → 500 + лог;
- ≥ 1 канал успешен → 200 `{ok:true}`, сбой другого — `console.error`; все упали → 502.

Переменные окружения: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `LEAD_EMAIL_TO`,
`LEAD_EMAIL_FROM`, `SITE_URL`. Все документированы в `.env.example` и `README.md`.

## 8. SEO, производительность, деплой (часть 4)

**SEO**
- Для каждого языка: `<title>` (`AXON — {h1}`), `meta description` (= `sub`), `canonical`,
  `hreflang` en / uk / ru + `x-default` → `/`, Open Graph и Twitter Card, `og:locale` en_US / uk_UA / ru_RU.
- `og-image.png` 1200×630: логотип «AXON.», h1 EN, фон `#17150F`, акцент `#E4A93F`.
- JSON-LD `ProfessionalService` (name AXON, url, areaServed London/Dubai/New York).
- `sitemap-index.xml` через `@astrojs/sitemap`; `robots.txt` со ссылкой на sitemap.
- Домен: `SITE_URL` (по умолчанию `https://axon-website.vercel.app`), меняется одной переменной.
- `404.astro` — в стиле сайта, ссылки на три языковые версии.

**Производительность**
- Без внешних запросов при загрузке страницы (шрифты и картинки — свои).
- `preload` для Onest (latin/cyrillic по языку страницы), `font-display: swap`.
- Картинки ниже первого экрана — `loading="lazy"`, `decoding="async"`, явные `width/height`.
- JS один бандл `main.ts`, `type="module"`, ≤ 10 КБ gzip.

**Деплой (Vercel)**
- Framework preset Astro, `npm run build`, output `dist/`; `api/lead.ts` подхватывается Vercel как функция.
- `vercel.json`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
  `Cache-Control: public, max-age=31536000, immutable` для `/_astro/*`.
- GitHub Actions `ci.yml`: `npm ci` → `astro check` → `vitest run` → `astro build` → Playwright e2e.
- README: локальный запуск, переменные окружения (BotFather, chat id, Resend + домен), деплой на Vercel, подключение домена.

**Проверка соответствия дизайну**
- Скрипт `tests/visual/compare.ts`: открывает исходный макет (`design/AXON_Landing_v2.dc.html`
  + `support.js`, хранятся в репо как эталон; запросы макета к unpkg (React 18.3.1, ReactDOM, Babel standalone)
  перехватываются `page.route` и отдаются из локальных npm-пакетов-devDependencies) и собранный сайт в Playwright на 390 / 768 / 1280 / 1440 px,
  в обеих темах, сохраняет скриншоты рядом в `tests/visual/out/` для ручной сверки.
  Каждое расхождение исправляется или фиксируется в разделе 9.

## 9. Осознанные отличия от макета

1. Заявки не пишутся в `localStorage`, а отправляются в `api/lead`.
2. Две новые строки словаря на трёх языках: `form.sending` и `form.error`. Отдельных SEO-текстов нет — title и description строятся из `h1` и `sub`.
3. Язык переключается ссылками на отдельные URL вместо состояния в памяти.
4. Ширина экрана определяется CSS-медиазапросами вместо `window.innerWidth` (точки те же).
5. Заглушки для `tricho-logo` и `network-diagram` (раздел 4).

## 10. Вне рамок

CMS, аналитика/пиксели, cookie-баннер, блог, отдельные страницы кейсов, капча, хранение заявок в БД.
