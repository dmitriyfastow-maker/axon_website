// Partner program terms — the single source of truth for the landing page (/partners/) and the cabinet.
// Every partner gets the full rates from day one. Change a number here and every page follows.
import type { Lang } from '../i18n';

/** Commission, %. */
export const RATES = {
  agencyOwn: 50, // client the partner (or a client) brought: 50% of the first payment (Dmitry, 31.10.2026)
  agencyGiven: 20, // warm lead Vaxo hands to the partner to close
  agencyRenewal: 30, // every renewal / monthly payment, for life
  fullCycle: 50, // brought the client AND closed the deal on a call
  clipFirst: 50, // legacy content plan A — now the same as everyone
  clipLife: 30, // legacy content plan B — now the same as everyone
  products: 50, // our digital products
  offers: 70, // share of the payout Vaxo receives from partner offers
  team: 10, // 10% of every sale made by the partner's direct team members (one level only), paid by Vaxo on top
  holdDays: 14, // commission becomes payable after the refund window
};

/** Real prices from /start/ and /shop/; the calculator uses the middle of each range. */
export const CALC = {
  packages: [149, 199, 249], // starter packages: automation, landing page, AI chat assistant
  project: 490, // site with booking or catalog
  template: 10, // single templates cost $9–$12
  bundle: 67, // all templates in one bundle
  support: 129, // the Growth plan (plans: $39 / $129 / $299 a month)
};

export type CalcRow = { id: 'pk' | 'pr' | 'tp' | 'bd' | 'sp'; label: string; hint: string; max: number; step: number; value: number };

type Text = {
  meta: { title: string; description: string };
  eyebrow: string;
  h1: string;
  sub: string;
  join: string;
  login: string;
  flow: string[];
  stats: [number, string, string][]; // value, suffix/prefix pattern, label
  aloneH: string;
  aloneSub: string;
  alone: [string, string, string][]; // icon, title, text
  promoteH: string;
  directions: { name: string; rate: string; price: string; what: string; points: string[] }[];
  calcH: string;
  calcSub: string;
  calcRows: CalcRow[];
  calcPkg: string[];
  calcMonth: string;
  calcYear: string;
  calcNote: string;
  academyH: string;
  academySub: string;
  modules: [string, string][];
  ways: [string, string][];
  stepsH: string;
  steps: [string, string][];
  teamH: string;
  teamP: string;
  teamPoints: string[];
  soonTag: string;
  soonH: string;
  soonP: string;
  faqH: string;
  faq: [string, string][];
  rules: string;
  rulesLink: string;
  finalH: string;
  finalP: string;
  create: string;
};

const r = RATES;
const c = CALC;

