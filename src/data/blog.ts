// Blog posts in EN / RU / UA, for search and AI assistants. Plain, useful answers to questions our clients really ask.
// Prices match the price list (src/data/raw.json SVC_PRICES and worker/chat.ts FACTS); never add numbers we cannot back up.
import type { Lang } from '../i18n';

type Body = [string, string[]][];
type Text = { title: string; desc: string; body: Body };
export type Post = { slug: string; date: string; t: Record<Lang, Text> };

export const BLOG_UI: Record<Lang, { h: string; title: string; desc: string; back: string; ctaH: string; ctaP: string; cta: string; starter: string; ask: string }> = {
  en: { h: 'Websites, AI and growth — explained simply', title: 'Vaxo Blog — websites, AI and growth, explained simply', desc: 'Plain answers about website prices, domains, AI chat assistants and growing a business online.', back: '← Blog', ctaH: 'Have a question about your project?', ctaP: 'Describe it in Workspace — Vax answers in seconds and starts the work right there. The first month of the platform is free.', cta: 'Ask Vax →', starter: 'Start free', ask: 'I read your article “{t}”. Help me apply it to my case — ask me what you need to know.' },
  ru: { h: 'Сайты, ИИ и рост бизнеса — простыми словами', title: 'Блог Vaxo — сайты, ИИ и рост бизнеса простыми словами', desc: 'Простые ответы о ценах на сайты, доменах, ИИ-чатах и росте бизнеса в интернете.', back: '← Блог', ctaH: 'Есть вопрос по вашему проекту?', ctaP: 'Опишите её в Workspace — Vax ответит за секунды и сразу начнёт работу. Первый месяц платформы бесплатно.', cta: 'Спросить Vax →', starter: 'Начать бесплатно', ask: 'Прочитал вашу статью «{t}». Помогите применить это к моей задаче — спросите, что нужно знать.' },
  ua: { h: 'Сайти, ШІ і зростання бізнесу — простими словами', title: 'Блог Vaxo — сайти, ШІ і зростання бізнесу простими словами', desc: 'Прості відповіді про ціни на сайти, домени, ШІ-чати і зростання бізнесу в інтернеті.', back: '← Блог', ctaH: 'Є питання щодо вашого проєкту?', ctaP: 'Опишіть її у Workspace — Vax відповість за секунди й одразу почне роботу. Перший місяць платформи безкоштовно.', cta: 'Запитати Vax →', starter: 'Почати безкоштовно', ask: 'Прочитав вашу статтю «{t}». Допоможіть застосувати це до моєї задачі — запитайте, що треба знати.' },
};

