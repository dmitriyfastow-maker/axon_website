// Blog posts in EN / RU / UA, for search and AI assistants. Plain, useful answers to questions our clients really ask.
// Prices match the price list (src/data/raw.json SVC_PRICES and worker/chat.ts FACTS); never add numbers we cannot back up.
import type { Lang } from '../i18n';

type Body = [string, string[]][];
type Text = { title: string; desc: string; body: Body };
export type Post = { slug: string; date: string; t: Record<Lang, Text> };

export const BLOG_UI: Record<Lang, { h: string; title: string; desc: string; back: string; ctaH: string; ctaP: string; cta: string; starter: string }> = {
  en: { h: 'Websites, AI and growth — explained simply', title: 'Vaxo Blog — websites, AI and growth, explained simply', desc: 'Plain answers about website prices, domains, AI chat assistants and growing a business online.', back: '← Blog', ctaH: 'Have a question about your project?', ctaP: 'Vax, our AI manager, answers in seconds. Or start small with a starter package from $149.', cta: 'Get a quote →', starter: 'Starter packages' },
  ru: { h: 'Сайты, ИИ и рост бизнеса — простыми словами', title: 'Блог Vaxo — сайты, ИИ и рост бизнеса простыми словами', desc: 'Простые ответы о ценах на сайты, доменах, ИИ-чатах и росте бизнеса в интернете.', back: '← Блог', ctaH: 'Есть вопрос по вашему проекту?', ctaP: 'Vax, наш ИИ-менеджер, ответит за секунды. Или начните с малого — стартовые пакеты от $149.', cta: 'Узнать цену →', starter: 'Стартовые пакеты' },
  ua: { h: 'Сайти, ШІ і зростання бізнесу — простими словами', title: 'Блог Vaxo — сайти, ШІ і зростання бізнесу простими словами', desc: 'Прості відповіді про ціни на сайти, домени, ШІ-чати і зростання бізнесу в інтернеті.', back: '← Блог', ctaH: 'Є питання щодо вашого проєкту?', ctaP: 'Vax, наш ШІ-менеджер, відповість за секунди. Або почніть з малого — стартові пакети від $149.', cta: 'Дізнатися ціну →', starter: 'Стартові пакети' },
};