const en: Text = {
  meta: {
    title: 'Vaxo Partners — earn by recommending AI for business',
    description: `Promote AI automation, websites, chatbots and templates for small businesses. ${r.agencyOwn}% on services, ${r.products}% on templates from day one, free training and AI toolkit, weekly payouts.`,
  },
  eyebrow: 'Partner program',
  h1: 'Earn by recommending AI that businesses actually need.',
  sub: 'Share our services and templates. We do the work, train you and give you the AI tools. You get the full commission from your first sale — every week.',
  join: 'Become a partner →',
  login: 'Log in',
  flow: ['Your link', 'A client request', 'We do the work', 'You get paid'],
  stats: [
    [r.agencyOwn, '%', 'on agency services'],
    [r.products, '%', 'on our templates'],
    [r.agencyRenewal, '+%', 'every month the client pays'],
    [r.holdDays, ' days', 'from payment to payout'],
  ],
  aloneH: 'You are not on your own',
  aloneSub: 'Never sold anything online? That is fine. Everything you need is inside.',
  alone: [
    ['🎓', 'Step-by-step training', 'Videos, posts, personal messages, communities — what to do, in what order, with examples.'],
    ['🤖', 'AI does the hard part', 'Ready prompts with your link already inside. One click opens them in Claude, ChatGPT or Gemini.'],
    ['🤝', 'We close the deals', 'Our team answers clients, prepares proposals and delivers the work. You bring people.'],
    ['👥', 'Build your team', `Invite other partners and earn +${r.team}% of every sale they make — on top, from us.`],
  ],
  promoteH: 'What you promote — and what you earn',
  directions: [
    {
      name: 'Agency services',
      rate: `${r.agencyOwn}%`,
      price: 'deals from $149',
      what: 'Automation, websites and AI chatbots for small businesses. Our team does all the work.',
      points: [`${r.agencyOwn}% — a client you found`, `${r.agencyGiven}% — a warm lead we give you to close`, `+${r.agencyRenewal}% — every renewal and monthly payment, for life`, `Clients can join too and earn the same`],
    },
    {
      name: 'Our templates',
      rate: `${r.products}%`,
      price: '$9 – $67',
      what: 'Ready-made templates and guides for small businesses. A cheap, easy first purchase — great for content.',
      points: ['Half of every sale is yours', 'Bundle of all templates — $67', 'Instant download, no support needed from you'],
    },
    {
      name: 'Partner offers',
      rate: `${r.offers}%`,
      price: 'coming soon',
      what: 'Offers from other companies, checked by us. You get most of what the company pays us.',
      points: [`${r.offers}% of the payout we receive`, 'Every offer shows its own rules', 'Same cabinet, same links'],
    },
  ],
  calcH: 'Count your income',
  calcSub: 'Real prices from our site. Move the sliders — every line shows exactly how it is counted.',
  calcRows: [
    { id: 'pk', label: 'Starter packages sold', hint: `${r.agencyOwn}% of the package price`, max: 20, step: 1, value: 2 },
    { id: 'pr', label: 'Sites with booking or catalog ($490)', hint: `${r.agencyOwn}% of $${c.project}`, max: 10, step: 1, value: 0 },
    { id: 'tp', label: 'Single templates ($9–$12)', hint: `${r.products}% of $${c.template}`, max: 200, step: 5, value: 20 },
    { id: 'bd', label: 'Template bundles ($67)', hint: `${r.products}% of $${c.bundle}`, max: 50, step: 1, value: 3 },
    { id: 'sp', label: 'Clients on a monthly plan ($39–$299)', hint: `${r.agencyRenewal}% of $${c.support} every month`, max: 30, step: 1, value: 2 },
  ],
  calcPkg: ['Automation', 'Website', 'AI chatbot'],
  calcMonth: 'per month',
  calcYear: 'per year',
  calcNote: `Templates are counted at $${c.template} and support at $${c.support}/month — the middle of each price range. Example math, not a promise: real income depends only on real sales.`,
  academyH: 'Free training inside the cabinet',
  academySub: 'Short, practical lessons. Each one shows the free way to start and the maximum way for faster results.',
  modules: [
    ['Start here', 'How the money is made and your first 3 actions today'],
    ['Video factory', 'Unlimited short videos with AI: scripts, hooks, editing, posting'],
    ['Posts & your profile', 'A profile that sells, captions and a weekly content plan'],
    ['Personal messages', 'Find businesses, write to them personally, follow up — without spam'],
    ['Communities', 'Help in groups and forums so people come to you'],
    ['When a client answers', 'What to say and how to hand the client over to us'],
    ['Build your team', 'Invite partners honestly and grow your +10%'],
  ],
  ways: [
    ['Free way', 'Free Claude, ChatGPT or Gemini, CapCut and your phone. Enough to start and earn.'],
    ['Maximum way', 'Claude Pro: it remembers your offer and style, writes a week of content in one go, and gives the strongest texts. Upgrade when you see results.'],
  ],
  stepsH: 'How it works',
  steps: [
    ['Sign up', 'Free, takes a minute. 18+ only.'],
    ['Follow “Start here”', 'A short checklist in your cabinet tells you exactly what to do first.'],
    ['Share honestly', 'Videos, posts, personal messages — with ready AI prompts.'],
    ['Get paid weekly', `For real sales, ${r.holdDays} days after the client pays.`],
  ],
  teamH: 'Grow a team, earn from it',
  teamP: `Invite people with your personal link. When they earn, you get +${r.team}% on top — we pay it, they lose nothing.`,
  teamPoints: ['Only for real sales — never for the invite itself', 'Your team and their results are in your cabinet', 'Ready prompts to explain the program honestly'],
  soonTag: 'Soon',
  soonH: 'Prize draws for active partners',
  soonP: 'Regular draws and challenges with prizes for partners who post and help clients. Join now to take part from the first one.',
  faqH: 'Questions',
  faq: [
    ['Does it cost anything?', 'No. Signing up, the cabinet, training and the AI toolkit are free.'],
    ['I have never worked online. Can I do it?', 'Yes. The “Start here” checklist and training show every step. AI writes the texts with you.'],
    ['How much will I earn?', 'It depends only on real sales you bring. The calculator above shows the exact math. We never promise income.'],
    ['When and how do I get paid?', `Every week, for money we received and held for ${r.holdDays} days (refund protection). Paid by Payoneer, Wise or bank transfer (Ukraine: to a FOP account only).`],
    ['Where can I promote?', 'Anywhere, honestly: social media, video, blogs, communities, your own clients. No spam, no fake reviews, no paid clicks.'],
  ],
  rules: '18+ only. Honest promotion only.',
  rulesLink: 'Read the full partner rules',
  finalH: 'Ready to start?',
  finalP: 'Create your free account and get your first link in a minute.',
  create: 'Create account →',
};

