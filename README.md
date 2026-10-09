# AXON — лендинг

Сайт студии AXON на [Astro](https://astro.build): три языковые версии (`/` — EN, `/ua/`, `/ru/`), светлая и тёмная тема,
форма заявки с отправкой в Telegram и на email. Вёрстка перенесена 1:1 из макета `design/AXON_Landing_v2.dc.html`.

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:4321
```

| Команда | Что делает |
|---|---|
| `npm run build` | собирает статический сайт в `dist/` |
| `npm run preview` | открывает собранный сайт локально |
| `npm run check` | проверка типов (Astro + TypeScript) |
| `npm test` | юнит-тесты (валидация, отправка заявок) |
| `npm run e2e` | браузерные тесты (нужен `npm run build`) |
| `npm run visual` | скриншоты «макет vs сайт» в `tests/visual/out/` (нужен запущенный `npm run preview`) |
| `npm run og` | перегенерировать `public/og-image.png` |

## Где что лежит

- `src/i18n/en.ts`, `ua.ts`, `ru.ts` — **все тексты сайта**. Правьте здесь; структура всех трёх файлов одинаковая.
- `src/data/raw.json` — цены тарифов и услуг, метрики и палитры кейсов, цвета тем.
- `src/assets/images/` — картинки (оптимизируются при сборке в AVIF/WebP).
- `src/components/` — секции страницы, `src/scripts/` — интерактив, `src/lib/` — валидация и отправка заявок.
- `api/lead.ts` — серверная функция Vercel, принимает заявки из формы.
- `design/` — исходный макет, эталон для визуальной сверки.

### Заглушки, которые стоит заменить

- `src/assets/images/tricho-logo.svg` — логотип TrichoTech (галерея кейса).
- `src/assets/images/network-diagram.svg` — картинка реферальной сети.

Положите настоящий файл с тем же именем (можно `.png`/`.jpg`/`.webp`, старый `.svg` удалите) — больше ничего менять не нужно.

## Заявки: Telegram и email

Форма отправляет данные на `/api/lead`. Функция шлёт заявку параллельно в Telegram и на email;
если настроен только один канал — работает он один. Ключи задаются переменными окружения
(локально — файл `.env` по образцу `.env.example`, на Vercel — Settings → Environment Variables).

| Переменная | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `TELEGRAM_CHAT_ID` | id чата/группы, куда слать заявки |
| `RESEND_API_KEY` | ключ API Resend |
| `LEAD_EMAIL_TO` | адрес, куда приходят заявки |
| `LEAD_EMAIL_FROM` | отправитель, например `AXON <hello@your-domain.com>` |
| `SITE_URL` | адрес сайта (canonical, sitemap, превью в соцсетях) |

**Telegram**
1. Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите токен (`TELEGRAM_BOT_TOKEN`).
2. Напишите своему боту любое сообщение (или добавьте бота в рабочую группу и напишите там).
3. Откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` — в ответе найдите `"chat":{"id":…}`. Это `TELEGRAM_CHAT_ID` (у групп он отрицательный).

**Email (Resend)**
1. Зарегистрируйтесь на [resend.com](https://resend.com), в разделе Domains добавьте свой домен и пропишите DNS-записи, которые он покажет.
2. Создайте API key → `RESEND_API_KEY`.
3. `LEAD_EMAIL_FROM` — адрес на подтверждённом домене, `LEAD_EMAIL_TO` — ваша почта.
   Если клиент оставил email, «Ответить» в письме сразу пишет ему.

Защита от спама: скрытое поле-ловушка и минимальное время заполнения формы (2 с).

## Деплой на Vercel

1. [vercel.com/new](https://vercel.com/new) → Import этого репозитория. Framework определится как **Astro**, настройки сборки берутся из `vercel.json`.
2. Добавьте переменные окружения из таблицы выше → **Deploy**.
3. Проверьте форму на опубликованном сайте — заявка должна прийти в Telegram и на почту.
   Ошибки отправки видны в Vercel → проект → Logs.
4. Свой домен: Settings → Domains → добавить домен и прописать DNS. После этого поменяйте `SITE_URL` на новый адрес и сделайте Redeploy.

## Отличия от макета

Перечислены в разделе 9 спецификации: `docs/superpowers/specs/2026-10-09-axon-landing-design.md`.
