// Blog posts in EN / RU / UA, for search and AI assistants. Plain, useful answers to questions our clients really ask.
// Prices match the price list (src/data/raw.json SVC_PRICES and worker/chat.ts FACTS); never add numbers we cannot back up.
import type { Lang } from '../i18n';

type Body = [string, string[]][];
type Text = { title: string; desc: string; body: Body };
export type Post = { slug: string; date: string; t: Record<Lang, Text> };

export const BLOG_UI: Record<Lang, { h: string; title: string; desc: string; back: string; ctaH: string; ctaP: string; cta: string; starter: string; ask: string }> = {
  en: { h: 'Websites, AI and growth — explained simply', title: 'Vaxo Blog — websites, AI and growth, explained simply', desc: 'Plain answers about website prices, domains, AI chat assistants and growing a business online.', back: '← Blog', ctaH: 'Have a question about your project?', ctaP: 'Describe it in Workspace — Vax answers in seconds and starts the work right there. There is a free plan with all features.', cta: 'Ask Vax →', starter: 'Start free', ask: 'I read your article “{t}”. Help me apply it to my case — ask me what you need to know.' },
  ru: { h: 'Сайты, ИИ и рост бизнеса — простыми словами', title: 'Блог Vaxo — сайты, ИИ и рост бизнеса простыми словами', desc: 'Простые ответы о ценах на сайты, доменах, ИИ-чатах и росте бизнеса в интернете.', back: '← Блог', ctaH: 'Есть вопрос по вашему проекту?', ctaP: 'Опишите его в Workspace — Vax ответит за секунды и сразу начнёт работу. Есть бесплатный тариф со всеми функциями.', cta: 'Спросить Vax →', starter: 'Начать бесплатно', ask: 'Прочитал вашу статью «{t}». Помогите применить это к моей задаче — спросите, что нужно знать.' },
  ua: { h: 'Сайти, ШІ і зростання бізнесу — простими словами', title: 'Блог Vaxo — сайти, ШІ і зростання бізнесу простими словами', desc: 'Прості відповіді про ціни на сайти, домени, ШІ-чати і зростання бізнесу в інтернеті.', back: '← Блог', ctaH: 'Є питання щодо вашого проєкту?', ctaP: 'Опишіть його у Workspace — Vax відповість за секунди й одразу почне роботу. Є безкоштовний тариф з усіма функціями.', cta: 'Запитати Vax →', starter: 'Почати безкоштовно', ask: 'Прочитав вашу статтю «{t}». Допоможіть застосувати це до моєї задачі — запитайте, що треба знати.' },
};