const ua: Text = {
  meta: {
    title: 'Партнерка Vaxo — заробляйте, рекомендуючи ШІ для бізнесу',
    description: `Рекомендуйте автоматизацію, сайти, чат-боти та шаблони для бізнесу. ${r.agencyOwn}% з послуг, ${r.products}% з шаблонів з першого дня, безкоштовне навчання і ШІ-набір, виплати щотижня.`,
  },
  eyebrow: 'Партнерська програма',
  h1: 'Заробляйте, рекомендуючи ШІ, який справді потрібен бізнесу.',
  sub: 'Рекомендуйте наші послуги та шаблони. Роботу робимо ми, навчаємо вас і даємо ШІ-інструменти. Повна комісія — з першого продажу, щотижня.',
  join: 'Стати партнером →',
  login: 'Увійти',
  flow: ['Ваше посилання', 'Заявка клієнта', 'Ми робимо роботу', 'Вам виплата'],
  stats: [
    [r.agencyOwn, '%', 'з послуг агенції'],
    [r.products, '%', 'з наших шаблонів'],
    [r.agencyRenewal, '+%', 'щомісяця, поки клієнт платить'],
    [r.holdDays, ' днів', 'від оплати до виплати'],
  ],
  aloneH: 'Ви не самі',
  aloneSub: 'Ніколи нічого не продавали онлайн? Нічого страшного. Усе потрібне — всередині.',
  alone: [
    ['🎓', 'Покрокове навчання', 'Відео, пости, особисті повідомлення, спільноти — що робити, в якому порядку, з прикладами.'],
    ['🤖', 'Складне робить ШІ', 'Готові промпти з вашим посиланням. Один клік — і вони відкриваються в Claude, ChatGPT чи Gemini.'],
    ['🤝', 'Угоди закриваємо ми', 'Наша команда відповідає клієнтам, готує пропозиції та робить роботу. Ви приводите людей.'],
    ['👥', 'Будуйте команду', `Запрошуйте партнерів і отримуйте +${r.team}% з кожного їхнього продажу — понад, від нас.`],
  ],
  promoteH: 'Що рекомендуєте — і скільки заробляєте',
  directions: [
    {
      name: 'Послуги агенції',
      rate: `${r.agencyOwn}%`,
      price: 'угоди від $149',
      what: 'Автоматизація, сайти та ШІ-чат-боти для малого бізнесу. Усю роботу робить наша команда.',
      points: [`${r.agencyOwn}% — клієнт, якого знайшли ви`, `${r.agencyGiven}% — теплий клієнт від нас, якого закриваєте ви`, `+${r.agencyRenewal}% — кожне продовження і щомісячна оплата, назавжди`, `Клієнти теж можуть приєднатися й заробляти так само`],
    },
    {
      name: 'Наші шаблони',
      rate: `${r.products}%`,
      price: '$9 – $67',
      what: 'Готові шаблони та посібники для малого бізнесу. Дешева і легка перша покупка — ідеально для контенту.',
      points: ['Половина кожного продажу — ваша', 'Набір усіх шаблонів — $67', 'Миттєве завантаження, підтримка від вас не потрібна'],
    },
    {
      name: 'Офери партнерів',
      rate: `${r.offers}%`,
      price: 'скоро',
      what: 'Пропозиції інших компаній, перевірені нами. Ви отримуєте більшу частину того, що компанія платить нам.',
      points: [`${r.offers}% від виплати, яку отримуємо ми`, 'У кожного офера свої правила', 'Той самий кабінет і посилання'],
    },
  ],
  calcH: 'Порахуйте свій дохід',
  calcSub: 'Реальні ціни з нашого сайту. Рухайте повзунки — кожен рядок показує, як саме рахується.',
  calcRows: [
    { id: 'pk', label: 'Продано стартових пакетів', hint: `${r.agencyOwn}% від ціни пакета`, max: 20, step: 1, value: 2 },
    { id: 'pr', label: 'Сайти із записом або каталогом ($490)', hint: `${r.agencyOwn}% від $${c.project}`, max: 10, step: 1, value: 0 },
    { id: 'tp', label: 'Окремі шаблони ($9–$12)', hint: `${r.products}% від $${c.template}`, max: 200, step: 5, value: 20 },
    { id: 'bd', label: 'Набори шаблонів ($67)', hint: `${r.products}% від $${c.bundle}`, max: 50, step: 1, value: 3 },
    { id: 'sp', label: 'Клієнти на щомісячній підписці ($39–$299)', hint: `${r.agencyRenewal}% від $${c.support} щомісяця`, max: 30, step: 1, value: 2 },
  ],
  calcPkg: ['Автоматизація', 'Сайт', 'ШІ-чат-бот'],
  calcMonth: 'на місяць',
  calcYear: 'на рік',
  calcNote: `Шаблон рахуємо по $${c.template}, підтримку — $${c.support}/міс (середина діапазону цін). Це приклад, а не обіцянка: дохід залежить лише від реальних продажів.`,
  academyH: 'Безкоштовне навчання в кабінеті',
  academySub: 'Короткі практичні уроки. У кожному — безкоштовний спосіб почати і максимальний — для швидшого результату.',
  modules: [
    ['З чого почати', 'Як заробляються гроші і ваші перші 3 дії сьогодні'],
    ['Завод відео', 'Необмежено коротких відео з ШІ: сценарії, гачки, монтаж, публікація'],
    ['Пости і профіль', 'Профіль, що продає, підписи і план контенту на тиждень'],
    ['Особисті повідомлення', 'Знайти бізнеси, написати особисто, нагадати — без спаму'],
    ['Спільноти', 'Допомагайте в групах і форумах — і люди прийдуть до вас'],
    ['Коли клієнт відповів', 'Що сказати і як передати клієнта нам'],
    ['Своя команда', 'Чесно запрошуйте партнерів і ростіть свої +10%'],
  ],
  ways: [
    ['Безкоштовний шлях', 'Безкоштовні Claude, ChatGPT чи Gemini, CapCut і ваш телефон. Цього достатньо, щоб почати й заробити.'],
    ['Максимум', 'Claude Pro: пам’ятає ваш офер і стиль, пише контент на тиждень за раз і дає найсильніші тексти. Переходьте, коли побачите результат.'],
  ],
  stepsH: 'Як це працює',
  steps: [
    ['Реєстрація', 'Безкоштовно, за хвилину. Лише 18+.'],
    ['Пройдіть «З чого почати»', 'Короткий чек-лист у кабінеті підкаже, що робити першим.'],
    ['Рекомендуйте чесно', 'Відео, пости, особисті повідомлення — з готовими ШІ-промптами.'],
    ['Виплати щотижня', `За реальні продажі, через ${r.holdDays} днів після оплати клієнта.`],
  ],
  teamH: 'Збирайте команду — заробляйте з неї',
  teamP: `Запрошуйте людей своїм посиланням. Коли вони заробляють, ви отримуєте +${r.team}% зверху — платимо ми, вони нічого не втрачають.`,
  teamPoints: ['Лише за реальні продажі — ніколи за саме запрошення', 'Ваша команда та її результати — у кабінеті', 'Готові промпти, щоб чесно пояснити програму'],
  soonTag: 'Скоро',
  soonH: 'Розіграші для активних партнерів',
  soonP: 'Регулярні розіграші та челенджі з призами для тих, хто публікує контент і допомагає клієнтам. Приєднуйтесь зараз, щоб брати участь з першого.',
  faqH: 'Питання',
  faq: [
    ['Це щось коштує?', 'Ні. Реєстрація, кабінет, навчання та ШІ-набір — безкоштовні.'],
    ['Я ніколи не працював онлайн. Впораюсь?', 'Так. Чек-лист «З чого почати» і навчання показують кожен крок. Тексти ШІ пише разом з вами.'],
    ['Скільки я зароблю?', 'Залежить лише від реальних продажів. Калькулятор вище показує точний розрахунок. Ми ніколи не обіцяємо дохід.'],
    ['Коли і як виплати?', `Щотижня, за гроші, які ми отримали і тримали ${r.holdDays} днів (захист від повернень). Виплата через Payoneer, Wise або банківським переказом (Україна — лише на рахунок ФОП).`],
    ['Де можна рекламувати?', 'Будь-де, чесно: соцмережі, відео, блоги, спільноти, ваші клієнти. Без спаму, фейкових відгуків і купленого трафіку.'],
  ],
  rules: 'Лише 18+. Лише чесна реклама.',
  rulesLink: 'Повні правила партнерів',
  finalH: 'Готові почати?',
  finalP: 'Створіть безкоштовний акаунт і отримайте перше посилання за хвилину.',
  create: 'Створити акаунт →',
};