export const POSTS: Post[] = [
  {
    slug: 'website-cost-2026',
    date: '2026-10-20',
    t: {
      en: {
        title: 'How much does a website cost in 2026? Honest price ranges',
        desc: 'Real price ranges for a one-page site, a landing page, a business website and an online store — and what changes the price.',
        body: [
          ['The short answer', ['On the market, a templated freelancer page costs about $300–800, a custom freelancer page $500–2,000 and an agency landing page $2,000–10,000. At Vaxo, where AI does most of the work, a one-page site starts at $199, a landing page is $400–1,500, a multi-page website $900–3,500 and an online store $1,500–6,000.']],
          ['What changes the price', ['Number of pages and unique designs.', 'Who writes the texts and makes the photos.', 'Features: booking, payments, accounts, integrations with your CRM.', 'Languages and markets.', 'Speed: a rushed deadline costs more.']],
          ['Costs people forget', ['Domain: about $10–15 a year.', 'Hosting: from free to $20+ a month depending on traffic.', 'Support and updates after launch.', 'Traffic: a site without ads, SEO or social media gets few visitors.']],
          ['How to spend less without losing quality', ['Start with one page that does one job (calls, bookings or requests) and grow later. At Vaxo a one-page website is a $199 starter package, and its price is credited if you continue with a bigger project within 30 days.']],
          ['Questions to ask any studio', ['Is the price fixed? How many revision rounds are included? Who owns the domain and the code? What happens if the deadline is missed? What are the refund rules? Good studios answer all five in writing before you pay.']],
        ],
      },
      ru: {
        title: 'Сколько стоит сайт в 2026 году? Честные цены',
        desc: 'Реальные цены на одностраничник, лендинг, сайт компании и интернет-магазин — и от чего зависит цена.',
        body: [
          ['Коротко', ['На рынке страница у фрилансера по шаблону стоит около $300–800, индивидуальная у фрилансера — $500–2 000, лендинг в агентстве — $2 000–10 000. В Vaxo большую часть работы делает ИИ, поэтому одностраничник — от $199, лендинг — $400–1 500, многостраничный сайт — $900–3 500, интернет-магазин — $1 500–6 000.']],
          ['От чего зависит цена', ['Сколько страниц и уникальных макетов.', 'Кто пишет тексты и делает фото.', 'Функции: запись, оплата, кабинеты, связь с CRM.', 'Языки и рынки.', 'Срочность: «нужно вчера» стоит дороже.']],
          ['О чём забывают', ['Домен: около $10–15 в год.', 'Хостинг: от бесплатного до $20+ в месяц.', 'Поддержка и обновления после запуска.', 'Трафик: без рекламы, SEO и соцсетей на сайт мало кто зайдёт.']],
          ['Как потратить меньше без потери качества', ['Начните с одной страницы, которая делает одно дело (звонки, записи или заявки), и растите дальше. В Vaxo одностраничник — стартовый пакет за $199, и его цена засчитывается, если в течение 30 дней вы продолжаете с большим проектом.']],
          ['Что спросить у любой студии', ['Цена фиксированная? Сколько кругов правок входит? Чьи домен и код? Что будет при срыве срока? Какие правила возврата? Хорошая студия письменно отвечает на все пять вопросов до оплаты.']],
        ],
      },
      ua: {
        title: 'Скільки коштує сайт у 2026 році? Чесні ціни',
        desc: 'Реальні ціни на односторінковий сайт, лендинг, сайт компанії та інтернет-магазин — і від чого залежить ціна.',
        body: [
          ['Коротко', ['На ринку сторінка у фрилансера за шаблоном коштує близько $300–800, індивідуальна у фрилансера — $500–2 000, лендинг в агенції — $2 000–10 000. У Vaxo більшу частину роботи робить ШІ, тому односторінковий сайт — від $199, лендинг — $400–1 500, багатосторінковий сайт — $900–3 500, інтернет-магазин — $1 500–6 000.']],
          ['Від чого залежить ціна', ['Скільки сторінок і унікальних макетів.', 'Хто пише тексти й робить фото.', 'Функції: запис, оплата, кабінети, звʼязок з CRM.', 'Мови й ринки.', 'Терміновість: «треба вчора» коштує дорожче.']],
          ['Про що забувають', ['Домен: близько $10–15 на рік.', 'Хостинг: від безкоштовного до $20+ на місяць.', 'Підтримка й оновлення після запуску.', 'Трафік: без реклами, SEO і соцмереж на сайт мало хто зайде.']],
          ['Як витратити менше без втрати якості', ['Почніть з однієї сторінки, яка робить одну справу (дзвінки, записи чи заявки), і ростіть далі. У Vaxo односторінковий сайт — стартовий пакет за $199, і його ціна зараховується, якщо протягом 30 днів ви продовжуєте з більшим проєктом.']],
          ['Що запитати в будь-якої студії', ['Ціна фіксована? Скільки кіл правок входить? Чиї домен і код? Що буде при зриві строку? Які правила повернення? Хороша студія письмово відповідає на всі пʼять питань до оплати.']],
        ],
      },
    },
  },
  {
    slug: 'what-is-a-domain',
    date: '2026-10-20',
    t: {
      en: {
        title: 'What is a domain name and how do you get one? A plain-English guide',
        desc: 'What a domain is, where to buy it, how much it costs and how to give a web studio access without giving away your account.',
        body: [
          ['A domain is your address', ['A domain is the name people type to find your site, like yourbusiness.com. You rent it by the year from a registrar. Without a domain your website has no address of its own.']],
          ['Where to buy', ['Popular registrars include Cloudflare, Namecheap and GoDaddy. A .com usually costs about $10–15 a year. Watch for a cheap first year and a much higher renewal price.']],
          ['How to choose a name', ['Short, easy to say and spell, no hyphens if possible. Check that the same name is free on Instagram and TikTok. A local ending (.de, .co.uk, .com.ua) can help if you only sell in one country.']],
          ['Keep it in your name', ['Always register the domain on your own account and email. A studio should get access to set it up, not own it.']],
          ['How to give access safely', ['Most registrars let you invite a team member or change the DNS records yourself while we tell you exactly what to paste. You never need to send your password.']],
          ['Not sure? Ask', ['If this is your first website, our AI manager Vax explains each step in your chat, or we buy and set up the domain for you in your name.']],
        ],
      },
      ru: {
        title: 'Что такое домен и как его получить? Простое объяснение',
        desc: 'Что такое домен, где купить, сколько стоит и как дать студии доступ, не отдавая свой аккаунт.',
        body: [
          ['Домен — это адрес', ['Домен — это имя, которое люди вводят, чтобы найти ваш сайт, например yourbusiness.com. Его арендуют на год у регистратора. Без домена у сайта нет собственного адреса.']],
          ['Где купить', ['Популярные регистраторы — Cloudflare, Namecheap, GoDaddy. Домен .com обычно стоит около $10–15 в год. Осторожно с дешёвым первым годом и дорогим продлением.']],
          ['Как выбрать имя', ['Коротко, легко произнести и написать, по возможности без дефисов. Проверьте, свободно ли такое же имя в Instagram и TikTok. Местная зона (.com.ua, .de) помогает, если продаёте в одной стране.']],
          ['Оформляйте на себя', ['Регистрируйте домен на свой аккаунт и почту. Студия получает доступ для настройки, а не владеет доменом.']],
          ['Как дать доступ безопасно', ['У большинства регистраторов можно пригласить участника команды или самому поменять DNS-записи, пока мы подсказываем, что вставить. Пароль отправлять не нужно никогда.']],
          ['Не уверены? Спросите', ['Если это ваш первый сайт, ИИ-менеджер Vax объяснит каждый шаг в чате, или мы купим и настроим домен за вас — на ваше имя.']],
        ],
      },
      ua: {
        title: 'Що таке домен і як його отримати? Просте пояснення',
        desc: 'Що таке домен, де купити, скільки коштує і як дати студії доступ, не віддаючи свій акаунт.',
        body: [
          ['Домен — це адреса', ['Домен — це імʼя, яке люди вводять, щоб знайти ваш сайт, наприклад yourbusiness.com. Його орендують на рік у реєстратора. Без домену в сайту немає власної адреси.']],
          ['Де купити', ['Популярні реєстратори — Cloudflare, Namecheap, GoDaddy. Домен .com зазвичай коштує близько $10–15 на рік. Обережно з дешевим першим роком і дорогим продовженням.']],
          ['Як обрати імʼя', ['Коротко, легко вимовити й написати, за можливості без дефісів. Перевірте, чи вільне таке саме імʼя в Instagram і TikTok. Місцева зона (.com.ua, .de) допомагає, якщо продаєте в одній країні.']],
          ['Оформлюйте на себе', ['Реєструйте домен на свій акаунт і пошту. Студія отримує доступ для налаштування, а не володіє доменом.']],
          ['Як дати доступ безпечно', ['У більшості реєстраторів можна запросити учасника команди або самому змінити DNS-записи, поки ми підказуємо, що вставити. Пароль надсилати не потрібно ніколи.']],
          ['Не впевнені? Запитайте', ['Якщо це ваш перший сайт, ШІ-менеджер Vax пояснить кожен крок у чаті, або ми купимо й налаштуємо домен за вас — на ваше імʼя.']],
        ],
      },
    },
  },
  {
    slug: 'ai-chat-assistant-small-business',
    date: '2026-10-20',
    t: {
      en: {
        title: 'AI chat assistant for a small business: what it does and what it costs',
        desc: 'What a website AI chat can and cannot do, how it gets you more requests, and what it costs.',
        body: [
          ['What it does', ['An AI chat on your website answers common questions 24/7 — prices, hours, services, booking — and collects the name and contact of people who are ready to buy. It replies in seconds, in the visitor’s language.']],
          ['Why it brings more clients', ['Visitors often leave when they cannot get a quick answer, especially at night or on weekends. A chat that answers at once and asks for a contact turns some of them into requests you can call back.']],
          ['What it should not do', ['Promise prices or results you do not offer, ask for card details, or pretend to be a human. A good assistant says it is an AI and hands over to you when the question is complex.']],
          ['What it costs', ['At Vaxo an AI chat assistant for your website is a $249 starter package, trained on your services, prices and FAQ, with new requests sent to your email or Telegram. Try ours — Vax, the raccoon on our site — before you decide.']],
          ['How to get the most from it', ['Give it your real prices and answers to the 20 questions customers ask most. Read the conversations once a week and add what it did not know.']],
        ],
      },
      ru: {
        title: 'ИИ-чат для малого бизнеса: что умеет и сколько стоит',
        desc: 'Что может и чего не может ИИ-чат на сайте, как он приносит больше заявок и сколько стоит.',
        body: [
          ['Что он делает', ['ИИ-чат на сайте отвечает на частые вопросы 24/7 — цены, часы работы, услуги, запись — и собирает имя и контакт тех, кто готов купить. Отвечает за секунды и на языке посетителя.']],
          ['Почему это приносит клиентов', ['Посетители часто уходят, если не получили быстрый ответ, особенно ночью и в выходные. Чат, который отвечает сразу и просит контакт, превращает часть из них в заявки, которым можно перезвонить.']],
          ['Чего он делать не должен', ['Обещать цены или результаты, которых нет, просить данные карты или притворяться человеком. Хороший ассистент честно говорит, что он ИИ, и передаёт сложный вопрос вам.']],
          ['Сколько стоит', ['В Vaxo ИИ-чат для вашего сайта — стартовый пакет за $249: обучен на ваших услугах, ценах и частых вопросах, новые заявки приходят на почту или в Telegram. Попробуйте нашего — енот Vax на сайте — прежде чем решать.']],
          ['Как получить максимум', ['Дайте ему реальные цены и ответы на 20 самых частых вопросов. Раз в неделю читайте переписки и добавляйте то, чего он не знал.']],
        ],
      },
      ua: {
        title: 'ШІ-чат для малого бізнесу: що вміє і скільки коштує',
        desc: 'Що може і чого не може ШІ-чат на сайті, як він приносить більше заявок і скільки коштує.',
        body: [
          ['Що він робить', ['ШІ-чат на сайті відповідає на часті питання 24/7 — ціни, години роботи, послуги, запис — і збирає імʼя та контакт тих, хто готовий купити. Відповідає за секунди і мовою відвідувача.']],
          ['Чому це приносить клієнтів', ['Відвідувачі часто йдуть, якщо не отримали швидку відповідь, особливо вночі й у вихідні. Чат, що відповідає одразу й просить контакт, перетворює частину з них на заявки, яким можна передзвонити.']],
          ['Чого він робити не повинен', ['Обіцяти ціни чи результати, яких немає, просити дані картки або вдавати людину. Хороший асистент чесно каже, що він ШІ, і передає складне питання вам.']],
          ['Скільки коштує', ['У Vaxo ШІ-чат для вашого сайту — стартовий пакет за $249: навчений на ваших послугах, цінах і частих питаннях, нові заявки надходять на пошту або в Telegram. Спробуйте нашого — єнот Vax на сайті — перш ніж вирішувати.']],
          ['Як отримати максимум', ['Дайте йому реальні ціни й відповіді на 20 найчастіших питань. Раз на тиждень читайте листування й додавайте те, чого він не знав.']],
        ],
      },
    },
  },
];