export const POSTS: Post[] = [
  {
    slug: 'online-booking-no-shows',
    date: '2026-11-10',
    t: {
      en: {
        title: 'Online booking for your business: fewer missed calls and no-shows',
        desc: 'How online booking works, why clients prefer it, how reminders cut no-shows, and what to set up first.',
        body: [
          ['Why clients want to book online', ['Many people decide in the evening or between tasks, when you cannot pick up the phone. If the only way to book is a call or a DM, some of them simply go to whoever lets them pick a time in one tap.']],
          ['What a good booking page has', ['Your services with prices and duration, real free slots, a short form (name, phone, time) and a clear confirmation. Nothing more: every extra field loses people.']],
          ['How to cut no-shows', ['Most no-shows are simply forgotten visits. Two things help: let the client add the visit to their own calendar right after booking, and send a short reminder the day before — in the messenger they actually use (WhatsApp, Viber or SMS).']],
          ['Keep your own day in order', ['Bookings should land in your calendar automatically, not in a notebook. A short morning summary — how many visits today and at what time — saves you from double bookings and surprises.']],
          ['What it costs at Vaxo', ['Online booking is part of the Vaxo platform from $39 a month: a booking page on your site, calendar links for clients, reminder buttons, your bookings in Google or iPhone calendar and a morning email. Describe your business in Workspace and Vax sets it up with you.']],
        ],
      },
      ru: {
        title: 'Онлайн-запись для бизнеса: меньше пропущенных звонков и неявок',
        desc: 'Как работает онлайн-запись, почему клиенты её любят, как напоминания снижают неявки и что настроить первым.',
        body: [
          ['Почему клиенты хотят записываться сами', ['Многие решают вечером или между делами, когда вы не можете взять трубку. Если записаться можно только звонком или в директ, часть людей просто уходит к тем, у кого время выбирается в одно касание.']],
          ['Что должно быть на странице записи', ['Услуги с ценой и длительностью, реальные свободные окна, короткая форма (имя, телефон, время) и понятное подтверждение. Больше ничего: каждое лишнее поле теряет людей.']],
          ['Как снизить неявки', ['Чаще всего клиент не пришёл, потому что просто забыл. Помогают две вещи: дать ему сразу после записи добавить визит в свой календарь и накануне отправить короткое напоминание — в том мессенджере, которым он правда пользуется (WhatsApp, Viber или SMS).']],
          ['Порядок в вашем дне', ['Записи должны сами попадать в ваш календарь, а не в блокнот. Короткая сводка утром — сколько визитов сегодня и во сколько — спасает от двойных записей и сюрпризов.']],
          ['Сколько стоит в Vaxo', ['Онлайн-запись входит в платформу Vaxo от $39 в месяц: страница записи на вашем сайте, ссылка «в календарь» для клиента, кнопки напоминаний, ваши записи в Google или iPhone календаре и письмо по утрам. Опишите свой бизнес в Workspace — Vax настроит всё вместе с вами.']],
        ],
      },
      ua: {
        title: 'Онлайн-запис для бізнесу: менше пропущених дзвінків і неявок',
        desc: 'Як працює онлайн-запис, чому клієнти його люблять, як нагадування зменшують неявки і що налаштувати першим.',
        body: [
          ['Чому клієнти хочуть записуватися самі', ['Багато хто вирішує ввечері або між справами, коли ви не можете взяти слухавку. Якщо записатися можна лише дзвінком чи в директ, частина людей просто йде до тих, у кого час обирається одним дотиком.']],
          ['Що має бути на сторінці запису', ['Послуги з ціною і тривалістю, реальні вільні вікна, коротка форма (імʼя, телефон, час) і зрозуміле підтвердження. Більше нічого: кожне зайве поле втрачає людей.']],
          ['Як зменшити неявки', ['Найчастіше клієнт не прийшов, бо просто забув. Допомагають дві речі: дати йому одразу після запису додати візит у свій календар і напередодні надіслати коротке нагадування — у тому месенджері, яким він справді користується (WhatsApp, Viber або SMS).']],
          ['Порядок у вашому дні', ['Записи мають самі потрапляти у ваш календар, а не в блокнот. Коротке зведення зранку — скільки візитів сьогодні й о котрій — рятує від подвійних записів і сюрпризів.']],
          ['Скільки коштує у Vaxo', ['Онлайн-запис входить у платформу Vaxo від $39 на місяць: сторінка запису на вашому сайті, посилання «в календар» для клієнта, кнопки нагадувань, ваші записи в Google або iPhone календарі й лист щоранку. Опишіть свій бізнес у Workspace — Vax налаштує все разом з вами.']],
        ],
      },
    },
  },
  {
    slug: 'website-cost-2026',
    date: '2026-10-20',
    t: {
      en: {
        title: 'How much does a website cost in 2026? Honest price ranges',
        desc: 'Real price ranges for a one-page site, a landing page, a business website and an online store — and what changes the price.',
        body: [
          ['The short answer', ['On the market, a templated freelancer page costs about $300–800, a custom freelancer page $500–2,000 and an agency landing page $2,000–10,000. At Vaxo, where AI does most of the work, the site is part of a monthly plan — Pro $39, Max $129 or Ultra $299 — with no big upfront bill. Anything custom is quoted up front, before you pay.']],
          ['What changes the price', ['Number of pages and unique designs.', 'Who writes the texts and makes the photos.', 'Features: booking, payments, accounts, integrations with your CRM.', 'Languages and markets.', 'Speed: a rushed deadline costs more.']],
          ['Costs people forget', ['Domain: about $10–15 a year.', 'Hosting: from free to $20+ a month depending on traffic.', 'Support and updates after launch.', 'Traffic: a site without ads, SEO or social media gets few visitors.']],
          ['How to spend less without losing quality', ['Start with one page that does one job (calls, bookings or requests) and grow later. At Vaxo the website comes inside the plan (from $39 a month) together with the AI chat, CRM and analytics — you describe what you need, we and AI build it.']],
          ['Questions to ask any studio', ['Is the price fixed? How many revision rounds are included? Who owns the domain and the code? What happens if the deadline is missed? What are the refund rules? Good studios answer all five in writing before you pay.']],
        ],
      },
      ru: {
        title: 'Сколько стоит сайт в 2026 году? Честные цены',
        desc: 'Реальные цены на одностраничник, лендинг, сайт компании и интернет-магазин — и от чего зависит цена.',
        body: [
          ['Коротко', ['На рынке страница у фрилансера по шаблону стоит около $300–800, индивидуальная у фрилансера — $500–2 000, лендинг в агентстве — $2 000–10 000. В Vaxo большую часть работы делает ИИ, поэтому сайт входит в подписку — Про $39, Макс $129 или Ультра $299 в месяц, без крупной суммы вперёд. Всё нестандартное оценивается заранее, до оплаты.']],
          ['От чего зависит цена', ['Сколько страниц и уникальных макетов.', 'Кто пишет тексты и делает фото.', 'Функции: запись, оплата, кабинеты, связь с CRM.', 'Языки и рынки.', 'Срочность: «нужно вчера» стоит дороже.']],
          ['О чём забывают', ['Домен: около $10–15 в год.', 'Хостинг: от бесплатного до $20+ в месяц.', 'Поддержка и обновления после запуска.', 'Трафик: без рекламы, SEO и соцсетей на сайт мало кто зайдёт.']],
          ['Как потратить меньше без потери качества', ['Начните с одной страницы, которая делает одно дело (звонки, записи или заявки), и растите дальше. В Vaxo сайт входит в подписку (от $39 в месяц) вместе с ИИ-чатом, CRM и аналитикой — вы описываете задачу, мы и ИИ делаем.']],
          ['Что спросить у любой студии', ['Цена фиксированная? Сколько кругов правок входит? Чьи домен и код? Что будет при срыве срока? Какие правила возврата? Хорошая студия письменно отвечает на все пять вопросов до оплаты.']],
        ],
      },
      ua: {
        title: 'Скільки коштує сайт у 2026 році? Чесні ціни',
        desc: 'Реальні ціни на односторінковий сайт, лендинг, сайт компанії та інтернет-магазин — і від чого залежить ціна.',
        body: [
          ['Коротко', ['На ринку сторінка у фрилансера за шаблоном коштує близько $300–800, індивідуальна у фрилансера — $500–2 000, лендинг в агенції — $2 000–10 000. У Vaxo більшу частину роботи робить ШІ, тому сайт входить у підписку — Про $39, Макс $129 або Ультра $299 на місяць, без великої суми наперед. Усе нестандартне оцінюється заздалегідь, до оплати.']],
          ['Від чого залежить ціна', ['Скільки сторінок і унікальних макетів.', 'Хто пише тексти й робить фото.', 'Функції: запис, оплата, кабінети, звʼязок з CRM.', 'Мови й ринки.', 'Терміновість: «треба вчора» коштує дорожче.']],
          ['Про що забувають', ['Домен: близько $10–15 на рік.', 'Хостинг: від безкоштовного до $20+ на місяць.', 'Підтримка й оновлення після запуску.', 'Трафік: без реклами, SEO і соцмереж на сайт мало хто зайде.']],
          ['Як витратити менше без втрати якості', ['Почніть з однієї сторінки, яка робить одну справу (дзвінки, записи чи заявки), і ростіть далі. У Vaxo сайт входить у підписку (від $39 на місяць) разом із ШІ-чатом, CRM і аналітикою — ви описуєте задачу, ми й ШІ робимо.']],
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
          ['Not sure? Ask', ['If this is your first website, our AI manager Vax explains each step in your chat, or we set up the domain for you — registered in your name.']],
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
        title: 'AI chat assistant for your website: what it does and what it costs',
        desc: 'What a website AI chat can and cannot do, how it gets you more requests, and what it costs.',
        body: [
          ['What it does', ['An AI chat on your website answers common questions 24/7 — prices, hours, services, booking — and collects the name and contact of people who are ready to buy. It replies in seconds, in the visitor’s language.']],
          ['Why it brings more clients', ['Visitors often leave when they cannot get a quick answer, especially at night or on weekends. A chat that answers at once and asks for a contact turns some of them into requests you can call back.']],
          ['What it should not do', ['Promise prices or results you do not offer, ask for card details, or pretend to be a human. A good assistant says it is an AI and hands over to you when the question is complex.']],
          ['What it costs', ['At Vaxo an AI chat for your website is included in every plan from $39 a month, trained on your services, prices and FAQ, with new requests sent to your email or Telegram. Try ours first — Vax in our Workspace — before you decide.']],
          ['How to get the most from it', ['Give it your real prices and answers to the 20 questions customers ask most. Read the conversations once a week and add what it did not know.']],
        ],
      },
      ru: {
        title: 'ИИ-чат для сайта: что умеет и сколько стоит',
        desc: 'Что может и чего не может ИИ-чат на сайте, как он приносит больше заявок и сколько стоит.',
        body: [
          ['Что он делает', ['ИИ-чат на сайте отвечает на частые вопросы 24/7 — цены, часы работы, услуги, запись — и собирает имя и контакт тех, кто готов купить. Отвечает за секунды и на языке посетителя.']],
          ['Почему это приносит клиентов', ['Посетители часто уходят, если не получили быстрый ответ, особенно ночью и в выходные. Чат, который отвечает сразу и просит контакт, превращает часть из них в заявки, которым можно перезвонить.']],
          ['Чего он делать не должен', ['Обещать цены или результаты, которых нет, просить данные карты или притворяться человеком. Хороший ассистент честно говорит, что он ИИ, и передаёт сложный вопрос вам.']],
          ['Сколько стоит', ['В Vaxo ИИ-чат для вашего сайта входит в любой тариф от $39 в месяц: обучен на ваших услугах, ценах и частых вопросах, новые заявки приходят на почту или в Telegram. Сначала попробуйте нашего — Vax в Workspace, — потом решайте.']],
          ['Как получить максимум', ['Дайте ему реальные цены и ответы на 20 самых частых вопросов. Раз в неделю читайте переписки и добавляйте то, чего он не знал.']],
        ],
      },
      ua: {
        title: 'ШІ-чат для сайту: що вміє і скільки коштує',
        desc: 'Що може і чого не може ШІ-чат на сайті, як він приносить більше заявок і скільки коштує.',
        body: [
          ['Що він робить', ['ШІ-чат на сайті відповідає на часті питання 24/7 — ціни, години роботи, послуги, запис — і збирає імʼя та контакт тих, хто готовий купити. Відповідає за секунди і мовою відвідувача.']],
          ['Чому це приносить клієнтів', ['Відвідувачі часто йдуть, якщо не отримали швидку відповідь, особливо вночі й у вихідні. Чат, що відповідає одразу й просить контакт, перетворює частину з них на заявки, яким можна передзвонити.']],
          ['Чого він робити не повинен', ['Обіцяти ціни чи результати, яких немає, просити дані картки або вдавати людину. Хороший асистент чесно каже, що він ШІ, і передає складне питання вам.']],
          ['Скільки коштує', ['У Vaxo ШІ-чат для вашого сайту входить у будь-який тариф від $39 на місяць: навчений на ваших послугах, цінах і частих питаннях, нові заявки надходять на пошту або в Telegram. Спершу спробуйте нашого — Vax у Workspace, — потім вирішуйте.']],
          ['Як отримати максимум', ['Дайте йому реальні ціни й відповіді на 20 найчастіших питань. Раз на тиждень читайте листування й додавайте те, чого він не знав.']],
        ],
      },
    },
  },
];