const ru: Text = {
  meta: {
    title: 'Партнёрка Vaxo — зарабатывайте, рекомендуя ИИ для бизнеса',
    description: `Рекомендуйте автоматизацию, сайты, чат-боты и шаблоны для бизнеса. ${r.agencyOwn}% с услуг, ${r.products}% с шаблонов с первого дня, бесплатное обучение и ИИ-набор, выплаты каждую неделю.`,
  },
  eyebrow: 'Партнёрская программа',
  h1: 'Зарабатывайте, рекомендуя ИИ, который реально нужен бизнесу.',
  sub: 'Рекомендуйте наши услуги и шаблоны. Работу делаем мы, обучаем вас и даём ИИ-инструменты. Полная комиссия — с первой продажи, каждую неделю.',
  join: 'Стать партнёром →',
  login: 'Войти',
  flow: ['Ваша ссылка', 'Заявка клиента', 'Мы делаем работу', 'Вам выплата'],
  stats: [
    [r.agencyOwn, '%', 'с услуг агентства'],
    [r.products, '%', 'с наших шаблонов'],
    [r.agencyRenewal, '+%', 'каждый месяц, пока клиент платит'],
    [r.holdDays, ' дней', 'от оплаты до выплаты'],
  ],
  aloneH: 'Вы не одни',
  aloneSub: 'Никогда ничего не продавали онлайн? Ничего страшного. Всё нужное — внутри.',
  alone: [
    ['🎓', 'Пошаговое обучение', 'Видео, посты, личные сообщения, сообщества — что делать, в каком порядке, с примерами.'],
    ['🤖', 'Сложное делает ИИ', 'Готовые промпты с вашей ссылкой внутри. Один клик — и они открываются в Claude, ChatGPT или Gemini.'],
    ['🤝', 'Сделки закрываем мы', 'Наша команда отвечает клиентам, готовит предложения и делает работу. Вы приводите людей.'],
    ['👥', 'Стройте команду', `Приглашайте партнёров и получайте +${r.team}% с каждой их продажи — сверху, от нас.`],
  ],
  promoteH: 'Что рекомендуете — и сколько зарабатываете',
  directions: [
    {
      name: 'Услуги агентства',
      rate: `${r.agencyOwn}%`,
      price: 'сделки от $149',
      what: 'Автоматизация, сайты и ИИ-чат-боты для малого бизнеса. Всю работу делает наша команда.',
      points: [`${r.agencyOwn}% — клиент, которого нашли вы`, `${r.agencyGiven}% — тёплый клиент от нас, которого закрываете вы`, `+${r.agencyRenewal}% — каждое продление и ежемесячная оплата, навсегда`, `Клиенты тоже могут присоединиться и зарабатывать так же`],
    },
    {
      name: 'Наши шаблоны',
      rate: `${r.products}%`,
      price: '$9 – $67',
      what: 'Готовые шаблоны и руководства для малого бизнеса. Дешёвая и лёгкая первая покупка — идеально для контента.',
      points: ['Половина каждой продажи — ваша', 'Набор всех шаблонов — $67', 'Мгновенная загрузка, поддержка от вас не нужна'],
    },
    {
      name: 'Офферы партнёров',
      rate: `${r.offers}%`,
      price: 'скоро',
      what: 'Предложения других компаний, проверенные нами. Вы получаете бо́льшую часть того, что компания платит нам.',
      points: [`${r.offers}% от выплаты, которую получаем мы`, 'У каждого оффера свои правила', 'Тот же кабинет и ссылки'],
    },
  ],
  calcH: 'Посчитайте свой доход',
  calcSub: 'Реальные цены с нашего сайта. Двигайте ползунки — каждая строка показывает, как именно считается.',
  calcRows: [
    { id: 'pk', label: 'Продано стартовых пакетов', hint: `${r.agencyOwn}% от цены пакета`, max: 20, step: 1, value: 2 },
    { id: 'pr', label: 'Сайты с записью или каталогом ($490)', hint: `${r.agencyOwn}% от $${c.project}`, max: 10, step: 1, value: 0 },
    { id: 'tp', label: 'Отдельные шаблоны ($9–$12)', hint: `${r.products}% от $${c.template}`, max: 200, step: 5, value: 20 },
    { id: 'bd', label: 'Наборы шаблонов ($67)', hint: `${r.products}% от $${c.bundle}`, max: 50, step: 1, value: 3 },
    { id: 'sp', label: 'Клиенты на ежемесячной подписке ($39–$299)', hint: `${r.agencyRenewal}% от $${c.support} каждый месяц`, max: 30, step: 1, value: 2 },
  ],
  calcPkg: ['Автоматизация', 'Сайт', 'ИИ-чат-бот'],
  calcMonth: 'в месяц',
  calcYear: 'в год',
  calcNote: `Шаблон считаем по $${c.template}, поддержку — $${c.support}/мес (середина диапазона цен). Это пример, а не обещание: доход зависит только от реальных продаж.`,
  academyH: 'Бесплатное обучение в кабинете',
  academySub: 'Короткие практичные уроки. В каждом — бесплатный способ начать и максимальный — для более быстрого результата.',
  modules: [
    ['С чего начать', 'Как зарабатываются деньги и ваши первые 3 действия сегодня'],
    ['Завод видео', 'Неограниченно коротких видео с ИИ: сценарии, хуки, монтаж, публикация'],
    ['Посты и профиль', 'Продающий профиль, подписи и контент-план на неделю'],
    ['Личные сообщения', 'Найти бизнесы, написать лично, напомнить — без спама'],
    ['Сообщества', 'Помогайте в группах и форумах — и люди придут к вам'],
    ['Когда клиент ответил', 'Что сказать и как передать клиента нам'],
    ['Своя команда', 'Честно приглашайте партнёров и растите свои +10%'],
  ],
  ways: [
    ['Бесплатный путь', 'Бесплатные Claude, ChatGPT или Gemini, CapCut и ваш телефон. Этого достаточно, чтобы начать и заработать.'],
    ['Максимум', 'Claude Pro: помнит ваш оффер и стиль, пишет контент на неделю за раз и даёт самые сильные тексты. Переходите, когда увидите результат.'],
  ],
  stepsH: 'Как это работает',
  steps: [
    ['Регистрация', 'Бесплатно, за минуту. Только 18+.'],
    ['Пройдите «С чего начать»', 'Короткий чек-лист в кабинете подскажет, что делать первым.'],
    ['Рекомендуйте честно', 'Видео, посты, личные сообщения — с готовыми ИИ-промптами.'],
    ['Выплаты каждую неделю', `За реальные продажи, через ${r.holdDays} дней после оплаты клиента.`],
  ],
  teamH: 'Собирайте команду — зарабатывайте с неё',
  teamP: `Приглашайте людей своей ссылкой. Когда они зарабатывают, вы получаете +${r.team}% сверху — платим мы, они ничего не теряют.`,
  teamPoints: ['Только за реальные продажи — никогда за само приглашение', 'Ваша команда и её результаты — в кабинете', 'Готовые промпты, чтобы честно объяснить программу'],
  soonTag: 'Скоро',
  soonH: 'Розыгрыши для активных партнёров',
  soonP: 'Регулярные розыгрыши и челленджи с призами для тех, кто публикует контент и помогает клиентам. Присоединяйтесь сейчас, чтобы участвовать с первого.',
  faqH: 'Вопросы',
  faq: [
    ['Это что-то стоит?', 'Нет. Регистрация, кабинет, обучение и ИИ-набор — бесплатные.'],
    ['Я никогда не работал онлайн. Справлюсь?', 'Да. Чек-лист «С чего начать» и обучение показывают каждый шаг. Тексты ИИ пишет вместе с вами.'],
    ['Сколько я заработаю?', 'Зависит только от реальных продаж. Калькулятор выше показывает точный расчёт. Мы никогда не обещаем доход.'],
    ['Когда и как выплаты?', `Каждую неделю, за деньги, которые мы получили и держали ${r.holdDays} дней (защита от возвратов). Выплата через Payoneer, Wise или банковским переводом (Украина — только на счёт ФОП).`],
    ['Где можно рекламировать?', 'Где угодно, честно: соцсети, видео, блоги, сообщества, ваши клиенты. Без спама, фейковых отзывов и купленного трафика.'],
  ],
  rules: 'Только 18+. Только честная реклама.',
  rulesLink: 'Полные правила партнёров',
  finalH: 'Готовы начать?',
  finalP: 'Создайте бесплатный аккаунт и получите первую ссылку за минуту.',
  create: 'Создать аккаунт →',
};

export const PARTNERS_TEXT: Record<Lang, Text> = { en, ua, ru };