export const POSTS: Post[] = [
  {
    slug: 'how-to-ask-ai-get-finished-result',
    date: '2026-11-14',
    t: {
      en: {
        title: 'How to ask AI and get a finished result: 6 simple rules',
        desc: 'Why AI often gives vague answers and how to ask so you get a ready plan, text or table on the first try — with examples for home, work and business.',
        body: [
          ['Why answers come out vague', ['AI does not know your situation. When the request is short, it fills the gaps with averages and gives general advice. The fix is not magic words — it is a few facts that only you know.']],
          ['1. Say what you want to get in the end', ['Not “help with a trip”, but “a day-by-day plan for 5 days in Rome for two, with prices and a total”. Name the form of the result: a table, a list, a ready message, a page text.']],
          ['2. Give the facts: who, where, when, how much', ['Budget, dates, city, how many people, who it is for. “Menu for a week for a family of four, $80 budget, no fish” gives a usable answer; “healthy menu” does not.']],
          ['3. Add limits and what you do not want', ['“No more than 1 hour of cooking a day”, “without loans”, “formal tone”, “short — up to 5 lines”. Limits make the answer fit your life instead of an ideal one.']],
          ['4. Show an example', ['If you like a style, paste a sample: a message you once wrote, a site you like, a format from work. One example says more than a paragraph of explanations.']],
          ['5. Ask for the result first, questions after', ['Write “do it now with reasonable assumptions, and list them in one line”. You get a draft right away and correct it, instead of answering ten questions first.']],
          ['6. Improve in small steps', ['“Make it cheaper”, “shorter”, “add a day in Florence”, “rewrite for a client who is angry”. Each short follow-up keeps everything that was already good.']],
          ['Ready examples you can copy', ['Home: “Plan a move from Kyiv to Lviv in 3 weeks: a checklist by days, a budget table, who to call first.”', 'Work: “Write a polite reminder to a client who has not paid for 10 days. Two versions: soft and firm. Up to 6 lines.”', 'Business: “I run a small bakery. Make a page text for the site: what we bake, prices from my list, how to order, 5 common questions.”']],
          ['How Vaxo helps', ['In Workspace you just describe the task in your own words — Vax asks only what is truly missing, gives a finished result right on the canvas and keeps improving it with you. You can start for free; paid plans start at $19 a month.']],
        ],
      },
      ru: {
        title: 'Как попросить ИИ и получить готовый результат: 6 простых правил',
        desc: 'Почему ИИ часто отвечает общими словами и как просить, чтобы с первого раза получить готовый план, текст или таблицу — с примерами для дома, работы и бизнеса.',
        body: [
          ['Почему ответы выходят общими', ['ИИ не знает вашей ситуации. Когда запрос короткий, он заполняет пробелы средним и даёт общие советы. Помогают не «волшебные слова», а несколько фактов, которые знаете только вы.']],
          ['1. Скажите, что хотите получить в конце', ['Не «помоги с поездкой», а «план по дням на 5 дней в Риме на двоих, с ценами и итогом». Назовите форму результата: таблица, список, готовое сообщение, текст страницы.']],
          ['2. Дайте факты: кто, где, когда, сколько', ['Бюджет, даты, город, сколько людей, для кого. «Меню на неделю для семьи из четырёх, бюджет $80, без рыбы» даёт рабочий ответ; «здоровое меню» — нет.']],
          ['3. Добавьте ограничения и чего не нужно', ['«Готовить не больше часа в день», «без кредитов», «официальный тон», «коротко — до 5 строк». Ограничения подгоняют ответ под вашу жизнь, а не под идеальную.']],
          ['4. Покажите пример', ['Если нравится какой-то стиль — вставьте образец: сообщение, которое вы когда-то писали, сайт, который нравится, формат с работы. Один пример говорит больше абзаца объяснений.']],
          ['5. Сначала результат, вопросы потом', ['Напишите «сделай сразу с разумными допущениями и перечисли их одной строкой». Вы сразу получаете черновик и правите его, а не отвечаете сначала на десять вопросов.']],
          ['6. Улучшайте маленькими шагами', ['«Сделай дешевле», «короче», «добавь день во Флоренции», «перепиши для клиента, который злится». Каждая короткая просьба сохраняет всё, что уже было хорошо.']],
          ['Готовые примеры, можно копировать', ['Дом: «Спланируй переезд из Киева во Львов за 3 недели: чек-лист по дням, таблица бюджета, кому звонить первым».', 'Работа: «Напиши вежливое напоминание клиенту, который не платит 10 дней. Два варианта: мягкий и твёрдый. До 6 строк».', 'Бизнес: «У меня маленькая пекарня. Сделай текст страницы для сайта: что печём, цены из моего списка, как заказать, 5 частых вопросов».']],
          ['Чем помогает Vaxo', ['В Workspace вы просто описываете задачу своими словами — Vax спрашивает только то, чего правда не хватает, даёт готовый результат прямо на холсте и дальше улучшает его вместе с вами. Начать можно бесплатно; платные тарифы — от $19 в месяц.']],
        ],
      },
      ua: {
        title: 'Як попросити ШІ й отримати готовий результат: 6 простих правил',
        desc: 'Чому ШІ часто відповідає загальними словами і як просити, щоб з першого разу отримати готовий план, текст чи таблицю — з прикладами для дому, роботи й бізнесу.',
        body: [
          ['Чому відповіді виходять загальними', ['ШІ не знає вашої ситуації. Коли запит короткий, він заповнює прогалини середнім і дає загальні поради. Допомагають не «чарівні слова», а кілька фактів, які знаєте тільки ви.']],
          ['1. Скажіть, що хочете отримати в кінці', ['Не «допоможи з поїздкою», а «план по днях на 5 днів у Римі на двох, з цінами й підсумком». Назвіть форму результату: таблиця, список, готове повідомлення, текст сторінки.']],
          ['2. Дайте факти: хто, де, коли, скільки', ['Бюджет, дати, місто, скільки людей, для кого. «Меню на тиждень для родини з чотирьох, бюджет $80, без риби» дає робочу відповідь; «здорове меню» — ні.']],
          ['3. Додайте обмеження і чого не треба', ['«Готувати не більше години на день», «без кредитів», «офіційний тон», «коротко — до 5 рядків». Обмеження підганяють відповідь під ваше життя, а не під ідеальне.']],
          ['4. Покажіть приклад', ['Якщо подобається якийсь стиль — вставте зразок: повідомлення, яке ви колись писали, сайт, який подобається, формат з роботи. Один приклад каже більше за абзац пояснень.']],
          ['5. Спершу результат, питання потім', ['Напишіть «зроби одразу з розумними припущеннями й перелічи їх одним рядком». Ви одразу отримуєте чернетку й правите її, а не відповідаєте спершу на десять питань.']],
          ['6. Покращуйте маленькими кроками', ['«Зроби дешевше», «коротше», «додай день у Флоренції», «перепиши для клієнта, який злиться». Кожне коротке прохання зберігає все, що вже було добре.']],
          ['Готові приклади, можна копіювати', ['Дім: «Сплануй переїзд з Києва до Львова за 3 тижні: чек-лист по днях, таблиця бюджету, кому дзвонити першим».', 'Робота: «Напиши ввічливе нагадування клієнту, який не платить 10 днів. Два варіанти: м’який і твердий. До 6 рядків».', 'Бізнес: «У мене маленька пекарня. Зроби текст сторінки для сайту: що печемо, ціни з мого списку, як замовити, 5 частих питань».']],
          ['Чим допомагає Vaxo', ['У Workspace ви просто описуєте задачу своїми словами — Vax питає лише те, чого справді бракує, дає готовий результат прямо на полотні й далі покращує його разом з вами. Почати можна безкоштовно; платні тарифи — від $19 на місяць.']],
        ],
      },
    },
  },
  {
    slug: 'seo-basics-get-found-on-google',
    date: '2026-11-11',
    t: {
      en: {
        title: 'SEO in plain words: 7 things that help Google find your site',
        desc: 'What SEO is, what really matters for a small site and what you can do yourself this week — without jargon and without promises of “top 1 in a month”.',
        body: [
          ['What SEO is', ['SEO is everything that helps people find your site in Google when they search for what you sell. It is not a trick and not a one-time setting: Google shows pages that answer the question best and that people trust.']],
          ['1. One page — one question', ['Each page should answer one search: “nail studio in Lviv”, “price of roof repair”, “dentist open on Sunday”. A page about everything ranks for nothing. Write the words your clients actually type, not internal terms.']],
          ['2. A clear title and description', ['The page title and the short description are what people see in search results. Put the service and the city in the title, and one honest reason to click in the description. Keep the title under about 60 characters.']],
          ['3. Speed and phones', ['Most searches come from phones. If a page loads slowly or the text is tiny, people leave and Google notices. Check your site free at pagespeed.web.dev — it shows what slows the page down.']],
          ['4. Real text, written for people', ['Prices, how you work, answers to common questions, photos of real work. Pages with useful detail do better than pages with slogans. Copied text from other sites does not help.']],
          ['5. Google Business Profile', ['For a local business this is often more important than the site itself: the map card with address, hours, photos and reviews. It is free. Fill it in fully and ask happy clients for reviews.']],
          ['6. Search Console', ['The free Google Search Console shows which searches bring people and which pages Google sees. Add your site, send the sitemap and look once a week — that is enough to start.']],
          ['7. Patience and honesty', ['A new site usually needs weeks or months to show up, and nobody can honestly guarantee first place. Be careful with anyone who does. Steady useful pages and real reviews win over time.']],
          ['How Vaxo helps', ['Describe your business in Workspace and Vax writes the pages, titles and descriptions in your clients’ words, and you can ask it to check any page: “what should I improve for Google?”. You can start for free; paid plans start at $19 a month.']],
        ],
      },
      ru: {
        title: 'SEO простыми словами: 7 вещей, чтобы Google нашёл ваш сайт',
        desc: 'Что такое SEO, что на самом деле важно для небольшого сайта и что можно сделать самому уже на этой неделе — без терминов и без обещаний «топ-1 за месяц».',
        body: [
          ['Что такое SEO', ['SEO — это всё, что помогает людям найти ваш сайт в Google, когда они ищут то, что вы продаёте. Это не хитрость и не разовая настройка: Google показывает страницы, которые лучше всех отвечают на вопрос и которым доверяют люди.']],
          ['1. Одна страница — один вопрос', ['Каждая страница должна отвечать на один запрос: «студия маникюра во Львове», «цена ремонта крыши», «стоматолог в воскресенье». Страница обо всём не находится ни по чему. Пишите словами, которые набирают клиенты, а не внутренними терминами.']],
          ['2. Понятный заголовок и описание', ['Заголовок страницы и короткое описание — это то, что человек видит в результатах поиска. В заголовок — услугу и город, в описание — одну честную причину нажать. Заголовок лучше держать примерно до 60 символов.']],
          ['3. Скорость и телефон', ['Большинство ищет с телефона. Если страница грузится долго или текст мелкий, люди уходят, и Google это замечает. Проверьте сайт бесплатно на pagespeed.web.dev — он покажет, что тормозит страницу.']],
          ['4. Настоящий текст для людей', ['Цены, как вы работаете, ответы на частые вопросы, фото реальных работ. Страницы с полезными подробностями работают лучше страниц с лозунгами. Текст, скопированный с чужих сайтов, не помогает.']],
          ['5. Профиль компании в Google', ['Для местного бизнеса это часто важнее самого сайта: карточка на карте с адресом, часами работы, фото и отзывами. Это бесплатно. Заполните её полностью и просите довольных клиентов оставить отзыв.']],
          ['6. Search Console', ['Бесплатная Google Search Console показывает, по каким запросам приходят люди и какие страницы видит Google. Добавьте сайт, отправьте карту сайта и заглядывайте раз в неделю — для начала этого хватит.']],
          ['7. Терпение и честность', ['Новому сайту обычно нужны недели или месяцы, чтобы появиться в поиске, и честно гарантировать первое место не может никто. Осторожнее с теми, кто гарантирует. Со временем выигрывают полезные страницы и настоящие отзывы.']],
          ['Чем помогает Vaxo', ['Опишите свой бизнес в Workspace — Vax напишет страницы, заголовки и описания словами ваших клиентов, а любую страницу можно попросить проверить: «что улучшить для Google?». Начать можно бесплатно; платные тарифы — от $19 в месяц.']],
        ],
      },
      ua: {
        title: 'SEO простими словами: 7 речей, щоб Google знайшов ваш сайт',
        desc: 'Що таке SEO, що насправді важливо для невеликого сайту і що можна зробити самому вже цього тижня — без термінів і без обіцянок «топ-1 за місяць».',
        body: [
          ['Що таке SEO', ['SEO — це все, що допомагає людям знайти ваш сайт у Google, коли вони шукають те, що ви продаєте. Це не хитрість і не разове налаштування: Google показує сторінки, які найкраще відповідають на питання і яким довіряють люди.']],
          ['1. Одна сторінка — одне питання', ['Кожна сторінка має відповідати на один запит: «студія манікюру у Львові», «ціна ремонту даху», «стоматолог у неділю». Сторінка про все не знаходиться ні за чим. Пишіть словами, які набирають клієнти, а не внутрішніми термінами.']],
          ['2. Зрозумілий заголовок і опис', ['Заголовок сторінки й короткий опис — це те, що людина бачить у результатах пошуку. У заголовок — послугу й місто, в опис — одну чесну причину натиснути. Заголовок краще тримати приблизно до 60 символів.']],
          ['3. Швидкість і телефон', ['Більшість шукає з телефона. Якщо сторінка вантажиться довго або текст дрібний, люди йдуть, і Google це помічає. Перевірте сайт безкоштовно на pagespeed.web.dev — він покаже, що гальмує сторінку.']],
          ['4. Справжній текст для людей', ['Ціни, як ви працюєте, відповіді на часті питання, фото реальних робіт. Сторінки з корисними подробицями працюють краще за сторінки з гаслами. Текст, скопійований з чужих сайтів, не допомагає.']],
          ['5. Профіль компанії в Google', ['Для місцевого бізнесу це часто важливіше за сам сайт: картка на карті з адресою, годинами роботи, фото й відгуками. Це безкоштовно. Заповніть її повністю і просіть задоволених клієнтів залишити відгук.']],
          ['6. Search Console', ['Безкоштовна Google Search Console показує, за якими запитами приходять люди і які сторінки бачить Google. Додайте сайт, надішліть карту сайту й заглядайте раз на тиждень — для початку цього вистачить.']],
          ['7. Терпіння і чесність', ['Новому сайту зазвичай потрібні тижні або місяці, щоб зʼявитися в пошуку, і чесно гарантувати перше місце не може ніхто. Обережніше з тими, хто гарантує. З часом виграють корисні сторінки і справжні відгуки.']],
          ['Чим допомагає Vaxo', ['Опишіть свій бізнес у Workspace — Vax напише сторінки, заголовки й описи словами ваших клієнтів, а будь-яку сторінку можна попросити перевірити: «що покращити для Google?». Почати можна безкоштовно; платні тарифи — від $19 на місяць.']],
        ],
      },
    },
  },
  {
    slug: 'ai-workspace-describe-get-result',
    date: '2026-11-10',
    t: {
      en: {
        title: 'AI workspace: describe what you need and get a site, chat or CRM',
        desc: 'How Vaxo Workspace turns a plain description into a working site, AI chat, booking or CRM — and what to write for the best result.',
        body: [
          ['What Workspace is', ['Workspace is one place where you talk to Vax, the Vaxo AI, in plain words. You say what you need — a website, an AI chat for your site, online booking, a CRM, a calculator or a text — and the result appears next to the chat on a canvas, ready to look at and change.']],
          ['What to write for the best result', ['Three things are enough: what you do, who your clients are, and what you want them to do (call, book, buy, leave a request). For example: “Nail studio in Kyiv, women 20–45, I want online booking and prices on one page.” Details like colours or photos can come later.']],
          ['How changes work', ['You do not need to know design or code. Write “make the button green”, “add a price list” or “shorter text on the first screen” — Vax changes the canvas right away, and you see the result at once.']],
          ['From draft to working tool', ['When you like the result, it goes live: the site gets its address, requests and bookings land in your cabinet and calendar, and analytics show what people do. You do not move anything between services — it is all one platform.']],
          ['What it costs', ['You can start for free: all functions work, with a small “Made with Vaxo” mark. Paid plans start at $19 a month and add more AI capacity and your own domain. Anything custom is quoted up front, before you pay.']],
        ],
      },
      ru: {
        title: 'ИИ-Workspace: опишите задачу — и получите сайт, чат или CRM',
        desc: 'Как Vaxo Workspace превращает обычное описание в работающий сайт, ИИ-чат, запись или CRM — и что написать для лучшего результата.',
        body: [
          ['Что такое Workspace', ['Workspace — одно место, где вы говорите с Vax, ИИ Vaxo, обычными словами. Вы пишете, что нужно — сайт, ИИ-чат для сайта, онлайн-запись, CRM, калькулятор или текст, — и результат появляется рядом с чатом на холсте: его сразу видно и можно менять.']],
          ['Что написать для лучшего результата', ['Хватит трёх вещей: чем вы занимаетесь, кто ваши клиенты и что они должны сделать (позвонить, записаться, купить, оставить заявку). Например: «Студия маникюра в Киеве, женщины 20–45, хочу онлайн-запись и цены на одной странице». Цвета и фото можно добавить потом.']],
          ['Как вносить правки', ['Разбираться в дизайне и коде не нужно. Напишите «сделай кнопку зелёной», «добавь прайс» или «короче текст на первом экране» — Vax сразу изменит холст, и вы тут же увидите результат.']],
          ['От черновика к рабочему инструменту', ['Когда результат нравится, он запускается: у сайта появляется адрес, заявки и записи приходят в ваш кабинет и календарь, а аналитика показывает, что делают люди. Ничего не нужно переносить между сервисами — всё на одной платформе.']],
          ['Сколько стоит', ['Начать можно бесплатно: все функции работают, с небольшой пометкой «Сделано на Vaxo». Платные тарифы — от $19 в месяц: больше ИИ-запаса и свой домен. Всё нестандартное оцениваем заранее, до оплаты.']],
        ],
      },
      ua: {
        title: 'ШІ-Workspace: опишіть задачу — і отримайте сайт, чат або CRM',
        desc: 'Як Vaxo Workspace перетворює звичайний опис на робочий сайт, ШІ-чат, запис або CRM — і що написати для найкращого результату.',
        body: [
          ['Що таке Workspace', ['Workspace — одне місце, де ви говорите з Vax, ШІ Vaxo, звичайними словами. Ви пишете, що потрібно — сайт, ШІ-чат для сайту, онлайн-запис, CRM, калькулятор чи текст, — і результат зʼявляється поруч із чатом на полотні: його одразу видно і можна змінювати.']],
          ['Що написати для найкращого результату', ['Вистачить трьох речей: чим ви займаєтеся, хто ваші клієнти і що вони мають зробити (подзвонити, записатися, купити, залишити заявку). Наприклад: «Студія манікюру в Києві, жінки 20–45, хочу онлайн-запис і ціни на одній сторінці». Кольори й фото можна додати потім.']],
          ['Як вносити правки', ['Розбиратися в дизайні й коді не потрібно. Напишіть «зроби кнопку зеленою», «додай прайс» або «коротше текст на першому екрані» — Vax одразу змінить полотно, і ви відразу побачите результат.']],
          ['Від чернетки до робочого інструменту', ['Коли результат подобається, він запускається: у сайту зʼявляється адреса, заявки й записи надходять у ваш кабінет і календар, а аналітика показує, що роблять люди. Нічого не треба переносити між сервісами — усе на одній платформі.']],
          ['Скільки коштує', ['Почати можна безкоштовно: усі функції працюють, з невеликою позначкою «Зроблено на Vaxo». Платні тарифи — від $19 на місяць: більше ШІ-запасу і свій домен. Усе нестандартне оцінюємо заздалегідь, до оплати.']],
        ],
      },
    },
  },
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
          ['What it costs at Vaxo', ['Online booking is part of the Vaxo platform — free to start, paid plans from $19 a month: a booking page on your site, calendar links for clients, reminder buttons, your bookings in Google or iPhone calendar and a morning email. Describe your business in Workspace and Vax sets it up with you.']],
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
          ['Сколько стоит в Vaxo', ['Онлайн-запись входит в платформу Vaxo — бесплатно на старте, платные тарифы от $19 в месяц: страница записи на вашем сайте, ссылка «в календарь» для клиента, кнопки напоминаний, ваши записи в Google или iPhone календаре и письмо по утрам. Опишите свой бизнес в Workspace — Vax настроит всё вместе с вами.']],
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
          ['Скільки коштує у Vaxo', ['Онлайн-запис входить у платформу Vaxo — безкоштовно на старті, платні тарифи від $19 на місяць: сторінка запису на вашому сайті, посилання «в календар» для клієнта, кнопки нагадувань, ваші записи в Google або iPhone календарі й лист щоранку. Опишіть свій бізнес у Workspace — Vax налаштує все разом з вами.']],
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
          ['The short answer', ['On the market, a templated freelancer page costs about $300–800, a custom freelancer page $500–2,000 and an agency landing page $2,000–10,000. At Vaxo, where AI does most of the work, the site is part of a monthly plan — free to start, then Plus $19, Pro $39, Max $129 or Ultra $299 — with no big upfront bill. Anything custom is quoted up front, before you pay.']],
          ['What changes the price', ['Number of pages and unique designs.', 'Who writes the texts and makes the photos.', 'Features: booking, payments, accounts, integrations with your CRM.', 'Languages and markets.', 'Speed: a rushed deadline costs more.']],
          ['Costs people forget', ['Domain: about $10–15 a year.', 'Hosting: from free to $20+ a month depending on traffic.', 'Support and updates after launch.', 'Traffic: a site without ads, SEO or social media gets few visitors.']],
          ['How to spend less without losing quality', ['Start with one page that does one job (calls, bookings or requests) and grow later. At Vaxo the website comes inside the plan (free to start, paid from $19 a month) together with the AI chat, CRM and analytics — you describe what you need, we and AI build it.']],
          ['Questions to ask any studio', ['Is the price fixed? How many revision rounds are included? Who owns the domain and the code? What happens if the deadline is missed? What are the refund rules? Good studios answer all five in writing before you pay.']],
        ],
      },
      ru: {
        title: 'Сколько стоит сайт в 2026 году? Честные цены',
        desc: 'Реальные цены на одностраничник, лендинг, сайт компании и интернет-магазин — и от чего зависит цена.',
        body: [
          ['Коротко', ['На рынке страница у фрилансера по шаблону стоит около $300–800, индивидуальная у фрилансера — $500–2 000, лендинг в агентстве — $2 000–10 000. В Vaxo большую часть работы делает ИИ, поэтому сайт входит в подписку — бесплатно на старте, дальше Плюс $19, Про $39, Макс $129 или Ультра $299 в месяц, без крупной суммы вперёд. Всё нестандартное оценивается заранее, до оплаты.']],
          ['От чего зависит цена', ['Сколько страниц и уникальных макетов.', 'Кто пишет тексты и делает фото.', 'Функции: запись, оплата, кабинеты, связь с CRM.', 'Языки и рынки.', 'Срочность: «нужно вчера» стоит дороже.']],
          ['О чём забывают', ['Домен: около $10–15 в год.', 'Хостинг: от бесплатного до $20+ в месяц.', 'Поддержка и обновления после запуска.', 'Трафик: без рекламы, SEO и соцсетей на сайт мало кто зайдёт.']],
          ['Как потратить меньше без потери качества', ['Начните с одной страницы, которая делает одно дело (звонки, записи или заявки), и растите дальше. В Vaxo сайт входит в подписку (бесплатно на старте, платно от $19 в месяц) вместе с ИИ-чатом, CRM и аналитикой — вы описываете задачу, мы и ИИ делаем.']],
          ['Что спросить у любой студии', ['Цена фиксированная? Сколько кругов правок входит? Чьи домен и код? Что будет при срыве срока? Какие правила возврата? Хорошая студия письменно отвечает на все пять вопросов до оплаты.']],
        ],
      },
      ua: {
        title: 'Скільки коштує сайт у 2026 році? Чесні ціни',
        desc: 'Реальні ціни на односторінковий сайт, лендинг, сайт компанії та інтернет-магазин — і від чого залежить ціна.',
        body: [
          ['Коротко', ['На ринку сторінка у фрилансера за шаблоном коштує близько $300–800, індивідуальна у фрилансера — $500–2 000, лендинг в агенції — $2 000–10 000. У Vaxo більшу частину роботи робить ШІ, тому сайт входить у підписку — безкоштовно на старті, далі Плюс $19, Про $39, Макс $129 або Ультра $299 на місяць, без великої суми наперед. Усе нестандартне оцінюється заздалегідь, до оплати.']],
          ['Від чого залежить ціна', ['Скільки сторінок і унікальних макетів.', 'Хто пише тексти й робить фото.', 'Функції: запис, оплата, кабінети, звʼязок з CRM.', 'Мови й ринки.', 'Терміновість: «треба вчора» коштує дорожче.']],
          ['Про що забувають', ['Домен: близько $10–15 на рік.', 'Хостинг: від безкоштовного до $20+ на місяць.', 'Підтримка й оновлення після запуску.', 'Трафік: без реклами, SEO і соцмереж на сайт мало хто зайде.']],
          ['Як витратити менше без втрати якості', ['Почніть з однієї сторінки, яка робить одну справу (дзвінки, записи чи заявки), і ростіть далі. У Vaxo сайт входить у підписку (безкоштовно на старті, платно від $19 на місяць) разом із ШІ-чатом, CRM і аналітикою — ви описуєте задачу, ми й ШІ робимо.']],
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
        title: 'What is a domain name and how to get one: a plain guide',
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
        title: 'AI chat assistant for your website: what it does, what it costs',
        desc: 'What a website AI chat can and cannot do, how it gets you more requests, and what it costs.',
        body: [
          ['What it does', ['An AI chat on your website answers common questions 24/7 — prices, hours, services, booking — and collects the name and contact of people who are ready to buy. It replies in seconds, in the visitor’s language.']],
          ['Why it brings more clients', ['Visitors often leave when they cannot get a quick answer, especially at night or on weekends. A chat that answers at once and asks for a contact turns some of them into requests you can call back.']],
          ['What it should not do', ['Promise prices or results you do not offer, ask for card details, or pretend to be a human. A good assistant says it is an AI and hands over to you when the question is complex.']],
          ['What it costs', ['At Vaxo an AI chat for your website is included in every plan, the free one too (paid from $19 a month), trained on your services, prices and FAQ, with new requests sent to your email or Telegram. Try ours first — Vax in our Workspace — before you decide.']],
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
          ['Сколько стоит', ['В Vaxo ИИ-чат для вашего сайта входит в любой тариф, даже бесплатный (платные от $19 в месяц): обучен на ваших услугах, ценах и частых вопросах, новые заявки приходят на почту или в Telegram. Сначала попробуйте нашего — Vax в Workspace, — потом решайте.']],
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
          ['Скільки коштує', ['У Vaxo ШІ-чат для вашого сайту входить у будь-який тариф, навіть безкоштовний (платні від $19 на місяць): навчений на ваших послугах, цінах і частих питаннях, нові заявки надходять на пошту або в Telegram. Спершу спробуйте нашого — Vax у Workspace, — потім вирішуйте.']],
          ['Як отримати максимум', ['Дайте йому реальні ціни й відповіді на 20 найчастіших питань. Раз на тиждень читайте листування й додавайте те, чого він не знав.']],
        ],
      },
    },
  },
];
